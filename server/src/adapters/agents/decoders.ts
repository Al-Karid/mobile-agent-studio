import type { AgentEvent } from "@/contracts/agent";

/**
 * Per-agent output decoders.
 *
 * Some agent CLIs wrap their output in a machine format — cline's `--json`
 * emits line-delimited JSON events (hooks, reasoning, tool calls, run_result
 * usage) with the agent's text carried per-token inside content_start events.
 * Others (codex, claude, dry-run) print plain text. The marker parser
 * downstream (AGENT_QUESTION: / AGENT_RESPONSE:) must scan PLAIN text, so every
 * adapter routes its raw output through its registered decoder via
 * decodeAgentOutput(). Add a decoder here for any agent whose CLI wraps output.
 */

export type AgentDecoder = (
  src: AsyncIterable<AgentEvent>
) => AsyncIterable<AgentEvent>;

/** Pass-through — the agent already emits plain text. */
function identity(src: AsyncIterable<AgentEvent>): AsyncIterable<AgentEvent> {
  return src;
}

/** Cline decoder: strip the --json envelope → clean text deltas. */
export async function* decodeClineText(
  src: AsyncIterable<AgentEvent>
): AsyncIterable<AgentEvent> {
  let buffered = "";
  for await (const ev of src) {
    if (ev.type === "output") {
      buffered += ev.data;
      let nl: number;
      while ((nl = buffered.indexOf("\n")) !== -1) {
        const line = buffered.slice(0, nl);
        buffered = buffered.slice(nl + 1);
        const text = extractClineText(line);
        if (text !== null) yield { type: "output", data: text };
      }
    } else {
      yield ev; // error / done pass through
    }
  }
  // Trailing line without a final newline.
  const text = extractClineText(buffered);
  if (text !== null) yield { type: "output", data: text };
}

/**
 * One cline stdout line → the agent's clean text delta, or null when it's a
 * JSON envelope event to drop (hooks, reasoning, tool calls, run_result usage).
 * Non-JSON lines pass through untouched.
 */
export function extractClineText(line: string): string | null {
  if (line.trim().length === 0) return null; // blank line / empty buffer tail
  if (!line.trim().startsWith("{")) return line;
  try {
    const obj = JSON.parse(line);
    if (
      obj?.type === "agent_event" &&
      obj.event?.contentType === "text" &&
      typeof obj.event.text === "string"
    ) {
      return obj.event.text;
    }
    return null;
  } catch {
    return line;
  }
}

/** Register a decoder here for any agent whose CLI wraps its output. */
export const agentDecoders: Record<string, AgentDecoder> = {
  "dry-run": identity,
  cline: decodeClineText,
  codex: identity,
  claude: identity,
};

/** Route an agent's raw output through its registered decoder. */
export function decodeAgentOutput(
  agent: string,
  src: AsyncIterable<AgentEvent>
): AsyncIterable<AgentEvent> {
  return (agentDecoders[agent] ?? identity)(src);
}