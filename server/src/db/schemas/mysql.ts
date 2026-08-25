import {
  bigint,
  index,
  int,
  longtext,
  mysqlTable,
  primaryKey,
  text,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * MySQL dialect schema. Column names match the storage contract shapes.
 * Timestamps are stored as epoch-millisecond BIGINT with `mode: "number"`.
 */
export const projects = mysqlTable("projects", {
  id: varchar("id", { length: 255 }).primaryKey(),
  user_id: text("user_id").notNull(),
  name: text("name").notNull(),
  prompt: text("prompt").notNull(),
  status: text("status").notNull().default("created"),
  exp_url: text("exp_url"),
  metro_port: int("metro_port"),
  agent: text("agent").notNull().default("cline"),
  model: text("model").notNull().default("deepseek-v4-flash"),
  platform: text("platform").notNull().default("ios"),
  created_at: bigint("created_at", { mode: "number" }).notNull(),
  updated_at: bigint("updated_at", { mode: "number" }).notNull(),
});

export const users = mysqlTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  email: text("email").unique(),
  password_hash: text("password_hash"),
  provider: text("provider").notNull().default("email"),
  provider_id: text("provider_id"),
  display_name: text("display_name"),
  created_at: bigint("created_at", { mode: "number" }).notNull(),
});

export const sessions = mysqlTable("sessions", {
  id: int("id").autoincrement().primaryKey(),
  user_id: text("user_id").notNull(),
  token_hash: text("token_hash").notNull().unique(),
  created_at: bigint("created_at", { mode: "number" }).notNull(),
});

export const settings = mysqlTable(
  "settings",
  {
    user_id: text("user_id").notNull(),
    key: text("key").notNull(),
    value: longtext("value").notNull(),
  },
  (t) => [primaryKey({ columns: [t.user_id, t.key] })]
);

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
