import { z } from 'zod';

export const CHARACTER_STATUSES = ['Alive', 'Dead', 'Unknown', 'Other'] as const;

export const characterSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  aliases: z.string().max(500),
  age: z.number().int().min(0).max(99999).nullable(),
  birthday: z.string().max(100),
  gender: z.string().max(100),
  height: z.string().max(100),
  occupation: z.string().max(200),
  appearance: z.string().max(5000),
  personality: z.string().max(5000),
  goals: z.string().max(5000),
  fears: z.string().max(5000),
  strengths: z.string().max(5000),
  weaknesses: z.string().max(5000),
  abilities: z.string().max(5000),
  equipment: z.string().max(5000),
  motivations: z.string().max(5000),
  biography: z.string().max(10000),
  notes: z.string().max(10000),
  status: z.enum(CHARACTER_STATUSES),
});

export type CharacterFormData = z.infer<typeof characterSchema>;
