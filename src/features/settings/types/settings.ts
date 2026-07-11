import { z } from 'zod';
import type { Settings } from '@/types/database';

export const settingsSchema = z.object({
  theme: z.string(),
  accent_color: z.string(),
  editor_font: z.string(),
  editor_font_size: z.number().min(10).max(36),
  autosave_interval: z.number().min(1).max(60), // in minutes
  sidebar_collapsed: z.number().min(0).max(1),
  inspector_collapsed: z.number().min(0).max(1),
});

export type SettingsFormData = z.infer<typeof settingsSchema>;

// Re-export the interface from database
export type { Settings };
