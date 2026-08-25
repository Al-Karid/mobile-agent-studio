import { useCallback, useState } from "react";
import { Linking } from "react-native";
import {
  getProject,
  launchProject,
  stopProject,
  type ProjectDetail,
} from "@/lib/api";

/**
 * Project lifecycle actions (start / open / stop) for the chat and settings
 * screens. Starting launches Metro WITHOUT opening Expo Go — the user opens
 * the running app manually via `open`. Owns the in-flight flags and the
 * polling needed to observe the launched state.
 */
export interface UseProjectActionsArgs {
  /** Project id (may be undefined while the route param is still resolving). */
  projectId?: string;
  /** Current exp:// URL (only present once the app was launched). */
  expUrl?: string | null;
  /** Called with fresh project data whenever start/stop observes a state change. */
  onProjectChange?: (p: ProjectDetail) => void;
  /** Called with a user-facing message on failure. */
  onError?: (message: string) => void;
}

export function useProjectActions({
  projectId,
  expUrl,
  onProjectChange,
  onError,
}: UseProjectActionsArgs) {
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);

  /** Start the app (Metro) without opening it — the user opens manually. */
  const start = useCallback(async () => {
    if (!projectId) return;
    setStarting(true);
    try {
      await launchProject(projectId);
      // Poll until the server reports it's launched (exp:// URL present).
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const p = await getProject(projectId);
        if (p.exp_url || p.status === "launched") {
          onProjectChange?.(p);
          setStarting(false);
          return;
        }
        if (p.status === "failed") throw new Error("launch failed");
      }
      throw new Error("launch timed out");
    } catch (e) {
      onError?.(e instanceof Error ? e.message : String(e));
      setStarting(false);
    }
  }, [projectId, onProjectChange, onError]);

  /** Open the already-running app in Expo Go. */
  const open = useCallback(async () => {
    if (!projectId || !expUrl) return;
    try {
      await Linking.openURL(expUrl);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : String(e));
    }
  }, [projectId, expUrl, onError]);

  const stop = useCallback(async () => {
    if (!projectId) return;
    setStopping(true);
    try {
      await stopProject(projectId);
      const p = await getProject(projectId);
      onProjectChange?.(p);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : String(e));
    } finally {
      setStopping(false);
    }
  }, [projectId, onProjectChange, onError]);

  return { starting, stopping, start, open, stop };
}
