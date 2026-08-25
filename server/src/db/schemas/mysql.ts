import {
  bigint,
  index,
  int,
  longtext,
  mysqlTable,
  text,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * MySQL dialect schema. Column names match the storage contract shapes.
 * Timestamps are stored as epoch-millisecond BIGINT with `mode: "number"`.
 */
export const projects = mysqlTable("projects", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: text("name").notNull(),
  prompt: text("prompt").notNull(),
  status: text("status").notNull().default("created"),
  exp_url: text("exp_url"),
  metro_port: int("metro_port"),
  agent: text("agent").notNull().default("cline"),
  model: text("model").notNull().default("deepseek-v4-flash"),
  created_at: bigint("created_at", { mode: "number" }).notNull(),
  updated_at: bigint("updated_at", { mode: "number" }).notNull(),
});

export const runs = mysqlTable(
  "runs",
  {
    id: int("id").autoincrement().primaryKey(),
    project_id: varchar("project_id", { length: 255 })
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    status: text("status").notNull().default("pending"),
    input: text("input"),
    agent: text("agent"),
    model: text("model"),
    log: longtext("log").notNull(),
    error: text("error"),
    commit_sha: text("commit_sha"),
    created_at: bigint("created_at", { mode: "number" }).notNull(),
    finished_at: bigint("finished_at", { mode: "number" }),
  },
  (t) => [index("idx_runs_project").on(t.project_id)]
);

export const events = mysqlTable(
  "events",
  {
    id: int("id").autoincrement().primaryKey(),
    project_id: varchar("project_id", { length: 255 })
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    run_id: int("run_id"),
    type: text("type").notNull(),
    message: text("message").notNull(),
    created_at: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [index("idx_events_project").on(t.project_id)]
);
