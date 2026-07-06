import { useMemo, useCallback } from 'react';
import { useProjectDb } from '@/hooks/useProjectDb';
import { useCrud, type CrudService } from '@/hooks/useCrud';
import { speciesService } from '../services/speciesService';
import type { Species } from '@/types/database';
export function useSpecies() {
  const { db, projectId } = useProjectDb();
  const service: CrudService<Species> = useMemo(() => ({ list: (pid: string) => speciesService.list(db, pid), create: (pid: string, d: Partial<Species>) => speciesService.create(db, pid, d as Record<string, unknown>), update: (id: string, d: Partial<Species>) => speciesService.update(db, id, d as Record<string, unknown>), softDelete: (id: string) => speciesService.softDelete(db, id), restore: (id: string) => speciesService.restore(db, id) }), [db]);
  const crud = useCrud<Species>(service, projectId);
  const getById = useCallback((id: string) => speciesService.getById(db, id), [db]);
  return { ...crud, getById };
}
