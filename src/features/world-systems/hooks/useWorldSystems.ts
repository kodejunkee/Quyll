import { useMemo, useCallback } from 'react';
import { useProjectDb } from '@/hooks/useProjectDb';
import { useCrud, type CrudService } from '@/hooks/useCrud';
import { worldSystemService } from '../services/worldSystemService';
import type { WorldSystem } from '@/types/database';
export function useWorldSystems() {
  const { db, projectId } = useProjectDb();
  const service: CrudService<WorldSystem> = useMemo(() => ({ list: (pid: string) => worldSystemService.list(db, pid), create: (pid: string, d: Partial<WorldSystem>) => worldSystemService.create(db, pid, d as Record<string, unknown>), update: (id: string, d: Partial<WorldSystem>) => worldSystemService.update(db, id, d as Record<string, unknown>), softDelete: (id: string) => worldSystemService.softDelete(db, id), restore: (id: string) => worldSystemService.restore(db, id) }), [db]);
  const crud = useCrud<WorldSystem>(service, projectId);
  const getById = useCallback((id: string) => worldSystemService.getById(db, id), [db]);
  return { ...crud, getById };
}
