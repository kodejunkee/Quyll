import { useState, useEffect } from 'react';
import { Card } from '@/components';
import { useProjectDb } from '@/hooks/useProjectDb';
import { select } from '@/database/databaseService';
import {
  BookOpen, Users, MapPin, Building2, Bug, Sword,
  Wand2, ScrollText, Clock, GitBranch, Type
} from 'lucide-react';
import { formatNumber, formatReadingTime } from '@/features/chapters/utils/writingStats';
import type { ElementType } from 'react';
import './DashboardPage.css';

interface StatConfig {
  label: string;
  table: string;
  icon: ElementType;
}

const STAT_CONFIGS: StatConfig[] = [
  { label: 'Chapters', table: 'chapters', icon: BookOpen },
  { label: 'Characters', table: 'characters', icon: Users },
  { label: 'Locations', table: 'locations', icon: MapPin },
  { label: 'Organizations', table: 'organizations', icon: Building2 },
  { label: 'Species', table: 'species', icon: Bug },
  { label: 'Items', table: 'items', icon: Sword },
  { label: 'Magic Systems', table: 'magic_systems', icon: Wand2 },
  { label: 'Lore Entries', table: 'lore', icon: ScrollText },
  { label: 'Timeline Events', table: 'timeline_events', icon: Clock },
  { label: 'Plot Points', table: 'plot_points', icon: GitBranch },
];

export default function DashboardPage() {
  const { db, projectId } = useProjectDb();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [writingStats, setWritingStats] = useState({ totalWords: 0, totalReadingTime: 0 });

  useEffect(() => {
    async function loadCounts() {
      const results: Record<string, number> = {};
      let totalWords = 0;
      let totalReadingTime = 0;

      for (const { table } of STAT_CONFIGS) {
        try {
          if (table === 'chapters') {
            const rows = await select<{ cnt: number; words: number; time: number }>(
              db,
              `SELECT COUNT(*) as cnt, SUM(word_count) as words, SUM(reading_time) as time FROM chapters WHERE project_id = $1 AND deleted_at IS NULL`,
              [projectId],
            );
            results[table] = rows[0]?.cnt ?? 0;
            totalWords = rows[0]?.words ?? 0;
            totalReadingTime = rows[0]?.time ?? 0;
          } else {
            const rows = await select<{ cnt: number }>(
              db,
              `SELECT COUNT(*) as cnt FROM ${table} WHERE project_id = $1 AND deleted_at IS NULL`,
              [projectId],
            );
            results[table] = rows[0]?.cnt ?? 0;
          }
        } catch {
          results[table] = 0;
        }
      }
      setCounts(results);
      setWritingStats({ totalWords, totalReadingTime });
    }
    void loadCounts();
  }, [db, projectId]);

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  return (
    <div className="dashboard-page">
      <header className="dashboard-page__header">
        <h1 className="dashboard-page__title">Dashboard</h1>
        <p className="dashboard-page__subtitle">
          {total} total entries across your world
        </p>
      </header>

      <section className="dashboard-page__writing-stats">
        <Card className="dashboard-page__writing-stat-card">
          <div className="dashboard-page__stat">
            <Type size={20} className="dashboard-page__stat-icon" style={{ color: 'var(--color-primary)' }} />
            <div>
              <div className="dashboard-page__stat-value" style={{ color: 'var(--color-primary)' }}>
                {formatNumber(writingStats.totalWords)}
              </div>
              <div className="dashboard-page__stat-label">Total Words</div>
            </div>
          </div>
        </Card>
        <Card className="dashboard-page__writing-stat-card">
          <div className="dashboard-page__stat">
            <Clock size={20} className="dashboard-page__stat-icon" style={{ color: 'var(--color-success)' }} />
            <div>
              <div className="dashboard-page__stat-value" style={{ color: 'var(--color-success)' }}>
                {formatReadingTime(writingStats.totalReadingTime)}
              </div>
              <div className="dashboard-page__stat-label">Reading Time</div>
            </div>
          </div>
        </Card>
      </section>

      <h2 className="dashboard-page__section-title">World Building</h2>
      <div className="dashboard-page__stats">
        {STAT_CONFIGS.map(({ label, table, icon: Icon }) => (
          <Card key={label} className="dashboard-page__stat-card">
            <div className="dashboard-page__stat">
              <Icon size={20} className="dashboard-page__stat-icon" />
              <div>
                <div className="dashboard-page__stat-value">{counts[table] ?? 0}</div>
                <div className="dashboard-page__stat-label">{label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <section className="dashboard-page__recent">
        <Card title="Recent Activity">
          <p className="dashboard-page__empty-text">
            {total === 0
              ? 'No entries yet. Start by adding chapters, characters, or locations to your world.'
              : `Your world has ${total} entries. Keep building!`
            }
          </p>
        </Card>
      </section>
    </div>
  );
}
