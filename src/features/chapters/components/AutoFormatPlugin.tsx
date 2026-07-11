import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { TextNode, $getSelection, $isRangeSelection } from 'lexical';

export function AutoFormatPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerNodeTransform(TextNode, (textNode) => {
      const text = textNode.getTextContent();
      let newText = text;

      // 1. Em-dash: replace '--' with '—'
      newText = newText.replace(/--/g, '—');

      // 2. Ellipsis: replace '...' with '…'
      newText = newText.replace(/\.\.\./g, '…');

      // 3. Autocorrect standalone 'i' to 'I'
      // Match 'i' when preceded by start-of-string or whitespace, and followed by whitespace or punctuation
      newText = newText.replace(/(^|\s)i(?=\s|[.,!?;:])/g, '$1I');

      // 4. Auto-capitalize first letter after sentence boundary
      // Match a sentence boundary (. ! ?) followed by 1+ spaces, then a lowercase letter
      newText = newText.replace(/([.!?]\s+)([a-z])/g, (match, space, letter) => {
        return space + letter.toUpperCase();
      });

      // 5. Auto-capitalize first letter of a paragraph
      const prevSibling = textNode.getPreviousSibling();
      if (!prevSibling) {
        newText = newText.replace(/^[a-z]/, (match) => match.toUpperCase());
      }

      // 6. Smart quotes
      // Double quotes
      newText = newText.replace(/(^|\s|\[|\(|{)"/g, '$1“'); // Opening double quote
      newText = newText.replace(/"/g, '”'); // Closing double quote
      
      // Single quotes / Apostrophes
      newText = newText.replace(/(^|\s|\[|\(|{)'/g, '$1‘'); // Opening single quote
      newText = newText.replace(/'/g, '’'); // Apostrophe or closing single quote

      if (newText !== text) {
        // Need to preserve cursor position when string length changes (e.g. '...' -> '…')
        const selection = $getSelection();
        let cursorOffset: number | null = null;

        if ($isRangeSelection(selection) && selection.isCollapsed()) {
          const anchor = selection.anchor;
          if (anchor.getNode().getKey() === textNode.getKey()) {
            cursorOffset = anchor.offset;
          }
        }

        textNode.setTextContent(newText);

        if (cursorOffset !== null) {
          const diff = newText.length - text.length;
          const newOffset = Math.max(0, Math.min(newText.length, cursorOffset + diff));
          textNode.select(newOffset, newOffset);
        }
      }
    });
  }, [editor]);

  return null;
}
