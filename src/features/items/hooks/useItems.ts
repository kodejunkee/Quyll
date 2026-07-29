import { useCallback, useMemo } from 'react';
import { useProjectDb } from '@/hooks/useProjectDb';
import { useWorkspaceStore } from '@/store/workspaceStore';
import type { Item } from '@/types/database';

export function useItems() {
  const { db, projectId } = useProjectDb();
  const store = useWorkspaceStore();

  const items = useMemo(() => store.items.filter((i) => !i.deleted_at), [store.items]);

  const loading = store.isInitializing;
  const error = store.initError ? new Error(store.initError) : null;

  const refresh = useCallback(async () => {
    if (db && projectId) {
      await store.initialize(db, projectId);
    }
  }, [db, projectId, store.initialize]);

  const create = useCallback(
    async (data: unknown): Promise<Item | null> => {
      if (!projectId || !db) return null;
      try {
        return await store.createItem(db, projectId, data as Partial<Item>);
      } catch (err) {
        console.error('[useItems] create error:', err);
        return null;
      }
    },
    [db, projectId, store.createItem]
  );

  const update = useCallback(
    async (id: string, data: unknown): Promise<void> => {
      if (!db) return;
      try {
        await store.updateItem(db, id, data as Partial<Item>);
      } catch (err) {
        console.error('[useItems] update error:', err);
      }
    },
    [db, store.updateItem]
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      if (!db) return;
      try {
        await store.softDeleteItem(db, id);
      } catch (err) {
        console.error('[useItems] remove error:', err);
      }
    },
    [db, store.softDeleteItem]
  );

  const restore = useCallback(
    async (id: string): Promise<void> => {
      if (!db) return;
      try {
        await store.restoreItem(db, id);
      } catch (err) {
        console.error('[useItems] restore error:', err);
      }
    },
    [db, store.restoreItem]
  );

  const getById = useCallback(
    async (id: string): Promise<Item | null> => {
      return store.items.find(item => item.id === id) || null;
    },
    [store.items]
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
