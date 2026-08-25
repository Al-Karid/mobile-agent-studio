/**
 * Pure run-log cap policy — DB-agnostic (no SQL `substr` tricks anywhere).
 * Keeps the HEAD (setup / create-expo-app output) AND the TAIL (latest agent
 * streaming) of a verbose run, with a marker between them, so a chatty agent
 * can't bloat the DB or the API responses.
 */
export const RUN_LOG_MAX = 100_000;
export const RUN_LOG_HEAD = 20_000;
const MARKER = "\n…[truncated]…\n";

export function capRunLog(
  log: string,
  chunk: string,
  max = RUN_LOG_MAX,
  head = RUN_LOG_HEAD
): string {
  const combined = log + chunk;
  if (combined.length <= max) return combined;
  const keepTail = Math.max(0, max - head - MARKER.length);
  return combined.slice(0, head) + MARKER + combined.slice(-keepTail);
}
