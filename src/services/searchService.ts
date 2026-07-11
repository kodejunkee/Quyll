import { Database } from '@tauri-apps/plugin-sql';
import { select } from '@/database/databaseService';
import { EntityType } from '@/types/common';

export interface SearchResult {
  id: string;
  type: string;
  name: string;
  description: string;
}

export const searchService = {
  /**
   * Search across all entities and chapters for a keyword
   */
  async globalSearch(db: Database, projectId: string, keyword: string): Promise<SearchResult[]> {
    if (!keyword.trim()) return [];
    
    // Add wildcards for LIKE query
    const searchPattern = `%${keyword.trim()}%`;
    const params = [projectId, searchPattern, searchPattern];

    const query = `
      SELECT id, 'chapter' as type, title as name, '' as description
      FROM chapters 
      WHERE project_id = $1 AND deleted_at IS NULL AND (title LIKE $2 OR content LIKE $3)
      
      UNION ALL
      SELECT id, 'character' as type, name, biography as description
      FROM characters
      WHERE project_id = $1 AND deleted_at IS NULL AND (name LIKE $2 OR biography LIKE $3)
      
      UNION ALL
      SELECT id, 'location' as type, name, description
      FROM locations
      WHERE project_id = $1 AND deleted_at IS NULL AND (name LIKE $2 OR description LIKE $3)
      
      UNION ALL
      SELECT id, 'organization' as type, name, description
      FROM organizations
      WHERE project_id = $1 AND deleted_at IS NULL AND (name LIKE $2 OR description LIKE $3)
      
      UNION ALL
      SELECT id, 'species' as type, name, appearance as description
      FROM species
      WHERE project_id = $1 AND deleted_at IS NULL AND (name LIKE $2 OR appearance LIKE $3)
      
      UNION ALL
      SELECT id, 'item' as type, name, description
      FROM items
      WHERE project_id = $1 AND deleted_at IS NULL AND (name LIKE $2 OR description LIKE $3)
      
      UNION ALL
      SELECT id, 'magic_system' as type, name, description
      FROM magic_systems
      WHERE project_id = $1 AND deleted_at IS NULL AND (name LIKE $2 OR description LIKE $3)
      
      UNION ALL
      SELECT id, 'lore' as type, title as name, content as description
      FROM lore
      WHERE project_id = $1 AND deleted_at IS NULL AND (title LIKE $2 OR content LIKE $3)
      
      UNION ALL
      SELECT id, 'timeline_event' as type, title as name, description
      FROM timeline_events
      WHERE project_id = $1 AND deleted_at IS NULL AND (title LIKE $2 OR description LIKE $3)
      
      UNION ALL
      SELECT id, 'plot_point' as type, title as name, description
      FROM plot_points
      WHERE project_id = $1 AND deleted_at IS NULL AND (title LIKE $2 OR description LIKE $3)
      
      ORDER BY name ASC
      LIMIT 100;
    `;

    return select<SearchResult>(db, query, params);
  }
};
