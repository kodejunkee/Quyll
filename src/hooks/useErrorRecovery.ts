import { useCallback } from 'react';
import { useNotification } from '@/components/Notification';
import { execute, select } from '@/database/databaseService';
import type Database from '@tauri-apps/plugin-sql';

export function useErrorRecovery() {
  const { notify } = useNotification();

  const withRecovery = useCallback(
    async <T>(fn: () => Promise<T>, options?: { context?: string; silent?: boolean }): Promise<T | null> => {
      try {
        return await fn();
      } catch (err: any) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[ErrorRecovery${options?.context ? ` (${options.context})` : ''}]`, err);

        if (!options?.silent) {
          if (msg.includes('SQLITE') || msg.toLowerCase().includes('database')) {
            notify(`Database error: ${msg}`, 'error');
          } else if (msg.includes('ENOENT') || msg.toLowerCase().includes('not found')) {
            notify(`File not found: ${msg}`, 'error');
          } else if (msg.toLowerCase().includes('permission')) {
            notify(`Permission denied: ${msg}`, 'error');
          } else {
            notify(`Error: ${msg}`, 'error');
          }
        }
        return null;
      }
    },
    [notify],
  );

  const validateProjectIntegrity = useCallback(async (db: Database, projectId: string) => {
    const issues: string[] = [];
    let fixed = 0;

    try {
      // Check for chapters with null content
      const nullChapters = await select<{ id: string }>(db, 'SELECT id FROM chapters WHERE project_id = $1 AND (content IS NULL OR content = "") AND deleted_at IS NULL', [projectId]);
      if (nullChapters.length > 0) {
        issues.push(`Found ${nullChapters.length} chapters with empty/null content`);
        for (const ch of nullChapters) {
          await execute(db, 'UPDATE chapters SET content = "<p></p>" WHERE id = $1', [ch.id]);
          fixed++;
        }
      }

      // Check if settings row exists
      const settingsRows = await select(db, 'SELECT id FROM settings LIMIT 1');
      if (settingsRows.length === 0) {
        issues.push('Missing project settings row');
        await execute(db, `INSERT INTO settings (id, theme, accent_color, editor_font, editor_font_size, autosave_interval, sidebar_collapsed, inspector_collapsed, backup_interval) VALUES ('default', 'dark', '', 'Inter', 16, 30, 0, 0, 0)`);
        fixed++;
      }
    } catch (e) {
      console.error('[validateProjectIntegrity]', e);
    }

    return { issues, fixed };
  }, []);

  const handleMissingImage = useCallback(async (db: Database, imageId: string) => {
    try {
      await execute(db, 'DELETE FROM images WHERE id = $1', [imageId]);
      // Clear reference across tables
      const tables = ['characters', 'locations', 'organizations', 'species', 'items'];
      for (const tbl of tables) {
        await execute(db, `UPDATE ${tbl} SET image_id = NULL WHERE image_id = $1`, [imageId]);
      }
    } catch (e) {
      console.error('[handleMissingImage]', e);
    }
  }, []);

  return {
    withRecovery,
    validateProjectIntegrity,
    handleMissingImage,
  };
}
