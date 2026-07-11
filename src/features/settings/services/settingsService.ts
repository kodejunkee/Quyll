import type Database from '@tauri-apps/plugin-sql';
import type { Settings, SettingsFormData } from '../types/settings';

/**
 * Service for managing per-project Settings.
 * Settings is essentially a singleton row per project database.
 */
export class SettingsService {
  constructor(private db: Database) {}

  /** Get the current settings */
  async getSettings(): Promise<Settings | null> {
    const result = await this.db.select<Settings[]>('SELECT * FROM settings LIMIT 1');
    return result[0] || null;
  }

  /** Update settings */
  async updateSettings(data: Partial<SettingsFormData>): Promise<Settings | null> {
    const current = await this.getSettings();
    if (!current) return null;

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updates.push(`${key} = $${idx}`);
        values.push(value);
        idx++;
      }
    }

    if (updates.length === 0) return current;

    values.push(current.id);
    const query = `UPDATE settings SET ${updates.join(', ')} WHERE id = $${idx}`;
    
    await this.db.execute(query, values);
    return this.getSettings();
  }
}
