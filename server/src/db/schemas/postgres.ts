import {
  bigint,
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
} from "drizzle-orm/pg-core";

/**
 * Postgres dialect schema. Column names match the storage contract shapes.
 * Timestamps are stored as epoch-millisecond BIGINT with `mode: "number"`.
 */
export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id").notNull(),
    name: text("name").notNull(),
    prompt: text("prompt").notNull(),
    status: text("status").notNull().default("created"),
    exp_url: text("exp_url"),
    metro_port: integer("metro_port"),
    agent: text("agent").notNull().default("cline"),
    model: text("model").notNull().default("deepseek-v4-flash"),
    platform: text("platform").notNull().default("ios"),
    created_at: bigint("created_at", { mode: "number" }).notNull(),
    updated_at: bigint("updated_at", { mode: "number" }).notNull(),
  }
);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique(),
  password_hash: text("password_hash"),
  provider: text("provider").notNull().default("email"),
  provider_id: text("provider_id"),
  display_name: text("display_name"),
  created_at: bigint("created_at", { mode: "number" }).notNull(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token_hash: text("token_hash").notNull().unique(),
  created_at: bigint("created_at", { mode: "number" }).notNull(),
});

export const settings = pgTable(
  "settings",
  {
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: text("value").notNull(),
  },
  (t) => [primaryKey({ columns: [t.user_id, t.key] })]
);

export const runs = pgTable(
  "runs",
  {
    id: serial("id").primaryKey(),
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
    created_at: bigint("created_at", { mode: "number" }).notNull(),
    finished_at: bigint("finished_at", { mode: "number" }),
  },
  (t) => [index("idx_runs_project").on(t.project_id)]
);

export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    project_id: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    run_id: integer("run_id"),
    type: text("type").notNull(),
    message: text("message").notNull(),
    created_at: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [index("idx_events_project").on(t.project_id)]
);
