import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { StorageAdapter } from "@/contracts/storage";
import { createMemoryStorage } from "./memory";
import { createDrizzleStorage } from "./drizzle";

/**
 * Full contract exercise — run against BOTH the in-memory adapter (proves the
 * orchestrator doesn't need SQLite at all) and a real SQLite DB through the
 * Drizzle adapter. This is the "even the db is replaceable" proof.
 */
async function runContract(s: StorageAdapter): Promise<void> {
  // users + sessions + settings
  const u = await s.createUser({
    id: "u1",
    email: "u@example.com",
    passwordHash: "hash",
    provider: "email",
  });
  assert.equal((await s.getUserByEmail("u@example.com"))?.id, "u1");
  await s.createSession(u.id, "tok");
  assert.equal((await s.getUserBySessionToken("tok"))?.id, "u1");
  await s.deleteSession("tok");
  assert.equal(await s.getUserBySessionToken("tok"), undefined);
  await s.setSetting(u.id, "k", "v");
  assert.equal(await s.getSetting(u.id, "k"), "v");
  assert.deepEqual(await s.listSettings(u.id), { k: "v" });

  // projects
  const p = await s.createProject({
    id: "p1",
    userId: u.id,
    name: "hello",
    prompt: "a test app",
    agent: "dry-run",
    model: "deepseek-v4-flash",
    platform: "ios",
  });
  assert.equal(p.status, "created");
  assert.equal(p.exp_url, null);
  assert.equal(p.platform, "ios");
  assert.equal((await s.listProjects(u.id)).length, 1);
  assert.equal((await s.listProjects("other-user")).length, 0);
  await s.setProjectStatus("p1", "ready");
  assert.equal((await s.getProject("p1"))?.status, "ready");

  // runs + log cap (head + tail preserved)
  const run = await s.createRun({ projectId: "p1", kind: "create", input: "a test app" });
  assert.equal(run.status, "pending");
  await s.setRunStatus(run.id, "running");
  await s.appendRunLog(run.id, "H".repeat(150_000));
  await s.appendRunLog(run.id, "TAIL");
  const log = (await s.getRun(run.id))!.log;
  assert.ok(log.startsWith("H"), "log head kept");
  assert.ok(log.endsWith("TAIL"), "log tail kept");
  assert.ok(log.includes("truncated"), "log truncation marker present");
  assert.ok(log.length <= 100_000, "log capped at 100KB");

  // events
  const ev = await s.addEvent({ projectId: "p1", runId: run.id, type: "status", message: "ready" });
  assert.ok(ev.id > 0, "event has an id");
  assert.equal((await s.listEvents("p1")).length, 1);
  assert.equal((await s.listEvents("p1", ev.id)).length, 0, "afterId works");

  // recoverInterrupted
  const run2 = await s.createRun({ projectId: "p1", kind: "launch" });
  await s.setRunStatus(run2.id, "running");
  await s.recoverInterrupted();
  assert.equal((await s.getRun(run2.id))?.status, "interrupted");
  assert.ok((await s.getRun(run2.id))?.finished_at != null, "finished_at stamped");

  // FIFO nextPendingRun
  const run3 = await s.createRun({ projectId: "p1", kind: "correct" });
  assert.equal((await s.nextPendingRun())?.id, run3.id);

  // run metadata
  await s.setRunError(run.id, "boom");
  assert.equal((await s.getRun(run.id))?.error, "boom");
  await s.setRunCommit(run.id, "abc1234");
  assert.equal((await s.getRun(run.id))?.commit_sha, "abc1234");

  // delete cascades runs + events
  await s.deleteProject("p1");
  assert.equal(await s.getProject("p1"), undefined);
  assert.equal((await s.listRuns("p1")).length, 0);
  assert.equal((await s.listEvents("p1")).length, 0);
}

test("storage contract: in-memory adapter", async () => {
  await runContract(createMemoryStorage());
});

test("storage contract: SQLite via Drizzle (real temp DB)", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mas-storage-"));
  const dbPath = path.join(dir, "test.db");
  try {
    await runContract(createDrizzleStorage("sqlite", dbPath));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
