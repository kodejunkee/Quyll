/**
 * LanguageGrammarConfig
 * 
 * The structured, mechanical specification for a constructed language.
 * Every property is a deterministic rule that the offline Language Engine 
 * can execute without AI assistance.
 */

// ── Sentence Structure ──────────────────────────────────────────────

export type SentenceOrder = 'SVO' | 'SOV' | 'VSO' | 'VOS' | 'OVS' | 'OSV';
export type AdjectivePosition = 'before_noun' | 'after_noun';
export type PossessionStyle = 'prefix' | 'suffix' | 'separate_particle';
export type AffixStyle = 'prefix' | 'suffix' | 'separate_particle' | 'none';

// ── Main Config Interface ───────────────────────────────────────────

export interface LanguageGrammarConfig {
  // Phonetics (Procedural Generation)
  vowels: string[];
  consonants: string[];
  syllableStructures: string[]; // e.g., ["CV", "CVC", "V"]

  // Syntax
  sentenceOrder: SentenceOrder;
  adjectivePosition: AdjectivePosition;
  articles: boolean;

  // Morphology — Plurals
  pluralStyle: AffixStyle;
  pluralAffix: string;          // e.g. "-ri", "al-"

  // Morphology — Tenses
  pastTenseStyle: AffixStyle;
  pastTenseAffix: string;       // e.g. "na-", "-eth"
  presentTenseStyle: AffixStyle;
  presentTenseAffix: string;
  futureTenseStyle: AffixStyle;
  futureTenseAffix: string;     // e.g. "-el"

  // Morphology — Possession
  possessionStyle: PossessionStyle;
  possessionAffix: string;      // e.g. "-'s" → "-va"

  // Negation
  negationStyle: AffixStyle;
  negationAffix: string;        // e.g. "ne-", "-ul"
}

// ── Defaults ────────────────────────────────────────────────────────

export const DEFAULT_GRAMMAR_CONFIG: LanguageGrammarConfig = {
  vowels: ['a', 'e', 'i', 'o', 'u'],
  consonants: ['p', 't', 'k', 's', 'm', 'n', 'l', 'r'],
  syllableStructures: ['CV', 'CVC'],

  sentenceOrder: 'SVO',
  adjectivePosition: 'before_noun',
  articles: true,

  pluralStyle: 'suffix',
  pluralAffix: '-s',

  pastTenseStyle: 'suffix',
  pastTenseAffix: '-ed',
  presentTenseStyle: 'none',
  presentTenseAffix: '',
  futureTenseStyle: 'prefix',
  futureTenseAffix: 'el-',

  possessionStyle: 'suffix',
  possessionAffix: '-va',

  negationStyle: 'prefix',
  negationAffix: 'ne-',
};

/**
 * Safely parses a grammar_rules string (from the database) into a
 * LanguageGrammarConfig. Falls back to defaults for any missing fields.
 */
export function parseGrammarConfig(raw: string | null | undefined): LanguageGrammarConfig {
  if (!raw) return { ...DEFAULT_GRAMMAR_CONFIG };

  try {
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_GRAMMAR_CONFIG, ...parsed };
  } catch {
    // Legacy markdown-based rules — return defaults
    return { ...DEFAULT_GRAMMAR_CONFIG };
  }
}

/**
 * Serialises a LanguageGrammarConfig to a JSON string for database storage.
 */
export function serializeGrammarConfig(config: LanguageGrammarConfig): string {
  return JSON.stringify(config, null, 2);
}
