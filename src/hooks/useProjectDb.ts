/**
 * React context providing the current project's database connection.
 * Used by all entity pages within the /project/:projectId/* routes.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type Database from '@tauri-apps/plugin-sql';
import { openProjectDatabase, closeProjectDatabase } from '@/database/projectDatabase';
import { useProjectStore } from '@/store/projectStore';
import { LoadingSkeleton } from '@/components';

interface ProjectDbContextValue {
  db: Database;
  projectId: string;
  projectPath: string;
}

const ProjectDbContext = createContext<ProjectDbContextValue | null>(null);

/** Access the current project's database connection. Throws if used outside a ProjectDbProvider. */
export function useProjectDb(): ProjectDbContextValue {
  const ctx = useContext(ProjectDbContext);
  if (!ctx) throw new Error('useProjectDb must be used within a ProjectDbProvider');
  return ctx;
}

interface ProjectDbProviderProps {
  projectId: string;
  children: ReactNode;
}

/**
 * Opens the project database on mount, closes on unmount.
 * Children only render after the DB is ready.
 */
export function ProjectDbProvider({ projectId, children }: ProjectDbProviderProps) {
  const [db, setDb] = useState<Database | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { projects } = useProjectStore();
  const project = projects.find((p) => p.id === projectId);
  const projectPath = project?.path ?? `projects/${projectId}.quyll`;

  useEffect(() => {
    let cancelled = false;

    async function open() {
      try {
        const conn = await openProjectDatabase(projectPath);
        if (!cancelled) setDb(conn);
      } catch (err) {
        console.error('[ProjectDbProvider] Failed to open project DB:', err);
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to open project');
      }
    }

    void open();

    return () => {
      cancelled = true;
      void closeProjectDatabase(projectPath).catch(() => {});
    };
  }, [projectPath]);

  if (error) {
    return (
      <div style={{ padding: 'var(--space-6) var(--space-8)' }}>
        <h2 style={{ color: 'var(--color-danger)' }}>Failed to load project</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)' }}>{error}</p>
      </div>
    );
  }

  if (!db) {
    return (
      <div style={{ padding: 'var(--space-6) var(--space-8)' }}>
        <LoadingSkeleton variant="card" count={3} />
      </div>
    );
  }

  return (
    <ProjectDbContext.Provider value={{ db, projectId, projectPath }}>
      {children}
    </ProjectDbContext.Provider>
  );
}
