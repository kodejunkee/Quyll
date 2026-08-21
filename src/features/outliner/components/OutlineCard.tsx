import { Link, useParams } from 'react-router-dom';
import { StickyNote } from 'lucide-react';
import type { Outline } from '@/types/database';

interface OutlineCardProps {
  outline: Outline;
}

export function OutlineCard({ outline }: OutlineCardProps) {
  const { projectId } = useParams();
  
  return (
    <Link to={`/project/${projectId}/outliner/${outline.id}`} className="lore-card">
      <div className="lore-card__header">
        <StickyNote size={16} className="lore-card__icon" />
        <h3 className="lore-card__title">{outline.title}</h3>
      </div>
      <div className="lore-card__meta">
        <span className="lore-card__category">{outline.category || 'Note'}</span>
      </div>
      {outline.description && (
        <p className="lore-card__preview">
          {outline.description.length > 100 ? outline.description.substring(0, 100) + '...' : outline.description}
        </p>
      )}
    </Link>
  );
}
