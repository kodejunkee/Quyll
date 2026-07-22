import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Edit, Trash2, Upload, X, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal/Modal';
import { Dialog } from '@/components/Dialog/Dialog';
import { CharacterForm } from './CharacterForm';
import { MiniGraphPreview } from './MiniGraphPreview';
import { useProjectDb } from '@/hooks/useProjectDb';
import { characterService } from '../services/characterService';
import { select } from '@/database/databaseService';
import { pickImageFile, uploadImage, removeImage, getImageUrl, getImageById } from '@/services/imageService';
import type { Character } from '@/types/database';
import type { CharacterFormData } from '../types/character';
import './CharacterDetailCard.css';

interface CharacterDetailCardProps {
  characterId: string;
  onClose?: () => void;
  showBackButton?: boolean;
  onNavigateBack?: () => void;
}

interface RelationshipItem {
  id: string;
  name: string;
  relationship: string;
  type: string;
}

interface MentionItem {
  chapterId: string;
  chapterNumber: number;
  title: string;
  lineIndex: number;
}

export function CharacterDetailCard({
  characterId,
  onClose,
  showBackButton = false,
  onNavigateBack,
}: CharacterDetailCardProps) {
  const navigate = useNavigate();
  const { db, projectId, projectPath } = useProjectDb();

  const [character, setCharacter] = useState<Character | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [relationships, setRelationships] = useState<RelationshipItem[]>([]);
  const [mentions, setMentions] = useState<MentionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!db || !projectId || !characterId) return;

    try {
      setLoading(true);
      const row = await characterService.getById(db, characterId);
      setCharacter(row);

      // Load image if present
      if (row?.image_id) {
        const img = await getImageById(db, row.image_id);
        if (img) {
          const url = await getImageUrl(projectPath, img.path);
          setImageUrl(url);
        } else {
          setImageUrl(null);
        }
      } else {
        setImageUrl(null);
      }

      // Load relationships
      if (row) {
        const relQuery = `
          SELECT r.id, r.relationship, r.target_id, r.target_type, r.source_id, r.source_type
          FROM relationships r
          WHERE r.project_id = $1 AND (r.source_id = $2 OR r.target_id = $2)
        `;
        const relRows = await select<any>(db, relQuery, [projectId, characterId]);

        const resolvedRels = await Promise.all(
          relRows.map(async r => {
            const isSource = r.source_id === characterId;
            const otherId = isSource ? r.target_id : r.source_id;
            const otherType = isSource ? r.target_type : r.source_type;

            let table = '';
            switch (otherType) {
              case 'character': table = 'characters'; break;
              case 'location': table = 'locations'; break;
              case 'organization': table = 'organizations'; break;
              case 'species': table = 'species'; break;
              case 'item': table = 'items'; break;
              case 'world_system': table = 'world_systems'; break;
              case 'lore': table = 'lore'; break;
              case 'timeline_event': table = 'timeline_events'; break;
              case 'plot_point': table = 'plot_points'; break;
              case 'chapter': table = 'chapters'; break;
            }

            let name = 'Unknown';
            if (table) {
              const nameCol = table === 'lore' || table === 'timeline_events' || table === 'plot_points' || table === 'chapters' ? 'title' : 'name';
              const res = await select<any>(db, `SELECT ${nameCol} as _name FROM ${table} WHERE id = $1`, [otherId]);
              if (res.length > 0) name = res[0]._name;
            }

            return {
              id: r.id,
              name,
              relationship: r.relationship || (isSource ? 'Connected to' : 'Backlink from'),
              type: otherType,
            };
          })
        );
        setRelationships(resolvedRels);

        // Load Mention References across chapters
        const chapterQuery = `
          SELECT DISTINCT c.id, c.title, c.chapter_number, c.content
          FROM keywords k
          JOIN chapters c ON k.chapter_id = c.id
          WHERE k.project_id = $1 AND k.entity_id = $2 AND c.deleted_at IS NULL
          ORDER BY c.chapter_number ASC
        `;
        const chapRows = await select<any>(db, chapterQuery, [projectId, characterId]);

        const resolvedMentions: MentionItem[] = chapRows.map(c => {
          const content = c.content || '';
          const lines = content.split('\n');
          let lineIdx = 1;

          const namesToFind = [
            row.name,
            ...row.aliases.split(',').map((a: string) => a.trim()).filter(Boolean),
          ];

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].toLowerCase();
            if (namesToFind.some(n => n && line.includes(n.toLowerCase()))) {
              lineIdx = i + 1;
              break;
            }
          }

          return {
            chapterId: c.id,
            chapterNumber: c.chapter_number ?? 0,
            title: c.title || 'Untitled Chapter',
            lineIndex: lineIdx,
          };
        });

        setMentions(resolvedMentions);
      }
    } catch (err) {
      console.error('Failed to load character details for card:', err);
    } finally {
      setLoading(false);
    }
  }, [db, projectId, projectPath, characterId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleToggleKeyword() {
    if (!db || !character || !characterId) return;
    const newVal = character.keyword_enabled ? 0 : 1;
    await characterService.update(db, characterId, { keyword_enabled: newVal });
    setCharacter(prev => (prev ? { ...prev, keyword_enabled: newVal } : null));
  }

  async function handleUpdate(data: CharacterFormData) {
    if (!db || !characterId) return;
    await characterService.update(db, characterId, data as unknown as Record<string, unknown>);
    setEditOpen(false);
    await loadData();
  }

  async function handleDelete() {
    if (!db || !characterId) return;
    await characterService.softDelete(db, characterId);
    setDeleteOpen(false);
    if (onClose) onClose();
    if (onNavigateBack) onNavigateBack();
    else if (!onClose) navigate(`/project/${projectId}/characters`);
  }

  async function handleImageReplace() {
    if (!db || !character || !characterId) return;
    setImageLoading(true);
    try {
      const filePath = await pickImageFile();
      if (!filePath) return;
      const img = await uploadImage(db, character.project_id, projectPath, filePath, 'character');
      await characterService.update(db, characterId, { image_id: img.id });
      await loadData();
    } catch (err: any) {
      console.error('Upload error:', err);
      alert('Failed to upload image: ' + (err.message || err));
    } finally {
      setImageLoading(false);
    }
  }

  async function handleImageRemove() {
    if (!db || !character || !character.image_id || !characterId) return;
    setImageLoading(true);
    try {
      await removeImage(db, projectPath, character.image_id);
      await characterService.update(db, characterId, { image_id: null });
      await loadData();
    } finally {
      setImageLoading(false);
    }
  }

  if (loading || !character) {
    return (
      <div className="p-8 text-center text-text-tertiary">
        Loading character details...
      </div>
    );
  }

  const hasDemographics =
    character.age != null ||
    Boolean(character.gender) ||
    Boolean(character.height) ||
    Boolean(character.occupation) ||
    Boolean(character.birthday) ||
    Boolean(character.appearance);

  const hasPsychology =
    Boolean(character.personality) ||
    Boolean(character.goals) ||
    Boolean(character.fears) ||
    Boolean(character.motivations);

  const hasCapabilities =
    Boolean(character.abilities) ||
    Boolean(character.equipment) ||
    Boolean(character.weaknesses) ||
    Boolean(character.strengths);

  const statusClass =
    character.status.toLowerCase() === 'alive'
      ? 'character-detail-card__status--alive'
      : character.status.toLowerCase() === 'dead'
      ? 'character-detail-card__status--dead'
      : '';

  return (
    <div className="character-detail-card">
      {showBackButton && (
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateBack || (() => navigate(`/project/${projectId}/characters`))}
          >
            <ArrowLeft size={16} /> Characters
          </Button>
        </div>
      )}

      {/* Header Row */}
      <div className="character-detail-card__header">
        <div className="character-detail-card__header-left">
          <div className="character-detail-card__avatar">
            {imageUrl ? (
              <img src={imageUrl} alt={character.name} className="character-detail-card__avatar-img" />
            ) : (
              <User size={38} className="text-text-tertiary" />
            )}
            <div className="character-detail-card__avatar-overlay">
              <Button variant="secondary" size="sm" onClick={handleImageReplace} disabled={imageLoading} style={{ padding: '2px 8px', fontSize: '11px' }}>
                <Upload size={11} /> Replace
              </Button>
              {imageUrl && (
                <Button variant="danger" size="sm" onClick={handleImageRemove} disabled={imageLoading} style={{ padding: '2px 8px', fontSize: '11px' }}>
                  <X size={11} /> Remove
                </Button>
              )}
            </div>
          </div>

          <div className="character-detail-card__header-info">
            <h1 className="character-detail-card__name">{character.name || 'Unnamed'}</h1>
            <div className="character-detail-card__subtitle">
              {character.aliases ? `Aliases: '${character.aliases}' • ` : ''}
              <span>Status:</span>
              <span className={`character-detail-card__status ${statusClass}`}>{character.status || 'Unknown'}</span>
            </div>
            <div className="character-detail-card__toggle-row">
              <span>Keyword Enabled</span>
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(character.keyword_enabled)}
                className={`character-detail-card__toggle ${character.keyword_enabled ? 'character-detail-card__toggle--active' : ''}`}
                onClick={handleToggleKeyword}
              >
                <div className="character-detail-card__toggle-thumb" />
              </button>
            </div>
          </div>
        </div>

        {/* Top-right Actions (Note: NO duplicate button per instructions) */}
        <div className="character-detail-card__header-actions">
          <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
            <Edit size={14} /> Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)} className="text-danger hover:bg-danger/10">
            <Trash2 size={14} /> Delete
          </Button>
        </div>
      </div>

      {/* 2-Column Grid */}
      <div className="character-detail-card__grid">
        {/* Left Column */}
        <div className="character-detail-card__column">
          {/* Demographics & Appearance */}
          <div className="character-detail-card__section">
            <h3 className="character-detail-card__section-title">Demographics & Appearance</h3>
            <div className="character-detail-card__box">
              {hasDemographics ? (
                <>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary mb-2">
                    {character.age != null && (
                      <div>
                        <strong className="character-detail-card__field-label">Age:</strong>
                        {character.age}
                      </div>
                    )}
                    {character.gender && (
                      <div>
                        <strong className="character-detail-card__field-label">Gender:</strong>
                        {character.gender}
                      </div>
                    )}
                    {character.height && (
                      <div>
                        <strong className="character-detail-card__field-label">Height:</strong>
                        {character.height}
                      </div>
                    )}
                    {character.occupation && (
                      <div>
                        <strong className="character-detail-card__field-label">Occupation:</strong>
                        {character.occupation}
                      </div>
                    )}
                    {character.birthday && (
                      <div>
                        <strong className="character-detail-card__field-label">Birthday:</strong>
                        {character.birthday}
                      </div>
                    )}
                  </div>
                  {character.appearance && (
                    <div className="mt-2 pt-2 border-t border-border-subtle">
                      <p className="character-detail-card__field-line">
                        <strong className="character-detail-card__field-label">Appearance:</strong>
                        {character.appearance}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="character-detail-card__empty-text">No demographics or appearance details added yet.</p>
              )}
            </div>
          </div>

          {/* Psychology & Motivation */}
          <div className="character-detail-card__section">
            <h3 className="character-detail-card__section-title">Psychology & Motivation</h3>
            <div className="character-detail-card__box">
              {hasPsychology ? (
                <>
                  {character.personality && (
                    <p className="character-detail-card__field-line">
                      <strong className="character-detail-card__field-label">Personality:</strong>
                      {character.personality}
                    </p>
                  )}
                  {character.goals && (
                    <p className="character-detail-card__field-line">
                      <strong className="character-detail-card__field-label">Goals:</strong>
                      {character.goals}
                    </p>
                  )}
                  {character.fears && (
                    <p className="character-detail-card__field-line">
                      <strong className="character-detail-card__field-label">Fears:</strong>
                      {character.fears}
                    </p>
                  )}
                  {character.motivations && (
                    <p className="character-detail-card__field-line">
                      <strong className="character-detail-card__field-label">Motivations:</strong>
                      {character.motivations}
                    </p>
                  )}
                </>
              ) : (
                <p className="character-detail-card__empty-text">No psychology or motivation notes added yet.</p>
              )}
            </div>
          </div>

          {/* Capabilities */}
          <div className="character-detail-card__section">
            <h3 className="character-detail-card__section-title">Capabilities</h3>
            <div className="character-detail-card__box">
              {hasCapabilities ? (
                <>
                  {character.abilities && (
                    <p className="character-detail-card__field-line">
                      <strong className="character-detail-card__field-label">Mastery / Abilities:</strong>
                      {character.abilities}
                    </p>
                  )}
                  {character.equipment && (
                    <p className="character-detail-card__field-line">
                      <strong className="character-detail-card__field-label">Equipment:</strong>
                      {character.equipment}
                    </p>
                  )}
                  {character.weaknesses && (
                    <p className="character-detail-card__field-line">
                      <strong className="character-detail-card__field-label">Weaknesses:</strong>
                      {character.weaknesses}
                    </p>
                  )}
                  {character.strengths && (
                    <p className="character-detail-card__field-line">
                      <strong className="character-detail-card__field-label">Strengths:</strong>
                      {character.strengths}
                    </p>
                  )}
                </>
              ) : (
                <p className="character-detail-card__empty-text">No capabilities or equipment added yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="character-detail-card__column">
          {/* Biography & Lore */}
          <div className="character-detail-card__section">
            <h3 className="character-detail-card__section-title">Biography & Lore</h3>
            <div className="character-detail-card__box">
              {character.biography || character.notes ? (
                <div className="flex flex-col gap-3">
                  {character.biography && (
                    <p className="character-detail-card__field-line whitespace-pre-wrap">{character.biography}</p>
                  )}
                  {character.notes && (
                    <p className="character-detail-card__field-line whitespace-pre-wrap pt-2 border-t border-border-subtle">
                      <strong className="character-detail-card__field-label block mb-1">Notes:</strong>
                      {character.notes}
                    </p>
                  )}
                </div>
              ) : (
                <p className="character-detail-card__empty-text">No biography or lore notes added yet.</p>
              )}
            </div>
          </div>

          {/* Relationships + Graph Preview */}
          <div className="character-detail-card__section">
            <h3 className="character-detail-card__section-title">Relationships</h3>
            <div className="character-detail-card__box">
              {relationships.length > 0 ? (
                <div className="character-detail-card__rel-list">
                  {relationships.map(r => (
                    <div key={r.id} className="character-detail-card__rel-item">
                      <span className="character-detail-card__rel-name">{r.name}</span>
                      <span className="character-detail-card__rel-type">— {r.relationship}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="character-detail-card__empty-text mb-3">No direct relationships added yet.</p>
              )}

              <div className="pt-3 border-t border-border-subtle">
                <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider block mb-2">
                  Graph preview:
                </span>
                {db && projectId && (
                  <MiniGraphPreview entityId={characterId} db={db} projectId={projectId} />
                )}
              </div>
            </div>
          </div>

          {/* Mention References */}
          <div className="character-detail-card__section">
            <h3 className="character-detail-card__section-title">Mention References</h3>
            <div className="character-detail-card__box">
              {mentions.length > 0 ? (
                <div className="character-detail-card__mentions-list">
                  {mentions.map((m, idx) => (
                    <button
                      key={`${m.chapterId}-${idx}`}
                      type="button"
                      className="character-detail-card__mention-link"
                      onClick={() => {
                        if (onClose) onClose();
                        navigate(`/project/${projectId}/chapters/${m.chapterId}`);
                      }}
                    >
                      <span>
                        Chapter {String(m.chapterNumber || idx + 1).padStart(2, '0')} • {m.title}
                      </span>
                      <span className="text-xs text-text-tertiary font-mono">Line {m.lineIndex}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="character-detail-card__empty-text">No mention references in chapters yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Character" size="lg">
        <CharacterForm
          defaultValues={{
            ...character,
            status: character.status as 'Alive' | 'Dead' | 'Unknown' | 'Other',
            keyword_enabled: Boolean(character.keyword_enabled),
          }}
          onSubmit={handleUpdate}
          onCancel={() => setEditOpen(false)}
          submitLabel="Save Changes"
        />
      </Modal>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Move to Trash"
        description={`Are you sure you want to move "${character.name}" to the trash?`}
        confirmLabel="Move to Trash"
        onConfirm={handleDelete}
        variant="danger"
      />
    </div>
  );
}
