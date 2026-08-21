import { useState, useEffect, useRef } from 'react';
import { ReaderIcon, GridIcon, ListBulletIcon, ClockIcon, FileTextIcon, DotsVerticalIcon, Pencil2Icon, CopyIcon, TrashIcon, PlusIcon, CaretSortIcon, CheckIcon } from '@radix-ui/react-icons';
import { useNavigate } from 'react-router-dom';

import { formatTimeAgo } from '../utils/writingStats';
import { EmptyState, Button, SearchBar, Modal, Dialog } from '@/components';
import { ChapterForm } from './ChapterForm';
import { useSearch, useSort } from '@/hooks';
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
  const { sortKey, sortDirection, setSortKey, setSortDirection, sortItems } = useSort<'chapter_number' | 'title' | 'updated_at'>('chapter_number');

  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setIsSortMenuOpen(false);
      }
    }
    if (isSortMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSortMenuOpen]);

  useEffect(() => {
    if (!contextMenuId) return;
    function handleClickOutside() {
      setContextMenuId(null);
    }
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [contextMenuId]);

  const filtered = filterItems(chapters, (c) => `${c.chapter_number} ${c.title}`);
  const sorted = sortItems(filtered, (c, key) => {
    if (key === 'chapter_number') return c.chapter_number;
    if (key === 'title') return c.title;
    return c.updated_at;
  });

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
          icon={ReaderIcon}
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
          <Button variant="primary" icon={<PlusIcon width={16} height={16} />} onClick={onCreateChapter}>
            New Chapter
          </Button>
        </div>
      </div>

      <div className="chapter-directory__toolbar">
        <div className="chapter-directory__search">
          <SearchBar value={query} onChange={setQuery} placeholder="Search chapters..." />
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div className="chapter-directory__sort-wrap" ref={sortMenuRef}>
            <button
              className={`chapter-directory__sort-btn ${isSortMenuOpen ? 'active' : ''}`}
              onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
              title="Sort chapters"
              type="button"
            >
              <CaretSortIcon width={14} height={14} />
              <span>Sort</span>
            </button>
            <div className={`chapter-directory__sort-menu ${isSortMenuOpen ? 'open' : ''}`}>
              {[
                { label: 'Number (1 - N)', field: 'chapter_number' as const, order: 'asc' as const },
                { label: 'Number (N - 1)', field: 'chapter_number' as const, order: 'desc' as const },
                { label: 'Last Updated (Newest)', field: 'updated_at' as const, order: 'desc' as const },
                { label: 'Last Updated (Oldest)', field: 'updated_at' as const, order: 'asc' as const },
                { label: 'Title (A - Z)', field: 'title' as const, order: 'asc' as const },
                { label: 'Title (Z - A)', field: 'title' as const, order: 'desc' as const },
              ].map((opt) => {
                const active = sortKey === opt.field && sortDirection === opt.order;
                return (
                  <button
                    key={`${opt.field}-${opt.order}`}
                    className={`chapter-directory__sort-item ${active ? 'active' : ''}`}
                    onClick={() => {
                      setSortKey(opt.field);
                      setSortDirection(opt.order);
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
          <div className="chapter-directory__view-toggle">
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <GridIcon width={14} height={14} /> Grid
            </Button>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <ListBulletIcon width={14} height={14} /> List
            </Button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ReaderIcon}
          title="No matches"
          description={`No chapters match "${query}"`}
        />
      ) : (
        <div className={`chapter-directory__content chapter-directory__content--${viewMode}`}>
          {sorted.map((chapter) => (
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
                        <div className="chapter-book-cover__number">Chapter {chapter.chapter_number}</div>
                        <div className="chapter-book-cover__title">{chapter.title}</div>
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
                        <DotsVerticalIcon width={16} height={16} />
                      </button>
                      {contextMenuId === chapter.id && (
                        <div className="chapter-directory__menu">
                          <button className="chapter-directory__menu-item" onClick={(e) => { e.stopPropagation(); setRenameTarget(chapter); setContextMenuId(null); }} type="button">
                            <Pencil2Icon width={14} height={14} />
                            Rename
                          </button>
                          <button className="chapter-directory__menu-item" onClick={(e) => { e.stopPropagation(); onDuplicate(chapter); setContextMenuId(null); }} type="button">
                            <CopyIcon width={14} height={14} />
                            Duplicate
                          </button>
                          <button className="chapter-directory__menu-item chapter-directory__menu-item--danger" onClick={(e) => { e.stopPropagation(); setDeleteTarget(chapter); setContextMenuId(null); }} type="button">
                            <TrashIcon width={14} height={14} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="chapter-directory__card-info">
                    <div className="chapter-directory__card-stats">
                      <span title="Word count">
                        <FileTextIcon width={14} height={14} /> {chapter.word_count.toLocaleString()} words
                      </span>
                      <span title="Last updated">
                        <ClockIcon width={14} height={14} /> {formatTimeAgo(chapter.updated_at)}
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
                      <div className="chapter-directory__card-number">Chapter {chapter.chapter_number}</div>
                      <h3 className="chapter-directory__card-title">{chapter.title}</h3>
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
                        <DotsVerticalIcon width={16} height={16} />
                      </button>
                      {contextMenuId === chapter.id && (
                        <div className="chapter-directory__menu">
                          <button className="chapter-directory__menu-item" onClick={(e) => { e.stopPropagation(); setRenameTarget(chapter); setContextMenuId(null); }} type="button">
                            <Pencil2Icon width={14} height={14} />
                            Rename
                          </button>
                          <button className="chapter-directory__menu-item" onClick={(e) => { e.stopPropagation(); onDuplicate(chapter); setContextMenuId(null); }} type="button">
                            <CopyIcon width={14} height={14} />
                            Duplicate
                          </button>
                          <button className="chapter-directory__menu-item chapter-directory__menu-item--danger" onClick={(e) => { e.stopPropagation(); setDeleteTarget(chapter); setContextMenuId(null); }} type="button">
                            <TrashIcon width={14} height={14} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="chapter-directory__card-stats">
                    <span title="Word count">
                      <FileTextIcon width={14} height={14} /> {chapter.word_count.toLocaleString()} words
                    </span>
                    <span title="Last updated">
                      <ClockIcon width={14} height={14} /> {formatTimeAgo(chapter.updated_at)}
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
