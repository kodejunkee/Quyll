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

/**
 * In-memory cache of schema versions per database path.
 * Avoids redundant migration checks on re-open within the same app session.
 * Naturally invalidated on app restart.
 */
const schemaVersionCache = new Map<string, number>();

/** Run all pending migrations on a per-project database. */
export async function migrateProjectDatabase(db: Database, dbPath?: string): Promise<void> {
  // Fast path: if we already know this DB is up-to-date, skip entirely
  if (dbPath && schemaVersionCache.get(dbPath) === CURRENT_SCHEMA_VERSION) {
    return;
  }

  const current = await getSchemaVersion(db);

  // If already at current version, cache it and return — no DDL needed
  if (current >= CURRENT_SCHEMA_VERSION) {
    if (dbPath) schemaVersionCache.set(dbPath, current);
    return;
  }

  // Run full DDL for fresh installs or upgrades
  await executeDDL(db, PROJECT_TABLES);

  if (current < 2) {
    // Fresh install or v1 -> we just ran full DDL, so we're up to date
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
    if (current < 7) {
      // Add deleted_at to all entity tables for soft delete support
      const tables = [
        'chapters', 'characters', 'locations', 'organizations',
        'species', 'items', 'world_systems', 'lore',
        'timeline_events', 'plot_points'
      ];
      for (const t of tables) {
        try {
          await execute(db, `ALTER TABLE ${t} ADD COLUMN deleted_at TEXT`);
        } catch {
          // Ignore if column exists or table doesn't exist yet
        }
      }
    }
    if (current < 11) {
      try {
        await execute(db, 'ALTER TABLE chapters ADD COLUMN is_restored INTEGER NOT NULL DEFAULT 0');
      } catch {
        // Ignore if column exists
      }
    }
    if (current < 12) {
      try {
        await execute(db, 'ALTER TABLE chapters ADD COLUMN is_restored INTEGER NOT NULL DEFAULT 0');
      } catch {
        // Ignore if column exists
      }
    }
    if (current < 16) {
      try {
        await execute(db, "ALTER TABLE project_meta ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'");
      } catch {
        // Ignore if column exists
      }
    }
    if (current < 17) {
      try {
        await execute(db, "ALTER TABLE project_meta ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'");
      } catch {
        // Ignore if column exists
      }
    }
    if (current < 19) {
      try { await execute(db, 'ALTER TABLE plot_points ADD COLUMN position_x REAL NOT NULL DEFAULT 0'); } catch {}
      try { await execute(db, 'ALTER TABLE plot_points ADD COLUMN position_y REAL NOT NULL DEFAULT 0'); } catch {}
      try { await execute(db, 'ALTER TABLE plot_points ADD COLUMN group_id TEXT'); } catch {}
      
      try {
        await execute(db, `
          CREATE TABLE IF NOT EXISTS plot_groups (
            id            TEXT PRIMARY KEY,
            project_id    TEXT NOT NULL,
            name          TEXT NOT NULL DEFAULT '',
            color         TEXT NOT NULL DEFAULT '#6366f1',
            category      TEXT NOT NULL DEFAULT 'custom',
            deleted_at    TEXT,
            created_at    TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
          );
        `);
        await execute(db, 'CREATE INDEX IF NOT EXISTS idx_plot_groups_project ON plot_groups(project_id)');
      } catch {}

      try {
        await execute(db, `
          CREATE TABLE IF NOT EXISTS plot_edges (
            id            TEXT PRIMARY KEY,
            project_id    TEXT NOT NULL,
            source_id     TEXT NOT NULL,
            target_id     TEXT NOT NULL,
            label         TEXT NOT NULL DEFAULT '',
            deleted_at    TEXT,
            created_at    TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
          );
        `);
        await execute(db, 'CREATE INDEX IF NOT EXISTS idx_plot_edges_project ON plot_edges(project_id)');
      } catch (e) {
        console.error('Failed to run migration to schema v19', e);
      }
    }
    await recordVersion(db, CURRENT_SCHEMA_VERSION);
  }

  // Cache the version now that migrations are done
  if (dbPath) schemaVersionCache.set(dbPath, CURRENT_SCHEMA_VERSION);
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
    
    if (current < 15) {
      try {
        await execute(db, 'ALTER TABLE projects ADD COLUMN cover_image TEXT');
      } catch {
        // Column might already exist
      }
    }
    
    if (current < 16) {
      try {
        await execute(db, "ALTER TABLE projects ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'");
      } catch {
        // Column might already exist
      }
    }
    
    if (current < 17) {
      try {
        await execute(db, "ALTER TABLE projects ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'");
      } catch {
        // Column might already exist
      }
    }

    await recordVersion(db, CURRENT_SCHEMA_VERSION);
  }
}
