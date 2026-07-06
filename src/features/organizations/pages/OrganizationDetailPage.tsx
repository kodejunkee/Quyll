import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Edit } from 'lucide-react';
import { Button, Card, Dialog, Modal } from '@/components';
import { ImageUploader } from '@/components/ImageUploader';
import { useProjectDb } from '@/hooks/useProjectDb';
import { organizationService } from '../services/organizationService';
import { OrganizationForm } from '../components/OrganizationForm';
import { pickImageFile, uploadImage, removeImage, getImageUrl, getImageById } from '@/services/imageService';
import type { Organization } from '@/types/database';
import type { OrganizationFormData } from '../types/organization';
import '../../../features/locations/pages/LocationDetailPage.css';

export default function OrganizationDetailPage() {
  const { projectId, entityId } = useParams<{ projectId: string; entityId: string }>();
  const navigate = useNavigate();
  const { db, projectPath } = useProjectDb();
  const [entity, setEntity] = useState<Organization | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  const load = useCallback(async () => {
    if (!entityId) return;
    const row = await organizationService.getById(db, entityId);
    setEntity(row);
    if (row?.image_id) { const img = await getImageById(db, row.image_id); if (img) { setImageUrl(await getImageUrl(projectPath, img.path)); } } else { setImageUrl(null); }
  }, [db, entityId, projectPath]);
  useEffect(() => { void load(); }, [load]);

  async function handleUpdate(data: OrganizationFormData) { if (!entityId) return; await organizationService.update(db, entityId, data as unknown as Record<string, unknown>); setEditOpen(false); await load(); }
  async function handleDelete() { if (!entityId) return; await organizationService.softDelete(db, entityId); navigate(`/project/${projectId}/organizations`); }
  async function handleImageUpload() { if (!entityId || !entity) return; const f = await pickImageFile(); if (!f) return; setImageLoading(true); try { const img = await uploadImage(db, entity.project_id, projectPath, f, 'organization'); await organizationService.update(db, entityId, { image_id: img.id }); await load(); } finally { setImageLoading(false); } }
  async function handleImageRemove() { if (!entityId || !entity?.image_id) return; setImageLoading(true); try { await removeImage(db, projectPath, entity.image_id); await organizationService.update(db, entityId, { image_id: null }); await load(); } finally { setImageLoading(false); } }

  if (!entity) return <div className="entity-detail__loading">Loading...</div>;
  const fields = [{ label: 'Type', value: entity.type }, { label: 'Leader', value: entity.leader }];
  const sections = [{ label: 'Description', value: entity.description }, { label: 'Purpose', value: entity.purpose }, { label: 'Structure', value: entity.structure }, { label: 'History', value: entity.history }, { label: 'Notes', value: entity.notes }];

  return (
    <div className="entity-detail">
      <header className="entity-detail__header"><Button variant="ghost" size="sm" onClick={() => navigate(`/project/${projectId}/organizations`)}><ArrowLeft size={16} />Organizations</Button><div className="entity-detail__header-actions"><Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}><Edit size={14} />Edit</Button><Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)}><Trash2 size={14} /></Button></div></header>
      <div className="entity-detail__content"><div className="entity-detail__sidebar"><ImageUploader imageUrl={imageUrl} onUpload={handleImageUpload} onRemove={handleImageRemove} loading={imageLoading} /></div><div className="entity-detail__main"><h1 className="entity-detail__name">{entity.name}</h1><Card className="entity-detail__card"><h3 className="entity-detail__card-title">General</h3><div className="entity-detail__fields">{fields.map(({ label, value }) => value ? <div key={label} className="entity-detail__field"><span className="entity-detail__field-label">{label}</span><span className="entity-detail__field-value">{value}</span></div> : null)}</div></Card>{sections.filter(s => s.value.trim()).map(({ label, value }) => <Card key={label} className="entity-detail__card"><h3 className="entity-detail__card-title">{label}</h3><p className="entity-detail__text">{value}</p></Card>)}</div></div>
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Organization" size="lg"><OrganizationForm defaultValues={entity} onSubmit={handleUpdate} onCancel={() => setEditOpen(false)} submitLabel="Save Changes" /></Modal>
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Move to Trash" description={`Move "${entity.name}" to trash?`} confirmLabel="Move to Trash" onConfirm={handleDelete} variant="danger" />
    </div>
  );
}
