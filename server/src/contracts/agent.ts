/**
 * Agent contract — the only way the orchestrator talks to a coding agent.
 * A provider is a thin adapter (one file) behind this interface, so swapping
 * Cline → Codex → Claude Code is a config change, never a code change.
 */

export interface AgentRunRequest {
  /** Absolute path to the project directory the agent works in. */
  projectDir: string;
  /** The user's prompt (create / correct). */
  prompt: string;
  /** Extra system context (e.g. the AGENTS.md rules), optional. */
  context?: string;
  /** Environment passed to the agent process (API keys etc.). */
  env?: Record<string, string>;
}

export type AgentEvent =
  | { type: "output"; data: string }
  | { type: "error"; data: string }
  | { type: "done"; exitCode: number };

export interface AgentAdapter {
  /** Stable id, used as the registry key and the config value. */
  readonly name: string;
  /** Whether the underlying CLI is installed and usable. */
  isAvailable(): Promise<boolean>;
  /** Run the agent. Streams events; resolves when the agent exits. */
  run(req: AgentRunRequest): AsyncIterable<AgentEvent>;
}

export interface AgentRunOutcome {
  exitCode: number;
  /** Total output captured (for logging). */
  output: string;
}
