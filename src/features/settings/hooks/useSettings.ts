import { useState, useCallback, useEffect } from 'react';
import { useProjectDb } from '@/hooks/useProjectDb';
import { SettingsService } from '../services/settingsService';
import type { Settings, SettingsFormData } from '../types/settings';

export function useSettings() {
  const { db } = useProjectDb();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!db) return;
    try {
      setLoading(true);
      const service = new SettingsService(db);
      const data = await service.getSettings();
      setSettings(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(
    async (data: Partial<SettingsFormData>) => {
      if (!db) return;
      try {
        const service = new SettingsService(db);
        const updated = await service.updateSettings(data);
        if (updated) {
          setSettings(updated);
        }
      } catch (err) {
        console.error('Failed to update settings:', err);
        throw err;
      }
    },
    [db],
  );

  return {
    settings,
    loading,
    error,
    updateSettings,
    refresh: fetchSettings,
  };
}
