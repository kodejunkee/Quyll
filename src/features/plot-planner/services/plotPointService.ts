import { createEntityService } from '@/services/entityService';
import type { PlotPoint } from '@/types/database';
export const plotPointService = createEntityService<PlotPoint>({ tableName: 'plot_points', columns: ['title', 'description', 'status', 'arc', 'notes', 'order_index'] });
