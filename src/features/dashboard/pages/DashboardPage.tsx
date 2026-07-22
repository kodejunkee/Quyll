import { useEffect, useState, type ElementType } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectDb } from '@/hooks/useProjectDb';
import { select } from '@/database/databaseService';
import { ExportDialog } from '@/features/settings';
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
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [latestChapter, setLatestChapter] = useState<LatestChapter | null>(null);
  const [writingStats, setWritingStats] = useState({ totalWords: 0, totalReadingTime: 0 });
  const [isExportOpen, setIsExportOpen] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      const results: Record<string, number> = {};
      let totalWords = 0;
      let totalReadingTime = 0;
      for (const { table } of STAT_CONFIGS) {
        try {
          if (table === 'chapters') {
            const rows = await select<{ cnt: number; words: number; time: number }>(db,
              `SELECT COUNT(*) as cnt, COALESCE(SUM(word_count), 0) as words, COALESCE(SUM(reading_time), 0) as time FROM chapters WHERE project_id = $1 AND deleted_at IS NULL`, [projectId]);
            results[table] = rows[0]?.cnt ?? 0;
            totalWords = rows[0]?.words ?? 0;
            totalReadingTime = rows[0]?.time ?? 0;
          } else {
            const rows = await select<{ cnt: number }>(db,
              `SELECT COUNT(*) as cnt FROM ${table} WHERE project_id = $1 AND deleted_at IS NULL`, [projectId]);
            results[table] = rows[0]?.cnt ?? 0;
          }
        } catch { results[table] = 0; }
      }
      try {
        const chapters = await select<LatestChapter>(db,
          `SELECT id, title, chapter_number, word_count, updated_at FROM chapters WHERE project_id = $1 AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT 1`, [projectId]);
        setLatestChapter(chapters[0] ?? null);
      } catch { setLatestChapter(null); }
      setCounts(results);
      setWritingStats({ totalWords, totalReadingTime });
    }
    void loadDashboard();
  }, [db, projectId]);

  const open = (path: string) => navigate(`/project/${projectId}/${path}`);
  const totalWorldEntries = Object.entries(counts).filter(([table]) => table !== 'chapters').reduce((sum, [, count]) => sum + count, 0);

  return (
    <div className="dashboard-page">
      <header className="dashboard-page__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span className="page-eyebrow">Writing workspace</span>
          <h1 className="dashboard-page__title">Dashboard</h1>
          <p className="dashboard-page__subtitle">Keep your story moving and your world within reach.</p>
        </div>
        <button 
          onClick={() => setIsExportOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
            background: 'var(--color-surface-2)', color: 'var(--color-text-primary)',
            padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)',
            fontWeight: 500, cursor: 'pointer', transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-3)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
        >
          <Download size={16} />
          Export Project
        </button>
      </header>

      <section className="dashboard-page__continue">
        <div className="dashboard-page__continue-icon"><PenLine size={21} /></div>
        <div className="dashboard-page__continue-copy">
          <span className="page-eyebrow">Continue writing</span>
          <h2>{latestChapter?.title ?? 'Start your story'}</h2>
          {latestChapter ? (
            <p>Chapter {String(latestChapter.chapter_number).padStart(2, '0')} · Draft · {formatNumber(latestChapter.word_count)} words · Edited {formatTimeAgo(latestChapter.updated_at)}</p>
          ) : <p>Create your first chapter and give your story somewhere to begin.</p>}
        </div>
        <button className="dashboard-page__primary-action" onClick={() => open(latestChapter ? `chapters/${latestChapter.id}` : 'chapters')}>
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
