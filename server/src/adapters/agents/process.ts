import { spawn, type SpawnOptions } from "node:child_process";
import type { AgentEvent } from "@/contracts/agent";

/**
 * Shared helpers for agent adapters: turn a child process's stdout/stderr/exit
 * into an AsyncIterable<AgentEvent>, and check whether a CLI is installed.
 */

export function commandExists(cmd: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn("sh", ["-c", `command -v ${JSON.stringify(cmd)}`]);
    child.on("close", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}

export function spawnToEvents(
  cmd: string,
  args: string[],
  opts: SpawnOptions,
  signal?: AbortSignal
): AsyncIterable<AgentEvent> {
  return {
    async *[Symbol.asyncIterator]() {
      const child = spawn(cmd, args, { ...opts, stdio: ["ignore", "pipe", "pipe"] });
      const queue: AgentEvent[] = [];
      let closed = false;
      let notify: (() => void) | null = null;

      const onAbort = () => {
        // The orchestrator asked the agent to stop (e.g. it asked the user a
        // question) — kill the child so the stream ends promptly.
        child.kill("SIGTERM");
      };
      signal?.addEventListener("abort", onAbort, { once: true });

      const push = (e: AgentEvent) => {
        queue.push(e);
        notify?.();
      };
      child.stdout?.on("data", (d: Buffer) => push({ type: "output", data: d.toString() }));
      child.stderr?.on("data", (d: Buffer) => push({ type: "error", data: d.toString() }));
      child.on("close", (code) => {
        signal?.removeEventListener("abort", onAbort);
        push({ type: "done", exitCode: code ?? 1 });
        closed = true;
        notify?.();
      });
      child.on("error", (err) => {
        signal?.removeEventListener("abort", onAbort);
        push({ type: "error", data: String(err) });
        push({ type: "done", exitCode: 1 });
        closed = true;
        notify?.();
      });

      // The prompt is passed via argv (see each adapter's run()); stdin is ignored.

      while (true) {
        if (queue.length > 0) {
          yield queue.shift()!;
        } else if (closed) {
          return;
        } else {
          await new Promise<void>((r) => (notify = r));
        }
      }
    },
  };
}
