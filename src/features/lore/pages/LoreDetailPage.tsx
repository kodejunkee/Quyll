import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Edit } from 'lucide-react';
import { Button, Card, Dialog, Modal } from '@/components';
import { useProjectDb } from '@/hooks/useProjectDb';
import { loreService } from '../services/loreService';
import { LoreForm } from '../components/LoreForm';
import type { LoreEntry } from '@/types/database';
import type { LoreFormData } from '../types/lore';
import '../../locations/pages/LocationDetailPage.css';
export default function LoreDetailPage() {
  const { projectId, entityId } = useParams<{ projectId: string; entityId: string }>(); const navigate = useNavigate(); const { db } = useProjectDb();
  const [entity, setEntity] = useState<LoreEntry | null>(null); const [editOpen, setEditOpen] = useState(false); const [deleteOpen, setDeleteOpen] = useState(false);
  const load = useCallback(async () => { if (!entityId) return; setEntity(await loreService.getById(db, entityId)); }, [db, entityId]);
  useEffect(() => { void load(); }, [load]);
  async function handleUpdate(d: LoreFormData) { if (!entityId) return; await loreService.update(db, entityId, d as unknown as Record<string, unknown>); setEditOpen(false); await load(); }
  async function handleDelete() { if (!entityId) return; await loreService.softDelete(db, entityId); navigate(`/project/${projectId}/lore`); }
  if (!entity) return <div className="entity-detail__loading">Loading...</div>;
  const fields = [{ label: 'Category', value: entity.category }];
  const sections = [{ label: 'Content', value: entity.content }, { label: 'Notes', value: entity.notes }];
  return (<div className="entity-detail"><header className="entity-detail__header"><Button variant="ghost" size="sm" onClick={() => navigate(`/project/${projectId}/lore`)}><ArrowLeft size={16} />Lore</Button><div className="entity-detail__header-actions"><Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}><Edit size={14} />Edit</Button><Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)}><Trash2 size={14} /></Button></div></header><div className="entity-detail__content" style={{ gridTemplateColumns: '1fr' }}><div className="entity-detail__main"><h1 className="entity-detail__name">{entity.title}</h1>{fields[0]?.value && <Card className="entity-detail__card"><h3 className="entity-detail__card-title">General</h3><div className="entity-detail__fields">{fields.map(({ label, value }) => value ? <div key={label} className="entity-detail__field"><span className="entity-detail__field-label">{label}</span><span className="entity-detail__field-value">{value}</span></div> : null)}</div></Card>}{sections.filter(s => s.value.trim()).map(({ label, value }) => <Card key={label} className="entity-detail__card"><h3 className="entity-detail__card-title">{label}</h3><p className="entity-detail__text">{value}</p></Card>)}</div></div><Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Lore Entry" size="lg"><LoreForm defaultValues={entity} onSubmit={handleUpdate} onCancel={() => setEditOpen(false)} submitLabel="Save Changes" /></Modal><Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Move to Trash" description={`Move "${entity.title}" to trash?`} confirmLabel="Move to Trash" onConfirm={handleDelete} variant="danger" /></div>);
}
