import { useMemo, useCallback } from 'react';
import { useProjectDb } from '@/hooks/useProjectDb';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { plotEdgeService } from '../services/plotEdgeService';
import type { PlotEdge } from '@/types/database';

export function usePlotEdges() {
  const { db, projectId } = useProjectDb();
  
  const entries = useWorkspaceStore((state) => state.plotEdges);
  const createPlotEdge = useWorkspaceStore((state) => state.createPlotEdge);
  const updatePlotEdge = useWorkspaceStore((state) => state.updatePlotEdge);
  const softDeletePlotEdge = useWorkspaceStore((state) => state.softDeletePlotEdge);
  const restorePlotEdge = useWorkspaceStore((state) => state.restorePlotEdge);

  const activeEntries = useMemo(() => entries.filter((pe) => !pe.deleted_at), [entries]);
  const deletedEntries = useMemo(() => entries.filter((pe) => pe.deleted_at), [entries]);

  const create = useCallback(
    async (data: Partial<PlotEdge>) => {
      if (!db || !projectId) throw new Error('No database connection');
      return await createPlotEdge(db, projectId, data);
    },
    [db, projectId, createPlotEdge]
  );

  const update = useCallback(
    async (id: string, data: Partial<PlotEdge>) => {
      if (!db) throw new Error('No database connection');
      await updatePlotEdge(db, id, data);
    },
    [db, updatePlotEdge]
  );

  const softDelete = useCallback(
    async (id: string) => {
      if (!db) throw new Error('No database connection');
      await softDeletePlotEdge(db, id);
    },
    [db, softDeletePlotEdge]
  );

  const restore = useCallback(
    async (id: string) => {
      if (!db) throw new Error('No database connection');
      await restorePlotEdge(db, id);
    },
    [db, restorePlotEdge]
  );

  const getById = useCallback(
    async (id: string) => {
      if (!db) return null;
      return await plotEdgeService.getById(db, id);
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
