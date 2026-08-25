import { useMemo } from "react";
import { useProject } from "./use-project";
import { useCorrection } from "./use-correction";
import { buildTimeline } from "@/lib/events";

/**
 * Chat screen composition: project polling + the real-event timeline + the
 * send action. The screen only renders; all feature logic lives here.
 */
export function useChat(id?: string) {
  const { project, error, setProject, setError } = useProject(id);
  const correction = useCorrection({ projectId: id, status: project?.status ?? "" });

  const timeline = useMemo(() => (project ? buildTimeline(project) : []), [project]);

  return {
    project,
    error,
    setProject,
    setError,
    timeline,
    input: correction.correction,
    setInput: correction.setCorrection,
    send: correction.applyChanges,
    busy: correction.busy,
    sendError: correction.error,
  };
}
