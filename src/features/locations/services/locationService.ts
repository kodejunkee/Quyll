import { createEntityService } from '@/services/entityService';
import type { Location } from '@/types/database';

export const locationService = createEntityService<Location>({
  tableName: 'locations',
  columns: ['name', 'type', 'description', 'climate', 'architecture', 'culture', 'population', 'history', 'notes', 'image_id', 'keyword_enabled'],
});
