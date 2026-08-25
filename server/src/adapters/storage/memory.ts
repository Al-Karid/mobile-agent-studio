import type {
  Project,
  ProjectStatus,
  Run,
  StorageAdapter,
  StudioEvent,
  User,
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
  const users = new Map<string, User>();
  const sessions = new Map<string, string>(); // token_hash → user_id
  const settings = new Map<string, Map<string, string>>(); // user_id → key → value
  let nextRunId = 0;
  let nextEventId = 0;

  return {
    // ── users + sessions ────────────────────────────────────────────────────
    async createUser(u) {
      const user: User = {
        id: u.id,
        email: u.email,
        password_hash: u.passwordHash,
        provider: u.provider,
        provider_id: u.providerId ?? null,
        display_name: u.displayName ?? null,
        created_at: Date.now(),
      };
      users.set(user.id, user);
      return user;
    },
    async getUserByEmail(email) {
      return [...users.values()].find((u) => u.email === email);
    },
    async getUserByProvider(provider, providerId) {
      return [...users.values()].find(
        (u) => u.provider === provider && u.provider_id === providerId
      );
    },
    async getUserById(id) {
      return users.get(id);
    },
    async createSession(userId, tokenHash) {
      sessions.set(tokenHash, userId);
    },
    async getUserBySessionToken(tokenHash) {
      const userId = sessions.get(tokenHash);
      return userId ? users.get(userId) : undefined;
    },
    async deleteSession(tokenHash) {
      sessions.delete(tokenHash);
    },

    // ── per-user settings ───────────────────────────────────────────────────
    async getSetting(userId, key) {
      return settings.get(userId)?.get(key);
    },
    async setSetting(userId, key, value) {
      let m = settings.get(userId);
      if (!m) {
        m = new Map();
        settings.set(userId, m);
      }
      m.set(key, value);
    },
    async listSettings(userId) {
      return Object.fromEntries(settings.get(userId) ?? []);
    },

    // ── projects ────────────────────────────────────────────────────────────
    async createProject({ userId, ...rest }) {
      const t = Date.now();
      const project: Project = {
        ...rest,
        user_id: userId,
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
    async listProjects(userId) {
      return [...projects.values()]
        .filter((p) => p.user_id === userId)
        .sort((a, b) => b.created_at - a.created_at);
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
    async setProjectAgent(id, agent, model) {
      const p = projects.get(id);
      if (p) {
        p.agent = agent;
        p.model = model;
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
