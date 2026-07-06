import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User } from 'lucide-react';
import { useProjectDb } from '@/hooks/useProjectDb';
import { getImageById, getImageUrl } from '@/services/imageService';
import type { Character } from '@/types/database';
import './CharacterCard.css';

interface CharacterCardProps {
  character: Character;
}

export function CharacterCard({ character }: CharacterCardProps) {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { db, projectPath } = useProjectDb();
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  useEffect(() => {
    async function loadImg() {
      if (!character.image_id) {
        setImgUrl(null);
        return;
      }
      const img = await getImageById(db, character.image_id);
      if (img) {
        const url = await getImageUrl(projectPath, img.path);
        setImgUrl(url);
      }
    }
    void loadImg();
  }, [db, projectPath, character.image_id]);

  return (
    <div
      className="character-card"
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/project/${projectId}/characters/${character.id}`)}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/project/${projectId}/characters/${character.id}`)}
    >
      <div className="character-card__image-container">
        {imgUrl ? (
          <img src={imgUrl} alt={character.name} className="character-card__image" loading="lazy" />
        ) : (
          <div className="character-card__image-placeholder">
            <User size={32} />
          </div>
        )}
      </div>
      <div className="character-card__info">
        <div className="character-card__header">
          <h3 className="character-card__name">{character.name || 'Unnamed'}</h3>
          <span className={`character-card__status character-card__status--${character.status.toLowerCase()}`}>
            {character.status}
          </span>
        </div>
        
        <div className="character-card__details">
          {character.aliases && (
            <div className="character-card__detail-row">
              <span className="character-card__detail-label">Aliases:</span>
              <span className="character-card__detail-value">{character.aliases}</span>
            </div>
          )}
          {character.age != null && (
            <div className="character-card__detail-row">
              <span className="character-card__detail-label">Age:</span>
              <span className="character-card__detail-value">{character.age}</span>
            </div>
          )}
          {character.gender && (
            <div className="character-card__detail-row">
              <span className="character-card__detail-label">Gender:</span>
              <span className="character-card__detail-value">{character.gender}</span>
            </div>
          )}
          {character.occupation && (
            <div className="character-card__detail-row">
              <span className="character-card__detail-label">Occupation:</span>
              <span className="character-card__detail-value">{character.occupation}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
