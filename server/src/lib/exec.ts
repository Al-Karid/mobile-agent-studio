import { spawn, type SpawnOptions } from "node:child_process";

export interface CommandResult {
  code: number;
  stdout: string;
  stderr: string;
}

/**
 * Run a command and capture everything. Used for create-expo-app, tsc, etc.
 */
export function runCommand(
  cmd: string,
  args: string[],
  opts: SpawnOptions & { timeoutMs?: number } = {}
): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { ...opts, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = opts.timeoutMs
      ? setTimeout(() => {
          child.kill("SIGKILL");
          resolve({ code: 124, stdout, stderr: stderr + "\n[timeout]" });
        }, opts.timeoutMs)
      : null;
    child.stdout?.on("data", (d) => (stdout += d.toString()));
    child.stderr?.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
    child.on("error", (err) => {
      if (timer) clearTimeout(timer);
      resolve({ code: 1, stdout, stderr: String(err) });
    });
  });
}
