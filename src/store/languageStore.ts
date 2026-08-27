import { create } from 'zustand';
import { getDb } from '@/lib/db';

export interface WordEntry {
  id?: string;
  word: string;
  meaning: string;
  partOfSpeech: string;
}

export interface Language {
  id: string;
  name: string;
  wordOrder: string;
  vibe: string;
  dictionary: WordEntry[]; // This will be hydrated lazily when language is selected
  createdAt: number;
}

interface LanguageState {
  languages: Language[];
  activeLanguageId: string | null;
  
  setActiveLanguageId: (id: string | null) => Promise<void>;
  loadLanguages: () => Promise<void>;
  createLanguage: (name: string, wordOrder: string, vibe: string) => Promise<string>;
  updateLanguage: (id: string, updates: Partial<Language>) => Promise<void>;
  deleteLanguage: (id: string) => Promise<void>;
  addWordsToDictionary: (id: string, newWords: WordEntry[]) => Promise<void>;
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  languages: [],
  activeLanguageId: null,

  setActiveLanguageId: async (id) => {
    set({ activeLanguageId: id });
    if (id) {
      try {
        const db = await getDb();
        const dictionary = await db.select<WordEntry[]>(
          'SELECT word, meaning, part_of_speech as partOfSpeech FROM dictionary_words WHERE language_id = $1',
          [id]
        );
        set(state => ({
          languages: state.languages.map(lang => 
            lang.id === id ? { ...lang, dictionary } : lang
          )
        }));
      } catch (err) {
        console.error("Failed to load dictionary:", err);
      }
    }
  },

  loadLanguages: async () => {
    try {
      const db = await getDb();
      const rows = await db.select<any[]>('SELECT id, name, word_order as wordOrder, vibe, created_at as createdAt FROM conlangs ORDER BY created_at DESC');
      
      const languages: Language[] = rows.map(r => ({
        id: r.id,
        name: r.name,
        wordOrder: r.wordOrder,
        vibe: r.vibe,
        createdAt: r.createdAt,
        dictionary: [] // lazy loaded
      }));

      // Count dictionary words for the dashboard
      const counts = await db.select<{language_id: string, count: number}[]>(
        'SELECT language_id, count(*) as count FROM dictionary_words GROUP BY language_id'
      );
      
      for (const lang of languages) {
        const c = counts.find(x => x.language_id === lang.id);
        if (c) {
          // create mock entries just so `dictionary.length` is correct in the UI
          lang.dictionary = new Array(c.count).fill(null);
        }
      }

      set({ languages });
    } catch (err) {
      console.error("Failed to load languages:", err);
    }
  },

  createLanguage: async (name, wordOrder, vibe) => {
    const id = Date.now().toString();
    const newLang: Language = {
      id,
      name,
      wordOrder,
      vibe,
      dictionary: [],
      createdAt: Date.now()
    };
    
    try {
      const db = await getDb();
      await db.execute(
        'INSERT INTO conlangs (id, name, word_order, vibe, created_at) VALUES ($1, $2, $3, $4, $5)',
        [id, name, wordOrder, vibe, newLang.createdAt]
      );
      
      set((state) => ({
        languages: [newLang, ...state.languages],
        activeLanguageId: id
      }));
    } catch (err) {
      console.error("Failed to create language:", err);
    }
    
    return id;
  },

  updateLanguage: async (id, updates) => {
    try {
      const db = await getDb();
      if (updates.name) {
        await db.execute('UPDATE conlangs SET name = $1 WHERE id = $2', [updates.name, id]);
      }
      if (updates.wordOrder) {
        await db.execute('UPDATE conlangs SET word_order = $1 WHERE id = $2', [updates.wordOrder, id]);
      }
      if (updates.vibe) {
        await db.execute('UPDATE conlangs SET vibe = $1 WHERE id = $2', [updates.vibe, id]);
      }

      set((state) => ({
        languages: state.languages.map(lang => 
          lang.id === id ? { ...lang, ...updates } : lang
        )
      }));
    } catch (err) {
      console.error("Failed to update language:", err);
    }
  },

  deleteLanguage: async (id) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM conlangs WHERE id = $1', [id]);
      
      set((state) => ({
        languages: state.languages.filter(l => l.id !== id),
        activeLanguageId: state.activeLanguageId === id ? null : state.activeLanguageId
      }));
    } catch (err) {
      console.error("Failed to delete language:", err);
    }
  },

  addWordsToDictionary: async (id, newWords) => {
    if (newWords.length === 0) return;
    
    try {
      const db = await getDb();
      const state = get();
      const lang = state.languages.find(l => l.id === id);
      if (!lang) return;

      const existingWords = new Set(lang.dictionary.map(w => w?.word?.toLowerCase()).filter(Boolean));
      const uniqueNewWords = newWords.filter(w => !existingWords.has(w.word.toLowerCase()));
      
      for (const w of uniqueNewWords) {
        const wordId = Date.now().toString() + Math.random().toString();
        await db.execute(
          'INSERT INTO dictionary_words (id, language_id, word, meaning, part_of_speech) VALUES ($1, $2, $3, $4, $5)',
          [wordId, id, w.word, w.meaning, w.partOfSpeech]
        );
      }

      set((state) => ({
        languages: state.languages.map(lang => {
          if (lang.id === id) {
            // Remove mock items (nulls) if they exist, to ensure proper rendering
            const cleanDict = lang.dictionary.filter(w => w !== null);
            return {
              ...lang,
              dictionary: [...cleanDict, ...uniqueNewWords]
            };
          }
          return lang;
        })
      }));
    } catch (err) {
      console.error("Failed to add words:", err);
    }
  }
}));
