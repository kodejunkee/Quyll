/**
 * React context providing the current project's database connection.
 * Used by all entity pages within the /project/:projectId/* routes.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type Database from '@tauri-apps/plugin-sql';
import { openProjectDatabase } from '@/database/projectDatabase';
import { initAppDatabase, listProjects, touchProject } from '@/database';
import { useProjectStore } from '@/store/projectStore';
import { Project } from '@/types/database';
import type { UUID, Timestamp } from '@/types/common';
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
  const { projects, setProjects, setCurrentProject } = useProjectStore();
  const project = projects.find((p) => p.id === projectId);
  const projectPath = project?.path ?? `projects/${projectId}.quyll`;

  useEffect(() => {
    let cancelled = false;

    async function open() {
      try {
        let currentProjects = projects;
        if (currentProjects.length === 0) {
          try {
            await initAppDatabase();
            const rows = await listProjects();
            currentProjects = rows.map((r) => ({
              id: r.id as UUID,
              name: r.name,
              path: r.path,
              description: r.description ?? '',
              author: r.author ?? '',
              genre: r.genre ?? '',
              last_opened_at: (r.last_opened_at as Timestamp) ?? null,
              created_at: (r.created_at as Timestamp) ?? (new Date().toISOString() as Timestamp),
              updated_at: (r.updated_at as Timestamp) ?? (new Date().toISOString() as Timestamp),
            }));
            if (!cancelled) setProjects(currentProjects);
          } catch (listErr) {
            console.error('[ProjectDbProvider] Failed to load global projects list:', listErr);
          }
        }

        const activeProj = currentProjects.find((p) => p.id === projectId);
        const resolvedPath = activeProj?.path ?? `projects/${projectId}.quyll`;

        const conn = await openProjectDatabase(resolvedPath);
        if (cancelled) return;
        setDb(conn);
        await touchProject(projectId);

        try {
          const metaRows = await conn.select<{ id: string; title: string; description?: string; author?: string; genre?: string }[]>('SELECT * FROM project_meta LIMIT 1');
          const meta = metaRows[0];
          if (meta) {
            setCurrentProject({
              id: (meta.id || projectId) as UUID,
              name: meta.title || activeProj?.name || 'Untitled Project',
              path: resolvedPath,
              description: meta.description || activeProj?.description || '',
              author: meta.author || activeProj?.author || '',
              genre: meta.genre || activeProj?.genre || '',
              last_opened_at: new Date().toISOString() as Timestamp,
              created_at: (activeProj?.created_at || new Date().toISOString()) as Timestamp,
              updated_at: (activeProj?.updated_at || new Date().toISOString()) as Timestamp,
            });
          } else if (activeProj) {
            setCurrentProject({ ...activeProj, last_opened_at: new Date().toISOString() as Timestamp });
          }
        } catch (metaErr) {
          console.error('[ProjectDbProvider] Failed to fetch project_meta:', metaErr);
          if (activeProj) setCurrentProject(activeProj);
        }
      } catch (err) {
        console.error('[ProjectDbProvider] Failed to open project DB:', err);
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to open project');
      }
    }

    void open();

    return () => {
      cancelled = true;
      setCurrentProject(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

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
