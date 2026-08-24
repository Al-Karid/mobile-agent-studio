import path from "node:path";
import { config, lanIp } from "@/lib/config";
import * as db from "@/lib/db";
import { publish } from "@/lib/sse";
import { startMetro } from "@/lib/metro";

/**
 * Launch pipeline: start a Metro dev server for the project and hand back an
 * exp:// URL. The app itself is never "sent" — Expo Go loads the bundle live.
 */
export async function runLaunchJob(run: db.Run, project: db.Project): Promise<void> {
  const projectId = project.id;
  const dir = path.join(config.projectsDir, projectId);
  const ip = lanIp();
  const port = project.metro_port ?? config.metroPort;

  const emit = (type: string, message: string) => {
    db.addEvent({ projectId, runId: run.id, type, message });
    publish({ projectId, runId: run.id, type, message, at: Date.now() });
  };

  try {
    db.setProjectStatus(projectId, "launching");
    emit("status", "launching");

    const { expUrl } = startMetro(projectId, dir, port, ip);
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
