import type { ProjectDetail } from "@/lib/api";
import { STATUS_STEPS } from "@/lib/status";

/**
 * Project detail (runs + events) → the chat's user/agent turns.
 * Pure logic — the screens only render what this produces.
 */
export interface ChatQuestion {
  question: string;
  options: string[];
}

export type ChatTurnStatus = "pending" | "done" | "error" | "question";

export interface ChatTurn {
  id: string;
  role: "user" | "agent";
  text?: string;
  steps?: string[];
  question?: ChatQuestion;
  error?: string;
  status: ChatTurnStatus;
  runId: number;
}

// Must match server `lib/agent-markers.ts` QUESTION_OPTIONS_SEPARATOR.
const QUESTION_SEPARATOR = "\n---options---\n";

function parseQuestion(message: string): ChatQuestion {
  const i = message.indexOf(QUESTION_SEPARATOR);
  if (i === -1) return { question: message, options: [] };
  return {
    question: message.slice(0, i),
    options: message
      .slice(i + QUESTION_SEPARATOR.length)
      .split("\n")
      .filter((s) => s.length > 0),
  };
}

export function buildTurns(project: ProjectDetail): ChatTurn[] {
  const turns: ChatTurn[] = [];

  for (const run of project.runs) {
    if (run.kind === "launch") continue; // system action, not a chat turn
    const events = project.events.filter((e) => e.run_id === run.id);

    // User turn — the prompt that started the run.
    if (run.input) {
      turns.push({
        id: `r${run.id}-u`,
        role: "user",
        text: run.input,
        status: "done",
        runId: run.id,
      });
    }

    // Agent turn — status steps + final response / question / error.
    const steps = events
      .filter((e) => e.type === "status")
      .map((e) => STATUS_STEPS[e.message])
      .filter((s): s is string => !!s);
    const response = events.find((e) => e.type === "agent_response")?.message;
    const questionEv = events.find((e) => e.type === "question");
    const errorEv = events.find((e) => e.type === "error");
    const question = questionEv ? parseQuestion(questionEv.message) : undefined;

    let status: ChatTurnStatus = "pending";
    if (question) status = "question";
    else if (errorEv) status = "error";
    else if (response) status = "done";

    turns.push({
      id: `r${run.id}-a`,
      role: "agent",
      steps,
      text: response,
      question,
      error: errorEv?.message,
      status,
      runId: run.id,
    });
  }

  return turns;
}
