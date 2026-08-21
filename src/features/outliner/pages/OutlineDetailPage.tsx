import { useState, useEffect, useCallback } from 'react';
import { ArrowLeftIcon, TrashIcon, Pencil2Icon } from '@radix-ui/react-icons';
import { useParams, useNavigate } from 'react-router-dom';

import { useWorkspaceStore } from '@/store/workspaceStore';
import { Button, Card, Dialog, Modal } from '@/components';
import { useProjectDb } from '@/hooks/useProjectDb';
import { outlineService } from '../services/outlineService';
import { OutlineForm } from '../components/OutlineForm';
import type { Outline } from '@/types/database';
import { EntityType } from '@/types/common';
import '../../locations/pages/LocationDetailPage.css';

export function OutlineDetailPage() {
  const { projectId, entityId } = useParams<{ projectId: string; entityId: string }>(); 
  const navigate = useNavigate(); 
  const { db } = useProjectDb();
  
  const [entity, setEntity] = useState<Outline | null>(null); 
  const [editOpen, setEditOpen] = useState(false); 
  const [deleteOpen, setDeleteOpen] = useState(false);
  
  const load = useCallback(async () => { 
    if (!entityId) return; 
    setEntity(await outlineService.getById(db, entityId)); 
  }, [db, entityId]);
  
  useEffect(() => { void load(); }, [load]);
  
  async function handleUpdate(d: any) { 
    if (!entityId) return; 
    await outlineService.update(db, entityId, d); 
    setEditOpen(false); 
    await load(); 
  }
  
  async function handleDelete() { 
    if (!entityId || !db) return; 
    await outlineService.softDelete(db, entityId);
    navigate(`/project/${projectId}/outliner`); 
  }
  
  if (!entity) return <div className="entity-detail__loading">Loading...</div>;
  
  return (
    <div className="entity-detail">
      <header className="entity-detail__header">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/project/${projectId}/outliner`)}>
          <ArrowLeftIcon width={16} height={16} />Outliner
        </Button>
        <div className="entity-detail__header-actions">
          <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil2Icon width={14} height={14} />Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)}>
            <TrashIcon width={14} height={14} />
          </Button>
        </div>
      </header>
      <div className="entity-detail__content">
        <div className="entity-detail__main">
          <h1 className="entity-detail__name">{entity.title}</h1>
          <Card className="entity-detail__card">
            <h3 className="entity-detail__card-title">General</h3>
            <div className="entity-detail__fields">
              <div className="entity-detail__field">
                <span className="entity-detail__field-label">Category</span>
                <span className="entity-detail__field-value">{entity.category}</span>
              </div>
            </div>
          </Card>
          {entity.description && (
            <Card className="entity-detail__card">
              <h3 className="entity-detail__card-title">Content</h3>
              <p className="entity-detail__text">{entity.description}</p>
            </Card>
          )}
          
        </div>
      </div>
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Outline" size="lg">
        <OutlineForm 
          initialData={entity} 
          onSubmit={handleUpdate} 
          onCancel={() => setEditOpen(false)} 
          submitLabel="Save Changes" 
        />
      </Modal>
      <Dialog 
        open={deleteOpen} 
        onClose={() => setDeleteOpen(false)} 
        title="Move to Trash" 
        description={`Move "${entity.title}" to trash?`} 
        confirmLabel="Move to Trash" 
        onConfirm={handleDelete} 
        variant="danger" 
      />
    </div>
  );
}
