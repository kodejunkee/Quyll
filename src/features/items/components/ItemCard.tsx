import { useNavigate, useParams } from 'react-router-dom';
import { Sword } from 'lucide-react';
import type { Item } from '@/types/database';
import '../../locations/components/LocationCard.css';
export function ItemCard({ item }: { item: Item }) {
  const navigate = useNavigate(); const { projectId } = useParams<{ projectId: string }>();
  return (<div className="location-card" role="button" tabIndex={0} onClick={() => navigate(`/project/${projectId}/items/${item.id}`)} onKeyDown={e => e.key === 'Enter' && navigate(`/project/${projectId}/items/${item.id}`)}><div className="location-card__icon"><Sword size={22} /></div><div className="location-card__info"><h3 className="location-card__name">{item.name || 'Unnamed'}</h3>{item.type && <span className="location-card__type">{item.type}</span>}{item.description && <p className="location-card__desc">{item.description.slice(0, 80)}{item.description.length > 80 ? '…' : ''}</p>}</div></div>);
}
