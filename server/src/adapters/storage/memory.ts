import type {
  Project,
  ProjectStatus,
  Run,
  StorageAdapter,
  StudioEvent,
} from "@/contracts/storage";
import { capRunLog } from "@/lib/run-log";

/**
 * In-memory StorageAdapter — proves the contract is storage-agnostic (the
 * orchestrator works against this with zero database) and powers fast unit
 * tests. NOT used at runtime.
 */
export function createMemoryStorage(): StorageAdapter {
  const projects = new Map<string, Project>();
  const runs = new Map<number, Run>();
  const events: StudioEvent[] = [];
  let nextRunId = 0;
  let nextEventId = 0;

  return {
    async createProject(p) {
      const t = Date.now();
      const project: Project = {
        ...p,
        status: "created",
        exp_url: null,
        metro_port: null,
        created_at: t,
        updated_at: t,
      };
      projects.set(project.id, project);
      return project;
    },
    async getProject(id) {
      return projects.get(id);
    },
    async listProjects() {
      return [...projects.values()].sort((a, b) => b.created_at - a.created_at);
    },
    async setProjectStatus(id, status: ProjectStatus) {
      const p = projects.get(id);
      if (p) {
        p.status = status;
        p.updated_at = Date.now();
      }
    },
    async setProjectExpUrl(id, expUrl, metroPort) {
      const p = projects.get(id);
      if (p) {
        p.exp_url = expUrl;
        p.metro_port = metroPort;
        p.updated_at = Date.now();
      }
    },
    async deleteProject(id) {
      projects.delete(id);
      for (const [k, v] of runs) if (v.project_id === id) runs.delete(k);
      for (let i = events.length - 1; i >= 0; i--) {
        if (events[i].project_id === id) events.splice(i, 1);
      }
    },

    async createRun(r) {
      const run: Run = {
        id: ++nextRunId,
        project_id: r.projectId,
        kind: r.kind,
        status: "pending",
        input: r.input ?? null,
        agent: r.agent ?? null,
        model: r.model ?? null,
        log: "",
        error: null,
        commit_sha: null,
        created_at: Date.now(),
        finished_at: null,
      };
      runs.set(run.id, run);
      return run;
    },
    async getRun(id) {
      return runs.get(id);
    },
    async listRuns(projectId) {
      return [...runs.values()]
        .filter((r) => r.project_id === projectId)
        .sort((a, b) => a.id - b.id);
    },
    async setRunStatus(id, status) {
      const run = runs.get(id);
      if (run) {
        run.status = status;
        if (["done", "failed", "interrupted"].includes(status)) {
          run.finished_at = Date.now();
        }
      }
    },
    async appendRunLog(id, chunk) {
      const run = runs.get(id);
      if (run) run.log = capRunLog(run.log, chunk);
    },
    async setRunError(id, error) {
      const run = runs.get(id);
      if (run) run.error = error;
    },
    async setRunCommit(id, commit) {
      const run = runs.get(id);
      if (run) run.commit_sha = commit;
    },
    async nextPendingRun() {
      return [...runs.values()]
        .filter((r) => r.status === "pending")
        .sort((a, b) => a.id - b.id)[0];
    },
    async recoverInterrupted() {
      const t = Date.now();
      const projectIds = new Set<string>();
      for (const run of runs.values()) {
        if (run.status === "running") {
          run.status = "interrupted";
          run.finished_at = t;
          projectIds.add(run.project_id);
        }
      }
      for (const pid of projectIds) {
        const p = projects.get(pid);
        if (p && ["initializing", "generating", "qa", "launching"].includes(p.status)) {
          p.status = "interrupted";
          p.updated_at = t;
        }
      }
    },

    async addEvent(e) {
      const ev: StudioEvent = {
        id: ++nextEventId,
        project_id: e.projectId,
        run_id: e.runId ?? null,
        type: e.type,
        message: e.message,
        created_at: Date.now(),
      };
      events.push(ev);
      return ev;
    },
    async listEvents(projectId, afterId = 0) {
      return events
        .filter((e) => e.project_id === projectId && e.id > afterId)
        .sort((a, b) => a.id - b.id);
    },
  };
}
