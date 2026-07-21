/**
 * Converts rich text content between Lexical JSON, HTML, Markdown, and Plain Text.
 * Handles Lexical editor JSON structures cleanly and provides universal DOM-based formatting.
 */

interface LexicalNode {
  type: string;
  tag?: string;
  listType?: string;
  format?: number | string;
  text?: string;
  children?: LexicalNode[];
  value?: number;
  direction?: string | null;
  indent?: number;
  version?: number;
  detail?: number;
  mode?: string;
  style?: string;
  textFormat?: number;
  textStyle?: string;
  start?: number;
  [key: string]: any;
}

/**
 * Converts a Lexical JSON string into clean HTML.
 * If the input is already HTML or plain text, returns it as-is.
 */
export function lexicalJsonToHtml(content: string): string {
  if (!content) return '';
  const trimmed = content.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return content;
  }

  try {
    const parsed = JSON.parse(trimmed);
    const root = parsed.root || parsed;
    if (!root || !Array.isArray(root.children)) {
      return content;
    }

    return processLexicalNodesToHtml(root.children);
  } catch {
    return content;
  }
}

function processLexicalNodesToHtml(nodes: LexicalNode[]): string {
  return nodes
    .map((node) => {
      if (!node) return '';
      if (node.type === 'text') {
        let text = (node.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const fmt = typeof node.format === 'number' ? node.format : 0;
        if (fmt & 1) text = `<strong>${text}</strong>`;
        if (fmt & 2) text = `<em>${text}</em>`;
        if (fmt & 4) text = `<s>${text}</s>`;
        if (fmt & 8) text = `<u>${text}</u>`;
        return text;
      }

      const childrenHtml = node.children && Array.isArray(node.children)
        ? processLexicalNodesToHtml(node.children)
        : '';

      switch (node.type) {
        case 'paragraph':
          return `<p>${childrenHtml || '<br/>'}</p>`;
        case 'heading': {
          const tag = node.tag && /^h[1-6]$/.test(node.tag) ? node.tag : 'h2';
          return `<${tag}>${childrenHtml}</${tag}>`;
        }
        case 'quote':
          return `<blockquote>${childrenHtml}</blockquote>`;
        case 'list': {
          const tag = node.listType === 'number' || node.tag === 'ol' ? 'ol' : 'ul';
          return `<${tag}>${childrenHtml}</${tag}>`;
        }
        case 'listitem':
          return `<li>${childrenHtml}</li>`;
        case 'horizontalrule':
          return `<hr/>`;
        default:
          return childrenHtml;
      }
    })
    .join('\n');
}

/**
 * Converts an HTML or plain text string into a valid Lexical JSON string.
 * If the input is already valid Lexical JSON, returns it as-is.
 */
export function htmlToLexicalJson(htmlOrText: string): string {
  if (!htmlOrText) return JSON.stringify({ root: { children: [], direction: null, format: '', indent: 0, type: 'root', version: 1 } });
  const trimmed = htmlOrText.trim();
  if (trimmed.startsWith('{')) {
    try {
      const check = JSON.parse(trimmed);
      if (check && check.root && Array.isArray(check.root.children)) {
        return trimmed;
      }
    } catch {
      // Not valid JSON, proceed with DOM parsing below
    }
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlOrText, 'text/html');

  const children: LexicalNode[] = [];

  const processDomNodesToLexical = (nodeList: NodeListOf<ChildNode>): LexicalNode[] => {
    const nodes: LexicalNode[] = [];
    nodeList.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const txt = child.textContent || '';
        if (txt) {
          nodes.push({
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: txt,
            type: 'text',
            version: 1,
          } as LexicalNode);
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        const tag = el.tagName.toLowerCase();

        if (/^h[1-6]$/.test(tag)) {
          nodes.push({
            children: processInlineDomToLexical(el.childNodes, 0),
            direction: null,
            format: '',
            indent: 0,
            type: 'heading',
            version: 1,
            tag,
          });
        } else if (tag === 'p' || tag === 'div') {
          nodes.push({
            children: processInlineDomToLexical(el.childNodes, 0),
            direction: null,
            format: '',
            indent: 0,
            type: 'paragraph',
            version: 1,
            textFormat: 0,
            textStyle: '',
          });
        } else if (tag === 'blockquote') {
          nodes.push({
            children: processInlineDomToLexical(el.childNodes, 0),
            direction: null,
            format: '',
            indent: 0,
            type: 'quote',
            version: 1,
          });
        } else if (tag === 'ul' || tag === 'ol') {
          const listItems: LexicalNode[] = [];
          el.childNodes.forEach((li) => {
            if (li.nodeType === Node.ELEMENT_NODE && (li as HTMLElement).tagName.toLowerCase() === 'li') {
              listItems.push({
                children: processInlineDomToLexical(li.childNodes, 0),
                direction: null,
                format: '',
                indent: 0,
                type: 'listitem',
                version: 1,
                value: listItems.length + 1,
              });
            }
          });
          if (listItems.length > 0) {
            nodes.push({
              children: listItems,
              direction: null,
              format: '',
              indent: 0,
              type: 'list',
              version: 1,
              listType: tag === 'ol' ? 'number' : 'bullet',
              start: 1,
              tag,
            });
          }
        } else if (tag === 'hr') {
          nodes.push({
            type: 'horizontalrule',
            version: 1,
          });
        } else {
          // Fallback or inline tag at root level -> wrap in paragraph
          const inlineChildren = processInlineDomToLexical(el.childNodes, getFormatBitFromTag(tag, 0));
          if (inlineChildren.length > 0) {
            nodes.push({
              children: inlineChildren,
              direction: null,
              format: '',
              indent: 0,
              type: 'paragraph',
              version: 1,
              textFormat: 0,
              textStyle: '',
            });
          }
        }
      }
    });
    return nodes;
  };

  const getFormatBitFromTag = (tag: string, currentFormat: number): number => {
    let fmt = currentFormat;
    if (tag === 'strong' || tag === 'b') fmt |= 1;
    if (tag === 'em' || tag === 'i') fmt |= 2;
    if (tag === 's' || tag === 'del') fmt |= 4;
    if (tag === 'u') fmt |= 8;
    return fmt;
  };

  const processInlineDomToLexical = (nodeList: NodeListOf<ChildNode>, currentFormat: number): LexicalNode[] => {
    const inlineNodes: LexicalNode[] = [];
    nodeList.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const txt = child.textContent || '';
        if (txt) {
          inlineNodes.push({
            detail: 0,
            format: currentFormat,
            mode: 'normal',
            style: '',
            text: txt,
            type: 'text',
            version: 1,
          } as LexicalNode);
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        const tag = el.tagName.toLowerCase();
        if (tag === 'br') {
          inlineNodes.push({
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: '\n',
            type: 'text',
            version: 1,
          } as LexicalNode);
        } else {
          const nextFormat = getFormatBitFromTag(tag, currentFormat);
          const nested = processInlineDomToLexical(el.childNodes, nextFormat);
          inlineNodes.push(...nested);
        }
      }
    });
    return inlineNodes;
  };

  children.push(...processDomNodesToLexical(doc.body.childNodes));
  if (children.length === 0) {
    children.push({
      children: [],
      direction: null,
      format: '',
      indent: 0,
      type: 'paragraph',
      version: 1,
      textFormat: 0,
      textStyle: '',
    });
  }

  return JSON.stringify({
    root: {
      children,
      direction: null,
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  });
}

/**
 * Recursive helper to process a DOM Node into Markdown text.
 */
export function processNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;
    const tag = element.tagName.toLowerCase();

    switch (tag) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6': {
        const levelStr = tag.charAt(1);
        const level = parseInt(levelStr, 10);
        const hashes = '#'.repeat(isNaN(level) ? 1 : level);
        return `${hashes} ${processNodeChildren(node).trim()}\n\n`;
      }
      case 'p':
      case 'div':
        return `${processNodeChildren(node)}\n\n`;
      case 'strong':
      case 'b': {
        const content = processNodeChildren(node).trim();
        return content ? `**${content}**` : '';
      }
      case 'em':
      case 'i': {
        const content = processNodeChildren(node).trim();
        return content ? `*${content}*` : '';
      }
      case 'ul': {
        let listOutput = '';
        Array.from(node.childNodes).forEach((child) => {
          if (
            child.nodeType === Node.ELEMENT_NODE &&
            (child as Element).tagName.toLowerCase() === 'li'
          ) {
            listOutput += `- ${processNode(child).trim()}\n`;
          } else {
            const extra = processNode(child).trim();
            if (extra) listOutput += `${extra}\n`;
          }
        });
        return `${listOutput}\n`;
      }
      case 'ol': {
        let listOutput = '';
        let itemIndex = 1;
        Array.from(node.childNodes).forEach((child) => {
          if (
            child.nodeType === Node.ELEMENT_NODE &&
            (child as Element).tagName.toLowerCase() === 'li'
          ) {
            listOutput += `${itemIndex}. ${processNode(child).trim()}\n`;
            itemIndex++;
          } else {
            const extra = processNode(child).trim();
            if (extra) listOutput += `${extra}\n`;
          }
        });
        return `${listOutput}\n`;
      }
      case 'blockquote':
        return `> ${processNodeChildren(node).trim()}\n\n`;
      case 'br':
        return '\n';
      case 'a': {
        const href = element.getAttribute('href') || '';
        return `[${processNodeChildren(node)}](${href})`;
      }
      default:
        return processNodeChildren(node);
    }
  }

  return processNodeChildren(node);
}

function processNodeChildren(node: Node): string {
  let result = '';
  Array.from(node.childNodes).forEach((child) => {
    result += processNode(child);
  });
  return result;
}

/**
 * Converts content (Lexical JSON or HTML) to Markdown.
 */
export function htmlToMarkdown(htmlOrJson: string): string {
  if (!htmlOrJson) return '';
  const html = lexicalJsonToHtml(htmlOrJson);
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return processNode(doc.body).trim().replace(/\n{3,}/g, '\n\n');
}

/**
 * Converts content (Lexical JSON or HTML) to clean plain text.
 */
export function htmlToPlainText(htmlOrJson: string): string {
  if (!htmlOrJson) return '';
  const html = lexicalJsonToHtml(htmlOrJson);
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Process blocks to insert newlines cleanly between paragraphs/headings
  const blocks: string[] = [];
  const processPlainTextBlocks = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = (node as HTMLElement).tagName.toLowerCase();
      if (/^h[1-6]$/.test(tag) || tag === 'p' || tag === 'div' || tag === 'blockquote' || tag === 'li') {
        const txt = (node.textContent || '').trim();
        if (txt) blocks.push(txt);
        return;
      }
    }
    if (node.nodeType === Node.TEXT_NODE && node.parentNode && (node.parentNode as HTMLElement).tagName.toLowerCase() === 'body') {
      const txt = (node.textContent || '').trim();
      if (txt) blocks.push(txt);
      return;
    }
    node.childNodes.forEach(processPlainTextBlocks);
  };

  processPlainTextBlocks(doc.body);
  if (blocks.length > 0) {
    return blocks.join('\n\n').replace(/\n{3,}/g, '\n\n');
  }
  return (doc.body.textContent || '').trim().replace(/\n{3,}/g, '\n\n');
}
