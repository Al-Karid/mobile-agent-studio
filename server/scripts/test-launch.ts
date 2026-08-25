/**
 * Launch test: run generate + launch end-to-end (dry-run agent) and verify the
 * generated app gets a DEDICATED Metro port (8100+, not 8081 which the cockpit
 * dev server owns). Requires network for the first `npm install`.
 *
 *   npm run test:launch
 */
import fs from "node:fs";
import path from "node:path";
import { storage } from "../src/adapters/storage";
import { config } from "../src/lib/config";
import { runGenerateJob } from "../src/jobs/generate";
import { runLaunchJob } from "../src/jobs/launch";
import { stopMetro } from "../src/lib/metro";

async function main() {
  const id = `launchtest-${Date.now().toString(36)}`;
  const prompt = "a launch test app";
  const dir = path.join(config.projectsDir, id);
  let ok = false;

  try {
    const project = await storage.createProject({
      id,
      name: "launchtest",
      prompt,
      agent: "dry-run",
      model: "deepseek-v4-flash",
    });
    const genRun = await storage.createRun({
      projectId: id,
      kind: "create",
      input: prompt,
      agent: "dry-run",
      model: "deepseek-v4-flash",
    });
    await storage.setRunStatus(genRun.id, "running");
    await runGenerateJob(genRun, project);

    const afterGen = await storage.getProject(id);
    console.log("generate ->", afterGen?.status);
    if (afterGen?.status !== "ready") throw new Error("generate did not reach ready");

    const launchRun = await storage.createRun({ projectId: id, kind: "launch", agent: "dry-run" });
    await storage.setRunStatus(launchRun.id, "running");
    await runLaunchJob(launchRun, afterGen);

    const afterLaunch = await storage.getProject(id);
    const port = afterLaunch?.metro_port ?? 0;
    console.log("launch   ->", afterLaunch?.status);
    console.log("exp_url  ->", afterLaunch?.exp_url);
    console.log("port     ->", port);

    if (afterLaunch?.status !== "launched" || !afterLaunch.exp_url) {
      throw new Error("launch did not complete");
    }
    if (port < 8100 || port >= 9000) {
      throw new Error(`port ${port} is not in the dedicated 8100+ range (8081 conflict)`);
    }
    ok = true;
    console.log("PORT FIX OK: generated app is on a dedicated port, not 8081");
  } catch (e) {
    console.error("FAILED:", e instanceof Error ? e.message : e);
  } finally {
    stopMetro(id);
    fs.rmSync(dir, { recursive: true, force: true });
    await storage.deleteProject(id);
  }

  process.exit(ok ? 0 : 1);
}

main();
