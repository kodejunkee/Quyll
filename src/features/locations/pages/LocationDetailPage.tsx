import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Edit } from 'lucide-react';
import { Button, Card, Dialog, Modal } from '@/components';
import { ImageUploader } from '@/components/ImageUploader';
import { useProjectDb } from '@/hooks/useProjectDb';
import { locationService } from '../services/locationService';
import { LocationForm } from '../components/LocationForm';
import { pickImageFile, uploadImage, removeImage, getImageUrl, getImageById } from '@/services/imageService';
import type { Location } from '@/types/database';
import type { LocationFormData } from '../types/location';
import './LocationDetailPage.css';

export default function LocationDetailPage() {
  const { projectId, entityId } = useParams<{ projectId: string; entityId: string }>();
  const navigate = useNavigate();
  const { db, projectPath } = useProjectDb();
  const [entity, setEntity] = useState<Location | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  const load = useCallback(async () => {
    if (!entityId) return;
    const row = await locationService.getById(db, entityId);
    setEntity(row);
    if (row?.image_id) { const img = await getImageById(db, row.image_id); if (img) { setImageUrl(await getImageUrl(projectPath, img.path)); } } else { setImageUrl(null); }
  }, [db, entityId, projectPath]);

  useEffect(() => { void load(); }, [load]);

  async function handleUpdate(data: LocationFormData) { if (!entityId) return; await locationService.update(db, entityId, data as unknown as Record<string, unknown>); setEditOpen(false); await load(); }
  async function handleDelete() { if (!entityId) return; await locationService.softDelete(db, entityId); navigate(`/project/${projectId}/locations`); }
  async function handleImageUpload() { if (!entityId || !entity) return; const f = await pickImageFile(); if (!f) return; setImageLoading(true); try { const img = await uploadImage(db, entity.project_id, projectPath, f, 'location'); await locationService.update(db, entityId, { image_id: img.id }); await load(); } finally { setImageLoading(false); } }
  async function handleImageRemove() { if (!entityId || !entity?.image_id) return; setImageLoading(true); try { await removeImage(db, projectPath, entity.image_id); await locationService.update(db, entityId, { image_id: null }); await load(); } finally { setImageLoading(false); } }

  if (!entity) return <div className="entity-detail__loading">Loading...</div>;

  const fields = [{ label: 'Type', value: entity.type }, { label: 'Climate', value: entity.climate }, { label: 'Population', value: entity.population }];
  const sections = [{ label: 'Description', value: entity.description }, { label: 'Architecture', value: entity.architecture }, { label: 'Culture', value: entity.culture }, { label: 'History', value: entity.history }, { label: 'Notes', value: entity.notes }];

  return (
    <div className="entity-detail">
      <header className="entity-detail__header">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/project/${projectId}/locations`)}><ArrowLeft size={16} />Locations</Button>
        <div className="entity-detail__header-actions">
          <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}><Edit size={14} />Edit</Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)}><Trash2 size={14} /></Button>
        </div>
      </header>
      <div className="entity-detail__content">
        <div className="entity-detail__sidebar"><ImageUploader imageUrl={imageUrl} onUpload={handleImageUpload} onRemove={handleImageRemove} loading={imageLoading} /></div>
        <div className="entity-detail__main">
          <h1 className="entity-detail__name">{entity.name}</h1>
          <Card className="entity-detail__card"><h3 className="entity-detail__card-title">General</h3><div className="entity-detail__fields">{fields.map(({ label, value }) => value ? <div key={label} className="entity-detail__field"><span className="entity-detail__field-label">{label}</span><span className="entity-detail__field-value">{value}</span></div> : null)}</div></Card>
          {sections.filter(s => s.value.trim()).map(({ label, value }) => <Card key={label} className="entity-detail__card"><h3 className="entity-detail__card-title">{label}</h3><p className="entity-detail__text">{value}</p></Card>)}
        </div>
      </div>
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Location" size="lg"><LocationForm defaultValues={entity} onSubmit={handleUpdate} onCancel={() => setEditOpen(false)} submitLabel="Save Changes" /></Modal>
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Move to Trash" description={`Move "${entity.name}" to trash?`} confirmLabel="Move to Trash" onConfirm={handleDelete} variant="danger" />
    </div>
  );
}
