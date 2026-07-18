/**
 * Per-project database operations.
 * Each .quyll project folder contains its own project.db.
 */
import type Database from '@tauri-apps/plugin-sql';
import { openDatabase, closeDatabase, execute } from './databaseService';
import { migrateProjectDatabase } from './migrations';
import { generateId } from '@/utils/uuid';
import { mkdir } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';

/** Build the sqlite: URI for a project's database file. */
function projectDbPath(projectFolderPath: string): string {
  return `sqlite:${projectFolderPath}/project.db`;
}

/** Open and migrate a project database, returning the connection. */
export async function openProjectDatabase(projectFolderPath: string): Promise<Database> {
  const path = projectDbPath(projectFolderPath);
  const db = await openDatabase(path);
  await migrateProjectDatabase(db);
  return db;
}

/** Close a project database connection. */
export async function closeProjectDatabase(projectFolderPath: string): Promise<void> {
  const path = projectDbPath(projectFolderPath);
  await closeDatabase(path);
}

/** Initialize a brand-new project database with metadata. */
export async function initializeProjectDatabase(
  projectFolderPath: string,
  meta: { id: string; title: string; description?: string; author?: string; genre?: string },
): Promise<Database> {
  const dataDir = await appDataDir();
  const fullPath = await join(dataDir, projectFolderPath);
  try {
    await mkdir(fullPath, { recursive: true });
  } catch (err) {
    console.error('Failed to create project directory:', err);
  }

  const db = await openProjectDatabase(projectFolderPath);

  await execute(
    db,
    `INSERT INTO project_meta (id, title, description, author, genre)
     VALUES ($1, $2, $3, $4, $5)`,
    [meta.id, meta.title, meta.description ?? '', meta.author ?? '', meta.genre ?? ''],
  );

  // Insert default settings
  const settingsId = generateId();
  await execute(
    db,
    `INSERT INTO settings (id, theme, editor_font, editor_font_size, autosave_interval, backup_interval)
     VALUES ($1, 'dark', 'Inter', 16, 30, 0)`,
    [settingsId],
  );

  return db;
}
