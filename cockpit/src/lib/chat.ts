/**
 * The chat turn types used by MessageBubble. The conversation timeline itself
 * is built from real events in `lib/events.ts` (buildTimeline).
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

