import { useMemo, useCallback } from 'react';
import { useProjectDb } from '@/hooks/useProjectDb';
import { useCrud, type CrudService } from '@/hooks/useCrud';
import { magicSystemService } from '../services/magicSystemService';
import type { MagicSystem } from '@/types/database';
export function useMagicSystems() {
  const { db, projectId } = useProjectDb();
  const service: CrudService<MagicSystem> = useMemo(() => ({ list: (pid: string) => magicSystemService.list(db, pid), create: (pid: string, d: Partial<MagicSystem>) => magicSystemService.create(db, pid, d as Record<string, unknown>), update: (id: string, d: Partial<MagicSystem>) => magicSystemService.update(db, id, d as Record<string, unknown>), softDelete: (id: string) => magicSystemService.softDelete(db, id), restore: (id: string) => magicSystemService.restore(db, id) }), [db]);
  const crud = useCrud<MagicSystem>(service, projectId);
  const getById = useCallback((id: string) => magicSystemService.getById(db, id), [db]);
  return { ...crud, getById };
}
