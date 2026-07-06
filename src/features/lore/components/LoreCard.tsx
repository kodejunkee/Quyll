import { useNavigate, useParams } from 'react-router-dom';
import { ScrollText } from 'lucide-react';
import type { LoreEntry } from '@/types/database';
import '../../locations/components/LocationCard.css';
export function LoreCard({ lore }: { lore: LoreEntry }) {
  const navigate = useNavigate(); const { projectId } = useParams<{ projectId: string }>();
  return (<div className="location-card" role="button" tabIndex={0} onClick={() => navigate(`/project/${projectId}/lore/${lore.id}`)} onKeyDown={e => e.key === 'Enter' && navigate(`/project/${projectId}/lore/${lore.id}`)}><div className="location-card__icon"><ScrollText size={22} /></div><div className="location-card__info"><h3 className="location-card__name">{lore.title || 'Untitled'}</h3>{lore.category && <span className="location-card__type">{lore.category}</span>}{lore.content && <p className="location-card__desc">{lore.content.slice(0, 100)}{lore.content.length > 100 ? '…' : ''}</p>}</div></div>);
}
