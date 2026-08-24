import { spawn } from "node:child_process";

/**
 * Thin git wrapper. Every pipeline step ends in a commit so an interrupted run
 * can resume from the last checkpoint.
 */

export interface GitResult {
  code: number;
  stdout: string;
  stderr: string;
}

export function git(cwd: string, args: string[]): Promise<GitResult> {
  return new Promise((resolve) => {
    const child = spawn("git", args, { cwd });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
    child.on("error", (err) => resolve({ code: 1, stdout, stderr: String(err) }));
  });
}

export async function gitInit(cwd: string): Promise<void> {
  await git(cwd, ["init", "-q"]);
  await git(cwd, ["checkout", "-qb", "main"]);
}

/** Commit and return the short hash, or null if there is nothing to commit. */
export async function gitCommit(cwd: string, message: string): Promise<string | null> {
  await git(cwd, ["add", "-A"]);
  const r = await git(cwd, ["commit", "-qm", message]);
  if (r.code !== 0) return null;
  const head = await git(cwd, ["rev-parse", "--short", "HEAD"]);
  return head.code === 0 ? head.stdout.trim() : null;
}

export async function gitHead(cwd: string): Promise<string | null> {
  const r = await git(cwd, ["rev-parse", "--short", "HEAD"]);
  return r.code === 0 ? r.stdout.trim() : null;
}
