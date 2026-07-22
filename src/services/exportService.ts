import { writeTextFile, writeFile, readFile } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import { save } from '@tauri-apps/plugin-dialog';
import { select } from '@/database/databaseService';
import { htmlToMarkdown, htmlToPlainText, lexicalJsonToHtml } from './htmlToMarkdown';
import type Database from '@tauri-apps/plugin-sql';
import type {
  Chapter,
  Character,
  LoreEntry,
  TimelineEvent,
  Location,
  Organization,
  Species,
  Item,
  WorldSystem,
  PlotPoint,
  Image,
  Keyword,
  Relationship,
  PinnedReference,
  Settings,
  AiPrompt,
  AiHistory,
  AiPreference,
} from '@/types/database';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, PageBreak, UnderlineType } from 'docx';

export type ExportFormat = 'markdown' | 'text' | 'pdf' | 'docx' | 'quyll';
export type ExportScope =
  | 'project'
  | 'chapter'
  | 'selected-chapters'
  | 'characters'
  | 'lore'
  | 'timeline'
  | 'locations'
  | 'organizations'
  | 'species'
  | 'items'
  | 'world-systems'
  | 'plot-points';

export interface ExportOptions {
  format: ExportFormat;
  scope: ExportScope;
  chapterId?: string;
  chapterIds?: string[];
  projectName: string;
}

interface EntityField {
  label: string;
  value: string | number | null | undefined;
  isLong?: boolean;
}

interface EntityItem {
  name: string;
  fields: EntityField[];
}

/**
 * Main entry point for exporting a project or subset of project data.
 */
export async function exportProject(
  db: Database,
  projectId: string,
  options: ExportOptions,
): Promise<boolean> {
  switch (options.format) {
    case 'markdown': {
      const content = await buildMarkdownContent(db, projectId, options);
      const destination = await save({ defaultPath: `${options.projectName}.md`, filters: [{ name: 'Markdown', extensions: ['md'] }] });
      if (!destination) return false;
      await writeTextFile(destination, content);
      return true;
    }
    case 'text': {
      const content = await buildPlainTextContent(db, projectId, options);
      const destination = await save({ defaultPath: `${options.projectName}.txt`, filters: [{ name: 'Plain Text', extensions: ['txt'] }] });
      if (!destination) return false;
      await writeTextFile(destination, content);
      return true;
    }
    case 'docx': {
      const buffer = await buildDocxDocument(db, projectId, options);
      const destination = await save({ defaultPath: `${options.projectName}.docx`, filters: [{ name: 'Word Document', extensions: ['docx'] }] });
      if (!destination) return false;
      await writeFile(destination, new Uint8Array(buffer));
      return true;
    }
    case 'pdf': {
      const htmlContent = await buildHtmlContent(db, projectId, options);
      openPdfPrintDialog(htmlContent, options.projectName);
      return true;
    }
    case 'quyll': {
      const content = await buildQuyllExport(db, projectId, options.projectName);
      const destination = await save({ defaultPath: `${options.projectName}.quyll`, filters: [{ name: 'Quyll Project', extensions: ['quyll'] }] });
      if (!destination) return false;
      await writeTextFile(destination, content);
      return true;
    }
    default:
      return false;
  }
}

export interface QuyllExportData {
  projectName: string;
  version: number;
  chapters: Chapter[];
  characters: Character[];
  lore: LoreEntry[];
  timelineEvents: TimelineEvent[];
  locations: Location[];
  organizations: Organization[];
  species: Species[];
  items: Item[];
  worldSystems: WorldSystem[];
  plotPoints: PlotPoint[];
  images?: Image[];
  imageFiles?: { path: string; base64: string }[];
  keywords?: Keyword[];
  relationships?: Relationship[];
  pinnedReferences?: PinnedReference[];
  settings?: Settings[];
  aiPrompts?: AiPrompt[];
  aiHistory?: AiHistory[];
  aiPreferences?: AiPreference[];
}

export async function buildQuyllExport(
  db: Database,
  projectId: string,
  projectName: string
): Promise<string> {
  const chapters = await select<Chapter>(db, 'SELECT * FROM chapters WHERE project_id = $1 AND deleted_at IS NULL', [projectId]);
  const characters = await select<Character>(db, 'SELECT * FROM characters WHERE project_id = $1 AND deleted_at IS NULL', [projectId]);
  const lore = await select<LoreEntry>(db, 'SELECT * FROM lore WHERE project_id = $1 AND deleted_at IS NULL', [projectId]);
  const timelineEvents = await select<TimelineEvent>(db, 'SELECT * FROM timeline_events WHERE project_id = $1 AND deleted_at IS NULL', [projectId]);
  const locations = await select<Location>(db, 'SELECT * FROM locations WHERE project_id = $1 AND deleted_at IS NULL', [projectId]);
  const organizations = await select<Organization>(db, 'SELECT * FROM organizations WHERE project_id = $1 AND deleted_at IS NULL', [projectId]);
  const species = await select<Species>(db, 'SELECT * FROM species WHERE project_id = $1 AND deleted_at IS NULL', [projectId]);
  const items = await select<Item>(db, 'SELECT * FROM items WHERE project_id = $1 AND deleted_at IS NULL', [projectId]);
  const worldSystems = await select<WorldSystem>(db, 'SELECT * FROM world_systems WHERE project_id = $1 AND deleted_at IS NULL', [projectId]);
  const plotPoints = await select<PlotPoint>(db, 'SELECT * FROM plot_points WHERE project_id = $1 AND deleted_at IS NULL', [projectId]);

  const images = await select<Image>(db, 'SELECT * FROM images WHERE project_id = $1', [projectId]);
  const keywords = await select<Keyword>(db, 'SELECT * FROM keywords WHERE project_id = $1', [projectId]);
  const relationships = await select<Relationship>(db, 'SELECT * FROM relationships WHERE project_id = $1', [projectId]);
  const pinnedReferences = await select<PinnedReference>(db, 'SELECT * FROM pinned_references WHERE project_id = $1', [projectId]);
  const settings = await select<Settings>(db, 'SELECT * FROM settings', []);
  const aiPrompts = await select<AiPrompt>(db, 'SELECT * FROM ai_prompts WHERE project_id = $1', [projectId]);
  const aiHistory = await select<AiHistory>(db, 'SELECT * FROM ai_history WHERE project_id = $1', [projectId]);
  const aiPreferences = await select<AiPreference>(db, 'SELECT * FROM ai_preferences WHERE project_id = $1', [projectId]);

  const imageFiles: { path: string; base64: string }[] = [];
  const appData = await appDataDir();
  const projectFolder = await join(appData, `projects/${projectId}.quyll`);

  for (const image of images) {
    try {
      const fullPath = await join(projectFolder, image.path);
      const buffer = await readFile(fullPath);
      
      let binary = '';
      const len = buffer.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(buffer[i]!);
      }
      imageFiles.push({
        path: image.path,
        base64: btoa(binary)
      });
    } catch (e) {
      console.error(`Failed to read image ${image.path}`, e);
    }
  }

  const data: QuyllExportData = {
    projectName,
    version: 1,
    chapters,
    characters,
    lore,
    timelineEvents,
    locations,
    organizations,
    species,
    items,
    worldSystems,
    plotPoints,
    images,
    imageFiles,
    keywords,
    relationships,
    pinnedReferences,
    settings,
    aiPrompts,
    aiHistory,
    aiPreferences,
  };
  return JSON.stringify(data);
}

/**
 * Builds the Markdown content string based on the selected export options.
 */
export async function buildMarkdownContent(
  db: Database,
  projectId: string,
  options: ExportOptions,
): Promise<string> {
  if (isChapterScope(options.scope)) {
    const chapters = await getChaptersForExport(db, projectId, options);
    return chapters
      .map((ch) => {
        const title = `# Chapter ${ch.chapter_number}: ${ch.title}`;
        const body = htmlToMarkdown(ch.content);
        return `${title}\n\n${body}`;
      })
      .join('\n\n---\n\n');
  } else {
    const entities = await getEntitiesForExport(db, projectId, options.scope);
    const title = `# ${getScopeTitle(options.scope)}`;
    const itemsMarkdown = entities
      .map((entity) => {
        const header = `## ${entity.name}`;
        const fieldsMd = entity.fields
          .filter((f) => f.value !== null && f.value !== undefined && String(f.value).trim() !== '')
          .map((f) => {
            if (f.isLong) {
              return `### ${f.label}\n\n${f.value}`;
            }
            return `**${f.label}:** ${f.value}`;
          })
          .join('\n\n');
        return `${header}\n\n${fieldsMd}`;
      })
      .join('\n\n---\n\n');

    return `${title}\n\n${itemsMarkdown}`;
  }
}

/**
 * Builds the Plain Text content string based on the selected export options.
 */
export async function buildPlainTextContent(
  db: Database,
  projectId: string,
  options: ExportOptions,
): Promise<string> {
  if (isChapterScope(options.scope)) {
    const chapters = await getChaptersForExport(db, projectId, options);
    return chapters
      .map((ch) => {
        const titleLine = `CHAPTER ${ch.chapter_number}: ${ch.title.toUpperCase()}`;
        const separator = '='.repeat(titleLine.length);
        const body = htmlToPlainText(ch.content);
        return `${titleLine}\n${separator}\n\n${body}`;
      })
      .join('\n\n' + '-'.repeat(40) + '\n\n');
  } else {
    const entities = await getEntitiesForExport(db, projectId, options.scope);
    const title = getScopeTitle(options.scope).toUpperCase();
    const titleSep = '='.repeat(title.length);
    const itemsText = entities
      .map((entity) => {
        const header = `--- ${entity.name.toUpperCase()} ---`;
        const fieldsTxt = entity.fields
          .filter((f) => f.value !== null && f.value !== undefined && String(f.value).trim() !== '')
          .map((f) => {
            if (f.isLong) {
              return `${f.label.toUpperCase()}:\n${f.value}`;
            }
            return `${f.label}: ${f.value}`;
          })
          .join('\n\n');
        return `${header}\n\n${fieldsTxt}`;
      })
      .join('\n\n' + '*'.repeat(40) + '\n\n');

    return `${title}\n${titleSep}\n\n${itemsText}`;
  }
}

/**
 * Helper to process Lexical JSON or HTML content into rich DOCX Paragraphs.
 */
function addChapterContentToDocx(paragraphs: Paragraph[], content: string) {
  const html = lexicalJsonToHtml(content || '');
  if (!html.trim()) return;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const processNodeToDocx = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      if (/^h[1-6]$/.test(tag)) {
        const levelNum = parseInt(tag.charAt(1), 10);
        const headingLevel =
          levelNum === 1
            ? HeadingLevel.HEADING_2
            : levelNum === 2
            ? HeadingLevel.HEADING_3
            : HeadingLevel.HEADING_4;
        paragraphs.push(
          new Paragraph({
            text: el.textContent || '',
            heading: headingLevel,
            spacing: { before: 200, after: 120 },
          }),
        );
      } else if (tag === 'p' || tag === 'div' || tag === 'blockquote' || tag === 'li') {
        const runs: TextRun[] = [];
        const extractRuns = (
          n: Node,
          bold: boolean,
          italic: boolean,
          underline: boolean,
          strike: boolean,
        ) => {
          if (n.nodeType === Node.TEXT_NODE) {
            const txt = n.textContent || '';
            if (txt) {
              runs.push(
                new TextRun({
                  text: txt,
                  bold,
                  italics: italic,
                  underline: underline ? { type: UnderlineType.SINGLE } : undefined,
                  strike,
                }),
              );
            }
          } else if (n.nodeType === Node.ELEMENT_NODE) {
            const childEl = n as HTMLElement;
            const childTag = childEl.tagName.toLowerCase();
            if (childTag === 'br') {
              runs.push(new TextRun({ text: '\n' }));
            } else {
              extractRuns(
                n,
                bold || childTag === 'strong' || childTag === 'b',
                italic || childTag === 'em' || childTag === 'i',
                underline || childTag === 'u',
                strike || childTag === 's' || childTag === 'del',
              );
            }
          } else {
            n.childNodes.forEach((c) => extractRuns(c, bold, italic, underline, strike));
          }
        };

        el.childNodes.forEach((c) => extractRuns(c, false, false, false, false));
        if (runs.length > 0) {
          paragraphs.push(
            new Paragraph({
              children: runs,
              bullet: tag === 'li' ? { level: 0 } : undefined,
              spacing: { after: 160 },
            }),
          );
        }
      } else if (tag === 'hr') {
        paragraphs.push(new Paragraph({ children: [new PageBreak()] }));
      } else if (tag === 'ul' || tag === 'ol') {
        el.childNodes.forEach(processNodeToDocx);
      } else {
        el.childNodes.forEach(processNodeToDocx);
      }
    } else if (
      node.nodeType === Node.TEXT_NODE &&
      node.parentNode &&
      (node.parentNode as HTMLElement).tagName.toLowerCase() === 'body'
    ) {
      const txt = (node.textContent || '').trim();
      if (txt) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: txt })],
            spacing: { after: 160 },
          }),
        );
      }
    } else {
      node.childNodes.forEach(processNodeToDocx);
    }
  };

  doc.body.childNodes.forEach(processNodeToDocx);
}

/**
 * Builds the DOCX document using the `docx` library.
 */
export async function buildDocxDocument(
  db: Database,
  projectId: string,
  options: ExportOptions,
): Promise<ArrayBuffer> {
  const paragraphs: Paragraph[] = [];

  if (isChapterScope(options.scope)) {
    const chapters = await getChaptersForExport(db, projectId, options);
    chapters.forEach((ch, index) => {
      if (index > 0) {
        paragraphs.push(new Paragraph({ children: [new PageBreak()] }));
      }
      paragraphs.push(
        new Paragraph({
          text: `Chapter ${ch.chapter_number}: ${ch.title}`,
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 300 },
        }),
      );

      addChapterContentToDocx(paragraphs, ch.content);
    });
  } else {
    const entities = await getEntitiesForExport(db, projectId, options.scope);
    paragraphs.push(
      new Paragraph({
        text: getScopeTitle(options.scope),
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 400 },
      }),
    );

    entities.forEach((entity, index) => {
      if (index > 0) {
        paragraphs.push(new Paragraph({ children: [new PageBreak()] }));
      }
      paragraphs.push(
        new Paragraph({
          text: entity.name,
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 300 },
        }),
      );

      entity.fields
        .filter((f) => f.value !== null && f.value !== undefined && String(f.value).trim() !== '')
        .forEach((f) => {
          if (f.isLong) {
            paragraphs.push(
              new Paragraph({
                children: [new TextRun({ text: f.label, bold: true })],
                spacing: { before: 200, after: 100 },
              }),
            );
            const lines = String(f.value).split(/\n+/);
            lines.forEach((line) => {
              if (line.trim()) {
                paragraphs.push(
                  new Paragraph({
                    children: [new TextRun({ text: line.trim() })],
                    spacing: { after: 150 },
                  }),
                );
              }
            });
          } else {
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({ text: `${f.label}: `, bold: true }),
                  new TextRun({ text: String(f.value) }),
                ],
                spacing: { after: 150 },
              }),
            );
          }
        });
    });
  }

  const doc = new Document({
    sections: [
      {
        children: paragraphs,
      },
    ],
  });

  return await Packer.toArrayBuffer(doc);
}

/**
 * Builds HTML content string formatted for print/PDF export.
 */
export async function buildHtmlContent(
  db: Database,
  projectId: string,
  options: ExportOptions,
): Promise<string> {
  if (isChapterScope(options.scope)) {
    const chapters = await getChaptersForExport(db, projectId, options);
    return chapters
      .map((ch) => {
        const cleanBody = lexicalJsonToHtml(ch.content || '');
        return `<div class="chapter"><h1>Chapter ${ch.chapter_number}: ${ch.title}</h1><div class="content">${cleanBody}</div></div>`;
      })
      .join('\n');
  } else {
    const entities = await getEntitiesForExport(db, projectId, options.scope);
    const titleHtml = `<h1>${getScopeTitle(options.scope)}</h1>`;
    const itemsHtml = entities
      .map((entity) => {
        const fieldsHtml = entity.fields
          .filter((f) => f.value !== null && f.value !== undefined && String(f.value).trim() !== '')
          .map((f) => {
            if (f.isLong) {
              return `<h3>${f.label}</h3><p>${String(f.value).replace(/\n/g, '<br/>')}</p>`;
            }
            return `<p><strong>${f.label}:</strong> ${f.value}</p>`;
          })
          .join('');
        return `<div class="entity"><h2>${entity.name}</h2>${fieldsHtml}</div>`;
      })
      .join('<hr/>');

    return `${titleHtml}\n${itemsHtml}`;
  }
}

/**
 * Opens a hidden iframe print dialog for PDF generation.
 */
export function openPdfPrintDialog(html: string, title: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(
      `<!DOCTYPE html><html><head><title>${title}</title><style>@page{margin:1in}body{font-family:serif;line-height:1.6;margin:0}h1{break-after:avoid}.chapter+.chapter,.entity+.entity{break-before:page}hr{border:0;break-after:page;page-break-after:always}</style></head><body>${html}</body></html>`,
    );
    doc.close();

    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  }

  setTimeout(() => {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }, 2000);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isChapterScope(scope: ExportScope): boolean {
  return scope === 'project' || scope === 'chapter' || scope === 'selected-chapters';
}

function getScopeTitle(scope: ExportScope): string {
  switch (scope) {
    case 'project':
      return 'Project Manuscript';
    case 'chapter':
      return 'Chapter';
    case 'selected-chapters':
      return 'Selected Chapters';
    case 'characters':
      return 'Characters';
    case 'lore':
      return 'Lore Entries';
    case 'timeline':
      return 'Timeline Events';
    case 'locations':
      return 'Locations';
    case 'organizations':
      return 'Organizations';
    case 'species':
      return 'Species';
    case 'items':
      return 'Items';
    case 'world-systems':
      return 'World Systems';
    case 'plot-points':
      return 'Plot Points';
  }
}

async function getChaptersForExport(
  db: Database,
  projectId: string,
  options: ExportOptions,
): Promise<Chapter[]> {
  if (options.scope === 'project') {
    return await select<Chapter>(
      db,
      'SELECT * FROM chapters WHERE project_id = $1 AND deleted_at IS NULL ORDER BY chapter_number ASC',
      [projectId],
    );
  } else if (options.scope === 'chapter') {
    if (!options.chapterId) return [];
    return await select<Chapter>(
      db,
      'SELECT * FROM chapters WHERE project_id = $1 AND id = $2 AND deleted_at IS NULL',
      [projectId, options.chapterId],
    );
  } else if (options.scope === 'selected-chapters') {
    const all = await select<Chapter>(
      db,
      'SELECT * FROM chapters WHERE project_id = $1 AND deleted_at IS NULL ORDER BY chapter_number ASC',
      [projectId],
    );
    if (!options.chapterIds || options.chapterIds.length === 0) return all;
    const idSet = new Set(options.chapterIds);
    return all.filter((c) => idSet.has(c.id));
  }
  return [];
}

async function getEntitiesForExport(
  db: Database,
  projectId: string,
  scope: ExportScope,
): Promise<EntityItem[]> {
  switch (scope) {
    case 'characters': {
      const rows = await select<Character>(
        db,
        'SELECT * FROM characters WHERE project_id = $1 AND deleted_at IS NULL ORDER BY name ASC',
        [projectId],
      );
      return rows.map((r) => ({
        name: r.name,
        fields: [
          { label: 'Aliases', value: r.aliases },
          { label: 'Age', value: r.age },
          { label: 'Birthday', value: r.birthday },
          { label: 'Gender', value: r.gender },
          { label: 'Height', value: r.height },
          { label: 'Occupation', value: r.occupation },
          { label: 'Status', value: r.status },
          { label: 'Appearance', value: r.appearance, isLong: true },
          { label: 'Personality', value: r.personality, isLong: true },
          { label: 'Goals', value: r.goals, isLong: true },
          { label: 'Fears', value: r.fears, isLong: true },
          { label: 'Strengths', value: r.strengths, isLong: true },
          { label: 'Weaknesses', value: r.weaknesses, isLong: true },
          { label: 'Abilities', value: r.abilities, isLong: true },
          { label: 'Equipment', value: r.equipment, isLong: true },
          { label: 'Motivations', value: r.motivations, isLong: true },
          { label: 'Biography', value: r.biography, isLong: true },
          { label: 'Notes', value: r.notes, isLong: true },
        ],
      }));
    }
    case 'lore': {
      const rows = await select<LoreEntry>(
        db,
        'SELECT * FROM lore WHERE project_id = $1 AND deleted_at IS NULL ORDER BY title ASC',
        [projectId],
      );
      return rows.map((r) => ({
        name: r.title,
        fields: [
          { label: 'Category', value: r.category },
          { label: 'Content', value: r.content, isLong: true },
          { label: 'Notes', value: r.notes, isLong: true },
        ],
      }));
    }
    case 'timeline': {
      const rows = await select<TimelineEvent>(
        db,
        'SELECT * FROM timeline_events WHERE project_id = $1 AND deleted_at IS NULL ORDER BY event_date ASC, title ASC',
        [projectId],
      );
      return rows.map((r) => ({
        name: r.title,
        fields: [
          { label: 'Date', value: r.event_date },
          { label: 'Description', value: r.description, isLong: true },
        ],
      }));
    }
    case 'locations': {
      const rows = await select<Location>(
        db,
        'SELECT * FROM locations WHERE project_id = $1 AND deleted_at IS NULL ORDER BY name ASC',
        [projectId],
      );
      return rows.map((r) => ({
        name: r.name,
        fields: [
          { label: 'Type', value: r.type },
          { label: 'Climate', value: r.climate },
          { label: 'Architecture', value: r.architecture },
          { label: 'Culture', value: r.culture },
          { label: 'Population', value: r.population },
          { label: 'Description', value: r.description, isLong: true },
          { label: 'History', value: r.history, isLong: true },
          { label: 'Notes', value: r.notes, isLong: true },
        ],
      }));
    }
    case 'organizations': {
      const rows = await select<Organization>(
        db,
        'SELECT * FROM organizations WHERE project_id = $1 AND deleted_at IS NULL ORDER BY name ASC',
        [projectId],
      );
      return rows.map((r) => ({
        name: r.name,
        fields: [
          { label: 'Type', value: r.type },
          { label: 'Leader', value: r.leader },
          { label: 'Purpose', value: r.purpose },
          { label: 'Structure', value: r.structure, isLong: true },
          { label: 'Description', value: r.description, isLong: true },
          { label: 'History', value: r.history, isLong: true },
          { label: 'Notes', value: r.notes, isLong: true },
        ],
      }));
    }
    case 'species': {
      const rows = await select<Species>(
        db,
        'SELECT * FROM species WHERE project_id = $1 AND deleted_at IS NULL ORDER BY name ASC',
        [projectId],
      );
      return rows.map((r) => ({
        name: r.name,
        fields: [
          { label: 'Habitat', value: r.habitat },
          { label: 'Appearance', value: r.appearance, isLong: true },
          { label: 'Culture', value: r.culture, isLong: true },
          { label: 'Abilities', value: r.abilities, isLong: true },
          { label: 'Weaknesses', value: r.weaknesses, isLong: true },
          { label: 'History', value: r.history, isLong: true },
          { label: 'Notes', value: r.notes, isLong: true },
        ],
      }));
    }
    case 'items': {
      const rows = await select<Item>(
        db,
        'SELECT * FROM items WHERE project_id = $1 AND deleted_at IS NULL ORDER BY name ASC',
        [projectId],
      );
      return rows.map((r) => ({
        name: r.name,
        fields: [
          { label: 'Type', value: r.type },
          { label: 'Description', value: r.description, isLong: true },
          { label: 'Notes', value: r.notes, isLong: true },
        ],
      }));
    }
    case 'world-systems': {
      const rows = await select<WorldSystem>(
        db,
        'SELECT * FROM world_systems WHERE project_id = $1 AND deleted_at IS NULL ORDER BY name ASC',
        [projectId],
      );
      return rows.map((r) => ({
        name: r.name,
        fields: [
          { label: 'Source / Basis', value: r.energy_source },
          { label: 'Description', value: r.description, isLong: true },
          { label: 'Rules', value: r.rules, isLong: true },
          { label: 'Limitations', value: r.limitations, isLong: true },
          { label: 'Notes', value: r.examples, isLong: true },
        ],
      }));
    }
    case 'plot-points': {
      const rows = await select<PlotPoint>(
        db,
        'SELECT * FROM plot_points WHERE project_id = $1 AND deleted_at IS NULL ORDER BY order_index ASC, title ASC',
        [projectId],
      );
      return rows.map((r) => ({
        name: r.title,
        fields: [
          { label: 'Status', value: r.status },
          { label: 'Arc', value: r.arc },
          { label: 'Description', value: r.description, isLong: true },
          { label: 'Notes', value: r.notes, isLong: true },
        ],
      }));
    }
    default:
      return [];
  }
}
