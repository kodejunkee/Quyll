import { useWorkspaceStore } from '@/store/workspaceStore';
import { useProjectDb } from '@/hooks/useProjectDb';
import type { GlossaryEntry } from '@/types/database';

export function useGlossary(projectId: string | null) {
  const { db } = useProjectDb();
  const { glossary, createGlossary, updateGlossary, softDeleteGlossary } = useWorkspaceStore();

  const projectGlossary = glossary.filter((g) => g.project_id === projectId && !g.deleted_at);

  const addTerm = async (data: Partial<GlossaryEntry>) => {
    if (!db || !projectId) return null;
    return createGlossary(db, projectId, data);
  };

  const updateTerm = async (id: string, data: Partial<GlossaryEntry>) => {
    if (!db) return;
    return updateGlossary(db, id, data);
  };

  const deleteTerm = async (id: string) => {
    if (!db) return;
    return softDeleteGlossary(db, id);
  };

  return {
    glossary: projectGlossary,
    addTerm,
    updateTerm,
    deleteTerm,
  };
}
