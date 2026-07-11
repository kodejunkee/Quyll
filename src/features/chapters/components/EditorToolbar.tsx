import { useCallback, useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  FORMAT_TEXT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  $getSelection,
  $isRangeSelection,
} from 'lexical';
import { $isHeadingNode, $createHeadingNode, type HeadingTagType } from '@lexical/rich-text';
import {
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
} from '@lexical/list';
import { $setBlocksType } from '@lexical/selection';
import { $createParagraphNode } from 'lexical';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';
import { $createQuoteNode } from '@lexical/rich-text';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo2,
  Redo2,
  Search,
} from 'lucide-react';
import './EditorToolbar.css';

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
}

function ToolbarButton({ icon, label, active, onClick, disabled }: ToolbarButtonProps) {
  return (
    <button
      className={`editor-toolbar__btn ${active ? 'editor-toolbar__btn--active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      type="button"
    >
      {icon}
    </button>
  );
}

function ToolbarSeparator() {
  return <div className="editor-toolbar__separator" />;
}

export function EditorToolbar() {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [blockType, setBlockType] = useState<string>('paragraph');

  /** Update toolbar state based on current selection. */
  const updateToolbar = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));

      const anchorNode = selection.anchor.getNode();
      const element = anchorNode.getKey() === 'root'
        ? anchorNode
        : anchorNode.getTopLevelElementOrThrow();

      if ($isHeadingNode(element)) {
        setBlockType(element.getTag());
      } else {
        const type = element.getType();
        setBlockType(type);
      }
    });
  }, [editor]);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar();
      });
    });
  }, [editor, updateToolbar]);

  const formatHeading = useCallback(
    (headingTag: HeadingTagType) => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;

        if (blockType === headingTag) {
          $setBlocksType(selection, () => $createParagraphNode());
        } else {
          $setBlocksType(selection, () => $createHeadingNode(headingTag));
        }
      });
    },
    [editor, blockType],
  );

  const formatQuote = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      if (blockType === 'quote') {
        $setBlocksType(selection, () => $createParagraphNode());
      } else {
        $setBlocksType(selection, () => $createQuoteNode());
      }
    });
  }, [editor, blockType]);

  return (
    <div className="editor-toolbar" role="toolbar" aria-label="Formatting toolbar">
      <ToolbarButton
        icon={<Bold size={16} />}
        label="Bold (Ctrl+B)"
        active={isBold}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
      />
      <ToolbarButton
        icon={<Italic size={16} />}
        label="Italic (Ctrl+I)"
        active={isItalic}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
      />
      <ToolbarButton
        icon={<Underline size={16} />}
        label="Underline (Ctrl+U)"
        active={isUnderline}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
      />
      <ToolbarButton
        icon={<Strikethrough size={16} />}
        label="Strikethrough"
        active={isStrikethrough}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')}
      />

      <ToolbarSeparator />

      <ToolbarButton
        icon={<Heading1 size={16} />}
        label="Heading 1"
        active={blockType === 'h1'}
        onClick={() => formatHeading('h1')}
      />
      <ToolbarButton
        icon={<Heading2 size={16} />}
        label="Heading 2"
        active={blockType === 'h2'}
        onClick={() => formatHeading('h2')}
      />
      <ToolbarButton
        icon={<Heading3 size={16} />}
        label="Heading 3"
        active={blockType === 'h3'}
        onClick={() => formatHeading('h3')}
      />
      <ToolbarButton
        icon={<Pilcrow size={16} />}
        label="Normal text"
        active={blockType === 'paragraph'}
        onClick={() => {
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              $setBlocksType(selection, () => $createParagraphNode());
            }
          });
        }}
      />

      <ToolbarSeparator />

      <ToolbarButton
        icon={<List size={16} />}
        label="Bullet List"
        active={blockType === 'ul'}
        onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
      />
      <ToolbarButton
        icon={<ListOrdered size={16} />}
        label="Numbered List"
        active={blockType === 'ol'}
        onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}
      />
      <ToolbarButton
        icon={<Quote size={16} />}
        label="Block Quote"
        active={blockType === 'quote'}
        onClick={formatQuote}
      />
      <ToolbarButton
        icon={<Minus size={16} />}
        label="Horizontal Rule"
        onClick={() => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)}
      />

      <ToolbarSeparator />

      <ToolbarButton
        icon={<Undo2 size={16} />}
        label="Undo (Ctrl+Z)"
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
      />
      <ToolbarButton
        icon={<Redo2 size={16} />}
        label="Redo (Ctrl+Shift+Z)"
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
      />

      <ToolbarSeparator />

      <ToolbarButton
        icon={<Search size={16} />}
        label="Find & Replace (Ctrl+F)"
        onClick={() => window.dispatchEvent(new CustomEvent('quyll:find'))}
      />
    </div>
  );
}
