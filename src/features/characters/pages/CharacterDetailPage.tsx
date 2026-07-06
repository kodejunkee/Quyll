import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Edit } from 'lucide-react';
import { Button, Card, Dialog, Modal } from '@/components';
import { ImageUploader } from '@/components/ImageUploader';
import { useProjectDb } from '@/hooks/useProjectDb';
import { characterService } from '../services/characterService';
import { CharacterForm } from '../components/CharacterForm';
import { pickImageFile, uploadImage, removeImage, getImageUrl, getImageById } from '@/services/imageService';
import type { Character } from '@/types/database';
import type { CharacterFormData } from '../types/character';
import './CharacterDetailPage.css';

export default function CharacterDetailPage() {
  const { projectId, entityId } = useParams<{ projectId: string; entityId: string }>();
  const navigate = useNavigate();
  const { db, projectPath } = useProjectDb();

  const [character, setCharacter] = useState<Character | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  const load = useCallback(async () => {
    if (!entityId) return;
    const row = await characterService.getById(db, entityId);
    setCharacter(row);
    if (row?.image_id) {
      const img = await getImageById(db, row.image_id);
      if (img) {
        const url = await getImageUrl(projectPath, img.path);
        setImageUrl(url);
      }
    } else {
      setImageUrl(null);
    }
  }, [db, entityId, projectPath]);

  useEffect(() => { void load(); }, [load]);

  async function handleUpdate(data: CharacterFormData) {
    if (!entityId) return;
    await characterService.update(db, entityId, data as unknown as Record<string, unknown>);
    setEditOpen(false);
    await load();
  }

  async function handleDelete() {
    if (!entityId) return;
    await characterService.softDelete(db, entityId);
    navigate(`/project/${projectId}/characters`);
  }

  async function handleImageUpload() {
    if (!entityId || !character) return;
    const filePath = await pickImageFile();
    if (!filePath) return;
    setImageLoading(true);
    try {
      const img = await uploadImage(db, character.project_id, projectPath, filePath, 'character');
      await characterService.update(db, entityId, { image_id: img.id });
      await load();
    } catch (err: any) {
      console.error('Upload error:', err);
      alert('Failed to upload image: ' + (err.message || err));
    } finally {
      setImageLoading(false);
    }
  }

  async function handleImageRemove() {
    if (!entityId || !character?.image_id) return;
    setImageLoading(true);
    try {
      await removeImage(db, projectPath, character.image_id);
      await characterService.update(db, entityId, { image_id: null });
      await load();
    } finally {
      setImageLoading(false);
    }
  }

  if (!character) {
    return <div className="character-detail__loading">Loading character...</div>;
  }

  const fields = [
    { label: 'Aliases', value: character.aliases },
    { label: 'Age', value: character.age != null ? String(character.age) : '' },
    { label: 'Birthday', value: character.birthday },
    { label: 'Gender', value: character.gender },
    { label: 'Height', value: character.height },
    { label: 'Occupation', value: character.occupation },
    { label: 'Status', value: character.status },
  ];

  const textSections = [
    { label: 'Appearance', value: character.appearance },
    { label: 'Personality', value: character.personality },
    { label: 'Goals', value: character.goals },
    { label: 'Fears', value: character.fears },
    { label: 'Motivations', value: character.motivations },
    { label: 'Strengths', value: character.strengths },
    { label: 'Weaknesses', value: character.weaknesses },
    { label: 'Abilities', value: character.abilities },
    { label: 'Equipment', value: character.equipment },
    { label: 'Biography', value: character.biography },
    { label: 'Notes', value: character.notes },
  ];

  return (
    <div className="character-detail">
      <header className="character-detail__header">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/project/${projectId}/characters`)}>
          <ArrowLeft size={16} />
          Characters
        </Button>
        <div className="character-detail__header-actions">
          <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
            <Edit size={14} />
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 size={14} />
          </Button>
        </div>
      </header>

      <div className="character-detail__content">
        <div className="character-detail__sidebar">
          <ImageUploader
            imageUrl={imageUrl}
            onUpload={handleImageUpload}
            onRemove={handleImageRemove}
            loading={imageLoading}
          />
        </div>

        <div className="character-detail__main">
          <h1 className="character-detail__name">{character.name}</h1>

          <Card className="character-detail__card">
            <h3 className="character-detail__card-title">General Information</h3>
            <div className="character-detail__fields">
              {fields.map(({ label, value }) =>
                value ? (
                  <div key={label} className="character-detail__field">
                    <span className="character-detail__field-label">{label}</span>
                    <span className="character-detail__field-value">{value}</span>
                  </div>
                ) : null,
              )}
            </div>
          </Card>

          {textSections
            .filter(({ value }) => value.trim())
            .map(({ label, value }) => (
              <Card key={label} className="character-detail__card">
                <h3 className="character-detail__card-title">{label}</h3>
                <p className="character-detail__text">{value}</p>
              </Card>
            ))}
        </div>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Character" size="lg">
        <CharacterForm
          defaultValues={{
            name: character.name,
            aliases: character.aliases,
            age: character.age,
            birthday: character.birthday,
            gender: character.gender,
            height: character.height,
            occupation: character.occupation,
            appearance: character.appearance,
            personality: character.personality,
            goals: character.goals,
            fears: character.fears,
            strengths: character.strengths,
            weaknesses: character.weaknesses,
            abilities: character.abilities,
            equipment: character.equipment,
            motivations: character.motivations,
            biography: character.biography,
            notes: character.notes,
            status: character.status as 'Alive' | 'Dead' | 'Unknown' | 'Other',
          }}
          onSubmit={handleUpdate}
          onCancel={() => setEditOpen(false)}
          submitLabel="Save Changes"
        />
      </Modal>

      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Move to Trash"
        description={`Move "${character.name}" to trash? You can restore it later.`}
        confirmLabel="Move to Trash"
        onConfirm={handleDelete}
        variant="danger"
      />
    </div>
  );
}
