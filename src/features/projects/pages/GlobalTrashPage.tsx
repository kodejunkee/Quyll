import { useEffect, useState } from 'react';
import { Button, Dialog } from '@/components';
import { useProjectStore } from '@/store/projectStore';
import { 
  listProjects, 
  listDeletedProjects, 
  restoreProject, 
  hardDeleteProject, 
  autoDeleteOldProjects 
} from '@/database/appDatabase';
import {
  MagicWandIcon,
  GlobeIcon,
  DrawingPinIcon,
  LightningBoltIcon,
  StarIcon,
  TrashIcon,
  ResetIcon,
  InfoCircledIcon,
  ArchiveIcon,
} from '@radix-ui/react-icons';
import { convertFileSrc } from '@tauri-apps/api/core';
import './GlobalTrashPage.css';

// Deterministic book cover themes matching the Home screen
const BOOK_COVER_THEMES = [
  {
    type: 'purple',
    name: 'Fantasy',
    gradient: 'linear-gradient(135deg, #3B0764 0%, #1E1B4B 100%)',
    icon: MagicWandIcon,
  },
  {
    type: 'green',
    name: 'Fantasy / Adventure',
    gradient: 'linear-gradient(135deg, #064E3B 0%, #065F46 100%)',
    icon: GlobeIcon,
  },
  {
    type: 'blue',
    name: 'Historical Fiction',
    gradient: 'linear-gradient(135deg, #1E3A8A 0%, #0F172A 100%)',
    icon: DrawingPinIcon,
  },
  {
    type: 'brown',
    name: 'Epic Fantasy',
    gradient: 'linear-gradient(135deg, #451A03 0%, #291307 100%)',
    icon: LightningBoltIcon,
  },
  {
    type: 'black',
    name: 'Mystery / Dark',
    gradient: 'linear-gradient(135deg, #18181B 0%, #09090B 100%)',
    icon: StarIcon,
  },
];

function getBookTheme(index: number, genre?: string[]) {
  if (genre && genre.length > 0) {
    const g = genre.join(' ').toLowerCase();
    if (g.includes('myst') || g.includes('dark') || g.includes('thrill')) return BOOK_COVER_THEMES[4]!;
    if (g.includes('hist') || g.includes('sci') || g.includes('space')) return BOOK_COVER_THEMES[2]!;
    if (g.includes('epic') || g.includes('dragon') || g.includes('war')) return BOOK_COVER_THEMES[3]!;
    if (g.includes('adv') || g.includes('nature') || g.includes('wander')) return BOOK_COVER_THEMES[1]!;
  }
  return BOOK_COVER_THEMES[index % BOOK_COVER_THEMES.length]!;
}

export function GlobalTrashPage() {
  const { deletedProjects, setDeletedProjects, setProjects, closeTab } = useProjectStore();
  const [emptyDialogOpen, setEmptyDialogOpen] = useState(false);

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
          <TrashIcon width={24} height={24} className="trash-header-icon" />
          <h1>Trash</h1>
        </div>
        {deletedProjects.length > 0 && (
          <button className="trash-empty-btn" onClick={() => setEmptyDialogOpen(true)}>
            Empty Trash
          </button>
        )}
      </header>

      <div className="global-trash-page__content">
        <div className="global-trash-page__notice">
          <InfoCircledIcon width={16} height={16} />
          Items in the trash are automatically permanently deleted after 60 days.
        </div>

        {deletedProjects.length === 0 ? (
          <div className="global-trash-page__empty">
            <div className="global-trash-page__empty-icon-wrap">
              <ArchiveIcon width={64} height={64} className="global-trash-page__empty-icon" />
            </div>
            <h2>Trash is empty</h2>
            <p>Deleted projects will rest here.</p>
          </div>
        ) : (
          <div className="trash-grid">
            {deletedProjects.map((project, idx) => {
              const theme = getBookTheme(idx, project.genre);
              const CoverIcon = theme.icon;

              return (
                <div key={project.id} className="trash-card">
                  <div className="trash-card__cover-wrap">
                    {project.cover_image ? (
                      <div className="trash-card__cover custom-cover">
                        <img 
                          src={convertFileSrc(project.cover_image)} 
                          alt="Project Cover"
                          className="trash-card__image"
                          onError={() => console.error("Image failed to load:", convertFileSrc(project.cover_image!))}
                        />
                      </div>
                    ) : (
                      <div className="trash-card__cover" style={{ background: theme.gradient }}>
                        <div className="trash-cover__spine" />
                        <div className="trash-cover__frame">
                          <div className="trash-cover__emblem">
                            <CoverIcon width={24} height={24} />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Glassmorphism actions overlay on hover */}
                    <div className="trash-card__actions-overlay">
                      <button 
                        className="trash-btn trash-btn--restore"
                        onClick={() => handleRestore(project.id)}
                        title="Restore Project"
                      >
                        <ResetIcon width={16} height={16} />
                      </button>
                      <button 
                        className="trash-btn trash-btn--delete"
                        onClick={() => handleHardDelete(project.id)}
                        title="Permanently Delete"
                      >
                        <TrashIcon width={16} height={16} />
                      </button>
                    </div>
                  </div>

                  <div className="trash-card__content">
                    <h3 className="trash-card__title">{project.name}</h3>
                    <span className="trash-card__date">
                      Deleted: {formatDate(project.deleted_at)}
                    </span>
                  </div>
                </div>
              );
            })}
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
