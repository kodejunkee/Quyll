/**
 * Global application database operations.
 * Manages the registry of known projects stored in app.db.
 */
import type Database from '@tauri-apps/plugin-sql';
import { openDatabase, execute, select } from './databaseService';
import { migrateAppDatabase } from './migrations';

const APP_DB_PATH = 'sqlite:app.db';

let appDb: Database | null = null;

interface ProjectRow {
  id: string;
  name: string;
  path: string;
  description: string;
  author: string;
  genre: string;
  last_opened_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Initialize the global app database, running migrations if needed. */
export async function initAppDatabase(): Promise<Database> {
  if (appDb) {
    // Verify the cached connection is still alive
    try {
      await select<{ v: number }>(appDb, 'SELECT 1 as v');
      return appDb;
    } catch {
      // Connection is dead — re-open
      appDb = null;
    }
  }
  appDb = await openDatabase(APP_DB_PATH);
  await migrateAppDatabase(appDb);
  return appDb;
}

/** Register a new project in the app database. */
export async function registerProject(project: {
  id: string;
  name: string;
  path: string;
  description?: string;
  author?: string;
  genre?: string;
}): Promise<void> {
  const db = await initAppDatabase();
  const now = new Date().toISOString();
  await execute(
    db,
    `INSERT INTO projects (id, name, path, description, author, genre, last_opened_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NULL, $7, $7)`,
    [
      project.id,
      project.name,
      project.path,
      project.description ?? '',
      project.author ?? '',
      project.genre ?? '',
      now,
    ],
  );
}

/** Get all registered projects, most recently opened first. */
export async function listProjects(): Promise<ProjectRow[]> {
  const db = await initAppDatabase();
  return select<ProjectRow>(
    db,
    'SELECT * FROM projects ORDER BY datetime(COALESCE(last_opened_at, created_at)) DESC, datetime(created_at) DESC',
  );
}

/** Update the last_opened_at timestamp for a project. */
export async function touchProject(projectId: string): Promise<void> {
  const db = await initAppDatabase();
  const now = new Date().toISOString();
  await execute(
    db,
    `UPDATE projects SET last_opened_at = $1, updated_at = $1 WHERE id = $2`,
    [now, projectId],
  );
}

/** Rename a project in the app registry. */
export async function renameProject(projectId: string, newName: string): Promise<void> {
  const db = await initAppDatabase();
  await execute(
    db,
    `UPDATE projects SET name = $1, updated_at = datetime('now') WHERE id = $2`,
    [newName, projectId],
  );
}

/** Remove a project from the app registry (does NOT delete files). */
export async function unregisterProject(projectId: string): Promise<void> {
  const db = await initAppDatabase();
  await execute(db, 'DELETE FROM projects WHERE id = $1', [projectId]);
}

/** Get a single project by ID. */
export async function getProject(projectId: string): Promise<ProjectRow | undefined> {
  const db = await initAppDatabase();
  const rows = await select<ProjectRow>(db, 'SELECT * FROM projects WHERE id = $1', [projectId]);
  return rows[0];
}
