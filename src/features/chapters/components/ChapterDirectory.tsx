import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, LayoutGrid, List, Clock, FileText, MoreVertical, Pencil, Copy, Trash2, Plus } from 'lucide-react';
import { formatTimeAgo } from '../utils/writingStats';
import { EmptyState, Button, SearchBar, Modal, Dialog } from '@/components';
import { ChapterForm } from './ChapterForm';
import { useSearch } from '@/hooks';
import type { Chapter } from '@/types/database';
import type { ChapterFormData } from '../types/chapter';
import './ChapterDirectory.css';

interface ChapterDirectoryProps {
  projectId: string;
  chapters: Chapter[];
  loading: boolean;
  onCreateChapter: () => void;
  onRename: (id: string, title: string) => Promise<void>;
  onDuplicate: (chapter: Chapter) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function ChapterDirectory({ 
  projectId, 
  chapters, 
  loading, 
  onCreateChapter,
  onRename,
  onDuplicate,
  onDelete
}: ChapterDirectoryProps) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<Chapter | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Chapter | null>(null);
  
  const { query, setQuery, filterItems } = useSearch();

  useEffect(() => {
    if (!contextMenuId) return;
    function handleClickOutside() {
      setContextMenuId(null);
    }
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [contextMenuId]);

  const filtered = filterItems(chapters, (c) => `${c.chapter_number} ${c.title}`);

  async function handleRename(data: ChapterFormData) {
    if (!renameTarget) return;
    await onRename(renameTarget.id, data.title);
    setRenameTarget(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await onDelete(deleteTarget.id);
    setDeleteTarget(null);
  }

  if (loading) {
    return <div className="chapter-directory__loading">Loading chapters...</div>;
  }

  if (chapters.length === 0) {
    return (
      <div className="chapter-directory__empty-state">
        <EmptyState
          icon={BookOpen}
          title="No chapters yet"
          description="Create your first chapter to start writing your manuscript."
          actionLabel="Create Chapter"
          onAction={onCreateChapter}
        />
      </div>
    );
  }

  return (
    <div className="chapter-directory">
      <div className="chapter-directory__header">
        <div>
          <span className="page-eyebrow">Manuscript</span>
          <h1 className="chapter-directory__title">Chapter Directory</h1>
          <p className="chapter-directory__subtitle">Select a chapter to continue writing, or create a new one.</p>
        </div>
        <div className="chapter-directory__header-actions">
          <Button variant="primary" icon={<Plus size={16} />} onClick={onCreateChapter}>
            New Chapter
          </Button>
        </div>
      </div>

      <div className="chapter-directory__toolbar">
        <div className="chapter-directory__search">
          <SearchBar value={query} onChange={setQuery} placeholder="Search chapters..." />
        </div>
        <div className="chapter-directory__view-toggle">
          <Button
            variant={viewMode === 'grid' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid size={14} /> Grid
          </Button>
          <Button
            variant={viewMode === 'list' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List size={14} /> List
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No matches"
          description={`No chapters match "${query}"`}
        />
      ) : (
        <div className={`chapter-directory__content chapter-directory__content--${viewMode}`}>
          {filtered.map((chapter) => (
            <div 
              key={chapter.id} 
              className={`chapter-directory__card ${viewMode === 'list' ? 'chapter-directory__card--list-view' : ''}`}
              title={chapter.title}
              onClick={() => navigate(`/project/${projectId}/chapters/${chapter.id}`)}
            >
              {viewMode === 'grid' ? (
                <>
                  <div className="chapter-directory__cover-wrap">
                    <div className="chapter-book-cover">
                      <div className="chapter-book-cover__spine" />
                      <div className="chapter-book-cover__frame">
                        <div className="chapter-book-cover__number" style={chapter.is_restored ? { fontSize: '0.6em' } : undefined}>Chapter {chapter.chapter_number}</div>
                        <div className="chapter-book-cover__title" style={chapter.is_restored ? { fontSize: '0.6em' } : undefined}>{chapter.title}</div>
                      </div>
                    </div>

                    <div className="chapter-directory__card-actions">
                      <button
                        className="chapter-directory__menu-btn"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setContextMenuId(contextMenuId === chapter.id ? null : chapter.id); 
                        }}
                        type="button"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {contextMenuId === chapter.id && (
                        <div className="chapter-directory__menu">
                          <button className="chapter-directory__menu-item" onClick={(e) => { e.stopPropagation(); setRenameTarget(chapter); setContextMenuId(null); }} type="button">
                            <Pencil size={14} />
                            Rename
                          </button>
                          <button className="chapter-directory__menu-item" onClick={(e) => { e.stopPropagation(); onDuplicate(chapter); setContextMenuId(null); }} type="button">
                            <Copy size={14} />
                            Duplicate
                          </button>
                          <button className="chapter-directory__menu-item chapter-directory__menu-item--danger" onClick={(e) => { e.stopPropagation(); setDeleteTarget(chapter); setContextMenuId(null); }} type="button">
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="chapter-directory__card-info">
                    <div className="chapter-directory__card-stats">
                      <span title="Word count">
                        <FileText size={14} /> {chapter.word_count.toLocaleString()} words
                      </span>
                      <span title="Last updated">
                        <Clock size={14} /> {formatTimeAgo(chapter.updated_at)}
                      </span>
                      {chapter.is_restored === 1 && (
                        <span style={{ marginLeft: 'auto', fontSize: '10px', background: 'var(--color-primary)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>RESTORED</span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="chapter-directory__card-header">
                    <div>
                      <div className="chapter-directory__card-number" style={chapter.is_restored ? { fontSize: '0.6em' } : undefined}>Chapter {chapter.chapter_number}</div>
                      <h3 className="chapter-directory__card-title" style={chapter.is_restored ? { fontSize: '0.6em' } : undefined}>{chapter.title}</h3>
                    </div>
                    <div className="chapter-directory__card-actions">
                      <button
                        className="chapter-directory__menu-btn"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setContextMenuId(contextMenuId === chapter.id ? null : chapter.id); 
                        }}
                        type="button"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {contextMenuId === chapter.id && (
                        <div className="chapter-directory__menu">
                          <button className="chapter-directory__menu-item" onClick={(e) => { e.stopPropagation(); setRenameTarget(chapter); setContextMenuId(null); }} type="button">
                            <Pencil size={14} />
                            Rename
                          </button>
                          <button className="chapter-directory__menu-item" onClick={(e) => { e.stopPropagation(); onDuplicate(chapter); setContextMenuId(null); }} type="button">
                            <Copy size={14} />
                            Duplicate
                          </button>
                          <button className="chapter-directory__menu-item chapter-directory__menu-item--danger" onClick={(e) => { e.stopPropagation(); setDeleteTarget(chapter); setContextMenuId(null); }} type="button">
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="chapter-directory__card-stats">
                    <span title="Word count">
                      <FileText size={14} /> {chapter.word_count.toLocaleString()} words
                    </span>
                    <span title="Last updated">
                      <Clock size={14} /> {formatTimeAgo(chapter.updated_at)}
                    </span>
                    {chapter.is_restored === 1 && (
                      <span style={{ marginLeft: 'auto', fontSize: '10px', background: 'var(--color-primary)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>RESTORED</span>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Rename Chapter Modal */}
      <Modal open={!!renameTarget} onClose={() => setRenameTarget(null)} title="Rename Chapter" size="sm">
        {renameTarget && (
          <ChapterForm
            onSubmit={handleRename}
            onCancel={() => setRenameTarget(null)}
            submitLabel="Rename"
            defaultValues={{ title: renameTarget.title, chapter_number: renameTarget.chapter_number }}
          />
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Chapter"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This action can be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        variant="danger"
      />
    </div>
  );
}
