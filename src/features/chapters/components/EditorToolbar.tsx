import { useCallback, useEffect, useState, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  KEY_DOWN_COMMAND,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_CRITICAL,
  CAN_UNDO_COMMAND,
  CAN_REDO_COMMAND,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
} from 'lexical';
import { $isHeadingNode, $createHeadingNode, type HeadingTagType } from '@lexical/rich-text';
import {
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
} from '@lexical/list';
import { $setBlocksType, $patchStyleText, $getSelectionStyleValueForProperty } from '@lexical/selection';
import { mergeRegister } from '@lexical/utils';
import { $createQuoteNode } from '@lexical/rich-text';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';

import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Search,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo2,
  Redo2,
  ChevronDown,
  SlidersHorizontal,
  Rows3,
  Minus,
  Wand2,
} from 'lucide-react';
import { useLayoutStore } from '@/store/layoutStore';
import { useSettings } from '@/features/settings/hooks/useSettings';
import './EditorToolbar.css';

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter (Default)' },
  { value: 'Arial', label: 'Arial' },
  { value: '"Courier New", Courier, monospace', label: 'Courier New' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: '"Times New Roman", Times, serif', label: 'Times New Roman' },
  { value: '"Trebuchet MS", Helvetica, sans-serif', label: 'Trebuchet MS' },
  { value: 'Verdana, Geneva, sans-serif', label: 'Verdana' },
  { value: '"Comic Sans MS", cursive, sans-serif', label: 'Comic Sans MS' },
];

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
  const { settings, updateSettings } = useSettings();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [blockType, setBlockType] = useState<string>('paragraph');
  const [alignment, setAlignment] = useState<string>('left');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [pageSetupOpen, setPageSetupOpen] = useState(false);
  const [spacingOpen, setSpacingOpen] = useState(false);
  const [lineSpacing, setLineSpacing] = useState(() => localStorage.getItem('quyll:line-spacing') || '1.72');
  const [paragraphBefore, setParagraphBefore] = useState(() => Number(localStorage.getItem('quyll:paragraph-before') || 0));
  const [paragraphAfter, setParagraphAfter] = useState(() => Number(localStorage.getItem('quyll:paragraph-after') || 14));
  const [pageSize, setPageSize] = useState(() => localStorage.getItem('quyll:page-size') || 'letter');
  const [pageMargins, setPageMargins] = useState<Record<'top' | 'right' | 'bottom' | 'left', number>>(() => {
    try {
      return JSON.parse(localStorage.getItem('quyll:page-margins') || '') as Record<'top' | 'right' | 'bottom' | 'left', number>;
    } catch {
      return { top: 88, right: 92, bottom: 104, left: 92 };
    }
  });
  const { showKeywords, toggleShowKeywords } = useLayoutStore();

  const [highlightColor, setHighlightColor] = useState('#ffff00');
  const [isHighlightActive, setIsHighlightActive] = useState(false);
  const [highlightOpen, setHighlightOpen] = useState(false);

  const highlightRef = useRef<HTMLDivElement>(null);
  const spacingRef = useRef<HTMLDivElement>(null);
  const pageSetupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (highlightOpen && highlightRef.current && !highlightRef.current.contains(event.target as Node)) {
        setHighlightOpen(false);
      }
      if (spacingOpen && spacingRef.current && !spacingRef.current.contains(event.target as Node)) {
        setSpacingOpen(false);
      }
      if (pageSetupOpen && pageSetupRef.current && !pageSetupRef.current.contains(event.target as Node)) {
        setPageSetupOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [highlightOpen, spacingOpen, pageSetupOpen]);

  const applyHighlight = useCallback((color: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, {
          'background-color': color === 'transparent' ? null : color,
        });
      }
    });
  }, [editor]);

  useEffect(() => {
    (Object.keys(pageMargins) as Array<keyof typeof pageMargins>).forEach((side) => {
      document.documentElement.style.setProperty(`--editor-margin-${side}`, `${pageMargins[side]}px`);
    });
    localStorage.setItem('quyll:page-margins', JSON.stringify(pageMargins));
  }, [pageMargins]);

  useEffect(() => {
    const sizes: Record<string, [number, number]> = {
      a3: [1123, 1587],
      a4: [794, 1123],
      a5: [559, 794],
      letter: [816, 1056],
      legal: [816, 1344],
    };
    const [width, height] = sizes[pageSize] ?? sizes.letter!;
    document.documentElement.style.setProperty('--editor-page-width', `${width}px`);
    document.documentElement.style.setProperty('--editor-page-height', `${height}px`);
    localStorage.setItem('quyll:page-size', pageSize);
  }, [pageSize]);

  useEffect(() => {
    document.documentElement.style.setProperty('--editor-line-spacing', lineSpacing);
    document.documentElement.style.setProperty('--editor-paragraph-before', `${paragraphBefore}px`);
    document.documentElement.style.setProperty('--editor-paragraph-after', `${paragraphAfter}px`);
    localStorage.setItem('quyll:line-spacing', lineSpacing);
    localStorage.setItem('quyll:paragraph-before', String(paragraphBefore));
    localStorage.setItem('quyll:paragraph-after', String(paragraphAfter));
  }, [lineSpacing, paragraphBefore, paragraphAfter]);

  /** Update toolbar state based on current selection. */
  const updateToolbar = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));

      const bg = $getSelectionStyleValueForProperty(selection, 'background-color', '');
      setIsHighlightActive(bg !== '' && bg !== 'transparent');
      if (bg && bg !== 'transparent') {
        setHighlightColor(bg);
      }

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

      if ('getFormatType' in element && typeof element.getFormatType === 'function') {
        setAlignment(element.getFormatType() || 'left');
      } else {
        setAlignment('left');
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

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload: boolean) => {
          setCanUndo(payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload: boolean) => {
          setCanRedo(payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      )
    );
  }, [editor]);

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

  const setBlockStyle = useCallback((value: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      if (value === 'paragraph') {
        $setBlocksType(selection, () => $createParagraphNode());
      } else if (value === 'quote') {
        $setBlocksType(selection, () => $createQuoteNode());
      } else {
        $setBlocksType(selection, () => $createHeadingNode(value as HeadingTagType));
      }
    });
    editor.focus();
  }, [editor]);

  useEffect(() => editor.registerCommand(
    KEY_DOWN_COMMAND,
    (event) => {
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();


      if (mod && event.shiftKey && key === '7') {
        event.preventDefault();
        editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
        return true;
      }
      if (mod && event.shiftKey && key === '8') {
        event.preventDefault();
        editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
        return true;
      }
      if (mod && event.altKey && ['0', '1', '2', '3'].includes(key)) {
        event.preventDefault();
        setBlockStyle(key === '0' ? 'paragraph' : `h${key}`);
        return true;
      }
      if (mod && event.shiftKey && ['l', 'e', 'r', 'j'].includes(key)) {
        event.preventDefault();
        const alignments = { l: 'left', e: 'center', r: 'right', j: 'justify' } as const;
        editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, alignments[key as keyof typeof alignments]);
        return true;
      }
      if (event.altKey && event.shiftKey && key === '5') {
        event.preventDefault();
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
        return true;
      }
      return false;
    },
    COMMAND_PRIORITY_HIGH,
  ), [editor, setBlockStyle]);

  const pageWidth = ({ a3: 1123, a4: 794, a5: 559, letter: 816, legal: 816 } as Record<string, number>)[pageSize] ?? 816;
  const adjustHorizontalMargin = useCallback((side: 'left' | 'right', value: number) => {
    setPageMargins((current) => ({ ...current, [side]: Math.round(Math.min(240, Math.max(0, value)) * 2) / 2 }));
  }, []);
  const beginRulerDrag = useCallback((side: 'left' | 'right', event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const ruler = event.currentTarget.parentElement;
    if (!ruler) return;
    const rect = ruler.getBoundingClientRect();
    const update = (clientX: number) => {
      const position = Math.min(rect.width, Math.max(0, clientX - rect.left));
      const documentPosition = position * (pageWidth / rect.width);
      adjustHorizontalMargin(side, side === 'left' ? documentPosition : pageWidth - documentPosition);
    };
    const move = (moveEvent: PointerEvent) => update(moveEvent.clientX);
    const finish = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish, { once: true });
    update(event.clientX);
}, [adjustHorizontalMargin, pageWidth]);

  return (
    <>
    <div className="editor-toolbar" role="toolbar" aria-label="Formatting toolbar">
      <ToolbarButton
        icon={<Undo2 size={16} />}
        label="Undo (Ctrl+Z)"
        disabled={!canUndo}
        onClick={() => {
          editor.dispatchCommand(UNDO_COMMAND, undefined);
        }}
      />
      <ToolbarButton
        icon={<Redo2 size={16} />}
        label="Redo (Ctrl+Y)"
        disabled={!canRedo}
        onClick={() => {
          editor.dispatchCommand(REDO_COMMAND, undefined);
        }}
      />

      <ToolbarSeparator />

      <label className="editor-toolbar__style-select" title="Font family">
        <span className="sr-only">Font family</span>
        <select 
          value={settings?.editor_font ?? 'Inter'} 
          onChange={(event) => void updateSettings({ editor_font: event.target.value })}
        >
          {FONT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown size={14} aria-hidden="true" />
      </label>

      <ToolbarSeparator />

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

      <div className="editor-toolbar__split-btn-group" ref={highlightRef}>
        <button
          type="button"
          className={`editor-toolbar__btn editor-toolbar__split-btn-main ${isHighlightActive ? 'editor-toolbar__btn--active' : ''}`}
          onClick={() => {
            applyHighlight(isHighlightActive ? 'transparent' : highlightColor);
          }}
          title="Highlight Text"
        >
          <Highlighter size={16} />
          <div className="editor-toolbar__highlight-indicator" style={{ backgroundColor: highlightColor === 'transparent' ? 'transparent' : highlightColor }} />
        </button>
        <button
          type="button"
          className="editor-toolbar__btn editor-toolbar__split-btn-arrow"
          onClick={() => setHighlightOpen((open) => !open)}
        >
          <ChevronDown size={12} />
        </button>

        {highlightOpen && (
          <div className="editor-toolbar__page-setup-popover" style={{ position: 'absolute', top: '100%', left: 0, zIndex: 100, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', padding: '8px', width: 'max-content' }}>
            {['#ffff00', '#00ff00', '#00ffff', '#ff00ff', '#ff0000', '#0000ff', '#ff8800', '#888888', '#ffffff', 'transparent'].map(color => (
              <button
                key={color}
                type="button"
                onClick={() => {
                  setHighlightColor(color);
                  applyHighlight(color);
                  setHighlightOpen(false);
                }}
                style={{
                  width: '24px', height: '24px', backgroundColor: color === 'transparent' ? 'transparent' : color,
                  border: '1px solid var(--color-border)', borderRadius: '4px', cursor: 'pointer',
                  position: 'relative'
                }}
                title={color === 'transparent' ? 'No Color' : color}
              >
                {color === 'transparent' && <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '10px' }}>❌</span>}
              </button>
            ))}
          </div>
        )}
      </div>

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
        icon={<Quote size={16} />}
        label="Block Quote"
        active={blockType === 'quote'}
        onClick={formatQuote}
      />
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

      <ToolbarSeparator />

      <ToolbarButton
        icon={<AlignLeft size={16} />}
        label="Align Left"
        active={alignment === 'left'}
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left')}
      />
      <ToolbarButton
        icon={<AlignCenter size={16} />}
        label="Align Center"
        active={alignment === 'center'}
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center')}
      />
      <ToolbarButton
        icon={<AlignRight size={16} />}
        label="Align Right"
        active={alignment === 'right'}
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right')}
      />
      <ToolbarButton
        icon={<AlignJustify size={16} />}
        label="Justify"
        active={alignment === 'justify'}
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify')}
      />

      <ToolbarSeparator />

      <div className="editor-toolbar__page-setup" ref={spacingRef}>
        <button className={`editor-toolbar__btn ${spacingOpen ? 'active' : ''}`} type="button" onClick={() => setSpacingOpen((open) => !open)} aria-expanded={spacingOpen} title="Spacing">
          <Rows3 size={16} />
        </button>
        {spacingOpen && (
          <div className="editor-toolbar__page-setup-popover editor-toolbar__spacing-popover">
            <strong>Text spacing</strong>
            <p>Set line and paragraph spacing for this document.</p>
            <label className="editor-toolbar__paper-size">
              <span>Line spacing</span>
              <select value={lineSpacing} onChange={(event) => setLineSpacing(event.target.value)}>
                <option value="1">Single</option>
                <option value="1.15">1.15</option>
                <option value="1.5">1.5</option>
                <option value="1.72">Default</option>
                <option value="2">Double</option>
              </select>
            </label>
            <div className="editor-toolbar__margin-grid">
              <label><span>Before paragraph</span><input type="number" min="0" max="72" step="1" value={paragraphBefore} onChange={(event) => setParagraphBefore(Number(event.target.value))} /></label>
              <label><span>After paragraph</span><input type="number" min="0" max="72" step="1" value={paragraphAfter} onChange={(event) => setParagraphAfter(Number(event.target.value))} /></label>
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        className="editor-toolbar__btn"
        onClick={() => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)}
        title="Insert horizontal line"
      >
        <Minus size={16} />
      </button>



      <div className="editor-toolbar__page-setup" ref={pageSetupRef}>
        <button className={`editor-toolbar__btn ${pageSetupOpen ? 'active' : ''}`} type="button" onClick={() => setPageSetupOpen((open) => !open)} aria-expanded={pageSetupOpen} title="Margins">
          <SlidersHorizontal size={16} />
        </button>
        {pageSetupOpen && (
          <div className="editor-toolbar__page-setup-popover">
            <strong>Page setup</strong>
            <p>Choose a paper size and adjust each margin.</p>
            <label className="editor-toolbar__paper-size">
              <span>Paper size</span>
              <select value={pageSize} onChange={(event) => setPageSize(event.target.value)}>
                <option value="a3">A3 — 297 × 420 mm</option>
                <option value="a4">A4 — 210 × 297 mm</option>
                <option value="a5">A5 — 148 × 210 mm</option>
                <option value="letter">Letter — 8.5 × 11 in</option>
                <option value="legal">Legal — 8.5 × 14 in</option>
              </select>
            </label>
            <div className="editor-toolbar__margin-grid">
              {(Object.keys(pageMargins) as Array<keyof typeof pageMargins>).map((side) => (
                <label key={`${side}-${pageMargins[side]}`}>
                  <span>{side}</span>
                  <input
                    type="number"
                    min="0"
                    max="240"
                    step="0.5"
                    defaultValue={pageMargins[side]}
                    aria-label={`${side} margin in pixels`}
                    onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
                    onBlur={(event) => {
                      const parsed = Number.parseFloat(event.target.value);
                      const value = Number.isFinite(parsed) ? Math.min(240, Math.max(0, parsed)) : pageMargins[side];
                      setPageMargins((current) => ({ ...current, [side]: value }));
                    }}
                  />
                </label>
              ))}
            </div>
            <button type="button" onClick={() => setPageMargins({ top: 88, right: 92, bottom: 104, left: 92 })}>Reset to normal</button>
          </div>
        )}
      </div>

      <ToolbarSeparator />

      <button
        className="editor-toolbar__pill-btn"
        onClick={() => window.dispatchEvent(new CustomEvent('quyll:find'))}
        title="Find & Replace (Ctrl+F)"
        type="button"
      >
        <Search size={14} />
        <span>Find & Replace</span>
      </button>

      <ToolbarButton
        icon={<Wand2 size={16} />}
        label="Toggle Keyword Highlighting"
        active={showKeywords}
        onClick={toggleShowKeywords}
      />
    </div>
    <div className="editor-ruler-shell" aria-label="Page margin ruler">
      <div className="editor-ruler">
        <span className="editor-ruler__ticks" aria-hidden="true" />
        <span className="editor-ruler__content-range" style={{ left: `${(pageMargins.left / pageWidth) * 100}%`, right: `${(pageMargins.right / pageWidth) * 100}%` }} />
        <button
          type="button"
          className="editor-ruler__handle editor-ruler__handle--left"
          style={{ left: `${(pageMargins.left / pageWidth) * 100}%` }}
          onPointerDown={(event) => beginRulerDrag('left', event)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') adjustHorizontalMargin('left', pageMargins.left - 4);
            if (event.key === 'ArrowRight') adjustHorizontalMargin('left', pageMargins.left + 4);
          }}
          aria-label={`Left margin ${pageMargins.left} pixels`}
          title={`Left margin: ${pageMargins.left}px`}
        />
        <button
          type="button"
          className="editor-ruler__handle editor-ruler__handle--right"
          style={{ left: `${100 - (pageMargins.right / pageWidth) * 100}%` }}
          onPointerDown={(event) => beginRulerDrag('right', event)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') adjustHorizontalMargin('right', pageMargins.right + 4);
            if (event.key === 'ArrowRight') adjustHorizontalMargin('right', pageMargins.right - 4);
          }}
          aria-label={`Right margin ${pageMargins.right} pixels`}
          title={`Right margin: ${pageMargins.right}px`}
        />
      </div>
    </div>
    </>
  );
}
