import type { LanguageGrammarConfig } from './LanguageGrammarConfig';
import { DERIVATION_MAP } from './DerivationMap';

/**
 * A simple seeded pseudo-random number generator (LCG).
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
      hash = hash & hash;
    }
    return Math.abs(hash) || 1;
  }

  next(): number {
    const m = 0x80000000;
    const a = 1103515245;
    const c = 12345;
    this.seed = (a * this.seed + c) % m;
    return this.seed / m;
  }

  pick<T>(array: T[]): T {
    if (array.length === 0) throw new Error('Cannot pick from empty array');
    const index = Math.floor(this.next() * array.length);
    return array[index]!;
  }

  weightedPick<T>(items: T[], getWeight: (item: T) => number): T {
    if (items.length === 0) throw new Error('Cannot pick from empty array');
    if (items.length === 1) return items[0]!;

    const totalWeight = items.reduce((sum, item) => sum + getWeight(item), 0);
    if (totalWeight <= 0) return this.pick(items);

    let roll = this.next() * totalWeight;
    for (let i = 0; i < items.length; i++) {
      roll -= getWeight(items[i]!);
      if (roll <= 0) return items[i]!;
    }
    return items[items.length - 1]!;
  }
}

// ── Sonority Hierarchy ──────────────────────────────────────────────

const SONORITY_MAP: Record<string, number> = {
  // Stops (0)
  'p': 0, 'b': 0, 't': 0, 'd': 0, 'k': 0, 'g': 0, 'q': 0, 'c': 0,
  // Fricatives (1)
  'f': 1, 'v': 1, 's': 1, 'z': 1, 'sh': 1, 'zh': 1, 'th': 1, 'dh': 1, 'h': 1, 'kh': 1, 'gh': 1, 'x': 1,
  // Nasals (2)
  'm': 2, 'n': 2, 'ng': 2,
  // Liquids (3)
  'l': 3, 'r': 3, 'll': 3, 'rr': 3,
  // Glides (4)
  'w': 4, 'j': 4, 'y': 4,
  // Vowels (5) - assigned dynamically below
};

function getSonority(phoneme: string, isVowel: boolean): number {
  if (isVowel) return 5;
  return SONORITY_MAP[phoneme] ?? 1; // Default to fricative sonority if unknown
}

// ── Language Generator ──────────────────────────────────────────────

export class LanguageGenerator {

  static generateWord(
    englishWord: string,
    config: LanguageGrammarConfig,
    languageId: string,
    dictionary?: Map<string, string>,
    wordClass?: 'function' | 'pronoun' | 'common_verb' | 'common_noun' | 'adjective' | 'abstract' | 'rare',
  ): string {
    const normalizedWord = englishWord.toLowerCase().trim();

    let word = this.tryDerivation(normalizedWord, config, languageId, dictionary);
    const seed = `${languageId}-${normalizedWord}`;
    
    if (word === null) {
      const rng = new SeededRandom(seed);
      word = this.buildWord(rng, config, wordClass);
      word = this.applySoundChanges(word, config);
    }

    // Enhancement 2: Phonetic Distinctiveness
    if (dictionary) {
      const existingValues = new Set(dictionary.values());
      let attempt = 1;
      while (existingValues.has(word!)) {
        attempt++;
        const retryRng = new SeededRandom(`${seed}-${attempt}`);
        let newWord = this.buildWord(retryRng, config, wordClass);
        
        // Add entropy by appending an extra syllable if it continues to collide
        if (attempt > 3) {
          const vowels = config.vowels?.length > 0 ? config.vowels : ['a', 'e', 'i', 'o', 'u'];
          const consonants = config.consonants?.length > 0 ? config.consonants : ['p', 't', 'k'];
          newWord += this.buildSyllable(retryRng, 'CV', vowels, consonants, config, null);
        }
        
        word = this.applySoundChanges(newWord, config);
      }
    }

    if (/^[A-Z]/.test(englishWord)) {
      word = word!.charAt(0).toUpperCase() + word!.slice(1);
    }

    return word!;
  }

  private static tryDerivation(
    normalizedWord: string,
    config: LanguageGrammarConfig,
    languageId: string,
    dictionary?: Map<string, string>,
  ): string | null {
    const derivation = DERIVATION_MAP[normalizedWord];
    if (!derivation) return null;
    if (!config.derivationalAffixes) return null;

    const affix = config.derivationalAffixes[derivation.type];
    if (!affix) return null;

    let rootConlang: string | undefined;
    if (dictionary) {
      rootConlang = dictionary.get(derivation.root);
    }

    if (!rootConlang) {
      const rootSeed = `${languageId}-${derivation.root}`;
      const rootRng = new SeededRandom(rootSeed);
      rootConlang = this.buildWord(rootRng, config);
      rootConlang = this.applySoundChanges(rootConlang, config);
    }

    const cleanAffix = affix.replace(/^-/, '').replace(/-$/, '');
    const isPrefix = affix.endsWith('-');
    let derivedWord = isPrefix ? cleanAffix + rootConlang : rootConlang + cleanAffix;

    derivedWord = this.applySoundChanges(derivedWord, config);
    return derivedWord;
  }

  // ── Stage 2: Advanced Word Building ────────────────────────────────

  private static buildWord(rng: SeededRandom, config: LanguageGrammarConfig, wordClass?: string): string {
    const vowels = config.vowels?.length > 0 ? config.vowels : ['a', 'e', 'i', 'o', 'u'];
    const consonants = config.consonants?.length > 0 ? config.consonants : ['p', 't', 'k', 'm', 'n', 'l'];
    const structures = config.syllableStructures?.length > 0 ? config.syllableStructures : ['CV', 'CVC'];

    // Enhancement 1: Word-Class-Aware Syllable Counts
    let numSyllables = 2;
    const syllableRoll = rng.next();
    
    if (wordClass === 'function' || wordClass === 'pronoun') {
      numSyllables = 1;
    } else if (wordClass === 'common_verb' || wordClass === 'common_noun') {
      numSyllables = syllableRoll < 0.7 ? 1 : 2;
    } else if (wordClass === 'adjective') {
      numSyllables = syllableRoll < 0.5 ? 1 : 2;
    } else if (wordClass === 'abstract' || wordClass === 'rare') {
      numSyllables = syllableRoll < 0.5 ? 2 : 3;
    } else {
      // Default (backward compatible)
      if (syllableRoll < 0.2) numSyllables = 1;
      else if (syllableRoll < 0.7) numSyllables = 2;
      else if (syllableRoll < 0.95) numSyllables = 3;
      else numSyllables = 4;
    }

    const harmonyEnabled = config.vowelHarmony?.enabled && config.vowelHarmony.groups && config.vowelHarmony.groups.length > 0;
    let harmonyGroup: string[] | null = null;
    
    // Bug 1 Fix: Pre-select the harmony group BEFORE building any syllables
    if (harmonyEnabled) {
      harmonyGroup = rng.pick(config.vowelHarmony!.groups!);
    }

    let word = '';

    for (let i = 0; i < numSyllables; i++) {
      const structure = rng.pick(structures);
      word += this.buildSyllable(rng, structure, vowels, consonants, config, harmonyGroup);
    }

    return word;
  }

  private static buildSyllable(
    rng: SeededRandom,
    structure: string,
    vowels: string[],
    consonants: string[],
    config: LanguageGrammarConfig,
    harmonyGroup: string[] | null,
  ): string {
    const firstV = structure.indexOf('V');
    if (firstV === -1) {
      return this.buildCluster(rng, structure.length, consonants, config, 'onset', 0);
    }

    const onsetLength = firstV;
    const codaLength = structure.length - firstV - 1;
    let syllable = '';

    // Harmony constraints
    let availableVowels = vowels;
    if (harmonyGroup) {
      const harmonicVowels = vowels.filter(v => harmonyGroup.includes(v));
      if (harmonicVowels.length > 0) availableVowels = harmonicVowels;
    }
    
    // Pick Vowel first (nucleus)
    const nucleus = this.pickPhoneme(rng, availableVowels, config.phonemeWeights);

    // Build Onset (rising sonority towards the vowel)
    if (onsetLength > 0) {
      syllable += this.buildCluster(rng, onsetLength, consonants, config, 'onset', -1);
    }

    syllable += nucleus;

    // Build Coda (falling sonority away from the vowel)
    if (codaLength > 0) {
      syllable += this.buildCluster(rng, codaLength, consonants, config, 'coda', 5);
    }

    return syllable;
  }

  /**
   * Builds a consonant cluster using Markov probabilities and Sonority Sequencing.
   */
  private static buildCluster(
    rng: SeededRandom,
    length: number,
    consonants: string[],
    config: LanguageGrammarConfig,
    position: 'onset' | 'coda',
    startSonority: number,
  ): string {
    // If strict clusters are defined, just use them (fallback to V1 logic)
    const allowed = position === 'onset' ? config.allowedOnsets : config.allowedCodas;
    if (allowed && allowed.length > 0) {
      return this.pickPhoneme(rng, allowed, config.phonemeWeights);
    }

    const strictness = config.sonorityStrictness || 'strict';
    let cluster = '';
    let currentSonority = startSonority;
    let lastPhoneme = '';

    // Bug 2 Fix: In the fallback path, count characters so multi-char phonemes 
    // don't create unexpectedly long clusters compared to the structure.
    for (let i = 0; i < length; ) {
      let candidates = consonants;

      // Apply Sonority Sequencing Principle
      if (strictness !== 'none') {
        candidates = consonants.filter(c => {
          const s = getSonority(c, false);
          if (position === 'onset') {
            return strictness === 'strict' ? s > currentSonority : s >= currentSonority;
          } else {
            return strictness === 'strict' ? s < currentSonority : s <= currentSonority;
          }
        });
        
        // If sonority traps us, fall back to all consonants
        if (candidates.length === 0) candidates = consonants;
      }

      // Apply basic Markov chain transition: avoid awkward doubles and penalize hard transitions
      let weights: Record<string, number> = {};
      for (const c of candidates) {
        let weight = config.phonemeWeights?.[c] ?? 1;
        
        if (lastPhoneme) {
          if (c === lastPhoneme) weight *= 0.1; // Avoid 'pp', 'tt' unless intentional
          
          // Smooth transitions (Markov bigrams): liquids/glides love being near stops
          const s1 = getSonority(lastPhoneme, false);
          const s2 = getSonority(c, false);
          if (Math.abs(s1 - s2) === 1) weight *= 1.5; // Smooth step
          if (s1 === 0 && s2 >= 3) weight *= 2.0; // Stop + Liquid (e.g. pr, tr, kl) is very natural
        }
        
        weights[c] = weight;
      }

      const picked = this.pickPhoneme(rng, candidates, weights);
      cluster += picked;
      currentSonority = getSonority(picked, false);
      lastPhoneme = picked;
      
      i += picked.length;
    }

    return cluster;
  }

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

  // ── Stage 3: Sound Changes (Sandhi) ───────────────────────────────

  private static applySoundChanges(word: string, config: LanguageGrammarConfig): string {
    let result = word;

    // Advanced morphological Sandhi (handling affix collisions)
    // Simple hiatus resolution (avoiding 3 vowels in a row unless configured)
    result = result.replace(/([aeiouy])\1{2,}/gi, '$1$1');

    if (!config.soundChangeRules || config.soundChangeRules.length === 0) return result;

    for (const rule of config.soundChangeRules) {
      result = result.split(rule.pattern).join(rule.replacement);
    }
    return result;
  }
}
