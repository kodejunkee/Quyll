import { z } from 'zod';
export const plotPointSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000),
  notes: z.string().max(10000),
  order_index: z.number().int().min(0),
});
export type PlotPointFormData = z.infer<typeof plotPointSchema>;
