import { z } from 'zod';
export const speciesSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  appearance: z.string().max(5000),
  culture: z.string().max(5000),
  history: z.string().max(5000),
  habitat: z.string().max(2000),
  abilities: z.string().max(5000),
  weaknesses: z.string().max(5000),
  notes: z.string().max(10000),
});
export type SpeciesFormData = z.infer<typeof speciesSchema>;
