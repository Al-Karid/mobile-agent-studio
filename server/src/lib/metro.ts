import { execFile, spawn, type ChildProcess } from "node:child_process";
import { promisify } from "node:util";
import net from "node:net";

const execFileP = promisify(execFile);

/**
 * Metro lifecycle. The generated app is never "sent" to the phone — Expo Go
 * loads the JS bundle live from Metro. Each project gets its OWN port: the
 * cockpit's dev Metro occupies 8081, so generated apps are allocated a free
 * port from a dedicated range (default 8100+) and that port is persisted.
 */

const running = new Map<
  string,
  { child: ChildProcess; port: number; hostIp: string }
>();

function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => srv.close(() => resolve(true)));
    srv.listen(port, "0.0.0.0");
  });
}

/** First free port in [start, start + range]. */
export async function findFreePort(start: number, range = 100): Promise<number> {
  for (let p = start; p <= start + range; p++) {
    if (await isPortFree(p)) return p;
  }
  throw new Error(`no free port in ${start}-${start + range}`);
}

export function startMetro(
  projectId: string,
  projectDir: string,
  port: number,
  hostIp: string
): { expUrl: string } {
  stopMetro(projectId);

  const child = spawn("npx", ["expo", "start", "--port", String(port), "--lan"], {
    cwd: projectDir,
    env: {
      ...process.env,
      REACT_NATIVE_PACKAGER_HOSTNAME: hostIp,
      EXPO_NO_TELEMETRY: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout?.on("data", () => {});
  child.stderr?.on("data", () => {});
  child.on("error", () => {});
  child.on("exit", () => running.delete(projectId));

  running.set(projectId, { child, port, hostIp });
  return { expUrl: `exp://${hostIp}:${port}` };
}

/**
 * Poll Metro's /status endpoint until it reports "running", so the launch only
 * succeeds when the bundle is actually being served (not optimistically).
 */
export async function waitForMetro(port: number, timeoutMs = 30_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/status`, {
        signal: AbortSignal.timeout(1500),
      });
      if (res.ok && (await res.text()).includes("running")) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

export function stopMetro(projectId: string): void {
  const entry = running.get(projectId);
  if (entry) {
    entry.child.kill("SIGTERM");
    running.delete(projectId);
  }
}

export function isRunning(projectId: string): boolean {
  return running.has(projectId);
}

/**
 * Live Metro instances across projects. Dead children are pruned on read so a
 * crashed/exited server never shows as "running". NOTE: the tracked child is
 * the `npx` wrapper, which exits once Metro is up — and a server restart
 * orphans every Metro — so callers must reconcile with `isPortServing`.
 */
export function listRunningMetro(): Array<{
  projectId: string;
  port: number;
  expUrl: string;
}> {
  const out: Array<{ projectId: string; port: number; expUrl: string }> = [];
  for (const [projectId, m] of running) {
    if (m.child.exitCode !== null) {
      running.delete(projectId);
      continue;
    }
    out.push({ projectId, port: m.port, expUrl: `exp://${m.hostIp}:${m.port}` });
  }
  return out;
}

/** One-shot liveness check: does anything serve the Expo /status endpoint? */
export async function isPortServing(
  port: number,
  timeoutMs = 1500
): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/status`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** PIDs LISTENING on a TCP port (lsof) — for killing orphaned Metro instances. */
async function pidsOnPort(port: number): Promise<number[]> {
  try {
    // -sTCP:LISTEN is critical: without it, lsof also returns the caller's own
    // outbound socket to this port (e.g. the isPortServing probe) and the kill
    // would take down the Next.js server itself.
    const { stdout } = await execFileP(
      "lsof",
      ["-ti", `tcp:${port}`, "-sTCP:LISTEN"],
      { timeout: 3000 }
    );
    return stdout
      .split("\n")
      .map((l) => parseInt(l.trim(), 10))
      .filter((n) => Number.isInteger(n));
  } catch {
    return [];
  }
}

/** Kill whatever is serving a port — orphaned Metro after a server restart. */
export async function killPort(port: number): Promise<boolean> {
  const pids = await pidsOnPort(port);
  if (pids.length === 0) return false;
  for (const pid of pids) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      /* already gone */
    }
  }
  return true;
}
