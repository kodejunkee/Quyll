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

// ── Derivation Types ────────────────────────────────────────────────

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

// ── V3: Deep Morphology Types ───────────────────────────────────────

/** Noun case suffixes. Each case corresponds to a grammatical role. */
export interface NounCaseConfig {
  enabled: boolean;
  /** Subject case — typically the "default" form (may be zero-marked). */
  nominative: string;    // e.g. "" (zero), "-a"
  /** Direct object case. */
  accusative: string;    // e.g. "-un", "-o"
  /** Possessor / "of" case. */
  genitive: string;      // e.g. "-va", "-i"
  /** Indirect object / recipient case. */
  dative: string;        // e.g. "-em", "-ar"
  /** Location / "in/at" case. */
  locative: string;      // e.g. "-il", "-en"
}

/** Grammatical gender / noun class system. */
export interface GenderConfig {
  enabled: boolean;
  /** Gender labels for this language. e.g. ["masculine", "feminine"] or ["animate", "inanimate", "abstract"]. */
  genders: string[];
}

/** Verb person/number conjugation suffixes. */
export interface VerbConjugationConfig {
  enabled: boolean;
  /** 1st person singular (I). */
  firstSingular: string;   // e.g. "-mi"
  /** 2nd person singular (you). */
  secondSingular: string;  // e.g. "-ti"
  /** 3rd person singular (he/she/it). */
  thirdSingular: string;   // e.g. "-su"
  /** 1st person plural (we). */
  firstPlural: string;     // e.g. "-men"
  /** 2nd person plural (you all). */
  secondPlural: string;    // e.g. "-ten"
  /** 3rd person plural (they). */
  thirdPlural: string;     // e.g. "-sun"
}

/** Verb aspect (perfective = completed action, imperfective = ongoing). */
export interface VerbAspectConfig {
  enabled: boolean;
  /** Completed / one-time action affix. */
  perfectiveAffix: string;    // e.g. "-ash"
  perfectiveStyle: AffixStyle;
  /** Ongoing / habitual action affix. */
  imperfectiveAffix: string;  // e.g. "-en"
  imperfectiveStyle: AffixStyle;
}

/** Verb mood (imperative = commands, subjunctive = hypotheticals). */
export interface VerbMoodConfig {
  enabled: boolean;
  /** Command / imperative mood affix. */
  imperativeAffix: string;   // e.g. "-ka!"
  imperativeStyle: AffixStyle;
  /** Hypothetical / wish / subjunctive mood affix. */
  subjunctiveAffix: string;  // e.g. "il-"
  subjunctiveStyle: AffixStyle;
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
  allowedOnsets?: string[];     // e.g. ["k", "kr", "kl", "t", "tr", "st"]
  allowedCodas?: string[];      // e.g. ["k", "n", "nt", "nk", "l", "r"]

  // ── V2: Weighted Phoneme Frequency ────────────────────────────────
  phonemeWeights?: Record<string, number>;

  // ── V2: Vowel Harmony ─────────────────────────────────────────────
  vowelHarmony?: VowelHarmonyConfig;

  // ── V2: Morphological Derivation ──────────────────────────────────
  derivationalAffixes?: DerivationalAffixes;

  // ── V2: Sound Change Rules ────────────────────────────────────────
  soundChangeRules?: SoundChangeRule[];

  // Phonology hints (legacy / free-text description of phonetic style)
  phonologyHints?: string;

  // ── V3: Deep Morphology ───────────────────────────────────────────

  /** Noun case system (nominative, accusative, genitive, dative, locative). */
  nounCases?: NounCaseConfig;

  /** Grammatical gender / noun class system. */
  gender?: GenderConfig;

  /** Verb person/number conjugation paradigm. */
  verbConjugation?: VerbConjugationConfig;

  /** Verb aspect (perfective / imperfective). */
  verbAspect?: VerbAspectConfig;

  /** Verb mood (imperative / subjunctive). */
  verbMood?: VerbMoodConfig;
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

  // V3 defaults — all disabled until user/preset enables them
  nounCases: {
    enabled: false,
    nominative: '',
    accusative: '-un',
    genitive: '-va',
    dative: '-em',
    locative: '-il',
  },

  gender: {
    enabled: false,
    genders: [],
  },

  verbConjugation: {
    enabled: false,
    firstSingular: '-mi',
    secondSingular: '-ti',
    thirdSingular: '-su',
    firstPlural: '-men',
    secondPlural: '-ten',
    thirdPlural: '-sun',
  },

  verbAspect: {
    enabled: false,
    perfectiveAffix: '-ash',
    perfectiveStyle: 'suffix',
    imperfectiveAffix: '-en',
    imperfectiveStyle: 'suffix',
  },

  verbMood: {
    enabled: false,
    imperativeAffix: '-ka',
    imperativeStyle: 'suffix',
    subjunctiveAffix: 'il-',
    subjunctiveStyle: 'prefix',
  },
};

/**
 * Safely parses a grammar_rules string (from the database) into a
 * LanguageGrammarConfig. Falls back to defaults for any missing fields.
 * Deep-merges nested V3 objects so partial overrides don't lose defaults.
 */
export function parseGrammarConfig(raw: string | null | undefined): LanguageGrammarConfig {
  if (!raw) return { ...DEFAULT_GRAMMAR_CONFIG };

  try {
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_GRAMMAR_CONFIG,
      ...parsed,
      // Deep-merge nested V3 objects so partial DB values don't lose defaults
      nounCases: { ...DEFAULT_GRAMMAR_CONFIG.nounCases, ...parsed.nounCases },
      gender: { ...DEFAULT_GRAMMAR_CONFIG.gender, ...parsed.gender },
      verbConjugation: { ...DEFAULT_GRAMMAR_CONFIG.verbConjugation, ...parsed.verbConjugation },
      verbAspect: { ...DEFAULT_GRAMMAR_CONFIG.verbAspect, ...parsed.verbAspect },
      verbMood: { ...DEFAULT_GRAMMAR_CONFIG.verbMood, ...parsed.verbMood },
    };
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
