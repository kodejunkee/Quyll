import { useMemo, useCallback } from 'react';
import { useProjectDb } from '@/hooks/useProjectDb';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { loreService } from '../services/loreService';
import type { LoreEntry } from '@/types/database';

export function useLore() {
  const { db, projectId } = useProjectDb();
  
  const entries = useWorkspaceStore((state) => state.lore);
  const createLore = useWorkspaceStore((state) => state.createLore);
  const updateLore = useWorkspaceStore((state) => state.updateLore);
  const softDeleteLore = useWorkspaceStore((state) => state.softDeleteLore);
  const restoreLore = useWorkspaceStore((state) => state.restoreLore);

  const activeEntries = useMemo(() => entries.filter((l) => !l.deleted_at), [entries]);
  const deletedEntries = useMemo(() => entries.filter((l) => l.deleted_at), [entries]);

  const create = useCallback(
    async (data: Partial<LoreEntry>) => {
      if (!db || !projectId) throw new Error('No database connection');
      return await createLore(db, projectId, data);
    },
    [db, projectId, createLore]
  );

  const update = useCallback(
    async (id: string, data: Partial<LoreEntry>) => {
      if (!db) throw new Error('No database connection');
      await updateLore(db, id, data);
    },
    [db, updateLore]
  );

  const softDelete = useCallback(
    async (id: string) => {
      if (!db) throw new Error('No database connection');
      await softDeleteLore(db, id);
    },
    [db, softDeleteLore]
  );

  const restore = useCallback(
    async (id: string) => {
      if (!db) throw new Error('No database connection');
      await restoreLore(db, id);
    },
    [db, restoreLore]
  );

  const getById = useCallback(
    async (id: string) => {
      if (!db) return null;
      return await loreService.getById(db, id);
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
