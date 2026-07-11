import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { EditorState, LexicalEditor } from 'lexical';
import { $getRoot } from 'lexical';
import { PenLine } from 'lucide-react';
import { EmptyState } from '@/components';
import { useSettings } from '@/features/settings';
import { useChapters } from '../hooks/useChapters';
import { useAutosave } from '../hooks/useAutosave';
import { useDraftRecovery } from '../hooks/useDraftRecovery';
import { EditorToolbar } from '../components/EditorToolbar';
import { EditorStatusBar } from '../components/EditorStatusBar';
import { ChapterListPanel } from '../components/ChapterListPanel';
import { DraftRecoveryDialog } from '../components/DraftRecoveryDialog';
import { FindAndReplacePlugin } from '../components/FindAndReplacePlugin';
import { KeywordPlugin } from '../components/KeywordPlugin';
import { AutoFormatPlugin } from '../components/AutoFormatPlugin';
import { createEditorConfig } from '../utils/editorConfig';
import {
  countWords,
  countCharacters,
  countParagraphs,
  estimateReadingTime,
} from '../utils/writingStats';
import type { Chapter } from '@/types/database';
import type { ChapterFormData } from '../types/chapter';
import './ChaptersPage.css';

/**
 * Internal plugin that captures the editor instance for external access.
 */
function EditorRefPlugin({ editorRef }: { editorRef: React.MutableRefObject<LexicalEditor | null> }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editorRef.current = editor;
    return () => { editorRef.current = null; };
  }, [editor, editorRef]);
  return null;
}

/**
 * Internal plugin that handles Ctrl+S.
 */
function SaveShortcutPlugin({ onSave }: { onSave: () => void }) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        onSave();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave]);
  return null;
}

/**
 * The Writing Workspace — Quyll's chapter editor.
 *
 * Layout:
 * ┌──────────────────────────────────┬───────────────┐
 * │  EditorToolbar                   │ Chapter List  │
 * ├──────────────────────────────────┤ Panel (right) │
 * │  Lexical Editor                  │               │
 * ├──────────────────────────────────┴───────────────┤
 * │  EditorStatusBar (bottom)                        │
 * └──────────────────────────────────────────────────┘
 */
export default function ChaptersPage() {
  const { projectId, chapterId: urlChapterId } = useParams<{ projectId: string; chapterId?: string }>();
  const navigate = useNavigate();

  const {
    items: chapters,
    loading,
    create,
    update,
    remove,

    getById,
    updateContent,
    duplicate,
    getNextChapterNumber,
  } = useChapters();

  const [activeChapterId, setActiveChapterId] = useState<string | null>(urlChapterId ?? null);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [nextNum, setNextNum] = useState(1);
  const [editorKey, setEditorKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);

  // Writing stats (updated live on each keystroke)
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [paraCount, setParaCount] = useState(0);
  const [readingTime, setReadingTime] = useState(0);

  // Editor reference for serialization
  const editorRef = useRef<LexicalEditor | null>(null);
  const latestContentRef = useRef<string>('');

  // Draft recovery
  const { saveDraft, checkDraft, clearDraft } = useDraftRecovery();
  const [draftRecoveryOpen, setDraftRecoveryOpen] = useState(false);
  const pendingDraftRef = useRef<string | null>(null);

  // Autosave
  const handleSave = useCallback(async () => {
    if (!activeChapterId || !editorRef.current) return;

    const editor = editorRef.current;
    const stateJson = JSON.stringify(editor.getEditorState().toJSON());
    const text = editor.getEditorState().read(() => $getRoot().getTextContent());
    const words = countWords(text);
    const time = estimateReadingTime(words);

    await updateContent(activeChapterId, stateJson, words, time);
    clearDraft(activeChapterId);
    latestContentRef.current = stateJson;
  }, [activeChapterId, updateContent, clearDraft]);

  const { settings } = useSettings();

  const { saveStatus, lastSavedAt, markDirty, saveNow, reset: resetAutosave } = useAutosave({
    intervalMinutes: settings?.autosave_interval ?? 5,
    onSave: handleSave,
  });

  /** Load a chapter into the editor. */
  const loadChapter = useCallback(
    async (id: string) => {
      const chapter = await getById(id);
      if (!chapter) return;

      setActiveChapter(chapter);

      // Check for draft recovery
      const draft = checkDraft(id, chapter.content);
      if (draft) {
        pendingDraftRef.current = draft.content;
        setDraftRecoveryOpen(true);
      }

      // Update stats from stored values
      setWordCount(chapter.word_count);
      setCharCount(0);
      setParaCount(0);
      setReadingTime(chapter.reading_time);

      // Force re-mount the editor with new content
      setEditorKey((k) => k + 1);
      resetAutosave();
    },
    [getById, checkDraft, resetAutosave],
  );

  /** Select a chapter — save current first, then load new one. */
  const handleSelectChapter = useCallback(
    async (id: string) => {
      if (id === activeChapterId) return;

      // Save current chapter before switching
      if (activeChapterId) {
        await saveNow();
      }

      setActiveChapterId(id);
      await loadChapter(id);

      // Update URL
      if (projectId) {
        navigate(`/project/${projectId}/chapters/${id}`, { replace: true });
      }
    },
    [activeChapterId, saveNow, loadChapter, projectId, navigate],
  );

  // Load chapter from URL on mount
  useEffect(() => {
    if (urlChapterId && urlChapterId !== activeChapterId) {
      setActiveChapterId(urlChapterId);
      void loadChapter(urlChapterId);
    }
  }, [urlChapterId]);

  // Auto-select first chapter if none selected
  useEffect(() => {
    if (!activeChapterId && chapters.length > 0 && !loading) {
      const firstId = chapters[0]!.id;
      setActiveChapterId(firstId);
      void loadChapter(firstId);
      if (projectId) {
        navigate(`/project/${projectId}/chapters/${firstId}`, { replace: true });
      }
    }
  }, [chapters, loading, activeChapterId]);

  // Fetch next chapter number for create form
  useEffect(() => {
    void getNextChapterNumber().then(setNextNum);
  }, [chapters.length]);

  /** Handle editor onChange — update live stats + mark dirty for autosave. */
  const handleEditorChange = useCallback(
    (editorState: EditorState, _editor: LexicalEditor) => {
      editorState.read(() => {
        const text = $getRoot().getTextContent();
        const words = countWords(text);
        setWordCount(words);
        setCharCount(countCharacters(text));
        setParaCount(countParagraphs(text));
        setReadingTime(estimateReadingTime(words));
      });

      // Save draft to localStorage
      const stateJson = JSON.stringify(editorState.toJSON());
      if (activeChapterId) {
        saveDraft(activeChapterId, stateJson);
      }
      latestContentRef.current = stateJson;
      markDirty();
    },
    [saveDraft, markDirty, activeChapterId],
  );

  /** Create a new chapter. */
  const handleCreateChapter = useCallback(
    async (data: ChapterFormData) => {
      const chapter = await create(data);
      if (chapter) {
        await handleSelectChapter(chapter.id);
      }
    },
    [create, handleSelectChapter],
  );

  /** Rename a chapter. */
  const handleRenameChapter = useCallback(
    async (id: string, title: string) => {
      await update(id, { title } as Partial<Chapter>);
      if (activeChapter && activeChapter.id === id) {
        setActiveChapter({ ...activeChapter, title });
      }
    },
    [update, activeChapter],
  );

  /** Duplicate a chapter. */
  const handleDuplicateChapter = useCallback(
    async (chapter: Chapter) => {
      const newChapter = await duplicate(chapter);
      if (newChapter) {
        await handleSelectChapter(newChapter.id);
      }
    },
    [duplicate, handleSelectChapter],
  );

  /** Delete a chapter. */
  const handleDeleteChapter = useCallback(
    async (id: string) => {
      await remove(id);
      if (activeChapterId === id) {
        setActiveChapterId(null);
        setActiveChapter(null);
        setEditorKey((k) => k + 1);
        resetAutosave();
      }
    },
    [remove, activeChapterId, resetAutosave],
  );

  /** Restore a draft. */
  const handleRestoreDraft = useCallback(() => {
    if (pendingDraftRef.current) {
      // Re-mount editor with draft content
      setActiveChapter((prev) =>
        prev ? { ...prev, content: pendingDraftRef.current! } : prev,
      );
      setEditorKey((k) => k + 1);
      markDirty();
    }
    setDraftRecoveryOpen(false);
    pendingDraftRef.current = null;
  }, [markDirty]);

  /** Discard a draft. */
  const handleDiscardDraft = useCallback(() => {
    if (activeChapterId) {
      clearDraft(activeChapterId);
    }
    setDraftRecoveryOpen(false);
    pendingDraftRef.current = null;
  }, [clearDraft, activeChapterId]);

  /** Manual save from Ctrl+S. */
  const handleManualSave = useCallback(() => {
    void saveNow();
  }, [saveNow]);

  const editorInitialContent = activeChapter?.content || null;

  // Apply custom editor font and size from settings
  const editorStyles = {
    '--editor-font-family': settings?.editor_font === 'Inter' ? 'var(--font-family)' : settings?.editor_font,
    '--editor-font-size': `${settings?.editor_font_size ?? 16}px`,
  } as React.CSSProperties;

  return (
    <div className="chapters-page" style={editorStyles}>
      {/* Main editing area */}
      <div className="chapters-page__editor-area">
        {activeChapter ? (
          <LexicalComposer key={editorKey} initialConfig={createEditorConfig(editorInitialContent)}>
            <EditorToolbar />
            <div className="chapters-page__editor-scroll">
              <KeywordPlugin />
              <RichTextPlugin
                contentEditable={<ContentEditable className="writing-editor__input" />}
                ErrorBoundary={LexicalErrorBoundary}
              />
              <HistoryPlugin />
              <ListPlugin />
              <HorizontalRulePlugin />
              <OnChangePlugin onChange={handleEditorChange} ignoreSelectionChange />
              <EditorRefPlugin editorRef={editorRef} />
              <FindAndReplacePlugin />
              <AutoFormatPlugin />
              <SaveShortcutPlugin onSave={handleManualSave} />
            </div>
          </LexicalComposer>
        ) : (
          <div className="chapters-page__empty">
            <EmptyState
              icon={PenLine}
              title="Start writing"
              description={
                chapters.length === 0
                  ? 'Create your first chapter to begin writing your story.'
                  : 'Select a chapter from the panel to start editing.'
              }
              actionLabel={chapters.length === 0 ? 'Create Chapter' : undefined}
              onAction={chapters.length === 0 ? () => setCreateOpen(true) : undefined}
            />
          </div>
        )}
      </div>

      {/* Right panel — Chapter list */}
      <ChapterListPanel
        chapters={chapters}
        activeChapterId={activeChapterId}
        onSelect={handleSelectChapter}
        onCreate={handleCreateChapter}
        onRename={handleRenameChapter}
        onDuplicate={handleDuplicateChapter}
        onDelete={handleDeleteChapter}
        loading={loading}
        nextChapterNumber={nextNum}
        createOpen={createOpen}
        onCreateOpenChange={setCreateOpen}
      />

      {/* Bottom status bar — spans full width */}
      <EditorStatusBar
        wordCount={wordCount}
        characterCount={charCount}
        paragraphCount={paraCount}
        readingTime={readingTime}
        saveStatus={activeChapter ? saveStatus : 'saved'}
        lastSavedAt={lastSavedAt}
      />

      {/* Draft recovery dialog */}
      <DraftRecoveryDialog
        open={draftRecoveryOpen}
        onRestore={handleRestoreDraft}
        onDiscard={handleDiscardDraft}
      />
    </div>
  );
}
