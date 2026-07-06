import { createEntityService } from '@/services/entityService';
import type { Character } from '@/types/database';

const CHARACTER_COLUMNS = [
  'name', 'aliases', 'age', 'birthday', 'gender', 'height', 'occupation',
  'appearance', 'personality', 'goals', 'fears', 'strengths', 'weaknesses',
  'abilities', 'equipment', 'motivations', 'biography', 'notes', 'status',
  'image_id', 'keyword_enabled',
];

export const characterService = createEntityService<Character>({
  tableName: 'characters',
  columns: CHARACTER_COLUMNS,
});
