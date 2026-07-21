/**
 * Generic entity service factory.
 * Given a table name and column list, returns CRUD functions for that entity.
 * All queries exclude soft-deleted rows (WHERE deleted_at IS NULL).
 */

import { execute, select } from '@/database/databaseService';
import { generateId } from '@/utils/uuid';
import type Database from '@tauri-apps/plugin-sql';

import type { EntityType } from '@/types/common';
import { keywordService } from './keywordService';

export interface EntityServiceConfig {
  tableName: string;
  columns: string[];
  entityType?: EntityType;
  nameColumn?: string;
}

/**
 * Create a full CRUD service for an entity table.
 * The returned functions require an open Database connection.
 */
export function createEntityService<T extends { id: string }>(config: EntityServiceConfig) {
  const { tableName, columns } = config;

  return {
    /** List all non-deleted rows for a project. */
    async list(db: Database, projectId: string): Promise<T[]> {
      return select<T>(
        db,
        `SELECT * FROM ${tableName} WHERE project_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC`,
        [projectId],
      );
    },

    /** Get a single row by ID (including soft-deleted for restore). */
    async getById(db: Database, id: string): Promise<T | null> {
      const rows = await select<T>(
        db,
        `SELECT * FROM ${tableName} WHERE id = $1`,
        [id],
      );
      return rows[0] ?? null;
    },

    /** Insert a new row. */
    async create(db: Database, projectId: string, data: Record<string, unknown>): Promise<T> {
      const id = generateId();
      const now = new Date().toISOString();

      const insertCols = ['id', 'project_id', ...columns, 'created_at', 'updated_at'];
      const placeholders = insertCols.map((_, i) => `$${i + 1}`).join(', ');
      const values = [
        id,
        projectId,
        ...columns.map((col) => {
          const val = data[col];
          if (typeof val === 'boolean') return val ? 1 : 0;
          if (typeof val === 'number') return val;
          if (['word_count', 'reading_time', 'chapter_number', 'order_index'].includes(col)) {
            return typeof val === 'number' ? val : (Number(val) || 0);
          }
          return val ?? (col === 'age' ? null : '');
        }),
        now,
        now,
      ];

      await execute(
        db,
        `INSERT INTO ${tableName} (${insertCols.join(', ')}) VALUES (${placeholders})`,
        values,
      );

      // Sync keyword if enabled
      if (config.entityType && config.nameColumn && data.keyword_enabled) {
        const nameVal = data[config.nameColumn] as string | undefined;
        if (nameVal) {
          await keywordService.upsert(db, projectId, config.entityType, id, nameVal);
        }
      }

      const rows = await select<T>(db, `SELECT * FROM ${tableName} WHERE id = $1`, [id]);
      return rows[0]!;
    },

    /** Update specific fields on a row. */
    async update(db: Database, id: string, data: Record<string, unknown>): Promise<void> {
      const keys = Object.keys(data).filter((k) => columns.includes(k));
      if (keys.length === 0) return;

      const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
      const values = keys.map((k) => {
        const val = data[k];
        if (typeof val === 'boolean') return val ? 1 : 0;
        return val;
      });
      values.push(new Date().toISOString(), id);

      await execute(
        db,
        `UPDATE ${tableName} SET ${setClauses}, updated_at = $${values.length - 1} WHERE id = $${values.length}`,
        values,
      );

      // Sync keyword on update
      if (config.entityType && config.nameColumn) {
        // Fetch the full updated entity to know its current state
        const updatedRows = await select<{ project_id: string; keyword_enabled: number; [key: string]: any }>(
          db,
          `SELECT * FROM ${tableName} WHERE id = $1`,
          [id]
        );
        if (updatedRows.length > 0) {
          const row = updatedRows[0];
          if (row && row.keyword_enabled) {
            await keywordService.upsert(db, row.project_id, config.entityType, id, row[config.nameColumn]);
          } else if (row) {
            await keywordService.remove(db, row.project_id, id);
          }
        }
      }
    },

    /** Soft-delete: set deleted_at timestamp. */
    async softDelete(db: Database, id: string): Promise<void> {
      await execute(
        db,
        `UPDATE ${tableName} SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = $1`,
        [id],
      );

      if (config.entityType) {
        // Remove keyword when soft deleted
        const rows = await select<{ project_id: string }>(db, `SELECT project_id FROM ${tableName} WHERE id = $1`, [id]);
        const firstRow = rows[0];
        if (firstRow) {
          await keywordService.remove(db, firstRow.project_id, id);
        }
      }
    },

    /** Restore a soft-deleted row. */
    async restore(db: Database, id: string): Promise<void> {
      await execute(
        db,
        `UPDATE ${tableName} SET deleted_at = NULL, updated_at = datetime('now') WHERE id = $1`,
        [id],
      );

      if (config.entityType && config.nameColumn) {
        // Restore keyword if enabled
        const rows = await select<{ project_id: string; keyword_enabled: number; [key: string]: any }>(
          db,
          `SELECT * FROM ${tableName} WHERE id = $1`,
          [id]
        );
        const firstRow = rows[0];
        if (firstRow && firstRow.keyword_enabled) {
          await keywordService.upsert(db, firstRow.project_id, config.entityType, id, firstRow[config.nameColumn]);
        }
      }
    },

    /** Permanently delete (for trash emptying). */
    async hardDelete(db: Database, id: string): Promise<void> {
      if (config.entityType) {
        const rows = await select<{ project_id: string }>(db, `SELECT project_id FROM ${tableName} WHERE id = $1`, [id]);
        const firstRow = rows[0];
        if (firstRow) {
          await keywordService.remove(db, firstRow.project_id, id);
        }
      }
      await execute(db, `DELETE FROM ${tableName} WHERE id = $1`, [id]);
    },

    /** Count non-deleted rows for a project. */
    async count(db: Database, projectId: string): Promise<number> {
      const rows = await select<{ cnt: number }>(
        db,
        `SELECT COUNT(*) as cnt FROM ${tableName} WHERE project_id = $1 AND deleted_at IS NULL`,
        [projectId],
      );
      return rows[0]?.cnt ?? 0;
    },
  };
}
