import { createEntityService } from '@/services/entityService';
import type { Species } from '@/types/database';
import { EntityType } from '@/types/common';
export const speciesService = createEntityService<Species>({
  tableName: 'species',
  columns: ['name', 'appearance', 'culture', 'history', 'habitat', 'abilities', 'weaknesses', 'notes', 'image_id', 'keyword_enabled'],
  entityType: EntityType.Species,
  nameColumn: 'name',
});
