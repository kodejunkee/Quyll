import { z } from 'zod';
export const LOCATION_TYPES = ['City', 'Town', 'Village', 'Fortress', 'Forest', 'Mountain', 'River', 'Cave', 'Other'] as const;

export const locationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  type: z.string().max(100),
  description: z.string().max(5000),
  climate: z.string().max(500),
  architecture: z.string().max(2000),
  culture: z.string().max(5000),
  population: z.string().max(500),
  history: z.string().max(5000),
  notes: z.string().max(10000),
});

export type LocationFormData = z.infer<typeof locationSchema>;
