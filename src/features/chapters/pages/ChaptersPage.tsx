import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation, matchPath, useBlocker } from 'react-router-dom';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { ClearEditorPlugin } from '@lexical/react/LexicalClearEditorPlugin';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { EditorState, LexicalEditor, LexicalNode } from 'lexical';
import { 
  $getRoot, $getSelection, $isRangeSelection, $isTextNode, $isElementNode, 
  $isLineBreakNode, $getNodeByKey,
  CLEAR_EDITOR_COMMAND 
} from 'lexical';
import { createEmptyHistoryState } from '@lexical/react/LexicalHistoryPlugin';
import type { HistoryState } from '@lexical/react/LexicalHistoryPlugin';
import { Download, RotateCcw } from 'lucide-react';
import { htmlToLexicalJson } from '@/services/htmlToMarkdown';
import { Modal, Button } from '@/components';
import { useSettings } from '@/features/settings';
import { ExportDialog } from '@/features/settings/components';
import { useLayoutStore } from '@/store/layoutStore';
import { useChapters } from '../hooks/useChapters';
import { useAutosave } from '../hooks/useAutosave';
import { useDraftRecovery } from '../hooks/useDraftRecovery';
import { EditorToolbar } from '../components/EditorToolbar';
import { EditorStatusBar } from '../components/EditorStatusBar';
import { ChapterListPanel } from '../components/ChapterListPanel';
import { ChapterDirectory } from '../components/ChapterDirectory';
import { ChapterForm } from '../components/ChapterForm';
import { DraftRecoveryDialog } from '../components/DraftRecoveryDialog';
import { FindAndReplacePlugin } from '../components/FindAndReplacePlugin';
import { KeywordPlugin } from '../components/KeywordPlugin';
import { AutoFormatPlugin } from '../components/AutoFormatPlugin';
import { LexicalContextMenu } from '../components/LexicalContextMenu';
import { checkGrammar, type GrammarIssue } from '@/services/grammarService';
import { createEditorConfig } from '../utils/editorConfig';
import {
  countWords,
  countCharacters,
  countParagraphs,
  estimateReadingTime,
  formatTimeAgo,
} from '../utils/writingStats';
import type { Chapter } from '@/types/database';
import type { Timestamp } from '@/types/common';
import type { ChapterFormData } from '../types/chapter';
import './ChaptersPage.css';
import '@/styles/redesign.css';

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

/** Keeps explicit breaks aligned to the next document page and reports live pagination. */
function PageLayoutPlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    let frame = 0;
    const layout = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const root = editor.getRootElement();
        if (!root) return;
        const styles = getComputedStyle(root);
        const pageHeight = Number.parseFloat(styles.getPropertyValue('--editor-page-height')) || 1056;
        const pageGap = Number.parseFloat(styles.getPropertyValue('--editor-page-gap')) || 28;
        
        const elements = Array.from(root.querySelectorAll('[data-lexical-page-break]')) as HTMLElement[];
        for (const el of elements) {
          const top = el.offsetTop;
          const page = Math.floor(top / (pageHeight + pageGap)) + 1;
          const targetTop = page * (pageHeight + pageGap);
          if (targetTop > top) {
            el.style.marginTop = `${targetTop - top}px`;
          }
        }
      });
    };
    const unregister = editor.registerUpdateListener(layout);
    const observer = new ResizeObserver(layout);
    const root = editor.getRootElement();
    if (root) observer.observe(root);
    layout();
    return () => { unregister(); observer.disconnect(); cancelAnimationFrame(frame); };
  }, [editor]);
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
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();
  const match = matchPath('/project/:projectId/chapters/:chapterId', location.pathname);
  const urlChapterId = match?.params.chapterId;
  const navigate = useNavigate();

  const {
    items: chapters,
    loading,
    create,
    update,
    remove,
    refresh,

    getById,
    updateContent,
    duplicate,
    getNextChapterNumber,
  } = useChapters();

  const [activeChapterId, setActiveChapterId] = useState<string | null>(urlChapterId ?? null);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  
  // Keep history state per chapter
  const historyStatesRef = useRef<Record<string, HistoryState>>({});
  const currentHistoryState = useMemo(() => {
    if (!activeChapterId) return undefined;
    if (!historyStatesRef.current[activeChapterId]) {
      historyStatesRef.current[activeChapterId] = createEmptyHistoryState();
    }
    return historyStatesRef.current[activeChapterId];
  }, [activeChapterId]);

  const [nextNum, setNextNum] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

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
  const [pluginsLoaded, setPluginsLoaded] = useState(false);

  // Defer heavy lexical plugins until after initial render
  useEffect(() => {
    if (activeChapter) {
      const timer = setTimeout(() => setPluginsLoaded(true), 100);
      return () => clearTimeout(timer);
    } else {
      setPluginsLoaded(false);
    }
    return undefined;
  }, [activeChapter]);
  const pendingDraftRef = useRef<string | null>(null);

  // Grammar check
  const [grammarModalOpen, setGrammarModalOpen] = useState(false);
  const [grammarIssues, setGrammarIssues] = useState<GrammarIssue[]>([]);
  const [isGrammarSelection, setIsGrammarSelection] = useState(false);

  // Autosave
  const handleSave = useCallback(async () => {
    if (!activeChapterId || !editorRef.current) return;

    const editor = editorRef.current;
    const stateJson = JSON.stringify(editor.getEditorState().toJSON());
    const text = editor.getEditorState().read(() => $getRoot().getTextContent());
    const words = countWords(text);
    const time = estimateReadingTime(words);
    const nowIso = new Date().toISOString();

    await updateContent(activeChapterId, stateJson, words, time, nowIso);
    clearDraft(activeChapterId);
    latestContentRef.current = stateJson;

    setActiveChapter((prev) =>
      prev
        ? {
            ...prev,
            content: stateJson,
            word_count: words,
            reading_time: time,
            updated_at: nowIso as Timestamp,
          }
        : null,
    );
    void refresh();
  }, [activeChapterId, updateContent, clearDraft, refresh]);

  const { settings } = useSettings();
  const { chapterListCollapsed, showKeywords, setLastActiveChapterId } = useLayoutStore();

  const { saveStatus, lastSavedAt, markDirty, saveNow, reset: resetAutosave } = useAutosave({
    intervalMinutes: settings?.autosave_interval ?? 5,
    onSave: handleSave,
  });

  const [unsavedAction, setUnsavedAction] = useState<{
    type: 'navigate' | 'closeApp';
    proceed: () => void;
    cancel: () => void;
  } | null>(null);

  const blocker = useBlocker(
    ({ nextLocation }) => {
      // If we are leaving the project entirely (e.g. going to / or another project)
      const leavingProject = !nextLocation.pathname.startsWith(`/project/${projectId}`);
      return saveStatus === 'unsaved' && leavingProject;
    }
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setUnsavedAction({
        type: 'navigate',
        proceed: () => blocker.proceed?.(),
        cancel: () => blocker.reset?.()
      });
    }
  }, [blocker]);

  const saveStatusRef = useRef(saveStatus);
  useEffect(() => {
    saveStatusRef.current = saveStatus;
  }, [saveStatus]);

  useEffect(() => {
    let unlistenPromise: Promise<() => void> | undefined;
    
    async function setupTauri() {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const win = getCurrentWindow();
        unlistenPromise = win.onCloseRequested((event) => {
          if (saveStatusRef.current === 'unsaved') {
            event.preventDefault();
            setUnsavedAction({
              type: 'closeApp',
              proceed: () => {
                void win.destroy();
              },
              cancel: () => {
                setUnsavedAction(null);
              }
            });
          }
        });
      } catch (e) {
        // Not running in Tauri
      }
    }
    
    void setupTauri();
    
    return () => {
      if (unlistenPromise) {
        unlistenPromise.then(unlisten => unlisten());
      }
    };
  }, []);

  const handleUnsavedSave = async () => {
    await saveNow();
    if (unsavedAction) {
      unsavedAction.proceed();
      setUnsavedAction(null);
    }
  };

  const handleUnsavedDontSave = () => {
    if (activeChapterId) {
       clearDraft(activeChapterId);
    }
    if (unsavedAction) {
      unsavedAction.proceed();
      setUnsavedAction(null);
    }
  };

  const handleUnsavedCancel = () => {
    if (unsavedAction) {
      unsavedAction.cancel();
      setUnsavedAction(null);
    }
  };

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

      // Refresh editor content directly without remounting
      const editor = editorRef.current;
      if (editor) {
        let safeState = undefined;
        if (chapter.content && chapter.content.trim()) {
          const trimmed = chapter.content.trim();
          if (trimmed.startsWith('{')) {
            safeState = trimmed;
          } else {
            safeState = htmlToLexicalJson(chapter.content);
          }
        }
        
        if (safeState) {
          try {
            const parsedState = editor.parseEditorState(safeState);
            editor.setEditorState(parsedState);
          } catch (e) {
            console.error('Failed to parse editor state', e);
            editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
          }
        } else {
          editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
        }
      } else {
        // Fallback for first mount where editorRef might not be attached yet
        setEditorKey((k) => k + 1);
      }

      resetAutosave();
    },
    [getById, checkDraft, resetAutosave],
  );

  /** Select a chapter — save current first, then let URL handle the rest. */
  const handleSelectChapter = useCallback(
    async (id: string) => {
      if (id === activeChapterId) return;

      // Save current chapter before switching
      if (activeChapterId) {
        await saveNow();
      }

      if (!id) {
        setLastActiveChapterId(null);
        navigate(`/project/${projectId}/chapters`);
        return;
      }

      // Update URL (push state), let the useEffect handle loading
      if (projectId) {
        navigate(`/project/${projectId}/chapters/${id}`);
      }
    },
    [activeChapterId, saveNow, projectId, navigate, setLastActiveChapterId],
  );

  // Load chapter from URL on mount (and unload if on directory route)
  useEffect(() => {
    if (urlChapterId) {
      if (urlChapterId !== activeChapterId) {
        setActiveChapterId(urlChapterId);
        // Do not clear activeChapter here, so the editor remains mounted and seamlessly transitions content
        void loadChapter(urlChapterId);
      } else if (!activeChapter) {
        void loadChapter(urlChapterId);
      }
    } else {
      const isDirectoryRoute = location.pathname.endsWith('/chapters') || location.pathname.endsWith('/chapters/');
      if (isDirectoryRoute && activeChapterId) {
        setActiveChapterId(null);
        setActiveChapter(null);
      }
    }
  }, [urlChapterId, activeChapterId, activeChapter, loadChapter, location.pathname]);

  // Persistence redirect
  useEffect(() => {
    const isWritingWorkspace = location.pathname.endsWith('/chapters') || location.pathname.endsWith('/chapters/');
    const currentLastActive = useLayoutStore.getState().lastActiveChapterId;
    if (isWritingWorkspace && currentLastActive && !urlChapterId) {
      navigate(`/project/${projectId}/chapters/${currentLastActive}`, { replace: true });
    }
  }, [location.pathname, urlChapterId, projectId, navigate]);

  // Update lastActiveChapterId when a chapter is opened
  useEffect(() => {
    if (urlChapterId) {
      setLastActiveChapterId(urlChapterId);
    }
  }, [urlChapterId, setLastActiveChapterId]);

  // Remove auto-select first chapter logic. Let it stay empty if no urlChapterId.

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

  const [isCheckingGrammar, setIsCheckingGrammar] = useState(false);

  /** Manual save from Ctrl+S. */
  const handleManualSave = useCallback(() => {
    void saveNow();
  }, [saveNow]);

  // Store the map to resolve issues later
  const grammarMapRef = useRef<{ key: string; start: number; end: number }[]>([]);

  /** Grammar Check from Status Bar */
  const handleOpenGrammarCheck = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    if (isCheckingGrammar) {
      setGrammarModalOpen(false);
      setIsCheckingGrammar(false);
      return;
    }

    let textToCheck = '';
    let isSelectionCheck = false;
    let selectionStart = 0;
    let selectionEnd = Number.MAX_SAFE_INTEGER;

    setIsCheckingGrammar(true);

    editor.getEditorState().read(() => {
      let text = '';
      const map: { key: string; start: number; end: number }[] = [];
      
      const traverse = (node: LexicalNode) => {
        if ($isTextNode(node)) {
          const content = node.getTextContent();
          map.push({ key: node.getKey(), start: text.length, end: text.length + content.length });
          text += content;
        } else if ($isElementNode(node)) {
          const children = node.getChildren();
          for (const child of children) {
            traverse(child);
          }
          if (!node.isInline() && text.length > 0 && !text.endsWith('\n\n')) {
            text += '\n\n'; 
          }
        } else if ($isLineBreakNode(node)) {
          text += '\n';
        }
      };
      
      traverse($getRoot());
      textToCheck = text;
      grammarMapRef.current = map;

      const selection = $getSelection();
      if ($isRangeSelection(selection) && !selection.isCollapsed()) {
        isSelectionCheck = true;
        const nodes = selection.getNodes();
        const firstTextNode = nodes.find($isTextNode);
        const lastTextNode = [...nodes].reverse().find($isTextNode);
        
        if (firstTextNode && lastTextNode) {
          const firstMap = map.find(m => m.key === firstTextNode.getKey());
          const lastMap = map.find(m => m.key === lastTextNode.getKey());
          if (firstMap && lastMap) {
            selectionStart = firstMap.start;
            selectionEnd = lastMap.end;
          }
        }
      }
    });

    checkGrammar(textToCheck).then(found => {
      if (isSelectionCheck) {
        found = found.filter(i => i.startOffset >= selectionStart && i.endOffset <= selectionEnd);
      }
      setGrammarIssues(found);
      setIsGrammarSelection(isSelectionCheck);
      setIsCheckingGrammar(false);
      
      const { chapterListCollapsed, setChapterListCollapsed } = useLayoutStore.getState();
      if (chapterListCollapsed) {
        setChapterListCollapsed(false);
      }
      
      setGrammarModalOpen(true);
    }).catch(err => {
      console.error(err);
      setIsCheckingGrammar(false);
    });
  }, []);

  const handleApplyGrammarSuggestion = useCallback((issue: GrammarIssue) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.update(() => {
      const map = grammarMapRef.current;
      const nodeInfo = map.find(m => issue.startOffset >= m.start && issue.startOffset < m.end);
      
      if (nodeInfo && issue.suggestion !== undefined) {
        const node = $getNodeByKey(nodeInfo.key);
        if ($isTextNode(node)) {
          const localStart = issue.startOffset - nodeInfo.start;
          const content = node.getTextContent();
          const before = content.slice(0, localStart);
          const after = content.slice(localStart + issue.matchText.length);
          node.setTextContent(before + issue.suggestion + after);
        }
      }
    });

    setGrammarIssues((prev) => prev.filter((i) => i.id !== issue.id));
  }, []);

  const handleLocateGrammarIssue = useCallback((issue: GrammarIssue) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.update(() => {
      const map = grammarMapRef.current;
      const nodeInfo = map.find(m => issue.startOffset >= m.start && issue.startOffset < m.end);
      
      if (nodeInfo) {
        const node = $getNodeByKey(nodeInfo.key);
        if ($isTextNode(node)) {
          const localStart = issue.startOffset - nodeInfo.start;
          
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.anchor.set(node.getKey(), localStart, 'text');
            selection.focus.set(node.getKey(), localStart + issue.matchText.length, 'text');
          } else {
            node.select(localStart, localStart + issue.matchText.length);
          }
          
          const domElement = editor.getElementByKey(node.getKey());
          if (domElement) {
            domElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
    });
  }, []);

  const handleDismissGrammarIssue = useCallback((issueId: string) => {
    setGrammarIssues((prev) => prev.filter((i) => i.id !== issueId));
  }, []);

  const editorInitialContent = activeChapter?.content || null;

  // Apply custom editor font and size from settings
  const editorStyles = {
    '--editor-font-family': settings?.editor_font === 'Inter' ? 'var(--font-family)' : settings?.editor_font,
    '--editor-font-size': `${settings?.editor_font_size ?? 16}px`,
  } as React.CSSProperties;

  return (
    <div className={`chapters-page ${chapterListCollapsed ? 'chapters-page--panel-collapsed' : ''} ${!activeChapterId ? 'chapters-page--directory-mode' : ''}`} style={editorStyles}>
      {/* Main editing area */}
      <div className={`chapters-page__editor-area ${showKeywords ? 'show-keywords' : ''}`}>
        {activeChapterId ? (
          activeChapter ? (
            <>
              <div className="chapters-page__chapter-header">
                <div className="chapters-page__chapter-info">
                <span className="chapters-page__chapter-num">
                  Chapter {String(activeChapter.chapter_number).padStart(2, '0')}
                </span>
                <h1 className="chapters-page__chapter-title">{activeChapter.title}</h1>
                <span className="chapters-page__chapter-meta">
                  Draft · Last edited {formatTimeAgo(activeChapter.updated_at)}
                </span>
              </div>
              <div className="chapters-page__chapter-actions">
                <button
                  className="chapters-page__action-btn"
                  onClick={() => setExportOpen(true)}
                  title="Export Chapter"
                  type="button"
                >
                  <Download size={15} />
                  <span>Export</span>
                </button>
                <button
                  className="chapters-page__action-btn"
                  onClick={() => setDraftRecoveryOpen(true)}
                  title="Restore Draft or Version"
                  type="button"
                >
                  <RotateCcw size={15} />
                  <span>Restore</span>
                </button>
              </div>
            </div>
            <LexicalComposer key={editorKey} initialConfig={createEditorConfig(editorInitialContent)}>
              <EditorToolbar />
              <div className="chapters-page__editor-scroll">
                <RichTextPlugin
                  contentEditable={<ContentEditable className="writing-editor__input" />}
                  ErrorBoundary={LexicalErrorBoundary}
                />
                <ClearEditorPlugin />
                <HistoryPlugin key={activeChapterId} externalHistoryState={currentHistoryState} />
                <OnChangePlugin onChange={handleEditorChange} ignoreSelectionChange />
                <EditorRefPlugin editorRef={editorRef} />
                <SaveShortcutPlugin onSave={handleManualSave} />
                {pluginsLoaded && (
                  <>
                    <KeywordPlugin />
                    <ListPlugin />
                    <HorizontalRulePlugin />
                    <PageLayoutPlugin />
                    <FindAndReplacePlugin />
                    <AutoFormatPlugin />
                    <LexicalContextMenu />
                  </>
                )}
              </div>
            </LexicalComposer>
          </>
        ) : (
          <div className="chapters-page__loading">
            <div className="chapters-page__spinner"></div>
            Loading chapter...
          </div>
        )) : (
          <ChapterDirectory 
            projectId={projectId!}
            chapters={chapters}
            loading={loading}
            onCreateChapter={() => setCreateOpen(true)}
            onRename={handleRenameChapter}
            onDuplicate={handleDuplicateChapter}
            onDelete={handleDeleteChapter}
          />
        )}
      </div>

      {/* Right panel — Chapter list (only show in editor) */}
      {activeChapterId && (
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
          grammarOpen={grammarModalOpen}
          onGrammarToggle={() => {
            const { chapterListCollapsed, setChapterListCollapsed } = useLayoutStore.getState();
            if (chapterListCollapsed) {
               setChapterListCollapsed(false);
               setGrammarModalOpen(true);
            } else {
               setGrammarModalOpen(!grammarModalOpen);
            }
          }}
          grammarIssues={grammarIssues}
          isGrammarSelection={isGrammarSelection}
          onApplyGrammarSuggestion={handleApplyGrammarSuggestion}
          onLocateGrammarIssue={handleLocateGrammarIssue}
          onDismissGrammarIssue={handleDismissGrammarIssue}
        />
      )}

      {/* Bottom status bar — spans full width */}
      <EditorStatusBar
        wordCount={wordCount}
        characterCount={charCount}
        paragraphCount={paraCount}
        readingTime={readingTime}
        saveStatus={activeChapter ? saveStatus : 'saved'}
        lastSavedAt={lastSavedAt}
        onGrammarCheck={activeChapter ? handleOpenGrammarCheck : undefined}
        isCheckingGrammar={isCheckingGrammar}
      />

      {/* Draft recovery dialog */}
      <DraftRecoveryDialog
        open={draftRecoveryOpen}
        onRestore={handleRestoreDraft}
        onDiscard={handleDiscardDraft}
      />

      {/* Export dialog */}
      <ExportDialog
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
      />

      {/* Create Chapter Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Chapter" size="sm">
        <ChapterForm
          onSubmit={async (data) => {
            await handleCreateChapter(data);
            setCreateOpen(false);
          }}
          onCancel={() => setCreateOpen(false)}
          submitLabel="Create"
          defaultValues={{ title: '', chapter_number: nextNum }}
        />
      </Modal>

      {/* Unsaved Changes Modal */}
      <Modal
        open={!!unsavedAction}
        onClose={handleUnsavedCancel}
        title="Unsaved Changes"
        size="sm"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button variant="ghost" onClick={handleUnsavedCancel}>Cancel</Button>
            <Button variant="danger" onClick={handleUnsavedDontSave}>Don't Save</Button>
            <Button variant="primary" onClick={handleUnsavedSave}>Save</Button>
          </div>
        }
      >
        <p style={{ margin: 0, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
          You have unsaved changes in this chapter. Do you want to save them before leaving?
        </p>
      </Modal>
    </div>
  );
}
