import { createEntityService } from '@/services/entityService';
import type { Item } from '@/types/database';
import { EntityType } from '@/types/common';
export const itemService = createEntityService<Item>({
  tableName: 'items',
  columns: ['name', 'type', 'description', 'owner_character_id', 'notes', 'image_id', 'keyword_enabled'],
  entityType: EntityType.Item,
  nameColumn: 'name',
});
