import { createEntityService } from '@/services/entityService';
import type { MagicSystem } from '@/types/database';
export const magicSystemService = createEntityService<MagicSystem>({ tableName: 'magic_systems', columns: ['name', 'description', 'rules', 'limitations', 'energy_source', 'examples', 'keyword_enabled'] });
