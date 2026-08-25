import { useCallback, useState } from "react";
import { Linking } from "react-native";
import {
  getProject,
  launchProject,
  stopProject,
  type ProjectDetail,
} from "@/lib/api";

/**
 * Project lifecycle actions (launch / stop) for the details screen.
 * Owns the in-flight flags and the polling needed to hand back an exp:// URL;
 * the screen renders and delegates — no feature logic inline.
 */
export interface UseProjectActionsArgs {
  /** Project id (may be undefined while the route param is still resolving). */
  projectId?: string;
  /** Called with fresh project data whenever launch/stop observes a state change. */
  onProjectChange?: (p: ProjectDetail) => void;
  /** Called with a user-facing message on failure. */
  onError?: (message: string) => void;
}

export function useProjectActions({
  projectId,
  onProjectChange,
  onError,
}: UseProjectActionsArgs) {
  const [launching, setLaunching] = useState(false);
  const [stopping, setStopping] = useState(false);

  const launch = useCallback(async () => {
    if (!projectId) return;
    setLaunching(true);
    try {
      await launchProject(projectId);
      // Poll until the server reports an exp:// URL, then open it in Expo Go.
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const p = await getProject(projectId);
        if (p.exp_url) {
          onProjectChange?.(p);
          await Linking.openURL(p.exp_url);
          setLaunching(false);
          return;
        }
        if (p.status === "failed") throw new Error("launch failed");
      }
      throw new Error("launch timed out");
    } catch (e) {
      onError?.(e instanceof Error ? e.message : String(e));
      setLaunching(false);
    }
  }, [projectId, onProjectChange, onError]);

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

  return { launching, stopping, launch, stop };
}
