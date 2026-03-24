/**
 * Daily song selection service.
 * Picks a random track from Spotify's catalog using a seeded PRNG
 * so all players get the same song on a given day. Caches the result
 * in the DailySong table to avoid re-picking.
 */
import { PrismaClient } from '@prisma/client';
import { config } from '../config.js';
import { seededRandom } from '../utils/prng.js';
import { searchTracks, getTrack } from './spotify.js';
import { getPreviewUrl } from './preview.js';
import type { TrackSummary } from '../types.js';

const prisma = new PrismaClient();

/** Broad search terms used to discover popular tracks from Spotify's catalog. */
const SEARCH_TERMS = [
  'pop hits', 'rock classics', 'hip hop', 'r&b', 'dance', 'indie',
  'country', 'funk', 'disco', 'punk', 'electronic', 'house', 'techno',
  'love song', 'summer', 'party', 'feel good', 'workout',
  'throwback', 'nostalgia', '2000s', '90s hits', '80s hits',
  'top hits', 'best of', 'greatest hits', 'number one', 'chart',
  'acoustic', 'guitar', 'sing along', 'karaoke',
  'road trip', 'chill', 'vibe', 'energy', 'anthem',
  'ballad', 'duet', 'live', 'unplugged', "folk", "rap"
];

export interface DailyResult {
  trackId: string;
  track: TrackSummary;
}

/** Minimum Spotify popularity score (0–100) for daily song candidates. */
const MIN_POPULARITY = 60;

export async function getDailySong(date: string): Promise<DailyResult> {
  // Return cached selection if it still works
  const existing = await prisma.dailySong.findUnique({ where: { date } });
  if (existing) {
    const track = await getTrack(existing.trackId);
    if (track) return { trackId: existing.trackId, track };
    // Track no longer available — delete stale entry and re-pick
    await prisma.dailySong.delete({ where: { date } });
  }

  // Fetch all previously used track IDs to avoid duplicates
  const pastSongs = await prisma.dailySong.findMany({ select: { trackId: true } });
  const usedTrackIds = new Set(pastSongs.map((s) => s.trackId));

  const rng = seededRandom(config.DAILY_SONG_SEED_SECRET + date);

  // Shuffle search terms deterministically
  const termOrder = Array.from({ length: SEARCH_TERMS.length }, (_, i) => i);
  for (let i = termOrder.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [termOrder[i], termOrder[j]] = [termOrder[j], termOrder[i]];
  }

  for (const termIdx of termOrder) {
    const term = SEARCH_TERMS[termIdx];
    let results: TrackSummary[];
    try {
      results = await searchTracks(term, 50);
    } catch {
      continue; // Spotify API error on this term — try next
    }
    if (results.length === 0) continue;

    // Filter: must be popular enough and not previously used
    const eligible = results.filter(
      (t) => (t.popularity ?? 0) >= MIN_POPULARITY && !usedTrackIds.has(t.trackId)
    );
    if (eligible.length === 0) continue;

    // Shuffle eligible results deterministically, try each for a working preview
    const indices = Array.from({ length: eligible.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    for (const idx of indices) {
      const candidate = eligible[idx];
      const preview = await getPreviewUrl(candidate.trackId);
      if (!preview) continue;

      // Use upsert to handle concurrent requests safely (race condition guard)
      await prisma.dailySong.upsert({
        where: { date },
        update: { trackId: candidate.trackId },
        create: { date, trackId: candidate.trackId },
      });
      return { trackId: candidate.trackId, track: candidate };
    }
  }

  throw new Error('Could not find any track with a playable preview');
}
