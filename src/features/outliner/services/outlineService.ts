import { createEntityService } from '@/services/entityService';
import type { Outline } from '@/types/database';
import { EntityType } from '@/types/common';

export const outlineService = createEntityService<Outline>({
  tableName: 'outlines',
  columns: ['title', 'description', 'category'],
  entityType: EntityType.Outline,
  nameColumn: 'title',
});
