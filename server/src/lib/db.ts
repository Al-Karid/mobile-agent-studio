import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

/**
 * SQLite is the single source of truth. Everything the orchestrator knows
 * (projects, runs, events) lives here, so a client can disconnect and replay
 * the full history later — and a restart resumes interrupted runs.
 */

const dataDir = path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "studio.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  prompt      TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'created',
  exp_url     TEXT,
  metro_port  INTEGER,
  agent       TEXT NOT NULL DEFAULT 'cline',
  model       TEXT NOT NULL DEFAULT 'deepseek-v4-flash',
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS runs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,              -- create | generate | correct | launch
  status      TEXT NOT NULL DEFAULT 'pending', -- pending | running | done | failed | interrupted
  input       TEXT,
  agent       TEXT,
  model       TEXT,
  log         TEXT NOT NULL DEFAULT '',
  error       TEXT,
  commit_sha  TEXT,                       -- git commit at the end of the run
  created_at  INTEGER NOT NULL,
  finished_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_runs_project ON runs(project_id);

CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  run_id      INTEGER,
  type        TEXT NOT NULL,              -- status | log | ready | error
  message     TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_project ON events(project_id);
`);

export type ProjectStatus =
  | "created"
  | "initializing"
  | "generating"
  | "qa"
  | "ready"
  | "launching"
  | "launched"
  | "needs_dev_build"
  | "failed"
  | "interrupted";

export interface Project {
  id: string;
  name: string;
  prompt: string;
  status: ProjectStatus;
  exp_url: string | null;
  metro_port: number | null;
  agent: string;
  model: string;
  created_at: number;
  updated_at: number;
}

export interface Run {
  id: number;
  project_id: string;
  kind: string;
  status: string;
  input: string | null;
  agent: string | null;
  model: string | null;
  log: string;
  error: string | null;
  commit_sha: string | null;
  created_at: number;
  finished_at: number | null;
}

export interface StudioEvent {
  id: number;
  project_id: string;
  run_id: number | null;
  type: string;
  message: string;
  created_at: number;
}

const now = () => Date.now();

export function createProject(p: {
  id: string;
  name: string;
  prompt: string;
  agent: string;
  model: string;
}): Project {
  const t = now();
  db.prepare(
    `INSERT INTO projects (id, name, prompt, status, agent, model, created_at, updated_at)
     VALUES (@id, @name, @prompt, 'created', @agent, @model, @t, @t)`
  ).run({ ...p, t });
  return getProject(p.id)!;
}

export function getProject(id: string): Project | undefined {
  return db.prepare(`SELECT * FROM projects WHERE id = ?`).get(id) as
    | Project
    | undefined;
}

export function listProjects(): Project[] {
  return db
    .prepare(`SELECT * FROM projects ORDER BY created_at DESC`)
    .all() as Project[];
}

export function setProjectStatus(id: string, status: ProjectStatus): void {
  db.prepare(
    `UPDATE projects SET status = ?, updated_at = ? WHERE id = ?`
  ).run(status, now(), id);
}

export function setProjectExpUrl(id: string, expUrl: string | null, metroPort: number | null): void {
  db.prepare(
    `UPDATE projects SET exp_url = ?, metro_port = ?, updated_at = ? WHERE id = ?`
  ).run(expUrl, metroPort, now(), id);
}

export function createRun(r: {
  projectId: string;
  kind: string;
  input?: string;
  agent?: string;
  model?: string;
}): Run {
  const t = now();
  const info = db
    .prepare(
      `INSERT INTO runs (project_id, kind, status, input, agent, model, created_at)
       VALUES (?, ?, 'pending', ?, ?, ?, ?)`
    )
    .run(r.projectId, r.kind, r.input ?? null, r.agent ?? null, r.model ?? null, t);
  return db.prepare(`SELECT * FROM runs WHERE id = ?`).get(info.lastInsertRowid) as Run;
}

export function getRun(id: number): Run | undefined {
  return db.prepare(`SELECT * FROM runs WHERE id = ?`).get(id) as Run | undefined;
}

export function listRuns(projectId: string): Run[] {
  return db
    .prepare(`SELECT * FROM runs WHERE project_id = ? ORDER BY id ASC`)
    .all(projectId) as Run[];
}

export function setRunStatus(id: number, status: string): void {
  db.prepare(
    `UPDATE runs SET status = ?, finished_at = CASE WHEN ? IN ('done','failed','interrupted') THEN ? ELSE finished_at END WHERE id = ?`
  ).run(status, status, now(), id);
}

export function appendRunLog(id: number, chunk: string): void {
  // Keep only the most recent ~100KB so a verbose agent (streaming tokens)
  // can't bloat the DB file or the API responses.
  db.prepare(`UPDATE runs SET log = substr(log || ?, -100000) WHERE id = ?`).run(chunk, id);
}

export function setRunError(id: number, error: string): void {
  db.prepare(`UPDATE runs SET error = ? WHERE id = ?`).run(error, id);
}

export function setRunCommit(id: number, commit: string): void {
  db.prepare(`UPDATE runs SET commit_sha = ? WHERE id = ?`).run(commit, id);
}

export function addEvent(e: {
  projectId: string;
  runId?: number | null;
  type: string;
  message: string;
}): StudioEvent {
  const t = now();
  const info = db
    .prepare(
      `INSERT INTO events (project_id, run_id, type, message, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(e.projectId, e.runId ?? null, e.type, e.message, t);
  return db.prepare(`SELECT * FROM events WHERE id = ?`).get(info.lastInsertRowid) as StudioEvent;
}

export function listEvents(projectId: string, afterId = 0): StudioEvent[] {
  return db
    .prepare(`SELECT * FROM events WHERE project_id = ? AND id > ? ORDER BY id ASC`)
    .all(projectId, afterId) as StudioEvent[];
}

export function listProjectsWithRuns(): Project[] {
  return listProjects();
}

/** Mark orphaned "running" runs as interrupted; flag their projects accordingly. */
export function recoverInterrupted(): void {
  const t = now();
  const ids = db
    .prepare(`SELECT DISTINCT project_id FROM runs WHERE status = 'running'`)
    .all() as { project_id: string }[];
  db.prepare(
    `UPDATE runs SET status = 'interrupted', finished_at = ? WHERE status = 'running'`
  ).run(t);
  for (const { project_id } of ids) {
    db.prepare(
      `UPDATE projects SET status = 'interrupted', updated_at = ?
       WHERE id = ? AND status IN ('initializing','generating','qa','launching')`
    ).run(t, project_id);
  }
}

/** Next run to execute (FIFO). */
export function nextPendingRun(): Run | undefined {
  return db
    .prepare(`SELECT * FROM runs WHERE status = 'pending' ORDER BY id ASC LIMIT 1`)
    .get() as Run | undefined;
}

/** Delete a project (runs/events cascade via foreign key). */
export function deleteProject(id: string): void {
  db.prepare(`DELETE FROM projects WHERE id = ?`).run(id);
}

export default db;
