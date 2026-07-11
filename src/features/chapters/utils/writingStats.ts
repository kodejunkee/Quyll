/**
 * Writing statistics utilities.
 * Pure functions for computing word count, character count, etc.
 */

const AVERAGE_READING_WPM = 238;

/** Count words in a plain text string. */
export function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

/** Count characters in a plain text string. */
export function countCharacters(text: string, includeSpaces = true): number {
  if (!text) return 0;
  return includeSpaces ? text.length : text.replace(/\s/g, '').length;
}

/** Count paragraphs in a plain text string. */
export function countParagraphs(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length;
}

/** Estimate reading time in minutes from word count. */
export function estimateReadingTime(wordCount: number): number {
  if (wordCount <= 0) return 0;
  return Math.max(1, Math.ceil(wordCount / AVERAGE_READING_WPM));
}

/** Format a number with locale-aware thousands separators. */
export function formatNumber(n: number): string {
  return n.toLocaleString();
}

/** Format reading time for display. */
export function formatReadingTime(minutes: number): string {
  if (minutes < 1) return '< 1 min';
  if (minutes === 1) return '1 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (remainingMins === 0) return `${hours} hr`;
  return `${hours} hr ${remainingMins} min`;
}
