import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Edit } from 'lucide-react';
import { Button, Card, Dialog, Modal, EntityReferences } from '@/components';
import { useProjectDb } from '@/hooks/useProjectDb';
import { magicSystemService } from '../services/magicSystemService';
import { MagicSystemForm } from '../components/MagicSystemForm';
import type { MagicSystem } from '@/types/database';
import { type MagicSystemFormData } from '../types/magicSystem';
import { EntityType } from '@/types/common';
import '../../locations/pages/LocationDetailPage.css';
export default function MagicSystemDetailPage() {
  const { projectId, entityId } = useParams<{ projectId: string; entityId: string }>(); const navigate = useNavigate(); const { db } = useProjectDb();
  const [entity, setEntity] = useState<MagicSystem | null>(null); const [editOpen, setEditOpen] = useState(false); const [deleteOpen, setDeleteOpen] = useState(false);
  const load = useCallback(async () => { if (!entityId) return; setEntity(await magicSystemService.getById(db, entityId)); }, [db, entityId]);
  useEffect(() => { void load(); }, [load]);
  async function handleUpdate(d: MagicSystemFormData) { if (!entityId) return; await magicSystemService.update(db, entityId, d as unknown as Record<string, unknown>); setEditOpen(false); await load(); }
  async function handleDelete() { if (!entityId) return; await magicSystemService.softDelete(db, entityId); navigate(`/project/${projectId}/magic-systems`); }
  if (!entity) return <div className="entity-detail__loading">Loading...</div>;
  const fields = [{ label: 'Energy Source', value: entity.energy_source }];
  const sections = [{ label: 'Description', value: entity.description }, { label: 'Rules', value: entity.rules }, { label: 'Limitations', value: entity.limitations }, { label: 'Notes', value: entity.examples }];
  return (<div className="entity-detail"><header className="entity-detail__header"><Button variant="ghost" size="sm" onClick={() => navigate(`/project/${projectId}/magic-systems`)}><ArrowLeft size={16} />Magic Systems</Button><div className="entity-detail__header-actions"><Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}><Edit size={14} />Edit</Button><Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)}><Trash2 size={14} /></Button></div></header><div className="entity-detail__content" style={{ gridTemplateColumns: '1fr' }}><div className="entity-detail__main"><h1 className="entity-detail__name">{entity.name}</h1><Card className="entity-detail__card"><h3 className="entity-detail__card-title">General</h3><div className="entity-detail__fields">{fields.map(({ label, value }) => value ? <div key={label} className="entity-detail__field"><span className="entity-detail__field-label">{label}</span><span className="entity-detail__field-value">{value}</span></div> : null)}</div></Card>{sections.filter(s => s.value.trim()).map(({ label, value }) => <Card key={label} className="entity-detail__card"><h3 className="entity-detail__card-title">{label}</h3><p className="entity-detail__text">{value}</p></Card>)}<EntityReferences entityId={entity.id} entityType={EntityType.MagicSystem} /></div></div><Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Magic System" size="lg"><MagicSystemForm defaultValues={{ ...entity, keyword_enabled: Boolean(entity.keyword_enabled) }} onSubmit={handleUpdate} onCancel={() => setEditOpen(false)} submitLabel="Save Changes" /></Modal><Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Move to Trash" description={`Move "${entity.name}" to trash?`} confirmLabel="Move to Trash" onConfirm={handleDelete} variant="danger" /></div>);
}
