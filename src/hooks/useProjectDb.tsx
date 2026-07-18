/**
 * React context providing the current project's database connection.
 * Used by all entity pages within the /project/:projectId/* routes.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type Database from '@tauri-apps/plugin-sql';
import { openProjectDatabase, closeProjectDatabase } from '@/database/projectDatabase';
import { useProjectStore } from '@/store/projectStore';
import { Button, LoadingSkeleton } from '@/components';

interface ProjectDbContextValue {
  db: Database;
  projectId: string;
  projectPath: string;
}

const ProjectDbContext = createContext<ProjectDbContextValue | null>(null);

export function useProjectDb(): ProjectDbContextValue {
  const ctx = useContext(ProjectDbContext);
  if (!ctx || !ctx.db) {
    throw new Error('useProjectDb must be used within a ProjectDbProvider when db is ready.');
  }
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
    let friendlyText = error;
    if (error.includes('SQLITE_CORRUPT')) {
      friendlyText = 'The project database appears to be corrupted. Try restoring from a backup.';
    } else if (error.includes('SQLITE_BUSY')) {
      friendlyText = 'The project database is currently locked by another application.';
    } else if (error.includes('ENOENT')) {
      friendlyText = 'Project folder not found.';
    }

    return (
      <div style={{ padding: 'var(--space-6) var(--space-8)' }}>
        <h2 style={{ color: 'var(--color-danger)' }}>Failed to load project</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)' }}>{friendlyText}</p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
          <Button variant="primary" onClick={() => window.location.reload()}>Retry Connection</Button>
          <Button variant="secondary" onClick={() => window.location.href = '/'}>Return Home</Button>
        </div>
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
