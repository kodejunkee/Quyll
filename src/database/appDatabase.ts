/**
 * Global application database operations.
 * Manages the registry of known projects stored in app.db.
 */
import type Database from '@tauri-apps/plugin-sql';
import { openDatabase, execute, select } from './databaseService';
import { migrateAppDatabase } from './migrations';

const APP_DB_PATH = 'sqlite:app.db';

let appDb: Database | null = null;

import { remove } from '@tauri-apps/plugin-fs';

export interface ProjectRow {
  id: string;
  name: string;
  path: string;
  description: string;
  author: string;
  genre: string;
  last_opened_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Initialize the global app database, running migrations if needed. */
export async function initAppDatabase(): Promise<Database> {
  if (appDb) {
    try {
      await select<{ v: number }>(appDb, 'SELECT 1 as v');
      return appDb;
    } catch {
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
    `INSERT INTO projects (id, name, path, description, author, genre, last_opened_at, deleted_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL, $7, $8)`,
    [
      project.id,
      project.name,
      project.path,
      project.description ?? '',
      project.author ?? '',
      project.genre ?? '',
      now,
      now,
    ],
  );
}

/** Get all registered active projects, most recently opened first. */
export async function listProjects(): Promise<ProjectRow[]> {
  const db = await initAppDatabase();
  return select<ProjectRow>(
    db,
    'SELECT * FROM projects WHERE deleted_at IS NULL ORDER BY datetime(COALESCE(last_opened_at, created_at)) DESC, datetime(created_at) DESC',
  );
}

/** Get all soft-deleted projects. */
export async function listDeletedProjects(): Promise<ProjectRow[]> {
  const db = await initAppDatabase();
  return select<ProjectRow>(
    db,
    'SELECT * FROM projects WHERE deleted_at IS NOT NULL ORDER BY datetime(deleted_at) DESC',
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

/** Soft delete a project by setting deleted_at timestamp. */
export async function softDeleteProject(projectId: string): Promise<void> {
  const db = await initAppDatabase();
  const now = new Date().toISOString();
  await execute(db, 'UPDATE projects SET deleted_at = $1 WHERE id = $2', [now, projectId]);
}

/** Restore a soft deleted project. */
export async function restoreProject(projectId: string): Promise<void> {
  const db = await initAppDatabase();
  await execute(db, 'UPDATE projects SET deleted_at = NULL WHERE id = $1', [projectId]);
}

/** Permanently remove a project and its physical files. */
export async function hardDeleteProject(projectId: string): Promise<void> {
  const db = await initAppDatabase();
  const row = await getProject(projectId);
  if (row) {
    try {
      await remove(row.path);
    } catch (e) {
      console.warn('Failed to delete physical project file:', e);
    }
  }
  await execute(db, 'DELETE FROM projects WHERE id = $1', [projectId]);
}

/** Legacy: Remove a project from the app registry (does NOT delete files). */
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

/** Auto-delete projects that have been in the trash for > 60 days. */
export async function autoDeleteOldProjects(): Promise<void> {
  const db = await initAppDatabase();
  const rows = await select<{ id: string, path: string }>(
    db, 
    "SELECT id, path FROM projects WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', '-60 days')"
  );
  for (const row of rows) {
    try {
      await remove(row.path);
    } catch (e) {
      console.warn('Failed to auto-delete physical project file:', e);
    }
    await execute(db, 'DELETE FROM projects WHERE id = $1', [row.id]);
  }
}
