import { storage } from "@/adapters/storage";
import { runGenerateJob } from "@/jobs/generate";
import { runLaunchJob } from "@/jobs/launch";
import type { Run } from "@/contracts/storage";

/**
 * Single-process job queue (V1). On boot, orphaned "running" runs are marked
 * "interrupted" (so clients see a resume point); then the loop drains "pending"
 * runs one at a time. No Redis, no external dependency.
 */

let started = false;

export function startQueue(): void {
  if (started) return;
  started = true;

  storage
    .recoverInterrupted()
    .catch((e) => console.error("[queue] recoverInterrupted failed:", e));
  setImmediate(() => void loop());
}

async function loop(): Promise<void> {
  for (;;) {
    const run = await storage.nextPendingRun();
    if (!run) {
      await sleep(1500);
      continue;
    }
    await execute(run);
  }
}

async function execute(run: Run): Promise<void> {
  const project = await storage.getProject(run.project_id);
  if (!project) {
    await storage.setRunStatus(run.id, "failed");
    return;
  }

  await storage.setRunStatus(run.id, "running");

  if (run.kind === "launch") {
    await runLaunchJob(run, project);
  } else {
    // create | generate | correct all share the generate pipeline.
    await runGenerateJob(run, project);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
