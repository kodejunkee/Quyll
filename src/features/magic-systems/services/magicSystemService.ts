import { createEntityService } from '@/services/entityService';
import type { MagicSystem } from '@/types/database';
import { EntityType } from '@/types/common';
export const magicSystemService = createEntityService<MagicSystem>({
  tableName: 'magic_systems',
  columns: ['name', 'description', 'rules', 'limitations', 'energy_source', 'examples', 'keyword_enabled'],
  entityType: EntityType.MagicSystem,
  nameColumn: 'name',
});
