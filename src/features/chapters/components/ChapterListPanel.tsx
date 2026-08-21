import { useState, useEffect } from 'react';
import { PlusIcon, FileTextIcon, ReaderIcon, GridIcon } from '@radix-ui/react-icons';
import { PanelRight, PanelRightClose } from 'lucide-react';
import { Button, SearchBar, Modal, Dialog } from '@/components';
import { ChapterForm } from './ChapterForm';
import { ChapterListItem } from './ChapterListItem';
import { useSearch } from '@/hooks';
import { useLayoutStore } from '@/store/layoutStore';
import type { Chapter } from '@/types/database';
import type { ChapterFormData } from '../types/chapter';
import { type GrammarIssue } from '@/services/grammarService';
import { GrammarCheckerPanel } from './GrammarCheckerPanel';
import { SpellCheck } from 'lucide-react';
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
  grammarOpen: boolean;
  onGrammarToggle: () => void;
  grammarIssues: GrammarIssue[];
  isGrammarSelection: boolean;
  hasScannedGrammar: boolean;
  isCheckingGrammar: boolean;
  onGrammarCheck?: () => void;
  onApplyGrammarSuggestion: (issue: GrammarIssue) => void;
  onLocateGrammarIssue: (issue: GrammarIssue) => void;
  onDismissGrammarIssue: (issueId: string) => void;
}

export function ChapterListPanel({
  chapters,
  activeChapterId,
  onSelect,
  onRename,
  onDuplicate,
  onDelete,
  loading,
  onCreateOpenChange,
  grammarOpen,
  onGrammarToggle,
  grammarIssues,
  isGrammarSelection,
  hasScannedGrammar,
  isCheckingGrammar,
  onGrammarCheck,
  onApplyGrammarSuggestion,
  onLocateGrammarIssue,
  onDismissGrammarIssue,
}: ChapterListPanelProps) {
  const [renameTarget, setRenameTarget] = useState<Chapter | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Chapter | null>(null);
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);
  const { query, setQuery, filterItems } = useSearch();
  const { chapterListCollapsed, toggleChapterList } = useLayoutStore();

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

  return (
    <aside className={`chapter-list-panel ${chapterListCollapsed ? 'chapter-list-panel--collapsed' : ''}`}>
      <div className="chapter-list-panel__header">
        {!chapterListCollapsed && <h2 className="chapter-list-panel__title">Chapters</h2>}
        <div className="chapter-list-panel__header-actions">
          {!chapterListCollapsed && (
            <>
              <Button variant="ghost" size="sm" onClick={() => onSelect('')} title="Chapter Directory">
                <GridIcon width={14} height={14} />
              </Button>
              <Button variant="primary" size="sm" onClick={() => onCreateOpenChange(true)} title="New Chapter">
                <PlusIcon width={14} height={14} />
              </Button>
            </>
          )}
          <button
            className="chapter-list-panel__toggle"
            onClick={toggleChapterList}
            aria-label={chapterListCollapsed ? 'Expand chapter panel' : 'Collapse chapter panel'}
            title={chapterListCollapsed ? 'Expand Chapter Panel (Ctrl+|)' : 'Collapse Chapter Panel (Ctrl+|)'}
          >
            {chapterListCollapsed ? <PanelRight size={18} /> : <PanelRightClose size={18} />}
          </button>
        </div>
      </div>

      {chapterListCollapsed ? (
        <div className="chapter-list-panel__rail">
          <button
            className="chapter-list-panel__rail-btn chapter-list-panel__rail-btn--new"
            onClick={() => onCreateOpenChange(true)}
            title="New Chapter"
          >
            <PlusIcon width={18} height={18} />
          </button>
          <div className="chapter-list-panel__rail-divider" />
          <div className="chapter-list-panel__rail-items">
            {chapters.map((chapter) => {
              const isActive = chapter.id === activeChapterId;
              return (
                <button
                  key={chapter.id}
                  className={`chapter-list-panel__rail-btn ${isActive ? 'chapter-list-panel__rail-btn--active' : ''}`}
                  onClick={() => onSelect(chapter.id)}
                  title={`Ch. ${chapter.chapter_number}: ${chapter.title}`}
                >
                  <ReaderIcon width={16} height={16} style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-icon-chapters)' }} />
                  <span className="chapter-list-panel__rail-num">{chapter.chapter_number}</span>
                </button>
              );
            })}
          </div>
          <div className="chapter-list-panel__rail-bottom">
            <button
              className={`chapter-list-panel__rail-btn ${grammarOpen ? 'chapter-list-panel__rail-btn--active' : ''}`}
              onClick={onGrammarToggle}
              title="Grammar Checker"
            >
              <SpellCheck size={16} />
              {grammarIssues.length > 0 && (
                <span className="chapter-list-panel__rail-badge" style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(239, 68, 68, 0.8)', color: 'white', borderRadius: '50%', fontSize: '0.6rem', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {grammarIssues.length}
                </span>
              )}
            </button>
          </div>
        </div>
      ) : (
        <>
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
                  <FileTextIcon width={24} height={24} className="chapter-list-panel__empty-icon" />
                  <p>No chapters yet</p>
                  <Button variant="primary" size="sm" onClick={() => onCreateOpenChange(true)}>
                    <PlusIcon width={14} height={14} />
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

          <GrammarCheckerPanel
            isOpen={grammarOpen}
            onToggle={onGrammarToggle}
            issues={grammarIssues}
            isSelection={isGrammarSelection}
            hasScannedGrammar={hasScannedGrammar}
            isCheckingGrammar={isCheckingGrammar}
            onGrammarCheck={onGrammarCheck}
            onApplySuggestion={onApplyGrammarSuggestion}
            onLocateIssue={onLocateGrammarIssue}
            onDismissIssue={onDismissGrammarIssue}
          />
        </>
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
    </aside>
  );
}
