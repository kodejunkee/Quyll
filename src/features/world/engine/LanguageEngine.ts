import nlp from 'compromise';
import type { LanguageGrammarConfig } from './LanguageGrammarConfig';

export interface DictionaryWord {
  word: string;
  translation: string;
  part_of_speech: string;
}

export interface TranslationResult {
  translatedSentence: string;
  literalBreakdown: string;
  missingWords: string[];
  tokensUsed: TranslatedToken[];
}

export interface TranslatedToken {
  english: string;
  conlang: string;
  wasInDictionary: boolean;
  morphologyApplied: string[];
}

interface ParsedToken {
  text: string;
  normal: string;
  tags: Set<string>;
  punctuationBefore: string;
  punctuationAfter: string;
}

interface Phrase {
  type: 'NP' | 'VP' | 'PP' | 'CONJ' | 'OTHER';
  role: 'subject' | 'object' | 'verb' | 'prep' | 'conj' | 'none';
  tokens: ParsedToken[];
}

export class LanguageEngine {
  private config: LanguageGrammarConfig;
  private dictionary: Map<string, DictionaryWord>;
  // @ts-ignore — reserved for future use (language name preservation in output)
  private _languageName: string;
  private missingWordsSet: Set<string>;

  constructor(config: LanguageGrammarConfig, dictionaryEntries: DictionaryWord[], languageName: string = 'Conlang') {
    this.config = config;
    this._languageName = languageName;
    this.dictionary = new Map();
    this.missingWordsSet = new Set();

    dictionaryEntries.forEach(entry => {
      const key = (entry.translation || '').toLowerCase().trim();
      if (key) this.dictionary.set(key, entry);
    });
  }

  public translate(sentence: string, additionalWords?: DictionaryWord[]): TranslationResult {
    this.missingWordsSet.clear();
    const tempDictionary = new Map(this.dictionary);
    if (additionalWords) {
      additionalWords.forEach(entry => {
        const key = (entry.translation || '').toLowerCase().trim();
        if (key) tempDictionary.set(key, entry);
      });
    }

    const doc = nlp(sentence);
    // Split by clauses based on conjunctions and punctuation
    // Compromise .clauses() can do this, but we'll do a simple split keeping conjunctions
    const clauses: Phrase[][] = this.parseClauses(doc);

    let finalConlangTokens: string[] = [];
    let literalBreakdown: string[] = [];
    let tokensUsed: TranslatedToken[] = [];

    for (const clause of clauses) {
      // Reorder phrase
      const reordered = this.reorderPhrases(clause);

      for (const phrase of reordered) {
        // Within phrase, handle adjective positions and morphology
        const translatedPhrase = this.translatePhrase(phrase, tempDictionary);
        
        translatedPhrase.forEach(tp => {
          finalConlangTokens.push(tp.conlangWithPunctuation);
          literalBreakdown.push(tp.literal);
          if (tp.tokenUsed) {
            tokensUsed.push(tp.tokenUsed);
          }
        });
      }
    }

    // Capitalize first letter of sentence and after ending punctuation
    const translatedSentence = this.formatSentence(finalConlangTokens);

    return {
      translatedSentence,
      literalBreakdown: literalBreakdown.join(' '),
      missingWords: Array.from(this.missingWordsSet),
      tokensUsed
    };
  }

  private parseClauses(doc: any): Phrase[][] {
    const rawTerms = doc.terms().json();
    // Compromise v14 nests term data: each element has { text, terms: [{ text, normal, tags, pre, post }] }
    // Flatten to get the actual term objects
    const terms: any[] = [];
    for (const wrapper of rawTerms) {
      if (wrapper.terms && Array.isArray(wrapper.terms)) {
        for (const t of wrapper.terms) {
          terms.push(t);
        }
      } else {
        // Fallback: treat the wrapper itself as a term
        terms.push(wrapper);
      }
    }

    let currentClause: ParsedToken[] = [];
    const clauses: ParsedToken[][] = [];

    for (let i = 0; i < terms.length; i++) {
      const t = terms[i];
      const text = t.text || '';
      const normal = t.normal || text.toLowerCase();
      const tags = new Set<string>(Array.isArray(t.tags) ? t.tags : []);
      const prePunct = t.pre || '';
      const postPunct = t.post || '';

      const token: ParsedToken = { text, normal, tags, punctuationBefore: prePunct, punctuationAfter: postPunct };
      
      if (tags.has('Conjunction') && currentClause.length > 0) {
        // Conjunction starts a new clause or sits between
        clauses.push(currentClause);
        currentClause = [token];
      } else {
        currentClause.push(token);
        // If punctuation implies clause end
        if (postPunct.includes(',') || postPunct.includes(';') || postPunct.includes('.') || postPunct.includes('!') || postPunct.includes('?')) {
          if (i < terms.length - 1 && currentClause.length > 0) {
             clauses.push(currentClause);
             currentClause = [];
          }
        }
      }
    }
    if (currentClause.length > 0) {
      clauses.push(currentClause);
    }

    return clauses.map(c => this.chunkIntoPhrases(c));
  }

  private chunkIntoPhrases(clause: ParsedToken[]): Phrase[] {
    const phrases: Phrase[] = [];
    let currentPhrase: ParsedToken[] = [];
    let currentType: 'NP' | 'VP' | 'PP' | 'CONJ' | 'OTHER' | null = null;

    let hasSeenVerb = false;

    const flush = (type: 'NP' | 'VP' | 'PP' | 'CONJ' | 'OTHER', role: 'subject' | 'object' | 'verb' | 'prep' | 'conj' | 'none') => {
      if (currentPhrase.length > 0) {
        phrases.push({ type, role, tokens: [...currentPhrase] });
        currentPhrase = [];
      }
    };

    for (let i = 0; i < clause.length; i++) {
      const token = clause[i]!;
      const tags = token.tags;

      if (tags.has('Conjunction')) {
        flush(currentType || 'OTHER', currentType === 'VP' ? 'verb' : 'none');
        phrases.push({ type: 'CONJ', role: 'conj', tokens: [token] });
        currentType = null;
        continue;
      }

      if (tags.has('Preposition')) {
        flush(currentType || 'OTHER', currentType === 'VP' ? 'verb' : (hasSeenVerb ? 'object' : 'subject'));
        currentType = 'PP';
        currentPhrase.push(token);
        continue;
      }

      if (tags.has('Verb') || tags.has('Adverb') || tags.has('Auxiliary')) {
        if (currentType !== 'VP') {
           flush(currentType || 'OTHER', currentType === 'PP' ? 'prep' : (hasSeenVerb ? 'object' : 'subject'));
           currentType = 'VP';
        }
        currentPhrase.push(token);
        if (tags.has('Verb')) hasSeenVerb = true;
        continue;
      }

      if (tags.has('Noun') || tags.has('Pronoun') || tags.has('Determiner') || tags.has('Adjective')) {
        if (currentType !== 'NP' && currentType !== 'PP') {
           flush(currentType || 'OTHER', currentType === 'VP' ? 'verb' : 'none');
           currentType = 'NP';
        }
        currentPhrase.push(token);
        continue;
      }

      // Other
      if (currentType === null) currentType = 'OTHER';
      currentPhrase.push(token);
    }

    if (currentPhrase.length > 0) {
      let role: any = 'none';
      if (currentType === 'VP') role = 'verb';
      else if (currentType === 'PP') role = 'prep';
      else if (currentType === 'NP') role = hasSeenVerb ? 'object' : 'subject';
      flush(currentType || 'OTHER', role);
    }

    return phrases;
  }

  private reorderPhrases(phrases: Phrase[]): Phrase[] {
    const subjects = phrases.filter(p => p.role === 'subject');
    const objects = phrases.filter(p => p.role === 'object');
    const verbs = phrases.filter(p => p.role === 'verb');
    const others = phrases.filter(p => p.role !== 'subject' && p.role !== 'object' && p.role !== 'verb');

    const order = this.config.sentenceOrder || 'SVO';
    let reordered: Phrase[] = [];

    // Simple implementation of SOV, SVO, etc.
    const place = (char: string) => {
      if (char === 'S') reordered.push(...subjects);
      if (char === 'V') reordered.push(...verbs);
      if (char === 'O') reordered.push(...objects);
    };

    if (order.includes('S') && order.includes('V') && order.includes('O')) {
      for (const char of order) {
        place(char);
      }
    } else {
      reordered.push(...subjects, ...verbs, ...objects);
    }

    // Mix in others (Conjunctions at start usually, PPs at end)
    const conjs = others.filter(p => p.type === 'CONJ');
    const rest = others.filter(p => p.type !== 'CONJ');

    return [...conjs, ...reordered, ...rest];
  }

  private translatePhrase(phrase: Phrase, dictionary: Map<string, DictionaryWord>): any[] {
    let result: any[] = [];
    const tokens = phrase.tokens;

    // Phrase-level analysis
    let mainNoun: ParsedToken | null = null;
    
    for (const t of tokens) {
      if (t.tags.has('Noun') || t.tags.has('Pronoun')) mainNoun = t;
    }

    let subjectPerson = '3sg';
    if (phrase.role === 'subject' && mainNoun) {
      if (mainNoun.normal === 'i') subjectPerson = '1sg';
      else if (mainNoun.normal === 'you') subjectPerson = '2sg';
      else if (mainNoun.normal === 'we') subjectPerson = '1pl';
      else if (mainNoun.normal === 'they') subjectPerson = '3pl';
      else if (mainNoun.tags.has('Plural')) subjectPerson = '3pl';
    }

    // Adjective reordering
    let adjectives: ParsedToken[] = [];
    let determiners: ParsedToken[] = [];
    let nouns: ParsedToken[] = [];
    let restTokens: ParsedToken[] = [];

    if (phrase.type === 'NP' || phrase.type === 'PP') {
      tokens.forEach(t => {
        if (t.tags.has('Adjective')) adjectives.push(t);
        else if (t.tags.has('Determiner')) determiners.push(t);
        else if (t.tags.has('Noun') || t.tags.has('Pronoun')) nouns.push(t);
        else restTokens.push(t);
      });
    }

    const reorderedTokens: ParsedToken[] = [];
    if ((phrase.type === 'NP' || phrase.type === 'PP') && nouns.length > 0) {
      reorderedTokens.push(...restTokens);
      if (!this.config.articles) {
        determiners = determiners.filter(d => !['the', 'a', 'an'].includes(d.normal));
      }
      reorderedTokens.push(...determiners);
      if (this.config.adjectivePosition === 'after_noun') {
        reorderedTokens.push(...nouns, ...adjectives);
      } else {
        reorderedTokens.push(...adjectives, ...nouns);
      }
    } else {
      reorderedTokens.push(...tokens);
    }

    for (let i = 0; i < reorderedTokens.length; i++) {
      const t = reorderedTokens[i]!;
      let wordToLookUp = t.normal;

      let dictEntry = dictionary.get(wordToLookUp);
      let translatedWord = wordToLookUp;
      let wasInDictionary = false;

      if (dictEntry) {
        translatedWord = dictEntry.word;
        wasInDictionary = true;
      } else {
        // Stemming fallback
        if (t.tags.has('Plural') && wordToLookUp.endsWith('s')) {
          let singular = wordToLookUp.slice(0, -1);
          dictEntry = dictionary.get(singular);
          if (dictEntry) {
            translatedWord = dictEntry.word;
            wasInDictionary = true;
          }
        }
        // Past tense fallback
        if (t.tags.has('PastTense') && wordToLookUp.endsWith('ed')) {
          let present = wordToLookUp.slice(0, -2);
          dictEntry = dictionary.get(present);
          if (!dictEntry) dictEntry = dictionary.get(present + 'e');
          if (dictEntry) {
            translatedWord = dictEntry.word;
            wasInDictionary = true;
          }
        }

        if (!wasInDictionary) {
          // Check for functional words that should be logged
          if (['Preposition', 'Conjunction', 'Pronoun', 'Modal'].some(tag => t.tags.has(tag)) || !this.isIgnorable(t)) {
            this.missingWordsSet.add(wordToLookUp);
          }
          // Pass-through unrecognized words
          translatedWord = wordToLookUp;
        }
      }

      // Morphology
      let morphsApplied: string[] = [];
      let prefix = '';
      let suffix = '';
      let separateParticlesBefore: string[] = [];
      let separateParticlesAfter: string[] = [];

      // Noun Cases
      if (this.config.nounCases?.enabled && (t.tags.has('Noun') || t.tags.has('Pronoun'))) {
        if (phrase.role === 'subject') {
          suffix += this.config.nounCases.nominative;
          morphsApplied.push('nominative');
        } else if (phrase.role === 'object') {
          suffix += this.config.nounCases.accusative;
          morphsApplied.push('accusative');
        } else if (phrase.role === 'prep') { // Approximating locative for PP objects
          suffix += this.config.nounCases.locative;
          morphsApplied.push('locative');
        }
      }

      // Plural
      if (t.tags.has('Plural') && !t.tags.has('Pronoun')) { // Avoid double-pluralizing pronouns if not intended
        this.applyAffix(this.config.pluralStyle, this.config.pluralAffix, 
          (p) => prefix = p + prefix, (s) => suffix += s, 
          (p) => separateParticlesBefore.push(p), (p) => separateParticlesAfter.push(p));
        morphsApplied.push('plural');
      }

      // Verb Conjugation and Aspect
      if (t.tags.has('Verb') && !t.tags.has('Auxiliary')) {
        // Conjugation
        if (this.config.verbConjugation?.enabled) {
          let conj = '';
          switch (subjectPerson) {
            case '1sg': conj = this.config.verbConjugation.firstSingular; break;
            case '2sg': conj = this.config.verbConjugation.secondSingular; break;
            case '3sg': conj = this.config.verbConjugation.thirdSingular; break;
            case '1pl': conj = this.config.verbConjugation.firstPlural; break;
            case '3pl': conj = this.config.verbConjugation.thirdPlural; break;
          }
          suffix += conj;
          morphsApplied.push('conjugation');
        }

        // Tense/Aspect
        if (t.tags.has('PastTense')) {
          this.applyAffix(this.config.pastTenseStyle, this.config.pastTenseAffix,
             (p) => prefix = p + prefix, (s) => suffix += s,
             (p) => separateParticlesBefore.push(p), (p) => separateParticlesAfter.push(p));
          morphsApplied.push('past');
          
          if (this.config.verbAspect?.enabled) {
            this.applyAffix(this.config.verbAspect.perfectiveStyle as any, this.config.verbAspect.perfectiveAffix,
              (p) => prefix = p + prefix, (s) => suffix += s,
              (p) => separateParticlesBefore.push(p), (p) => separateParticlesAfter.push(p));
            morphsApplied.push('perfective');
          }
        } else if (t.tags.has('PresentTense')) {
          this.applyAffix(this.config.presentTenseStyle, this.config.presentTenseAffix,
             (p) => prefix = p + prefix, (s) => suffix += s,
             (p) => separateParticlesBefore.push(p), (p) => separateParticlesAfter.push(p));
          morphsApplied.push('present');
        } else if (t.tags.has('Gerund')) { // continuous
          if (this.config.verbAspect?.enabled) {
            this.applyAffix(this.config.verbAspect.imperfectiveStyle as any, this.config.verbAspect.imperfectiveAffix,
              (p) => prefix = p + prefix, (s) => suffix += s,
              (p) => separateParticlesBefore.push(p), (p) => separateParticlesAfter.push(p));
            morphsApplied.push('imperfective');
          }
        }

        // Mood
        if (this.config.verbMood?.enabled) {
          // Heuristics for mood
          if (phrase.role === 'verb' && !phrase.tokens.some(pt => pt.tags.has('Subject'))) {
             // Imperative heuristic
             this.applyAffix(this.config.verbMood.imperativeStyle as any, this.config.verbMood.imperativeAffix,
              (p) => prefix = p + prefix, (s) => suffix += s,
              (p) => separateParticlesBefore.push(p), (p) => separateParticlesAfter.push(p));
             morphsApplied.push('imperative');
          }
        }
      }

      const finalWord = `${prefix}${translatedWord}${suffix}`;
      
      let outTokens = [];
      if (separateParticlesBefore.length > 0) outTokens.push(...separateParticlesBefore);
      outTokens.push(finalWord);
      if (separateParticlesAfter.length > 0) outTokens.push(...separateParticlesAfter);

      let conlangStr = outTokens.join(' ');
      
      const conlangWithPunctuation = `${t.punctuationBefore}${conlangStr}${t.punctuationAfter}`;
      
      result.push({
        conlangWithPunctuation,
        literal: `${t.text}[${finalWord}]`,
        tokenUsed: {
          english: t.text,
          conlang: conlangStr,
          wasInDictionary,
          morphologyApplied: morphsApplied
        }
      });
    }

    return result;
  }

  private isIgnorable(t: ParsedToken): boolean {
    if (t.tags.has('Punctuation')) return true;
    if (['a', 'an', 'the'].includes(t.normal) && !this.config.articles) return true;
    return false;
  }

  private applyAffix(style: string, affix: string, addPrefix: (s:string)=>void, addSuffix: (s:string)=>void, addSepBefore: (s:string)=>void, _addSepAfter: (s:string)=>void) {
    if (!affix) return;
    switch(style) {
      case 'prefix': addPrefix(affix); break;
      case 'suffix': addSuffix(affix); break;
      case 'separate_particle': addSepBefore(affix); break; // Defaulting to before for particles, can be enhanced
    }
  }

  private formatSentence(tokens: string[]): string {
    let result = '';
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i]!;
      if (i > 0 && !t.match(/^[.,!?;:]/)) {
        // Only add space if previous didn't end with spacing punctuation, though compromise pre/post mostly handles it.
        // Actually compromise's postPunct often includes the space.
        // Let's just concatenate them as pre/post has spaces if they were in the original string.
      }
      result += t;
    }
    // Clean up multiple spaces and capitalize
    result = result.replace(/\s+/g, ' ').trim();
    if (result.length > 0) {
      result = result.charAt(0).toUpperCase() + result.slice(1);
    }
    return result;
  }
}
