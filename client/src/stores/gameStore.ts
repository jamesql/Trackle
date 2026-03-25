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
import { updateActivity, reportDailyResult } from '../lib/discord';
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
  lastArtistId: string | null;

  startDaily: () => Promise<void>;
  startArtistGame: (artistId: string) => Promise<void>;
  startPlaylistGame: (playlistId: string) => Promise<void>;
  submitGuess: (track: TrackSummary) => Promise<void>;
  skip: () => Promise<void>;
  resetGame: () => void;
  replayArtist: () => Promise<void>;
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
  if (state.mode === 'daily' && state.gameId && (state.gameStatus === 'won' || state.gameStatus === 'lost')) {
    saveDailyResult({
      date: state.gameId,
      guesses: state.guesses,
      gameStatus: state.gameStatus,
      answer: state.answer,
      gameId: state.gameId,
    });

    // Report to server for Discord daily review & /trackle daily command
    const won = state.gameStatus === 'won';
    const score = won ? `${state.guesses.length}/6` : 'X/6';
    const grid = Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
      const entry = state.guesses[i];
      if (!entry) return '\u2B1B';           // ⬛ unused
      if (entry.type === 'skipped') return '\u2B1C'; // ⬜ skipped
      if (entry.type === 'wrong') return '\uD83D\uDFE5';   // 🟥 wrong
      return '\uD83D\uDFE9';                 // 🟩 correct
    }).join('');

    reportDailyResult(state.gameId, score, grid, won, state.guesses.length);
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
  lastArtistId: null,

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
      updateActivity('Guess 1/6', 'Daily Challenge');
    } catch {
      set({ gameStatus: 'error', error: 'Failed to load daily challenge' });
    }
  },

  startArtistGame: async (artistId: string) => {
    set({ gameStatus: 'loading', error: null, mode: 'artist', lastArtistId: artistId });
    try {
      const payload = await fetchArtistGame(artistId);
      set(applyPayload(payload));
      updateActivity('Guess 1/6', 'Artist Mode');
    } catch {
      set({ gameStatus: 'error', error: 'Failed to load artist game. Check the artist ID.' });
    }
  },

  startPlaylistGame: async (playlistId: string) => {
    set({ gameStatus: 'loading', error: null, mode: 'playlist' });
    try {
      const payload = await fetchPlaylistGame(playlistId);
      set(applyPayload(payload));
      updateActivity('Guess 1/6', 'Playlist Mode');
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
        updateActivity(`Got it in ${attemptNumber}/6! 🎉`, 'Trackle');
      } else {
        const newGuesses = [...guesses, { type: 'wrong' as const, track }];
        const newAttempt = currentAttempt + 1;

        if (newAttempt >= MAX_ATTEMPTS) {
          let answer: TrackSummary | null = null;
          try {
            answer = await revealAnswer(gameId);
          } catch {
            // Reveal failed — still show the loss screen
          }
          set({
            guesses: newGuesses,
            currentAttempt: newAttempt,
            gameStatus: 'lost',
            answer,
          });
          useStatsStore.getState().recordResult(get().mode, false, newAttempt);
          persistDailyIfNeeded(get());
          updateActivity('X/6 💔', 'Trackle');
        } else {
          set({
            guesses: newGuesses,
            currentAttempt: newAttempt,
          });
          updateActivity(`Guess ${newAttempt + 1}/6`, get().mode === 'daily' ? 'Daily Challenge' : 'Trackle');
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
      let answer: TrackSummary | null = null;
      try {
        answer = gameId ? await revealAnswer(gameId) : null;
      } catch {
        // Reveal failed — still show the loss screen
      }
      set({
        guesses: newGuesses,
        currentAttempt: newAttempt,
        gameStatus: 'lost',
        answer,
      });
      useStatsStore.getState().recordResult(get().mode, false, newAttempt);
      persistDailyIfNeeded(get());
      updateActivity('X/6 💔', 'Trackle');
    } else {
      set({
        guesses: newGuesses,
        currentAttempt: newAttempt,
      });
      updateActivity(`Guess ${newAttempt + 1}/6`, get().mode === 'daily' ? 'Daily Challenge' : 'Trackle');
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

  replayArtist: async () => {
    const artistId = get().lastArtistId;
    if (!artistId) return;
    get().resetGame();
    await get().startArtistGame(artistId);
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
