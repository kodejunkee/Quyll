import { useCallback, useMemo } from 'react';
import { useProjectDb } from '@/hooks/useProjectDb';
import { useWorkspaceStore } from '@/store/workspaceStore';
import type { Species } from '@/types/database';

export function useSpecies() {
  const { db, projectId } = useProjectDb();
  const store = useWorkspaceStore();

  const items = useMemo(() => store.species.filter((s) => !s.deleted_at), [store.species]);

  const loading = store.isInitializing;
  const error = store.initError ? new Error(store.initError) : null;

  const refresh = useCallback(async () => {
    if (db && projectId) {
      await store.initialize(db, projectId);
    }
  }, [db, projectId, store.initialize]);

  const create = useCallback(
    async (data: unknown): Promise<Species | null> => {
      if (!projectId || !db) return null;
      try {
        return await store.createSpecies(db, projectId, data as Partial<Species>);
      } catch (err) {
        console.error('[useSpecies] create error:', err);
        return null;
      }
    },
    [db, projectId, store.createSpecies]
  );

  const update = useCallback(
    async (id: string, data: unknown): Promise<void> => {
      if (!db) return;
      try {
        await store.updateSpecies(db, id, data as Partial<Species>);
      } catch (err) {
        console.error('[useSpecies] update error:', err);
      }
    },
    [db, store.updateSpecies]
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      if (!db) return;
      try {
        await store.softDeleteSpecies(db, id);
      } catch (err) {
        console.error('[useSpecies] remove error:', err);
      }
    },
    [db, store.softDeleteSpecies]
  );

  const restore = useCallback(
    async (id: string): Promise<void> => {
      if (!db) return;
      try {
        await store.restoreSpecies(db, id);
      } catch (err) {
        console.error('[useSpecies] restore error:', err);
      }
    },
    [db, store.restoreSpecies]
  );

  const getById = useCallback(
    async (id: string): Promise<Species | null> => {
      return store.species.find(item => item.id === id) || null;
    },
    [store.species]
  );

  return {
    items,
    loading,
    error,
    refresh,
    create,
    update,
    remove,
    restore,
    getById,
  };
}
