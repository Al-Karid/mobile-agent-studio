import * as db from "@/lib/db";
import { runGenerateJob } from "@/jobs/generate";
import { runLaunchJob } from "@/jobs/launch";

/**
 * Single-process job queue (V1). On boot, orphaned "running" runs are marked
 * "interrupted" (so clients see a resume point); then the loop drains "pending"
 * runs one at a time. No Redis, no external dependency.
 */

let started = false;

export function startQueue(): void {
  if (started) return;
  started = true;

  db.recoverInterrupted();
  setImmediate(loop);
}

async function loop(): Promise<void> {
  for (;;) {
    const run = db.nextPendingRun();
    if (!run) {
      await sleep(1500);
      continue;
    }
    await execute(run);
  }
}

async function execute(run: db.Run): Promise<void> {
  const project = db.getProject(run.project_id);
  if (!project) {
    db.setRunStatus(run.id, "failed");
    return;
  }

  db.setRunStatus(run.id, "running");

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
