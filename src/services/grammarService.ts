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

let worker: Worker | null = null;
let reqCounter = 0;
const pendingRequests = new Map<number, { resolve: (val: any) => void, reject: (err: any) => void }>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./harperWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      const { type, reqId, results, error } = e.data;
      if (type === 'LINT_DONE') {
        const p = pendingRequests.get(reqId);
        if (p) {
          p.resolve(results);
          pendingRequests.delete(reqId);
        }
      } else if (type === 'LINT_ERROR') {
        const p = pendingRequests.get(reqId);
        if (p) {
          p.reject(new Error(error));
          pendingRequests.delete(reqId);
        }
      }
    };
    worker.onerror = (e) => {
      console.error('Harper Web Worker error:', e.message || e);
      for (const [reqId, p] of pendingRequests.entries()) {
        p.reject(new Error('Worker error: ' + (e.message || 'Unknown error')));
      }
      pendingRequests.clear();
    };
  }
  return worker;
}

import { invoke } from '@tauri-apps/api/core';

export interface GrammarCheckOptions {
  useAIGrammar: boolean;
  isProUser: boolean;
}

/**
 * Checks text for grammar mistakes and duplicate words using harper.js in a Web Worker,
 * or using the local AI model if the user is a Pro subscriber and has AI enabled.
 */
export async function checkGrammar(text: string, options?: GrammarCheckOptions): Promise<GrammarIssue[]> {
  if (!text || !text.trim()) return [];

  if (options?.useAIGrammar && options?.isProUser) {
    return checkGrammarAI(text);
  }

  const w = getWorker();
  const reqId = ++reqCounter;

  try {
    const lints: any[] = await new Promise((resolve, reject) => {
      pendingRequests.set(reqId, { resolve, reject });
      w.postMessage({ type: 'LINT', text, reqId });
    });

    const issues: GrammarIssue[] = [];
    let idCounter = 1;

    for (const lint of lints) {
      const { message, startOffset, endOffset, kind, suggestion } = lint;
      const matchText = text.substring(startOffset, endOffset);
      
      let severity: GrammarSeverity = 'warning';
      if (kind === 'Error' || kind === 'Spelling') {
        severity = 'error';
      }

      issues.push({
        id: `grammar-${idCounter++}-${startOffset}`,
        type: 'grammar',
        severity,
        message,
        suggestion,
        matchText,
        startOffset,
        endOffset,
      });
    }

    issues.sort((a, b) => a.startOffset - b.startOffset);
    return issues;
  } catch (err) {
    console.error('Error running Harper grammar check in worker:', err);
    return [];
  }
}

async function checkGrammarAI(text: string): Promise<GrammarIssue[]> {
  try {
    // In a real app we would stream this or expect a JSON response from the local model.
    // We are mocking the Rust command response here.
    const prompt = `Find grammar errors in this text and return them as JSON: ${text}`;
    
    // We'd use a dedicated 'generate_text' command that waits for full completion rather than streaming for programmatic JSON,
    // or we collect the stream here. For now, returning mock issues.
    
    return [
      {
        id: `ai-grammar-1`,
        type: 'grammar',
        severity: 'style',
        message: 'This is an AI suggested rewrite for better flow.',
        suggestion: 'Consider rewriting this section.',
        matchText: text.substring(0, Math.min(20, text.length)),
        startOffset: 0,
        endOffset: Math.min(20, text.length),
      }
    ];
  } catch (e) {
    console.error('AI Grammar check failed:', e);
    return [];
  }
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
