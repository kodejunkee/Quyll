import { useMemo, useCallback } from 'react';
import { useProjectDb } from '@/hooks/useProjectDb';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { outlineService } from '../services/outlineService';
import type { Outline } from '@/types/database';

export function useOutlines() {
  const { db, projectId } = useProjectDb();
  
  // Actually we need to make sure workspaceStore has outline, createOutline, etc.
  const entries = useWorkspaceStore((state) => state.outlines || []);
  const createOutline = useWorkspaceStore((state) => state.createOutline);
  const updateOutline = useWorkspaceStore((state) => state.updateOutline);
  const softDeleteOutline = useWorkspaceStore((state) => state.softDeleteOutline);
  const restoreOutline = useWorkspaceStore((state) => state.restoreOutline);

  const activeEntries = useMemo(() => entries.filter((l: Outline) => !l.deleted_at), [entries]);
  const deletedEntries = useMemo(() => entries.filter((l: Outline) => l.deleted_at), [entries]);

  const create = useCallback(
    async (data: Partial<Outline>) => {
      if (!db || !projectId) throw new Error('No database connection');
      return await createOutline(db, projectId, data);
    },
    [db, projectId, createOutline]
  );

  const update = useCallback(
    async (id: string, data: Partial<Outline>) => {
      if (!db) throw new Error('No database connection');
      await updateOutline(db, id, data);
    },
    [db, updateOutline]
  );

  const softDelete = useCallback(
    async (id: string) => {
      if (!db) throw new Error('No database connection');
      await softDeleteOutline(db, id);
    },
    [db, softDeleteOutline]
  );

  const restore = useCallback(
    async (id: string) => {
      if (!db) throw new Error('No database connection');
      await restoreOutline(db, id);
    },
    [db, restoreOutline]
  );

  const getById = useCallback(
    async (id: string) => {
      if (!db) return null;
      return await outlineService.getById(db, id);
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
