/**
 * Storage contract — the only way the orchestrator talks to its database.
 * The engine behind it (SQLite / Postgres / MySQL via Drizzle) is swappable
 * behind this interface: `DATABASE_DRIVER` in `.env` is the only switch,
 * exactly like the agent/validator adapters.
 */

export type ProjectStatus =
  | "created"
  | "initializing"
  | "generating"
  | "qa"
  | "ready"
  | "launching"
  | "launched"
  | "needs_dev_build"
  | "awaiting_input"
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
  /** Target platform for the generated app. Android isn't supported yet. */
  platform: "ios" | "android" | "both";
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

export interface StorageAdapter {
  // projects
  createProject(p: {
    id: string;
    name: string;
    prompt: string;
    agent: string;
    model: string;
    platform: "ios" | "android" | "both";
  }): Promise<Project>;
  getProject(id: string): Promise<Project | undefined>;
  listProjects(): Promise<Project[]>;
  setProjectStatus(id: string, status: ProjectStatus): Promise<void>;
  setProjectExpUrl(id: string, expUrl: string | null, metroPort: number | null): Promise<void>;
  deleteProject(id: string): Promise<void>;

  // runs
  createRun(r: {
    projectId: string;
    kind: string;
    input?: string;
    agent?: string;
    model?: string;
  }): Promise<Run>;
  getRun(id: number): Promise<Run | undefined>;
  listRuns(projectId: string): Promise<Run[]>;
  setRunStatus(id: number, status: string): Promise<void>;
  /** Append to the run log, applying the shared head+tail cap (lib/run-log). */
  appendRunLog(id: number, chunk: string): Promise<void>;
  setRunError(id: number, error: string): Promise<void>;
  setRunCommit(id: number, commit: string): Promise<void>;
  nextPendingRun(): Promise<Run | undefined>;
  /** On boot: mark orphaned "running" runs interrupted; flag their projects. */
  recoverInterrupted(): Promise<void>;

  // journal
  addEvent(e: {
    projectId: string;
    runId?: number | null;
    type: string;
    message: string;
  }): Promise<StudioEvent>;
  listEvents(projectId: string, afterId?: number): Promise<StudioEvent[]>;
}
