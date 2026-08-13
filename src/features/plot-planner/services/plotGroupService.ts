import { createEntityService } from '@/services/entityService';
import type { PlotGroup } from '@/types/database';

export const plotGroupService = createEntityService<PlotGroup>({
  tableName: 'plot_groups',
  columns: ['name', 'color', 'category']
});
