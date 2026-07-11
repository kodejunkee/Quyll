import { useState, useEffect, useCallback } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $createRangeSelection, $setSelection, $isTextNode, $isElementNode, LexicalNode } from 'lexical';
import { X, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components';
import './FindAndReplacePlugin.css';

interface Match {
  id: string;
  startNodeKey: string;
  startOffset: number;
  endNodeKey: string;
  endOffset: number;
  text: string;
}

export function FindAndReplacePlugin() {
  const [editor] = useLexicalComposerContext();
  const [isOpen, setIsOpen] = useState(false);
  const [searchString, setSearchString] = useState('');
  const [replaceString, setReplaceString] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeMatchIndex, setActiveMatchIndex] = useState(-1);

  useEffect(() => {
    function openFind() {
      setIsOpen(true);
      setTimeout(() => {
        document.getElementById('quyll-find-input')?.focus();
      }, 0);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        e.stopPropagation(); // Prevent Lexical from getting it
        openFind();
      }
    }
    
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('quyll:find', openFind);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('quyll:find', openFind);
    };
  }, []);

  // Compute matches
  const computeMatches = useCallback(() => {
    if (!searchString) {
      setMatches([]);
      setActiveMatchIndex(-1);
      return;
    }

    editor.getEditorState().read(() => {
      const root = $getRoot();
      const foundMatches: Match[] = [];
      const lowerSearch = searchString.toLowerCase();

      // Simple implementation: search within each TextNode individually
      // (This avoids complex cross-node boundary mapping)
      function traverse(node: LexicalNode) {
        if ($isTextNode(node)) {
          const text = node.getTextContent();
          const lowerText = text.toLowerCase();
          let startIndex = 0;
          let index = lowerText.indexOf(lowerSearch, startIndex);
          
          while (index !== -1) {
            foundMatches.push({
              id: `${node.getKey()}-${index}`,
              startNodeKey: node.getKey(),
              startOffset: index,
              endNodeKey: node.getKey(),
              endOffset: index + searchString.length,
              text: text.substring(index, index + searchString.length),
            });
            startIndex = index + searchString.length;
            index = lowerText.indexOf(lowerSearch, startIndex);
          }
        } else if ($isElementNode(node)) {
          const children = node.getChildren();
          for (const child of children) {
            traverse(child);
          }
        }
      }

      traverse(root);
      
      setMatches(foundMatches);
      
      // Keep active index in bounds
      if (foundMatches.length > 0) {
        setActiveMatchIndex((prev) => (prev >= 0 && prev < foundMatches.length ? prev : 0));
      } else {
        setActiveMatchIndex(-1);
      }
    });
  }, [editor, searchString]);

  // Re-compute when search string changes
  useEffect(() => {
    computeMatches();
  }, [computeMatches]);

  // Highlight active match
  useEffect(() => {
    // Check if CSS Custom Highlight API is supported
    if (!('highlights' in CSS)) {
      return;
    }

    const HighlightClass = (window as any).Highlight;
    const allMatchesHighlight = new HighlightClass();
    const activeMatchHighlight = new HighlightClass();

    editor.getEditorState().read(() => {
      matches.forEach((match, index) => {
        const startDOM = editor.getElementByKey(match.startNodeKey);
        const endDOM = editor.getElementByKey(match.endNodeKey);
        if (!startDOM || !endDOM) return;
        
        // Find text nodes inside Lexical spans
        const startText = Array.from(startDOM.childNodes).find(n => n.nodeType === 3) || startDOM.firstChild;
        const endText = Array.from(endDOM.childNodes).find(n => n.nodeType === 3) || endDOM.firstChild;
        
        if (!startText || !endText) return;

        try {
          const range = new Range();
          range.setStart(startText, match.startOffset);
          range.setEnd(endText, match.endOffset);

          if (index === activeMatchIndex) {
            activeMatchHighlight.add(range);
            // Optionally scroll the active match into view if it's out of bounds
            const rect = range.getBoundingClientRect();
            if (rect.top < 0 || rect.bottom > window.innerHeight) {
              startDOM.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }
          } else {
            allMatchesHighlight.add(range);
          }
        } catch (e) {
          console.error('Find Highlight error:', e);
        }
      });
    });

    (CSS as any).highlights.set('find-matches', allMatchesHighlight);
    (CSS as any).highlights.set('find-active-match', activeMatchHighlight);

    return () => {
      (CSS as any).highlights.delete('find-matches');
      (CSS as any).highlights.delete('find-active-match');
    };
  }, [editor, activeMatchIndex, matches]);

  const handleNext = () => {
    if (matches.length > 0) {
      setActiveMatchIndex((prev) => (prev + 1) % matches.length);
    }
  };

  const handlePrev = () => {
    if (matches.length > 0) {
      setActiveMatchIndex((prev) => (prev - 1 + matches.length) % matches.length);
    }
  };

  const handleReplace = () => {
    if (activeMatchIndex >= 0 && matches.length > 0) {
      editor.update(() => {
        const match = matches[activeMatchIndex];
        if (!match) return;
        const selection = $createRangeSelection();
        selection.anchor.set(match.startNodeKey, match.startOffset, 'text');
        selection.focus.set(match.endNodeKey, match.endOffset, 'text');
        $setSelection(selection);
        selection.insertText(replaceString);
      });
      // The update above will trigger a re-render/re-compute because editor content changed
      // Wait for it, then matches will update
      setTimeout(computeMatches, 0);
    }
  };

  const handleReplaceAll = () => {
    if (matches.length > 0) {
      editor.update(() => {
        // Replace backwards to avoid messing up offsets for subsequent matches in the same node
        const sortedMatches = [...matches].sort((a, b) => {
           if (a.startNodeKey === b.startNodeKey) {
             return b.startOffset - a.startOffset; // reverse order
           }
           return 0; // if different nodes, order doesn't matter as much, but actually it might if we used a global traversal list.
           // In our traverse, nodes are visited in order. So we can just reverse the whole array.
        }).reverse();

        for (const match of sortedMatches) {
          if (!match) continue;
          const selection = $createRangeSelection();
          selection.anchor.set(match.startNodeKey, match.startOffset, 'text');
          selection.focus.set(match.endNodeKey, match.endOffset, 'text');
          $setSelection(selection);
          selection.insertText(replaceString);
        }
      });
      setTimeout(computeMatches, 0);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setSearchString('');
    setReplaceString('');
    setMatches([]);
    setActiveMatchIndex(-1);
    editor.update(() => {
      // Clear selection
      const root = $getRoot();
      root.selectEnd();
    });
  };

  if (!isOpen) return null;

  return (
    <div className="find-replace-panel">
      <div className="find-replace-panel__row">
        <input
          id="quyll-find-input"
          className="find-replace-panel__input"
          placeholder="Find..."
          value={searchString}
          onChange={(e) => setSearchString(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (e.shiftKey) handlePrev();
              else handleNext();
            }
            if (e.key === 'Escape') handleClose();
          }}
        />
        <span className="find-replace-panel__counter">
          {matches.length > 0 ? `${activeMatchIndex + 1} of ${matches.length}` : '0 of 0'}
        </span>
        <div className="find-replace-panel__nav">
          <Button variant="ghost" size="sm" onClick={handlePrev} disabled={matches.length === 0} title="Previous (Shift+Enter)">
            <ChevronUp size={16} />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleNext} disabled={matches.length === 0} title="Next (Enter)">
            <ChevronDown size={16} />
          </Button>
        </div>
        <button className="find-replace-panel__close" onClick={handleClose} title="Close (Esc)">
          <X size={16} />
        </button>
      </div>
      <div className="find-replace-panel__row">
        <input
          className="find-replace-panel__input"
          placeholder="Replace with..."
          value={replaceString}
          onChange={(e) => setReplaceString(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleReplace();
            }
            if (e.key === 'Escape') handleClose();
          }}
        />
        <div className="find-replace-panel__actions">
          <Button variant="secondary" size="sm" onClick={handleReplace} disabled={matches.length === 0}>
            Replace
          </Button>
          <Button variant="secondary" size="sm" onClick={handleReplaceAll} disabled={matches.length === 0}>
            Replace All
          </Button>
        </div>
      </div>
    </div>
  );
}
