import { z } from 'zod';
export const LORE_CATEGORIES = ['History', 'Myth', 'Legend', 'Religion', 'Custom', 'Other'] as const;
export const loreSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  category: z.string().max(100),
  content: z.string().max(10000),
  notes: z.string().max(10000),
});
export type LoreFormData = z.infer<typeof loreSchema>;
