import { useNavigate, useParams } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import type { Location } from '@/types/database';
import './LocationCard.css';

interface LocationCardProps { location: Location; }

export function LocationCard({ location }: LocationCardProps) {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <div className="location-card" role="button" tabIndex={0}
      onClick={() => navigate(`/project/${projectId}/locations/${location.id}`)}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/project/${projectId}/locations/${location.id}`)}>
      <div className="location-card__icon"><MapPin size={22} /></div>
      <div className="location-card__info">
        <h3 className="location-card__name">{location.name || 'Unnamed'}</h3>
        {location.type && <span className="location-card__type">{location.type}</span>}
        {location.description && <p className="location-card__desc">{location.description.slice(0, 100)}{location.description.length > 100 ? '…' : ''}</p>}
      </div>
    </div>
  );
}
