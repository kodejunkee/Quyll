import { createEntityService } from '@/services/entityService';
import type { Character } from '@/types/database';
import { EntityType } from '@/types/common';

const CHARACTER_COLUMNS = [
  'name', 'aliases', 'age', 'birthday', 'gender', 'height', 'occupation',
  'appearance', 'personality', 'goals', 'fears', 'strengths', 'weaknesses',
  'abilities', 'equipment', 'motivations', 'biography', 'notes', 'status',
  'image_id', 'keyword_enabled',
];

export const characterService = createEntityService<Character>({
  tableName: 'characters',
  columns: CHARACTER_COLUMNS,
  entityType: EntityType.Character,
  nameColumn: 'name',
});
