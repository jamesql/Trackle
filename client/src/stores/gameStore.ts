/**
 * Game state store (Zustand). Manages the active game: mode, attempts, guesses,
 * audio URL, answer hash, and game status. Orchestrates all API calls.
 */
import { create } from 'zustand';
import {
  fetchDaily,
  fetchArtistGame,
  fetchPlaylistGame,
  validateGuess,
  revealAnswer,
  searchTracks as apiSearchTracks,
} from '../lib/api';
import type { TrackSummary, GamePayload } from '../lib/api';
import { useStatsStore } from './statsStore';
import { saveDailyResult, loadDailyResult } from './dailyResultStore';

export type GuessEntry =
  | { type: 'wrong'; track: TrackSummary }
  | { type: 'skipped' }
  | { type: 'correct'; track: TrackSummary };

interface GameState {
  mode: 'daily' | 'artist' | 'playlist';
  gameId: string | null;
  previewUrl: string | null;
  answerHash: string | null;
  clipDurations: number[];
  currentAttempt: number;
  guesses: GuessEntry[];
  gameStatus: 'idle' | 'loading' | 'playing' | 'won' | 'lost' | 'error';
  answer: TrackSummary | null;
  error: string | null;

  startDaily: () => Promise<void>;
  startArtistGame: (artistId: string) => Promise<void>;
  startPlaylistGame: (playlistId: string) => Promise<void>;
  submitGuess: (track: TrackSummary) => Promise<void>;
  skip: () => Promise<void>;
  resetGame: () => void;
  setMode: (mode: 'daily' | 'artist' | 'playlist') => void;
}

const MAX_ATTEMPTS = 6;

function applyPayload(payload: GamePayload): Partial<GameState> {
  return {
    gameId: payload.gameId,
    previewUrl: payload.previewUrl,
    clipDurations: payload.clipDurations,
    answerHash: payload.answerHash,
    currentAttempt: 0,
    guesses: [],
    gameStatus: 'playing',
    answer: null,
    error: null,
  };
}

function persistDailyIfNeeded(state: GameState) {
  if (state.mode === 'daily' && state.gameId && state.answer && (state.gameStatus === 'won' || state.gameStatus === 'lost')) {
    saveDailyResult({
      date: state.gameId,
      guesses: state.guesses,
      gameStatus: state.gameStatus,
      answer: state.answer,
      gameId: state.gameId,
    });
  }
}

export const useGameStore = create<GameState>((set, get) => ({
  mode: 'daily',
  gameId: null,
  previewUrl: null,
  answerHash: null,
  clipDurations: [1, 2, 4, 7, 11, 16],
  currentAttempt: 0,
  guesses: [],
  gameStatus: 'idle',
  answer: null,
  error: null,

  startDaily: async () => {
    if (useStatsStore.getState().hasPlayedToday()) {
      // Restore the previous result so the user can see it and share
      const saved = loadDailyResult();
      if (saved) {
        set({
          mode: 'daily',
          gameId: saved.gameId,
          guesses: saved.guesses,
          gameStatus: saved.gameStatus,
          answer: saved.answer,
          currentAttempt: saved.guesses.length,
          previewUrl: null,
          answerHash: null,
          error: null,
        });
        return;
      }
      set({ gameStatus: 'error', error: "You've already played today's daily challenge! Come back tomorrow." });
      return;
    }
    set({ gameStatus: 'loading', error: null });
    try {
      const payload = await fetchDaily();
      set(applyPayload(payload));
    } catch {
      set({ gameStatus: 'error', error: 'Failed to load daily challenge' });
    }
  },

  startArtistGame: async (artistId: string) => {
    set({ gameStatus: 'loading', error: null, mode: 'artist' });
    try {
      const payload = await fetchArtistGame(artistId);
      set(applyPayload(payload));
    } catch {
      set({ gameStatus: 'error', error: 'Failed to load artist game. Check the artist ID.' });
    }
  },

  startPlaylistGame: async (playlistId: string) => {
    set({ gameStatus: 'loading', error: null, mode: 'playlist' });
    try {
      const payload = await fetchPlaylistGame(playlistId);
      set(applyPayload(payload));
    } catch {
      set({ gameStatus: 'error', error: 'Failed to load playlist game. Check the playlist ID.' });
    }
  },

  submitGuess: async (track: TrackSummary) => {
    const { gameId, answerHash, currentAttempt, guesses } = get();
    if (!gameId || !answerHash) return;

    const isFinal = currentAttempt >= MAX_ATTEMPTS - 1;

    try {
      const result = await validateGuess(gameId, track.trackId, answerHash, isFinal);

      if (result.correct) {
        const attemptNumber = currentAttempt + 1;
        set({
          guesses: [...guesses, { type: 'correct', track }],
          gameStatus: 'won',
          answer: result.answer ?? track,
          currentAttempt: attemptNumber,
        });
        useStatsStore.getState().recordResult(get().mode, true, attemptNumber);
        persistDailyIfNeeded(get());
      } else {
        const newGuesses = [...guesses, { type: 'wrong' as const, track }];
        const newAttempt = currentAttempt + 1;

        if (newAttempt >= MAX_ATTEMPTS) {
          const answer = await revealAnswer(gameId);
          set({
            guesses: newGuesses,
            currentAttempt: newAttempt,
            gameStatus: 'lost',
            answer,
          });
          useStatsStore.getState().recordResult(get().mode, false, newAttempt);
          persistDailyIfNeeded(get());
        } else {
          set({
            guesses: newGuesses,
            currentAttempt: newAttempt,
          });
        }
      }
    } catch {
      set({ error: 'Failed to validate guess' });
    }
  },

  skip: async () => {
    const { currentAttempt, guesses, gameId } = get();
    const newGuesses = [...guesses, { type: 'skipped' as const }];
    const newAttempt = currentAttempt + 1;

    if (newAttempt >= MAX_ATTEMPTS) {
      try {
        const answer = gameId ? await revealAnswer(gameId) : null;
        set({
          guesses: newGuesses,
          currentAttempt: newAttempt,
          gameStatus: 'lost',
          answer,
        });
      } catch {
        set({
          guesses: newGuesses,
          currentAttempt: newAttempt,
          gameStatus: 'lost',
        });
      }
      useStatsStore.getState().recordResult(get().mode, false, newAttempt);
      persistDailyIfNeeded(get());
    } else {
      set({
        guesses: newGuesses,
        currentAttempt: newAttempt,
      });
    }
  },

  resetGame: () => {
    set({
      gameId: null,
      previewUrl: null,
      answerHash: null,
      currentAttempt: 0,
      guesses: [],
      gameStatus: 'idle',
      answer: null,
      error: null,
    });
  },

  setMode: (mode) => {
    set({ mode });
    get().resetGame();
  },
}));

/** Search Spotify's full catalog. Exported for use by GuessInput. */
export async function searchTracksForGuess(query: string): Promise<TrackSummary[]> {
  return apiSearchTracks(query, 'global');
}
