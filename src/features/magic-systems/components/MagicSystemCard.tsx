import { useNavigate, useParams } from 'react-router-dom';
import { Wand2 } from 'lucide-react';
import type { MagicSystem } from '@/types/database';
import '../../locations/components/LocationCard.css';
export function MagicSystemCard({ magicSystem }: { magicSystem: MagicSystem }) {
  const navigate = useNavigate(); const { projectId } = useParams<{ projectId: string }>();
  return (<div className="location-card" role="button" tabIndex={0} onClick={() => navigate(`/project/${projectId}/magic-systems/${magicSystem.id}`)} onKeyDown={e => e.key === 'Enter' && navigate(`/project/${projectId}/magic-systems/${magicSystem.id}`)}><div className="location-card__icon"><Wand2 size={22} /></div><div className="location-card__info"><h3 className="location-card__name">{magicSystem.name || 'Unnamed'}</h3>{magicSystem.description && <p className="location-card__desc">{magicSystem.description.slice(0, 100)}{magicSystem.description.length > 100 ? '…' : ''}</p>}</div></div>);
}
