import { StickyNote } from 'lucide-react';
import type { Outline } from '@/types/database';
import '../../locations/components/LocationCard.css';

interface OutlineCardProps {
  outline: Outline;
  onClick: (outline: Outline) => void;
}

export function OutlineCard({ outline, onClick }: OutlineCardProps) {
  return (
    <div 
      className="location-card" 
      role="button" 
      tabIndex={0} 
      onClick={() => onClick(outline)} 
      onKeyDown={e => e.key === 'Enter' && onClick(outline)}
    >
      <div className="location-card__icon" style={{ color: 'var(--color-icon-outline)' }}>
        <StickyNote size={22} />
      </div>
      <div className="location-card__info">
        <h3 className="location-card__name">{outline.title || 'Untitled'}</h3>
        <span className="location-card__type">{outline.category || 'Note'}</span>
        {outline.description && (
          <p className="location-card__desc">
            {outline.description.slice(0, 100)}{outline.description.length > 100 ? '...' : ''}
          </p>
        )}
      </div>
    </div>
  );
}
