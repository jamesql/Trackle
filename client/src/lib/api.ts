/**
 * API client — all backend calls go through here.
 * In dev, Vite proxies /api to localhost:3001.
 * In prod, VITE_API_URL can point to a different origin, or defaults to /api (same domain).
 */
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

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

export interface ValidateResponse {
  correct: boolean;
  answer?: TrackSummary;
}

export async function fetchDaily(): Promise<GamePayload> {
  const { data } = await api.get<GamePayload>('/daily');
  return data;
}

export async function validateGuess(
  gameId: string,
  guessTrackId: string,
  answerHash: string,
  isFinal: boolean
): Promise<ValidateResponse> {
  const { data } = await api.post<ValidateResponse>('/validate', {
    gameId,
    guessTrackId,
    answerHash,
    isFinal,
  });
  return data;
}

export async function revealAnswer(gameId: string): Promise<TrackSummary> {
  const { data } = await api.post<{ answer: TrackSummary }>('/reveal', { gameId });
  return data.answer;
}

export async function fetchArtistGame(artistId: string): Promise<GamePayload> {
  const { data } = await api.get<GamePayload>(`/artist/${artistId}`);
  return data;
}

export async function fetchPlaylistGame(playlistId: string): Promise<GamePayload> {
  const { data } = await api.get<GamePayload>(`/playlist/${playlistId}`);
  return data;
}

export interface ArtistSummary {
  artistId: string;
  name: string;
  imageUrl: string;
}

export async function searchArtists(query: string): Promise<ArtistSummary[]> {
  const { data } = await api.get<ArtistSummary[]>('/search/artists', {
    params: { q: query },
  });
  return data;
}

export async function searchTracks(query: string, scope = 'global'): Promise<TrackSummary[]> {
  const { data } = await api.get<TrackSummary[]>('/search', {
    params: { q: query, scope },
  });
  return data;
}
