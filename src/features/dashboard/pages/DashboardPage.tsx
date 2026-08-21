import { useEffect, useCallback, useState, type ElementType } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectDb } from '@/hooks/useProjectDb';
import { select } from '@/database/databaseService';
import { useDashboardStore } from '@/store/dashboardStore';
import { useProjectStore } from '@/store/projectStore';
import { ExportDialog } from '@/features/settings';
import { Button } from '@/components';
import {
  ArrowRight, Users, MapPin, Building2, Bug, Sword,
  Globe, ScrollText, Clock, GitBranch, Type, Download, Image as ImageIcon,
  BookMarked
} from 'lucide-react';
import { ReaderIcon } from '@radix-ui/react-icons';
import { formatNumber, formatReadingTime, formatTimeAgo } from '@/features/chapters/utils/writingStats';
import './DashboardPage.css';
import '@/styles/redesign.css';

// Import banners
import bannerFantasy from '@/assets/images/project-banners/fantasy.png';
import bannerSciFi from '@/assets/images/project-banners/science.png';
import bannerMystery from '@/assets/images/project-banners/mystery.png';
import bannerRomance from '@/assets/images/project-banners/romance.png';
import bannerDarkFantasy from '@/assets/images/project-banners/dark-fantasy.png';
import bannerFolklore from '@/assets/images/project-banners/folklore.png';
import bannerAdventure from '@/assets/images/project-banners/adventure.png';
import bannerHighFantasy from '@/assets/images/project-banners/high-fantasy.png';
import bannerMagic from '@/assets/images/project-banners/magic.png';
import bannerMythology from '@/assets/images/project-banners/mythology.png';
import bannerCyberpunk from '@/assets/images/project-banners/cyberpunk.png';

const BANNER_MAP: Record<string, string> = {
  'fantasy': bannerFantasy,
  'science fiction': bannerSciFi,
  'sci-fi': bannerSciFi,
  'mystery': bannerMystery,
  'romance': bannerRomance,
  'dark fantasy': bannerDarkFantasy,
  'horror': bannerDarkFantasy,
  'historical': bannerFolklore,
  'adventure': bannerAdventure,
  'thriller': bannerMystery,
  'contemporary': bannerMagic,
  'dystopian': bannerCyberpunk,
  'cyberpunk': bannerCyberpunk,
  'folklore': bannerFolklore,
  'high fantasy': bannerHighFantasy,
  'magic': bannerMagic,
  'mythology': bannerMythology
};
const DEFAULT_BANNERS = Object.values(BANNER_MAP);

function getBannerForProject(genres?: string[], projectId?: string) {
  if (genres && genres.length > 0 && genres[0]) {
    const firstGenre = genres[0].toLowerCase();
    for (const [key, banner] of Object.entries(BANNER_MAP)) {
      if (firstGenre.includes(key)) return banner;
    }
  }
  // Deterministic fallback based on project ID
  if (projectId) {
    const sum = projectId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return DEFAULT_BANNERS[sum % DEFAULT_BANNERS.length];
  }
  return bannerAdventure;
}

interface StatConfig { label: string; table: string; path: string; icon: ElementType; colorKey: string }
interface LatestChapter { id: string; title: string; chapter_number: number; word_count: number; updated_at: string }

const STAT_CONFIGS: StatConfig[] = [
  { label: 'Chapters', table: 'chapters', path: 'chapters', icon: ReaderIcon, colorKey: 'chapters' },
  { label: 'Characters', table: 'characters', path: 'characters', icon: Users, colorKey: 'character' },
  { label: 'Locations', table: 'locations', path: 'locations', icon: MapPin, colorKey: 'location' },
  { label: 'Organizations', table: 'organizations', path: 'organizations', icon: Building2, colorKey: 'organization' },
  { label: 'Species', table: 'species', path: 'species', icon: Bug, colorKey: 'species' },
  { label: 'Items', table: 'items', path: 'items', icon: Sword, colorKey: 'item' },
  { label: 'World Systems', table: 'world_systems', path: 'world-systems', icon: Globe, colorKey: 'world_system' },
  { label: 'Lore Entries', table: 'lore', path: 'lore', icon: ScrollText, colorKey: 'lore' },
  { label: 'Timeline Events', table: 'outlines', path: 'outliner', icon: Clock, colorKey: 'outline' },
  { label: 'Plot Points', table: 'plot_points', path: 'plot-planner', icon: GitBranch, colorKey: 'plot_planner' },
];

export default function DashboardPage() {
  const { db, projectId } = useProjectDb();
  const navigate = useNavigate();
  const { setDashboardData, getDashboardData } = useDashboardStore();
  const { currentProject } = useProjectStore();
  const [isExportOpen, setIsExportOpen] = useState(false);

  const cached = getDashboardData(projectId);
  const [counts, setCounts] = useState<Record<string, number>>(cached?.counts ?? {});
  const [latestChapter, setLatestChapter] = useState<LatestChapter | null>(cached?.latestChapter ?? null);
  const [writingStats, setWritingStats] = useState(cached?.writingStats ?? { totalWords: 0, totalReadingTime: 0 });
  const [hasLoaded, setHasLoaded] = useState(!!cached);

  const loadDashboard = useCallback(async () => {
    const results: Record<string, number> = {};
    let totalWords = 0;
    let totalReadingTime = 0;

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

    setCounts(results);
    setLatestChapter(freshLatest);
    setWritingStats(freshWritingStats);
    setHasLoaded(true);

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
  const activeBanner = getBannerForProject(currentProject?.genre, projectId);
  const authorName = currentProject?.author || '';

  if (!hasLoaded) return null;

  return (
    <div className="dashboard-page">
      <div 
        className="dashboard-banner" 
        style={{ backgroundImage: `url(${activeBanner})` }}
      >
        <div className="dashboard-banner__content">
          <div className="dashboard-banner__text">
            <span className="dashboard-banner__welcome">
              Welcome back{authorName ? ', ' : ''}<strong>{authorName}</strong> 👋
            </span>
            <h1 className="dashboard-banner__title">{currentProject?.name ?? 'Untitled Project'}</h1>
            <p className="dashboard-banner__subtitle">Keep your story moving and your world within reach.</p>
          </div>
          <div className="dashboard-banner__actions">
            <Button 
              variant="secondary"
              onClick={() => setIsExportOpen(true)}
              icon={<Download size={16} />}
              style={{ background: 'var(--color-bg-elevated)', backdropFilter: 'blur(8px)' }}
            >
              Export Project
            </Button>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <section className="dashboard-overview">
          <div className="dashboard-overview__cover-wrapper">
            <div className="book-cover book-cover--empty">
              {currentProject?.cover_image ? (
                <img src={currentProject.cover_image} alt="Project Cover" className="dashboard-overview__cover-image" />
              ) : (
                <div className="book-cover__placeholder">
                  <div className="book-cover__spine"></div>
                  <BookMarked size={32} className="book-cover__placeholder-icon" />
                </div>
              )}
            </div>
            <button className="dashboard-overview__cover-edit-btn" title="Change cover">
              <ImageIcon size={14} />
            </button>
          </div>

          <div className="dashboard-overview__info">
            <span className="dashboard-overview__eyebrow">Project Overview</span>
            <h2 className="dashboard-overview__title">{currentProject?.name ?? 'Untitled Project'}</h2>
            <p className="dashboard-overview__desc">
              {currentProject?.description || 'No description provided for this project. Update it in your project settings to give a clear overview of your story.'}
            </p>
            <div className="dashboard-overview__meta">
              {currentProject?.author && (
                <span className="dashboard-overview__meta-item">
                  Author: <strong>{currentProject.author}</strong>
                </span>
              )}
              {currentProject?.genre && currentProject.genre.length > 0 && (
                <span className="dashboard-overview__meta-item">
                  Genre: <strong>{currentProject.genre.join(', ')}</strong>
                </span>
              )}
            </div>
          </div>

          <button 
            className="dashboard-overview__cta"
            onClick={() => open(latestChapter ? `chapters/${latestChapter.id}` : 'chapters')}
          >
            <div className="dashboard-overview__cta-icon-wrap">
              <ReaderIcon width={18} height={18} color="var(--color-primary-text, white)" />
            </div>
            <div className="dashboard-overview__cta-content">
              <span className="dashboard-overview__cta-title">
                {latestChapter ? 'Continue writing' : 'Start writing'}
              </span>
              <p className="dashboard-overview__cta-desc">
                {latestChapter ? latestChapter.title : 'Create your first chapter and bring your story to life.'}
              </p>
            </div>
            <ArrowRight size={16} className="dashboard-overview__cta-arrow" />
          </button>
        </section>

        <div className="dashboard-split">
          <section className="dashboard-panel">
            <div className="dashboard-section__header">
              <h3 className="dashboard-section__title">Writing Progress</h3>
              <p className="dashboard-section__desc">A quiet snapshot of your manuscript.</p>
            </div>
            <div className="dashboard-progress">
              <div className="dashboard-progress__card dashboard-progress__card--words">
                <div className="dashboard-progress__icon"><Type size={18} /></div>
                <div className="dashboard-progress__stats">
                  <span className="dashboard-progress__value">{formatNumber(writingStats.totalWords)}</span>
                  <span className="dashboard-progress__label">Total words</span>
                </div>
              </div>
              <div className="dashboard-progress__card dashboard-progress__card--time">
                <div className="dashboard-progress__icon"><Clock size={18} /></div>
                <div className="dashboard-progress__stats">
                  <span className="dashboard-progress__value">{formatReadingTime(writingStats.totalReadingTime)}</span>
                  <span className="dashboard-progress__label">Reading time</span>
                </div>
              </div>
              <div className="dashboard-progress__card dashboard-progress__card--chapters">
                <div className="dashboard-progress__icon"><ReaderIcon width={18} height={18} /></div>
                <div className="dashboard-progress__stats">
                  <span className="dashboard-progress__value">{counts.chapters ?? 0}</span>
                  <span className="dashboard-progress__label">Chapters</span>
                </div>
              </div>
              <div className="dashboard-progress__card dashboard-progress__card--entries">
                <div className="dashboard-progress__icon"><GitBranch size={18} /></div>
                <div className="dashboard-progress__stats">
                  <span className="dashboard-progress__value">{totalWorldEntries}</span>
                  <span className="dashboard-progress__label">World entries</span>
                </div>
              </div>
            </div>
          </section>

          <section className="dashboard-panel">
            <div className="dashboard-section__header">
              <h3 className="dashboard-section__title">Recent Activity</h3>
              <p className="dashboard-section__desc">Pick up where you last left off.</p>
            </div>
            <div className="dashboard-activity">
              {latestChapter ? (
                <button className="dashboard-activity__item" onClick={() => open(`chapters/${latestChapter.id}`)}>
                  <ReaderIcon width={18} height={18} className="dashboard-activity__item-icon" />
                  <div className="dashboard-activity__item-text">
                    <span className="dashboard-activity__item-title">{latestChapter.title}</span>
                    <span className="dashboard-activity__item-date">Edited {formatTimeAgo(latestChapter.updated_at)}</span>
                  </div>
                  <ArrowRight size={14} className="dashboard-activity__item-arrow" />
                </button>
              ) : (
                <div className="dashboard-activity__empty">
                  <ReaderIcon width={24} height={24} className="dashboard-activity__empty-icon" />
                  <h4 className="dashboard-activity__empty-title">Nothing here yet</h4>
                  <p className="dashboard-activity__empty-desc">Your recent activity will appear here once you start writing.</p>
                  <div className="dashboard-activity__actions">
                    <button className="dashboard-activity__btn" onClick={() => open('chapters')}><ReaderIcon width={14} height={14} /> Chapter</button>
                    <button className="dashboard-activity__btn" onClick={() => open('characters')}><Users size={14} /> Character</button>
                    <button className="dashboard-activity__btn" onClick={() => open('locations')}><MapPin size={14} /> Location</button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="dashboard-panel dashboard-world">
          <div className="dashboard-section__header">
            <h3 className="dashboard-section__title">World Overview</h3>
            <p className="dashboard-section__desc">The people, places and systems behind your story.</p>
          </div>
          <div className="dashboard-world__grid">
            {STAT_CONFIGS.map(({ label, table, path, icon: Icon, colorKey }) => (
              <button 
                key={table} 
                className="dashboard-world__item" 
                onClick={() => open(path)} 
                style={{ '--item-color': `var(--color-icon-${colorKey})` } as React.CSSProperties}
              >
                <div className="dashboard-world__icon"><Icon size={16} /></div>
                <div className="dashboard-world__text">
                  <span className="dashboard-world__count">{counts[table] ?? 0}</span>
                  <span className="dashboard-world__label">{label}</span>
                </div>
                <ArrowRight size={14} className="dashboard-world__arrow" />
              </button>
            ))}
          </div>
        </section>
      </div>

      <ExportDialog isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
    </div>
  );
}
