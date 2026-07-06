import { useNavigate, useParams } from 'react-router-dom';
import type { TimelineEvent } from '@/types/database';
import './TimelineEventCard.css';

export function TimelineEventCard({ event }: { event: TimelineEvent }) {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <div
      className="timeline-event-card"
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/project/${projectId}/timeline/${event.id}`)}
      onKeyDown={e => e.key === 'Enter' && navigate(`/project/${projectId}/timeline/${event.id}`)}
    >
      <div className="timeline-event-card__marker">
        <div className="timeline-event-card__dot" />
        <div className="timeline-event-card__line" />
      </div>
      <div className="timeline-event-card__content">
        {event.event_date && (
          <span className="timeline-event-card__date">{event.event_date}</span>
        )}
        <h3 className="timeline-event-card__title">{event.title || 'Untitled Event'}</h3>
        {event.description && (
          <p className="timeline-event-card__desc">
            {event.description.slice(0, 150)}{event.description.length > 150 ? '…' : ''}
          </p>
        )}
      </div>
    </div>
  );
}
