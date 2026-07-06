/**
 * Generic CRUD hook factory for entity modules.
 *
 * Each module provides a "service" object with list/create/update/softDelete.
 * This hook handles loading state, error state, and data refresh.
 */

import { useState, useEffect, useCallback } from 'react';

export interface CrudService<T, C = Partial<T>, U = Partial<T>> {
  list(projectId: string): Promise<T[]>;
  create(projectId: string, data: C): Promise<T>;
  update(id: string, data: U): Promise<void>;
  softDelete(id: string): Promise<void>;
  restore?(id: string): Promise<void>;
}

interface CrudState<T> {
  items: T[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (data: unknown) => Promise<T | null>;
  update: (id: string, data: unknown) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  restore: (id: string) => Promise<boolean>;
}

export function useCrud<T, C = Partial<T>, U = Partial<T>>(
  service: CrudService<T, C, U>,
  projectId: string | undefined,
): CrudState<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await service.list(projectId);
      setItems(rows);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load data';
      setError(msg);
      console.error('[useCrud] list error:', err);
    } finally {
      setLoading(false);
    }
  }, [service, projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (data: unknown): Promise<T | null> => {
      if (!projectId) return null;
      try {
        const item = await service.create(projectId, data as C);
        await refresh();
        return item;
      } catch (err) {
        console.error('[useCrud] create error:', err);
        return null;
      }
    },
    [service, projectId, refresh],
  );

  const update = useCallback(
    async (id: string, data: unknown): Promise<boolean> => {
      try {
        await service.update(id, data as U);
        await refresh();
        return true;
      } catch (err) {
        console.error('[useCrud] update error:', err);
        return false;
      }
    },
    [service, refresh],
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await service.softDelete(id);
        await refresh();
        return true;
      } catch (err) {
        console.error('[useCrud] softDelete error:', err);
        return false;
      }
    },
    [service, refresh],
  );

  const restore = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        if (service.restore) {
          await service.restore(id);
          await refresh();
          return true;
        }
        return false;
      } catch (err) {
        console.error('[useCrud] restore error:', err);
        return false;
      }
    },
    [service, refresh],
  );

  return { items, loading, error, refresh, create, update, remove, restore };
}
