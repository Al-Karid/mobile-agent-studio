import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractAgentResponse,
  extractAgentQuestion,
  formatQuestionMessage,
} from "./agent-markers";

test("extractAgentResponse returns the summary line", () => {
  const buffer =
    "lots of agent output…\nAGENT_RESPONSE: Your app icon is now dark.\nmore output";
  assert.equal(extractAgentResponse(buffer), "Your app icon is now dark.");
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

test("formatQuestionMessage round-trips through parsing", () => {
  const msg = formatQuestionMessage({ question: "Q?", options: ["A", "B"] });
  assert.ok(msg.includes("Q?"));
  assert.ok(msg.includes("A\nB"));
});
