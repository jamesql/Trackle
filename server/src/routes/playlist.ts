/** GET /api/playlist/:id — picks a random song from a Spotify playlist. */
import { Router } from 'express';
import { getPlaylistTracks } from '../services/spotify.js';
import { hashAnswer } from '../utils/hash.js';
import { setTrackPool } from '../services/trackPoolCache.js';
import { registerGameTrack } from './audio.js';
import { CLIP_DURATIONS } from '../types.js';
import type { GamePayload } from '../types.js';
import crypto from 'node:crypto';

const router = Router();

router.get('/playlist/:spotifyPlaylistId', async (req, res) => {
  try {
    const { spotifyPlaylistId } = req.params;
    const tracks = await getPlaylistTracks(spotifyPlaylistId);

    if (tracks.length === 0) {
      res.status(404).json({ error: 'No playable tracks found in this playlist' });
      return;
    }

    // Pick a random track
    const selected = tracks[Math.floor(Math.random() * tracks.length)];
    const gameId = `playlist-${spotifyPlaylistId}-${crypto.randomUUID().slice(0, 8)}`;

    // Cache the track pool for scoped search and audio proxy
    setTrackPool(gameId, tracks);
    registerGameTrack(gameId, selected.trackId);

    const payload: GamePayload = {
      gameId,
      previewUrl: `/api/audio/${gameId}`,
      clipDurations: CLIP_DURATIONS,
      searchScope: 'playlist',
      answerHash: hashAnswer(selected.trackId, gameId),
      trackPool: tracks,
    };

    res.json(payload);
  } catch (err) {
    console.error('Error fetching playlist tracks:', err);
    res.status(500).json({ error: 'Failed to get playlist game' });
  }
});

export default router;
