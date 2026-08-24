import { spawn, type ChildProcess } from "node:child_process";

/**
 * Metro lifecycle. The generated app is never "sent" to the phone — Expo Go
 * loads the JS bundle live from Metro, so launching = starting a Metro dev
 * server for the project and handing back an exp:// URL.
 */

const running = new Map<string, ChildProcess>();

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
