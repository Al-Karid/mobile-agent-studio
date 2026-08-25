import { useMemo } from "react";
import { useProject } from "./use-project";
import { useCorrection } from "./use-correction";
import { buildTimeline } from "@/lib/events";
import { useAgentAvailability } from "@/lib/agent-keys";

/**
 * Chat screen composition: project polling + the real-event timeline + the
 * send action. The screen only renders; all feature logic lives here.
 */
export function useChat(id?: string) {
  const { project, error, setProject, setError } = useProject(id);
  const { isAvailable } = useAgentAvailability();
  const correction = useCorrection({ projectId: id, status: project?.status ?? "" });

  const timeline = useMemo(() => (project ? buildTimeline(project) : []), [project]);

  // Lock the input until the project's agent is confirmed to have an API key
  // (dry-run never needs one; unknown → locked by default).
  const agent = project?.agent ?? "";
  const inputLocked = agent ? !isAvailable(agent) : false;

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
    inputLocked,
  };
}
