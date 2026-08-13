import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  GridIcon,
  ListBulletIcon,
  GlobeIcon,
  DrawingPinIcon,
  LightningBoltIcon,
  StarIcon,
  MagicWandIcon,
  CaretSortIcon,
  CheckIcon,
  ImageIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DotsVerticalIcon,
  LayersIcon,
  Pencil2Icon,
  TrashIcon
} from '@radix-ui/react-icons';
import { Button, Modal, Input, TextArea, Dialog, GenreInput } from '@/components';
import { useProjectStore } from '@/store/projectStore';
import { useThemeStore } from '@/store/themeStore';
import {
  initAppDatabase,
  registerProject,
  listProjects,
  editProject as dbEdit,
  softDeleteProject,
  autoDeleteOldProjects,
  initializeProjectDatabase,
  touchProject,
  setProjectCover,
} from '@/database';
import { formatTimeAgo } from '@/features/chapters/utils/writingStats';
import { generateId } from '@/utils/uuid';
// Removed unused ClockIcon import
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';
import './HomePage.css';
import '@/styles/redesign.css';

// Deterministic book cover themes matching the 5 books in the screenshot
const BOOK_COVER_THEMES = [
  {
    type: 'purple',
    name: 'Fantasy',
    gradient: 'linear-gradient(135deg, #3B0764 0%, #1E1B4B 100%)',
    ribbonColor: '#A855F7',
    icon: MagicWandIcon,
  },
  {
    type: 'green',
    name: 'Fantasy / Adventure',
    gradient: 'linear-gradient(135deg, #064E3B 0%, #065F46 100%)',
    ribbonColor: '#10B981',
    icon: GlobeIcon,
  },
  {
    type: 'blue',
    name: 'Historical Fiction',
    gradient: 'linear-gradient(135deg, #1E3A8A 0%, #0F172A 100%)',
    ribbonColor: '#3B82F6',
    icon: DrawingPinIcon,
  },
  {
    type: 'brown',
    name: 'Epic Fantasy',
    gradient: 'linear-gradient(135deg, #451A03 0%, #291307 100%)',
    ribbonColor: '#F59E0B',
    icon: LightningBoltIcon,
  },
  {
    type: 'black',
    name: 'Mystery / Dark',
    gradient: 'linear-gradient(135deg, #18181B 0%, #09090B 100%)',
    ribbonColor: '#71717A',
    icon: StarIcon,
  },
];

const POPULAR_GENRES = [
  { value: 'Fantasy', label: 'Fantasy' },
  { value: 'Dark Fantasy', label: 'Dark Fantasy' },
  { value: 'High Fantasy', label: 'High Fantasy' },
  { value: 'Urban Fantasy', label: 'Urban Fantasy' },
  { value: 'Science Fiction', label: 'Science Fiction' },
  { value: 'Space Opera', label: 'Space Opera' },
  { value: 'Cyberpunk', label: 'Cyberpunk' },
  { value: 'Dystopian', label: 'Dystopian' },
  { value: 'Mystery', label: 'Mystery' },
  { value: 'Thriller & Suspense', label: 'Thriller & Suspense' },
  { value: 'Crime & Detective', label: 'Crime & Detective' },
  { value: 'Historical Fiction', label: 'Historical Fiction' },
  { value: 'Romance', label: 'Romance' },
  { value: 'Paranormal Romance', label: 'Paranormal Romance' },
  { value: 'Horror', label: 'Horror' },
  { value: 'Supernatural & Gothic', label: 'Supernatural & Gothic' },
  { value: 'Adventure', label: 'Adventure' },
  { value: 'Action', label: 'Action' },
  { value: 'Literary Fiction', label: 'Literary Fiction' },
  { value: 'Contemporary Fiction', label: 'Contemporary Fiction' },
  { value: 'Magical Realism', label: 'Magical Realism' },
  { value: 'Young Adult (YA)', label: 'Young Adult (YA)' },
  { value: 'New Adult', label: 'New Adult' },
  { value: 'Children\'s Literature', label: 'Children\'s Literature' },
  { value: 'Drama & Tragedy', label: 'Drama & Tragedy' },
  { value: 'Comedy & Satire', label: 'Comedy & Satire' },
  { value: 'Poetry & Verse', label: 'Poetry & Verse' },
  { value: 'Memoir & Autobiography', label: 'Memoir & Autobiography' },
  { value: 'Biography', label: 'Biography' },
  { value: 'Non-Fiction', label: 'Non-Fiction' },
  { value: 'Self-Help & Philosophy', label: 'Self-Help & Philosophy' },
  { value: 'True Crime', label: 'True Crime' },
  { value: 'Mythology & Folklore', label: 'Mythology & Folklore' },
  { value: 'LitRPG & GameLit', label: 'LitRPG & GameLit' },
  { value: 'Steampunk', label: 'Steampunk' },
];

function getBookTheme(projectId: string, genre?: string[], themeIndex?: number | null) {
  if (genre && genre.length > 0) {
    const g = genre.join(' ').toLowerCase();
    if (g.includes('myst') || g.includes('dark') || g.includes('thrill')) return BOOK_COVER_THEMES[4]!;
    if (g.includes('hist') || g.includes('sci') || g.includes('space')) return BOOK_COVER_THEMES[2]!;
    if (g.includes('epic') || g.includes('dragon') || g.includes('war')) return BOOK_COVER_THEMES[3]!;
    if (g.includes('adv') || g.includes('nature') || g.includes('wander')) return BOOK_COVER_THEMES[1]!;
  }
  
  // Use the strictly tracked index in the database.
  // (Defaults to 0 if something goes wrong or for old deleted projects).
  const index = themeIndex != null ? Math.abs(themeIndex) : 0;
  return BOOK_COVER_THEMES[index % BOOK_COVER_THEMES.length]!;
}

export default function HomePage() {
  const navigate = useNavigate();
  const { projects, setProjects, openTab, openTabs, closeTab } = useProjectStore();
  const { authorName } = useThemeStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('quyll_home_view_mode') as 'grid' | 'list') || 'grid';
  });

  useEffect(() => {
    localStorage.setItem('quyll_home_view_mode', viewMode);
  }, [viewMode]);
  const [sortField, setSortField] = useState<'opened' | 'date' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollButtons = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
    }
  }, []);

  useEffect(() => {
    updateScrollButtons();
    const current = scrollRef.current;
    if (current) {
      current.addEventListener('scroll', updateScrollButtons);
    }
    window.addEventListener('resize', updateScrollButtons);
    return () => {
      if (current) current.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [updateScrollButtons, projects]);

  const handleScrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setIsSortMenuOpen(false);
      }
    };

    if (isSortMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSortMenuOpen]);

  const [createOpen, setCreateOpen] = useState(false);
  const createTitleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (createOpen && createTitleInputRef.current) {
      setTimeout(() => createTitleInputRef.current?.focus(), 10);
    }
  }, [createOpen]);

  useEffect(() => {
    const handleOpenCreate = () => setCreateOpen(true);
    window.addEventListener('open-create-project', handleOpenCreate);
    return () => window.removeEventListener('open-create-project', handleOpenCreate);
  }, []);


  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newGenre, setNewGenre] = useState<string[]>([]);
  const [editTarget, setEditTarget] = useState<{ id: string; name: string; description: string; author: string; genre: string[] } | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editGenre, setEditGenre] = useState<string[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      await initAppDatabase();
      await autoDeleteOldProjects();
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
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  }, [setProjects]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('home-search-input');
        if (searchInput) searchInput.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setNewTitle('');
        setNewDescription('');
        setNewAuthor(useThemeStore.getState().authorName);
        setNewGenre([]);
        setCreateOpen(true);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (openMenuId && !(event.target as Element).closest('.home-project-card') && !(event.target as Element).closest('.home-project-list-row')) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  function openCreateDialog() {
    setNewTitle('');
    setNewDescription('');
    setNewAuthor(authorName);
    setNewGenre([]);
    setCreateOpen(true);
    const titleInput = document.getElementById('new-project-title-input');
    if (titleInput) titleInput.focus();
  }

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
      await loadProjects();
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

  async function handleEdit() {
    if (!editTarget || !editName.trim()) return;
    try {
      await dbEdit(editTarget.id, {
        name: editName.trim(),
        description: editDescription,
        genre: editGenre,
      });
      await loadProjects();
      setEditTarget(null);
    } catch (err) {
      console.error('Failed to rename project:', err);
    }
  }

  async function handleChangeCover(projectId: string) {
    try {
      const selectedPath = await open({
        multiple: false,
        filters: [{ name: 'Image', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
      });
      if (selectedPath && typeof selectedPath === 'string') {
        await setProjectCover(projectId, selectedPath);
        await loadProjects();
      }
    } catch (err) {
      console.error('Failed to change cover art:', err);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await softDeleteProject(deleteTarget.id);
      closeTab(deleteTarget.id);
      await loadProjects();
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  }

  function openProject(id: string) {
    const project = projects.find(p => p.id === id);
    if (project) {
      // Check if already open in a tab — switch to it
      const existingTab = openTabs.find(t => t.projectId === id);
      if (existingTab) {
        openTab(project, existingTab.lastRoute);
        navigate(existingTab.lastRoute);
        return;
      }
      openTab(project, `/project/${id}/dashboard`);
    }
    navigate(`/project/${id}/dashboard`);
  }

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.genre && p.genre.join(', ').toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    let comp = 0;
    if (sortField === 'name') {
      comp = a.name.localeCompare(b.name);
    } else if (sortField === 'date') {
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      comp = timeA - timeB;
    } else {
      const timeA = new Date(a.last_opened_at || a.updated_at || a.created_at || 0).getTime();
      const timeB = new Date(b.last_opened_at || b.updated_at || b.created_at || 0).getTime();
      comp = timeA - timeB;
    }
    return sortOrder === 'asc' ? comp : -comp;
  });

  const recentProjects = [...projects].sort((a, b) => {
    const timeA = new Date(a.last_opened_at || a.updated_at || a.created_at || 0).getTime();
    const timeB = new Date(b.last_opened_at || b.updated_at || b.created_at || 0).getTime();
    return timeB - timeA;
  }).slice(0, 5);

  return (
    <div className="home-page">
      <div className="home-page__container">
        {projects.length === 0 ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="home-empty" style={{ border: 'none', background: 'transparent', padding: 0 }}>
              <LayersIcon width={64} height={64} className="home-empty__icon" style={{ marginBottom: '24px' }} />
              <h2 className="home-empty__title" style={{ fontSize: '1.75rem', marginBottom: '16px' }}>Create your first world</h2>
              <p className="home-empty__desc" style={{ fontSize: '1rem', marginBottom: '40px' }}>
                Build your story, chapters, characters and world in one connected workspace.
              </p>
            <Button variant="primary" onClick={openCreateDialog} style={{ padding: '12px 24px', fontSize: '1rem', height: 'auto', borderRadius: '8px' }}>
              <PlusIcon width={20} height={20} style={{ marginRight: '8px' }} />
              Create Project
            </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Top Search Section */}
            <section className="home-search-section">
          <div className="home-search-bar">
            <MagnifyingGlassIcon width={18} height={18} className="home-search-icon" />
            <input
              id="home-search-input"
              type="text"
              placeholder="Search your projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="home-search-input"
            />
            <kbd className="home-search-kbd">Ctrl K</kbd>
          </div>
        </section>

        {/* Recent Projects */}
        {!searchQuery && (
          <section className="home-section">
            <div className="home-section__header-box" style={{ '--section-color': '#A855F7' } as React.CSSProperties}>
              <h3 className="home-section__title">
                <ClockIcon width={18} height={18} className="home-section__icon" />
                Recent Projects
              </h3>
            </div>
            <div className="home-recent-carousel">
              <button 
                className="home-recent-scroll-btn left" 
                onClick={handleScrollLeft}
                disabled={!canScrollLeft}
                aria-label="Scroll left"
              >
                <ChevronLeftIcon width={20} height={20} />
              </button>
              
              <div className="home-recent-row" ref={scrollRef}>
              {/* Create New Project Card */}
              <div
                className="home-project-card create-new"
                onClick={openCreateDialog}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && openCreateDialog()}
              >
                <div className="create-new__icon">
                  <PlusIcon width={32} height={32} />
                </div>
                <span className="create-new__text">Create new project</span>
              </div>

              {recentProjects.map((project, idx) => {
                const theme = getBookTheme(project.id, project.genre, (project as any).theme_index);
                
                return (
                  <div
                    key={project.id}
                    className="home-project-card recent-card"
                    onClick={() => openProject(project.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="recent-card__cover" style={{ background: theme.gradient }}>
                      {project.cover_image && (
                        <img 
                          src={convertFileSrc(project.cover_image)} 
                          alt="" 
                          className="recent-card__image"
                        />
                      )}
                    </div>
                    <div className="recent-card__info">
                      <h4 className="recent-card__title">{project.name}</h4>
                      <button className="recent-card__continue" onClick={(e) => { e.stopPropagation(); openProject(project.id); }}>
                        Continue
                      </button>
                    </div>
                  </div>
                );
              })}
              </div>

              <button 
                className="home-recent-scroll-btn right" 
                onClick={handleScrollRight}
                disabled={!canScrollRight}
                aria-label="Scroll right"
              >
                <ChevronRightIcon width={20} height={20} />
              </button>
            </div>
          </section>
        )}

        {/* All Projects */}
        <section className="home-section all-projects-section">
          <div className="home-section__header-box" style={{ '--section-color': '#F59E0B' } as React.CSSProperties}>
            <h3 className="home-section__title">
              <LayersIcon width={18} height={18} className="home-section__icon" />
              All Projects
            </h3>
            <div className="home-section__controls">
              <div className="home-section__sort-wrap" ref={sortMenuRef}>
                <button
                  className={`home-section__sort-btn ${isSortMenuOpen ? 'active' : ''}`}
                  onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                  title="Sort projects"
                  type="button"
                >
                  <CaretSortIcon width={14} height={14} />
                  <span>Sort</span>
                </button>
                <div className={`home-section__sort-menu ${isSortMenuOpen ? 'open' : ''}`}>
                  {[
                    { label: 'Last Edited (Newest)', field: 'opened' as const, order: 'desc' as const },
                    { label: 'Last Edited (Oldest)', field: 'opened' as const, order: 'asc' as const },
                    { label: 'Date Created (Newest)', field: 'date' as const, order: 'desc' as const },
                    { label: 'Date Created (Oldest)', field: 'date' as const, order: 'asc' as const },
                    { label: 'Name (A - Z)', field: 'name' as const, order: 'asc' as const },
                    { label: 'Name (Z - A)', field: 'name' as const, order: 'desc' as const },
                  ].map((opt) => {
                    const active = sortField === opt.field && sortOrder === opt.order;
                    return (
                      <button
                        key={`${opt.field}-${opt.order}`}
                        className={`home-section__sort-item ${active ? 'active' : ''}`}
                        onClick={() => {
                          setSortField(opt.field);
                          setSortOrder(opt.order);
                          setIsSortMenuOpen(false);
                        }}
                        type="button"
                      >
                        <span>{opt.label}</span>
                        {active && <CheckIcon width={14} height={14} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="home-section__view-toggles">
                <button
                  className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Grid view"
                  type="button"
                >
                  <GridIcon width={15} height={15} />
                </button>
                <button
                  className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="List view"
                  type="button"
                >
                  <ListBulletIcon width={15} height={15} />
                </button>
              </div>
            </div>
          </div>

          {sortedProjects.length === 0 ? (
            <div className="home-empty">
              <LayersIcon width={48} height={48} className="home-empty__icon" />
              <h4 className="home-empty__title">
                {searchQuery ? 'No matching projects found' : 'Create your first world'}
              </h4>
              <p className="home-empty__desc">
                {searchQuery
                  ? `We couldn't find any projects matching "${searchQuery}".`
                  : 'Build your story, chapters, characters and world in one connected workspace.'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="recent-projects-grid">
              {sortedProjects.map((project, idx) => {
                const theme = getBookTheme(project.id, project.genre, (project as any).theme_index);
                const CoverIcon = theme.icon;

                return (
                  <div
                    key={project.id}
                    className="home-project-card"
                    onClick={() => openProject(project.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && openProject(project.id)}
                  >
                    <div className="home-project-card__cover-wrap">
                      {project.cover_image ? (
                        <div className="book-cover custom-cover" style={{ position: 'relative', overflow: 'hidden' }}>
                          <img 
                            src={convertFileSrc(project.cover_image)} 
                            alt="Project Cover"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={() => console.error("Image failed to load:", convertFileSrc(project.cover_image!))}
                          />
                        </div>
                      ) : (
                        <div className="book-cover" style={{ background: theme.gradient }}>
                          <div className="book-cover__spine" />
                          <div className="book-cover__frame">
                            <div className="book-cover__emblem">
                              <CoverIcon width={24} height={24} />
                            </div>
                          </div>
                          <div className="book-cover__ribbon" style={{ background: theme.ribbonColor }} />
                        </div>
                      )}

                      <button
                        className="home-project-card__more-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === project.id ? null : project.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation();
                          }
                        }}
                        aria-label="Project Actions"
                        type="button"
                      >
                        <DotsVerticalIcon width={16} height={16} />
                      </button>

                      <div className={`home-project-card__menu ${openMenuId === project.id ? 'open' : ''}`}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
                            handleChangeCover(project.id);
                          }}
                          type="button"
                        >
                          <ImageIcon width={14} height={14} /> Change Cover Art
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditTarget({ id: project.id, name: project.name, description: project.description, author: project.author, genre: project.genre });
                            setEditName(project.name);
                            setEditDescription(project.description);
                            setEditAuthor(project.author);
                            setEditGenre(project.genre);
                            setTimeout(() => {
                              const input = document.getElementById('edit-project-title-input');
                              if (input) input.focus();
                            }, 10);
                          }}
                          type="button"
                        >
                          <Pencil2Icon width={14} height={14} /> Edit Project
                        </button>
                        <button
                          className="danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
                            setDeleteTarget({ id: project.id, name: project.name });
                          }}
                          type="button"
                        >
                          <TrashIcon width={14} height={14} /> Delete
                        </button>
                      </div>
                    </div>

                    <div className="home-project-card__content">
                      <h4 className="home-project-card__title">{project.name}</h4>
                      <p className="home-project-card__genre">
                        {project.genre && project.genre.length > 0 ? project.genre.join(', ') : 'No genre specified'}
                      </p>

                      {/* Stats removed */}

                      <div className="home-project-card__footer">
                        <ClockIcon width={12} height={12} />
                        <span>
                          {project.last_opened_at ? formatTimeAgo(project.last_opened_at) : 'Not opened yet'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="recent-projects-list">
              {sortedProjects.map((project, idx) => {
                const theme = getBookTheme(project.id, project.genre, (project as any).theme_index);
                const CoverIcon = theme.icon;

                return (
                  <div
                    key={project.id}
                    className="home-project-list-row"
                    onClick={() => openProject(project.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && openProject(project.id)}
                  >
                    <div className="home-project-list-row__left">
                      <div className="list-book-thumb" style={{ background: theme.gradient }}>
                        <CoverIcon width={16} height={16} />
                      </div>
                      <div>
                        <h4 className="home-project-list-row__title">{project.name}</h4>
                        <span className="home-project-list-row__genre">
                          {project.genre && project.genre.length > 0 ? project.genre.join(', ') : 'No genre specified'}
                        </span>
                      </div>
                    </div>

                    {/* Stats removed */}

                    <div className="home-project-list-row__right">
                      <span className="home-project-list-row__time">
                        {project.last_opened_at ? formatTimeAgo(project.last_opened_at) : 'Not opened yet'}
                      </span>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <button
                          className="home-project-card__more-btn list-more"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === project.id ? null : project.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.stopPropagation();
                            }
                          }}
                          type="button"
                        >
                          <DotsVerticalIcon width={16} height={16} />
                        </button>
                        
                        <div className={`home-project-card__menu ${openMenuId === project.id ? 'open' : ''}`} style={{ top: '32px', right: 0 }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditTarget({ id: project.id, name: project.name, description: project.description, author: project.author, genre: project.genre });
                              setEditName(project.name);
                              setEditDescription(project.description);
                              setEditAuthor(project.author);
                              setEditGenre(project.genre);
                              setTimeout(() => {
                                const input = document.getElementById('edit-project-title-input');
                                if (input) input.focus();
                              }, 10);
                            }}
                            type="button"
                          >
                            <Pencil2Icon width={14} height={14} /> Edit Project
                          </button>
                          <button
                            className="danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(null);
                              setDeleteTarget({ id: project.id, name: project.name });
                            }}
                            type="button"
                          >
                            <TrashIcon width={14} height={14} /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        </>
        )}
      </div>

      {/* Create Project Modal */}
      <Modal open={createOpen} onClose={() => { setCreateOpen(false); }} title="Create New Project" size="md" preventBackdropClose>
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
            label="Description / Excerpt"
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
          <div className="home-modal-actions">
            <Button variant="primary" type="submit" disabled={!newTitle.trim()}>
              Create Project
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Project Modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Project" size="md">
        <form className="home-modal-form" onSubmit={(e) => { e.preventDefault(); if (editName.trim()) handleEdit(); }}>
          <Input
            label="Title"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
            autoFocus
            ref={(el) => {
              if (el && !!editTarget) {
                setTimeout(() => el.focus(), 10);
              }
            }}
          />
          <TextArea
            label="Description / Excerpt"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            rows={3}
          />
          <Input
            label="Author"
            value={editAuthor}
            onChange={(e) => setEditAuthor(e.target.value)}
            disabled={true}
          />
          <GenreInput
            label="Genres"
            placeholder="e.g. Fantasy, Sci-Fi, Romance"
            genres={editGenre}
            onChange={setEditGenre}
            options={POPULAR_GENRES}
          />
          <div className="home-modal-actions">
            <Button variant="primary" type="submit" disabled={!editName.trim()}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Move to Trash"
        description={`Are you sure you want to move "${deleteTarget?.name}" to the Trash? It can be restored within 60 days.`}
        confirmLabel="Move to Trash"
        cancelLabel="Cancel"
        onConfirm={handleDelete}
        variant="danger"
      />
    </div>
  );
}
