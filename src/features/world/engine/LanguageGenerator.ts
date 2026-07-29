import type { LanguageGrammarConfig } from './LanguageGrammarConfig';
import { DERIVATION_MAP } from './DerivationMap';

/**
 * A simple seeded pseudo-random number generator (LCG).
 * Given a seed string, it will deterministically produce the same sequence of numbers.
 */
class SeededRandom {
  private seed: number;

  constructor(seedString: string) {
    this.seed = this.hashString(seedString);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) || 1; // Never return 0
  }

  /** Returns a float between 0 (inclusive) and 1 (exclusive) */
  next(): number {
    // Linear congruential generator parameters (glibc)
    const m = 0x80000000;
    const a = 1103515245;
    const c = 12345;
    this.seed = (a * this.seed + c) % m;
    return this.seed / m;
  }

  /** Picks a random element from an array with equal probability */
  pick<T>(array: T[]): T {
    if (array.length === 0) throw new Error('Cannot pick from empty array');
    const index = Math.floor(this.next() * array.length);
    return array[index]!;
  }

  /** Picks a random element using weighted probability */
  weightedPick<T>(items: T[], getWeight: (item: T) => number): T {
    if (items.length === 0) throw new Error('Cannot pick from empty array');
    if (items.length === 1) return items[0]!;

    const totalWeight = items.reduce((sum, item) => sum + getWeight(item), 0);
    if (totalWeight <= 0) return this.pick(items); // fallback to uniform

    let roll = this.next() * totalWeight;
    for (let i = 0; i < items.length; i++) {
      roll -= getWeight(items[i]!);
      if (roll <= 0) return items[i]!;
    }
    return items[items.length - 1]!;
  }

  /** Returns a random integer between min and max (inclusive) */
  range(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

/**
 * LanguageGenerator V2 — The Procedural Word Factory
 * 
 * Generates deterministic words in a constructed language using a 4-stage pipeline:
 *   Stage 1: Derivation Check — reuse roots for word families
 *   Stage 2: Syllable Generation — phonotactics, weighted frequency, vowel harmony
 *   Stage 3: Sound Changes — post-generation phonological transformations
 *   Stage 4: Finalization — capitalization, cleanup
 */
export class LanguageGenerator {

  /**
   * Generates a deterministic word in the constructed language based on an English word.
   * 
   * @param englishWord   The English word to translate
   * @param config        The language's grammar configuration
   * @param languageId    Unique ID for deterministic seeding
   * @param dictionary    Optional english→conlang lookup for derivation reuse
   */
  static generateWord(
    englishWord: string,
    config: LanguageGrammarConfig,
    languageId: string,
    dictionary?: Map<string, string>,
  ): string {
    const normalizedWord = englishWord.toLowerCase().trim();

    // ── Stage 1: Derivation Check ───────────────────────────────────
    const derived = this.tryDerivation(normalizedWord, config, languageId, dictionary);
    if (derived !== null) {
      // Apply capitalization to derived word
      if (/^[A-Z]/.test(englishWord)) {
        return derived.charAt(0).toUpperCase() + derived.slice(1);
      }
      return derived;
    }

    // ── Stage 2: Syllable Generation ────────────────────────────────
    const seed = `${languageId}-${normalizedWord}`;
    const rng = new SeededRandom(seed);
    let word = this.buildWord(rng, config);

    // ── Stage 3: Sound Changes ──────────────────────────────────────
    word = this.applySoundChanges(word, config);

    // ── Stage 4: Finalization ───────────────────────────────────────
    if (/^[A-Z]/.test(englishWord)) {
      word = word.charAt(0).toUpperCase() + word.slice(1);
    }

    return word;
  }

  // ── Stage 1: Derivation ─────────────────────────────────────────────

  /**
   * Checks if the English word is a derivative of another word.
   * If the root exists in the dictionary, applies a derivational affix.
   * If the root is NOT in the dictionary, generates it first then derives.
   * Returns null if no derivation applies.
   */
  private static tryDerivation(
    normalizedWord: string,
    config: LanguageGrammarConfig,
    languageId: string,
    dictionary?: Map<string, string>,
  ): string | null {
    const derivation = DERIVATION_MAP[normalizedWord];
    if (!derivation) return null;

    // Need derivational affixes configured to do anything
    if (!config.derivationalAffixes) return null;

    const affix = config.derivationalAffixes[derivation.type];
    if (!affix) return null;

    // Try to find the root in the dictionary
    let rootConlang: string | undefined;
    if (dictionary) {
      rootConlang = dictionary.get(derivation.root);
    }

    // If root not in dictionary, generate it deterministically
    if (!rootConlang) {
      const rootSeed = `${languageId}-${derivation.root}`;
      const rootRng = new SeededRandom(rootSeed);
      rootConlang = this.buildWord(rootRng, config);
      rootConlang = this.applySoundChanges(rootConlang, config);
    }

    // Apply the derivational affix
    const cleanAffix = affix.replace(/^-/, '').replace(/-$/, '');
    const isPrefix = affix.endsWith('-') && !affix.startsWith('-');
    let derivedWord = isPrefix ? cleanAffix + rootConlang : rootConlang + cleanAffix;

    // Apply sound changes to the derived word too
    derivedWord = this.applySoundChanges(derivedWord, config);

    return derivedWord;
  }

  // ── Stage 2: Word Building ──────────────────────────────────────────

  /**
   * Builds a raw word from syllables using the language's phonological rules.
   */
  private static buildWord(rng: SeededRandom, config: LanguageGrammarConfig): string {
    const vowels = config.vowels?.length > 0 ? config.vowels : ['a', 'e', 'i', 'o', 'u'];
    const consonants = config.consonants?.length > 0 ? config.consonants : ['p', 't', 'k', 'm', 'n', 'l'];
    const structures = config.syllableStructures?.length > 0 ? config.syllableStructures : ['CV', 'CVC'];

    // Determine number of syllables (biased: 20% 1-syl, 50% 2-syl, 25% 3-syl, 5% 4-syl)
    const syllableRoll = rng.next();
    let numSyllables = 2;
    if (syllableRoll < 0.2) numSyllables = 1;
    else if (syllableRoll < 0.7) numSyllables = 2;
    else if (syllableRoll < 0.95) numSyllables = 3;
    else numSyllables = 4;

    // Vowel harmony: lock a group after the first vowel
    let harmonyGroup: string[] | null = null;
    const harmonyEnabled = config.vowelHarmony?.enabled && config.vowelHarmony.groups?.length > 0;

    let word = '';

    for (let i = 0; i < numSyllables; i++) {
      const structure = rng.pick(structures);
      word += this.buildSyllable(
        rng, structure, vowels, consonants, config,
        harmonyGroup,
      );

      // Lock harmony group after first syllable's vowel
      if (harmonyEnabled && !harmonyGroup && word.length > 0) {
        harmonyGroup = this.findHarmonyGroup(word, config);
      }
    }

    return word;
  }

  /**
   * Builds a single syllable from a structure template (e.g., "CV", "CVC", "CCV").
   * 
   * The template is parsed into onset (leading C's), nucleus (V), and coda (trailing C's).
   * Each section uses the appropriate phonotactic rules.
   */
  private static buildSyllable(
    rng: SeededRandom,
    structure: string,
    vowels: string[],
    consonants: string[],
    config: LanguageGrammarConfig,
    harmonyGroup: string[] | null,
  ): string {
    // Parse structure: split into onset (C's before first V), nucleus (V), coda (C's after V)
    const firstV = structure.indexOf('V');
    if (firstV === -1) {
      // No vowel in structure — just consonants (unusual but handle it)
      return this.pickConsonantCluster(rng, structure.length, consonants, config, 'onset');
    }

    const onsetLength = firstV;
    const codaLength = structure.length - firstV - 1;

    let syllable = '';

    // ── Onset ──
    if (onsetLength > 0) {
      syllable += this.pickConsonantCluster(rng, onsetLength, consonants, config, 'onset');
    }

    // ── Nucleus (Vowel) ──
    let availableVowels = vowels;
    if (harmonyGroup) {
      // Constrain to the locked harmony group
      const harmonicVowels = vowels.filter(v => harmonyGroup.includes(v));
      if (harmonicVowels.length > 0) availableVowels = harmonicVowels;
    }
    syllable += this.pickPhoneme(rng, availableVowels, config.phonemeWeights);

    // ── Coda ──
    if (codaLength > 0) {
      syllable += this.pickConsonantCluster(rng, codaLength, consonants, config, 'coda');
    }

    return syllable;
  }

  /**
   * Picks consonant(s) for an onset or coda position.
   * If phonotactic lists are configured, picks a complete cluster from them.
   * Otherwise falls back to picking individual consonants.
   */
  private static pickConsonantCluster(
    rng: SeededRandom,
    templateLength: number,
    consonants: string[],
    config: LanguageGrammarConfig,
    position: 'onset' | 'coda',
  ): string {
    const clusterList = position === 'onset' ? config.allowedOnsets : config.allowedCodas;

    if (clusterList && clusterList.length > 0) {
      // Pick a complete cluster from the allowed list
      return this.pickPhoneme(rng, clusterList, config.phonemeWeights);
    }

    // Legacy fallback: pick individual consonants
    let result = '';
    for (let c = 0; c < templateLength; c++) {
      result += this.pickPhoneme(rng, consonants, config.phonemeWeights);
    }
    return result;
  }

  /**
   * Picks a single phoneme from a list, using weighted selection if weights are configured.
   */
  private static pickPhoneme(
    rng: SeededRandom,
    phonemes: string[],
    weights?: Record<string, number>,
  ): string {
    if (!weights || Object.keys(weights).length === 0) {
      return rng.pick(phonemes);
    }

    return rng.weightedPick(phonemes, (p) => weights[p] ?? 1);
  }

  /**
   * Finds which vowel harmony group the first vowel in the word belongs to.
   */
  private static findHarmonyGroup(
    word: string,
    config: LanguageGrammarConfig,
  ): string[] | null {
    if (!config.vowelHarmony?.enabled || !config.vowelHarmony.groups) return null;

    const allVowels = new Set(config.vowels || []);

    // Walk through the word character by character to find the first vowel
    // (vowels can be multi-char like "ae", "ou" — check longer matches first)
    const sortedVowels = [...allVowels].sort((a, b) => b.length - a.length);

    for (let pos = 0; pos < word.length; pos++) {
      for (const vowel of sortedVowels) {
        if (word.substring(pos, pos + vowel.length) === vowel) {
          // Found a vowel — which group does it belong to?
          for (const group of config.vowelHarmony.groups) {
            if (group.includes(vowel)) {
              return group;
            }
          }
        }
      }
    }

    return null;
  }

  // ── Stage 3: Sound Changes ──────────────────────────────────────────

  /**
   * Applies post-generation sound change rules in order.
   * Each rule replaces all occurrences of a pattern with a replacement.
   */
  private static applySoundChanges(
    word: string,
    config: LanguageGrammarConfig,
  ): string {
    if (!config.soundChangeRules || config.soundChangeRules.length === 0) return word;

    let result = word;
    for (const rule of config.soundChangeRules) {
      // Use replaceAll for literal string replacement
      result = result.split(rule.pattern).join(rule.replacement);
    }
    return result;
  }
}
