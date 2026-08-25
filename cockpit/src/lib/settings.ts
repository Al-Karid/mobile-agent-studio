// The API server URL is set via .env ONLY (EXPO_PUBLIC_API_URL) — there is no
// in-app editing path. The fallback keeps local dev working without a .env.
const DEFAULT = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export function getApiUrl(): string {
  return DEFAULT;
}
