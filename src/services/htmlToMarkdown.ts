/**
 * Converts HTML content from the Lexical editor to Markdown and Plain Text.
 * Lightweight DOMParser-based implementation handling common formatting cleanly.
 */

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

/**
 * Helper to process all child nodes of a given DOM node.
 */
function processNodeChildren(node: Node): string {
  let result = '';
  Array.from(node.childNodes).forEach((child) => {
    result += processNode(child);
  });
  return result;
}

/**
 * Converts HTML content from the Lexical editor to Markdown.
 * Handles common formatting elements cleanly.
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return processNode(doc.body).trim().replace(/\n{3,}/g, '\n\n');
}

/**
 * Strips all HTML tags and returns plain text.
 */
export function htmlToPlainText(html: string): string {
  if (!html) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return (doc.body.textContent || '').trim().replace(/\n{3,}/g, '\n\n');
}
