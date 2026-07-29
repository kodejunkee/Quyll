import { v4 as uuidv4 } from 'uuid';
import { execute, select } from '@/database';
import type Database from '@tauri-apps/plugin-sql';
import type { BaseEntity } from '@/types/common';

export interface Language extends BaseEntity {
  readonly project_id: string;
  readonly name: string;
  readonly description: string;
  readonly native_speakers: string;
  readonly writing_system: string;
  readonly grammar_rules: string;
  readonly notes: string;
  readonly keyword_enabled: boolean;
}

export interface LanguageDictionaryEntry extends BaseEntity {
  readonly language_id: string;
  readonly word: string;
  readonly translation: string;
  readonly part_of_speech: string;
  readonly pronunciation: string;
  readonly example_usage: string;
  readonly notes: string;
}

export interface LanguageTranslationHistory {
  readonly id: string;
  readonly language_id: string;
  readonly input_text: string;
  readonly output_text: string;
  readonly mode: 'offline' | 'ai-assist';
  readonly created_at: string;
}

class LanguageService {
  /** Retrieves all languages for a project. */
  async listLanguages(db: Database, projectId: string): Promise<Language[]> {
    return select<Language>(
      db,
      `SELECT * FROM languages WHERE project_id = $1 AND deleted_at IS NULL ORDER BY name ASC`,
      [projectId]
    );
  }

  /** Gets a single language by ID. */
  async getLanguage(db: Database, id: string): Promise<Language | null> {
    const rows = await select<Language>(
      db,
      `SELECT * FROM languages WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    return rows[0] || null;
  }

  /** Creates a new language. */
  async createLanguage(db: Database, projectId: string, data: Partial<Language>): Promise<Language> {
    const id = uuidv4();
    await execute(
      db,
      `INSERT INTO languages (
        id, project_id, name, description, native_speakers, writing_system, grammar_rules, notes, keyword_enabled
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        projectId,
        data.name || '',
        data.description || '',
        data.native_speakers || '',
        data.writing_system || '',
        data.grammar_rules || '',
        data.notes || '',
        data.keyword_enabled ? 1 : 0
      ]
    );
    return (await this.getLanguage(db, id))!;
  }

  /** Updates an existing language. */
  async updateLanguage(db: Database, id: string, data: Partial<Language>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(data)) {
      if (['name', 'description', 'native_speakers', 'writing_system', 'grammar_rules', 'notes'].includes(key)) {
        fields.push(`${key} = $${idx}`);
        values.push(value);
        idx++;
      } else if (key === 'keyword_enabled') {
        fields.push(`${key} = $${idx}`);
        values.push(value ? 1 : 0);
        idx++;
      }
    }

    if (fields.length === 0) return;

    fields.push(`updated_at = datetime('now')`);
    
    await execute(
      db,
      `UPDATE languages SET ${fields.join(', ')} WHERE id = $${idx}`,
      [...values, id]
    );
  }

  /** Soft deletes a language. */
  async deleteLanguage(db: Database, id: string): Promise<void> {
    await execute(db, `UPDATE languages SET deleted_at = datetime('now') WHERE id = $1`, [id]);
  }

  // --- Dictionary Operations ---

  /** Retrieves all dictionary entries for a language. */
  async listDictionaryEntries(db: Database, languageId: string): Promise<LanguageDictionaryEntry[]> {
    return select<LanguageDictionaryEntry>(
      db,
      `SELECT * FROM language_dictionary WHERE language_id = $1 ORDER BY word ASC`,
      [languageId]
    );
  }

  /** Creates a new dictionary entry. */
  async createDictionaryEntry(db: Database, languageId: string, data: Partial<LanguageDictionaryEntry>): Promise<LanguageDictionaryEntry> {
    const id = uuidv4();
    await execute(
      db,
      `INSERT INTO language_dictionary (
        id, language_id, word, translation, part_of_speech, pronunciation, example_usage, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        languageId,
        data.word || '',
        data.translation || '',
        data.part_of_speech || '',
        data.pronunciation || '',
        data.example_usage || '',
        data.notes || ''
      ]
    );

    const rows = await select<LanguageDictionaryEntry>(
      db,
      `SELECT * FROM language_dictionary WHERE id = $1`,
      [id]
    );
    if (!rows.length) throw new Error('Failed to create dictionary entry');
    return rows[0] as LanguageDictionaryEntry;
  }

  /** Updates a dictionary entry. */
  async updateDictionaryEntry(db: Database, id: string, data: Partial<LanguageDictionaryEntry>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(data)) {
      if (['word', 'translation', 'part_of_speech', 'pronunciation', 'example_usage', 'notes'].includes(key)) {
        fields.push(`${key} = $${idx}`);
        values.push(value);
        idx++;
      }
    }

    if (fields.length === 0) return;

    fields.push(`updated_at = datetime('now')`);
    
    await execute(
      db,
      `UPDATE language_dictionary SET ${fields.join(', ')} WHERE id = $${idx}`,
      [...values, id]
    );
  }

  /** Hard deletes a dictionary entry. */
  async deleteDictionaryEntry(db: Database, id: string): Promise<void> {
    await execute(db, `DELETE FROM language_dictionary WHERE id = $1`, [id]);
  }

  // --- Translation History Operations ---

  /** Retrieves the translation history for a language, limited to the most recent items. */
  async listTranslationHistory(db: Database, languageId: string, limit: number = 200): Promise<LanguageTranslationHistory[]> {
    return select<LanguageTranslationHistory>(
      db,
      `SELECT * FROM language_translations WHERE language_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [languageId, limit]
    );
  }

  /** Adds a new translation to the history. */
  async addTranslationHistory(
    db: Database,
    languageId: string,
    inputText: string,
    outputText: string,
    mode: 'offline' | 'ai-assist'
  ): Promise<LanguageTranslationHistory> {
    const id = uuidv4();
    await execute(
      db,
      `INSERT INTO language_translations (id, language_id, input_text, output_text, mode) VALUES ($1, $2, $3, $4, $5)`,
      [id, languageId, inputText, outputText, mode]
    );
    
    // Auto-prune if we exceed 200 to keep DB lightweight (optional, but good practice since soft cap was requested)
    // We'll let it grow slightly over 200 and prune occasionally, or just query limit 200.
    // The query limit handles the soft cap, so no strict pruning needed right now.

    const rows = await select<LanguageTranslationHistory>(
      db,
      `SELECT * FROM language_translations WHERE id = $1`,
      [id]
    );
    if (!rows.length) throw new Error('Failed to create history entry');
    return rows[0] as LanguageTranslationHistory;
  }
}

export const languageService = new LanguageService();
