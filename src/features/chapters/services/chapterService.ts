import { createEntityService } from '@/services/entityService';
import { execute, select } from '@/database/databaseService';
import { generateId } from '@/utils/uuid';
import type { Chapter } from '@/types/database';
import type Database from '@tauri-apps/plugin-sql';

const CHAPTER_COLUMNS = [
  'title', 'chapter_number', 'content', 'word_count', 'reading_time',
];

const baseService = createEntityService<Chapter>({
  tableName: 'chapters',
  columns: CHAPTER_COLUMNS,
});

export const chapterService = {
  ...baseService,

  /** List chapters ordered by chapter_number (not created_at). */
  async list(db: Database, projectId: string): Promise<Chapter[]> {
    return select<Chapter>(
      db,
      `SELECT * FROM chapters WHERE project_id = $1 AND deleted_at IS NULL ORDER BY chapter_number ASC, created_at ASC`,
      [projectId],
    );
  },

  /** Update only the content, word_count, and reading_time (optimized for autosave). */
  async updateContent(
    db: Database,
    id: string,
    content: string,
    wordCount: number,
    readingTime: number,
    updatedAt?: string,
  ): Promise<string> {
    const now = updatedAt ?? new Date().toISOString();
    await execute(
      db,
      `UPDATE chapters SET content = $1, word_count = $2, reading_time = $3, updated_at = $4 WHERE id = $5`,
      [content, wordCount, readingTime, now, id],
    );
    return now;
  },

  /** Get the next chapter number for a project. */
  async getNextChapterNumber(db: Database, projectId: string): Promise<number> {
    const rows = await select<{ max_num: number | null }>(
      db,
      `SELECT MAX(chapter_number) as max_num FROM chapters WHERE project_id = $1 AND deleted_at IS NULL`,
      [projectId],
    );
    return (rows[0]?.max_num ?? 0) + 1;
  },

  /** Batch-update chapter_number for reordering. */
  async reorder(db: Database, orderedIds: string[]): Promise<void> {
    for (let i = 0; i < orderedIds.length; i++) {
      await execute(
        db,
        `UPDATE chapters SET chapter_number = $1, updated_at = datetime('now') WHERE id = $2`,
        [i + 1, orderedIds[i]],
      );
    }
  },

  /** Duplicate a chapter with a "(Copy)" suffix. */
  async duplicate(db: Database, chapter: Chapter): Promise<Chapter> {
    const id = generateId();
    const now = new Date().toISOString();
    const nextNum = await chapterService.getNextChapterNumber(db, chapter.project_id);

    await execute(
      db,
      `INSERT INTO chapters (id, project_id, title, chapter_number, content, word_count, reading_time, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        chapter.project_id,
        `${chapter.title} (Copy)`,
        nextNum,
        chapter.content,
        chapter.word_count,
        chapter.reading_time,
        now,
        now,
      ],
    );

    const rows = await select<Chapter>(db, `SELECT * FROM chapters WHERE id = $1`, [id]);
    return rows[0]!;
  },

  /** Get total word count for a project (for dashboard). */
  async getTotalWordCount(db: Database, projectId: string): Promise<number> {
    const rows = await select<{ total: number }>(
      db,
      `SELECT COALESCE(SUM(word_count), 0) as total FROM chapters WHERE project_id = $1 AND deleted_at IS NULL`,
      [projectId],
    );
    return rows[0]?.total ?? 0;
  },
};
