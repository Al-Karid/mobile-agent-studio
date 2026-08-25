import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { getProject, type ProjectDetail } from "@/lib/api";

/**
 * Shared project-detail loader + poller. Used by both the chat screen and the
 * settings screen — no screen re-implements the poll loop.
 */
export function useProject(id?: string) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    getProject(id)
      .then((p) => {
        setProject(p);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
      const t = setInterval(load, 2500);
      return () => clearInterval(t);
    }, [load])
  );

  return { project, error, reload: load, setProject, setError };
}
