import { useState, useEffect } from 'react';
import { Plus, FileText } from 'lucide-react';
import { Button, SearchBar, Modal, Dialog } from '@/components';
import { ChapterForm } from './ChapterForm';
import { ChapterListItem } from './ChapterListItem';
import { useSearch } from '@/hooks';
import type { Chapter } from '@/types/database';
import type { ChapterFormData } from '../types/chapter';
import './ChapterListPanel.css';

interface ChapterListPanelProps {
  chapters: Chapter[];
  activeChapterId: string | null;
  onSelect: (id: string) => void;
  onCreate: (data: ChapterFormData) => Promise<void>;
  onRename: (id: string, title: string) => Promise<void>;
  onDuplicate: (chapter: Chapter) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  loading: boolean;
  nextChapterNumber: number;
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
}

export function ChapterListPanel({
  chapters,
  activeChapterId,
  onSelect,
  onCreate,
  onRename,
  onDuplicate,
  onDelete,
  loading,
  nextChapterNumber,
  createOpen,
  onCreateOpenChange,
}: ChapterListPanelProps) {
  const [renameTarget, setRenameTarget] = useState<Chapter | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Chapter | null>(null);
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);
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

  async function handleCreate(data: ChapterFormData) {
    await onCreate(data);
    onCreateOpenChange(false);
  }

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

  return (
    <aside className="chapter-list-panel">
      <div className="chapter-list-panel__header">
        <h2 className="chapter-list-panel__title">Chapters</h2>
        <Button variant="primary" size="sm" onClick={() => onCreateOpenChange(true)}>
          <Plus size={14} />
        </Button>
      </div>

      <div className="chapter-list-panel__search">
        <SearchBar value={query} onChange={setQuery} placeholder="Search chapters..." />
      </div>

      <div className="chapter-list-panel__list">
        {loading ? (
          <div className="chapter-list-panel__loading">Loading...</div>
        ) : filtered.length === 0 ? (
          query ? (
            <div className="chapter-list-panel__empty-search">No matches</div>
          ) : (
            <div className="chapter-list-panel__empty">
              <FileText size={24} className="chapter-list-panel__empty-icon" />
              <p>No chapters yet</p>
              <Button variant="primary" size="sm" onClick={() => onCreateOpenChange(true)}>
                <Plus size={14} />
                New Chapter
              </Button>
            </div>
          )
        ) : (
          filtered.map((chapter) => (
            <ChapterListItem
              key={chapter.id}
              chapter={chapter}
              active={chapter.id === activeChapterId}
              showMenu={contextMenuId === chapter.id}
              onSelect={() => onSelect(chapter.id)}
              onToggleMenu={() => setContextMenuId(contextMenuId === chapter.id ? null : chapter.id)}
              onRename={() => { setRenameTarget(chapter); setContextMenuId(null); }}
              onDuplicate={() => { onDuplicate(chapter); setContextMenuId(null); }}
              onDelete={() => { setDeleteTarget(chapter); setContextMenuId(null); }}
            />
          ))
        )}
      </div>

      {/* Create Chapter Modal */}
      <Modal open={createOpen} onClose={() => onCreateOpenChange(false)} title="Create Chapter" size="sm">
        <ChapterForm
          onSubmit={handleCreate}
          onCancel={() => onCreateOpenChange(false)}
          submitLabel="Create"
          defaultValues={{ title: '', chapter_number: nextChapterNumber }}
        />
      </Modal>

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
    </aside>
  );
}
