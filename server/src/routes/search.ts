/**
 * Search routes — track search (autocomplete) and artist search.
 * Track results are deduplicated by normalized title + primary artist
 * so the user doesn't see 10 versions of the same song.
 */
import { Router } from 'express';
import { searchTracks, searchArtists } from '../services/spotify.js';
import { normalizeString } from '../utils/normalize.js';
import type { TrackSummary } from '../types.js';

const router = Router();

/** Remove duplicate songs (same title + primary artist, different Spotify versions). */
function dedupeByTitleArtist(tracks: TrackSummary[], limit: number): TrackSummary[] {
  const seen = new Set<string>();
  const result: TrackSummary[] = [];
  for (const track of tracks) {
    const key = normalizeString(track.title) + '||' + normalizeString(track.artist.split(',')[0]);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(track);
    if (result.length >= limit) break;
  }
  return result;
}

router.get('/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query || query.trim().length < 2) {
      res.json([]);
      return;
    }

    // Fetch extra results to have room after deduplication
    const results = await searchTracks(query.trim(), 20);
    const deduped = dedupeByTitleArtist(results, 5);
    res.json(deduped);
  } catch (err) {
    console.error('Error searching tracks:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

router.get('/search/artists', async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query || query.trim().length < 2) {
      res.json([]);
      return;
    }

    const results = await searchArtists(query.trim(), 5);
    res.json(results);
  } catch (err) {
    console.error('Error searching artists:', err);
    res.status(500).json({ error: 'Artist search failed' });
  }
});

export default router;
