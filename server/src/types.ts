/** Shared type definitions for the API contract between server and client. */

export interface TrackSummary {
  trackId: string;
  title: string;
  artist: string;
  albumArt: string;
  previewUrl: string;
}

export interface GamePayload {
  gameId: string;
  previewUrl: string;
  clipDurations: number[];
  searchScope: 'global' | 'artist' | 'playlist';
  answerHash: string;
  trackPool?: TrackSummary[];
}

export interface ValidateRequest {
  gameId: string;
  guessTrackId: string;
  answerHash: string;
  isFinal?: boolean;
}

export interface ValidateResponse {
  correct: boolean;
  answer?: TrackSummary;
}

export const CLIP_DURATIONS = [1, 2, 4, 7, 11, 16];
