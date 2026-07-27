import { useEffect, useCallback, useState, type ElementType } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectDb } from '@/hooks/useProjectDb';
import { select } from '@/database/databaseService';
import { useDashboardStore } from '@/store/dashboardStore';
import { useProjectStore } from '@/store/projectStore';
import { ExportDialog } from '@/features/settings';
import { Button } from '@/components';
import {
  ArrowRight, BookOpen, Users, MapPin, Building2, Bug, Sword,
  Globe, ScrollText, Clock, GitBranch, Type, PenLine, Plus, Download,
} from 'lucide-react';
import { formatNumber, formatReadingTime, formatTimeAgo } from '@/features/chapters/utils/writingStats';
import './DashboardPage.css';
import '@/styles/redesign.css';

interface StatConfig { label: string; table: string; path: string; icon: ElementType; colorKey: string }
interface LatestChapter { id: string; title: string; chapter_number: number; word_count: number; updated_at: string }

const STAT_CONFIGS: StatConfig[] = [
  { label: 'Chapters', table: 'chapters', path: 'chapters', icon: BookOpen, colorKey: 'chapters' },
  { label: 'Characters', table: 'characters', path: 'characters', icon: Users, colorKey: 'character' },
  { label: 'Locations', table: 'locations', path: 'locations', icon: MapPin, colorKey: 'location' },
  { label: 'Organizations', table: 'organizations', path: 'organizations', icon: Building2, colorKey: 'organization' },
  { label: 'Species', table: 'species', path: 'species', icon: Bug, colorKey: 'species' },
  { label: 'Items', table: 'items', path: 'items', icon: Sword, colorKey: 'item' },
  { label: 'World Systems', table: 'world_systems', path: 'world-systems', icon: Globe, colorKey: 'world_system' },
  { label: 'Lore Entries', table: 'lore', path: 'lore', icon: ScrollText, colorKey: 'lore' },
  { label: 'Timeline Events', table: 'timeline_events', path: 'timeline', icon: Clock, colorKey: 'timeline_event' },
  { label: 'Plot Points', table: 'plot_points', path: 'plot-planner', icon: GitBranch, colorKey: 'plot_planner' },
];

export default function DashboardPage() {
  const { db, projectId } = useProjectDb();
  const navigate = useNavigate();
  const { setDashboardData, getDashboardData } = useDashboardStore();
  const { currentProject } = useProjectStore();
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Initialize from cache (if available), otherwise use sensible defaults
  const cached = getDashboardData(projectId);
  const [counts, setCounts] = useState<Record<string, number>>(cached?.counts ?? {});
  const [latestChapter, setLatestChapter] = useState<LatestChapter | null>(cached?.latestChapter ?? null);
  const [writingStats, setWritingStats] = useState(cached?.writingStats ?? { totalWords: 0, totalReadingTime: 0 });
  
  // Track whether data has ever been loaded (from cache or fresh)
  const [hasLoaded, setHasLoaded] = useState(!!cached);

  const loadDashboard = useCallback(async () => {
    const results: Record<string, number> = {};
    let totalWords = 0;
    let totalReadingTime = 0;

    // Run all stats queries concurrently
    const promises = STAT_CONFIGS.map(async ({ table }) => {
      try {
        if (table === 'chapters') {
          const rows = await select<{ cnt: number; words: number; time: number }>(
            db,
            `SELECT COUNT(*) as cnt, COALESCE(SUM(word_count), 0) as words, COALESCE(SUM(reading_time), 0) as time FROM chapters WHERE project_id = $1 AND deleted_at IS NULL`,
            [projectId]
          );
          results[table] = rows[0]?.cnt ?? 0;
          totalWords = rows[0]?.words ?? 0;
          totalReadingTime = rows[0]?.time ?? 0;
        } else {
          const rows = await select<{ cnt: number }>(
            db,
            `SELECT COUNT(*) as cnt FROM ${table} WHERE project_id = $1 AND deleted_at IS NULL`,
            [projectId]
          );
          results[table] = rows[0]?.cnt ?? 0;
        }
      } catch {
        results[table] = 0;
      }
    });

    // Get latest chapter concurrently
    let freshLatest: LatestChapter | null = null;
    const latestChapterPromise = select<LatestChapter>(
      db,
      `SELECT id, title, chapter_number, word_count, updated_at FROM chapters WHERE project_id = $1 AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT 1`,
      [projectId]
    )
      .then((chapters) => { freshLatest = chapters[0] ?? null; })
      .catch(() => { freshLatest = null; });

    await Promise.all([...promises, latestChapterPromise]);

    const freshWritingStats = { totalWords, totalReadingTime };

    // Update local state
    setCounts(results);
    setLatestChapter(freshLatest);
    setWritingStats(freshWritingStats);
    setHasLoaded(true);

    // Persist to the global store so next navigation is instant
    setDashboardData(projectId, {
      counts: results,
      latestChapter: freshLatest,
      writingStats: freshWritingStats,
    });
  }, [db, projectId, setDashboardData]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const open = (path: string) => navigate(`/project/${projectId}/${path}`);
  const totalWorldEntries = Object.entries(counts).filter(([table]) => table !== 'chapters').reduce((sum, [, count]) => sum + count, 0);

  // If we have no cached data and haven't loaded yet, show nothing to avoid the flash
  if (!hasLoaded) {
    return null;
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-page__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span className="page-eyebrow">Writing workspace</span>
          <h1 className="dashboard-page__title">Dashboard</h1>
          <p className="dashboard-page__subtitle">Keep your story moving and your world within reach.</p>
        </div>
        <Button 
          variant="secondary"
          onClick={() => setIsExportOpen(true)}
          icon={<Download size={16} />}
        >
          Export Project
        </Button>
      </header>

      <section className="dashboard-page__continue" style={{ alignItems: 'flex-start' }}>
        <div className="dashboard-page__continue-icon" style={{ marginTop: '2px' }}><PenLine size={21} /></div>
        <div className="dashboard-page__continue-copy">
          <span className="page-eyebrow">Project Overview</span>
          <h2>{currentProject?.name ?? 'Untitled Project'}</h2>
          
          <p style={{ marginTop: '8px', color: 'var(--color-text-secondary)', maxWidth: '600px', lineHeight: '1.5' }}>
            {currentProject?.description || 'No description provided for this project.'}
          </p>

          <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>
            {currentProject?.author && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ opacity: 0.7 }}>Author:</span> <strong style={{ color: 'var(--color-text-primary)' }}>{currentProject.author}</strong>
              </span>
            )}
            {currentProject?.genre && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ opacity: 0.7 }}>Genre:</span> <strong style={{ color: 'var(--color-text-primary)' }}>{currentProject.genre}</strong>
              </span>
            )}
          </div>
        </div>
        <button 
          className="dashboard-page__primary-action" 
          onClick={() => open(latestChapter ? `chapters/${latestChapter.id}` : 'chapters')}
          style={{ alignSelf: 'center' }}
        >
          {latestChapter ? 'Continue writing' : 'Create first chapter'} {latestChapter ? <ArrowRight size={16} /> : <Plus size={16} />}
        </button>
      </section>

      <section className="dashboard-page__progress-section">
        <div className="dashboard-page__section-heading"><div><h2>Writing progress</h2><p>A quiet snapshot of your manuscript.</p></div></div>
        <div className="dashboard-page__progress">
          <div><Type size={17} /><strong>{formatNumber(writingStats.totalWords)}</strong><span>Total words</span></div>
          <div><Clock size={17} /><strong>{formatReadingTime(writingStats.totalReadingTime)}</strong><span>Reading time</span></div>
          <div><BookOpen size={17} /><strong>{counts.chapters ?? 0}</strong><span>Chapters</span></div>
          <div><GitBranch size={17} /><strong>{totalWorldEntries}</strong><span>World entries</span></div>
        </div>
      </section>

      <section className="dashboard-page__world">
        <div className="dashboard-page__section-heading"><div><h2>World overview</h2><p>The people, places and systems behind your story.</p></div></div>
        <div className="dashboard-page__overview-grid">
          {STAT_CONFIGS.map(({ label, table, path, icon: Icon, colorKey }) => (
            <button key={table} className="dashboard-page__overview-item" onClick={() => open(path)} style={{ '--item-color': `var(--color-icon-${colorKey})` } as React.CSSProperties}>
              <span className="dashboard-page__overview-icon"><Icon size={18} /></span>
              <span><strong>{counts[table] ?? 0}</strong><small>{label}</small></span><ArrowRight size={14} />
            </button>
          ))}
        </div>
      </section>

      <section className="dashboard-page__recent">
        <div className="dashboard-page__section-heading"><div><h2>Recent activity</h2><p>{latestChapter ? 'Pick up where you last left off.' : 'Useful places to begin building your project.'}</p></div></div>
        {latestChapter ? (
          <button className="dashboard-page__activity-item" onClick={() => open(`chapters/${latestChapter.id}`)}><BookOpen size={18} /><span><strong>{latestChapter.title}</strong><small>Chapter edited {formatTimeAgo(latestChapter.updated_at)}</small></span><ArrowRight size={15} /></button>
        ) : (
          <div className="dashboard-page__onboarding"><button onClick={() => open('chapters')}><Plus size={15} /> Create a chapter</button><button onClick={() => open('characters')}><Plus size={15} /> Add a character</button><button onClick={() => open('locations')}><Plus size={15} /> Add a location</button></div>
        )}
      </section>

      <ExportDialog isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
    </div>
  );
}
