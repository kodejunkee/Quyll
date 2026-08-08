import { useEffect, useState } from 'react';
import { Trash2, RotateCcw, Info } from 'lucide-react';
import { Button, Dialog } from '@/components';
import { useProjectStore } from '@/store/projectStore';
import { 
  listProjects, 
  listDeletedProjects, 
  restoreProject, 
  hardDeleteProject, 
  autoDeleteOldProjects 
} from '@/database/appDatabase';
import './GlobalTrashPage.css';

export function GlobalTrashPage() {
  const { deletedProjects, setDeletedProjects, setProjects, closeTab } = useProjectStore();
  const [emptyDialogOpen, setEmptyDialogOpen] = useState(false);

  const mapRowToInfo = (r: any) => ({
    id: r.id,
    name: r.name,
    path: r.path,
    description: r.description ?? '',
    author: r.author ?? '',
    genre: r.genre ?? '',
    tags: r.tags ? JSON.parse(r.tags) : [],
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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Unknown date';
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="global-trash-page">
      <header className="global-trash-page__header">
        <div className="global-trash-page__header-title">
          <Trash2 size={24} />
          <h1>Trash</h1>
        </div>
        {deletedProjects.length > 0 && (
          <Button variant="danger" onClick={() => setEmptyDialogOpen(true)}>
            Empty Trash
          </Button>
        )}
      </header>

      <div className="global-trash-page__content">
        <div className="global-trash-page__notice">
          <Info size={16} />
          Items in the trash are automatically deleted after 60 days.
        </div>

        {deletedProjects.length === 0 ? (
          <div className="global-trash-page__empty">
            <Trash2 size={64} className="global-trash-page__empty-icon" />
            <h2>Trash is empty</h2>
            <p>Deleted projects will appear here.</p>
          </div>
        ) : (
          <div className="trash-grid">
            {deletedProjects.map((project) => (
              <div key={project.id} className="trash-card">
                <h3 className="trash-card__title">{project.name}</h3>
                <span className="trash-card__date">
                  Deleted: {formatDate(project.deleted_at)}
                </span>
                
                <div className="trash-card__actions">
                  <button 
                    className="trash-card__btn trash-card__btn--restore"
                    onClick={() => handleRestore(project.id)}
                  >
                    <RotateCcw size={14} /> Restore
                  </button>
                  <button 
                    className="trash-card__btn trash-card__btn--delete"
                    onClick={() => handleHardDelete(project.id)}
                  >
                    <Trash2 size={14} /> Permanently Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
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
