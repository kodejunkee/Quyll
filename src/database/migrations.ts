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

  if (current < 2) {
    // Fresh install or v1 -> run full DDL
    await executeDDL(db, PROJECT_TABLES);
    await recordVersion(db, CURRENT_SCHEMA_VERSION);
  } else if (current < CURRENT_SCHEMA_VERSION) {
    if (current < 3) {
      try {
        await execute(db, 'ALTER TABLE settings ADD COLUMN backup_interval INTEGER NOT NULL DEFAULT 0');
      } catch {
        // Column might already exist
      }
    }
    if (current < 4) {
      try {
        await execute(db, 'ALTER TABLE magic_systems RENAME TO world_systems');
        await execute(db, 'DROP INDEX IF EXISTS idx_magic_systems_project');
        await execute(db, 'CREATE INDEX IF NOT EXISTS idx_world_systems_project ON world_systems(project_id)');
        await execute(db, "UPDATE keywords SET entity_type = 'world_system' WHERE entity_type = 'magic_system'");
        await execute(db, "UPDATE relationships SET source_type = 'world_system' WHERE source_type = 'magic_system'");
        await execute(db, "UPDATE relationships SET target_type = 'world_system' WHERE target_type = 'magic_system'");
        await execute(db, "UPDATE pinned_references SET entity_type = 'world_system' WHERE entity_type = 'magic_system'");
      } catch (e) {
        console.error('Failed to run migration to schema v4', e);
      }
    }
    await recordVersion(db, CURRENT_SCHEMA_VERSION);
  }
}

/** Run all pending migrations on the global app database. */
export async function migrateAppDatabase(db: Database): Promise<void> {
  const current = await getSchemaVersion(db);

  if (current === 0) {
    // Fresh install
    await executeDDL(db, APP_TABLES);
    await recordVersion(db, CURRENT_SCHEMA_VERSION);
  } else if (current < CURRENT_SCHEMA_VERSION) {
    // Always run CREATE TABLE IF NOT EXISTS in case new tables are added
    await executeDDL(db, APP_TABLES);

    if (current < 6) {
      try {
        await execute(db, 'ALTER TABLE projects ADD COLUMN deleted_at TEXT');
      } catch {
        // Column might already exist
      }
    }
    
    await recordVersion(db, CURRENT_SCHEMA_VERSION);
  }
}
