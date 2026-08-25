import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractAgentResponse,
  extractAgentQuestion,
  formatQuestionMessage,
} from "./agent-markers";

test("extractAgentResponse returns the full summary (multi-line markdown allowed)", () => {
  const buffer =
    "lots of agent output…\n" +
    "AGENT_RESPONSE: Your app icon is now dark.\n" +
    "\n" +
    "It now uses a **dark** palette and a new icon.";
  assert.equal(
    extractAgentResponse(buffer),
    "Your app icon is now dark.\n\nIt now uses a **dark** palette and a new icon."
  );
});

test("extractAgentResponse uses the LAST marker (drops narrated prose + repeats)", () => {
  const buffer =
    "lots of work…\n" +
    "AGENT_RESPONSE: summary one.\n" +
    "Done. I did lots of technical things…\n" +
    "\n" +
    "AGENT_RESPONSE: final summary.";
  assert.equal(extractAgentResponse(buffer), "final summary.");
});

test("extractAgentResponse handles the summary on the line after the marker", () => {
  const buffer = "AGENT_RESPONSE:\nYour app is ready.";
  assert.equal(extractAgentResponse(buffer), "Your app is ready.");
});

test("extractAgentResponse returns null when absent", () => {
  assert.equal(extractAgentResponse("no marker here"), null);
});

test("extractAgentQuestion parses question + options", () => {
  const buffer =
    "AGENT_QUESTION: Which color scheme do you want?\n" +
    "OPTIONS:\n- Dark\n- Light\n- System default\n";
  const q = extractAgentQuestion(buffer);
  assert.deepEqual(q, {
    question: "Which color scheme do you want?",
    options: ["Dark", "Light", "System default"],
  });
});

test("extractAgentQuestion tolerates missing options", () => {
  const q = extractAgentQuestion("AGENT_QUESTION: How should I name the app?");
  assert.deepEqual(q, { question: "How should I name the app?", options: [] });
});

test("extractAgentQuestion stops at a duplicated marker block after the options", () => {
  const buffer =
    "AGENT_QUESTION: Which color should the new button be?\n" +
    "OPTIONS:\n- red\n- blue\n- green\n" +
    "AGENT_QUESTION: Which color should the new button be?\n" +
    "OPTIONS:\n- red\n- blue\n- green\n";
  const q = extractAgentQuestion(buffer);
  assert.deepEqual(q, {
    question: "Which color should the new button be?",
    options: ["red", "blue", "green"],
  });
});

test("formatQuestionMessage round-trips through parsing", () => {
  const msg = formatQuestionMessage({ question: "Q?", options: ["A", "B"] });
  assert.ok(msg.includes("Q?"));
  assert.ok(msg.includes("A\nB"));
});
