import { z } from 'zod';
export const ORG_TYPES = ['Guild', 'Kingdom', 'Army', 'Religion', 'Corporation', 'Other'] as const;
export const organizationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  type: z.string().max(100),
  description: z.string().max(5000),
  leader: z.string().max(200),
  purpose: z.string().max(5000),
  structure: z.string().max(5000),
  history: z.string().max(5000),
  notes: z.string().max(10000),
});
export type OrganizationFormData = z.infer<typeof organizationSchema>;
