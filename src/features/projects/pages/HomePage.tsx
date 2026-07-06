import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Feather, Plus, FolderOpen } from 'lucide-react';
import { Button, EmptyState, Card } from '@/components';
import { Modal } from '@/components';
import { Input } from '@/components';
import { TextArea } from '@/components';
import { Dialog } from '@/components';
import { useProjectStore } from '@/store/projectStore';
import { initAppDatabase, registerProject, listProjects, renameProject as dbRename, unregisterProject } from '@/database';
import { generateId } from '@/utils/uuid';
import './HomePage.css';

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

  async function handleCreate() {
    if (!newTitle.trim()) return;
    const id = generateId();
    const projectPath = `projects/${id}.quyll`;
    try {
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
      <header className="home-page__header">
        <div className="home-page__brand">
          <Feather size={32} className="home-page__logo" />
          <h1 className="home-page__title">Quyll</h1>
        </div>
        <p className="home-page__subtitle">Your professional writing workspace</p>
      </header>

      <div className="home-page__actions">
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus size={16} />
          New Project
        </Button>
      </div>

      <section className="home-page__content">
        {projects.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No projects yet"
            description="Create your first project to start writing."
            actionLabel="Create Project"
            onAction={() => setCreateOpen(true)}
          />
        ) : (
          <div className="home-page__grid">
            {projects.map((project) => (
              <Card key={project.id} className="home-page__project-card">
                <div
                  className="home-page__project-content"
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
                <div className="home-page__project-actions">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setRenameTarget({ id: project.id, name: project.name }); setRenameName(project.name); }}
                  >
                    Rename
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget({ id: project.id, name: project.name })}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Create Project Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create New Project" size="md">
        <div className="home-page__form">
          <Input
            label="Title"
            placeholder="My Novel"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
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
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
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
          />
          <div className="home-page__form-actions">
            <Button variant="secondary" onClick={() => setRenameTarget(null)}>Cancel</Button>
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
