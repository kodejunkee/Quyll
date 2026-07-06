import { useMemo, useCallback } from 'react';
import { useProjectDb } from '@/hooks/useProjectDb';
import { useCrud, type CrudService } from '@/hooks/useCrud';
import { plotPointService } from '../services/plotPointService';
import type { PlotPoint } from '@/types/database';
export function usePlotPoints() {
  const { db, projectId } = useProjectDb();
  const service: CrudService<PlotPoint> = useMemo(() => ({ list: (pid: string) => plotPointService.list(db, pid), create: (pid: string, d: Partial<PlotPoint>) => plotPointService.create(db, pid, d as Record<string, unknown>), update: (id: string, d: Partial<PlotPoint>) => plotPointService.update(db, id, d as Record<string, unknown>), softDelete: (id: string) => plotPointService.softDelete(db, id), restore: (id: string) => plotPointService.restore(db, id) }), [db]);
  const crud = useCrud<PlotPoint>(service, projectId);
  const getById = useCallback((id: string) => plotPointService.getById(db, id), [db]);
  return { ...crud, getById };
}
