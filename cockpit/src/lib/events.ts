import type { ProjectDetail } from "@/lib/api";

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

/** Consecutive launch-related events grouped into one compact component. */
export interface TimelineLaunchItem {
  kind: "launch";
  id: string;
  events: TimelineEventItem[];
  at: number;
}

export type TimelineItem = TimelineUserItem | TimelineEventItem | TimelineLaunchItem;

// Internal statuses that don't tell the user anything.
const NOISE_STATUSES = new Set(["created", "queued", "launch queued"]);

// Phases that are "work in progress" → show a spinner while current.
const ONGOING_STATUSES = new Set(["initializing", "generating", "qa", "launching"]);

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

  // Real events — rendered as rows.
  for (const e of project.events) {
    if (e.type === "log") continue; // internal noise
    if (e.type === "status" && NOISE_STATUSES.has(e.message)) continue;

    // Orphan `status: ready` (run_id null) = the Stop action.
    const message =
      e.type === "status" && e.message === "ready" && e.run_id === null
        ? "App stopped"
        : cleanMessage(e.message);

    items.push({
      kind: "event",
      id: `ev-${e.id}`,
      type: e.type,
      message,
      at: e.created_at,
      runId: e.run_id,
      ongoing:
        e.type === "status" &&
        ONGOING_STATUSES.has(e.message) &&
        e.message === project.status,
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
