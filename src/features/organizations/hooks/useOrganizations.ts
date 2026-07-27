import { useCallback } from 'react';
import { useProjectDb } from '@/hooks/useProjectDb';
import { useWorkspaceStore } from '@/store/workspaceStore';
import type { Organization } from '@/types/database';

export function useOrganizations() {
  const { db, projectId } = useProjectDb();
  const store = useWorkspaceStore();

  const items = store.organizations;
  const loading = store.isInitializing;
  const error = store.initError;

  const refresh = useCallback(async () => {
    if (db && projectId) {
      await store.initialize(db, projectId);
    }
  }, [db, projectId, store.initialize]);

  const create = useCallback(
    async (data: unknown): Promise<Organization | null> => {
      if (!projectId || !db) return null;
      try {
        return await store.createOrganization(db, projectId, data as Partial<Organization>);
      } catch (err) {
        console.error('[useOrganizations] create error:', err);
        return null;
      }
    },
    [db, projectId, store.createOrganization]
  );

  const update = useCallback(
    async (id: string, data: unknown): Promise<boolean> => {
      if (!db) return false;
      try {
        await store.updateOrganization(db, id, data as Partial<Organization>);
        return true;
      } catch (err) {
        console.error('[useOrganizations] update error:', err);
        return false;
      }
    },
    [db, store.updateOrganization]
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      if (!db) return false;
      try {
        await store.softDeleteOrganization(db, id);
        return true;
      } catch (err) {
        console.error('[useOrganizations] softDelete error:', err);
        return false;
      }
    },
    [db, store.softDeleteOrganization]
  );

  const restore = useCallback(
    async (id: string): Promise<boolean> => {
      if (!db) return false;
      try {
        await store.restoreOrganization(db, id);
        return true;
      } catch (err) {
        console.error('[useOrganizations] restore error:', err);
        return false;
      }
    },
    [db, store.restoreOrganization]
  );

  const getById = useCallback(
    (id: string) => {
      return store.organizations.find(c => c.id === id) || null;
    },
    [store.organizations]
  );

  const updateImage = useCallback(
    async (entityId: string, imageId: string | null) => {
      if (!db) return;
      await store.updateOrganization(db, entityId, { image_id: imageId as import('@/types/common').UUID | null });
    },
    [db, store.updateOrganization]
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
