import { useState } from 'react';
import { Clock, Plus } from 'lucide-react';
import { Button, EmptyState, Modal, SearchBar } from '@/components';
import { useTimelineEvents } from '../hooks/useTimelineEvents';
import { TimelineEventCard } from '../components/TimelineEventCard';
import { TimelineEventForm } from '../components/TimelineEventForm';
import { useSearch } from '@/hooks';
import type { TimelineEventFormData } from '../types/timelineEvent';
import './TimelinePage.css';

export default function TimelinePage() {
  const { items, loading, create } = useTimelineEvents();
  const [createOpen, setCreateOpen] = useState(false);
  const { query, setQuery, filterItems } = useSearch();

  const filtered = filterItems(items, e => `${e.title} ${e.description} ${e.event_date}`);
  // Sort chronologically by event_date (string sort — works for consistent date formats)
  const sorted = [...filtered].sort((a, b) => a.event_date.localeCompare(b.event_date));

  async function handleCreate(d: TimelineEventFormData) { await create(d); setCreateOpen(false); }

  return (
    <div className="timeline-page">
      <header className="timeline-page__header">
        <div>
          <h1 className="timeline-page__title">Timeline</h1>
          <p className="timeline-page__count">{items.length} event{items.length !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus size={16} />New Event
        </Button>
      </header>

      <div className="timeline-page__search">
        <SearchBar value={query} onChange={setQuery} placeholder="Search events..." />
      </div>

      {loading ? (
        <div className="timeline-page__loading">Loading...</div>
      ) : sorted.length === 0 ? (
        query ? (
          <EmptyState icon={Clock} title="No matches" description={`No events matching "${query}"`} />
        ) : (
          <EmptyState icon={Clock} title="No timeline events yet" description="Chronicle the key moments in your story's history." actionLabel="Create Event" onAction={() => setCreateOpen(true)} />
        )
      ) : (
        <div className="timeline-page__events">
          {sorted.map(event => (
            <TimelineEventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Timeline Event" size="md">
        <TimelineEventForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} submitLabel="Create" />
      </Modal>
    </div>
  );
}
