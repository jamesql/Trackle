/** Persists the daily game result to localStorage so it can be shown on revisit. */
import type { GuessEntry } from './gameStore';
import type { TrackSummary } from '../lib/api';

interface DailyResult {
  date: string;
  guesses: GuessEntry[];
  gameStatus: 'won' | 'lost';
  answer: TrackSummary | null;
  gameId: string;
}

const STORAGE_KEY = 'trackle-daily-result';

export function saveDailyResult(result: DailyResult): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
}

export function loadDailyResult(): DailyResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const result = JSON.parse(raw) as DailyResult;
    const today = new Date().toISOString().slice(0, 10);
    if (result.date !== today) return null;
    return result;
  } catch {
    return null;
  }
}
