import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { all, run, tx } from "../db.js";
import { config, ROOT } from "../config.js";

const MIGRATIONS_DIR = path.join(ROOT, "migrations");

export interface MigrationRecord {
  version: string;
  appliedAt: string;
}

/**
 * Versioned migration runner.
 *
 * - Creates `schema_migrations(version, applied_at)` if missing.
 * - Applies pending `backend/migrations/<version>.sql` files in name order,
 *   each inside its own transaction.
 * - Forward-only: no automatic down migrations. Record what ran so an existing
 *   production database is never re-migrated or dropped.
 */
export async function runMigrations(): Promise<void> {
  await run(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )`
  );

  const appliedRows = await all<{ version: string }>("SELECT version FROM schema_migrations");
  const applied = new Set(appliedRows.map((row) => row.version));

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const version = file.replace(/\.sql$/, "");
    if (applied.has(version)) continue;

    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    if (!sql.trim()) continue;

    await tx(async (t$) => {
      // Each migration file may contain multiple statements; pg executes them as one simple query.
      await t$.run(sql);
      await t$.run(
        "INSERT INTO schema_migrations (version, applied_at) VALUES ($1, $2)",
        version,
        new Date().toISOString()
      );
    });
  }
}

export async function appliedMigrations(): Promise<MigrationRecord[]> {
  await run(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )`
  );
  return all<{ version: string; applied_at: string }>(
    "SELECT version, applied_at FROM schema_migrations ORDER BY version"
  ).then((rows) => rows.map((row) => ({ version: row.version, appliedAt: row.applied_at })));
}
