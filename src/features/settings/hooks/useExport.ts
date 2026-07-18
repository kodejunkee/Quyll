import { useState, useCallback } from 'react';
import { useProjectDb } from '@/hooks/useProjectDb';
import { useNotification } from '@/components/Notification';
import { useProjectStore } from '@/store/projectStore';
import { exportProject } from '@/services/exportService';
import type { ExportFormat, ExportScope } from '@/services/exportService';

export function useExport() {
  const { db } = useProjectDb();
  const { currentProject } = useProjectStore();
  const { notify } = useNotification();

  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [scope, setScope] = useState<ExportScope>('project');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const runExport = useCallback(async () => {
    if (!db || !currentProject) {
      notify('No active project connected or available.', 'error');
      return;
    }

    try {
      setIsExporting(true);
      const success = await exportProject(db, currentProject.id, {
        format,
        scope,
        chapterId: selectedChapterId || undefined,
        chapterIds: selectedChapterIds,
        projectName: currentProject.name,
      });

      if (success) {
        notify('Export completed successfully!', 'success');
      }
    } catch (error) {
      console.error('[useExport] Export failed:', error);
      const message = error instanceof Error ? error.message : 'An error occurred during export.';
      notify(`Failed to export: ${message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  }, [db, currentProject, format, scope, selectedChapterId, selectedChapterIds, notify]);

  const reset = useCallback(() => {
    setFormat('markdown');
    setScope('project');
    setSelectedChapterId('');
    setSelectedChapterIds([]);
    setIsExporting(false);
  }, []);

  return {
    format,
    setFormat,
    scope,
    setScope,
    selectedChapterId,
    setSelectedChapterId,
    selectedChapterIds,
    setSelectedChapterIds,
    isExporting,
    runExport,
    reset,
  };
}
