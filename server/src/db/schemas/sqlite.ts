import { integer, index, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * SQLite dialect schema. Column names match the storage contract shapes
 * (`exp_url`, `created_at`, …) so rows map straight onto Project/Run/Event.
 */
export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    prompt: text("prompt").notNull(),
    status: text("status").notNull().default("created"),
    exp_url: text("exp_url"),
    metro_port: integer("metro_port"),
    agent: text("agent").notNull().default("cline"),
    model: text("model").notNull().default("deepseek-v4-flash"),
    created_at: integer("created_at").notNull(),
    updated_at: integer("updated_at").notNull(),
  }
);

export const runs = sqliteTable(
  "runs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    project_id: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    status: text("status").notNull().default("pending"),
    input: text("input"),
    agent: text("agent"),
    model: text("model"),
    log: text("log").notNull().default(""),
    error: text("error"),
    commit_sha: text("commit_sha"),
    created_at: integer("created_at").notNull(),
    finished_at: integer("finished_at"),
  },
  (t) => [index("idx_runs_project").on(t.project_id)]
);

export const events = sqliteTable(
  "events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    project_id: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    run_id: integer("run_id"),
    type: text("type").notNull(),
    message: text("message").notNull(),
    created_at: integer("created_at").notNull(),
  },
  (t) => [index("idx_events_project").on(t.project_id)]
);
