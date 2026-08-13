import { createEntityService } from '@/services/entityService';
import type { PlotEdge } from '@/types/database';

export const plotEdgeService = createEntityService<PlotEdge>({
  tableName: 'plot_edges',
  columns: ['source_id', 'target_id', 'label']
});
