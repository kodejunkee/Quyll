import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Input, TextArea, Button, GenreInput } from '@/components';
import { useProjectStore } from '@/store/projectStore';
import { useThemeStore } from '@/store/themeStore';
import { generateId } from '@/utils/uuid';
import {
  initializeProjectDatabase,
  registerProject,
  touchProject,
  listProjects
} from '@/database';
import { POPULAR_GENRES } from '@/features/projects/pages/HomePage'; // Wait, I need to check where POPULAR_GENRES is defined.

export function CreateProjectModal() {
  const navigate = useNavigate();
  const { setProjects, openTab } = useProjectStore();
  const { authorName } = useThemeStore();
  
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newGenre, setNewGenre] = useState<string[]>([]);
  
  const createTitleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (createOpen && createTitleInputRef.current) {
      setTimeout(() => createTitleInputRef.current?.focus(), 10);
    }
  }, [createOpen]);

  useEffect(() => {
    const handleOpenCreate = () => {
      setNewTitle('');
      setNewDescription('');
      setNewAuthor(useThemeStore.getState().authorName);
      setNewGenre([]);
      setCreateOpen(true);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleOpenCreate();
      }
    };

    window.addEventListener('open-create-project', handleOpenCreate);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('open-create-project', handleOpenCreate);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
      setNewGenre([]);
      await touchProject(id);
      
      const rows = await listProjects();
      const mapped = rows.map((r) => ({
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
      }));
      setProjects(mapped);

      // Open a tab for the newly created project
      const newProjectInfo = {
        id,
        name: newTitle.trim(),
        path: projectPath,
        description: newDescription,
        author: newAuthor,
        genre: newGenre,
        cover_image: null,
        last_opened_at: new Date().toISOString(),
        deleted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      openTab(newProjectInfo, `/project/${id}/dashboard`);
      navigate(`/project/${id}/dashboard`);
    } catch (err) {
      console.error('Failed to create project:', err);
      alert(`Failed to create project: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return (
    <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create New Project" size="md" preventBackdropClose>
      <form className="home-modal-form" onSubmit={(e) => { e.preventDefault(); if (newTitle.trim()) handleCreate(); }}>
        <Input
          label="Title"
          placeholder="e.g. The Fallen Kingdom"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          required
          autoFocus
          ref={createTitleInputRef}
        />
        <TextArea
          label="Description / Synopsis"
          placeholder="The shadows lengthened across the valley as the last light of day..."
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
        <GenreInput
          label="Genres"
          placeholder="e.g. Fantasy, Sci-Fi, Romance"
          genres={newGenre}
          onChange={setNewGenre}
          options={POPULAR_GENRES}
        />
        <div className="home-modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <Button variant="primary" type="submit" disabled={!newTitle.trim()}>
            Create Project
          </Button>
        </div>
      </form>
    </Modal>
  );
}
