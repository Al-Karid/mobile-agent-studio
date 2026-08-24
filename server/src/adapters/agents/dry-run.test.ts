import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { dryRunAdapter } from "./dry-run";
import { validateDeps } from "../../lib/expo-go";

test("dry-run writes a minimal, Expo Go-safe app", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mas-dryrun-"));
  let exitCode: number | undefined;
  let sawOutput = false;

  for await (const ev of dryRunAdapter.run({ projectDir: dir, prompt: "a test app" })) {
    if (ev.type === "output") sawOutput = true;
    if (ev.type === "done") exitCode = ev.exitCode;
  }

  assert.equal(exitCode, 0);
  assert.ok(sawOutput, "expected output events");

  assert.ok(fs.existsSync(path.join(dir, "package.json")), "package.json missing");
  assert.ok(fs.existsSync(path.join(dir, "App.js")), "App.js missing");
  assert.ok(fs.existsSync(path.join(dir, "index.js")), "index.js missing");

  const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
  assert.equal(validateDeps(pkg).ok, true, "dry-run app must be Expo Go-safe");

  fs.rmSync(dir, { recursive: true, force: true });
});
