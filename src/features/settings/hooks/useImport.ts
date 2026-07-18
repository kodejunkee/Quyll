import { useState, useCallback } from 'react';
import { useProjectDb } from '@/hooks/useProjectDb';
import { useNotification } from '@/components/Notification';
import { useProjectStore } from '@/store/projectStore';
import * as importService from '@/services/importService';
import type { ImportPreview, ImportedChapter } from '@/services/importService';

export function useImport() {
  const { db } = useProjectDb();
  const { currentProject } = useProjectStore();
  const { notify } = useNotification();

  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const reset = useCallback(() => {
    setPreview(null);
    setSelectedIndices(new Set());
    setIsLoading(false);
    setIsImporting(false);
  }, []);

  const pickFile = useCallback(async () => {
    setIsLoading(true);
    try {
      const file = await importService.pickImportFile();
      if (!file) {
        setIsLoading(false);
        return;
      }
      const previewData = await importService.previewImport(file.path, file.format, file.fileName);
      setPreview(previewData);
      setSelectedIndices(new Set(previewData.chapters.map((_, i) => i)));
    } catch (err) {
      console.error('[useImport] pickFile error:', err);
      notify('Failed to read file', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [notify]);

  const toggleChapter = useCallback((index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const runImport = useCallback(async (): Promise<boolean> => {
    if (!db || !currentProject || !preview || selectedIndices.size === 0) {
      return false;
    }

    setIsImporting(true);
    try {
      const selectedChapters: ImportedChapter[] = preview.chapters.filter((_, i) =>
        selectedIndices.has(i),
      );
      const count = await importService.importIntoProject(
        db,
        currentProject.id,
        selectedChapters,
      );
      notify(`Imported ${count} chapters successfully!`, 'success');
      setPreview(null);
      setSelectedIndices(new Set());
      return true;
    } catch (err) {
      console.error('[useImport] runImport error:', err);
      notify('Failed to import chapters', 'error');
      return false;
    } finally {
      setIsImporting(false);
    }
  }, [db, currentProject, preview, selectedIndices, notify]);

  return {
    preview,
    isLoading,
    isImporting,
    selectedIndices,
    pickFile,
    toggleChapter,
    runImport,
    reset,
  };
}
