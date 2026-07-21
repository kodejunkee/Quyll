import thesaurus from 'thesaurus';
import synonyms from 'synonyms';

/**
 * Clean a word by removing leading/trailing punctuation while keeping interior hyphens or apostrophes.
 */
export function cleanWord(word: string): string {
  return word.replace(/^[^\w'-]+|[^\w'-]+$/g, '').trim();
}

/**
 * Helper to preserve casing of the original word on a replacement synonym.
 */
export function preserveCase(originalWord: string, newWord: string): string {
  if (!originalWord || !newWord) return newWord;
  
  // All uppercase (e.g. "DARK")
  if (originalWord.length > 1 && originalWord === originalWord.toUpperCase() && /[A-Z]/.test(originalWord)) {
    return newWord.toUpperCase();
  }
  
  // Capitalized (e.g. "Happy")
  const firstChar = originalWord.charAt(0);
  if (firstChar === firstChar.toUpperCase() && /[A-Z]/.test(firstChar)) {
    return newWord.charAt(0).toUpperCase() + newWord.slice(1);
  }
  
  return newWord;
}

/**
 * Get top synonyms for a word using the offline Moby Thesaurus dataset with smart ranking.
 */
export function getSynonyms(word: string, limit: number = 12): string[] {
  const cleaned = cleanWord(word);
  if (!cleaned || cleaned.length < 2) return [];

  const lower = cleaned.toLowerCase();
  let mobyList: string[] = [];
  let synList: string[] = [];

  // 1. Query Moby Thesaurus (ensure proper `this` context when calling find)
  try {
    const instance = (thesaurus as any).default || thesaurus;
    if (instance && typeof instance.find === 'function') {
      const res = instance.find(lower);
      if (Array.isArray(res)) {
        mobyList = res;
      }
    }
  } catch (err) {
    console.warn('Error querying Moby thesaurus:', err);
  }

  // 2. Query `synonyms` package for core modern vocabulary
  try {
    const synFinder = (synonyms as any).default || synonyms;
    if (typeof synFinder === 'function') {
      const res = synFinder(lower);
      if (res && typeof res === 'object') {
        const values = Object.values(res).flat() as string[];
        if (Array.isArray(values)) {
          synList = values;
        }
      }
    }
  } catch (err) {
    console.warn('Error querying synonyms fallback:', err);
  }

  // Combine lists with set to avoid duplicates
  const allCandidates = Array.from(new Set([...synList, ...mobyList]));
  const synSet = new Set(synList.map(s => s.toLowerCase()));

  // 3. Rank candidates so meaningful, natural English words appear at the top
  const scored: Array<{ word: string; score: number }> = [];
  const seen = new Set<string>();

  for (const item of allCandidates) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    const itemLower = trimmed.toLowerCase();

    // Skip exact match of input word or already processed
    if (itemLower === lower || seen.has(itemLower)) continue;
    seen.add(itemLower);

    let score = 0;

    // High bonus if word is in core modern vocabulary (from `synonyms`)
    if (synSet.has(itemLower)) {
      score += 50;
    }

    // Prefer single, clean words over multi-word or hyphenated expressions
    if (!itemLower.includes(' ') && !itemLower.includes('-')) {
      score += 15;
    }

    // Prefer standard, natural word lengths (3 to 9 letters)
    const len = itemLower.length;
    if (len >= 3 && len <= 9) {
      score += 15;
    } else if (len > 11) {
      score -= (len - 10) * 2;
    }

    // Penalize archaic or overly latinate/obscure suffixes
    if (
      itemLower.endsWith('aical') ||
      itemLower.endsWith('iacal') ||
      itemLower.endsWith('onian') ||
      itemLower.endsWith('ontic') ||
      itemLower.endsWith('ginous')
    ) {
      score -= 35;
    }

    scored.push({ word: trimmed, score });
  }

  // Sort descending by score, preserving original order as tie-breaker
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(item => preserveCase(cleaned, item.word));
}

let dictionarySet: Set<string> | null = null;
let dictionaryList: string[] | null = null;
let commonWordsSet: Set<string> | null = null;

const COMMON_TYPOS: Record<string, string[]> = {
  'werent': ["weren't", 'were', 'went'],
  'didnt': ["didn't"],
  'wouldnt': ["wouldn't"],
  'couldnt': ["couldn't"],
  'shouldnt': ["shouldn't"],
  'isnt': ["isn't"],
  'arent': ["aren't"],
  'wasnt': ["wasn't"],
  'hasnt': ["hasn't"],
  'hadnt': ["hadn't"],
  'dont': ["don't"],
  'doesnt': ["doesn't"],
  'wont': ["won't"],
  'cant': ["can't"],
  'im': ["I'm"],
  'youre': ["you're"],
  'theyre': ["they're"],
  'weve': ["we've"],
  'couldve': ["could've"],
  'shouldve': ["should've"],
  'wouldve': ["would've"],
  'thats': ["that's"],
  'whats': ["what's"],
  'heres': ["here's"],
  'theres': ["there's"],
  'lets': ["let's"],
  'recieve': ['receive'],
  'seperate': ['separate'],
  'teh': ['the'],
  'definately': ['definitely'],
  'occured': ['occurred'],
  'untill': ['until'],
  'alot': ['a lot'],
  'thru': ['through'],
  'altho': ['although']
};

function ensureDictionaryLoaded(): void {
  if (dictionarySet) return;

  dictionarySet = new Set<string>();
  dictionaryList = [];
  commonWordsSet = new Set<string>();

  // Load from synonyms package (core common words)
  try {
    const synFinder = (synonyms as any).default || synonyms;
    const synDict = (synFinder && synFinder.dictionary) || (synonyms as any).dictionary;
    if (synDict && typeof synDict === 'object') {
      for (const key of Object.keys(synDict)) {
        if (key && key.length > 1) {
          const lower = key.toLowerCase();
          dictionarySet.add(lower);
          commonWordsSet.add(lower);
          dictionaryList.push(lower);
        }
      }
    }
  } catch (err) {
    console.warn('Error loading synonyms dict for spellcheck:', err);
  }

  // Load from Moby thesaurus package (comprehensive vocabulary)
  try {
    const instance = (thesaurus as any).default || thesaurus;
    const mobyDict = (instance && typeof instance.get === 'function' ? instance.get() : instance?.database) || (thesaurus as any).database;
    if (mobyDict && typeof mobyDict === 'object') {
      for (const key of Object.keys(mobyDict)) {
        if (key && key.length > 1) {
          const lower = key.toLowerCase();
          if (!dictionarySet.has(lower)) {
            dictionarySet.add(lower);
            dictionaryList.push(lower);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Error loading Moby dict for spellcheck:', err);
  }

  // Load custom dictionary words from localStorage if any
  try {
    const custom = localStorage.getItem('quyll_custom_dictionary');
    if (custom) {
      const parsed = JSON.parse(custom);
      if (Array.isArray(parsed)) {
        for (const w of parsed) {
          if (typeof w === 'string' && w.trim()) {
            const lower = w.trim().toLowerCase();
            dictionarySet.add(lower);
            if (!dictionaryList.includes(lower)) dictionaryList.push(lower);
          }
        }
      }
    }
  } catch (err) {
    // ignore localStorage errors
  }
}

export function addToCustomDictionary(word: string): void {
  const cleaned = cleanWord(word).toLowerCase();
  if (!cleaned) return;
  ensureDictionaryLoaded();
  if (dictionarySet) {
    dictionarySet.add(cleaned);
    if (dictionaryList && !dictionaryList.includes(cleaned)) {
      dictionaryList.push(cleaned);
    }
  }
  try {
    const custom = localStorage.getItem('quyll_custom_dictionary');
    const list = custom ? JSON.parse(custom) : [];
    if (Array.isArray(list) && !list.includes(cleaned)) {
      list.push(cleaned);
      localStorage.setItem('quyll_custom_dictionary', JSON.stringify(list));
    }
  } catch (err) {
    // ignore localStorage errors
  }
}

export function isWordInDictionary(word: string): boolean {
  const cleaned = cleanWord(word).toLowerCase();
  if (!cleaned || cleaned.length <= 1 || /^\d+$/.test(cleaned)) return true;
  ensureDictionaryLoaded();
  if (!dictionarySet) return true;
  if (dictionarySet.has(cleaned)) return true;
  if (cleaned.endsWith("'s") && dictionarySet.has(cleaned.slice(0, -2))) return true;
  if (cleaned.endsWith("s'") && dictionarySet.has(cleaned.slice(0, -2))) return true;
  if (cleaned.endsWith("ed") && dictionarySet.has(cleaned.slice(0, -1))) return true;
  if (cleaned.endsWith("ed") && dictionarySet.has(cleaned.slice(0, -2))) return true;
  if (cleaned.endsWith("es") && dictionarySet.has(cleaned.slice(0, -2))) return true;
  if (cleaned.endsWith("s") && dictionarySet.has(cleaned.slice(0, -1))) return true;
  if (cleaned.endsWith("ing") && dictionarySet.has(cleaned.slice(0, -3))) return true;
  if (cleaned.endsWith("ing") && dictionarySet.has(cleaned.slice(0, -3) + "e")) return true;
  return false;
}

function levenshtein(a: string, b: string, maxDist: number = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > maxDist) return maxDist + 1;
  const v0 = new Array(b.length + 1);
  const v1 = new Array(b.length + 1);
  for (let i = 0; i <= b.length; i++) v0[i] = i;
  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1;
    let minInRow = v1[0];
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
      if (v1[j + 1] < minInRow) minInRow = v1[j + 1];
    }
    if (minInRow > maxDist) return maxDist + 1;
    for (let j = 0; j <= b.length; j++) v0[j] = v1[j];
  }
  return v0[b.length];
}

export function getSpellingSuggestions(word: string, limit: number = 5): string[] {
  const cleaned = cleanWord(word);
  if (!cleaned || cleaned.length < 2) return [];
  const lower = cleaned.toLowerCase();

  if (isWordInDictionary(cleaned)) return [];

  ensureDictionaryLoaded();
  const suggestions: Array<{ word: string; dist: number; score: number }> = [];
  const seen = new Set<string>();

  if (COMMON_TYPOS[lower]) {
    for (const typoFix of COMMON_TYPOS[lower]) {
      seen.add(typoFix.toLowerCase());
      suggestions.push({ word: typoFix, dist: 0, score: 100 });
    }
  }

  if (lower.endsWith('nt') && lower.length > 3) {
    const withApos = lower.slice(0, -2) + "'t";
    if (!seen.has(withApos.toLowerCase())) {
      seen.add(withApos.toLowerCase());
      suggestions.push({ word: withApos, dist: 0.5, score: 95 });
    }
  }

  if (dictionaryList && commonWordsSet) {
    for (const cand of dictionaryList) {
      if (seen.has(cand) || cand === lower) continue;
      if (Math.abs(cand.length - lower.length) > 2) continue;
      if (cand[0] !== lower[0] && cand.length > 3 && cand[1] !== lower[1]) continue;

      const dist = levenshtein(lower, cand, 2);
      if (dist <= 2) {
        seen.add(cand);
        let score = (3 - dist) * 25;
        if (commonWordsSet.has(cand)) score += 30;
        if (cand[0] === lower[0]) score += 15;
        if (cand.length === lower.length) score += 10;
        suggestions.push({ word: cand, dist, score });
      }
    }
  }

  suggestions.sort((a, b) => {
    if (a.dist !== b.dist && (a.dist === 0 || b.dist === 0)) return a.dist - b.dist;
    return b.score - a.score;
  });

  return suggestions.slice(0, limit).map(item => preserveCase(cleaned, item.word));
}

