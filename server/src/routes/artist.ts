/** GET /api/artist/:id — picks a random song from a Spotify artist's catalog. */
import { Router } from 'express';
import { getArtistTracks } from '../services/spotify.js';
import { hashAnswer } from '../utils/hash.js';
import { setTrackPool } from '../services/trackPoolCache.js';
import { registerGameTrack } from './audio.js';
import { CLIP_DURATIONS } from '../types.js';
import type { GamePayload } from '../types.js';
import crypto from 'node:crypto';

const router = Router();

router.get('/artist/:spotifyArtistId', async (req, res) => {
  try {
    const { spotifyArtistId } = req.params;
    const tracks = await getArtistTracks(spotifyArtistId);

    if (tracks.length === 0) {
      res.status(404).json({ error: 'No playable tracks found for this artist' });
      return;
    }

    // Pick a random track
    const selected = tracks[Math.floor(Math.random() * tracks.length)];
    const gameId = `artist-${spotifyArtistId}-${crypto.randomUUID().slice(0, 8)}`;

    // Cache the track pool for scoped search and audio proxy
    setTrackPool(gameId, tracks);
    registerGameTrack(gameId, selected.trackId);

    const payload: GamePayload = {
      gameId,
      previewUrl: `/api/audio/${gameId}`,
      clipDurations: CLIP_DURATIONS,
      searchScope: 'artist',
      answerHash: hashAnswer(selected.trackId, gameId),
      trackPool: tracks,
    };

    res.json(payload);
  } catch (err) {
    console.error('Error fetching artist tracks:', err);
    res.status(500).json({ error: 'Failed to get artist game' });
  }
});

export default router;
