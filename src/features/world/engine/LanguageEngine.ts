/**
 * LanguageEngine — The Offline Translation Machine
 * 
 * This engine translates English sentences into a constructed language
 * entirely offline, using:
 *   1. compromise.js for English NLP parsing
 *   2. A local dictionary lookup
 *   3. Mechanical grammar rules (LanguageGrammarConfig)
 * 
 * The AI is ONLY invoked to invent missing words. Everything else is local.
 */

import nlp from 'compromise';
import type { LanguageGrammarConfig } from './LanguageGrammarConfig';

// ── Types ───────────────────────────────────────────────────────────

export interface DictionaryWord {
  word: string;           // The conlang word (e.g. "Vaelor")
  translation: string;    // The English meaning (e.g. "king")
  part_of_speech: string; // e.g. "noun", "verb", "adjective"
}

export interface ParsedToken {
  text: string;            // Original English word
  root: string;            // Lemmatized root (e.g. "returned" → "return")
  pos: string;             // Part of speech: noun, verb, adjective, adverb, etc.
  tense?: string;          // past, present, future
  isPlural?: boolean;
  isPossessive?: boolean;
  isNegated?: boolean;
  isArticle?: boolean;     // "the", "a", "an"
  isPreposition?: boolean; // "in", "on", "at", etc.
  isConjunction?: boolean; // "and", "but", "or"
  isPronoun?: boolean;     // "he", "she", "it"
  role?: 'subject' | 'verb' | 'object'; // Syntactic role for reordering
}

export interface TranslationResult {
  translatedSentence: string;
  literalBreakdown: string;
  missingWords: string[];              // English words not found in dictionary
  tokensUsed: TranslatedToken[];
}

export interface TranslatedToken {
  english: string;
  conlang: string;
  wasInDictionary: boolean;
  morphologyApplied: string[];  // e.g. ["plural suffix: -ri", "past prefix: na-"]
}

// ── Stopwords (functional words the engine handles mechanically) ─────

const ARTICLES = new Set(['the', 'a', 'an']);
const PREPOSITIONS = new Set([
  'in', 'on', 'at', 'to', 'for', 'with', 'from', 'by', 'of',
  'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'under', 'over', 'about', 'against', 'among',
]);
const CONJUNCTIONS = new Set(['and', 'but', 'or', 'nor', 'yet', 'so', 'for']);
const PRONOUNS = new Set([
  'i', 'me', 'my', 'mine', 'myself',
  'you', 'your', 'yours', 'yourself',
  'he', 'him', 'his', 'himself',
  'she', 'her', 'hers', 'herself',
  'it', 'its', 'itself',
  'we', 'us', 'our', 'ours', 'ourselves',
  'they', 'them', 'their', 'theirs', 'themselves',
]);
const AUXILIARIES = new Set(['has', 'have', 'had', 'is', 'am', 'are', 'was', 'were', 'do', 'does', 'did', 'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must']);
const NEGATION_WORDS = new Set(['not', "n't", 'never', 'no']);

// ── The Engine ──────────────────────────────────────────────────────

export class LanguageEngine {
  private config: LanguageGrammarConfig;
  private dictionary: Map<string, DictionaryWord>; // keyed by lowercase English

  constructor(config: LanguageGrammarConfig, dictionaryEntries: DictionaryWord[]) {
    this.config = config;
    this.dictionary = new Map();
    for (const entry of dictionaryEntries) {
      this.dictionary.set(entry.translation.toLowerCase().trim(), entry);
    }
  }

  /**
   * STEP 1: Parse the English sentence into tagged tokens
   */
  parseEnglish(sentence: string): ParsedToken[] {
    const doc = nlp(sentence);
    const tokens: ParsedToken[] = [];

    // Check for sentence-level negation
    const hasNegation = doc.has('#Negative') || NEGATION_WORDS.has(sentence.split(' ').find(w => NEGATION_WORDS.has(w.toLowerCase().replace(/[^a-z']/g, ''))) || '');

    doc.terms().forEach((term: any) => {
      const text = term.text('text').trim();
      if (!text) return;

      const lower = text.toLowerCase().replace(/[^a-z']/g, '');

      // Skip auxiliary verbs (tense is captured on the main verb)
      if (AUXILIARIES.has(lower)) return;

      // Skip negation words (handled as a flag)
      if (NEGATION_WORDS.has(lower)) return;

      const token: ParsedToken = {
        text,
        root: lower,
        pos: 'unknown',
      };

      // Detect articles
      if (ARTICLES.has(lower)) {
        token.isArticle = true;
        token.pos = 'article';
        tokens.push(token);
        return;
      }

      // Detect prepositions
      if (PREPOSITIONS.has(lower)) {
        token.isPreposition = true;
        token.pos = 'preposition';
        tokens.push(token);
        return;
      }

      // Detect conjunctions
      if (CONJUNCTIONS.has(lower)) {
        token.isConjunction = true;
        token.pos = 'conjunction';
        tokens.push(token);
        return;
      }

      // Detect pronouns
      if (PRONOUNS.has(lower)) {
        token.isPronoun = true;
        token.pos = 'pronoun';
        token.root = lower;
        tokens.push(token);
        return;
      }

      // Use compromise for POS tagging
      const termDoc = nlp(text);
      
      if (termDoc.verbs().found) {
        token.pos = 'verb';
        // Get root form
        const conjugations = termDoc.verbs().conjugate();
        if (conjugations.length > 0) {
          token.root = (conjugations[0] as any).Infinitive || lower;
        }
        // Detect tense
        if (termDoc.has('#PastTense') || termDoc.has('#PastParticiple')) {
          token.tense = 'past';
        } else if (termDoc.has('#FutureTense')) {
          token.tense = 'future';
        } else {
          token.tense = 'present';
        }
      } else if (termDoc.nouns().found) {
        token.pos = 'noun';
        // Check plural
        if (termDoc.has('#Plural')) {
          token.isPlural = true;
          const singular = termDoc.nouns().toSingular().text('text').toLowerCase().replace(/[^a-z']/g, '');
          token.root = singular || lower;
        }
        // Check possessive
        if (text.includes("'s") || text.includes("'")) {
          token.isPossessive = true;
          token.root = lower.replace(/'s?$/, '');
        }
      } else if (termDoc.adjectives().found) {
        token.pos = 'adjective';
      } else if (termDoc.adverbs().found) {
        token.pos = 'adverb';
      }

      // Apply sentence-level negation to the verb
      if (hasNegation && token.pos === 'verb') {
        token.isNegated = true;
      }

      tokens.push(token);
    });

    // Assign syntactic roles for reordering
    this.assignRoles(tokens);

    return tokens;
  }

  /**
   * Assigns Subject / Verb / Object roles to tokens for sentence reordering.
   */
  private assignRoles(tokens: ParsedToken[]): void {
    let foundVerb = false;
    let foundSubject = false;

    for (const token of tokens) {
      if (token.isArticle || token.isPreposition || token.isConjunction) continue;

      if (!foundSubject && (token.pos === 'noun' || token.isPronoun)) {
        token.role = 'subject';
        foundSubject = true;
      } else if (!foundVerb && token.pos === 'verb') {
        token.role = 'verb';
        foundVerb = true;
      } else if (foundVerb && (token.pos === 'noun' || token.isPronoun)) {
        token.role = 'object';
      }
    }
  }

  /**
   * STEP 2: Look up each token in the dictionary and identify missing words.
   */
  lookupTokens(tokens: ParsedToken[]): { found: Map<string, DictionaryWord>; missing: string[] } {
    const found = new Map<string, DictionaryWord>();
    const missing: string[] = [];

    for (const token of tokens) {
      if (token.isArticle || token.isPreposition || token.isConjunction) continue;
      
      const key = token.root.toLowerCase();
      
      if (this.dictionary.has(key)) {
        found.set(key, this.dictionary.get(key)!);
      } else if (!missing.includes(key)) {
        missing.push(key);
      }
    }

    return { found, missing };
  }

  /**
   * STEP 3: Apply morphological rules (affixes) to a conlang word.
   */
  applyMorphology(conlangWord: string, token: ParsedToken): { result: string; applied: string[] } {
    let result = conlangWord;
    const applied: string[] = [];

    // Apply plural
    if (token.isPlural && this.config.pluralStyle !== 'none') {
      const affix = this.config.pluralAffix.replace(/^-/, '').replace(/-$/, '');
      if (this.config.pluralStyle === 'suffix') {
        result = result + affix;
        applied.push(`plural suffix: -${affix}`);
      } else if (this.config.pluralStyle === 'prefix') {
        result = affix + result;
        applied.push(`plural prefix: ${affix}-`);
      }
    }

    // Apply tense
    if (token.pos === 'verb' && token.tense) {
      const tenseConfig = {
        past: { style: this.config.pastTenseStyle, affix: this.config.pastTenseAffix },
        present: { style: this.config.presentTenseStyle, affix: this.config.presentTenseAffix },
        future: { style: this.config.futureTenseStyle, affix: this.config.futureTenseAffix },
      }[token.tense];

      if (tenseConfig && tenseConfig.style !== 'none' && tenseConfig.affix) {
        const affix = tenseConfig.affix.replace(/^-/, '').replace(/-$/, '');
        if (tenseConfig.style === 'suffix') {
          result = result + affix;
          applied.push(`${token.tense} tense suffix: -${affix}`);
        } else if (tenseConfig.style === 'prefix') {
          result = affix + result;
          applied.push(`${token.tense} tense prefix: ${affix}-`);
        }
      }
    }

    // Apply possession
    if (token.isPossessive) {
      const affix = this.config.possessionAffix.replace(/^-/, '').replace(/-$/, '');
      if (this.config.possessionStyle === 'suffix') {
        result = result + affix;
        applied.push(`possessive suffix: -${affix}`);
      } else if (this.config.possessionStyle === 'prefix') {
        result = affix + result;
        applied.push(`possessive prefix: ${affix}-`);
      }
    }

    // Apply negation
    if (token.isNegated && this.config.negationStyle !== 'none') {
      const affix = this.config.negationAffix.replace(/^-/, '').replace(/-$/, '');
      if (this.config.negationStyle === 'suffix') {
        result = result + affix;
        applied.push(`negation suffix: -${affix}`);
      } else if (this.config.negationStyle === 'prefix') {
        result = affix + result;
        applied.push(`negation prefix: ${affix}-`);
      }
    }

    return { result, applied };
  }

  /**
   * STEP 4: Reorder translated tokens according to the sentence order rule.
   */
  reorderSentence(translatedTokens: TranslatedToken[], parsedTokens: ParsedToken[]): TranslatedToken[] {
    // Group tokens by role
    const subjectTokens: TranslatedToken[] = [];
    const verbTokens: TranslatedToken[] = [];
    const objectTokens: TranslatedToken[] = [];
    const otherTokens: TranslatedToken[] = [];

    for (let i = 0; i < translatedTokens.length; i++) {
      const parsed = parsedTokens[i];
      const translated = translatedTokens[i];

      if (!parsed || !translated) continue;

      if (parsed.role === 'subject') subjectTokens.push(translated);
      else if (parsed.role === 'verb') verbTokens.push(translated);
      else if (parsed.role === 'object') objectTokens.push(translated);
      else otherTokens.push(translated);
    }

    // Apply sentence order
    const S = subjectTokens;
    const V = verbTokens;
    const O = objectTokens;

    let ordered: TranslatedToken[];
    switch (this.config.sentenceOrder) {
      case 'SOV': ordered = [...S, ...O, ...V]; break;
      case 'VSO': ordered = [...V, ...S, ...O]; break;
      case 'VOS': ordered = [...V, ...O, ...S]; break;
      case 'OVS': ordered = [...O, ...V, ...S]; break;
      case 'OSV': ordered = [...O, ...S, ...V]; break;
      case 'SVO': default: ordered = [...S, ...V, ...O]; break;
    }

    // Append other tokens (prepositions, conjunctions, etc.) at the end
    return [...ordered, ...otherTokens];
  }

  /**
   * STEP 5: The full translation pipeline.
   * 
   * Returns a TranslationResult. If there are missing words, 
   * the caller is responsible for asking the AI to invent them
   * and then calling translate() again.
   */
  translate(sentence: string, additionalWords?: DictionaryWord[]): TranslationResult {
    // Register any additional words (e.g. freshly invented by AI)
    if (additionalWords) {
      for (const w of additionalWords) {
        this.dictionary.set(w.translation.toLowerCase().trim(), w);
      }
    }

    // Step 1: Parse English
    const tokens = this.parseEnglish(sentence);

    // Step 2: Dictionary lookup
    const { found, missing } = this.lookupTokens(tokens);

    // If words are missing, return early so the caller can ask AI
    if (missing.length > 0) {
      return {
        translatedSentence: '',
        literalBreakdown: '',
        missingWords: missing,
        tokensUsed: [],
      };
    }

    // Step 3: Translate each token
    const translatedTokens: TranslatedToken[] = [];
    const literalParts: string[] = [];

    for (const token of tokens) {
      // Skip articles if the language doesn't use them
      if (token.isArticle && !this.config.articles) {
        continue;
      }

      const key = token.root.toLowerCase();
      const dictEntry = found.get(key) || this.dictionary.get(key);

      if (dictEntry) {
        const { result, applied } = this.applyMorphology(dictEntry.word, token);
        translatedTokens.push({
          english: token.text,
          conlang: result,
          wasInDictionary: true,
          morphologyApplied: applied,
        });
        literalParts.push(`${token.text}→${result}`);
      } else if (token.isArticle || token.isPreposition || token.isConjunction) {
        // Functional words: check dictionary, otherwise skip or transliterate
        const funcEntry = this.dictionary.get(key);
        if (funcEntry) {
          translatedTokens.push({
            english: token.text,
            conlang: funcEntry.word,
            wasInDictionary: true,
            morphologyApplied: [],
          });
          literalParts.push(`${token.text}→${funcEntry.word}`);
        }
        // If not in dictionary, silently skip (functional words are optional in many conlangs)
      }
    }

    // Step 4: Reorder
    const reordered = this.reorderSentence(translatedTokens, tokens);

    // Step 5: Build final sentence
    const translatedSentence = reordered.map(t => t.conlang).join(' ');
    const literalBreakdown = literalParts.join(' | ');

    return {
      translatedSentence,
      literalBreakdown,
      missingWords: [],
      tokensUsed: reordered,
    };
  }
}
