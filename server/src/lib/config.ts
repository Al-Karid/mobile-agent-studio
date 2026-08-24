import "dotenv/config";
import path from "node:path";

/**
 * Central config. Loaded once; every other module reads from here so that
 * swapping providers/agents/ports is a one-line .env change, never a code change.
 */

function str(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.length > 0 ? v : fallback;
}

function int(name: string, fallback: number): number {
  const v = process.env[name];
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  deepseek: {
    apiKey: str("DEEPSEEK_API_KEY", ""),
    baseUrl: str("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
    model: str("DEEPSEEK_MODEL", "deepseek-v4-flash"),
  },
  defaultAgent: str("DEFAULT_AGENT", "cline"),
  defaultValidator: str("DEFAULT_VALIDATOR", "none"),
  port: int("PORT", 3000),
  metroPort: int("METRO_PORT", 8081),
  // Scoped under process.cwd(); turbopackIgnore keeps build tracing bounded
  // (otherwise Turbopack traces the whole repo, which breaks page-data collection).
  projectsDir: path.join(/* turbopackIgnore: true */ process.cwd(), str("PROJECTS_DIR", "projects")),
} as const;

/** Local LAN IP, used to build the exp:// URL that Expo Go loads. */
export function lanIp(): string {
  const ifaces = require("node:os").networkInterfaces() as Record<
    string,
    { family: string; internal: boolean; address: string }[] | undefined
  >;
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name] ?? []) {
      if (iface.family === "IPv4" && !iface.internal) return iface.address;
    }
  }
  return "127.0.0.1";
}
