import { createEntityService } from '@/services/entityService';
import type { TimelineEvent } from '@/types/database';
export const timelineEventService = createEntityService<TimelineEvent>({ tableName: 'timeline_events', columns: ['title', 'description', 'event_date', 'chapter_id', 'keyword_enabled'] });
