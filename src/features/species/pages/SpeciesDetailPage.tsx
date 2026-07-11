import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Edit } from 'lucide-react';
import { Button, Card, Dialog, Modal, EntityReferences } from '@/components';
import { ImageUploader } from '@/components/ImageUploader';
import { useProjectDb } from '@/hooks/useProjectDb';
import { speciesService } from '../services/speciesService';
import { SpeciesForm } from '../components/SpeciesForm';
import { pickImageFile, uploadImage, removeImage, getImageUrl, getImageById } from '@/services/imageService';
import type { Species } from '@/types/database';
import type { SpeciesFormData } from '../types/species';
import { EntityType } from '@/types/common';
import '../../locations/pages/LocationDetailPage.css';
export default function SpeciesDetailPage() {
  const { projectId, entityId } = useParams<{ projectId: string; entityId: string }>(); const navigate = useNavigate(); const { db, projectPath } = useProjectDb();
  const [entity, setEntity] = useState<Species | null>(null); const [imageUrl, setImageUrl] = useState<string | null>(null); const [editOpen, setEditOpen] = useState(false); const [deleteOpen, setDeleteOpen] = useState(false); const [imageLoading, setImageLoading] = useState(false);
  const load = useCallback(async () => { if (!entityId) return; const row = await speciesService.getById(db, entityId); setEntity(row); if (row?.image_id) { const img = await getImageById(db, row.image_id); if (img) setImageUrl(await getImageUrl(projectPath, img.path)); } else setImageUrl(null); }, [db, entityId, projectPath]);
  useEffect(() => { void load(); }, [load]);
  async function handleUpdate(d: SpeciesFormData) { if (!entityId) return; await speciesService.update(db, entityId, d as unknown as Record<string, unknown>); setEditOpen(false); await load(); }
  async function handleDelete() { if (!entityId) return; await speciesService.softDelete(db, entityId); navigate(`/project/${projectId}/species`); }
  async function handleImageUpload() { if (!entityId || !entity) return; const f = await pickImageFile(); if (!f) return; setImageLoading(true); try { const img = await uploadImage(db, entity.project_id, projectPath, f, 'species'); await speciesService.update(db, entityId, { image_id: img.id }); await load(); } finally { setImageLoading(false); } }
  async function handleImageRemove() { if (!entityId || !entity?.image_id) return; setImageLoading(true); try { await removeImage(db, projectPath, entity.image_id); await speciesService.update(db, entityId, { image_id: null }); await load(); } finally { setImageLoading(false); } }
  if (!entity) return <div className="entity-detail__loading">Loading...</div>;
  const sections = [{ label: 'Appearance', value: entity.appearance }, { label: 'Culture', value: entity.culture }, { label: 'Habitat', value: entity.habitat }, { label: 'History', value: entity.history }, { label: 'Abilities', value: entity.abilities }, { label: 'Weaknesses', value: entity.weaknesses }, { label: 'Notes', value: entity.notes }];
  return (<div className="entity-detail"><header className="entity-detail__header"><Button variant="ghost" size="sm" onClick={() => navigate(`/project/${projectId}/species`)}><ArrowLeft size={16} />Species</Button><div className="entity-detail__header-actions"><Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}><Edit size={14} />Edit</Button><Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)}><Trash2 size={14} /></Button></div></header><div className="entity-detail__content"><div className="entity-detail__sidebar"><ImageUploader imageUrl={imageUrl} onUpload={handleImageUpload} onRemove={handleImageRemove} loading={imageLoading} /></div><div className="entity-detail__main"><h1 className="entity-detail__name">{entity.name}</h1><Card className="entity-detail__card"><h3 className="entity-detail__card-title">General</h3><div className="entity-detail__fields">{sections.map(({ label, value }) => value && value.trim() ? <div key={label} className="entity-detail__field"><h4 className="entity-detail__field-label">{label}</h4><p className="entity-detail__field-value">{value}</p></div> : null)}</div></Card><EntityReferences entityId={entity.id} entityType={EntityType.Species} /></div></div><Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Species" size="lg"><SpeciesForm defaultValues={{ ...entity, keyword_enabled: Boolean(entity.keyword_enabled) }} onSubmit={handleUpdate} onCancel={() => setEditOpen(false)} submitLabel="Save Changes" /></Modal><Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Move to Trash" description={`Move "${entity.name}" to trash?`} confirmLabel="Move to Trash" onConfirm={handleDelete} variant="danger" /></div>);
}
