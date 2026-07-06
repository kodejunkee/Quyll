import { useNavigate, useParams } from 'react-router-dom';
import type { PlotPoint } from '@/types/database';
import './PlotPointCard.css';

export function PlotPointCard({ plotPoint }: { plotPoint: PlotPoint }) {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();

  const statusClass = plotPoint.status.toLowerCase().replace(/\s+/g, '-');

  return (
    <div
      className="plot-card"
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/project/${projectId}/plot-planner/${plotPoint.id}`)}
      onKeyDown={e => e.key === 'Enter' && navigate(`/project/${projectId}/plot-planner/${plotPoint.id}`)}
    >
      <div className="plot-card__order">{plotPoint.order_index + 1}</div>
      <div className="plot-card__body">
        <div className="plot-card__top">
          <h3 className="plot-card__title">{plotPoint.title || 'Untitled'}</h3>
          <span className={`plot-card__status plot-card__status--${statusClass}`}>{plotPoint.status}</span>
        </div>
        {plotPoint.arc && <span className="plot-card__arc">{plotPoint.arc}</span>}
        {plotPoint.description && (
          <p className="plot-card__desc">{plotPoint.description.slice(0, 120)}{plotPoint.description.length > 120 ? '…' : ''}</p>
        )}
      </div>
    </div>
  );
}
