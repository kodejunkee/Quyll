export type GrammarIssueType = 'grammar' | 'duplicate' | 'wordy' | 'passive' | 'weasel' | 'cliche' | 'readability';
export type GrammarSeverity = 'error' | 'warning' | 'style';

export interface GrammarIssue {
  id: string;
  type: GrammarIssueType;
  severity: GrammarSeverity;
  message: string;
  suggestion?: string;
  matchText: string;
  startOffset: number;
  endOffset: number;
}

interface GrammarRule {
  pattern: RegExp;
  type: GrammarIssueType;
  severity: GrammarSeverity;
  message: (match: RegExpExecArray) => string;
  suggestion?: (match: RegExpExecArray) => string | undefined;
}

// Common grammar mistakes and homophones
const GRAMMAR_RULES: GrammarRule[] = [
  {
    pattern: /\b(should|could|would|must|might)\s+of\b/gi,
    type: 'grammar',
    severity: 'error',
    message: (m) => `Incorrect grammar "${m[0] || ''}". Use "${(m[1] || '').toLowerCase()} have".`,
    suggestion: (m) => `${matchCase(m[1], m[1] || '')} have`,
  },
  {
    pattern: /\byour\s+welcome\b/gi,
    type: 'grammar',
    severity: 'error',
    message: () => `Did you mean "you're welcome"?`,
    suggestion: () => `you're welcome`,
  },
  {
    pattern: /\btheir\s+(is|are|was|were|has|have|had|been|will|would|can|could|should)\b/gi,
    type: 'grammar',
    severity: 'error',
    message: (m) => `Did you mean "there ${(m[1] || '').toLowerCase()}"?`,
    suggestion: (m) => `there ${(m[1] || '').toLowerCase()}`,
  },
  {
    pattern: /\b(there|they're)\s+(car|house|book|story|character|eyes|hands|face|sword|wand|bag|voice|words|life|time|name|father|mother|brother|sister|friend|home|room)\b/gi,
    type: 'grammar',
    severity: 'error',
    message: (m) => `Did you mean "their ${(m[2] || '').toLowerCase()}" (possessive)?`,
    suggestion: (m) => `their ${m[2] || ''}`,
  },
  {
    pattern: /\bits\s+a\b/gi,
    type: 'grammar',
    severity: 'error',
    message: () => `Did you mean "it's a" (it is a)?`,
    suggestion: () => `it's a`,
  },
  {
    pattern: /\b(to)\s+(much|many|fast|slow|big|small|late|early|hard|easy|good|bad|high|low|far|close)\b/gi,
    type: 'grammar',
    severity: 'error',
    message: (m) => `Did you mean "too ${(m[2] || '').toLowerCase()}" (meaning excessively)?`,
    suggestion: (m) => `too ${m[2] || ''}`,
  },
  {
    pattern: /\bsuppose\s+to\b/gi,
    type: 'grammar',
    severity: 'error',
    message: () => `Grammatical error: use "supposed to".`,
    suggestion: () => `supposed to`,
  },
  {
    pattern: /\buse\s+to\s+be\b/gi,
    type: 'grammar',
    severity: 'error',
    message: () => `Grammatical error: use "used to be".`,
    suggestion: () => `used to be`,
  },
  {
    pattern: /\balot\b/gi,
    type: 'grammar',
    severity: 'error',
    message: () => `"alot" is not a word. Use "a lot".`,
    suggestion: () => `a lot`,
  },
  {
    pattern: /\bin\s+tact\b/gi,
    type: 'grammar',
    severity: 'error',
    message: () => `Did you mean "intact"?`,
    suggestion: () => `intact`,
  },
  {
    pattern: /\bfor\s+all\s+intensive\s+purposes\b/gi,
    type: 'grammar',
    severity: 'error',
    message: () => `Common mistake: the phrase is "for all intents and purposes".`,
    suggestion: () => `for all intents and purposes`,
  },
  {
    pattern: /\bone\s+in\s+the\s+same\b/gi,
    type: 'grammar',
    severity: 'error',
    message: () => `Common mistake: the phrase is "one and the same".`,
    suggestion: () => `one and the same`,
  },
  {
    pattern: /\birregardless\b/gi,
    type: 'grammar',
    severity: 'warning',
    message: () => `"irregardless" is nonstandard. Use "regardless".`,
    suggestion: () => `regardless`,
  },
];

// Duplicate words (e.g. "the the", "and and", "to to")
const DUPLICATE_RULE: GrammarRule = {
  pattern: /\b([a-z]+)\s+\1\b/gi,
  type: 'duplicate',
  severity: 'error',
  message: (m) => `Duplicate word "${m[1] || ''}".`,
  suggestion: (m) => m[1] || '',
};

function matchCase(source?: string, target?: string): string {
  if (!target) return '';
  if (!source) return target;

  if (source.toUpperCase() === source && source.toLowerCase() !== source) {
    return target.toUpperCase();
  }
  if (source[0] && source[0].toUpperCase() === source[0] && source[0].toLowerCase() !== source[0]) {
    return target.charAt(0).toUpperCase() + target.slice(1);
  }
  return target;
}

/**
 * Checks text for grammar mistakes and duplicate words.
 * Every issue returned has an actionable suggestion/correction.
 */
export function checkGrammar(text: string): GrammarIssue[] {
  if (!text || !text.trim()) return [];

  const issues: GrammarIssue[] = [];
  let idCounter = 1;

  const allRules: GrammarRule[] = [
    ...GRAMMAR_RULES,
    DUPLICATE_RULE,
  ];

  for (const rule of allRules) {
    rule.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = rule.pattern.exec(text)) !== null) {
      const matchText = match[0] || '';
      const startOffset = match.index;
      const endOffset = startOffset + matchText.length;

      // Avoid overlapping duplicates
      const isOverlapping = issues.some(i => 
        (startOffset >= i.startOffset && startOffset < i.endOffset) ||
        (endOffset > i.startOffset && endOffset <= i.endOffset)
      );

      if (!isOverlapping) {
        let sug = rule.suggestion ? rule.suggestion(match) : undefined;
        if (sug && matchText && matchText[0] && matchText[0].toUpperCase() === matchText[0] && matchText[0].toLowerCase() !== matchText[0]) {
          sug = matchCase(matchText, sug);
        }

        issues.push({
          id: `grammar-${idCounter++}-${startOffset}`,
          type: rule.type,
          severity: rule.severity,
          message: rule.message(match),
          suggestion: sug,
          matchText,
          startOffset,
          endOffset,
        });
      }
    }
  }

  // Sort by start offset ascending
  issues.sort((a, b) => a.startOffset - b.startOffset);
  return issues;
}

/**
 * Given full text and a character offset, returns the surrounding sentence or paragraph boundaries.
 */
export function getSentenceAtOffset(fullText: string, offset: number): { sentence: string; start: number; end: number } | null {
  if (!fullText || offset < 0 || offset > fullText.length) return null;

  // Find start of sentence (after previous period/question/exclamation or start of string/newline)
  let start = offset;
  while (start > 0 && !/[.!?\n]/.test(fullText[start - 1] || '')) {
    start--;
  }
  while (start < fullText.length && /\s/.test(fullText[start] || '')) {
    start++;
  }

  // Find end of sentence (at next period/question/exclamation or end of string/newline)
  let end = offset;
  while (end < fullText.length && !/[.!?\n]/.test(fullText[end] || '')) {
    end++;
  }
  if (end < fullText.length && /[.!?]/.test(fullText[end] || '')) {
    end++; // include the closing punctuation
  }

  if (end > start) {
    const sentence = fullText.slice(start, end);
    return { sentence, start, end };
  }
  return null;
}
