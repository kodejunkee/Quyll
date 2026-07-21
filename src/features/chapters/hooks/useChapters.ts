import { useCallback, useMemo } from 'react';
import { useProjectDb } from '@/hooks/useProjectDb';
import { useCrud, type CrudService } from '@/hooks/useCrud';
import { chapterService } from '../services/chapterService';
import type { Chapter } from '@/types/database';

/**
 * Hook providing CRUD operations for chapters in the current project.
 * Wraps the generic useCrud with the chapter service.
 */
export function useChapters() {
  const { db, projectId } = useProjectDb();

  const service: CrudService<Chapter> = useMemo(
    () => ({
      list: (pid: string) => chapterService.list(db, pid),
      create: async (pid: string, data: Partial<Chapter>) => {
        return chapterService.create(db, pid, data as Record<string, unknown>);
      },
      update: async (id: string, data: Partial<Chapter>) => {
        await chapterService.update(db, id, data as Record<string, unknown>);
      },
      softDelete: (id: string) => chapterService.softDelete(db, id),
      restore: (id: string) => chapterService.restore(db, id),
    }),
    [db],
  );

  const crud = useCrud<Chapter>(service, projectId);

  const getById = useCallback(
    (id: string) => chapterService.getById(db, id),
    [db],
  );

  const updateContent = useCallback(
    (id: string, content: string, wordCount: number, readingTime: number, updatedAt?: string) =>
      chapterService.updateContent(db, id, content, wordCount, readingTime, updatedAt),
    [db],
  );

  const reorder = useCallback(
    async (orderedIds: string[]) => {
      await chapterService.reorder(db, orderedIds);
      await crud.refresh();
    },
    [db, crud],
  );

  const duplicate = useCallback(
    async (chapter: Chapter) => {
      const newChapter = await chapterService.duplicate(db, chapter);
      await crud.refresh();
      return newChapter;
    },
    [db, crud],
  );

  const getNextChapterNumber = useCallback(
    () => chapterService.getNextChapterNumber(db, projectId),
    [db, projectId],
  );

  const getTotalWordCount = useCallback(
    () => chapterService.getTotalWordCount(db, projectId),
    [db, projectId],
  );

  return {
    ...crud,
    getById,
    updateContent,
    reorder,
    duplicate,
    getNextChapterNumber,
    getTotalWordCount,
  };
}
