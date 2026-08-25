import { NextResponse } from "next/server";
import { storage } from "@/adapters/storage";
import { isPortServing, listRunningMetro } from "@/lib/metro";
import { authUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Live app server instances (Metro) for the signed-in user's projects, e.g.
 * `[{ projectId, name, port, expUrl }]`. The cockpit settings screen lists
 * these with a Kill button per instance.
 *
 * Scoped to the authenticated user (a user can never see or kill another
 * user's servers). An optional `?projectId=` narrows the result to one
 * project (0 or 1 instances) — used by the project settings screen.
 *
 * The in-memory registry alone is NOT reliable: the tracked `npx` wrapper exits
 * once Metro is up, and a server restart orphans every Metro — so this also
 * reconciles with the DB: owned projects marked "launched" whose persisted
 * Metro port actually serves are included too.
 */
export async function GET(req: Request) {
  const user = await authUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const projectId = new URL(req.url).searchParams.get("projectId");

  const servers: Array<{
    projectId: string;
    name: string;
    port: number;
    expUrl: string;
  }> = [];
  const seen = new Set<string>();

  // 1. In-memory tracked instances.
  for (const s of listRunningMetro()) {
    const project = await storage.getProject(s.projectId);
    if (
      project &&
      project.user_id === user.id &&
      (!projectId || project.id === projectId)
    ) {
      servers.push({
        projectId: s.projectId,
        name: project.name,
        port: s.port,
        expUrl: s.expUrl,
      });
      seen.add(s.projectId);
    }
  }

  // 2. Orphan reconciliation (see docblock above).
  for (const project of await storage.listProjects(user.id)) {
    if (seen.has(project.id)) continue;
    if (projectId && project.id !== projectId) continue;
    if (project.status !== "launched" || !project.metro_port) continue;
    if (await isPortServing(project.metro_port)) {
      servers.push({
        projectId: project.id,
        name: project.name,
        port: project.metro_port,
        expUrl: project.exp_url ?? `exp://localhost:${project.metro_port}`,
      });
    }
  }

  return NextResponse.json({ servers });
}
