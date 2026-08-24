import { EventEmitter } from "node:events";

/**
 * Minimal in-process pub/sub for SSE. One channel per project id.
 * Single-process design (V1) — no Redis. A reconnect replays from SQLite
 * (`events` table) so nothing is lost when a subscriber is offline.
 */

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

export interface LiveEvent {
  projectId: string;
  runId?: number | null;
  type: string;
  message: string;
  at: number;
}

export function publish(e: LiveEvent): void {
  emitter.emit(e.projectId, e);
}

export function subscribe(
  projectId: string,
  listener: (e: LiveEvent) => void
): () => void {
  emitter.on(projectId, listener);
  return () => emitter.off(projectId, listener);
}
