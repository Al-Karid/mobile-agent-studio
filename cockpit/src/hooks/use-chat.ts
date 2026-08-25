import { useMemo } from "react";
import { useProject } from "./use-project";
import { useCorrection } from "./use-correction";
import { buildTurns } from "@/lib/chat";

/**
 * Chat screen composition: project polling + conversation turns + the send
 * action. The screen only renders; all feature logic lives here.
 */
export function useChat(id?: string) {
  const { project, error, setProject, setError } = useProject(id);
  const correction = useCorrection({ projectId: id, status: project?.status ?? "" });

  const turns = useMemo(() => (project ? buildTurns(project) : []), [project]);

  return {
    project,
    error,
    setProject,
    setError,
    turns,
    input: correction.correction,
    setInput: correction.setCorrection,
    send: correction.applyChanges,
    busy: correction.busy,
    sendError: correction.error,
  };
}
