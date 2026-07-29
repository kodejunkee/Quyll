import { useCallback, useMemo } from 'react';
import { useProjectDb } from '@/hooks/useProjectDb';
import { useWorkspaceStore } from '@/store/workspaceStore';
import type { WorldSystem } from '@/types/database';

export function useWorldSystems() {
  const { db, projectId } = useProjectDb();
  const store = useWorkspaceStore();

  const items = useMemo(() => store.worldSystems.filter((ws) => !ws.deleted_at), [store.worldSystems]);

  const loading = store.isInitializing;
  const error = store.initError ? new Error(store.initError) : null;

  const refresh = useCallback(async () => {
    if (db && projectId) {
      await store.initialize(db, projectId);
    }
  }, [db, projectId, store.initialize]);

  const create = useCallback(
    async (data: unknown): Promise<WorldSystem | null> => {
      if (!projectId || !db) return null;
      try {
        return await store.createWorldSystem(db, projectId, data as Partial<WorldSystem>);
      } catch (err) {
        console.error('[useWorldSystems] create error:', err);
        return null;
      }
    },
    [db, projectId, store.createWorldSystem]
  );

  const update = useCallback(
    async (id: string, data: unknown): Promise<void> => {
      if (!db) return;
      try {
        await store.updateWorldSystem(db, id, data as Partial<WorldSystem>);
      } catch (err) {
        console.error('[useWorldSystems] update error:', err);
      }
    },
    [db, store.updateWorldSystem]
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      if (!db) return;
      try {
        await store.softDeleteWorldSystem(db, id);
      } catch (err) {
        console.error('[useWorldSystems] remove error:', err);
      }
    },
    [db, store.softDeleteWorldSystem]
  );

  const restore = useCallback(
    async (id: string): Promise<void> => {
      if (!db) return;
      try {
        await store.restoreWorldSystem(db, id);
      } catch (err) {
        console.error('[useWorldSystems] restore error:', err);
      }
    },
    [db, store.restoreWorldSystem]
  );

  const getById = useCallback(
    async (id: string): Promise<WorldSystem | null> => {
      return store.worldSystems.find(item => item.id === id) || null;
    },
    [store.worldSystems]
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
