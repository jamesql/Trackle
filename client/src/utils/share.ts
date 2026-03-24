/** Generates a shareable emoji grid + copies it to clipboard. */
import type { GuessEntry } from '../stores/gameStore';

export function generateShareText(
  gameId: string,
  guesses: GuessEntry[],
  won: boolean
): string {
  const maxAttempts = 6;
  const score = won ? `${guesses.length}/${maxAttempts}` : `X/${maxAttempts}`;

  const grid = Array.from({ length: maxAttempts }, (_, i) => {
    const entry = guesses[i];
    if (!entry) return '\u2B1B'; // ⬛ unused
    if (entry.type === 'skipped') return '\u2B1C'; // ⬜ skipped
    if (entry.type === 'wrong') return '\uD83D\uDFE5'; // 🟥 wrong
    return '\uD83D\uDFE9'; // 🟩 correct
  }).join('');

  const lines = [
    `🎧 Trackle ${score}`,
    '',
    grid,
    '',
    `#Trackle #${gameId}`,
    `${window.location.origin}`,
  ];

  return lines.join('\n');
}

export async function copyShareText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
