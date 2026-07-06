/**
 * Migration runner — executes DDL scripts and tracks schema versions.
 */
import type Database from '@tauri-apps/plugin-sql';
import { execute, select } from './databaseService';
import { CURRENT_SCHEMA_VERSION, PROJECT_TABLES, APP_TABLES } from './schema';

interface SchemaVersionRow {
  version: number;
}

/** Get the current schema version from a database (0 if table does not exist). */
async function getSchemaVersion(db: Database): Promise<number> {
  try {
    const rows = await select<SchemaVersionRow>(
      db,
      'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1',
    );
    return rows[0]?.version ?? 0;
  } catch {
    return 0;
  }
}

/** Run a multi-statement DDL string, splitting on semicolons. */
async function executeDDL(db: Database, ddl: string): Promise<void> {
  const statements = ddl
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    await execute(db, stmt);
  }
}

/** Record that a schema version has been applied. */
async function recordVersion(db: Database, version: number): Promise<void> {
  await execute(db, 'INSERT INTO schema_version (version) VALUES ($1)', [version]);
}

/** Run all pending migrations on a per-project database. */
export async function migrateProjectDatabase(db: Database): Promise<void> {
  const current = await getSchemaVersion(db);

  if (current < CURRENT_SCHEMA_VERSION) {
    await executeDDL(db, PROJECT_TABLES);
    await recordVersion(db, CURRENT_SCHEMA_VERSION);
  }
}

/** Run all pending migrations on the global app database. */
export async function migrateAppDatabase(db: Database): Promise<void> {
  const current = await getSchemaVersion(db);

  if (current < CURRENT_SCHEMA_VERSION) {
    await executeDDL(db, APP_TABLES);
    await recordVersion(db, CURRENT_SCHEMA_VERSION);
  }
}
