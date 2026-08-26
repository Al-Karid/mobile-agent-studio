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
  // Model catalog served to the cockpit (Settings → model pickers). Comma-
  // separated env lists; the first entry is each provider's default.
  models: {
    deepseek: str("DEEPSEEK_MODELS", "deepseek-v4-flash,deepseek-v4-pro")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    openai: str("OPENAI_MODELS", "gpt-5.6-sol,gpt-5.6-terra,gpt-5.6-luna")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    anthropic: str(
      "ANTHROPIC_MODELS",
      "claude-sonnet-5,claude-opus-5,claude-fable-5,claude-haiku-4-5-20251001"
    )
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  },
  // Storage backend (Drizzle): sqlite | postgres | mysql. Swapping the DB is a
  // .env change — the orchestrator only talks to the StorageAdapter contract.
  storage: str("DATABASE_DRIVER", "sqlite"),
  databaseUrl: str("DATABASE_URL", path.join(process.cwd(), "data", "studio.db")),
  port: int("PORT", 3000),
  // Dev mode (npm run dev / non-production) — gates extra console diagnostics
  // (e.g. which shared skills the coding agent loads).
  dev: process.env.NODE_ENV !== "production",
  // Start of the dedicated Metro port range for GENERATED apps. The cockpit's
  // dev Metro occupies 8081, so generated apps are allocated 8100+ dynamically.
  metroPort: int("METRO_PORT", 8100),
  // Scoped under process.cwd(); turbopackIgnore keeps build tracing bounded
  // (otherwise Turbopack traces the whole repo, which breaks page-data collection).
  projectsDir: path.join(/* turbopackIgnore: true */ process.cwd(), str("PROJECTS_DIR", "projects")),
  // Shared agent skill library (ships with the server) — copied into every
  // generated project so the coding agents can read only the skills they need
  // (see jobs/generate.ts AGENT_CONTEXT and the project's AGENTS.md).
  skillsDir: path.join(process.cwd(), "skills"),
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
