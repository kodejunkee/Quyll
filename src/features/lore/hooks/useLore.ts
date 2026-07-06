import { useMemo, useCallback } from 'react';
import { useProjectDb } from '@/hooks/useProjectDb';
import { useCrud, type CrudService } from '@/hooks/useCrud';
import { loreService } from '../services/loreService';
import type { LoreEntry } from '@/types/database';
export function useLore() {
  const { db, projectId } = useProjectDb();
  const service: CrudService<LoreEntry> = useMemo(() => ({ list: (pid: string) => loreService.list(db, pid), create: (pid: string, d: Partial<LoreEntry>) => loreService.create(db, pid, d as Record<string, unknown>), update: (id: string, d: Partial<LoreEntry>) => loreService.update(db, id, d as Record<string, unknown>), softDelete: (id: string) => loreService.softDelete(db, id), restore: (id: string) => loreService.restore(db, id) }), [db]);
  const crud = useCrud<LoreEntry>(service, projectId);
  const getById = useCallback((id: string) => loreService.getById(db, id), [db]);
  return { ...crud, getById };
}
