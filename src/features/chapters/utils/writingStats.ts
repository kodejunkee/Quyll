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

/** Format a timestamp into a relative time string (e.g. "12m ago"). */
export function formatTimeAgo(timestamp: string | null | undefined): string {
  if (!timestamp) return 'recently';
  let normalized = timestamp;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) {
    normalized = normalized.replace(' ', 'T') + 'Z';
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(normalized)) {
    normalized = normalized + 'Z';
  }
  const date = new Date(normalized);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1 || diffMs < 60000) return 'just now';
  if (diffMins === 1) return '1m ago';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return '1h ago';
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return '1d ago';
  return `${diffDays}d ago`;
}
