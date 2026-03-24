import type { TrackSummary } from '../types.js';

interface CacheEntry {
  tracks: TrackSummary[];
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const TTL = 60 * 60 * 1000; // 1 hour

export function setTrackPool(gameId: string, tracks: TrackSummary[]): void {
  cache.set(gameId, { tracks, expiresAt: Date.now() + TTL });
}

export function getTrackPool(gameId: string): TrackSummary[] | null {
  const entry = cache.get(gameId);
  if (!entry || Date.now() > entry.expiresAt) {
    cache.delete(gameId);
    return null;
  }
  return entry.tracks;
}
