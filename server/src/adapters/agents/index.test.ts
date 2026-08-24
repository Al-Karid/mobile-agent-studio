import { test } from "node:test";
import assert from "node:assert/strict";
import { getAgent, listAgents } from "./index";

test("registry resolves known agents", () => {
  assert.equal(getAgent("cline").name, "cline");
  assert.equal(getAgent("codex").name, "codex");
  assert.equal(getAgent("claude").name, "claude");
  assert.equal(getAgent("dry-run").name, "dry-run");
});

test("registry throws on unknown agent", () => {
  assert.throws(() => getAgent("nope"), /Unknown agent "nope"/);
});

test("listAgents returns all registered agents", () => {
  assert.ok(listAgents().includes("cline"));
  assert.ok(listAgents().includes("dry-run"));
});
