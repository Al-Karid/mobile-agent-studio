import type { AgentAdapter } from "@/contracts/agent";
import { clineAdapter } from "./cline";
import { codexAdapter } from "./codex";
import { claudeAdapter } from "./claude";
import { dryRunAdapter } from "./dry-run";

/**
 * The "plugin engine" — a registry + a config lookup. Nothing more is needed.
 * To add an agent: write one adapter file and register it here.
 */
const agents: Record<string, AgentAdapter> = {
  cline: clineAdapter,
  codex: codexAdapter,
  claude: claudeAdapter,
  "dry-run": dryRunAdapter,
};

export function getAgent(name: string): AgentAdapter {
  const adapter = agents[name];
  if (!adapter) {
    throw new Error(`Unknown agent "${name}". Available: ${Object.keys(agents).join(", ")}`);
  }
  return adapter;
}

export function listAgents(): string[] {
  return Object.keys(agents);
}
