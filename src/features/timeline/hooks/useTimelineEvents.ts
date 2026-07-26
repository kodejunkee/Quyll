import { useMemo, useCallback } from 'react';
import { useProjectDb } from '@/hooks/useProjectDb';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { timelineEventService } from '../services/timelineEventService';
import type { TimelineEvent } from '@/types/database';

export function useTimelineEvents() {
  const { db, projectId } = useProjectDb();
  
  const entries = useWorkspaceStore((state) => state.timeline);
  const createTimelineEvent = useWorkspaceStore((state) => state.createTimelineEvent);
  const updateTimelineEvent = useWorkspaceStore((state) => state.updateTimelineEvent);
  const softDeleteTimelineEvent = useWorkspaceStore((state) => state.softDeleteTimelineEvent);
  const restoreTimelineEvent = useWorkspaceStore((state) => state.restoreTimelineEvent);

  const activeEntries = useMemo(() => entries.filter((te) => !te.deleted_at), [entries]);
  const deletedEntries = useMemo(() => entries.filter((te) => te.deleted_at), [entries]);

  const create = useCallback(
    async (data: Partial<TimelineEvent>) => {
      if (!db || !projectId) throw new Error('No database connection');
      return await createTimelineEvent(db, projectId, data);
    },
    [db, projectId, createTimelineEvent]
  );

  const update = useCallback(
    async (id: string, data: Partial<TimelineEvent>) => {
      if (!db) throw new Error('No database connection');
      await updateTimelineEvent(db, id, data);
    },
    [db, updateTimelineEvent]
  );

  const softDelete = useCallback(
    async (id: string) => {
      if (!db) throw new Error('No database connection');
      await softDeleteTimelineEvent(db, id);
    },
    [db, softDeleteTimelineEvent]
  );

  const restore = useCallback(
    async (id: string) => {
      if (!db) throw new Error('No database connection');
      await restoreTimelineEvent(db, id);
    },
    [db, restoreTimelineEvent]
  );

  const getById = useCallback(
    async (id: string) => {
      if (!db) return null;
      return await timelineEventService.getById(db, id);
    },
    [db]
  );

  return {
    items: activeEntries,
    deletedItems: deletedEntries,
    isLoading: false,
    error: null,
    create,
    update,
    softDelete,
    restore,
    getById,
  };
}
