import { useMemo, useCallback } from 'react';
import { useProjectDb } from '@/hooks/useProjectDb';
import { useCrud, type CrudService } from '@/hooks/useCrud';
import { timelineEventService } from '../services/timelineEventService';
import type { TimelineEvent } from '@/types/database';
export function useTimelineEvents() {
  const { db, projectId } = useProjectDb();
  const service: CrudService<TimelineEvent> = useMemo(() => ({ list: (pid: string) => timelineEventService.list(db, pid), create: (pid: string, d: Partial<TimelineEvent>) => timelineEventService.create(db, pid, d as Record<string, unknown>), update: (id: string, d: Partial<TimelineEvent>) => timelineEventService.update(db, id, d as Record<string, unknown>), softDelete: (id: string) => timelineEventService.softDelete(db, id), restore: (id: string) => timelineEventService.restore(db, id) }), [db]);
  const crud = useCrud<TimelineEvent>(service, projectId);
  const getById = useCallback((id: string) => timelineEventService.getById(db, id), [db]);
  return { ...crud, getById };
}
