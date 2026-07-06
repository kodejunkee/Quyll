import { z } from 'zod';
export const timelineEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000),
  event_date: z.string().max(100),
});
export type TimelineEventFormData = z.infer<typeof timelineEventSchema>;
