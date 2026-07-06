import { z } from 'zod';
export const PLOT_STATUSES = ['Idea', 'In Progress', 'Complete', 'Cut'] as const;
export const plotPointSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000),
  status: z.enum(PLOT_STATUSES),
  arc: z.string().max(200),
  notes: z.string().max(10000),
  order_index: z.number().int().min(0),
});
export type PlotPointFormData = z.infer<typeof plotPointSchema>;
