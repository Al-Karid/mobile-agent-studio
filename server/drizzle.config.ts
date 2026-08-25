import "dotenv/config";
import { defineConfig } from "drizzle-kit";

/**
 * Drizzle kit config — the dialect follows `DATABASE_DRIVER` (same env the
 * server uses at runtime), so `npm run db:generate` / `db:push` target the
 * database you've selected in `.env`.
 */
const driver = process.env.DATABASE_DRIVER ?? "sqlite";
const dialect =
  driver === "postgres"
    ? "postgresql"
    : driver === "mysql"
      ? "mysql"
      : "sqlite";

export default defineConfig({
  dialect,
  schema:
    dialect === "postgresql"
      ? "./src/db/schemas/postgres.ts"
      : `./src/db/schemas/${driver}.ts`,
  out: `./drizzle/${driver}`,
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      (driver === "sqlite" ? "./data/studio.db" : ""),
  },
  strict: true,
});
