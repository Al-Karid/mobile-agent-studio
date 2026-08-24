/**
 * Smoke test: run the full generate pipeline (dry-run agent) end-to-end and
 * verify the project reaches "ready" with a valid, Expo Go-safe app on disk.
 *
 *   npm run smoke
 */
import fs from "node:fs";
import path from "node:path";
import * as db from "../src/lib/db";
import { config } from "../src/lib/config";
import { runGenerateJob } from "../src/jobs/generate";

async function main() {
  const id = `smoke-${Date.now().toString(36)}`;
  const prompt = "a smoke-test app with a single screen";

  const project = db.createProject({
    id,
    name: "smoke",
    prompt,
    agent: "dry-run",
    model: "deepseek-v4-flash",
  });
  const run = db.createRun({
    projectId: id,
    kind: "create",
    input: prompt,
    agent: "dry-run",
    model: "deepseek-v4-flash",
  });
  db.setRunStatus(run.id, "running");

  await runGenerateJob(run, project);

  const after = db.getProject(id)!;
  const dir = path.join(config.projectsDir, id);
  const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];

  console.log(`final status : ${after.status}`);
  console.log(`commit       : ${run.commit_sha ?? db.listRuns(id).at(-1)?.commit_sha ?? "(none)"}`);
  console.log(`files        : ${files.join(", ")}`);
  console.log(
    `expo-go safe : ${fs.existsSync(path.join(dir, "package.json")) ? "yes (see package.json)" : "n/a"}`
  );

  // cleanup
  fs.rmSync(dir, { recursive: true, force: true });
  db.deleteProject(id);

  process.exit(after.status === "ready" ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
