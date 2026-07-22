import { useNavigate, useParams } from 'react-router-dom';
import { Globe } from 'lucide-react';
import type { WorldSystem } from '@/types/database';
import '../../locations/components/LocationCard.css';
export function WorldSystemCard({ worldSystem }: { worldSystem: WorldSystem }) {
  const navigate = useNavigate(); const { projectId } = useParams<{ projectId: string }>();
  return (<div className="location-card" role="button" tabIndex={0} onClick={() => navigate(`/project/${projectId}/world-systems/${worldSystem.id}`)} onKeyDown={e => e.key === 'Enter' && navigate(`/project/${projectId}/world-systems/${worldSystem.id}`)}><div className="location-card__icon"><Globe size={22} /></div><div className="location-card__info"><h3 className="location-card__name">{worldSystem.name || 'Unnamed'}</h3>{worldSystem.description && <p className="location-card__desc">{worldSystem.description.slice(0, 100)}{worldSystem.description.length > 100 ? '…' : ''}</p>}</div></div>);
}
