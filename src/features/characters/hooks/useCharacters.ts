import { useCallback } from 'react';
import { useProjectDb } from '@/hooks/useProjectDb';
import { useWorkspaceStore } from '@/store/workspaceStore';
import type { Character } from '@/types/database';

/**
 * Hook providing CRUD operations for characters in the current project.
 * Uses the in-memory workspaceStore for instantaneous UI updates,
 * and syncs to SQLite in the background.
 */
export function useCharacters() {
  const { db, projectId } = useProjectDb();
  const store = useWorkspaceStore();

  const items = store.characters;
  const loading = store.isInitializing;
  const error = store.initError;

  const refresh = useCallback(async () => {
    if (db && projectId) {
      await store.initialize(db, projectId);
    }
  }, [db, projectId, store.initialize]);

  const create = useCallback(
    async (data: unknown): Promise<Character | null> => {
      if (!projectId || !db) return null;
      try {
        return await store.createCharacter(db, projectId, data as Partial<Character>);
      } catch (err) {
        console.error('[useCharacters] create error:', err);
        return null;
      }
    },
    [db, projectId, store.createCharacter]
  );

  const update = useCallback(
    async (id: string, data: unknown): Promise<boolean> => {
      if (!db) return false;
      try {
        await store.updateCharacter(db, id, data as Partial<Character>);
        return true;
      } catch (err) {
        console.error('[useCharacters] update error:', err);
        return false;
      }
    },
    [db, store.updateCharacter]
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      if (!db) return false;
      try {
        await store.softDeleteCharacter(db, id);
        return true;
      } catch (err) {
        console.error('[useCharacters] softDelete error:', err);
        return false;
      }
    },
    [db, store.softDeleteCharacter]
  );

  const restore = useCallback(
    async (id: string): Promise<boolean> => {
      if (!db) return false;
      try {
        await store.restoreCharacter(db, id);
        return true;
      } catch (err) {
        console.error('[useCharacters] restore error:', err);
        return false;
      }
    },
    [db, store.restoreCharacter]
  );

  const getById = useCallback(
    (id: string) => {
      return store.characters.find(c => c.id === id) || null;
    },
    [store.characters]
  );

  const updateImage = useCallback(
    async (characterId: string, imageId: string | null) => {
      if (!db) return;
      await store.updateCharacter(db, characterId, { image_id: imageId as import('@/types/common').UUID | null });
    },
    [db, store.updateCharacter]
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
