/**
 * Normalize a song title or artist name for comparison.
 * Strips parentheticals, brackets, suffixes like "- Radio Edit",
 * punctuation, and extra whitespace.
 */
export function normalizeString(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/ - .*/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
