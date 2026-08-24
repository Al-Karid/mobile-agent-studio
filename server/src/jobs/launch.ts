import fs from "node:fs";
import path from "node:path";
import { config, lanIp } from "@/lib/config";
import * as db from "@/lib/db";
import { publish } from "@/lib/sse";
import { runCommand } from "@/lib/exec";
import {
  findFreePort,
  isRunning,
  startMetro,
  stopMetro,
  waitForMetro,
} from "@/lib/metro";

/**
 * Launch pipeline: install deps (first launch), allocate a free Metro port,
 * start Metro, wait until it actually serves, then hand back an exp:// URL.
 * The app itself is never "sent" — Expo Go loads the bundle live.
 */
export async function runLaunchJob(run: db.Run, project: db.Project): Promise<void> {
  const projectId = project.id;
  const dir = path.join(config.projectsDir, projectId);
  const ip = lanIp();

  const emit = (type: string, message: string) => {
    db.addEvent({ projectId, runId: run.id, type, message });
    publish({ projectId, runId: run.id, type, message, at: Date.now() });
  };

  try {
    db.setProjectStatus(projectId, "launching");
    emit("status", "launching");

    // 1. Ensure dependencies are installed (first launch).
    if (!fs.existsSync(path.join(dir, "node_modules"))) {
      emit("log", "installing dependencies (first launch)…");
      const r = await runCommand("npm", ["install", "--no-audit", "--no-fund"], {
        cwd: dir,
        timeoutMs: 300_000,
      });
      if (r.code !== 0) {
        throw new Error(`npm install failed: ${r.stderr.slice(-300)}`);
      }
    }

    // 2. Allocate a free port (the cockpit's dev Metro owns 8081). Reuse the
    //    persisted port only if this project's Metro is already running.
    const port =
      isRunning(projectId) && project.metro_port
        ? project.metro_port
        : await findFreePort(config.metroPort);
    emit("log", `starting Metro on port ${port}`);

    // 3. Start Metro and wait until it actually serves the bundle.
    const { expUrl } = startMetro(projectId, dir, port, ip);
    const ready = await waitForMetro(port);
    if (!ready) {
      stopMetro(projectId);
      throw new Error(`Metro did not come up on port ${port}`);
    }

    db.setProjectExpUrl(projectId, expUrl, port);
    db.setProjectStatus(projectId, "launched");
    emit("ready", expUrl);
    db.setRunStatus(run.id, "done");
  } catch (err) {
    db.setRunError(run.id, err instanceof Error ? err.message : String(err));
    db.setProjectStatus(projectId, "failed");
    emit("error", err instanceof Error ? err.message : String(err));
    db.setRunStatus(run.id, "failed");
  }
}
