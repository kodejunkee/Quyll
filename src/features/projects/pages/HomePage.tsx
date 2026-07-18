import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Feather, Plus, FolderOpen, MoreVertical, Edit2, Trash2, Book } from 'lucide-react';
import { Button, Modal, Input, TextArea, Dialog } from '@/components';
import { useProjectStore } from '@/store/projectStore';
import { initAppDatabase, registerProject, listProjects, renameProject as dbRename, unregisterProject, initializeProjectDatabase } from '@/database';
import { generateId } from '@/utils/uuid';
import './HomePage.css';

// Helper to generate a consistent gradient based on a string (like genre)
function getGenreGradient(genre: string) {
  const hash = genre.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${hue1}, 70%, 40%), hsl(${hue2}, 80%, 30%))`;
}

export default function HomePage() {
  const navigate = useNavigate();
  const { projects, setProjects, removeProject } = useProjectStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newGenre, setNewGenre] = useState('');
  const [renameName, setRenameName] = useState('');
  
  // Track which project's action menu is open
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      await initAppDatabase();
      const rows = await listProjects();
      setProjects(rows.map((r) => ({
        id: r.id,
        name: r.name,
        path: r.path,
        description: r.description ?? '',
        author: r.author ?? '',
        genre: r.genre ?? '',
        last_opened_at: r.last_opened_at,
        created_at: r.created_at,
        updated_at: r.updated_at,
      })));
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  }, [setProjects]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (openMenuId && !(event.target as Element).closest('.home-page__project-card')) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  async function handleCreate() {
    if (!newTitle.trim()) return;
    const id = generateId();
    const projectPath = `projects/${id}.quyll`;
    try {
      await initializeProjectDatabase(projectPath, {
        id,
        title: newTitle.trim(),
        description: newDescription,
        author: newAuthor,
        genre: newGenre,
      });

      await registerProject({
        id,
        name: newTitle.trim(),
        path: projectPath,
        description: newDescription,
        author: newAuthor,
        genre: newGenre,
      });
      setCreateOpen(false);
      setNewTitle('');
      setNewDescription('');
      setNewAuthor('');
      setNewGenre('');
      await loadProjects();
      navigate(`/project/${id}/dashboard`);
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  }

  async function handleRename() {
    if (!renameTarget || !renameName.trim()) return;
    try {
      await dbRename(renameTarget.id, renameName.trim());
      await loadProjects();
      setRenameTarget(null);
    } catch (err) {
      console.error('Failed to rename project:', err);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await unregisterProject(deleteTarget.id);
      removeProject(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  }

  function openProject(id: string) {
    navigate(`/project/${id}/dashboard`);
  }

  return (
    <div className="home-page">
      <div className="home-page__background" />
      
      <div className="home-page__content-wrapper">
        <header className="home-page__header animate-fade-in">
          <div className="home-page__brand">
            <Feather size={40} className="home-page__logo" />
            <h1 className="home-page__title">Quyll</h1>
          </div>
          <p className="home-page__subtitle">Your professional writing workspace</p>
        </header>

        <div className="home-page__actions animate-fade-in" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus size={18} />
            New Project
          </Button>
        </div>

        <section className="home-page__content animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
          {projects.length === 0 ? (
            <div className="home-page__empty">
              <FolderOpen className="home-page__empty-icon" />
              <h2 className="home-page__empty-title">No projects yet</h2>
              <p className="home-page__empty-desc">
                Your workspace is empty. Create your first project to start building your world, writing chapters, and organizing lore.
              </p>
              <Button variant="primary" onClick={() => setCreateOpen(true)}>
                <Plus size={16} />
                Create Project
              </Button>
            </div>
          ) : (
            <div className="home-page__grid">
              {projects.map((project) => (
                <div key={project.id} className="home-page__project-card">
                  
                  {/* Dynamic Cover Art */}
                  <div 
                    className="home-page__project-cover" 
                    style={{ background: getGenreGradient(project.genre || project.name) }}
                    onClick={() => openProject(project.id)}
                  >
                    <Book size={48} className="home-page__project-icon" />
                  </div>

                  {/* Actions Menu */}
                  <button 
                    className="home-page__project-actions-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === project.id ? null : project.id);
                    }}
                    aria-label="Project Actions"
                  >
                    <MoreVertical size={16} />
                  </button>

                  <div className={`home-page__project-actions-menu ${openMenuId === project.id ? 'open' : ''}`}>
                    <button onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(null);
                      setRenameTarget({ id: project.id, name: project.name });
                      setRenameName(project.name);
                    }}>
                      <Edit2 size={14} /> Rename
                    </button>
                    <button className="danger" onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(null);
                      setDeleteTarget({ id: project.id, name: project.name });
                    }}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>

                  {/* Card Details */}
                  <div
                    className="home-page__project-details"
                    onClick={() => openProject(project.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && openProject(project.id)}
                  >
                    <h3 className="home-page__project-name">{project.name}</h3>
                    {project.description && (
                      <p className="home-page__project-desc">{project.description}</p>
                    )}
                    <div className="home-page__project-meta">
                      {project.genre && <span className="home-page__project-genre">{project.genre}</span>}
                      {project.author && <span className="home-page__project-author">by {project.author}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Create Project Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create New Project" size="md">
        <div className="home-page__form">
          <Input
            label="Title"
            placeholder="My Novel"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
            autoFocus
          />
          <TextArea
            label="Description"
            placeholder="A brief description of your project..."
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            rows={3}
          />
          <Input
            label="Author"
            placeholder="Your name"
            value={newAuthor}
            onChange={(e) => setNewAuthor(e.target.value)}
          />
          <Input
            label="Genre"
            placeholder="Fantasy, Sci-Fi, Mystery..."
            value={newGenre}
            onChange={(e) => setNewGenre(e.target.value)}
          />
          <div className="home-page__form-actions">
            <Button variant="primary" onClick={handleCreate} disabled={!newTitle.trim()}>
              Create Project
            </Button>
          </div>
        </div>
      </Modal>

      {/* Rename Dialog */}
      <Modal open={!!renameTarget} onClose={() => setRenameTarget(null)} title="Rename Project" size="sm">
        <div className="home-page__form">
          <Input
            label="New Name"
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && renameName.trim()) {
                handleRename();
              }
            }}
          />
          <div className="home-page__form-actions">
            <Button variant="primary" onClick={handleRename} disabled={!renameName.trim()}>
              Rename
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Project"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDelete}
        variant="danger"
      />
    </div>
  );
}
