import type { InitialConfigType } from '@lexical/react/LexicalComposer';
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { KeywordNode } from '../components/KeywordNode';
import { htmlToLexicalJson } from '@/services/htmlToMarkdown';

/**
 * Lexical theme mapping — maps Lexical element types to BEM CSS classes.
 */
const editorTheme = {
  paragraph: 'editor__paragraph',
  heading: {
    h1: 'editor__h1',
    h2: 'editor__h2',
    h3: 'editor__h3',
  },
  list: {
    ul: 'editor__ul',
    ol: 'editor__ol',
    listitem: 'editor__li',
    nested: {
      listitem: 'editor__li--nested',
    },
  },
  quote: 'editor__blockquote',
  text: {
    bold: 'editor__text--bold',
    italic: 'editor__text--italic',
    underline: 'editor__text--underline',
    strikethrough: 'editor__text--strikethrough',
    underlineStrikethrough: 'editor__text--underline-strikethrough',
  },
  horizontalRule: 'editor__hr',
};

function onError(error: Error): void {
  console.error('[LexicalEditor]', error);
}

/**
 * Create the initial Lexical editor configuration.
 * Automatically sanitizes and converts legacy/HTML content to valid Lexical JSON.
 */
export function createEditorConfig(initialState?: string | null): InitialConfigType {
  let safeState: string | undefined = undefined;
  if (initialState && initialState.trim()) {
    const trimmed = initialState.trim();
    if (trimmed.startsWith('{')) {
      safeState = trimmed;
    } else {
      safeState = htmlToLexicalJson(initialState);
    }
  }

  return {
    namespace: 'QuyllEditor',
    theme: editorTheme,
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, HorizontalRuleNode, KeywordNode],
    onError,
    editorState: safeState,
  };
}
