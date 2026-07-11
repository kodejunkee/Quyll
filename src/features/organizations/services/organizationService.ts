import { createEntityService } from '@/services/entityService';
import type { Organization } from '@/types/database';
import { EntityType } from '@/types/common';
export const organizationService = createEntityService<Organization>({
  tableName: 'organizations',
  columns: ['name', 'type', 'description', 'leader', 'purpose', 'structure', 'history', 'notes', 'image_id', 'keyword_enabled'],
  entityType: EntityType.Organization,
  nameColumn: 'name',
});
