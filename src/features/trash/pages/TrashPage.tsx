import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectDb } from '@/hooks/useProjectDb';
import { trashService, TrashedItem } from '@/services/trashService';
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import { Dialog } from '@/components/Dialog';
import { Button } from '@/components/Button';
import './TrashPage.css';

export function TrashPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { db } = useProjectDb();
  
  const [items, setItems] = useState<TrashedItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [emptyDialogOpen, setEmptyDialogOpen] = useState(false);
  const [deleteItemOpen, setDeleteItemOpen] = useState<TrashedItem | null>(null);

  useEffect(() => {
    if (!db || !projectId) return;

    const init = async () => {
      try {
        setLoading(true);
        // Clean up old items first
        await trashService.autoDeleteOldTrash(db);
        await loadItems();
      } catch (err) {
        console.error("Failed to load trash", err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [db, projectId]);

  const loadItems = async () => {
    if (!db || !projectId) return;
    const trashed = await trashService.getTrashedItems(db, projectId);
    setItems(trashed);
  };

  const handleRestore = async (item: TrashedItem) => {
    if (!db || !projectId) return;
    try {
      await trashService.restoreItem(db, projectId, item.id, item.type);
      await loadItems();
    } catch (err) {
      console.error("Failed to restore item", err);
    }
  };

  const handleHardDelete = async () => {
    if (!db || !deleteItemOpen) return;
    try {
      await trashService.hardDeleteItem(db, deleteItemOpen.id, deleteItemOpen.type);
      setDeleteItemOpen(null);
      await loadItems();
    } catch (err) {
      console.error("Failed to permanently delete item", err);
    }
  };

  const handleEmptyTrash = async () => {
    if (!db || !projectId) return;
    try {
      await trashService.emptyTrash(db, projectId);
      setEmptyDialogOpen(false);
      await loadItems();
    } catch (err) {
      console.error("Failed to empty trash", err);
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit'
    }).format(d);
  };

  return (
    <div className="trash-page">
      <header className="trash-page__header">
        <div className="trash-page__header-title">
          <Trash2 size={24} />
          <h1>Trash</h1>
        </div>
        <div className="trash-page__header-actions">
          <Button 
            variant="danger" 
            onClick={() => setEmptyDialogOpen(true)}
            disabled={items.length === 0 || loading}
          >
            Empty Trash
          </Button>
        </div>
      </header>
      
      <div className="trash-page__content">
        <p className="trash-page__notice">
          Items in the trash are automatically deleted after 90 days.
        </p>

        {loading ? (
          <div className="trash-page__loading">Loading trash...</div>
        ) : items.length === 0 ? (
          <div className="trash-page__empty">
            <Trash2 size={48} className="trash-page__empty-icon" />
            <p>Your trash is empty.</p>
          </div>
        ) : (
          <div className="trash-list">
            <div className="trash-list__header">
              <div className="trash-list__col trash-list__col--name">Name</div>
              <div className="trash-list__col trash-list__col--type">Type</div>
              <div className="trash-list__col trash-list__col--date">Deleted</div>
              <div className="trash-list__col trash-list__col--actions">Actions</div>
            </div>
            
            {items.map(item => (
              <div key={item.id} className="trash-item">
                <div className="trash-item__col trash-item__col--name">
                  {item.name || 'Untitled'}
                </div>
                <div className="trash-item__col trash-item__col--type">
                  {item.type.replace('_', ' ')}
                </div>
                <div className="trash-item__col trash-item__col--date">
                  {formatDate(item.deleted_at)}
                </div>
                <div className="trash-item__col trash-item__col--actions">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleRestore(item)}
                    title="Restore"
                  >
                    <RotateCcw size={16} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setDeleteItemOpen(item)}
                    title="Delete Permanently"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog 
        open={emptyDialogOpen} 
        onClose={() => setEmptyDialogOpen(false)} 
        title="Empty Trash?" 
        description="Are you sure you want to permanently delete all items in the trash? This action cannot be undone." 
        confirmLabel="Empty Trash" 
        onConfirm={handleEmptyTrash} 
        variant="danger" 
      />

      <Dialog 
        open={deleteItemOpen !== null} 
        onClose={() => setDeleteItemOpen(null)} 
        title="Delete Permanently?" 
        description={`Are you sure you want to permanently delete "${deleteItemOpen?.name}"? This action cannot be undone.`} 
        confirmLabel="Delete" 
        onConfirm={handleHardDelete} 
        variant="danger" 
      />
    </div>
  );
}
