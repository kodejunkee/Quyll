import { useMemo, useCallback } from 'react';
import { useProjectDb } from '@/hooks/useProjectDb';
import { useCrud, type CrudService } from '@/hooks/useCrud';
import { organizationService } from '../services/organizationService';
import type { Organization } from '@/types/database';
export function useOrganizations() {
  const { db, projectId } = useProjectDb();
  const service: CrudService<Organization> = useMemo(() => ({
    list: (pid: string) => organizationService.list(db, pid),
    create: (pid: string, data: Partial<Organization>) => organizationService.create(db, pid, data as Record<string, unknown>),
    update: (id: string, data: Partial<Organization>) => organizationService.update(db, id, data as Record<string, unknown>),
    softDelete: (id: string) => organizationService.softDelete(db, id),
    restore: (id: string) => organizationService.restore(db, id),
  }), [db]);
  const crud = useCrud<Organization>(service, projectId);
  const getById = useCallback((id: string) => organizationService.getById(db, id), [db]);
  const updateImage = useCallback(async (entityId: string, imageId: string | null) => { await organizationService.update(db, entityId, { image_id: imageId }); await crud.refresh(); }, [db, crud]);
  return { ...crud, getById, updateImage };
}
