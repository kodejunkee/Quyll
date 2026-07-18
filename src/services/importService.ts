import { readTextFile, readFile } from '@tauri-apps/plugin-fs';
import { open } from '@tauri-apps/plugin-dialog';
import { execute, select } from '@/database/databaseService';
import { generateId } from '@/utils/uuid';
import type Database from '@tauri-apps/plugin-sql';
import mammoth from 'mammoth';

export type ImportFormat = 'markdown' | 'text' | 'docx';

export interface ImportedChapter {
  title: string;
  content: string; // HTML content for Lexical editor
  wordCount: number;
}

export interface ImportPreview {
  chapters: ImportedChapter[];
  format: ImportFormat;
  fileName: string;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatInlineMd(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>');
}

export async function pickImportFile(): Promise<{ path: string; format: ImportFormat; fileName: string } | null> {
  const selected = await open({
    multiple: false,
    filters: [{ name: 'Documents', extensions: ['md', 'txt', 'docx'] }],
  });

  if (!selected || Array.isArray(selected)) {
    return null;
  }

  const path = typeof selected === 'string' ? selected : (selected as { path: string }).path;
  if (!path) return null;

  const ext = path.split('.').pop()?.toLowerCase() || '';
  let format: ImportFormat = 'text';
  if (ext === 'md') {
    format = 'markdown';
  } else if (ext === 'docx') {
    format = 'docx';
  } else if (ext === 'txt') {
    format = 'text';
  }

  const fileName = path.split(/[/\\]/).pop() || 'Untitled';
  return { path, format, fileName };
}

export async function previewImport(
  filePath: string,
  format: ImportFormat,
  fileName: string,
): Promise<ImportPreview> {
  const chapters: ImportedChapter[] = [];

  if (format === 'markdown') {
    const text = await readTextFile(filePath);
    const lines = text.split(/\r?\n/);
    const sections: { title: string; lines: string[] }[] = [];
    let currentTitle = fileName.replace(/\.[^/.]+$/, '') || 'Chapter 1';
    let currentLines: string[] = [];

    for (const line of lines) {
      const headingMatch = line.match(/^##?\s+(.+)$/);
      if (headingMatch) {
        if (currentLines.some((l) => l.trim().length > 0) || sections.length > 0) {
          if (
            currentLines.some((l) => l.trim().length > 0) ||
            currentTitle !== (fileName.replace(/\.[^/.]+$/, '') || 'Chapter 1')
          ) {
            sections.push({ title: currentTitle, lines: currentLines });
          }
        }
        currentTitle = (headingMatch[1] || '').trim();
        currentLines = [];
      } else {
        currentLines.push(line);
      }
    }
    if (currentLines.some((l) => l.trim().length > 0) || sections.length === 0) {
      sections.push({ title: currentTitle, lines: currentLines });
    }

    for (const sec of sections) {
      const blocks = sec.lines.join('\n').split(/\n\s*\n/);
      const htmlBlocks = blocks
        .map((block) => {
          const trimmed = block.trim();
          if (!trimmed) return '';
          const blockLines = trimmed.split(/\r?\n/);
          if (blockLines.every((l) => /^[*-]\s+/.test(l.trim()))) {
            const items = blockLines
              .map((l) => {
                const itemText = l.trim().replace(/^[*-]\s+/, '');
                return `<li>${formatInlineMd(itemText)}</li>`;
              })
              .join('');
            return `<ul>${items}</ul>`;
          }
          return `<p>${formatInlineMd(trimmed.replace(/\r?\n/g, ' '))}</p>`;
        })
        .filter(Boolean);

      const content = htmlBlocks.join('') || '<p></p>';
      const wordCount = stripHtml(content).split(/\s+/).filter(Boolean).length;
      chapters.push({
        title: sec.title || 'Untitled Section',
        content,
        wordCount,
      });
    }
  } else if (format === 'text') {
    const text = await readTextFile(filePath);
    let rawSections: string[] = [];
    if (/^Chapter\s+\d+/im.test(text)) {
      rawSections = text.split(/(?=^Chapter\s+\d+)/im).filter((p) => p.trim().length > 0);
    } else {
      rawSections = text.split(/(?:\r?\n){3,}|^\s*---\s*$/m).filter((p) => p.trim().length > 0);
    }
    if (rawSections.length === 0) {
      rawSections = [text];
    }

    for (let i = 0; i < rawSections.length; i++) {
      const rawSection = rawSections[i] || '';
      const sectionLines = rawSection.trim().split(/\r?\n/);
      let title = `Chapter ${i + 1}`;
      let bodyLines = sectionLines;

      const firstLine = sectionLines[0]?.trim() || '';
      if (
        /^Chapter\s+\d+/i.test(firstLine) ||
        (firstLine.length > 0 &&
          firstLine.length <= 60 &&
          sectionLines.length > 1 &&
          /^[A-Z0-9]/.test(firstLine))
      ) {
        title = firstLine;
        bodyLines = sectionLines.slice(1);
      }
      const bodyText = bodyLines.join('\n').trim();
      const content =
        bodyText
          .split(/\r?\n\r?\n/)
          .map((p) => (p.trim() ? `<p>${p.trim()}</p>` : ''))
          .join('') || '<p></p>';
      const wordCount = stripHtml(content).split(/\s+/).filter(Boolean).length;
      chapters.push({
        title,
        content,
        wordCount,
      });
    }
  } else if (format === 'docx') {
    const buffer = await readFile(filePath);
    const result = await mammoth.convertToHtml({ arrayBuffer: buffer.buffer });
    const html = result.value || '';
    const headingRegex = /<h[12][^>]*>(.*?)<\/h[12]>/gi;

    let match = headingRegex.exec(html);
    if (!match) {
      const cleanTitle = fileName.replace(/\.[^/.]+$/, '') || fileName;
      const content = html.trim() || '<p></p>';
      const wordCount = stripHtml(content).split(/\s+/).filter(Boolean).length;
      chapters.push({ title: cleanTitle, content, wordCount });
    } else {
      let lastIndex = 0;
      let currentTitle = (match[1] || '').replace(/<[^>]+>/g, '').trim() || 'Chapter 1';
      lastIndex = headingRegex.lastIndex;

      const preamble = html.slice(0, match.index).trim();
      if (preamble && stripHtml(preamble).trim().length > 0) {
        const wordCount = stripHtml(preamble).split(/\s+/).filter(Boolean).length;
        chapters.push({
          title: fileName.replace(/\.[^/.]+$/, '') || 'Preamble',
          content: preamble,
          wordCount,
        });
      }

      while ((match = headingRegex.exec(html)) !== null) {
        const chunkContent = html.slice(lastIndex, match.index).trim();
        const wordCount = stripHtml(chunkContent).split(/\s+/).filter(Boolean).length;
        chapters.push({
          title: currentTitle,
          content: chunkContent || '<p></p>',
          wordCount,
        });
        currentTitle = (match[1] || '').replace(/<[^>]+>/g, '').trim() || `Chapter ${chapters.length + 1}`;
        lastIndex = headingRegex.lastIndex;
      }

      const lastChunkContent = html.slice(lastIndex).trim();
      const wordCount = stripHtml(lastChunkContent).split(/\s+/).filter(Boolean).length;
      chapters.push({
        title: currentTitle,
        content: lastChunkContent || '<p></p>',
        wordCount,
      });
    }
  }

  return { chapters, format, fileName };
}

export async function importIntoProject(
  db: Database,
  projectId: string,
  chapters: ImportedChapter[],
): Promise<number> {
  const rows = await select<{ max_num: number | null }>(
    db,
    'SELECT MAX(chapter_number) as max_num FROM chapters WHERE project_id = $1 AND deleted_at IS NULL',
    [projectId],
  );
  let nextNum = (rows[0]?.max_num ?? 0) + 1;

  for (const ch of chapters) {
    const readingTime = Math.ceil(ch.wordCount / 200) || 1;
    const id = generateId();
    await execute(
      db,
      `
    INSERT INTO chapters (id, project_id, title, chapter_number, content, word_count, reading_time, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, datetime('now'), datetime('now'))
  `,
      [
        id,
        projectId,
        ch.title || `Chapter ${nextNum}`,
        nextNum,
        ch.content || '<p></p>',
        ch.wordCount,
        readingTime,
      ],
    );
    nextNum++;
  }

  return chapters.length;
}
