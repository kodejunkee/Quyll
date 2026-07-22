import { readTextFile, readFile, writeFile, mkdir } from '@tauri-apps/plugin-fs';
import { appDataDir, join, dirname } from '@tauri-apps/api/path';
import { open } from '@tauri-apps/plugin-dialog';
import { execute, select } from '@/database/databaseService';
import { initializeProjectDatabase, openProjectDatabase, registerProject } from '@/database';
import { generateId } from '@/utils/uuid';
import { htmlToLexicalJson } from './htmlToMarkdown';
import type Database from '@tauri-apps/plugin-sql';
import type { QuyllExportData } from './exportService';
import mammoth from 'mammoth';

export type ImportFormat = 'markdown' | 'text' | 'docx';

export interface ImportedChapter {
  title: string;
  content: string; // Lexical editor JSON string
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

      const htmlContent = htmlBlocks.join('') || '<p></p>';
      const wordCount = stripHtml(htmlContent).split(/\s+/).filter(Boolean).length;
      chapters.push({
        title: sec.title || 'Untitled Section',
        content: htmlToLexicalJson(htmlContent),
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
      const htmlContent =
        bodyText
          .split(/\r?\n\r?\n/)
          .map((p) => (p.trim() ? `<p>${p.trim()}</p>` : ''))
          .join('') || '<p></p>';
      const wordCount = stripHtml(htmlContent).split(/\s+/).filter(Boolean).length;
      chapters.push({
        title,
        content: htmlToLexicalJson(htmlContent),
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
      const htmlContent = html.trim() || '<p></p>';
      const wordCount = stripHtml(htmlContent).split(/\s+/).filter(Boolean).length;
      chapters.push({ title: cleanTitle, content: htmlToLexicalJson(htmlContent), wordCount });
    } else {
      let lastIndex = 0;
      let currentTitle = (match[1] || '').replace(/<[^>]+>/g, '').trim() || 'Chapter 1';
      lastIndex = headingRegex.lastIndex;

      const preamble = html.slice(0, match.index).trim();
      if (preamble && stripHtml(preamble).trim().length > 0) {
        const wordCount = stripHtml(preamble).split(/\s+/).filter(Boolean).length;
        chapters.push({
          title: fileName.replace(/\.[^/.]+$/, '') || 'Preamble',
          content: htmlToLexicalJson(preamble),
          wordCount,
        });
      }

      while ((match = headingRegex.exec(html)) !== null) {
        const chunkContent = html.slice(lastIndex, match.index).trim();
        const wordCount = stripHtml(chunkContent).split(/\s+/).filter(Boolean).length;
        chapters.push({
          title: currentTitle,
          content: htmlToLexicalJson(chunkContent || '<p></p>'),
          wordCount,
        });
        currentTitle = (match[1] || '').replace(/<[^>]+>/g, '').trim() || `Chapter ${chapters.length + 1}`;
        lastIndex = headingRegex.lastIndex;
      }

      const lastChunkContent = html.slice(lastIndex).trim();
      const wordCount = stripHtml(lastChunkContent).split(/\s+/).filter(Boolean).length;
      chapters.push({
        title: currentTitle,
        content: htmlToLexicalJson(lastChunkContent || '<p></p>'),
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
    const finalContent = ch.content && ch.content.trim().startsWith('{')
      ? ch.content
      : htmlToLexicalJson(ch.content || '<p></p>');

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
        finalContent,
        ch.wordCount,
        readingTime,
      ],
    );
    nextNum++;
  }

  return chapters.length;
}

export async function pickAndImportQuyllProject(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    filters: [{ name: 'Quyll Project', extensions: ['quyll'] }],
  });

  if (!selected || Array.isArray(selected)) return null;

  const path = typeof selected === 'string' ? selected : (selected as { path: string }).path;
  if (!path) return null;

  try {
    const content = await readTextFile(path);
    const data = JSON.parse(content) as QuyllExportData;

    const newProjectId = generateId();
    const projectPath = `projects/${newProjectId}.quyll`;
    
    // Register the project in the app DB
    await registerProject({
      id: newProjectId,
      name: data.projectName,
      path: projectPath,
      description: 'Imported project'
    });

    // Initialize the project DB
    await initializeProjectDatabase(projectPath, {
      id: newProjectId,
      title: data.projectName,
      description: 'Imported project'
    });
    const db = await openProjectDatabase(projectPath);

    if (!db) {
      throw new Error('Failed to open new project database');
    }

    // Insert all entities, replacing project_id with newProjectId
    // Chapters
    if (data.chapters) {
      for (const ch of data.chapters) {
        await execute(db, `
          INSERT INTO chapters (id, project_id, title, chapter_number, content, word_count, reading_time, created_at, updated_at, deleted_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [ch.id, newProjectId, ch.title, ch.chapter_number, ch.content, ch.word_count, ch.reading_time, ch.created_at, ch.updated_at, ch.deleted_at]);
      }
    }

    // Characters
    if (data.characters) {
      for (const c of data.characters) {
        await execute(db, `
          INSERT INTO characters (id, project_id, name, aliases, age, birthday, gender, height, occupation, status, appearance, personality, goals, fears, strengths, weaknesses, abilities, equipment, motivations, biography, notes, image_id, keyword_enabled, created_at, updated_at, deleted_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
        `, [c.id, newProjectId, c.name, c.aliases, c.age, c.birthday, c.gender, c.height, c.occupation, c.status, c.appearance, c.personality, c.goals, c.fears, c.strengths, c.weaknesses, c.abilities, c.equipment, c.motivations, c.biography, c.notes, (c as any).image_id, (c as any).keyword_enabled ?? 0, c.created_at, c.updated_at, c.deleted_at]);
      }
    }

    // Lore
    if (data.lore) {
      for (const l of data.lore) {
        await execute(db, `
          INSERT INTO lore (id, project_id, title, category, content, notes, created_at, updated_at, deleted_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [l.id, newProjectId, l.title, l.category, l.content, l.notes, l.created_at, l.updated_at, l.deleted_at]);
      }
    }

    // Timeline Events
    if (data.timelineEvents) {
      for (const t of data.timelineEvents) {
        await execute(db, `
          INSERT INTO timeline_events (id, project_id, title, event_date, description, created_at, updated_at, deleted_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [t.id, newProjectId, t.title, t.event_date, t.description, t.created_at, t.updated_at, t.deleted_at]);
      }
    }

    // Locations
    if (data.locations) {
      for (const l of data.locations) {
        await execute(db, `
          INSERT INTO locations (id, project_id, name, type, climate, architecture, culture, population, description, history, notes, image_id, keyword_enabled, created_at, updated_at, deleted_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        `, [l.id, newProjectId, l.name, l.type, l.climate, l.architecture, l.culture, l.population, l.description, l.history, l.notes, (l as any).image_id, (l as any).keyword_enabled ?? 0, l.created_at, l.updated_at, l.deleted_at]);
      }
    }

    // Organizations
    if (data.organizations) {
      for (const o of data.organizations) {
        await execute(db, `
          INSERT INTO organizations (id, project_id, name, type, leader, purpose, structure, description, history, notes, image_id, keyword_enabled, created_at, updated_at, deleted_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        `, [o.id, newProjectId, o.name, o.type, o.leader, o.purpose, o.structure, o.description, o.history, o.notes, (o as any).image_id, (o as any).keyword_enabled ?? 0, o.created_at, o.updated_at, o.deleted_at]);
      }
    }

    // Species
    if (data.species) {
      for (const s of data.species) {
        await execute(db, `
          INSERT INTO species (id, project_id, name, habitat, appearance, culture, abilities, weaknesses, history, notes, image_id, keyword_enabled, created_at, updated_at, deleted_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        `, [s.id, newProjectId, s.name, s.habitat, s.appearance, s.culture, s.abilities, s.weaknesses, s.history, s.notes, (s as any).image_id, (s as any).keyword_enabled ?? 0, s.created_at, s.updated_at, s.deleted_at]);
      }
    }

    // Items
    if (data.items) {
      for (const i of data.items) {
        await execute(db, `
          INSERT INTO items (id, project_id, name, type, description, owner_character_id, notes, image_id, keyword_enabled, created_at, updated_at, deleted_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [i.id, newProjectId, i.name, i.type, i.description, (i as any).owner_character_id, i.notes, (i as any).image_id, (i as any).keyword_enabled ?? 0, i.created_at, i.updated_at, i.deleted_at]);
      }
    }

    // World Systems
    if ((data as any).worldSystems || (data as any).magicSystems) {
      const wsystems = (data as any).worldSystems || (data as any).magicSystems;
      for (const m of wsystems) {
        await execute(db, `
          INSERT INTO world_systems (id, project_id, name, energy_source, description, rules, limitations, examples, created_at, updated_at, deleted_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [m.id, newProjectId, m.name, m.energy_source, m.description, m.rules, m.limitations, m.examples, m.created_at, m.updated_at, m.deleted_at]);
      }
    }

    // Plot Points
    if (data.plotPoints) {
      for (const p of data.plotPoints) {
        await execute(db, `
          INSERT INTO plot_points (id, project_id, title, status, arc, description, notes, order_index, created_at, updated_at, deleted_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [p.id, newProjectId, p.title, p.status, p.arc, p.description, p.notes, p.order_index, p.created_at, p.updated_at, p.deleted_at]);
      }
    }

    // Images
    if (data.images) {
      for (const img of data.images) {
        await execute(db, `
          INSERT INTO images (id, project_id, path, type, created_at)
          VALUES ($1, $2, $3, $4, $5)
        `, [img.id, newProjectId, img.path, img.type, img.created_at]);
      }
    }

    // Image Files
    if ((data as any).imageFiles) {
      const appData = await appDataDir();
      const projectFolder = await join(appData, `projects/${newProjectId}.quyll`);
      
      for (const imgFile of (data as any).imageFiles) {
        try {
          const fullPath = await join(projectFolder, imgFile.path);
          const dir = await dirname(fullPath);
          
          try {
            await mkdir(dir, { recursive: true });
          } catch (e) {}

          const binaryString = atob(imgFile.base64);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          await writeFile(fullPath, bytes);
        } catch (e) {
          console.error(`Failed to write image file ${imgFile.path}`, e);
        }
      }
    }

    // Keywords
    if (data.keywords) {
      for (const k of data.keywords) {
        await execute(db, `
          INSERT INTO keywords (id, project_id, entity_type, entity_id, display_name, created_at)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [k.id, newProjectId, k.entity_type, k.entity_id, k.display_name, k.created_at]);
      }
    }

    // Relationships
    if (data.relationships) {
      for (const r of data.relationships) {
        await execute(db, `
          INSERT INTO relationships (id, project_id, source_type, source_id, relationship, target_type, target_id, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [r.id, newProjectId, r.source_type, r.source_id, r.relationship, r.target_type, r.target_id, r.created_at]);
      }
    }

    // Pinned References
    if (data.pinnedReferences) {
      for (const p of data.pinnedReferences) {
        await execute(db, `
          INSERT INTO pinned_references (id, project_id, entity_type, entity_id, position_x, position_y, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [p.id, newProjectId, p.entity_type, p.entity_id, p.position_x, p.position_y, p.created_at]);
      }
    }

    // Settings
    if (data.settings && data.settings.length > 0) {
      const s = data.settings[0];
      if (s) {
        await execute(db, `
          UPDATE settings SET
            theme = $1, accent_color = $2, editor_font = $3, editor_font_size = $4,
            autosave_interval = $5, sidebar_collapsed = $6, inspector_collapsed = $7, backup_interval = $8
        `, [s.theme, s.accent_color, s.editor_font, s.editor_font_size, s.autosave_interval, s.sidebar_collapsed, s.inspector_collapsed, s.backup_interval]);
      }
    }

    // AI Prompts
    if (data.aiPrompts) {
      for (const a of data.aiPrompts) {
        await execute(db, `
          INSERT INTO ai_prompts (id, project_id, name, prompt_text, category, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [a.id, newProjectId, a.name, a.prompt_text, a.category, a.created_at, a.updated_at]);
      }
    }

    // AI History
    if (data.aiHistory) {
      for (const h of data.aiHistory) {
        await execute(db, `
          INSERT INTO ai_history (id, project_id, prompt, response, model, tokens_used, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [h.id, newProjectId, h.prompt, h.response, h.model, h.tokens_used, h.created_at]);
      }
    }

    // AI Preferences
    if (data.aiPreferences) {
      for (const p of data.aiPreferences) {
        await execute(db, `
          INSERT INTO ai_preferences (id, project_id, key, value, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [p.id, newProjectId, p.key, p.value, p.created_at, p.updated_at]);
      }
    }

    return newProjectId;
  } catch (error) {
    console.error('Failed to import Quyll project:', error);
    return null;
  }
}
