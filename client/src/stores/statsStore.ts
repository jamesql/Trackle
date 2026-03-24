/** Player statistics store — persisted to localStorage. Tracks games, wins, streaks, and distribution. */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: [number, number, number, number, number, number];
  lastPlayedDaily: string | null;
}

interface StatsState extends PlayerStats {
  recordResult: (mode: string, won: boolean, attemptNumber: number) => void;
  hasPlayedToday: () => boolean;
}

const today = () => new Date().toISOString().slice(0, 10);

export const useStatsStore = create<StatsState>()(
  persist(
    (set, get) => ({
      gamesPlayed: 0,
      gamesWon: 0,
      currentStreak: 0,
      maxStreak: 0,
      guessDistribution: [0, 0, 0, 0, 0, 0],
      lastPlayedDaily: null,

      recordResult: (mode: string, won: boolean, attemptNumber: number) => {
        const state = get();
        const newGamesPlayed = state.gamesPlayed + 1;
        const newGamesWon = won ? state.gamesWon + 1 : state.gamesWon;

        let newStreak = state.currentStreak;
        if (won) {
          newStreak += 1;
        } else {
          newStreak = 0;
        }

        const newMaxStreak = Math.max(state.maxStreak, newStreak);

        const newDistribution = [...state.guessDistribution] as [number, number, number, number, number, number];
        if (won && attemptNumber >= 1 && attemptNumber <= 6) {
          newDistribution[attemptNumber - 1] += 1;
        }

        set({
          gamesPlayed: newGamesPlayed,
          gamesWon: newGamesWon,
          currentStreak: newStreak,
          maxStreak: newMaxStreak,
          guessDistribution: newDistribution,
          lastPlayedDaily: mode === 'daily' ? today() : state.lastPlayedDaily,
        });
      },

      hasPlayedToday: () => {
        return get().lastPlayedDaily === today();
      },
    }),
    {
      name: 'trackle-stats',
    }
  )
);
