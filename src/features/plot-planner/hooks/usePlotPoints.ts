import { useMemo, useCallback } from 'react';
import { useProjectDb } from '@/hooks/useProjectDb';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { plotPointService } from '../services/plotPointService';
import type { PlotPoint } from '@/types/database';

export function usePlotPoints() {
  const { db, projectId } = useProjectDb();
  
  const entries = useWorkspaceStore((state) => state.plotPoints);
  const createPlotPoint = useWorkspaceStore((state) => state.createPlotPoint);
  const updatePlotPoint = useWorkspaceStore((state) => state.updatePlotPoint);
  const softDeletePlotPoint = useWorkspaceStore((state) => state.softDeletePlotPoint);
  const restorePlotPoint = useWorkspaceStore((state) => state.restorePlotPoint);

  const activeEntries = useMemo(() => entries.filter((pp) => !pp.deleted_at), [entries]);
  const deletedEntries = useMemo(() => entries.filter((pp) => pp.deleted_at), [entries]);

  const create = useCallback(
    async (data: Partial<PlotPoint>) => {
      if (!db || !projectId) throw new Error('No database connection');
      return await createPlotPoint(db, projectId, data);
    },
    [db, projectId, createPlotPoint]
  );

  const update = useCallback(
    async (id: string, data: Partial<PlotPoint>) => {
      if (!db) throw new Error('No database connection');
      await updatePlotPoint(db, id, data);
    },
    [db, updatePlotPoint]
  );

  const softDelete = useCallback(
    async (id: string) => {
      if (!db) throw new Error('No database connection');
      await softDeletePlotPoint(db, id);
    },
    [db, softDeletePlotPoint]
  );

  const restore = useCallback(
    async (id: string) => {
      if (!db) throw new Error('No database connection');
      await restorePlotPoint(db, id);
    },
    [db, restorePlotPoint]
  );

  const getById = useCallback(
    async (id: string) => {
      if (!db) return null;
      return await plotPointService.getById(db, id);
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
