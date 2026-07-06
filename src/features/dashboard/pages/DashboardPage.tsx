import { Card } from '@/components';
import { BookOpen, Users, MapPin, Clock } from 'lucide-react';
import './DashboardPage.css';

const STATS = [
  { label: 'Chapters', value: 0, icon: BookOpen },
  { label: 'Characters', value: 0, icon: Users },
  { label: 'Locations', value: 0, icon: MapPin },
  { label: 'Timeline Events', value: 0, icon: Clock },
];

export default function DashboardPage() {
  return (
    <div className="dashboard-page">
      <header className="dashboard-page__header">
        <h1 className="dashboard-page__title">Dashboard</h1>
        <p className="dashboard-page__subtitle">Project overview</p>
      </header>

      <div className="dashboard-page__stats">
        {STATS.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="dashboard-page__stat-card">
            <div className="dashboard-page__stat">
              <Icon size={20} className="dashboard-page__stat-icon" />
              <div>
                <div className="dashboard-page__stat-value">{value}</div>
                <div className="dashboard-page__stat-label">{label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <section className="dashboard-page__recent">
        <Card title="Recent Activity">
          <p className="dashboard-page__empty-text">
            No recent activity yet. Start by creating chapters or adding characters to your world.
          </p>
        </Card>
      </section>
    </div>
  );
}
