import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import type { ProjectDetail } from "@/lib/api";
import { useProjectStore } from "@/lib/project-store";

/**
 * Shared project-detail loader + poller, backed by the global Zustand store.
 * Reads the prefetched detail synchronously so the screen renders with real
 * state on the first frame (no load-time flip), then keeps polling to stay
 * live. Used by both the chat screen and the settings screen.
 */
export function useProject(id?: string) {
  const project = useProjectStore((s) => (id ? s.details[id] : undefined));
  const refreshProject = useProjectStore((s) => s.refreshProject);
  const setProjectDetail = useProjectStore((s) => s.setProjectDetail);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    refreshProject(id).catch((e) =>
      setError(e instanceof Error ? e.message : String(e))
    );
  }, [id, refreshProject]);

  useFocusEffect(
    useCallback(() => {
      load();
      const t = setInterval(load, 2500);
      return () => clearInterval(t);
    }, [load])
  );

  const setProject = useCallback(
    (p: ProjectDetail) => setProjectDetail(p),
    [setProjectDetail]
  );

  return { project: project ?? null, error, reload: load, setProject, setError };
}
