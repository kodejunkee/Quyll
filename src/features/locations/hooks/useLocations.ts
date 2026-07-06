import { useMemo, useCallback } from 'react';
import { useProjectDb } from '@/hooks/useProjectDb';
import { useCrud, type CrudService } from '@/hooks/useCrud';
import { locationService } from '../services/locationService';
import type { Location } from '@/types/database';

export function useLocations() {
  const { db, projectId } = useProjectDb();

  const service: CrudService<Location> = useMemo(() => ({
    list: (pid: string) => locationService.list(db, pid),
    create: (pid: string, data: Partial<Location>) => locationService.create(db, pid, data as Record<string, unknown>),
    update: (id: string, data: Partial<Location>) => locationService.update(db, id, data as Record<string, unknown>),
    softDelete: (id: string) => locationService.softDelete(db, id),
    restore: (id: string) => locationService.restore(db, id),
  }), [db]);

  const crud = useCrud<Location>(service, projectId);
  const getById = useCallback((id: string) => locationService.getById(db, id), [db]);
  const updateImage = useCallback(async (entityId: string, imageId: string | null) => {
    await locationService.update(db, entityId, { image_id: imageId });
    await crud.refresh();
  }, [db, crud]);

  return { ...crud, getById, updateImage };
}
