import { createEntityService } from '@/services/entityService';
import type { WorldSystem } from '@/types/database';
import { EntityType } from '@/types/common';
export const worldSystemService = createEntityService<WorldSystem>({
  tableName: 'world_systems',
  columns: ['name', 'description', 'rules', 'limitations', 'energy_source', 'examples', 'keyword_enabled'],
  entityType: EntityType.WorldSystem,
  nameColumn: 'name',
});
