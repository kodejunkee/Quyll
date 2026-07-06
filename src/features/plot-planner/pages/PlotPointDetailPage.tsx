import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Edit } from 'lucide-react';
import { Button, Card, Dialog, Modal } from '@/components';
import { useProjectDb } from '@/hooks/useProjectDb';
import { plotPointService } from '../services/plotPointService';
import { PlotPointForm } from '../components/PlotPointForm';
import type { PlotPoint } from '@/types/database';
import type { PlotPointFormData } from '../types/plotPoint';
import '../../locations/pages/LocationDetailPage.css';

export default function PlotPointDetailPage() {
  const { projectId, entityId } = useParams<{ projectId: string; entityId: string }>();
  const navigate = useNavigate();
  const { db } = useProjectDb();
  const [entity, setEntity] = useState<PlotPoint | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const load = useCallback(async () => {
    if (!entityId) return;
    setEntity(await plotPointService.getById(db, entityId));
  }, [db, entityId]);
  useEffect(() => { void load(); }, [load]);

  async function handleUpdate(d: PlotPointFormData) {
    if (!entityId) return;
    await plotPointService.update(db, entityId, d as unknown as Record<string, unknown>);
    setEditOpen(false);
    await load();
  }
  async function handleDelete() {
    if (!entityId) return;
    await plotPointService.softDelete(db, entityId);
    navigate(`/project/${projectId}/plot-planner`);
  }

  if (!entity) return <div className="entity-detail__loading">Loading...</div>;

  const fields = [
    { label: 'Status', value: entity.status },
    { label: 'Arc', value: entity.arc },
    { label: 'Order', value: String(entity.order_index + 1) },
  ];
  const sections = [
    { label: 'Description', value: entity.description },
    { label: 'Notes', value: entity.notes },
  ];

  return (
    <div className="entity-detail">
      <header className="entity-detail__header">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/project/${projectId}/plot-planner`)}>
          <ArrowLeft size={16} />Plot Planner
        </Button>
        <div className="entity-detail__header-actions">
          <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}><Edit size={14} />Edit</Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)}><Trash2 size={14} /></Button>
        </div>
      </header>
      <div className="entity-detail__content" style={{ gridTemplateColumns: '1fr' }}>
        <div className="entity-detail__main">
          <h1 className="entity-detail__name">{entity.title}</h1>
          <Card className="entity-detail__card">
            <h3 className="entity-detail__card-title">General</h3>
            <div className="entity-detail__fields">
              {fields.map(({ label, value }) => value ? (
                <div key={label} className="entity-detail__field">
                  <span className="entity-detail__field-label">{label}</span>
                  <span className="entity-detail__field-value">{value}</span>
                </div>
              ) : null)}
            </div>
          </Card>
          {sections.filter(s => s.value.trim()).map(({ label, value }) => (
            <Card key={label} className="entity-detail__card">
              <h3 className="entity-detail__card-title">{label}</h3>
              <p className="entity-detail__text">{value}</p>
            </Card>
          ))}
        </div>
      </div>
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Plot Point" size="md">
        <PlotPointForm defaultValues={{ ...entity, status: entity.status as PlotPointFormData['status'] }} onSubmit={handleUpdate} onCancel={() => setEditOpen(false)} submitLabel="Save Changes" />
      </Modal>
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Move to Trash" description={`Move "${entity.title}" to trash?`} confirmLabel="Move to Trash" onConfirm={handleDelete} variant="danger" />
    </div>
  );
}
