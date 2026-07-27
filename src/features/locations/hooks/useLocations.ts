import { useCallback } from 'react';
import { useProjectDb } from '@/hooks/useProjectDb';
import { useWorkspaceStore } from '@/store/workspaceStore';
import type { Location } from '@/types/database';

export function useLocations() {
  const { db, projectId } = useProjectDb();
  const store = useWorkspaceStore();

  const items = store.locations;
  const loading = store.isInitializing;
  const error = store.initError;

  const refresh = useCallback(async () => {
    if (db && projectId) {
      await store.initialize(db, projectId);
    }
  }, [db, projectId, store.initialize]);

  const create = useCallback(
    async (data: unknown): Promise<Location | null> => {
      if (!projectId || !db) return null;
      try {
        return await store.createLocation(db, projectId, data as Partial<Location>);
      } catch (err) {
        console.error('[useLocations] create error:', err);
        return null;
      }
    },
    [db, projectId, store.createLocation]
  );

  const update = useCallback(
    async (id: string, data: unknown): Promise<boolean> => {
      if (!db) return false;
      try {
        await store.updateLocation(db, id, data as Partial<Location>);
        return true;
      } catch (err) {
        console.error('[useLocations] update error:', err);
        return false;
      }
    },
    [db, store.updateLocation]
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      if (!db) return false;
      try {
        await store.softDeleteLocation(db, id);
        return true;
      } catch (err) {
        console.error('[useLocations] softDelete error:', err);
        return false;
      }
    },
    [db, store.softDeleteLocation]
  );

  const restore = useCallback(
    async (id: string): Promise<boolean> => {
      if (!db) return false;
      try {
        await store.restoreLocation(db, id);
        return true;
      } catch (err) {
        console.error('[useLocations] restore error:', err);
        return false;
      }
    },
    [db, store.restoreLocation]
  );

  const getById = useCallback(
    (id: string) => {
      return store.locations.find(c => c.id === id) || null;
    },
    [store.locations]
  );

  const updateImage = useCallback(
    async (entityId: string, imageId: string | null) => {
      if (!db) return;
      await store.updateLocation(db, entityId, { image_id: imageId as import('@/types/common').UUID | null });
    },
    [db, store.updateLocation]
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
    updateImage,
  };
}
