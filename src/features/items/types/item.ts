import { z } from 'zod';
export const ITEM_TYPES = ['Weapon', 'Armor', 'Artifact', 'Tool', 'Consumable', 'Other'] as const;
export const itemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  type: z.string().max(100),
  description: z.string().max(5000),
  owner_character_id: z.string().nullable(),
  notes: z.string().max(10000),
  keyword_enabled: z.boolean(),
});

export type ItemFormData = z.infer<typeof itemSchema>;
