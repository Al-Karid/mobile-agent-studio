import fs from "node:fs";
import path from "node:path";
import { and, asc, desc, eq, gt, inArray } from "drizzle-orm";
import type {
  Project,
  ProjectStatus,
  Run,
  StorageAdapter,
  StudioEvent,
} from "@/contracts/storage";
import { capRunLog } from "@/lib/run-log";
import { config } from "@/lib/config";
import { BOOTSTRAP_DDL, type StorageDialect } from "@/db/ddl";

import Database from "better-sqlite3";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import * as sqliteSchema from "@/db/schemas/sqlite";

import { Pool } from "pg";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import * as pgSchema from "@/db/schemas/postgres";

import mysql from "mysql2/promise";
import { drizzle as drizzleMysql } from "drizzle-orm/mysql2";
import * as mysqlSchema from "@/db/schemas/mysql";

/**
 * Storage adapter implemented on Drizzle — one class, three dialects.
 * The dialect is chosen once at factory time from config (`DATABASE_DRIVER`);
 * the orchestrator only ever sees the StorageAdapter contract.
 */

const TERMINAL_RUN_STATUSES = new Set(["done", "failed", "interrupted"]);
const ACTIVE_PROJECT_STATUSES = ["initializing", "generating", "qa", "launching"];

class DrizzleStorageAdapter implements StorageAdapter {
  private schemaReady: boolean;

  constructor(
    // `any` is deliberate here: Drizzle's query API is shared across dialects
    // but its result types are dialect-specific. The contract boundary stays strict.
    private db: any,
    private s: any,
    private insertIdMode: "returning" | "insertId",
    private ddlStatements: string[],
    private exec: (stmt: string) => Promise<void>
  ) {
    this.schemaReady = this.ddlStatements.length === 0;
  }

  private async ensureSchema(): Promise<void> {
    if (this.schemaReady) return;
    this.schemaReady = true;
    for (const stmt of this.ddlStatements) await this.exec(stmt);
  }

  private async insertReturningId(
    table: any,
    values: Record<string, unknown>
  ): Promise<number> {
    if (this.insertIdMode === "returning") {
      const rows = await this.db.insert(table).values(values).returning();
      return rows[0].id as number;
    }
    const res = await this.db.insert(table).values(values);
    return Number(res[0].insertId);
  }

  // ── projects ────────────────────────────────────────────────────────────

  async createProject(p: {
    id: string;
    name: string;
    prompt: string;
    agent: string;
    model: string;
    platform: "ios" | "android" | "both";
  }): Promise<Project> {
    await this.ensureSchema();
    const t = Date.now();
    await this.db.insert(this.s.projects).values({
      id: p.id,
      name: p.name,
      prompt: p.prompt,
      status: "created",
      exp_url: null,
      metro_port: null,
      agent: p.agent,
      model: p.model,
      platform: p.platform,
      created_at: t,
      updated_at: t,
    });
    return (await this.getProject(p.id))!;
  }

  async getProject(id: string): Promise<Project | undefined> {
    await this.ensureSchema();
    const rows = await this.db
      .select()
      .from(this.s.projects)
      .where(eq(this.s.projects.id, id))
      .limit(1);
    return rows[0] as Project | undefined;
  }

  async listProjects(): Promise<Project[]> {
    await this.ensureSchema();
    return (await this.db
      .select()
      .from(this.s.projects)
      .orderBy(desc(this.s.projects.created_at))) as Project[];
  }

  async setProjectStatus(id: string, status: ProjectStatus): Promise<void> {
    await this.ensureSchema();
    await this.db
      .update(this.s.projects)
      .set({ status, updated_at: Date.now() })
      .where(eq(this.s.projects.id, id));
  }

  async setProjectExpUrl(
    id: string,
    expUrl: string | null,
    metroPort: number | null
  ): Promise<void> {
    await this.ensureSchema();
    await this.db
      .update(this.s.projects)
      .set({ exp_url: expUrl, metro_port: metroPort, updated_at: Date.now() })
      .where(eq(this.s.projects.id, id));
  }

  async deleteProject(id: string): Promise<void> {
    await this.ensureSchema();
    await this.db.delete(this.s.projects).where(eq(this.s.projects.id, id));
  }


  // ── runs ────────────────────────────────────────────────────────────────

  async createRun(r: {
    projectId: string;
    kind: string;
    input?: string;
    agent?: string;
    model?: string;
  }): Promise<Run> {
    await this.ensureSchema();
    const t = Date.now();
    const id = await this.insertReturningId(this.s.runs, {
      project_id: r.projectId,
      kind: r.kind,
      status: "pending",
      input: r.input ?? null,
      agent: r.agent ?? null,
      model: r.model ?? null,
      log: "",
      error: null,
      commit_sha: null,
      created_at: t,
      finished_at: null,
    });
    return (await this.getRun(id))!;
  }

  async getRun(id: number): Promise<Run | undefined> {
    await this.ensureSchema();
    const rows = await this.db
      .select()
      .from(this.s.runs)
      .where(eq(this.s.runs.id, id))
      .limit(1);
    return rows[0] as Run | undefined;
  }

  async listRuns(projectId: string): Promise<Run[]> {
    await this.ensureSchema();
    return (await this.db
      .select()
      .from(this.s.runs)
      .where(eq(this.s.runs.project_id, projectId))
      .orderBy(asc(this.s.runs.id))) as Run[];
  }

  async setRunStatus(id: number, status: string): Promise<void> {
    await this.ensureSchema();
    const run = await this.getRun(id);
    const finished_at = TERMINAL_RUN_STATUSES.has(status)
      ? Date.now()
      : (run?.finished_at ?? null);
    await this.db
      .update(this.s.runs)
      .set({ status, finished_at })
      .where(eq(this.s.runs.id, id));
  }

  async appendRunLog(id: number, chunk: string): Promise<void> {
    await this.ensureSchema();
    const run = await this.getRun(id);
    if (!run) return;
    await this.db
      .update(this.s.runs)
      .set({ log: capRunLog(run.log, chunk) })
      .where(eq(this.s.runs.id, id));
  }

  async setRunError(id: number, error: string): Promise<void> {
    await this.ensureSchema();
    await this.db
      .update(this.s.runs)
      .set({ error })
      .where(eq(this.s.runs.id, id));
  }

  async setRunCommit(id: number, commit: string): Promise<void> {
    await this.ensureSchema();
    await this.db
      .update(this.s.runs)
      .set({ commit_sha: commit })
      .where(eq(this.s.runs.id, id));
  }

  async nextPendingRun(): Promise<Run | undefined> {
    await this.ensureSchema();
    const rows = await this.db
      .select()
      .from(this.s.runs)
      .where(eq(this.s.runs.status, "pending"))
      .orderBy(asc(this.s.runs.id))
      .limit(1);
    return rows[0] as Run | undefined;
  }

  async recoverInterrupted(): Promise<void> {
    await this.ensureSchema();
    const t = Date.now();
    const running = (await this.db
      .select({ project_id: this.s.runs.project_id })
      .from(this.s.runs)
      .where(eq(this.s.runs.status, "running"))) as { project_id: string }[];
    const projectIds = [...new Set(running.map((r) => r.project_id))];
    await this.db
      .update(this.s.runs)
      .set({ status: "interrupted", finished_at: t })
      .where(eq(this.s.runs.status, "running"));
    if (projectIds.length > 0) {
      await this.db
        .update(this.s.projects)
        .set({ status: "interrupted", updated_at: t })
        .where(
          and(
            inArray(this.s.projects.id, projectIds),
            inArray(this.s.projects.status, ACTIVE_PROJECT_STATUSES)
          )
        );
    }
  }

  // ── journal ─────────────────────────────────────────────────────────────

  async addEvent(e: {
    projectId: string;
    runId?: number | null;
    type: string;
    message: string;
  }): Promise<StudioEvent> {
    await this.ensureSchema();
    const t = Date.now();
    const id = await this.insertReturningId(this.s.events, {
      project_id: e.projectId,
      run_id: e.runId ?? null,
      type: e.type,
      message: e.message,
      created_at: t,
    });
    const rows = await this.db
      .select()
      .from(this.s.events)
      .where(eq(this.s.events.id, id))
      .limit(1);
    return rows[0] as StudioEvent;
  }

  async listEvents(projectId: string, afterId = 0): Promise<StudioEvent[]> {
    await this.ensureSchema();
    return (await this.db
      .select()
      .from(this.s.events)
      .where(
        and(
          eq(this.s.events.project_id, projectId),
          gt(this.s.events.id, afterId)
        )
      )
      .orderBy(asc(this.s.events.id))) as StudioEvent[];
  }
}

// ── dialect factories ─────────────────────────────────────────────────────

export function createDrizzleStorage(
  driver: StorageDialect,
  urlOverride?: string
): StorageAdapter {
  switch (driver) {
    case "sqlite": {
      const url = urlOverride ?? config.databaseUrl;
      fs.mkdirSync(path.dirname(url), { recursive: true });
      const client = new Database(url);
      client.pragma("journal_mode = WAL");
      client.pragma("foreign_keys = ON");
      for (const stmt of BOOTSTRAP_DDL.sqlite) client.exec(stmt);
      const db = drizzleSqlite(client, { schema: sqliteSchema });
      return new DrizzleStorageAdapter(
        db,
        sqliteSchema,
        "returning",
        [],
        async () => {}
      );
    }
    case "postgres": {
      const pool = new Pool({ connectionString: urlOverride ?? config.databaseUrl });
      const db = drizzlePg(pool, { schema: pgSchema });
      return new DrizzleStorageAdapter(
        db,
        pgSchema,
        "returning",
        BOOTSTRAP_DDL.postgres,
        async (stmt) => {
          await pool.query(stmt);
        }
      );
    }
    case "mysql": {
      const pool = mysql.createPool(urlOverride ?? config.databaseUrl);
      const db = drizzleMysql(pool, { schema: mysqlSchema, mode: "default" });
      return new DrizzleStorageAdapter(
        db,
        mysqlSchema,
        "insertId",
        BOOTSTRAP_DDL.mysql,
        async (stmt) => {
          await pool.query(stmt);
        }
      );
    }
  }
}

