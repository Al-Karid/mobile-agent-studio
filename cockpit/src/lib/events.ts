import type { ProjectDetail, StudioEvent } from "@/lib/api";

/**
 * Chat timeline for a project — user prompts (bubbles) + REAL journaled events
 * (rows), chronologically merged. Noise (log lines, trivial statuses) is
 * filtered; everything shown traces to a real DB event.
 */

export interface TimelineUserItem {
  kind: "user";
  id: string;
  text: string;
  at: number;
  runId: number;
}

export interface TimelineEventItem {
  kind: "event";
  id: string;
  type: string;
  message: string;
  at: number;
  runId: number | null;
  /** True while this phase is the project's CURRENT, active phase. */
  ongoing: boolean;
}

/** Agent question with tap-able option chips (the user must decide). */
export interface TimelineQuestionItem {
  kind: "question";
  id: string;
  question: string;
  options: string[];
  /** True once the user answered — the chips are disabled to avoid a re-run. */
  answered: boolean;
  at: number;
  runId: number | null;
}

/** Consecutive launch-related events grouped into one compact component. */
export interface TimelineLaunchItem {
  kind: "launch";
  id: string;
  events: TimelineEventItem[];
  at: number;
}

export type TimelineItem =
  | TimelineUserItem
  | TimelineQuestionItem
  | TimelineEventItem
  | TimelineLaunchItem;

// Internal statuses that don't tell the user anything.
const NOISE_STATUSES = new Set(["created", "queued", "launch queued"]);

// Phases that are "work in progress" → show a spinner while current.
const ONGOING_STATUSES = new Set(["initializing", "generating", "qa", "launching"]);

/**
 * Id of the NEWEST status event matching the current project status, or null.
 * Only that event is "ongoing" (spinner) — a previous run's event with the same
 * status must not spin again while a newer run is in that phase. Applies to
 * every ongoing status (initializing, generating, qa, launching). Shared by the
 * chat timeline and the project-settings Activity list.
 */
export function ongoingEventId(
  events: StudioEvent[],
  projectStatus: string
): number | null {
  let last: number | null = null;
  for (const e of events) {
    if (
      e.type === "status" &&
      ONGOING_STATUSES.has(e.message) &&
      e.message === projectStatus
    ) {
      last = e.id;
    }
  }
  return last;
}

/** Launch-related events (launching, exp://, stopped) group into a stack. */
function isLaunchEvent(item: TimelineEventItem): boolean {
  if (item.type === "ready" && item.message.startsWith("exp://")) return true;
  if (item.type === "status") {
    if (item.message === "launching" || item.message === "launched") return true;
    if (item.message === "App stopped") return true;
  }
  return false;
}

// The agent-question options separator (matches server `agent-markers.ts`).
const QUESTION_OPTIONS_SEPARATOR = "\n---options---\n";

function cleanMessage(message: string): string {
  const i = message.indexOf(QUESTION_OPTIONS_SEPARATOR);
  return i === -1 ? message : message.slice(0, i);
}

/**
 * A model turn shows ONLY what follows its `AGENT_RESPONSE:` marker — anything
 * the agent narrated before it (or a repeated marker line) is dropped. Falls
 * back to the full message when no marker is present.
 */
function cleanAgentTurn(message: string): string {
  const MARKER = "AGENT_RESPONSE:";
  const i = message.lastIndexOf(MARKER);
  return i === -1 ? message : message.slice(i + MARKER.length).trim();
}

/** Build the chat timeline: user prompts + real relevant events, sorted. */
export function buildTimeline(project: ProjectDetail): TimelineItem[] {
  const items: TimelineItem[] = [];

  // User prompts (create / correct runs) — rendered as bubbles.
  for (const run of project.runs) {
    if (run.kind === "launch") continue;
    if (!run.input) continue;
    items.push({
      kind: "user",
      id: `run-${run.id}`,
      text: run.input,
      at: run.created_at,
      runId: run.id,
    });
  }

  // Only the NEWEST status event matching the current status is "ongoing"
  // (spinner) — see ongoingEventId().
  const ongoingId = ongoingEventId(project.events, project.status);

  // Real events — rendered as rows.
  for (const e of project.events) {
    if (e.type === "log") continue; // internal noise
    if (e.type === "status" && NOISE_STATUSES.has(e.message)) continue;

    // Agent question → a dedicated item with tap-able option chips. The raw
    // message is `question + "---options---" + options` (server format).
    if (e.type === "question") {
      const [question, optionsBlock = ""] = (e.message ?? "").split(
        QUESTION_OPTIONS_SEPARATOR
      );
      // Answered = any correction run came after the run that asked — tapping a
      // chip again would otherwise regenerate the answer.
      const answered = project.runs.some(
        (r) => r.kind === "correct" && r.id > (e.run_id ?? 0)
      );
      items.push({
        kind: "question",
        id: `ev-${e.id}`,
        question: (question || "Question").trim(),
        options: optionsBlock
          .split("\n")
          .map((s) => s.trim().replace(/^[-*•]\s*/, "").trim())
          .filter(Boolean),
        answered,
        at: e.created_at,
        runId: e.run_id,
      });
      continue;
    }

    // Orphan `status: ready` (run_id null) = the Stop action. Model turns show
    // only the text after their AGENT_RESPONSE: marker (nothing narrated before).
    const message =
      e.type === "status" && e.message === "ready" && e.run_id === null
        ? "App stopped"
        : e.type === "agent_response"
          ? cleanAgentTurn(e.message)
          : cleanMessage(e.message);

    items.push({
      kind: "event",
      id: `ev-${e.id}`,
      type: e.type,
      message,
      at: e.created_at,
      runId: e.run_id,
      ongoing: ongoingId === e.id,
    });
  }

  const sorted = items.sort((a, b) => a.at - b.at);

  // Group consecutive launch-related events into one launch stack each.
  const timeline: TimelineItem[] = [];
  let buffer: TimelineEventItem[] = [];
  const flush = () => {
    if (buffer.length === 0) return;
    timeline.push({
      kind: "launch",
      id: `launch-${buffer[0].id}`,
      events: buffer,
      at: buffer[0].at,
    });
    buffer = [];
  };
  for (const item of sorted) {
    if (item.kind === "event" && isLaunchEvent(item)) {
      buffer.push(item);
    } else {
      flush();
      timeline.push(item);
    }
  }
  flush();
  return timeline;
}
