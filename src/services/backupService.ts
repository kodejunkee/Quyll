import { copyFile, mkdir, readDir, exists, remove, stat } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import { save } from '@tauri-apps/plugin-dialog';
import { openDatabase, closeDatabase } from '@/database/databaseService';

export interface BackupInfo {
  id: string;
  timestamp: string;
  label: string;
  path: string;
}

/**
 * Recursively copies a directory and its contents from src to dest.
 * Uses @tauri-apps/plugin-fs primitives since recursive copy is not built-in.
 */
export async function copyDirectory(src: string, dest: string): Promise<void> {
  if (!(await exists(src))) {
    return;
  }
  await mkdir(dest, { recursive: true });
  const entries = await readDir(src);
  for (const entry of entries) {
    const srcPath = await join(src, entry.name);
    const destPath = await join(dest, entry.name);
    if (entry.isDirectory) {
      await copyDirectory(srcPath, destPath);
    } else if (entry.isFile) {
      await copyFile(srcPath, destPath);
    } else {
      // Fallback check if DirEntry properties are boolean vs method or missing
      try {
        const info = await stat(srcPath);
        if (info.isDirectory) {
          await copyDirectory(srcPath, destPath);
        } else {
          await copyFile(srcPath, destPath);
        }
      } catch {
        // Ignore stat failure
      }
    }
  }
}

/**
 * Creates a backup by copying project.db and the assets/ folder
 * to {projectFolder}/backups/backup_{ISO-timestamp}_{label}/.
 */
export async function createBackup(projectPath: string, label?: string): Promise<BackupInfo> {
  const dataDir = await appDataDir();
  const projectDir = await join(dataDir, projectPath);

  const now = new Date();
  const isoTimestamp = now.toISOString();
  // Sanitize label and timestamp so folder name is valid on Windows without colons
  const sanitizedTs = isoTimestamp.replace(/:/g, '-').replace(/\..+/, 'Z');
  const cleanLabel = label
    ? label.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim()
    : '';

  const id = cleanLabel
    ? `backup_${sanitizedTs}_${cleanLabel}`
    : `backup_${sanitizedTs}`;

  const backupDir = await join(projectDir, 'backups', id);
  await mkdir(backupDir, { recursive: true });

  // Copy project.db
  const srcDbPath = await join(projectDir, 'project.db');
  const destDbPath = await join(backupDir, 'project.db');
  if (await exists(srcDbPath)) {
    await copyFile(srcDbPath, destDbPath);
  }

  // Copy assets/ directory if it exists
  const srcAssetsDir = await join(projectDir, 'assets');
  const destAssetsDir = await join(backupDir, 'assets');
  if (await exists(srcAssetsDir)) {
    await copyDirectory(srcAssetsDir, destAssetsDir);
  }

  return {
    id,
    timestamp: isoTimestamp,
    label: label ?? '',
    path: backupDir,
  };
}

/**
 * Parses backup directory name into BackupInfo.
 * E.g., backup_2026-07-14T17-00-00Z_Optional_Label
 */
function parseBackupDirName(name: string, dirPath: string, fallbackTs: string): BackupInfo | null {
  if (!name.startsWith('backup_')) return null;

  const match = name.match(/^backup_(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}(?:\.\d+)?Z?)(?:_(.*))?$/);
  if (match) {
    const rawTs = match[1] ?? fallbackTs;
    const label = match[2] ?? '';

    // Restore colons in the time portion: 2026-07-14T17-00-00Z -> 2026-07-14T17:00:00Z
    const [datePart, timePart] = rawTs.split('T');
    let restoredTs = rawTs;
    if (datePart && timePart) {
      const parts = timePart.split('-');
      if (parts.length >= 3) {
        const hh = parts[0] ?? '00';
        const mm = parts[1] ?? '00';
        const ssAndRest = parts.slice(2).join('-');
        restoredTs = `${datePart}T${hh}:${mm}:${ssAndRest}`;
      }
    }

    return {
      id: name,
      timestamp: restoredTs,
      label,
      path: dirPath,
    };
  }

  const labelPart = name.substring(7);
  return {
    id: name,
    timestamp: fallbackTs,
    label: labelPart,
    path: dirPath,
  };
}

/**
 * Reads the backups/ directory inside the project path and returns a sorted list (newest first).
 */
export async function listBackups(projectPath: string): Promise<BackupInfo[]> {
  const dataDir = await appDataDir();
  const backupsDir = await join(dataDir, projectPath, 'backups');

  if (!(await exists(backupsDir))) {
    return [];
  }

  const entries = await readDir(backupsDir);
  const backups: BackupInfo[] = [];

  for (const entry of entries) {
    if (entry.name && entry.name.startsWith('backup_')) {
      const dirPath = await join(backupsDir, entry.name);
      let isDirectory = entry.isDirectory;
      let fallbackTs = new Date().toISOString();

      try {
        const info = await stat(dirPath);
        if (isDirectory === undefined) {
          isDirectory = info.isDirectory;
        }
        if (info.mtime) {
          fallbackTs = new Date(info.mtime).toISOString();
        }
      } catch {
        // Ignore stat error if entry is inaccessible
      }

      if (isDirectory !== false) {
        const parsed = parseBackupDirName(entry.name, dirPath, fallbackTs);
        if (parsed) {
          backups.push(parsed);
        }
      }
    }
  }

  backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return backups;
}

/**
 * Restores a backup by copying project.db and assets/ over the current project files.
 * Closes DB first, creates a safety pre-restore backup, and re-opens DB afterwards.
 */
export async function restoreBackup(projectPath: string, backupId: string): Promise<void> {
  const dataDir = await appDataDir();
  const projectDir = await join(dataDir, projectPath);
  const backupDir = await join(projectDir, 'backups', backupId);

  if (!(await exists(backupDir))) {
    throw new Error(`Backup not found: ${backupId}`);
  }

  // 1. Close database connection
  const dbUri = `sqlite:${projectPath}/project.db`;
  await closeDatabase(dbUri);

  try {
    // 2. Create pre-restore safety backup
    await createBackup(projectPath, 'pre-restore');

    // 3. Copy the backup's project.db over current project.db
    const backupDbPath = await join(backupDir, 'project.db');
    const currentDbPath = await join(projectDir, 'project.db');
    if (await exists(backupDbPath)) {
      await copyFile(backupDbPath, currentDbPath);
    }

    // 4. Copy the backup's assets/ over current assets/ (if it exists in backup)
    const backupAssetsDir = await join(backupDir, 'assets');
    const currentAssetsDir = await join(projectDir, 'assets');
    if (await exists(backupAssetsDir)) {
      await copyDirectory(backupAssetsDir, currentAssetsDir);
    }
  } finally {
    // 5. Re-open the database via openDatabase from @/database/databaseService
    await openDatabase(dbUri);
  }
}

/**
 * Recursively removes a backup directory and all its contents.
 */
export async function deleteBackup(projectPath: string, backupId: string): Promise<void> {
  const dataDir = await appDataDir();
  const backupDir = await join(dataDir, projectPath, 'backups', backupId);

  if (!(await exists(backupDir))) {
    return;
  }

  try {
    await remove(backupDir, { recursive: true });
  } catch {
    // Fallback if recursive remove is not supported or fails
    await removeDirectoryRecursively(backupDir);
  }
}

async function removeDirectoryRecursively(dir: string): Promise<void> {
  if (!(await exists(dir))) return;
  const entries = await readDir(dir);
  for (const entry of entries) {
    const entryPath = await join(dir, entry.name);
    if (entry.isDirectory) {
      await removeDirectoryRecursively(entryPath);
    } else {
      await remove(entryPath);
    }
  }
  await remove(dir);
}

/**
 * Opens a save dialog and exports the backup directory to the user's chosen location.
 */
export async function exportBackup(projectPath: string, backupId: string): Promise<void> {
  const dataDir = await appDataDir();
  const backupDir = await join(dataDir, projectPath, 'backups', backupId);

  if (!(await exists(backupDir))) {
    throw new Error(`Backup not found: ${backupId}`);
  }

  const chosenPath = await save({
    defaultPath: 'backup.quyll-backup',
  });

  if (!chosenPath) {
    return;
  }

  await copyDirectory(backupDir, chosenPath);
}
