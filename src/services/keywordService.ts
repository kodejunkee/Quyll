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
   * Replace all keywords for an entity.
   * This allows an entity to have multiple valid keyword triggers (e.g. main name + aliases).
   */
  async setEntityKeywords(
    db: Database,
    projectId: string,
    entityType: EntityType,
    entityId: string,
    displayNames: string[],
  ): Promise<void> {
    // Clean up existing keywords for this entity
    await keywordService.remove(db, projectId, entityId);

    // Filter out empty strings and duplicates
    const uniqueNames = Array.from(new Set(displayNames.map(n => n.trim()).filter(Boolean)));
    
    // Insert new keywords
    for (const name of uniqueNames) {
      const id = generateId();
      await execute(
        db,
        `INSERT INTO keywords (id, project_id, entity_type, entity_id, display_name)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, projectId, entityType, entityId, name],
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
