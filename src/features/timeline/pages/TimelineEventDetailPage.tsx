import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Edit } from 'lucide-react';
import { Button, Card, Dialog, Modal, EntityReferences } from '@/components';
import { useProjectDb } from '@/hooks/useProjectDb';
import { timelineEventService } from '../services/timelineEventService';
import { TimelineEventForm } from '../components/TimelineEventForm';
import type { TimelineEvent } from '@/types/database';
import type { TimelineEventFormData } from '../types/timelineEvent';
import { EntityType } from '@/types/common';
import '../../locations/pages/LocationDetailPage.css';

export default function TimelineEventDetailPage() {
  const { projectId, entityId } = useParams<{ projectId: string; entityId: string }>();
  const navigate = useNavigate();
  const { db } = useProjectDb();
  const [entity, setEntity] = useState<TimelineEvent | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const load = useCallback(async () => {
    if (!entityId) return;
    setEntity(await timelineEventService.getById(db, entityId));
  }, [db, entityId]);
  useEffect(() => { void load(); }, [load]);

  async function handleUpdate(d: TimelineEventFormData) {
    if (!entityId) return;
    await timelineEventService.update(db, entityId, d as unknown as Record<string, unknown>);
    setEditOpen(false);
    await load();
  }
  async function handleDelete() {
    if (!entityId) return;
    await timelineEventService.softDelete(db, entityId);
    navigate(`/project/${projectId}/timeline`);
  }

  if (!entity) return <div className="entity-detail__loading">Loading...</div>;

  const fields = [{ label: 'Date', value: entity.event_date }];
  const sections = [{ label: 'Description', value: entity.description }];

  return (
    <div className="entity-detail">
      <header className="entity-detail__header">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/project/${projectId}/timeline`)}>
          <ArrowLeft size={16} />Timeline
        </Button>
        <div className="entity-detail__header-actions">
          <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}><Edit size={14} />Edit</Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)}><Trash2 size={14} /></Button>
        </div>
      </header>
      <div className="entity-detail__content">
        <div className="entity-detail__main">
          <h1 className="entity-detail__name">{entity.title}</h1>
          {fields[0]?.value && (
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
          )}
          {sections.filter(s => s.value.trim()).map(({ label, value }) => (
            <Card key={label} className="entity-detail__card">
              <h3 className="entity-detail__card-title">{label}</h3>
              <p className="entity-detail__text">{value}</p>
            </Card>
          ))}
          <EntityReferences entityId={entity.id} entityType={EntityType.TimelineEvent} />
        </div>
      </div>
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Timeline Event" size="md">
        <TimelineEventForm defaultValues={{ ...entity, keyword_enabled: Boolean(entity.keyword_enabled) }} onSubmit={handleUpdate} onCancel={() => setEditOpen(false)} submitLabel="Save Changes" />
      </Modal>
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Move to Trash" description={`Move "${entity.title}" to trash?`} confirmLabel="Move to Trash" onConfirm={handleDelete} variant="danger" />
    </div>
  );
}
