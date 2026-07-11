import { z } from 'zod';

export const MAX_CHAPTER_TITLE_LENGTH = 200;

export const chapterSchema = z.object({
  title: z.string().min(1, 'Title is required').max(MAX_CHAPTER_TITLE_LENGTH),
  chapter_number: z.number().int().min(0).optional(),
});

export type ChapterFormData = z.infer<typeof chapterSchema>;
