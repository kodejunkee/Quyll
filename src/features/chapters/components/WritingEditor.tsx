import { useEffect } from 'react';
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
import { createEditorConfig } from '../utils/editorConfig';
import { FindAndReplacePlugin } from './FindAndReplacePlugin';
import './WritingEditor.css';

interface WritingEditorProps {
  initialContent: string | null;
  onChange: (editorState: EditorState, editor: LexicalEditor) => void;
  onSave?: () => void;
  editorRef?: React.MutableRefObject<LexicalEditor | null>;
}

/**
 * Internal plugin that captures the editor instance via context.
 */
function EditorRefPlugin({ editorRef }: { editorRef?: React.MutableRefObject<LexicalEditor | null> }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (editorRef) {
      editorRef.current = editor;
    }
    return () => {
      if (editorRef) {
        editorRef.current = null;
      }
    };
  }, [editor, editorRef]);

  return null;
}

/**
 * Plugin that handles Ctrl+S to trigger manual save.
 */
function SaveShortcutPlugin({ onSave }: { onSave?: () => void }) {
  useEffect(() => {
    if (!onSave) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        onSave!();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave]);

  return null;
}

export function WritingEditor({ initialContent, onChange, onSave, editorRef }: WritingEditorProps) {
  const config = createEditorConfig(initialContent);

  return (
    <LexicalComposer initialConfig={config}>
      <div className="writing-editor">
        <RichTextPlugin
          contentEditable={
            <ContentEditable className="writing-editor__input" />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <ListPlugin />
        <HorizontalRulePlugin />
        <OnChangePlugin onChange={onChange} ignoreSelectionChange />
        <EditorRefPlugin editorRef={editorRef} />
        <FindAndReplacePlugin />
        <SaveShortcutPlugin onSave={onSave} />
      </div>
    </LexicalComposer>
  );
}
