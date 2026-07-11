import { createEntityService } from '@/services/entityService';
import type { TimelineEvent } from '@/types/database';
import { EntityType } from '@/types/common';
export const timelineEventService = createEntityService<TimelineEvent>({
  tableName: 'timeline_events',
  columns: ['title', 'description', 'event_date', 'chapter_id', 'keyword_enabled'],
  entityType: EntityType.TimelineEvent,
  nameColumn: 'title',
});
