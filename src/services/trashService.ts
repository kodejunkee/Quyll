import { execute, select } from '@/database/databaseService';
import type Database from '@tauri-apps/plugin-sql';
import { chapterService } from '@/features/chapters/services/chapterService';
import { characterService } from '@/features/characters/services/characterService';
import { locationService } from '@/features/locations/services/locationService';
import { organizationService } from '@/features/organizations/services/organizationService';
import { speciesService } from '@/features/species/services/speciesService';
import { itemService } from '@/features/items/services/itemService';
import { worldSystemService } from '@/features/world-systems/services/worldSystemService';
import { loreService } from '@/features/lore/services/loreService';
import { timelineEventService } from '@/features/timeline/services/timelineEventService';
import { plotPointService } from '@/features/plot-planner/services/plotPointService';

export interface TrashedItem {
  id: string;
  name: string;
  type: string;
  deleted_at: string;
}

export const trashService = {
  /** Fetch all soft-deleted items across all entity tables. */
  async getTrashedItems(db: Database, projectId: string): Promise<TrashedItem[]> {
    const query = `
      SELECT id, title as name, 'chapter' as type, deleted_at FROM chapters WHERE project_id = $1 AND deleted_at IS NOT NULL
      UNION ALL
      SELECT id, name, 'character' as type, deleted_at FROM characters WHERE project_id = $1 AND deleted_at IS NOT NULL
      UNION ALL
      SELECT id, name, 'location' as type, deleted_at FROM locations WHERE project_id = $1 AND deleted_at IS NOT NULL
      UNION ALL
      SELECT id, name, 'organization' as type, deleted_at FROM organizations WHERE project_id = $1 AND deleted_at IS NOT NULL
      UNION ALL
      SELECT id, name, 'species' as type, deleted_at FROM species WHERE project_id = $1 AND deleted_at IS NOT NULL
      UNION ALL
      SELECT id, name, 'item' as type, deleted_at FROM items WHERE project_id = $1 AND deleted_at IS NOT NULL
      UNION ALL
      SELECT id, name, 'world_system' as type, deleted_at FROM world_systems WHERE project_id = $1 AND deleted_at IS NOT NULL
      UNION ALL
      SELECT id, title as name, 'lore' as type, deleted_at FROM lore WHERE project_id = $1 AND deleted_at IS NOT NULL
      UNION ALL
      SELECT id, title as name, 'timeline_event' as type, deleted_at FROM timeline_events WHERE project_id = $1 AND deleted_at IS NOT NULL
      UNION ALL
      SELECT id, title as name, 'plot_point' as type, deleted_at FROM plot_points WHERE project_id = $1 AND deleted_at IS NOT NULL
      ORDER BY deleted_at DESC
    `;
    
    return select<TrashedItem>(db, query, [projectId]);
  },

  /** Route the restore call to the correct service. */
  async restoreItem(db: Database, projectId: string, id: string, type: string): Promise<void> {
    switch (type) {
      case 'character': return characterService.restore(db, id);
      case 'location': return locationService.restore(db, id);
      case 'organization': return organizationService.restore(db, id);
      case 'species': return speciesService.restore(db, id);
      case 'item': return itemService.restore(db, id);
      case 'world_system': return worldSystemService.restore(db, id);
      case 'lore': return loreService.restore(db, id);
      case 'timeline_event': return timelineEventService.restore(db, id);
      case 'plot_point': return plotPointService.restore(db, id);
      case 'chapter': {
        // Special logic for chapters: append [Restored] and assign a new chapter_number
        const chapter = await chapterService.getById(db, id);
        if (chapter) {
          const nextNum = await chapterService.getNextChapterNumber(db, projectId);
          const newTitle = `[Restored] ${chapter.title}`;
          await execute(
            db, 
            `UPDATE chapters SET deleted_at = NULL, updated_at = datetime('now'), chapter_number = $1, title = $2 WHERE id = $3`,
            [nextNum, newTitle, id]
          );
        }
        return;
      }
      default:
        console.error(`Unknown type: ${type}`);
    }
  },

  /** Route the hard delete call to the correct service. */
  async hardDeleteItem(db: Database, id: string, type: string): Promise<void> {
    switch (type) {
      case 'chapter': return chapterService.hardDelete(db, id);
      case 'character': return characterService.hardDelete(db, id);
      case 'location': return locationService.hardDelete(db, id);
      case 'organization': return organizationService.hardDelete(db, id);
      case 'species': return speciesService.hardDelete(db, id);
      case 'item': return itemService.hardDelete(db, id);
      case 'world_system': return worldSystemService.hardDelete(db, id);
      case 'lore': return loreService.hardDelete(db, id);
      case 'timeline_event': return timelineEventService.hardDelete(db, id);
      case 'plot_point': return plotPointService.hardDelete(db, id);
      default:
        console.error(`Unknown type: ${type}`);
    }
  },

  /** Permanently delete all items in the trash for a given project. */
  async emptyTrash(db: Database, projectId: string): Promise<void> {
    const trashed = await this.getTrashedItems(db, projectId);
    for (const item of trashed) {
      await this.hardDeleteItem(db, item.id, item.type);
    }
  },

  /** Auto-delete items older than 60 days. */
  async autoDeleteOldTrash(db: Database): Promise<void> {
    // We can query all items older than 60 days across all projects
    const query = `
      SELECT id, 'chapter' as type FROM chapters WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', '-60 days')
      UNION ALL
      SELECT id, 'character' as type FROM characters WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', '-60 days')
      UNION ALL
      SELECT id, 'location' as type FROM locations WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', '-60 days')
      UNION ALL
      SELECT id, 'organization' as type FROM organizations WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', '-60 days')
      UNION ALL
      SELECT id, 'species' as type FROM species WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', '-60 days')
      UNION ALL
      SELECT id, 'item' as type FROM items WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', '-60 days')
      UNION ALL
      SELECT id, 'world_system' as type FROM world_systems WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', '-60 days')
      UNION ALL
      SELECT id, 'lore' as type FROM lore WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', '-60 days')
      UNION ALL
      SELECT id, 'timeline_event' as type FROM timeline_events WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', '-60 days')
      UNION ALL
      SELECT id, 'plot_point' as type FROM plot_points WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', '-60 days')
    `;
    const oldItems = await select<{id: string, type: string}>(db, query);
    for (const item of oldItems) {
      await this.hardDeleteItem(db, item.id, item.type);
    }
  }
};
