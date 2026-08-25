import fs from "node:fs";
import path from "node:path";
import { config, lanIp } from "@/lib/config";
import { storage } from "@/adapters/storage";
import { publish } from "@/lib/sse";
import { runCommand } from "@/lib/exec";
import {
  findFreePort,
  isRunning,
  startMetro,
  stopMetro,
  waitForMetro,
} from "@/lib/metro";
import type { Project, Run } from "@/contracts/storage";

/**
 * Launch pipeline: install deps (first launch), allocate a free Metro port,
 * start Metro, wait until it actually serves, then hand back an exp:// URL.
 * The app itself is never "sent" — Expo Go loads the bundle live.
 */
export async function runLaunchJob(run: Run, project: Project): Promise<void> {
  const projectId = project.id;
  const dir = path.join(config.projectsDir, projectId);
  const ip = lanIp();

  const emit = async (type: string, message: string) => {
    await storage.addEvent({ projectId, runId: run.id, type, message });
    publish({ projectId, runId: run.id, type, message, at: Date.now() });
  };

  try {
    await storage.setProjectStatus(projectId, "launching");
    await emit("status", "launching");

    // 1. Ensure dependencies are installed (first launch).
    if (!fs.existsSync(path.join(dir, "node_modules"))) {
      await emit("log", "installing dependencies (first launch)…");
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
    await emit("log", `starting Metro on port ${port}`);

    // 3. Start Metro and wait until it actually serves the bundle.
    const { expUrl } = startMetro(projectId, dir, port, ip);
    const ready = await waitForMetro(port);
    if (!ready) {
      stopMetro(projectId);
      throw new Error(`Metro did not come up on port ${port}`);
    }

    await storage.setProjectExpUrl(projectId, expUrl, port);
    await storage.setProjectStatus(projectId, "launched");
    await emit("ready", expUrl);
    await storage.setRunStatus(run.id, "done");
  } catch (err) {
    await storage.setRunError(run.id, err instanceof Error ? err.message : String(err));
    await storage.setProjectStatus(projectId, "failed");
    await emit("error", err instanceof Error ? err.message : String(err));
    await storage.setRunStatus(run.id, "failed");
  }
}
