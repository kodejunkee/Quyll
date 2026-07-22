import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Feather,
  Plus,
  FolderOpen,
  MoreVertical,
  Edit2,
  Trash2,
  Search,
  Settings,
  BookOpen,
  Clock,
  ArrowRight,
  LayoutGrid,
  List,
  Lightbulb,
  Compass,
  CircleDot,
  Flame,
  TreeDeciduous,
  Sparkles,
  ArrowUpDown,
  Check,
  Download,
} from 'lucide-react';
import { Button, Modal, Input, TextArea, Dialog, Dropdown, ThemeToggle } from '@/components';
import { GlobalSettingsModal } from '@/features/settings';
import { useProjectStore } from '@/store/projectStore';
import {
  initAppDatabase,
  registerProject,
  listProjects,
  listDeletedProjects,
  renameProject as dbRename,
  softDeleteProject,
  restoreProject,
  hardDeleteProject,
  autoDeleteOldProjects,
  initializeProjectDatabase,
  openProjectDatabase,
  touchProject,
} from '@/database';
import { select } from '@/database/databaseService';
import { formatTimeAgo } from '@/features/chapters/utils/writingStats';
import { generateId } from '@/utils/uuid';
import { pickAndImportQuyllProject } from '@/services/importService';
import { Clock as ClockIcon } from 'lucide-react';
import './HomePage.css';
import '@/styles/redesign.css';

interface ProjectStats {
  chapterCount: number;
  wordCount: number;
}

// Deterministic book cover themes matching the 5 books in the screenshot
const BOOK_COVER_THEMES = [
  {
    type: 'purple',
    name: 'Fantasy',
    gradient: 'linear-gradient(135deg, #3B0764 0%, #1E1B4B 100%)',
    ribbonColor: '#A855F7',
    icon: TreeDeciduous,
  },
  {
    type: 'green',
    name: 'Fantasy / Adventure',
    gradient: 'linear-gradient(135deg, #064E3B 0%, #065F46 100%)',
    ribbonColor: '#10B981',
    icon: Compass,
  },
  {
    type: 'blue',
    name: 'Historical Fiction',
    gradient: 'linear-gradient(135deg, #1E3A8A 0%, #0F172A 100%)',
    ribbonColor: '#3B82F6',
    icon: CircleDot,
  },
  {
    type: 'brown',
    name: 'Epic Fantasy',
    gradient: 'linear-gradient(135deg, #451A03 0%, #291307 100%)',
    ribbonColor: '#F59E0B',
    icon: Flame,
  },
  {
    type: 'black',
    name: 'Mystery / Dark',
    gradient: 'linear-gradient(135deg, #18181B 0%, #09090B 100%)',
    ribbonColor: '#71717A',
    icon: Sparkles,
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
  { value: 'Western', label: 'Western' },
  { value: '__other__', label: 'Other (Type custom genre...)' },
];

function getBookTheme(index: number, genre?: string) {
  if (genre) {
    const g = genre.toLowerCase();
    if (g.includes('myst') || g.includes('dark') || g.includes('thrill')) return BOOK_COVER_THEMES[4]!;
    if (g.includes('hist') || g.includes('sci') || g.includes('space')) return BOOK_COVER_THEMES[2]!;
    if (g.includes('epic') || g.includes('dragon') || g.includes('war')) return BOOK_COVER_THEMES[3]!;
    if (g.includes('adv') || g.includes('nature') || g.includes('wander')) return BOOK_COVER_THEMES[1]!;
  }
  return BOOK_COVER_THEMES[index % BOOK_COVER_THEMES.length]!;
}

export default function HomePage() {
  const navigate = useNavigate();
  const { projects, setProjects, deletedProjects } = useProjectStore();
  const [statsMap, setStatsMap] = useState<Record<string, ProjectStats>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [viewTab, setViewTab] = useState<'active' | 'trash'>('active');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('quyll_home_view_mode') as 'grid' | 'list') || 'grid';
  });

  useEffect(() => {
    localStorage.setItem('quyll_home_view_mode', viewMode);
  }, [viewMode]);
  const [sortField, setSortField] = useState<'opened' | 'date' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newGenre, setNewGenre] = useState('');
  const [isOtherGenre, setIsOtherGenre] = useState(false);
  const [renameName, setRenameName] = useState('');

  // Track which project's action menu is open
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const fetchProjectStats = useCallback(async (projectList: typeof projects) => {
    const map: Record<string, ProjectStats> = {};
    for (const p of projectList) {
      try {
        const db = await openProjectDatabase(p.path);
        const rows = await select<{ c: number; w: number }>(
          db,
          `SELECT COUNT(*) as c, COALESCE(SUM(word_count), 0) as w FROM chapters WHERE project_id = $1 AND deleted_at IS NULL`,
          [p.id],
        );
        map[p.id] = {
          chapterCount: rows[0]?.c ?? 0,
          wordCount: rows[0]?.w ?? 0,
        };
      } catch (err) {
        // Fallback stats if project db is inaccessible
        map[p.id] = { chapterCount: 0, wordCount: 0 };
      }
    }
    setStatsMap(map);
  }, []);

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
        genre: r.genre ?? '',
        last_opened_at: r.last_opened_at,
        deleted_at: r.deleted_at,
        created_at: r.created_at,
        updated_at: r.updated_at,
      }));
      setProjects(mapped);

      const deletedRows = await listDeletedProjects();
      const mappedDeleted = deletedRows.map((r) => ({
        id: r.id,
        name: r.name,
        path: r.path,
        description: r.description ?? '',
        author: r.author ?? '',
        genre: r.genre ?? '',
        last_opened_at: r.last_opened_at,
        deleted_at: r.deleted_at,
        created_at: r.created_at,
        updated_at: r.updated_at,
      }));
      useProjectStore.getState().setDeletedProjects(mappedDeleted);

      void fetchProjectStats(mapped);
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  }, [setProjects, fetchProjectStats]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  // Listen for Ctrl+K to focus search input or open command palette
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('home-search-input');
        if (searchInput) searchInput.focus();
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
    setNewAuthor('');
    setNewGenre('');
    setIsOtherGenre(false);
    setCreateOpen(true);
    const titleInput = document.getElementById('new-project-title-input');
    if (titleInput) titleInput.focus();
  }

  const handleImportProject = async () => {
    const importedProjectId = await pickAndImportQuyllProject();
    if (importedProjectId) {
      // Reload projects to show the new one
      await loadProjects();
    }
  };

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
      setIsOtherGenre(false);
      setNewTitle('');
      setNewDescription('');
      setNewAuthor('');
      setNewGenre('');
      await touchProject(id);
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
      if (deleteTarget.id === 'empty_trash') {
        for (const project of deletedProjects) {
          await hardDeleteProject(project.id);
        }
      } else if (viewTab === 'active') {
        await softDeleteProject(deleteTarget.id);
      } else {
        await hardDeleteProject(deleteTarget.id);
      }
      await loadProjects();
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  }

  async function handleRestore(projectId: string) {
    try {
      await restoreProject(projectId);
      await loadProjects();
    } catch (err) {
      console.error('Failed to restore project:', err);
    }
  }

  function openProject(id: string) {
    if (viewTab === 'trash') return;
    navigate(`/project/${id}/dashboard`);
  }

  const activeList = viewTab === 'active' ? projects : deletedProjects;
  const filteredProjects = activeList.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.genre && p.genre.toLowerCase().includes(searchQuery.toLowerCase())) ||
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

  const heroProject = [...projects].sort((a, b) => {
    const timeA = new Date(a.last_opened_at || a.updated_at || a.created_at || 0).getTime();
    const timeB = new Date(b.last_opened_at || b.updated_at || b.created_at || 0).getTime();
    return timeB - timeA;
  })[0];
  const heroStats = heroProject
    ? statsMap[heroProject.id] ?? { chapterCount: 0, wordCount: 0 }
    : { chapterCount: 0, wordCount: 0 };
  const heroTheme = heroProject ? getBookTheme(0, heroProject.genre) : BOOK_COVER_THEMES[0]!;
  const HeroIcon = heroTheme.icon;

  return (
    <div className="home-page">
      <div className="home-page__container">
        {/* Top Header / Navigation Bar */}
        <header className="home-nav">
          <div className="home-nav__left">
            <h1 className="home-nav__brand">Quyll</h1>
            <p className="home-nav__subtitle">Professional Writing Workspace</p>
          </div>

          <div className="home-nav__right">
            <div className="home-nav__top-actions">
              <div className="home-nav__search-box">
                <Search size={15} className="home-nav__search-icon" />
                <input
                  id="home-search-input"
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="home-nav__search-input"
                />
                <kbd className="home-nav__kbd">Ctrl + K</kbd>
              </div>

              <ThemeToggle />
              <button
                className="home-nav__icon-btn"
                onClick={() => setSettingsOpen(true)}
                title="Settings"
                type="button"
              >
                <Settings size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button 
                className="home-nav__new-btn" 
                onClick={handleImportProject} 
                type="button" 
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
              >
                <Download size={16} />
                <span>Import Project</span>
              </button>
              <button className="home-nav__new-btn" onClick={openCreateDialog} type="button">
                <Plus size={16} />
                <span>New Project</span>
              </button>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="home-tabs-container">
          <button 
            className={`home-tab ${viewTab === 'active' ? 'active' : ''}`}
            onClick={() => setViewTab('active')}
            type="button"
          >
            <FolderOpen size={16} />
            <span>Projects</span>
          </button>
          <button 
            className={`home-tab home-tab--trash ${viewTab === 'trash' ? 'active' : ''}`}
            onClick={() => setViewTab('trash')}
            type="button"
          >
            <Trash2 size={16} />
            <span>Trash</span>
          </button>
        </div>

        {/* Hero Section: Continue Writing Card */}
        {heroProject && !searchQuery && viewTab === 'active' && (
          <section className="home-hero">
            <div className="home-hero__card">
              <div className="home-hero__label">
                <Feather size={14} className="home-hero__label-icon" />
                <span>Continue Writing</span>
              </div>

              <div className="home-hero__body">
                <div className="home-hero__book-wrapper">
                  <div className="hero-book-cover" style={{ background: heroTheme.gradient }}>
                    <div className="hero-book-cover__spine" />
                    <div className="hero-book-cover__emblem">
                      <HeroIcon size={26} />
                    </div>
                  </div>
                </div>

                <div className="home-hero__info">
                  <h2 className="home-hero__title" onClick={() => openProject(heroProject.id)}>
                    {heroProject.name}
                  </h2>
                  <p className="home-hero__excerpt">
                    {heroProject.description && heroProject.description.trim()
                      ? heroProject.description
                      : 'No description specified'}
                  </p>
                </div>

                <div className="home-hero__stats">
                  <div className="home-hero__stat">
                    <BookOpen size={16} className="home-hero__stat-icon" />
                    <div className="home-hero__stat-text">
                      <span className="home-hero__stat-val">{heroStats.chapterCount}</span>
                      <span className="home-hero__stat-lbl">
                        {heroStats.chapterCount === 1 ? 'Chapter' : 'Chapters'}
                      </span>
                    </div>
                  </div>

                  <div className="home-hero__stat">
                    <Feather size={16} className="home-hero__stat-icon" />
                    <div className="home-hero__stat-text">
                      <span className="home-hero__stat-val">{heroStats.wordCount.toLocaleString()}</span>
                      <span className="home-hero__stat-lbl">Words</span>
                    </div>
                  </div>

                  <div className="home-hero__stat">
                    <Clock size={16} className="home-hero__stat-icon" />
                    <div className="home-hero__stat-text">
                      <span className="home-hero__stat-val">
                        {heroProject.last_opened_at ? formatTimeAgo(heroProject.last_opened_at) : 'Not opened yet'}
                      </span>
                      <span className="home-hero__stat-lbl">Last opened</span>
                    </div>
                  </div>
                </div>

                <div className="home-hero__action">
                  <button className="home-hero__continue-btn" onClick={() => openProject(heroProject.id)} type="button">
                    <span>Continue</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Section: Recent Projects */}
        <section className="home-section">
          <div className="home-section__header">
            <h3 className="home-section__title">
              {viewTab === 'trash' ? 'Deleted Projects' : 'All Projects'}
            </h3>
            <div className="home-section__controls">
              {viewTab === 'active' ? (
                <div className="home-section__sort-wrap">
                  <button
                    className={`home-section__sort-btn ${isSortMenuOpen ? 'active' : ''}`}
                    onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                    title="Sort projects"
                    type="button"
                  >
                    <ArrowUpDown size={14} />
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
                          {active && <Check size={14} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <button
                  className="home-section__sort-btn home-tab--trash"
                  onClick={() => setDeleteTarget({ id: 'empty_trash', name: 'All Trash' })}
                  title="Empty Trash"
                  type="button"
                  disabled={deletedProjects.length === 0}
                  style={{ opacity: deletedProjects.length === 0 ? 0.5 : 1, borderColor: 'transparent' }}
                >
                  <Trash2 size={14} />
                  <span>Empty Trash</span>
                </button>
              )}

              <div className="home-section__view-toggles">
                <button
                  className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Grid view"
                  type="button"
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="List view"
                  type="button"
                >
                  <List size={15} />
                </button>
              </div>
            </div>
          </div>

          {viewTab === 'trash' && (
            <div className="home-trash-view">
              <p className="home-trash-notice">
                Projects in the trash are automatically deleted after 60 days.
              </p>
            </div>
          )}

          {sortedProjects.length === 0 ? (
            <div className="home-empty">
              <FolderOpen size={48} className="home-empty__icon" />
              <h4 className="home-empty__title">
                {viewTab === 'trash' ? 'Trash is empty' : (searchQuery ? 'No matching projects found' : 'Create your first world')}
              </h4>
              <p className="home-empty__desc">
                {viewTab === 'trash' 
                  ? 'There are no deleted projects.'
                  : (searchQuery
                    ? `We couldn't find any projects matching "${searchQuery}".`
                    : 'Build your story, chapters, characters and world in one connected workspace.')}
              </p>
              {!searchQuery && viewTab === 'active' && (
                <Button variant="primary" onClick={openCreateDialog}>
                  <Plus size={16} />
                  Create project
                </Button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="recent-projects-grid">
              {sortedProjects.map((project, idx) => {
                const stats = statsMap[project.id] ?? { chapterCount: 0, wordCount: 0 };
                const theme = getBookTheme(idx, project.genre);
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
                    {/* Realistic Book Cover Header */}
                    <div className="home-project-card__cover-wrap">
                      <div className="book-cover" style={{ background: theme.gradient }}>
                        <div className="book-cover__spine" />
                        <div className="book-cover__frame">
                          <div className="book-cover__emblem">
                            <CoverIcon size={24} />
                          </div>
                        </div>
                        <div className="book-cover__ribbon" style={{ background: theme.ribbonColor }} />
                      </div>

                      <button
                        className="home-project-card__more-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === project.id ? null : project.id);
                        }}
                        aria-label="Project Actions"
                        type="button"
                      >
                        <MoreVertical size={16} />
                      </button>

                      <div className={`home-project-card__menu ${openMenuId === project.id ? 'open' : ''}`}>
                        {viewTab === 'active' ? (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                setRenameTarget({ id: project.id, name: project.name });
                                setRenameName(project.name);
                              }}
                              type="button"
                            >
                              <Edit2 size={14} /> Rename
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
                              <Trash2 size={14} /> Delete
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                handleRestore(project.id);
                              }}
                              type="button"
                            >
                              <ClockIcon size={14} /> Restore
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
                              <Trash2 size={14} /> Permanently Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Card Body & Details */}
                    <div className="home-project-card__content">
                      <h4 className="home-project-card__title">{project.name}</h4>
                      <p className="home-project-card__genre">
                        {project.genre && project.genre.trim() ? project.genre : 'No genre specified'}
                      </p>

                      <div className="home-project-card__stats">
                        {stats.chapterCount === 0 && stats.wordCount === 0 ? (
                          <div className="home-project-card__stat-item">
                            <BookOpen size={13} />
                            <span>No chapters or words yet</span>
                          </div>
                        ) : (
                          <>
                            <div className="home-project-card__stat-item">
                              <BookOpen size={13} />
                              <span>
                                {stats.chapterCount} {stats.chapterCount === 1 ? 'Chapter' : 'Chapters'}
                              </span>
                            </div>
                            <div className="home-project-card__stat-item">
                              <Feather size={13} />
                              <span>{stats.wordCount.toLocaleString()} Words</span>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="home-project-card__footer">
                        <Clock size={12} />
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
            /* List View mode */
            <div className="recent-projects-list">
              {sortedProjects.map((project, idx) => {
                const stats = statsMap[project.id] ?? { chapterCount: 0, wordCount: 0 };
                const theme = getBookTheme(idx, project.genre);
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
                        <CoverIcon size={16} />
                      </div>
                      <div>
                        <h4 className="home-project-list-row__title">{project.name}</h4>
                        <span className="home-project-list-row__genre">
                          {project.genre && project.genre.trim() ? project.genre : 'No genre specified'}
                        </span>
                      </div>
                    </div>

                    <div className="home-project-list-row__stats">
                      {stats.chapterCount === 0 && stats.wordCount === 0 ? (
                        <span>No chapters or words yet</span>
                      ) : (
                        <>
                          <span>
                            {stats.chapterCount} {stats.chapterCount === 1 ? 'Chapter' : 'Chapters'}
                          </span>
                          <span>•</span>
                          <span>{stats.wordCount.toLocaleString()} Words</span>
                        </>
                      )}
                    </div>

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
                          type="button"
                        >
                          <MoreVertical size={16} />
                        </button>
                        
                        <div className={`home-project-card__menu ${openMenuId === project.id ? 'open' : ''}`} style={{ top: '32px', right: 0 }}>
                          {viewTab === 'active' ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(null);
                                  setRenameTarget({ id: project.id, name: project.name });
                                  setRenameName(project.name);
                                }}
                                type="button"
                              >
                                <Edit2 size={14} /> Rename
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
                                <Trash2 size={14} /> Delete
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(null);
                                  handleRestore(project.id);
                                }}
                                type="button"
                              >
                                <ClockIcon size={14} /> Restore
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
                                <Trash2 size={14} /> Permanently Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Bottom Tip Bar */}
        {viewTab !== 'trash' && (
          <footer className="home-footer-tip">
            <Lightbulb size={14} className="home-footer-tip__icon" />
            <span>Tip: Press Ctrl + K anywhere to quickly search your projects, characters, and more.</span>
          </footer>
        )}
      </div>

      {/* Create Project Modal */}
      <Modal open={createOpen} onClose={() => { setCreateOpen(false); setIsOtherGenre(false); }} title="Create New Project" size="md">
        <div className="home-modal-form">
          <Input
            label="Title"
            placeholder="e.g. The Fallen Kingdom"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
            autoFocus
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
          {(() => {
            const isKnownGenre = POPULAR_GENRES.some((g) => g.value === newGenre);
            const showCustomInput = isOtherGenre || (Boolean(newGenre) && !isKnownGenre);
            const dropdownValue = showCustomInput ? '__other__' : isKnownGenre ? newGenre : '';
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Dropdown
                  label="Genre"
                  placeholder="Select a popular genre..."
                  options={POPULAR_GENRES}
                  value={dropdownValue}
                  onChange={(val, query) => {
                    if (val === '__other__') {
                      setIsOtherGenre(true);
                      if (query && !POPULAR_GENRES.some((g) => g.value.toLowerCase() === query.toLowerCase())) {
                        setNewGenre(query);
                      } else if (isKnownGenre) {
                        setNewGenre('');
                      }
                    } else {
                      setIsOtherGenre(false);
                      setNewGenre(val);
                    }
                  }}
                />
                {showCustomInput && (
                  <Input
                    placeholder="Type your custom genre..."
                    value={isKnownGenre ? '' : newGenre}
                    onChange={(e) => setNewGenre(e.target.value)}
                    autoFocus
                  />
                )}
              </div>
            );
          })()}
          <div className="home-modal-actions">
            <Button variant="primary" onClick={handleCreate} disabled={!newTitle.trim()}>
              Create Project
            </Button>
          </div>
        </div>
      </Modal>

      {/* Rename Dialog */}
      <Modal open={!!renameTarget} onClose={() => setRenameTarget(null)} title="Rename Project" size="sm">
        <div className="home-modal-form">
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
          <div className="home-modal-actions">
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
        title={deleteTarget?.id === 'empty_trash' ? "Empty Trash" : (viewTab === 'trash' ? "Permanently Delete Project" : "Move to Trash")}
        description={
          deleteTarget?.id === 'empty_trash' 
            ? "Are you sure you want to permanently delete all projects in the trash? This cannot be undone."
            : (viewTab === 'trash'
              ? `Are you sure you want to permanently delete "${deleteTarget?.name}"? This cannot be undone.`
              : `Are you sure you want to move "${deleteTarget?.name}" to the Trash? It can be restored within 60 days.`)
        }
        confirmLabel={deleteTarget?.id === 'empty_trash' ? "Empty Trash" : (viewTab === 'trash' ? "Delete Permanently" : "Move to Trash")}
        cancelLabel="Cancel"
        onConfirm={handleDelete}
        variant="danger"
      />

      {/* Global Settings Modal */}
      <GlobalSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
