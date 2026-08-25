/**
 * Bootstrap DDL per dialect — `CREATE TABLE IF NOT EXISTS` statements run once
 * at adapter init. Keeps the legacy behavior (schema auto-created at boot) and
 * is a no-op on an existing database. For production schema changes use
 * drizzle-kit (`npm run db:generate` / `db:push`) instead.
 */
export type StorageDialect = "sqlite" | "postgres" | "mysql";

const PROJECTS = (t: (s: string) => string, big: string, id: string) => `
CREATE TABLE IF NOT EXISTS ${t("projects")} (
  id ${id},
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created',
  exp_url TEXT,
  metro_port ${t("metro_port")},
  agent TEXT NOT NULL DEFAULT 'cline',
  model TEXT NOT NULL DEFAULT 'deepseek-v4-flash',
  platform TEXT NOT NULL DEFAULT 'ios',
  created_at ${big} NOT NULL,
  updated_at ${big} NOT NULL
)`;

const USERS = (t: (s: string) => string, big: string, id: string) => `
CREATE TABLE IF NOT EXISTS ${t("users")} (
  id ${id},
  email TEXT,
  password_hash TEXT,
  provider TEXT NOT NULL DEFAULT 'email',
  provider_id TEXT,
  display_name TEXT,
  created_at ${big} NOT NULL
)`;

const SESSIONS = (t: (s: string) => string, big: string, id: string) => `
CREATE TABLE IF NOT EXISTS ${t("sessions")} (
  id ${id},
  user_id TEXT NOT NULL REFERENCES ${t("users")}(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at ${big} NOT NULL
)`;

const SETTINGS = (t: (s: string) => string, big: string, id: string) => `
CREATE TABLE IF NOT EXISTS ${t("settings")} (
  user_id TEXT NOT NULL REFERENCES ${t("users")}(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (user_id, key)
)`;

const RUNS = (t: (s: string) => string, big: string, id: string) => `
CREATE TABLE IF NOT EXISTS ${t("runs")} (
  id ${id},
  project_id TEXT NOT NULL REFERENCES ${t("projects")}(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  input TEXT,
  agent TEXT,
  model TEXT,
  log TEXT NOT NULL DEFAULT '',
  error TEXT,
  commit_sha TEXT,
  created_at ${big} NOT NULL,
  finished_at ${big}
)`;

const EVENTS = (t: (s: string) => string, big: string, id: string) => `
CREATE TABLE IF NOT EXISTS ${t("events")} (
  id ${id},
  project_id TEXT NOT NULL REFERENCES ${t("projects")}(id) ON DELETE CASCADE,
  run_id ${t("run_id")},
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at ${big} NOT NULL
)`;

const IDX = (table: string, column: string, idx: string) =>
  `CREATE INDEX IF NOT EXISTS ${idx} ON ${table}(${column})`;

const q = (s: string) => `"${s}"`;
const plain = (s: string) => s;

export const BOOTSTRAP_DDL: Record<StorageDialect, string[]> = {
  sqlite: [
    PROJECTS(plain, "INTEGER", "TEXT PRIMARY KEY"),
    USERS(plain, "INTEGER", "TEXT PRIMARY KEY"),
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id)",
    SESSIONS(plain, "INTEGER", "INTEGER PRIMARY KEY AUTOINCREMENT"),
    SETTINGS(plain, "INTEGER", "TEXT PRIMARY KEY"),
    RUNS(plain, "INTEGER", "INTEGER PRIMARY KEY AUTOINCREMENT"),
    IDX("runs", "project_id", "idx_runs_project"),
    EVENTS(plain, "INTEGER", "INTEGER PRIMARY KEY AUTOINCREMENT"),
    IDX("events", "project_id", "idx_events_project"),
  ],
  postgres: [
    PROJECTS(plain, "BIGINT", "TEXT PRIMARY KEY"),
    USERS(plain, "BIGINT", "TEXT PRIMARY KEY"),
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id)",
    SESSIONS(plain, "BIGINT", "SERIAL PRIMARY KEY"),
    SETTINGS(plain, "BIGINT", "TEXT PRIMARY KEY"),
    RUNS(plain, "BIGINT", "SERIAL PRIMARY KEY"),
    IDX("runs", "project_id", "idx_runs_project"),
    EVENTS(plain, "BIGINT", "SERIAL PRIMARY KEY"),
    IDX("events", "project_id", "idx_events_project"),
  ],
  mysql: [
    PROJECTS(q, "BIGINT", "VARCHAR(255) PRIMARY KEY"),
    USERS(q, "BIGINT", "VARCHAR(255) PRIMARY KEY"),
    "CREATE UNIQUE INDEX idx_users_email ON users(email)",
    "CREATE UNIQUE INDEX idx_users_provider ON users(provider, provider_id)",
    SESSIONS(q, "BIGINT", "INT AUTO_INCREMENT PRIMARY KEY"),
    SETTINGS(q, "BIGINT", "TEXT PRIMARY KEY"),
    RUNS(q, "BIGINT", "INT AUTO_INCREMENT PRIMARY KEY").replace(
      "project_id TEXT NOT NULL",
      "project_id VARCHAR(255) NOT NULL"
    ),
    IDX("runs", "project_id", "idx_runs_project"),
    EVENTS(q, "BIGINT", "INT AUTO_INCREMENT PRIMARY KEY").replace(
      "project_id TEXT NOT NULL",
      "project_id VARCHAR(255) NOT NULL"
    ),
    IDX("events", "project_id", "idx_events_project"),
  ],
};

