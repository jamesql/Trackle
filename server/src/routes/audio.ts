/**
 * Audio proxy route — streams Spotify preview audio without exposing
 * track identity to the client. Resolves gameId → trackId → preview URL,
 * then proxies the mp3 bytes.
 */
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { getPreviewUrl } from '../services/preview.js';

const router = Router();
const prisma = new PrismaClient();

const GAME_TRACK_TTL = 2 * 60 * 60 * 1000; // 2 hours

/** In-memory map for non-daily games (artist/playlist mode). Keyed by gameId. */
const gameTrackMap = new Map<string, string>();

export function registerGameTrack(gameId: string, trackId: string): void {
  gameTrackMap.set(gameId, trackId);
  setTimeout(() => gameTrackMap.delete(gameId), GAME_TRACK_TTL);
}

export function getGameTrack(gameId: string): string | null {
  return gameTrackMap.get(gameId) ?? null;
}

/** Resolve a gameId to its Spotify trackId (daily DB or in-memory map). */
async function resolveTrackId(gameId: string): Promise<string | null> {
  const dailySong = await prisma.dailySong.findUnique({ where: { date: gameId } });
  if (dailySong) return dailySong.trackId;
  return gameTrackMap.get(gameId) ?? null;
}

router.get('/audio/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;

    const trackId = await resolveTrackId(gameId);
    if (!trackId) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    const previewUrl = await getPreviewUrl(trackId);
    if (!previewUrl) {
      res.status(404).json({ error: 'Preview not available for this track' });
      return;
    }

    // Proxy the audio stream from Spotify CDN
    const audioRes = await fetch(previewUrl);
    if (!audioRes.ok || !audioRes.body) {
      res.status(502).json({ error: 'Failed to fetch audio' });
      return;
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'private, max-age=1800');

    const reader = audioRes.body.getReader();

    // Abort the upstream reader if the client disconnects
    req.on('close', () => reader.cancel());

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!res.writable) break;
        res.write(value);
      }
      res.end();
    } catch {
      reader.cancel();
      if (!res.writableEnded) res.end();
    }
  } catch (err) {
    console.error('Error serving audio:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Audio proxy failed' });
    }
  }
});

export default router;
