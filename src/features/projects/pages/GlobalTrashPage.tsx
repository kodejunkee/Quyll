import { useEffect, useState } from 'react';
import { Dialog } from '@/components';
import { useProjectStore } from '@/store/projectStore';
import { 
  listProjects, 
  listDeletedProjects, 
  restoreProject, 
  hardDeleteProject, 
  autoDeleteOldProjects 
} from '@/database/appDatabase';
import { ArchiveIcon } from '@radix-ui/react-icons';
import { Trash2, RotateCcw, Clock, List, Grid, ChevronDown, MoreHorizontal, Square, CheckSquare, ShieldCheck } from 'lucide-react';
import './GlobalTrashPage.css';

export function GlobalTrashPage() {
  const { deletedProjects, setDeletedProjects, setProjects, closeTab } = useProjectStore();
  const [emptyDialogOpen, setEmptyDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const mapRowToInfo = (r: any) => ({
    id: r.id,
    name: r.name,
    path: r.path,
    description: r.description ?? '',
    author: r.author ?? '',
    genre: r.genre ?? [],
    cover_image: r.cover_image ?? null,
    last_opened_at: r.last_opened_at,
    deleted_at: r.deleted_at,
    created_at: r.created_at,
    updated_at: r.updated_at,
  });

  const loadData = async () => {
    await autoDeleteOldProjects();
    const active = await listProjects();
    const deleted = await listDeletedProjects();
    setProjects(active.map(mapRowToInfo));
    setDeletedProjects(deleted.map(mapRowToInfo));
    setSelectedIds(new Set());
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestore = async (id: string) => {
    await restoreProject(id);
    await loadData();
  };

  const handleHardDelete = async (id: string) => {
    await hardDeleteProject(id);
    closeTab(id);
    await loadData();
  };

  const handleEmptyTrash = async () => {
    for (const project of deletedProjects) {
      await hardDeleteProject(project.id);
      closeTab(project.id);
    }
    await loadData();
    setEmptyDialogOpen(false);
  };
  
  const handleBulkRestore = async () => {
    for (const id of Array.from(selectedIds)) {
      await restoreProject(id);
    }
    await loadData();
  };
  
  const handleBulkDelete = async () => {
    for (const id of Array.from(selectedIds)) {
      await hardDeleteProject(id);
      closeTab(id);
    }
    await loadData();
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === deletedProjects.length && deletedProjects.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(deletedProjects.map(p => p.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Unknown date';
    const d = new Date(dateStr);
    const datePart = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${datePart} • ${timePart}`;
  };

  const getDaysRemaining = (deletedAt: string | null) => {
    if (!deletedAt) return 60;
    const deletedDate = new Date(deletedAt).getTime();
    const now = new Date().getTime();
    const elapsedDays = Math.floor((now - deletedDate) / (1000 * 60 * 60 * 24));
    return Math.max(0, 60 - elapsedDays);
  };

  return (
    <div className="global-trash-page">
      <header className="global-trash-page__header">
        <div className="global-trash-page__header-title">
          <div className="trash-header-icon-box">
            <Trash2 size={24} color="#ef4444" />
          </div>
          <div className="trash-header-text">
            <h1>Trash</h1>
            <p className="trash-header-subtitle">Items in the trash are automatically deleted after 60 days.</p>
          </div>
        </div>
        
        <div className="trash-header-actions">
          {selectedIds.size > 0 && (
            <>
              <button className="trash-action-btn trash-action-btn--restore" onClick={handleBulkRestore}>
                <RotateCcw size={16} /> Restore Selected
              </button>
              <button className="trash-action-btn trash-action-btn--delete" onClick={handleBulkDelete}>
                <Trash2 size={16} /> Delete Selected
              </button>
            </>
          )}
          {deletedProjects.length > 0 && selectedIds.size === 0 && (
            <button className="trash-empty-btn" onClick={() => setEmptyDialogOpen(true)}>
              <Trash2 size={16} /> Empty Trash
            </button>
          )}
        </div>
      </header>

      <div className="global-trash-page__content">
        {deletedProjects.length === 0 ? (
          <div className="global-trash-page__empty">
            <div className="global-trash-page__empty-icon-wrap">
              <ArchiveIcon width={64} height={64} className="global-trash-page__empty-icon" />
            </div>
            <h2>Trash is empty</h2>
            <p>Deleted projects will rest here.</p>
          </div>
        ) : (
          <>
            <div className="trash-toolbar">
              <label className="trash-select-all">
                {selectedIds.size === deletedProjects.length ? (
                  <CheckSquare size={16} className="trash-checkbox-icon active" onClick={handleToggleSelectAll} />
                ) : (
                  <Square size={16} className="trash-checkbox-icon" onClick={handleToggleSelectAll} />
                )}
                <span>Select All</span>
              </label>
              
              <div className="trash-toolbar-right">
                <div className="trash-sort-dropdown">
                  <span>Date deleted (newest)</span>
                  <ChevronDown size={14} />
                </div>
                
                <div className="trash-view-toggles">
                  <button className={`trash-view-toggle ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>
                    <Grid size={16} />
                  </button>
                  <button className={`trash-view-toggle ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>
                    <List size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className={`trash-${viewMode}`}>
              {deletedProjects.map((project) => {
                const isSelected = selectedIds.has(project.id);
                const daysRemaining = getDaysRemaining(project.deleted_at);

                return (
                  <div key={project.id} className={`trash-card ${isSelected ? 'selected' : ''}`}>
                    <div className="trash-card__header">
                      <div className="trash-card__checkbox" onClick={() => handleToggleSelect(project.id)}>
                        {isSelected ? <CheckSquare size={18} className="active" color="#10b981" /> : <Square size={18} color="#6b7280" />}
                      </div>
                      <div className="trash-card__more">
                        <MoreHorizontal size={18} color="#6b7280" />
                      </div>
                    </div>

                    <div className="trash-card__content">
                      <h3 className="trash-card__title">{project.name}</h3>
                      <span className="trash-card__date">
                        Deleted: {formatDate(project.deleted_at)}
                      </span>
                      <div className="trash-card__meta">
                        <Clock size={14} color="#6b7280" /> <span>{daysRemaining} days remaining</span>
                      </div>
                      
                      <div className="trash-card__buttons">
                        <button className="trash-card-btn trash-card-btn--restore" onClick={() => handleRestore(project.id)}>
                          <RotateCcw size={14} /> Restore
                        </button>
                        <button className="trash-card-btn trash-card-btn--delete" onClick={() => handleHardDelete(project.id)}>
                          <Trash2 size={14} /> Delete Forever
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="trash-shield-footer">
              <ShieldCheck size={20} color="#ef4444" />
              <span>Deleted items are securely stored and cannot be recovered after the 60-day period.</span>
            </div>
          </>
        )}
      </div>

      <Dialog
        open={emptyDialogOpen}
        onClose={() => setEmptyDialogOpen(false)}
        title="Empty Trash"
        description="Are you sure you want to permanently delete all items in the trash? This action cannot be undone."
        confirmLabel="Empty Trash"
        cancelLabel="Cancel"
        onConfirm={handleEmptyTrash}
        variant="danger"
      />
    </div>
  );
}
