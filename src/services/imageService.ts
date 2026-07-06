/**
 * Image service for uploading, removing, and resolving image paths.
 * Images are stored in the project's assets/ directory.
 * Only the relative path is persisted in the images table.
 */

import { open } from '@tauri-apps/plugin-dialog';
import { copyFile, mkdir, exists, remove } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import { convertFileSrc } from '@tauri-apps/api/core';
import { execute, select } from '@/database/databaseService';
import { generateId } from '@/utils/uuid';
import type Database from '@tauri-apps/plugin-sql';
import type { Image } from '@/types/database';

/** Open a file dialog to pick an image. Returns the path or null. */
export async function pickImageFile(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] }],
  });
  return selected ?? null;
}

/** Ensure the project's assets directory exists. */
async function ensureAssetsDir(projectFolderPath: string): Promise<string> {
  const dataDir = await appDataDir();
  const assetsPath = await join(dataDir, projectFolderPath, 'assets');
  const dirExists = await exists(assetsPath);
  if (!dirExists) {
    await mkdir(assetsPath, { recursive: true });
  }
  return assetsPath;
}

/**
 * Upload an image file into the project's assets folder and register it in SQLite.
 *
 * @param db - The project database connection.
 * @param projectId - The project UUID.
 * @param projectFolderPath - Relative project folder path (e.g. "projects/xxx.quyll").
 * @param sourcePath - The absolute path to the source image file.
 * @param imageType - A label for the image type (e.g. "character", "location").
 * @returns The created Image record.
 */
export async function uploadImage(
  db: Database,
  projectId: string,
  projectFolderPath: string,
  sourcePath: string,
  imageType: string,
): Promise<Image> {
  const assetsDir = await ensureAssetsDir(projectFolderPath);
  const id = generateId();

  // Extract file extension
  const ext = sourcePath.split('.').pop()?.toLowerCase() ?? 'png';
  const filename = `${id}.${ext}`;
  const destPath = await join(assetsDir, filename);

  // Copy file to assets directory
  await copyFile(sourcePath, destPath);

  // Store relative path in DB
  const relativePath = `assets/${filename}`;
  await execute(db, `INSERT INTO images (id, project_id, path, type) VALUES ($1, $2, $3, $4)`, [
    id,
    projectId,
    relativePath,
    imageType,
  ]);

  return {
    id,
    project_id: projectId,
    path: relativePath,
    type: imageType,
    created_at: new Date().toISOString(),
  } as Image;
}

/** Remove an image record and its file from disk. */
export async function removeImage(
  db: Database,
  projectFolderPath: string,
  imageId: string,
): Promise<void> {
  // Get the image path
  const rows = await select<Image>(db, `SELECT * FROM images WHERE id = $1`, [imageId]);
  if (rows.length === 0) return;

  const image = rows[0]!;
  const dataDir = await appDataDir();
  const fullPath = await join(dataDir, projectFolderPath, image.path);

  // Remove file (ignore errors if file doesn't exist)
  try {
    await remove(fullPath);
  } catch {
    // File may already be deleted
  }

  await execute(db, `DELETE FROM images WHERE id = $1`, [imageId]);
}

/** Resolve an image record's path to a displayable URL. */
export async function getImageUrl(
  projectFolderPath: string,
  relativePath: string,
): Promise<string> {
  const dataDir = await appDataDir();
  const fullPath = await join(dataDir, projectFolderPath, relativePath);
  return convertFileSrc(fullPath);
}

/** Get an image record by ID. */
export async function getImageById(db: Database, imageId: string): Promise<Image | null> {
  const rows = await select<Image>(db, `SELECT * FROM images WHERE id = $1`, [imageId]);
  return rows[0] ?? null;
}
