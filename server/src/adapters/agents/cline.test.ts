import { test } from "node:test";
import assert from "node:assert/strict";
import {
  agentDecoders,
  decodeAgentOutput,
  decodeClineText,
  extractClineText,
} from "./decoders";

function contentStart(text: string): string {
  return JSON.stringify({
    ts: "2026-08-25T19:26:39.189Z",
    type: "agent_event",
    event: { type: "content_start", contentType: "text", text, accumulated: "…" },
  });
}

test("extractClineText: text content_start deltas pass through", () => {
  assert.equal(extractClineText(contentStart("QUESTION: Which color")), "QUESTION: Which color");
  assert.equal(extractClineText("plain line"), "plain line");
});

test("extractClineText: JSON envelope events are dropped", () => {
  assert.equal(
    extractClineText(JSON.stringify({ ts: "…", type: "hook_event", hookEventName: "agent_start" })),
    null
  );
  assert.equal(
    extractClineText(JSON.stringify({ ts: "…", type: "run_result", finishReason: "completed" })),
    null
  );
  assert.equal(
    extractClineText(JSON.stringify({ ts: "…", type: "agent_event", event: { type: "content_start", contentType: "reasoning", text: "think…" } })),
    null
  );
});

test("decodeClineText: reconstructs agent text and keeps done/error events", async () => {
  const src = {
    async *[Symbol.asyncIterator]() {
      yield { type: "output" as const, data: contentStart("AGENT_QUESTION: Which color") + "\n" };
      yield { type: "output" as const, data: JSON.stringify({ ts: "…", type: "hook_event" }) + "\n" };
      yield { type: "output" as const, data: contentStart(" should the button be?") + "\n" };
      yield { type: "done" as const, exitCode: 0 };
    },
  };
  const out: string[] = [];
  const codes: number[] = [];
  for await (const ev of decodeClineText(src)) {
    if (ev.type === "output") out.push(ev.data);
    else if (ev.type === "done") codes.push(ev.exitCode);
  }
  assert.deepEqual(out, ["AGENT_QUESTION: Which color", " should the button be?"]);
  assert.deepEqual(codes, [0]);
});

test("decodeClineText: partial JSON lines split across chunks are re-joined", async () => {
  const line = contentStart("color") + "\n";
  const half = Math.floor(line.length / 2);
  const src = {
    async *[Symbol.asyncIterator]() {
      yield { type: "output" as const, data: line.slice(0, half) };
      yield { type: "output" as const, data: line.slice(half) };
      yield { type: "done" as const, exitCode: 0 };
    },
  };
  const out: string[] = [];
  for await (const ev of decodeClineText(src)) {
    if (ev.type === "output") out.push(ev.data);
  }
  assert.deepEqual(out, ["color"]);
});

test("agentDecoders registers every agent (decoder service is pluggable)", () => {
  // Every known adapter must be wired through the service — add new agents here.
  assert.deepEqual(
    Object.keys(agentDecoders).sort(),
    ["cline", "claude", "codex", "dry-run"].sort()
  );
  assert.equal(agentDecoders["cline"], decodeClineText);
  assert.notEqual(agentDecoders["codex"], decodeClineText); // plain-text agents pass through
  assert.notEqual(agentDecoders["claude"], decodeClineText);
  assert.notEqual(agentDecoders["dry-run"], decodeClineText);
});

test("decodeAgentOutput routes cline through the decoder and others untouched", async () => {
  const src = {
    async *[Symbol.asyncIterator]() {
      yield { type: "output" as const, data: contentStart("plain") + "\n" };
      yield { type: "output" as const, data: JSON.stringify({ ts: "…", type: "run_result" }) + "\n" };
      yield { type: "done" as const, exitCode: 0 };
    },
  };
  const decoded: string[] = [];
  for await (const ev of decodeAgentOutput("cline", src)) {
    if (ev.type === "output") decoded.push(ev.data);
  }
  assert.deepEqual(decoded, ["plain"]);

  const passthrough: string[] = [];
  for await (const ev of decodeAgentOutput("codex", src)) {
    if (ev.type === "output") passthrough.push(ev.data);
  }
  assert.deepEqual(passthrough, [
    contentStart("plain") + "\n",
    JSON.stringify({ ts: "…", type: "run_result" }) + "\n",
  ]);
});