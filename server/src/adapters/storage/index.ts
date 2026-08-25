import type { StorageAdapter } from "@/contracts/storage";
import { config } from "@/lib/config";
import type { StorageDialect } from "@/db/ddl";
import { createDrizzleStorage } from "./drizzle";

/**
 * Storage registry — the app-wide StorageAdapter, chosen once from
 * `DATABASE_DRIVER` in `.env` (sqlite | postgres | mysql). Swapping the
 * underlying database is a config change, never a code change.
 */
const dialect = (config.storage ?? "sqlite") as StorageDialect;

export const storage: StorageAdapter = createDrizzleStorage(dialect);
