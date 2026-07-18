import { useState, useCallback, useEffect, useRef } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useNotification } from '@/components/Notification';
import * as backupService from '@/services/backupService';
import type { BackupInfo } from '@/services/backupService';
import { useSettings } from './useSettings';

export function useBackup() {
  const { currentProject } = useProjectStore();
  const { notify } = useNotification();
  const { settings } = useSettings();

  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const projectPath = currentProject?.path;

  const refreshBackups = useCallback(async () => {
    if (!projectPath) {
      setBackups([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const list = await backupService.listBackups(projectPath);
      setBackups(list);
    } catch (err) {
      console.error('Failed to list backups:', err);
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    void refreshBackups();
  }, [refreshBackups]);

  const createBackup = useCallback(
    async (label?: string) => {
      if (!projectPath) return;
      try {
        setIsCreating(true);
        await backupService.createBackup(projectPath, label);
        await refreshBackups();
        notify('Backup created successfully', 'success');
      } catch (err) {
        console.error('Failed to create backup:', err);
        notify('Failed to create backup', 'error');
      } finally {
        setIsCreating(false);
      }
    },
    [projectPath, refreshBackups, notify],
  );

  const restoreBackup = useCallback(
    async (backupId: string) => {
      if (!projectPath) return;
      try {
        setIsRestoring(true);
        await backupService.restoreBackup(projectPath, backupId);
        notify('Backup restored. Reloading workspace...', 'success');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (err) {
        console.error('Failed to restore backup:', err);
        notify('Failed to restore backup', 'error');
        setIsRestoring(false);
      }
    },
    [projectPath, notify],
  );

  const deleteBackup = useCallback(
    async (backupId: string) => {
      if (!projectPath) return;
      try {
        await backupService.deleteBackup(projectPath, backupId);
        await refreshBackups();
        notify('Backup deleted', 'info');
      } catch (err) {
        console.error('Failed to delete backup:', err);
        notify('Failed to delete backup', 'error');
      }
    },
    [projectPath, refreshBackups, notify],
  );

  const exportBackup = useCallback(
    async (backupId: string) => {
      if (!projectPath) return;
      try {
        await backupService.exportBackup(projectPath, backupId);
        notify('Backup exported successfully', 'success');
      } catch (err) {
        console.error('Failed to export backup:', err);
        notify('Failed to export backup', 'error');
      }
    },
    [projectPath, notify],
  );

  // Handle scheduled backups
  const backupInterval = settings?.backup_interval ?? 0;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (projectPath && backupInterval > 0) {
      const ms = backupInterval * 60 * 1000;
      intervalRef.current = setInterval(() => {
        void createBackup('auto');
      }, ms);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [projectPath, backupInterval, createBackup]);

  return {
    backups,
    loading,
    isCreating,
    isRestoring,
    createBackup,
    restoreBackup,
    deleteBackup,
    exportBackup,
    refreshBackups,
  };
}
