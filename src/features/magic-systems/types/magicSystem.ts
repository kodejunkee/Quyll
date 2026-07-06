import { z } from 'zod';
export const magicSystemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(5000),
  rules: z.string().max(5000),
  limitations: z.string().max(5000),
  energy_source: z.string().max(2000),
  examples: z.string().max(5000),
});
export type MagicSystemFormData = z.infer<typeof magicSystemSchema>;
