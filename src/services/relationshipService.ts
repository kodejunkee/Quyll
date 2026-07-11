import { execute, select } from '@/database/databaseService';
import { generateId } from '@/utils/uuid';
import type Database from '@tauri-apps/plugin-sql';
import type { Relationship, PinnedReference } from '@/types/database';
import { EntityType } from '@/types/common';

export const relationshipService = {
  /**
   * Get all relationships for a given entity (both as source and target).
   */
  async getForEntity(db: Database, projectId: string, entityId: string): Promise<Relationship[]> {
    return select<Relationship>(
      db,
      `SELECT * FROM relationships 
       WHERE project_id = $1 AND (source_id = $2 OR target_id = $2)
       ORDER BY created_at DESC`,
      [projectId, entityId],
    );
  },

  /**
   * Create a new relationship between two entities.
   */
  async create(
    db: Database,
    projectId: string,
    sourceType: EntityType,
    sourceId: string,
    relationship: string,
    targetType: EntityType,
    targetId: string,
  ): Promise<Relationship> {
    const id = generateId();
    await execute(
      db,
      `INSERT INTO relationships (id, project_id, source_type, source_id, relationship, target_type, target_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, projectId, sourceType, sourceId, relationship, targetType, targetId],
    );

    const rows = await select<Relationship>(db, `SELECT * FROM relationships WHERE id = $1`, [id]);
    return rows[0]!;
  },

  /**
   * Delete a relationship by ID.
   */
  async remove(db: Database, id: string): Promise<void> {
    await execute(db, `DELETE FROM relationships WHERE id = $1`, [id]);
  },

  /**
   * Remove all relationships involving a specific entity (useful when deleting the entity).
   */
  async removeAllForEntity(db: Database, projectId: string, entityId: string): Promise<void> {
    await execute(
      db,
      `DELETE FROM relationships WHERE project_id = $1 AND (source_id = $2 OR target_id = $2)`,
      [projectId, entityId],
    );
  },

  // --- Pinned References ---

  /**
   * Get all pinned references for the project workspace.
   */
  async getPinnedReferences(db: Database, projectId: string): Promise<PinnedReference[]> {
    return select<PinnedReference>(
      db,
      `SELECT * FROM pinned_references WHERE project_id = $1 ORDER BY created_at ASC`,
      [projectId],
    );
  },

  /**
   * Pin an entity to the workspace as a reference bubble.
   */
  async pinReference(
    db: Database,
    projectId: string,
    entityType: EntityType,
    entityId: string,
    posX: number,
    posY: number,
  ): Promise<PinnedReference> {
    const id = generateId();
    await execute(
      db,
      `INSERT INTO pinned_references (id, project_id, entity_type, entity_id, position_x, position_y)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, projectId, entityType, entityId, posX, posY],
    );

    const rows = await select<PinnedReference>(db, `SELECT * FROM pinned_references WHERE id = $1`, [id]);
    return rows[0]!;
  },

  /**
   * Update the position of a pinned reference (e.g. after dragging).
   */
  async updatePinnedPosition(db: Database, id: string, posX: number, posY: number): Promise<void> {
    await execute(
      db,
      `UPDATE pinned_references SET position_x = $1, position_y = $2 WHERE id = $3`,
      [posX, posY, id],
    );
  },

  /**
   * Unpin a reference.
   */
  async unpinReference(db: Database, id: string): Promise<void> {
    await execute(db, `DELETE FROM pinned_references WHERE id = $1`, [id]);
  },
};
