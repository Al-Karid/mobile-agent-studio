import type { AgentRunRequest } from "@/contracts/agent";

/**
 * Per-run credentials for an agent, resolved from the PROJECT OWNER's saved
 * settings at run time. `env` carries keys the adapter injects into the child
 * process; `provider/apiKey/model` are the cline-specific overrides.
 */
export interface AgentCredentials {
  provider?: string;
  apiKey?: string;
  model?: string;
  env: Record<string, string>;
}

/** Keys stored per user in the `settings` table. */
export const SETTING_KEYS = {
  clineProvider: "cline.provider",
  clineKey: (provider: string) => `cline.key.${provider}`,
  clineModel: "cline.model",
  codexKey: "codex.key",
  claudeKey: "claude.key",
} as const;

export function resolveCredentials(
  settings: Record<string, string>,
  agent: string,
  defaultModel: string
): AgentCredentials {
  if (agent === "cline") {
    const provider = settings[SETTING_KEYS.clineProvider] ?? "deepseek";
    const apiKey = settings[SETTING_KEYS.clineKey(provider)];
    const model = settings[SETTING_KEYS.clineModel] || defaultModel;
    return { provider, apiKey, model, env: {} };
  }
  if (agent === "codex") {
    const apiKey = settings[SETTING_KEYS.codexKey];
    return { apiKey, env: apiKey ? { OPENAI_API_KEY: apiKey } : {} };
  }
  if (agent === "claude") {
    const apiKey = settings[SETTING_KEYS.claudeKey];
    return { apiKey, env: apiKey ? { ANTHROPIC_API_KEY: apiKey } : {} };
  }
  return { env: {} };
}

export function maskKey(key: string | undefined): string {
  if (!key) return "";
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 3)}••••${key.slice(-4)}`;
}

export type { AgentRunRequest };