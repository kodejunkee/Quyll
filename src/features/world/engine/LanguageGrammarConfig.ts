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
export type SonorityStrictness = 'strict' | 'relaxed' | 'none';

// ── V2 Types ────────────────────────────────────────────────────────

export type DerivationType = 'place' | 'agent' | 'adjective' | 'abstractNoun' | 'diminutive' | 'augmentative';

export interface VowelHarmonyConfig {
  enabled: boolean;
  groups: string[][]; // e.g. [["a", "o", "u"], ["e", "i"]]
}

export interface SoundChangeRule {
  pattern: string;      // literal string to find
  replacement: string;  // what to replace it with
}

export interface DerivationalAffixes {
  place?: string;         // king → kingdom:  "thal" → "thalun"
  agent?: string;         // fight → fighter: "gor" → "gorar"
  adjective?: string;     // king → kingly:   "thal" → "thalen"
  abstractNoun?: string;  // free → freedom:  "vel" → "velith"
  diminutive?: string;    // house → cottage: "rak" → "rakil"
  augmentative?: string;  // hill → mountain: "pa" → "parok"
}

// ── Main Config Interface ───────────────────────────────────────────

export interface LanguageGrammarConfig {
  // Phonetics (Procedural Generation)
  vowels: string[];
  consonants: string[];
  syllableStructures: string[]; // e.g., ["CV", "CVC", "V"]
  sonorityStrictness: SonorityStrictness; // Enforce human-like phonology

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

  // ── V2: Phonotactic Constraints ───────────────────────────────────
  // Legal consonant clusters at syllable boundaries.
  // When defined, the generator picks complete clusters from these lists
  // instead of individual consonants.
  allowedOnsets?: string[];     // e.g. ["k", "kr", "kl", "t", "tr", "st"]
  allowedCodas?: string[];      // e.g. ["k", "n", "nt", "nk", "l", "r"]

  // ── V2: Weighted Phoneme Frequency ────────────────────────────────
  // Relative frequency weights per phoneme. Phonemes with higher weights
  // are chosen more often. Unweighted phonemes default to weight 1.
  phonemeWeights?: Record<string, number>;

  // ── V2: Vowel Harmony ─────────────────────────────────────────────
  // When enabled, all vowels in a generated word must come from the
  // same harmony group, creating internal consistency.
  vowelHarmony?: VowelHarmonyConfig;

  // ── V2: Morphological Derivation ──────────────────────────────────
  // Configurable affixes for word families. When a word is a derivative
  // of another (e.g., "kingdom" from "king"), the engine reuses the
  // root and applies these affixes.
  derivationalAffixes?: DerivationalAffixes;

  // ── V2: Sound Change Rules ────────────────────────────────────────
  // Post-generation transformations applied in order to smooth out
  // generated words. e.g., "nn" → "n" simplifies doubled consonants.
  soundChangeRules?: SoundChangeRule[];
}

// ── Defaults ────────────────────────────────────────────────────────

export const DEFAULT_GRAMMAR_CONFIG: LanguageGrammarConfig = {
  vowels: ['a', 'e', 'i', 'o', 'u'],
  consonants: ['p', 't', 'k', 's', 'm', 'n', 'l', 'r'],
  syllableStructures: ['CV', 'CVC'],
  sonorityStrictness: 'strict',

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
