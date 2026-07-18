import { useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, TextNode, type LexicalEditor } from 'lexical';
import { $createKeywordNode, $isKeywordNode, KeywordNode } from './KeywordNode';
import { keywordService } from '@/services/keywordService';
import { useProjectDb } from '@/hooks/useProjectDb';
import type { Keyword } from '@/types/database';

export function KeywordPlugin() {
  const [editor] = useLexicalComposerContext();
  const { db, projectId } = useProjectDb();
  const keywordsRef = useRef<Keyword[]>([]);
  const timeoutRef = useRef<number | null>(null);

  // 1. Fetch keywords on mount and when project changes
  useEffect(() => {
    if (!db || !projectId) return;

    let isMounted = true;
    keywordService.list(db, projectId).then((kws) => {
      if (isMounted) {
        // Sort by length descending so longer phrases match first
        keywordsRef.current = kws.sort((a, b) => b.display_name.length - a.display_name.length);
        // Run initial parse
        scheduleKeywordParse(editor, keywordsRef.current);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [db, projectId, editor]);

  // 2. Listen for editor changes, debounce parsing
  useEffect(() => {
    return editor.registerUpdateListener(({ tags }) => {
      // Avoid looping if the update was triggered by our own parsing
      if (tags.has('keyword-parse')) return;

      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        scheduleKeywordParse(editor, keywordsRef.current);
      }, 500); // 500ms debounce
    });
  }, [editor]);

  // 3. Register a node transform to downgrade invalid KeywordNodes
  useEffect(() => {
    return editor.registerNodeTransform(KeywordNode, (node) => {
      const textContent = node.getTextContent();
      const keyword = keywordsRef.current.find(k => k.id === node.__keywordId);
      
      // If the keyword text no longer matches the expected display name, downgrade it to a TextNode
      // If the keyword text no longer matches the expected display name, unwrap it
      if (!keyword || keyword.display_name.toLowerCase() !== textContent.toLowerCase()) {
        const children = node.getChildren();
        for (const child of children) {
          node.insertBefore(child);
        }
        node.remove();
      }
    });
  }, [editor]);

  return null;
}

/**
 * Trigger an editor update to scan for keywords.
 */
function scheduleKeywordParse(editor: LexicalEditor, keywords: Keyword[]) {
  if (keywords.length === 0) return;

  editor.update(
    () => {
      const root = $getRoot();
      const textNodes: TextNode[] = [];

      // Collect all standard text nodes
      const allTextNodes = root.getAllTextNodes();
      for (const node of allTextNodes) {
        if (!$isKeywordNode(node.getParent())) {
          textNodes.push(node);
        }
      }

      // Build a fast regex for all keywords
      const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const keywordNames = keywords.map(k => escapeRegExp(k.display_name));
      // Word boundaries \b to avoid matching partial words
      const regex = new RegExp(`\\b(${keywordNames.join('|')})\\b`, 'i');

      for (let i = 0; i < textNodes.length; i++) {
        let textNode = textNodes[i];
        
        let match;
        // Find all matches in the current text node
        while ((match = regex.exec(textNode!.getTextContent())) !== null) {
          const matchedText = match[0];
          const keyword = keywords.find(k => k.display_name.toLowerCase() === matchedText.toLowerCase());
          
          if (keyword) {
            const startIndex = match.index;
            let targetNode = textNode;
            
            if (startIndex > 0) {
              [, targetNode] = targetNode!.splitText(startIndex);
            }
            
            if (targetNode!.getTextContent().length > matchedText.length) {
              [targetNode, textNode] = targetNode!.splitText(matchedText.length);
              // textNode is now the remainder of the text, so the next iteration of the while loop will parse it correctly
              // reset regex lastIndex since we are checking a new node
              regex.lastIndex = 0;
            } else {
              // We reached the end of the text node, break the while loop
              match = null;
            }
            
            const keywordNode = $createKeywordNode(keyword.id, keyword.entity_type);
            targetNode!.insertBefore(keywordNode);
            keywordNode.append(targetNode!);
            
            if (!match) break;
          }
        }
      }
    },
    { tag: 'keyword-parse' }
  );
}
