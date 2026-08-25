import { useCallback, useEffect, useState } from "react";
import { sendPrompt } from "@/lib/api";

/**
 * Correction-loop state machine for a project (review → "Apply changes" → re-run).
 * Owns the prompt text, the in-flight flag, the busy gate and the request itself;
 * the screen only renders and delegates — no feature logic inline.
 */
const ACTIVE_RUN_STATUSES = new Set([
  "created",
  "initializing",
  "generating",
  "qa",
  "launching",
]);

export interface UseCorrectionArgs {
  /** Project id (may be undefined while the route param is still resolving). */
  projectId?: string;
  /** Current project status, drives the busy gate. */
  status: string;
}

export function useCorrection({ projectId, status }: UseCorrectionArgs) {
  const [correction, setCorrection] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A run is active while the project is mid-pipeline; corrections are only
  // meaningful once the app exists and no job is running.
  const busy = ACTIVE_RUN_STATUSES.has(status) || sending;

  // Once the queued correction run is picked up, the status flips away from
  // the idle state — reset the in-flight flag so the button re-enables when
  // the run finishes (ready / failed / needs_dev_build).
  useEffect(() => {
    setSending(false);
  }, [status]);

  const applyChanges = useCallback(
    async (text?: string) => {
      // `text` is used by option chips on agent questions; otherwise the
      // current input text is sent.
      const value = text ?? correction;
      if (!projectId || !value.trim()) return;
      setSending(true);
      setError(null);
      try {
        await sendPrompt(projectId, value.trim());
        setCorrection("");
        // The screen's poll picks up the status transition to "generating".
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setSending(false);
      }
    },
    [projectId, correction]
  );

  return { correction, setCorrection, applyChanges, busy, sending, error };
}
