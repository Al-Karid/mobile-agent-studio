import { useCallback, useState } from "react";
import { Linking } from "react-native";
import {
  getProject,
  launchProject,
  stopProject,
  type ProjectDetail,
} from "@/lib/api";

/**
 * Project lifecycle actions (open / stop) for the chat and settings screens.
 * Owns the in-flight flags and the polling needed to hand back an exp:// URL;
 * the screens render and delegate — no feature logic inline.
 */
export interface UseProjectActionsArgs {
  /** Project id (may be undefined while the route param is still resolving). */
  projectId?: string;
  /** Current project status, drives which action applies. */
  status?: string;
  /** Current exp:// URL (only present once the app was launched). */
  expUrl?: string | null;
  /** Called with fresh project data whenever launch/stop observes a state change. */
  onProjectChange?: (p: ProjectDetail) => void;
  /** Called with a user-facing message on failure. */
  onError?: (message: string) => void;
}

export function useProjectActions({
  projectId,
  status,
  expUrl,
  onProjectChange,
  onError,
}: UseProjectActionsArgs) {
  const [opening, setOpening] = useState(false);
  const [stopping, setStopping] = useState(false);

  const launchAndOpen = useCallback(async () => {
    if (!projectId) return;
    setOpening(true);
    try {
      await launchProject(projectId);
      // Poll until the server reports an exp:// URL, then open it in Expo Go.
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const p = await getProject(projectId);
        if (p.exp_url) {
          onProjectChange?.(p);
          await Linking.openURL(p.exp_url);
          setOpening(false);
          return;
        }
        if (p.status === "failed") throw new Error("launch failed");
      }
      throw new Error("launch timed out");
    } catch (e) {
      onError?.(e instanceof Error ? e.message : String(e));
      setOpening(false);
    }
  }, [projectId, onProjectChange, onError]);

  /** Open the app in Expo Go: run it first if it's stopped, else open directly. */
  const open = useCallback(async () => {
    if (!projectId) return;
    if (status === "launched") {
      if (expUrl) {
        try {
          await Linking.openURL(expUrl);
        } catch (e) {
          onError?.(e instanceof Error ? e.message : String(e));
        }
      }
      return;
    }
    if (status === "ready") {
      await launchAndOpen();
    }
  }, [projectId, status, expUrl, launchAndOpen, onError]);

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

  return { opening, stopping, open, stop };
}
