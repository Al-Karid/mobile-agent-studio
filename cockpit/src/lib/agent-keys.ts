import { useEffect, useMemo, useState } from "react";
import { getProviderSettings, type ProviderSettings } from "./api";

/**
 * Per-agent API-key availability. An agent is only usable when the user has
 * saved a key for it (cline = the provider chosen in Settings, codex = OpenAI
 * key, claude = Anthropic key); dry-run never needs a key. Shared by the New
 * Project agent selector and the chat input lock.
 */

/** Standard agent selector options (dry-run never needs a key). */
export const AGENT_OPTIONS = [
  { id: "dry-run", title: "Dry run" },
  { id: "cline", title: "Cline" },
  { id: "codex", title: "Codex" },
  { id: "claude", title: "Claude" },
] as const;

export function isAgentAvailable(settings: ProviderSettings, agent: string): boolean {
  if (agent === "dry-run") return true;
  if (agent === "cline") return Boolean(settings.cline.keys[settings.cline.provider]);
  if (agent === "codex") return Boolean(settings.codex.key);
  if (agent === "claude") return Boolean(settings.claude.key);
  return false;
}

/** Enabled flags for the standard agent selector (dry-run always on). */
export function enabledAgentsFrom(settings: ProviderSettings): Record<string, boolean> {
  return {
    "dry-run": true,
    cline: isAgentAvailable(settings, "cline"),
    codex: isAgentAvailable(settings, "codex"),
    claude: isAgentAvailable(settings, "claude"),
  };
}

/** True when none of the AI agents has a key (dry-run is the only option). */
export function noApiKeys(settings: ProviderSettings): boolean {
  return (
    !isAgentAvailable(settings, "cline") &&
    !isAgentAvailable(settings, "codex") &&
    !isAgentAvailable(settings, "claude")
  );
}

/**
 * Loads the user's provider settings once and exposes key availability.
 * `isAvailable(agent)` returns false until settings have loaded, so callers
 * lock by default and unlock once we know a key exists.
 */
export function useAgentAvailability() {
  const [settings, setSettings] = useState<ProviderSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getProviderSettings()
      .then((p) => {
        if (!cancelled) setSettings(p);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const enabledAgents = useMemo(
    () => (settings ? enabledAgentsFrom(settings) : {}),
    [settings]
  );

  return {
    settings,
    error,
    loading: settings === null && error === null,
    enabledAgents,
    hasAnyKey: settings ? !noApiKeys(settings) : false,
    isAvailable: (agent: string) =>
      settings ? isAgentAvailable(settings, agent) : false,
  };
}