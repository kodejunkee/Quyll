import { createEntityService } from '@/services/entityService';
import type { GlossaryEntry } from '@/types/database';
import { EntityType } from '@/types/common';

const GLOSSARY_COLUMNS = [
  'term', 'aliases', 'definition', 'category', 'notes', 'keyword_enabled',
];

export const glossaryService = createEntityService<GlossaryEntry>({
  tableName: 'glossaries',
  columns: GLOSSARY_COLUMNS,
  entityType: EntityType.Glossary,
  nameColumn: 'term',
  aliasesColumn: 'aliases',
});
