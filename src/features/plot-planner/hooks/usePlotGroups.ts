import { useMemo, useCallback } from 'react';
import { useProjectDb } from '@/hooks/useProjectDb';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { plotGroupService } from '../services/plotGroupService';
import type { PlotGroup } from '@/types/database';

export function usePlotGroups() {
  const { db, projectId } = useProjectDb();
  
  const entries = useWorkspaceStore((state) => state.plotGroups);
  const createPlotGroup = useWorkspaceStore((state) => state.createPlotGroup);
  const updatePlotGroup = useWorkspaceStore((state) => state.updatePlotGroup);
  const softDeletePlotGroup = useWorkspaceStore((state) => state.softDeletePlotGroup);
  const restorePlotGroup = useWorkspaceStore((state) => state.restorePlotGroup);

  const activeEntries = useMemo(() => entries.filter((pg) => !pg.deleted_at), [entries]);
  const deletedEntries = useMemo(() => entries.filter((pg) => pg.deleted_at), [entries]);

  const create = useCallback(
    async (data: Partial<PlotGroup>) => {
      if (!db || !projectId) throw new Error('No database connection');
      return await createPlotGroup(db, projectId, data);
    },
    [db, projectId, createPlotGroup]
  );

  const update = useCallback(
    async (id: string, data: Partial<PlotGroup>) => {
      if (!db) throw new Error('No database connection');
      await updatePlotGroup(db, id, data);
    },
    [db, updatePlotGroup]
  );

  const softDelete = useCallback(
    async (id: string) => {
      if (!db) throw new Error('No database connection');
      await softDeletePlotGroup(db, id);
    },
    [db, softDeletePlotGroup]
  );

  const restore = useCallback(
    async (id: string) => {
      if (!db) throw new Error('No database connection');
      await restorePlotGroup(db, id);
    },
    [db, restorePlotGroup]
  );

  const getById = useCallback(
    async (id: string) => {
      if (!db) return null;
      return await plotGroupService.getById(db, id);
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
