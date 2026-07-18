import { execute, select } from '@/database/databaseService';
import { generateId } from '@/utils/uuid';
import type Database from '@tauri-apps/plugin-sql';
import type { Keyword } from '@/types/database';
import { EntityType } from '@/types/common';

export const keywordService = {
  /**
   * Get all active keywords for a project.
   */
  async list(db: Database, projectId: string): Promise<Keyword[]> {
    return select<Keyword>(
      db,
      `SELECT * FROM keywords WHERE project_id = $1 ORDER BY display_name ASC`,
      [projectId],
    );
  },

  /**
   * Find a specific keyword by its exact display name (case-insensitive).
   * This is useful for exact matching when parsing text.
   */
  async findByName(db: Database, projectId: string, name: string): Promise<Keyword | null> {
    const rows = await select<Keyword>(
      db,
      `SELECT * FROM keywords WHERE project_id = $1 AND LOWER(display_name) = LOWER($2)`,
      [projectId, name],
    );
    return rows[0] ?? null;
  },

  /**
   * Ensure a keyword exists for an entity.
   * If the entity already has a keyword, updates its display name.
   * If not, creates a new keyword record.
   */
  async upsert(
    db: Database,
    projectId: string,
    entityType: EntityType,
    entityId: string,
    displayName: string,
  ): Promise<void> {
    const existing = await select<Keyword>(
      db,
      `SELECT * FROM keywords WHERE project_id = $1 AND entity_id = $2`,
      [projectId, entityId],
    );

    const firstExisting = existing[0];
    if (firstExisting) {
      await execute(
        db,
        `UPDATE keywords SET display_name = $1 WHERE id = $2`,
        [displayName, firstExisting.id],
      );
    } else {
      const id = generateId();
      await execute(
        db,
        `INSERT INTO keywords (id, project_id, entity_type, entity_id, display_name)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, projectId, entityType, entityId, displayName],
      );
    }
  },

  /**
   * Remove a keyword for an entity when it is disabled or deleted.
   */
  async remove(db: Database, projectId: string, entityId: string): Promise<void> {
    await execute(
      db,
      `DELETE FROM keywords WHERE project_id = $1 AND entity_id = $2`,
      [projectId, entityId],
    );
  },
};
