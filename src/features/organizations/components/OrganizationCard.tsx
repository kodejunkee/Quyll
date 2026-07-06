import { useNavigate, useParams } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import type { Organization } from '@/types/database';
import './OrganizationCard.css';
interface Props { organization: Organization; }
export function OrganizationCard({ organization }: Props) {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  return (
    <div className="org-card" role="button" tabIndex={0} onClick={() => navigate(`/project/${projectId}/organizations/${organization.id}`)} onKeyDown={e => e.key === 'Enter' && navigate(`/project/${projectId}/organizations/${organization.id}`)}>
      <div className="org-card__icon"><Building2 size={22} /></div>
      <div className="org-card__info">
        <h3 className="org-card__name">{organization.name || 'Unnamed'}</h3>
        {organization.type && <span className="org-card__type">{organization.type}</span>}
        {organization.leader && <p className="org-card__leader">Led by {organization.leader}</p>}
      </div>
    </div>
  );
}
