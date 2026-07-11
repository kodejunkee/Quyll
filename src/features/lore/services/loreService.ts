import { createEntityService } from '@/services/entityService';
import type { LoreEntry } from '@/types/database';
import { EntityType } from '@/types/common';
export const loreService = createEntityService<LoreEntry>({
  tableName: 'lore',
  columns: ['title', 'category', 'content', 'notes', 'keyword_enabled'],
  entityType: EntityType.Lore,
  nameColumn: 'title',
});
