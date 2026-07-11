import {
  ElementNode,
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedElementNode,
} from 'lexical';

export type SerializedKeywordNode = SerializedElementNode & {
  keywordId: string;
  entityType: string;
};

/**
 * A custom Lexical node representing a Keyword.
 * It renders as a standard span with data attributes, enabling the KeywordHoverCard
 * and global click listeners to interact with it.
 */
export class KeywordNode extends ElementNode {
  __keywordId: string;
  __entityType: string;

  static getType(): string {
    return 'keyword';
  }

  static clone(node: KeywordNode): KeywordNode {
    return new KeywordNode(node.__keywordId, node.__entityType, node.__key);
  }

  constructor(keywordId: string, entityType: string, key?: NodeKey) {
    super(key);
    this.__keywordId = keywordId;
    this.__entityType = entityType;
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const dom = document.createElement('span');
    dom.className = 'editor__keyword';
    dom.dataset.keywordId = this.__keywordId;
    dom.dataset.entityType = this.__entityType;
    return dom;
  }

  updateDOM(prevNode: KeywordNode, dom: HTMLElement, _config: EditorConfig): boolean {
    if (prevNode.__keywordId !== this.__keywordId) {
      dom.dataset.keywordId = this.__keywordId;
    }
    if (prevNode.__entityType !== this.__entityType) {
      dom.dataset.entityType = this.__entityType;
    }
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: (node: HTMLElement) => {
        if (!node.classList.contains('editor__keyword')) return null;
        return {
          conversion: convertKeywordElement,
          priority: 1,
        };
      },
    };
  }

  exportDOM(editor: import('lexical').LexicalEditor): DOMExportOutput {
    const { element } = super.exportDOM(editor);
    if (element && element instanceof HTMLElement) {
      element.dataset.keywordId = this.__keywordId;
      element.dataset.entityType = this.__entityType;
      element.className = 'editor__keyword';
    }
    return { element };
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }

  isInline(): boolean {
    return true;
  }

  exportJSON(): SerializedKeywordNode {
    return {
      ...super.exportJSON(),
      keywordId: this.__keywordId,
      entityType: this.__entityType,
      type: 'keyword',
      version: 1,
    };
  }

  static importJSON(serializedNode: SerializedKeywordNode): KeywordNode {
    const node = $createKeywordNode(
      serializedNode.keywordId,
      serializedNode.entityType,
    );
    node.setFormat(serializedNode.format);
    node.setIndent(serializedNode.indent);
    node.setDirection(serializedNode.direction);
    return node;
  }
}

function convertKeywordElement(domNode: HTMLElement): DOMConversionOutput {
  const textContent = domNode.textContent;
  const keywordId = domNode.getAttribute('data-keyword-id') || '';
  const entityType = domNode.getAttribute('data-entity-type') || '';
  
  if (textContent !== null) {
    const node = $createKeywordNode(keywordId, entityType);
    return { node };
  }
  return { node: null };
}

export function $createKeywordNode(keywordId: string, entityType: string): KeywordNode {
  return new KeywordNode(keywordId, entityType);
}

export function $isKeywordNode(node: LexicalNode | null | undefined): node is KeywordNode {
  return node instanceof KeywordNode;
}
