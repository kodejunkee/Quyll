/**
 * CulturalVocabLists — Seed Vocabulary for the Language Forge
 * 
 * Contains the Swadesh list (universal basic concepts), archetype-specific
 * vocabulary, and a comprehensive set of closed-class function words that
 * every constructed language needs.
 */

// ── Closed-Class Function Words ─────────────────────────────────────
// These are the "glue" words every language needs. They should be generated
// with 1-syllable word class to keep them short and snappy.

export const FUNCTION_WORDS = {
  /** Articles / Determiners */
  articles: ['the', 'a', 'this', 'that', 'these', 'those'],

  /** Personal Pronouns (subject + object forms) */
  pronouns: [
    'I', 'me', 'my', 'you', 'your',
    'he', 'him', 'his', 'she', 'her',
    'it', 'its', 'we', 'us', 'our',
    'they', 'them', 'their',
  ],

  /** Prepositions */
  prepositions: [
    'in', 'on', 'at', 'to', 'from', 'with', 'by', 'for', 'of',
    'about', 'between', 'through', 'under', 'over', 'into', 'out',
  ],

  /** Conjunctions */
  conjunctions: ['and', 'or', 'but', 'so', 'if', 'when', 'while', 'because', 'before', 'after'],

  /** Question Words */
  questionWords: ['who', 'what', 'where', 'when', 'why', 'how'],

  /** Negation */
  negation: ['no', 'not', 'never', 'nothing'],

  /** Numbers 1-10 */
  numbers: ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'],

  /** Basic Adverbs */
  adverbs: ['here', 'there', 'now', 'then', 'very', 'also', 'again', 'always', 'up', 'down'],
};

/** Flatten all function words into a single array (for easy iteration). */
export function getAllFunctionWords(): string[] {
  const all = new Set<string>();
  for (const list of Object.values(FUNCTION_WORDS)) {
    for (const word of list) {
      all.add(word);
    }
  }
  return Array.from(all);
}

/** Determine the word class for a function word (for syllable count targeting). */
export function getFunctionWordClass(word: string): 'function' | 'pronoun' | undefined {
  const lower = word.toLowerCase();
  if (FUNCTION_WORDS.pronouns.map(p => p.toLowerCase()).includes(lower)) return 'pronoun';
  // All other function words (articles, prepositions, conjunctions, etc.)
  for (const [key, list] of Object.entries(FUNCTION_WORDS)) {
    if (key === 'pronouns') continue;
    if (list.map((w: string) => w.toLowerCase()).includes(lower)) return 'function';
  }
  return undefined;
}

// ── Swadesh Core Vocabulary ─────────────────────────────────────────
// The 200-item Swadesh list: universal concepts found in nearly every language.

export const SWADESH_LIST = [
  'I', 'you', 'we', 'this', 'that', 'who', 'what', 'not', 'all', 'many',
  'one', 'two', 'big', 'long', 'small', 'woman', 'man', 'person', 'fish', 'bird',
  'dog', 'louse', 'tree', 'seed', 'leaf', 'root', 'bark', 'skin', 'flesh', 'blood',
  'bone', 'grease', 'egg', 'horn', 'tail', 'feather', 'hair', 'head', 'ear', 'eye',
  'nose', 'mouth', 'tooth', 'tongue', 'fingernail', 'foot', 'leg', 'knee', 'hand', 'wing',
  'belly', 'guts', 'neck', 'back', 'breast', 'heart', 'liver', 'drink', 'eat', 'bite',
  'suck', 'spit', 'vomit', 'blow', 'breathe', 'laugh', 'see', 'hear', 'know', 'think',
  'smell', 'fear', 'sleep', 'live', 'die', 'kill', 'fight', 'hunt', 'hit', 'cut',
  'split', 'stab', 'scratch', 'dig', 'swim', 'fly', 'walk', 'come', 'lie', 'sit',
  'stand', 'turn', 'fall', 'give', 'hold', 'squeeze', 'rub', 'wash', 'wipe', 'pull',
  'push', 'throw', 'tie', 'sew', 'count', 'say', 'sing', 'play', 'float', 'flow',
  'freeze', 'swell', 'sun', 'moon', 'star', 'water', 'rain', 'river', 'lake', 'sea',
  'salt', 'stone', 'sand', 'dust', 'earth', 'cloud', 'fog', 'sky', 'wind', 'snow',
  'ice', 'smoke', 'fire', 'ashes', 'burn', 'path', 'mountain', 'red', 'green', 'yellow',
  'white', 'black', 'night', 'day', 'year', 'warm', 'cold', 'full', 'new', 'old',
  'good', 'bad', 'rotten', 'dirty', 'straight', 'round', 'sharp', 'dull', 'smooth', 'wet',
  'dry', 'correct', 'near', 'far', 'right', 'left', 'at', 'in', 'with', 'and',
  'if', 'because', 'name',
  // Additional common verbs missing from classic Swadesh
  'go', 'run', 'take', 'make', 'want', 'need', 'love', 'hate', 'speak', 'write',
  'read', 'open', 'close', 'begin', 'end', 'bring', 'send', 'build', 'break', 'find',
  // Additional common nouns
  'house', 'door', 'road', 'sword', 'shield', 'food', 'friend', 'enemy', 'child', 'king',
  'queen', 'lord', 'god', 'light', 'dark', 'time', 'place', 'world', 'war', 'peace',
];

// ── Archetype-Specific Vocabulary ───────────────────────────────────

export const ARCHETYPE_VOCAB: Record<string, string[]> = {
  elvish: [
    'forest', 'magic', 'star', 'song', 'bow', 'harmony', 'leaf', 'grace', 'silver', 'light',
    'elf', 'ancient', 'wisdom', 'nature', 'spirit', 'beauty', 'immortal', 'twilight', 'dawn', 'crystal'
  ],
  orcish: [
    'blood', 'iron', 'war', 'axe', 'strength', 'honor', 'death', 'bone', 'rage', 'clan',
    'orc', 'battle', 'conquer', 'flesh', 'skull', 'fire', 'enemy', 'glory', 'strike', 'savage'
  ],
  semitic: [
    'sand', 'sun', 'oasis', 'trade', 'gold', 'sky', 'camel', 'script', 'prophecy', 'stone',
    'desert', 'god', 'priest', 'temple', 'scroll', 'ancient', 'dust', 'wind', 'truth', 'law'
  ],
  scifi: [
    'logic', 'engine', 'space', 'time', 'grid', 'metal', 'starship', 'data', 'void', 'core',
    'alien', 'planet', 'system', 'network', 'energy', 'laser', 'shield', 'quantum', 'nexus', 'cyber'
  ],
  trade: [
    'coin', 'ship', 'sea', 'road', 'contract', 'silk', 'spice', 'market', 'guild', 'price',
    'merchant', 'gold', 'silver', 'profit', 'debt', 'trade', 'cargo', 'port', 'wealth', 'deal'
  ]
};

// ── Seed Vocabulary Builder ─────────────────────────────────────────

export interface SeedWord {
  word: string;
  wordClass: 'function' | 'pronoun' | 'common_verb' | 'common_noun' | 'adjective' | 'abstract' | 'rare';
  partOfSpeech: string; // noun, verb, adjective, etc.
}

/**
 * Returns the complete seed vocabulary for a language forge, including:
 * 1. All closed-class function words (with proper word classes)
 * 2. The Swadesh core vocabulary
 * 3. Archetype-specific vocabulary
 * 
 * Each word includes its wordClass for syllable-count targeting and
 * its partOfSpeech for database storage.
 */
export function getSeedVocabularyV2(archetypeId?: string | null): SeedWord[] {
  const seen = new Set<string>();
  const result: SeedWord[] = [];

  const add = (word: string, wordClass: SeedWord['wordClass'], pos: string) => {
    const lower = word.toLowerCase();
    if (seen.has(lower)) return;
    seen.add(lower);
    result.push({ word, wordClass, partOfSpeech: pos });
  };

  // 1. Function words first (highest priority — these get 1-syllable generation)
  for (const w of FUNCTION_WORDS.articles) add(w, 'function', 'article');
  for (const w of FUNCTION_WORDS.pronouns) add(w, 'pronoun', 'pronoun');
  for (const w of FUNCTION_WORDS.prepositions) add(w, 'function', 'preposition');
  for (const w of FUNCTION_WORDS.conjunctions) add(w, 'function', 'conjunction');
  for (const w of FUNCTION_WORDS.questionWords) add(w, 'function', 'pronoun');
  for (const w of FUNCTION_WORDS.negation) add(w, 'function', 'adverb');
  for (const w of FUNCTION_WORDS.numbers) add(w, 'function', 'numeral');
  for (const w of FUNCTION_WORDS.adverbs) add(w, 'function', 'adverb');

  // 2. Swadesh list (basic concepts — mix of verbs, nouns, adjectives)
  // Simple heuristic POS tagging for Swadesh words
  const swadeshVerbs = new Set([
    'drink', 'eat', 'bite', 'suck', 'spit', 'vomit', 'blow', 'breathe', 'laugh',
    'see', 'hear', 'know', 'think', 'smell', 'fear', 'sleep', 'live', 'die', 'kill',
    'fight', 'hunt', 'hit', 'cut', 'split', 'stab', 'scratch', 'dig', 'swim', 'fly',
    'walk', 'come', 'lie', 'sit', 'stand', 'turn', 'fall', 'give', 'hold', 'squeeze',
    'rub', 'wash', 'wipe', 'pull', 'push', 'throw', 'tie', 'sew', 'count', 'say',
    'sing', 'play', 'float', 'flow', 'freeze', 'swell', 'burn',
    'go', 'run', 'take', 'make', 'want', 'need', 'love', 'hate', 'speak', 'write',
    'read', 'open', 'close', 'begin', 'end', 'bring', 'send', 'build', 'break', 'find',
  ]);
  const swadeshAdj = new Set([
    'big', 'long', 'small', 'red', 'green', 'yellow', 'white', 'black',
    'warm', 'cold', 'full', 'new', 'old', 'good', 'bad', 'rotten', 'dirty',
    'straight', 'round', 'sharp', 'dull', 'smooth', 'wet', 'dry', 'correct',
    'near', 'far', 'right', 'left', 'many', 'all', 'ancient', 'dark',
  ]);

  for (const w of SWADESH_LIST) {
    const lower = w.toLowerCase();
    if (seen.has(lower)) continue;
    if (swadeshVerbs.has(lower)) {
      add(w, 'common_verb', 'verb');
    } else if (swadeshAdj.has(lower)) {
      add(w, 'adjective', 'adjective');
    } else {
      add(w, 'common_noun', 'noun');
    }
  }

  // 3. Archetype vocabulary
  if (archetypeId && ARCHETYPE_VOCAB[archetypeId]) {
    for (const w of ARCHETYPE_VOCAB[archetypeId]) {
      const lower = w.toLowerCase();
      if (seen.has(lower)) continue;
      if (swadeshVerbs.has(lower)) {
        add(w, 'common_verb', 'verb');
      } else if (swadeshAdj.has(lower)) {
        add(w, 'adjective', 'adjective');
      } else {
        add(w, 'common_noun', 'noun');
      }
    }
  }

  return result;
}

/**
 * Legacy API — returns a flat string array for backward compatibility.
 */
export function getSeedVocabulary(archetypeId?: string | null): string[] {
  return getSeedVocabularyV2(archetypeId).map(sw => sw.word);
}
