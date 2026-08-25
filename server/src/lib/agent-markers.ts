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
 */
export interface AgentQuestion {
  question: string;
  options: string[];
}

export const QUESTION_OPTIONS_SEPARATOR = "\n---options---\n";

/** First non-empty line after the `AGENT_RESPONSE:` marker, trimmed. */
export function extractAgentResponse(buffer: string): string | null {
  const m = buffer.match(/AGENT_RESPONSE:\s*([^\n]+)/);
  return m ? m[1].trim() : null;
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
      if (cleaned.length > 0) options.push(cleaned);
    }
  }
  return { question, options };
}

/** Encode a question into the journaled event message. */
export function formatQuestionMessage(q: AgentQuestion): string {
  return q.question + QUESTION_OPTIONS_SEPARATOR + q.options.join("\n");
}
