/** GET /api/daily — returns today's daily challenge game payload. */
import { Router } from 'express';
import { getDailySong } from '../services/daily.js';
import { hashAnswer } from '../utils/hash.js';
import { CLIP_DURATIONS } from '../types.js';
import type { GamePayload } from '../types.js';

const router = Router();

router.get('/daily', async (_req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { trackId, track } = await getDailySong(today);

    const answerHash = hashAnswer(trackId, today);
    const payload: GamePayload = {
      gameId: today,
      previewUrl: `/api/audio/${today}?v=${answerHash.slice(0, 8)}`,
      clipDurations: CLIP_DURATIONS,
      searchScope: 'global',
      answerHash,
    };

    res.json(payload);
  } catch (err) {
    console.error('Error fetching daily song:', err);
    res.status(500).json({ error: 'Failed to get daily song' });
  }
});

export default router;
