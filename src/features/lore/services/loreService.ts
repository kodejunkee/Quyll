import { createEntityService } from '@/services/entityService';
import type { LoreEntry } from '@/types/database';
export const loreService = createEntityService<LoreEntry>({ tableName: 'lore', columns: ['title', 'category', 'content', 'notes', 'keyword_enabled'] });
