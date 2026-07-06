import { useNavigate, useParams } from 'react-router-dom';
import { Bug } from 'lucide-react';
import type { Species } from '@/types/database';
import '../../locations/components/LocationCard.css';
export function SpeciesCard({ species }: { species: Species }) {
  const navigate = useNavigate(); const { projectId } = useParams<{ projectId: string }>();
  return (<div className="location-card" role="button" tabIndex={0} onClick={() => navigate(`/project/${projectId}/species/${species.id}`)} onKeyDown={e => e.key === 'Enter' && navigate(`/project/${projectId}/species/${species.id}`)}><div className="location-card__icon"><Bug size={22} /></div><div className="location-card__info"><h3 className="location-card__name">{species.name || 'Unnamed'}</h3>{species.habitat && <span className="location-card__type">{species.habitat}</span>}</div></div>);
}
