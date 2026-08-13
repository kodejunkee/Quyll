/**
 * React context providing the current project's database connection.
 * Used by all entity pages within the /project/:projectId/* routes.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type Database from '@tauri-apps/plugin-sql';
import { openProjectDatabase } from '@/database/projectDatabase';
import { initAppDatabase, listProjects, touchProject } from '@/database';
import { useProjectStore } from '@/store/projectStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { Button } from '@/components/Button';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
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

export function useOptionalProjectDb(): ProjectDbContextValue | null {
  return useContext(ProjectDbContext);
}

interface ProjectDbProviderProps {
  projectId: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Module-level flag — ensures initAppDatabase() only runs once per app session.
 */
let appDbInitialized = false;

/**
 * Opens the project database on mount, closes on unmount.
 * Children only render after the DB is ready.
 */
export function ProjectDbProvider({ projectId, children, fallback }: ProjectDbProviderProps) {
  const [db, setDb] = useState<Database | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { projects, setProjects, updateTabProjectInfo } = useProjectStore();
  const project = projects.find((p) => p.id === projectId);
  const projectPath = project?.path ?? `projects/${projectId}.quyll`;

  useEffect(() => {
    let cancelled = false;

    async function open() {
      try {
        let currentProjects = projects;

        // Only init the app DB once per session, and only if the store is empty
        if (!appDbInitialized && currentProjects.length === 0) {
          try {
            await initAppDatabase();
            appDbInitialized = true;
            const rows = await listProjects();
            currentProjects = rows.map((r) => ({
              id: r.id,
              name: r.name,
              path: r.path,
              description: r.description ?? '',
              author: r.author ?? '',
              genre: r.genre ?? [],
              cover_image: r.cover_image ?? null,
              last_opened_at: r.last_opened_at ?? null,
              deleted_at: r.deleted_at ?? null,
              created_at: r.created_at ?? new Date().toISOString(),
              updated_at: r.updated_at ?? new Date().toISOString(),
            }));
            if (!cancelled) setProjects(currentProjects);
          } catch (listErr) {
            console.error('[ProjectDbProvider] Failed to load global projects list:', listErr);
          }
        } else if (!appDbInitialized) {
          // Projects already in store from dashboard, just mark as initialized
          appDbInitialized = true;
        }

        const activeProj = currentProjects.find((p) => p.id === projectId);
        const resolvedPath = activeProj?.path ?? `projects/${projectId}.quyll`;

        // Open the project database (includes cached migration check)
        const conn = await openProjectDatabase(resolvedPath);
        if (cancelled) return;

        // Set DB immediately — this unblocks children rendering and entity loading
        setDb(conn);

        // Kick off entity loading immediately — don't wait for a child component to mount
        const { initialize } = useWorkspaceStore.getState();
        initialize(conn, projectId);

        // Fire-and-forget: update last_opened_at timestamp (non-blocking)
        touchProject(projectId).catch((err) =>
          console.error('[ProjectDbProvider] touchProject failed:', err)
        );

        // Background: fetch project metadata without blocking the UI
        try {
          const metaRows = await conn.select<{ id: string; title: string; description?: string; author?: string; genre?: string }[]>('SELECT * FROM project_meta LIMIT 1');
          if (cancelled) return;
          const meta = metaRows[0];
          
          let parsedGenre: string[] = [];
          if (meta?.genre) {
            try {
              const parsed = JSON.parse(meta.genre);
              if (Array.isArray(parsed)) parsedGenre = parsed;
            } catch {
              // Ignore parse errors from old string-based genres
            }
          }

          if (meta) {
            updateTabProjectInfo(projectId, {
              id: meta.id || projectId,
              name: meta.title || activeProj?.name || 'Untitled Project',
              path: resolvedPath,
              description: meta.description || activeProj?.description || '',
              author: meta.author || activeProj?.author || '',
              genre: parsedGenre.length > 0 ? parsedGenre : activeProj?.genre || [],
              cover_image: activeProj?.cover_image || null,
              last_opened_at: new Date().toISOString(),
              deleted_at: activeProj?.deleted_at || null,
              created_at: activeProj?.created_at || new Date().toISOString(),
              updated_at: activeProj?.updated_at || new Date().toISOString(),
            });
          } else if (activeProj) {
            updateTabProjectInfo(projectId, { ...activeProj, last_opened_at: new Date().toISOString() });
          }
        } catch (metaErr) {
          console.error('[ProjectDbProvider] Failed to fetch project_meta:', metaErr);
          if (activeProj) updateTabProjectInfo(projectId, activeProj);
        }
      } catch (err) {
        console.error('[ProjectDbProvider] Failed to open project DB:', err);
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to open project');
      }
    }

    void open();

    return () => {
      cancelled = true;
      // Don't null out currentProject — tab management handles that
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

  const { isInitialized, isInitializing } = useWorkspaceStore();

  if (!db || isInitializing || !isInitialized) {
    if (fallback !== undefined) {
      return <>{fallback}</>;
    }
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
