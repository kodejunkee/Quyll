import { useMemo, useCallback } from 'react';
import { useProjectDb } from '@/hooks/useProjectDb';
import { useCrud, type CrudService } from '@/hooks/useCrud';
import { itemService } from '../services/itemService';
import type { Item } from '@/types/database';
export function useItems() {
  const { db, projectId } = useProjectDb();
  const service: CrudService<Item> = useMemo(() => ({ list: (pid: string) => itemService.list(db, pid), create: (pid: string, d: Partial<Item>) => itemService.create(db, pid, d as Record<string, unknown>), update: (id: string, d: Partial<Item>) => itemService.update(db, id, d as Record<string, unknown>), softDelete: (id: string) => itemService.softDelete(db, id), restore: (id: string) => itemService.restore(db, id) }), [db]);
  const crud = useCrud<Item>(service, projectId);
  const getById = useCallback((id: string) => itemService.getById(db, id), [db]);
  return { ...crud, getById };
}
