import type Database from '@tauri-apps/plugin-sql';
import { select } from '@/database/databaseService';
import { EntityType } from '@/types/common';

export interface GraphNode {
  id: string;
  type: EntityType | 'chapter';
  name: string;
}

export interface GraphLink {
  id: string;
  source: string; // source_id
  target: string; // target_id
  label: string;  // relationship text
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export const graphService = {
  /**
   * Fetches all entities and relationships for the Knowledge Graph
   */
  async getGraphData(db: Database, projectId: string): Promise<GraphData> {
    const params = [projectId];

    // 1. Fetch all nodes using UNION ALL
    const nodesQuery = `
      SELECT id, 'character' as type, name FROM characters WHERE project_id = $1 AND deleted_at IS NULL
      UNION ALL
      SELECT id, 'location' as type, name FROM locations WHERE project_id = $1 AND deleted_at IS NULL
      UNION ALL
      SELECT id, 'organization' as type, name FROM organizations WHERE project_id = $1 AND deleted_at IS NULL
      UNION ALL
      SELECT id, 'species' as type, name FROM species WHERE project_id = $1 AND deleted_at IS NULL
      UNION ALL
      SELECT id, 'item' as type, name FROM items WHERE project_id = $1 AND deleted_at IS NULL
      UNION ALL
      SELECT id, 'magic_system' as type, name FROM magic_systems WHERE project_id = $1 AND deleted_at IS NULL
      UNION ALL
      SELECT id, 'lore' as type, title as name FROM lore WHERE project_id = $1 AND deleted_at IS NULL
      UNION ALL
      SELECT id, 'timeline_event' as type, title as name FROM timeline_events WHERE project_id = $1 AND deleted_at IS NULL
      UNION ALL
      SELECT id, 'plot_point' as type, title as name FROM plot_points WHERE project_id = $1 AND deleted_at IS NULL
    `;
    const nodes = await select<GraphNode>(db, nodesQuery, params);

    // 2. Fetch all relationships (links)
    const linksQuery = `
      SELECT id, source_id as source, target_id as target, relationship as label
      FROM relationships
      WHERE project_id = $1
    `;
    const links = await select<GraphLink>(db, linksQuery, params);

    // Filter out links where source or target node doesn't exist (e.g. deleted entities)
    const nodeIds = new Set(nodes.map(n => n.id));
    const validLinks = links.filter(l => nodeIds.has(l.source) && nodeIds.has(l.target));

    return {
      nodes,
      links: validLinks
    };
  }
};
