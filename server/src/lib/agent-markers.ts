/**
 * Agent-output markers — pure parsing of the structured lines the coding
 * agent is told to emit at the end of its run (see AGENT_CONTEXT):
 *
 *   AGENT_RESPONSE: <concise user-facing summary of what changed>
 *
 *   AGENT_QUESTION: <question only the user can answer>
 *   OPTIONS:
 *   - option one
 *   - option two
 *
 * The question is journaled as an event `type: "question"` whose message is
 * `question + QUESTION_OPTIONS_SEPARATOR + options joined by "\n"` — the
 * cockpit parses that exact format to render option chips.
 *
 * The agent also emits `SKILL_LOADED:<skill-name>` (one line, each time it
 * loads a skill from the shared skills/ library) — dev-only console logging.
 */
export interface AgentQuestion {
  question: string;
  options: string[];
}

export const QUESTION_OPTIONS_SEPARATOR = "\n---options---\n";

/**
 * Everything after the LAST `AGENT_RESPONSE:` marker to the end of the buffer.
 * The model sometimes narrates before the marker or repeats it — a greedy
 * prefix pins the match to the final summary line.
 */
export function extractAgentResponse(buffer: string): string | null {
  const m = buffer.match(/[\s\S]*AGENT_RESPONSE:\s*([\s\S]*)$/);
  return m ? m[1].trim() : null;
}

/**
 * All `SKILL_LOADED:<skill-name>` markers in the buffer, in order.
 *
 * Only COMPLETE lines are trusted: the buffer is a rolling stream tail whose
 * last line may be a partial chunk (e.g. `SKILL_LOADED:expo-rou…`). A line is
 * considered complete only when it is terminated by a newline in the buffer —
 * a marker whose line is still streaming is picked up on a later chunk.
 */
export function extractSkillLoadedMarkers(buffer: string): string[] {
  const out: string[] = [];
  const lines = buffer.split("\n");
  const complete = buffer.endsWith("\n") ? lines : lines.slice(0, -1);
  for (const line of complete) {
    const m = line.match(/^\s*SKILL_LOADED:\s*([A-Za-z0-9._-]+)\s*$/);
    if (m) out.push(m[1]);
  }
  return out;
}

/** Parse an `AGENT_QUESTION:` block (+ optional `OPTIONS:` bullets). */
export function extractAgentQuestion(buffer: string): AgentQuestion | null {
  const m = buffer.match(/AGENT_QUESTION:\s*([^\n]+)/);
  if (!m) return null;
  const question = m[1].trim();
  const after = buffer.slice((m.index ?? 0) + m[0].length);
  const optMatch = after.match(/OPTIONS:\s*\n([\s\S]*)/);
  const options: string[] = [];
  if (optMatch) {
    for (const line of optMatch[1].split("\n")) {
      const cleaned = line.trim().replace(/^[-*•]\s*/, "").trim();
      // The options block ends at a blank line or the next agent marker —
      // agents sometimes repeat the whole question block, and swallowing it
      // would pollute the options with marker lines and duplicated choices.
      if (cleaned.length === 0) break;
      if (
        cleaned.startsWith("AGENT_QUESTION:") ||
        cleaned.startsWith("AGENT_RESPONSE:")
      ) {
        break;
      }
      options.push(cleaned);
    }
  }
  return { question, options };
}

/** Encode a question into the journaled event message. */
export function formatQuestionMessage(q: AgentQuestion): string {
  return q.question + QUESTION_OPTIONS_SEPARATOR + q.options.join("\n");
}
