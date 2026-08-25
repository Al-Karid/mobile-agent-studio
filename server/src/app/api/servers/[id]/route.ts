import { NextResponse } from "next/server";
import { storage } from "@/adapters/storage";
import { isPortServing, isRunning, killPort, stopMetro } from "@/lib/metro";
import { publish } from "@/lib/sse";
import { authOwnedProject } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Kill a live app server (Metro) for a project. Works even when the in-memory
 * registry lost the handle (npx wrapper exited, or the server restarted) — it
 * falls back to killing whatever serves the project's persisted Metro port.
 * The project row is reset to "ready" if it still thought it was launched.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const owned = await authOwnedProject(req, id);
  if (!owned) {
    return NextResponse.json({ error: "project not found" }, { status: 404 });
  }

  const tracked = isRunning(id);
  const port = owned.project.metro_port;
  const serving = port ? await isPortServing(port) : false;
  if (!tracked && !serving) {
    return NextResponse.json({ error: "server is not running" }, { status: 409 });
  }

  if (tracked) stopMetro(id);
  // Kill by port too: covers orphans AND the npx-wrapper case (the tracked
  // child can exit while the actual Metro node process keeps serving).
  if (port) await killPort(port);

  if (owned.project.status === "launched") {
    await storage.setProjectExpUrl(id, null, null);
    await storage.setProjectStatus(id, "ready");
    await storage.addEvent({ projectId: id, type: "status", message: "ready" });
    publish({
      projectId: id,
      runId: null,
      type: "status",
      message: "stopped — Metro server closed",
      at: Date.now(),
    });
  }

  return NextResponse.json({ ok: true });
}
