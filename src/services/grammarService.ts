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

import { LocalLinter } from 'harper.js';
import { binaryInlined } from 'harper.js/binaryInlined';

let harperLinter: LocalLinter | null = null;
let initializing = false;

async function getLinter(): Promise<LocalLinter> {
  if (harperLinter) return harperLinter;
  if (initializing) {
    // wait for it
    while (!harperLinter) {
      await new Promise(r => setTimeout(r, 50));
    }
    return harperLinter;
  }
  initializing = true;
  harperLinter = new LocalLinter({ binary: binaryInlined });
  initializing = false;
  return harperLinter;
}

/**
 * Checks text for grammar mistakes and duplicate words using harper.js.
 * Every issue returned has an actionable suggestion/correction.
 */
export async function checkGrammar(text: string): Promise<GrammarIssue[]> {
  if (!text || !text.trim()) return [];

  const issues: GrammarIssue[] = [];
  let idCounter = 1;

  try {
    const linter = await getLinter();
    const lints = await linter.lint(text);

    for (const lint of lints) {
      const msg = lint.message();
      const span = lint.span();
      const sugs = lint.suggestions();
      const kind = lint.lint_kind();
      
      const startOffset = span.start;
      const endOffset = span.end;
      const matchText = text.substring(startOffset, endOffset);
      const suggestion = sugs && sugs.length > 0 ? sugs[0]?.get_replacement_text() : undefined;
      
      // Determine severity based on kind, everything is a warning by default for UI simplicity
      let severity: GrammarSeverity = 'warning';
      if (kind === 'Error' || kind === 'Spelling') {
        severity = 'error';
      }

      issues.push({
        id: `grammar-${idCounter++}-${startOffset}`,
        type: 'grammar',
        severity,
        message: msg,
        suggestion,
        matchText,
        startOffset,
        endOffset,
      });
    }

  } catch (err) {
    console.error('Error running Harper grammar check:', err);
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
