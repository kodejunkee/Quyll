/**
 * Generic entity service factory.
 * Given a table name and column list, returns CRUD functions for that entity.
 * All queries exclude soft-deleted rows (WHERE deleted_at IS NULL).
 */

import { execute, select } from '@/database/databaseService';
import { generateId } from '@/utils/uuid';
import type Database from '@tauri-apps/plugin-sql';

export interface EntityServiceConfig {
  tableName: string;
  columns: string[];
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
        ...columns.map((col) => data[col] ?? (col === 'age' ? null : '')),
        now,
        now,
      ];

      await execute(
        db,
        `INSERT INTO ${tableName} (${insertCols.join(', ')}) VALUES (${placeholders})`,
        values,
      );

      const rows = await select<T>(db, `SELECT * FROM ${tableName} WHERE id = $1`, [id]);
      return rows[0];
    },

    /** Update specific fields on a row. */
    async update(db: Database, id: string, data: Record<string, unknown>): Promise<void> {
      const keys = Object.keys(data).filter((k) => columns.includes(k));
      if (keys.length === 0) return;

      const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
      const values = keys.map((k) => data[k]);
      values.push(new Date().toISOString(), id);

      await execute(
        db,
        `UPDATE ${tableName} SET ${setClauses}, updated_at = $${values.length - 1} WHERE id = $${values.length}`,
        values,
      );
    },

    /** Soft-delete: set deleted_at timestamp. */
    async softDelete(db: Database, id: string): Promise<void> {
      await execute(
        db,
        `UPDATE ${tableName} SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = $1`,
        [id],
      );
    },

    /** Restore a soft-deleted row. */
    async restore(db: Database, id: string): Promise<void> {
      await execute(
        db,
        `UPDATE ${tableName} SET deleted_at = NULL, updated_at = datetime('now') WHERE id = $1`,
        [id],
      );
    },

    /** Permanently delete (for trash emptying). */
    async hardDelete(db: Database, id: string): Promise<void> {
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
