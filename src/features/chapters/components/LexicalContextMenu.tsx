import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection, CUT_COMMAND, COPY_COMMAND } from 'lexical';
import { Scissors, Copy, ClipboardPaste, BookOpen, ChevronRight, SpellCheck, Check } from 'lucide-react';
import { getSynonyms, getSpellingSuggestions, isWordInDictionary, addToCustomDictionary } from '@/services/thesaurusService';
import './LexicalContextMenu.css';

interface MenuPosition {
  x: number;
  y: number;
  submenuLeft: boolean;
  submenuBottom: boolean;
}

export function LexicalContextMenu() {
  const [editor] = useLexicalComposerContext();
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const [targetWord, setTargetWord] = useState<string>('');
  const [synonymsList, setSynonymsList] = useState<string[]>([]);
  const [spellingList, setSpellingList] = useState<string[]>([]);
  const [isMisspelled, setIsMisspelled] = useState<boolean>(false);
  const [submenuOpen, setSubmenuOpen] = useState<boolean>(false);
  const [submenuStyle, setSubmenuStyle] = useState<React.CSSProperties>({});
  const menuRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (menuPos && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const margin = 12;
      let adjustedY = menuPos.y;
      let adjustedX = menuPos.x;

      if (rect.bottom > window.innerHeight - margin) {
        adjustedY = Math.max(margin, window.innerHeight - rect.height - margin);
      }
      if (rect.right > window.innerWidth - margin) {
        adjustedX = Math.max(margin, window.innerWidth - rect.width - margin);
      }

      if (adjustedY !== menuPos.y || adjustedX !== menuPos.x) {
        setMenuPos(prev => prev ? { ...prev, x: adjustedX, y: adjustedY } : null);
      }
    }
  }, [menuPos?.x, menuPos?.y, isMisspelled, spellingList.length]);

  useLayoutEffect(() => {
    if (submenuOpen && triggerRef.current && submenuRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const submenuRect = submenuRef.current.getBoundingClientRect();
      const margin = 12;

      let left = triggerRect.right;
      if (left + submenuRect.width > window.innerWidth - margin) {
        left = triggerRect.left - submenuRect.width;
      }

      let top = triggerRect.top - 6;
      if (top + submenuRect.height > window.innerHeight - margin) {
        top = Math.max(margin, window.innerHeight - submenuRect.height - margin);
      }

      setSubmenuStyle({
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        zIndex: 100000,
      });
    } else {
      setSubmenuStyle({});
    }
  }, [submenuOpen, synonymsList]);

  const closeMenu = useCallback(() => {
    setMenuPos(null);
    setSubmenuOpen(false);
  }, []);

  useEffect(() => {
    const handlePointerDownOutside = (e: MouseEvent) => {
      if (
        (menuRef.current && menuRef.current.contains(e.target as Node)) ||
        (submenuRef.current && submenuRef.current.contains(e.target as Node))
      ) {
        return;
      }
      closeMenu();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };

    if (menuPos) {
      window.addEventListener('mousedown', handlePointerDownOutside);
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('scroll', closeMenu, true);
      window.addEventListener('resize', closeMenu);
    }
    return () => {
      window.removeEventListener('mousedown', handlePointerDownOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', closeMenu, true);
      window.removeEventListener('resize', closeMenu);
    };
  }, [menuPos, closeMenu]);

  useEffect(() => {
    const rootElement = editor.getRootElement();
    if (!rootElement) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();

      let wordDetected = '';

      editor.update(() => {
        let selection = $getSelection();
        let text = '';

        if ($isRangeSelection(selection) && !selection.isCollapsed()) {
          text = selection.getTextContent().trim();
        }

        if (!text || text.includes(' ') || text.includes('\n')) {
          const range = (document as any).caretRangeFromPoint
            ? document.caretRangeFromPoint(e.clientX, e.clientY)
            : (document as any).caretPositionFromPoint
            ? (document as any).caretPositionFromPoint(e.clientX, e.clientY)
            : null;

          if (range && range.startContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
            const textNode = range.startContainer;
            const fullText = textNode.textContent || '';
            const offset = range.startOffset || (range.offset ?? 0);

            let start = offset;
            while (start > 0 && /[\w'-]/.test(fullText[start - 1])) {
              start--;
            }
            let end = offset;
            while (end < fullText.length && /[\w'-]/.test(fullText[end])) {
              end++;
            }

            if (end > start) {
              const candidateWord = fullText.slice(start, end);
              const newRange = document.createRange();
              newRange.setStart(textNode, start);
              newRange.setEnd(textNode, end);
              const domSelection = window.getSelection();
              if (domSelection) {
                domSelection.removeAllRanges();
                domSelection.addRange(newRange);
              }
              wordDetected = candidateWord;
            }
          }
        } else {
          wordDetected = text;
        }
      });

      const cleanCandidate = wordDetected.trim();
      setTargetWord(cleanCandidate);

      let misspelled = false;
      let suggestionsList: string[] = [];
      if (cleanCandidate && !cleanCandidate.includes(' ') && !cleanCandidate.includes('\n') && cleanCandidate.length > 1 && /^[a-zA-Z'-]+$/.test(cleanCandidate)) {
        setSynonymsList(getSynonyms(cleanCandidate, 10));
        misspelled = !isWordInDictionary(cleanCandidate);
        setIsMisspelled(misspelled);
        if (misspelled) {
          suggestionsList = getSpellingSuggestions(cleanCandidate, 5);
          setSpellingList(suggestionsList);
        } else {
          setSpellingList([]);
        }
      } else {
        setSynonymsList([]);
        setIsMisspelled(false);
        setSpellingList([]);
      }

      const menuWidth = 220;
      const estimatedMenuHeight = 210 + (misspelled ? 80 + suggestionsList.length * 36 : 0);
      const submenuHeight = 320;
      let x = e.clientX;
      let y = e.clientY;

      if (x + menuWidth > window.innerWidth - 12) {
        x = Math.max(12, window.innerWidth - menuWidth - 12);
      }
      if (y + estimatedMenuHeight > window.innerHeight - 12) {
        y = Math.max(12, window.innerHeight - estimatedMenuHeight - 12);
      }

      const submenuLeft = x + menuWidth + 220 > window.innerWidth;
      const submenuBottom = y + 140 + submenuHeight > window.innerHeight;

      setMenuPos({ x, y, submenuLeft, submenuBottom });
      setSubmenuOpen(false);
    };

    rootElement.addEventListener('contextmenu', handleContextMenu);
    return () => {
      rootElement.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [editor]);

  const handleCut = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const text = selection.getTextContent();
        navigator.clipboard?.writeText(text);
        selection.insertText('');
      }
    });
    editor.dispatchCommand(CUT_COMMAND, null);
    closeMenu();
  };

  const handleCopy = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const text = selection.getTextContent();
        navigator.clipboard?.writeText(text);
      }
    });
    editor.dispatchCommand(COPY_COMMAND, null);
    closeMenu();
  };

  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.insertText(text);
          }
        });
      } else {
        document.execCommand('paste');
      }
    } catch (err) {
      console.warn('Paste failed or permission denied:', err);
    }
    closeMenu();
  };

  const handleReplaceWithSynonym = (synonym: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.insertText(synonym);
      }
    });
    closeMenu();
  };


  if (!menuPos) return null;

  const hasSynonyms = synonymsList.length > 0;

  return (
    <div
      ref={menuRef}
      className="lexical-context-menu"
      style={{ left: menuPos.x, top: menuPos.y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {isMisspelled && targetWord && (
        <>
          <div className="lexical-context-menu__spelling-header">
            <SpellCheck className="lexical-context-menu__spelling-icon" />
            <span>Spelling: <strong>{targetWord}</strong></span>
          </div>
          {spellingList.length > 0 ? (
            spellingList.map((syn, idx) => (
              <button
                key={idx}
                className="lexical-context-menu__item lexical-context-menu__spelling-item"
                onMouseEnter={() => setSubmenuOpen(false)}
                onClick={() => handleReplaceWithSynonym(syn)}
              >
                <div className="lexical-context-menu__item-left">
                  <span className="lexical-context-menu__spelling-word">{syn}</span>
                </div>
              </button>
            ))
          ) : (
            <div className="lexical-context-menu__synonym--empty">
              No spelling suggestions
            </div>
          )}
          <button
            className="lexical-context-menu__item lexical-context-menu__add-dict-item"
            onMouseEnter={() => setSubmenuOpen(false)}
            onClick={() => {
              addToCustomDictionary(targetWord);
              setIsMisspelled(false);
              closeMenu();
            }}
          >
            <div className="lexical-context-menu__item-left">
              <Check className="lexical-context-menu__icon" />
              <span>Add to Dictionary</span>
            </div>
          </button>
          <div className="lexical-context-menu__divider" />
        </>
      )}


      <button
        className="lexical-context-menu__item"
        onMouseEnter={() => setSubmenuOpen(false)}
        onClick={handleCut}
      >
        <div className="lexical-context-menu__item-left">
          <Scissors className="lexical-context-menu__icon" />
          <span>Cut</span>
        </div>
        <span className="lexical-context-menu__shortcut">Ctrl+X</span>
      </button>

      <button
        className="lexical-context-menu__item"
        onMouseEnter={() => setSubmenuOpen(false)}
        onClick={handleCopy}
      >
        <div className="lexical-context-menu__item-left">
          <Copy className="lexical-context-menu__icon" />
          <span>Copy</span>
        </div>
        <span className="lexical-context-menu__shortcut">Ctrl+C</span>
      </button>

      <button
        className="lexical-context-menu__item"
        onMouseEnter={() => setSubmenuOpen(false)}
        onClick={handlePaste}
      >
        <div className="lexical-context-menu__item-left">
          <ClipboardPaste className="lexical-context-menu__icon" />
          <span>Paste</span>
        </div>
        <span className="lexical-context-menu__shortcut">Ctrl+V</span>
      </button>

      <div className="lexical-context-menu__divider" />

      <div
        ref={triggerRef}
        className="lexical-context-menu__item lexical-context-menu__submenu-trigger"
        onMouseEnter={() => setSubmenuOpen(true)}
        onClick={() => setSubmenuOpen(prev => !prev)}
      >
        <div className="lexical-context-menu__item-left">
          <BookOpen className="lexical-context-menu__icon" />
          <span>Synonyms</span>
          {targetWord && <span style={{ color: 'var(--color-primary, #F59E0B)', fontSize: '0.75rem', fontWeight: 600 }}>({targetWord})</span>}
        </div>
        <ChevronRight className="lexical-context-menu__icon" />
      </div>

      {submenuOpen && createPortal(
        <div
          ref={submenuRef}
          style={submenuStyle}
          className="lexical-context-menu__submenu"
          onContextMenu={(e) => e.preventDefault()}
        >
          {hasSynonyms ? (
            synonymsList.map((syn, idx) => (
              <div
                key={idx}
                className="lexical-context-menu__synonym"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReplaceWithSynonym(syn);
                }}
              >
                {syn}
              </div>
            ))
          ) : (
            <div className="lexical-context-menu__synonym--empty">
              {targetWord ? 'No synonyms found' : 'Select a word first'}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
