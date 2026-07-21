import { useParams, useNavigate } from 'react-router-dom';
import { CharacterDetailCard } from '../components/CharacterDetailCard';
import './CharacterDetailPage.css';

export default function CharacterDetailPage() {
  const { projectId, entityId } = useParams<{ projectId: string; entityId: string }>();
  const navigate = useNavigate();

  if (!entityId) {
    return <div className="p-8 text-center text-text-tertiary">No character ID provided.</div>;
  }

  return (
    <div className="character-detail-page-container">
      <CharacterDetailCard
        characterId={entityId}
        showBackButton
        onNavigateBack={() => navigate(`/project/${projectId}/characters`)}
      />
    </div>
  );
}
