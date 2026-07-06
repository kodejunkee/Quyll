import { useCallback, useMemo } from 'react';
import { useProjectDb } from '@/hooks/useProjectDb';
import { useCrud, type CrudService } from '@/hooks/useCrud';
import { characterService } from '../services/characterService';
import type { Character } from '@/types/database';

/**
 * Hook providing CRUD operations for characters in the current project.
 * Wraps the generic useCrud with the character service.
 */
export function useCharacters() {
  const { db, projectId } = useProjectDb();

  const service: CrudService<Character> = useMemo(
    () => ({
      list: (pid: string) => characterService.list(db, pid),
      create: async (pid: string, data: Partial<Character>) => {
        return characterService.create(db, pid, data as Record<string, unknown>);
      },
      update: async (id: string, data: Partial<Character>) => {
        await characterService.update(db, id, data as Record<string, unknown>);
      },
      softDelete: (id: string) => characterService.softDelete(db, id),
      restore: (id: string) => characterService.restore(db, id),
    }),
    [db],
  );

  const crud = useCrud<Character>(service, projectId);

  const getById = useCallback(
    (id: string) => characterService.getById(db, id),
    [db],
  );

  const updateImage = useCallback(
    async (characterId: string, imageId: string | null) => {
      await characterService.update(db, characterId, { image_id: imageId });
      await crud.refresh();
    },
    [db, crud],
  );

  return { ...crud, getById, updateImage };
}
