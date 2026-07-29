import { useCallback, useMemo } from 'react';
import { useProjectDb } from '@/hooks/useProjectDb';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { chapterService } from '../services/chapterService';
import type { Chapter } from '@/types/database';

/**
 * Hook providing CRUD operations for chapters in the current project.
 * Uses the in-memory workspaceStore for instantaneous UI updates,
 * and syncs to SQLite in the background.
 */
export function useChapters() {
  const { db, projectId } = useProjectDb();
  const store = useWorkspaceStore();

  const items = useMemo(() => store.chapters.filter((c) => !c.deleted_at), [store.chapters]);
  const loading = store.isInitializing;
  const error = store.initError;

  const refresh = useCallback(async () => {
    if (db && projectId) {
      await store.initialize(db, projectId);
    }
  }, [db, projectId, store.initialize]);

  const create = useCallback(
    async (data: unknown): Promise<Chapter | null> => {
      if (!projectId || !db) return null;
      try {
        return await store.createChapter(db, projectId, data as Partial<Chapter>);
      } catch (err) {
        console.error('[useChapters] create error:', err);
        return null;
      }
    },
    [db, projectId, store.createChapter]
  );

  const update = useCallback(
    async (id: string, data: unknown): Promise<boolean> => {
      if (!db) return false;
      try {
        await store.updateChapter(db, id, data as Partial<Chapter>);
        return true;
      } catch (err) {
        console.error('[useChapters] update error:', err);
        return false;
      }
    },
    [db, store.updateChapter]
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      if (!db) return false;
      try {
        await store.softDeleteChapter(db, id);
        return true;
      } catch (err) {
        console.error('[useChapters] softDelete error:', err);
        return false;
      }
    },
    [db, store.softDeleteChapter]
  );

  const restore = useCallback(
    async (id: string): Promise<boolean> => {
      if (!db) return false;
      try {
        await store.restoreChapter(db, id);
        return true;
      } catch (err) {
        console.error('[useChapters] restore error:', err);
        return false;
      }
    },
    [db, store.restoreChapter]
  );

  const getById = useCallback(
    async (id: string) => {
      if (!db) return null;
      // Fetch full chapter from DB because store chapters omit 'content' for performance
      return await chapterService.getById(db, id);
    },
    [db]
  );

  const updateContent = useCallback(
    async (id: string, content: string, wordCount: number, readingTime: number, updatedAt?: string) => {
      if (!db) return;
      await store.updateChapterContent(db, id, content, wordCount, readingTime, updatedAt);
    },
    [db, store.updateChapterContent]
  );

  const reorder = useCallback(
    async (orderedIds: string[]) => {
      if (!db) return;
      await store.reorderChapters(db, orderedIds);
    },
    [db, store.reorderChapters]
  );

  const duplicate = useCallback(
    async (chapter: Chapter) => {
      if (!db) return null;
      return await store.duplicateChapter(db, chapter);
    },
    [db, store.duplicateChapter]
  );

  const getNextChapterNumber = useCallback(
    async () => {
      if (store.chapters.length === 0) return 1;
      return Math.max(...store.chapters.map(c => c.chapter_number)) + 1;
    },
    [store.chapters]
  );

  const getTotalWordCount = useCallback(
    async () => {
      return store.chapters.reduce((sum, c) => sum + (c.word_count || 0), 0);
    },
    [store.chapters]
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
    updateContent,
    reorder,
    duplicate,
    getNextChapterNumber,
    getTotalWordCount,
  };
}
