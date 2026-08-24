import { spawn, type ChildProcess } from "node:child_process";
import net from "node:net";

/**
 * Metro lifecycle. The generated app is never "sent" to the phone — Expo Go
 * loads the JS bundle live from Metro. Each project gets its OWN port: the
 * cockpit's dev Metro occupies 8081, so generated apps are allocated a free
 * port from a dedicated range (default 8100+) and that port is persisted.
 */

const running = new Map<string, ChildProcess>();

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

  running.set(projectId, child);
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
  const child = running.get(projectId);
  if (child) {
    child.kill("SIGTERM");
    running.delete(projectId);
  }
}

export function isRunning(projectId: string): boolean {
  return running.has(projectId);
}
