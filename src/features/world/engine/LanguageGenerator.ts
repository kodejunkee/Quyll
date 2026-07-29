import type { LanguageGrammarConfig } from './LanguageGrammarConfig';

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

  /** Picks a random element from an array */
  pick<T>(array: T[]): T {
    if (array.length === 0) throw new Error('Cannot pick from empty array');
    const index = Math.floor(this.next() * array.length);
    return array[index]!;
  }

  /** Returns a random integer between min and max (inclusive) */
  range(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

export class LanguageGenerator {
  /**
   * Generates a deterministic word in the constructed language based on an English word.
   * By combining the englishWord with a language identifier (like languageId or name),
   * we ensure "apple" always generates "plok" in this specific language.
   */
  static generateWord(englishWord: string, config: LanguageGrammarConfig, languageId: string): string {
    const seed = `${languageId}-${englishWord.toLowerCase()}`;
    const rng = new SeededRandom(seed);

    // Default arrays if config is empty for some reason
    const vowels = config.vowels?.length > 0 ? config.vowels : ['a', 'e', 'i', 'o', 'u'];
    const consonants = config.consonants?.length > 0 ? config.consonants : ['p', 't', 'k', 'm', 'n', 'l'];
    const structures = config.syllableStructures?.length > 0 ? config.syllableStructures : ['CV', 'CVC'];

    // Determine number of syllables.
    // Let's bias towards 2 syllables, sometimes 1 or 3, rarely 4.
    const syllableRoll = rng.next();
    let numSyllables = 2;
    if (syllableRoll < 0.2) numSyllables = 1;
    else if (syllableRoll < 0.7) numSyllables = 2;
    else if (syllableRoll < 0.95) numSyllables = 3;
    else numSyllables = 4;

    let word = '';

    for (let i = 0; i < numSyllables; i++) {
      const structure = rng.pick(structures);
      let syllable = '';
      
      for (const char of structure) {
        if (char === 'C') {
          syllable += rng.pick(consonants);
        } else if (char === 'V') {
          syllable += rng.pick(vowels);
        }
      }
      
      word += syllable;
    }

    // Capitalize first letter if the original word was capitalized
    const isCapitalized = /^[A-Z]/.test(englishWord);
    if (isCapitalized) {
      word = word.charAt(0).toUpperCase() + word.slice(1);
    }

    return word;
  }
}
