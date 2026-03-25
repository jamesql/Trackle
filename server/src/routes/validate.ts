/**
 * Guess validation and answer reveal routes.
 * Supports exact track ID matching and fuzzy matching (same song title + artist)
 * so different Spotify versions of the same song are accepted.
 */
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { hashAnswer } from '../utils/hash.js';
import { normalizeString } from '../utils/normalize.js';
import { getTrack } from '../services/spotify.js';
import { getGameTrack } from './audio.js';
import type { ValidateRequest, ValidateResponse, TrackSummary } from '../types.js';

const router = Router();
const prisma = new PrismaClient();

/** Check if two tracks are the same song (title + primary artist match). */
function isSameSong(a: TrackSummary, b: TrackSummary): boolean {
  const titleA = normalizeString(a.title);
  const titleB = normalizeString(b.title);
  const artistA = normalizeString(a.artist.split(',')[0]);
  const artistB = normalizeString(b.artist.split(',')[0]);
  return titleA === titleB && artistA === artistB;
}

/** Resolve a gameId to the answer's Spotify track ID. */
async function resolveTrackId(gameId: string): Promise<string | null> {
  const dailySong = await prisma.dailySong.findUnique({ where: { date: gameId } });
  if (dailySong) return dailySong.trackId;
  return getGameTrack(gameId);
}

/** Resolve a daily gameId to a full TrackSummary from the DB (no Spotify call). */
async function resolveDailyTrack(gameId: string): Promise<TrackSummary | null> {
  const dailySong = await prisma.dailySong.findUnique({ where: { date: gameId } });
  if (dailySong && dailySong.title) {
    return {
      trackId: dailySong.trackId,
      title: dailySong.title,
      artist: dailySong.artist,
      albumArt: dailySong.albumArt,
      previewUrl: `spotify:track:${dailySong.trackId}`,
    };
  }
  return null;
}

router.post('/validate', async (req, res) => {
  try {
    const { gameId, guessTrackId, answerHash, isFinal } = req.body as ValidateRequest;

    if (!gameId || !guessTrackId || !answerHash) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Check exact track ID match via hash
    const guessHash = hashAnswer(guessTrackId, gameId);
    let correct = guessHash === answerHash;

    // If not exact, check fuzzy match (same song, different Spotify version)
    if (!correct) {
      const answerTrackId = await resolveTrackId(gameId);
      if (answerTrackId) {
        const [guessTrack, answerTrack] = await Promise.all([
          getTrack(guessTrackId),
          getTrack(answerTrackId),
        ]);
        if (guessTrack && answerTrack && isSameSong(guessTrack, answerTrack)) {
          correct = true;
        }
      }
    }

    const response: ValidateResponse = { correct };

    if (correct) {
      const track = await resolveDailyTrack(gameId) ?? await getTrack(guessTrackId);
      if (track) response.answer = track;
    } else if (isFinal) {
      // Reveal the answer on the last attempt — try DB first, fall back to Spotify
      const track = await resolveDailyTrack(gameId);
      if (track) {
        response.answer = track;
      } else {
        const trackId = await resolveTrackId(gameId);
        if (trackId) {
          const fetched = await getTrack(trackId);
          if (fetched) response.answer = fetched;
        }
      }
    }

    res.json(response);
  } catch (err) {
    console.error('Error validating guess:', err);
    res.status(500).json({ error: 'Validation failed' });
  }
});

router.post('/reveal', async (req, res) => {
  try {
    const { gameId } = req.body as { gameId: string };

    if (!gameId) {
      res.status(400).json({ error: 'Missing gameId' });
      return;
    }

    // Try DB first (no Spotify call needed for daily games)
    const dbTrack = await resolveDailyTrack(gameId);
    if (dbTrack) {
      res.json({ answer: dbTrack });
      return;
    }

    // Fall back to Spotify for artist/playlist games
    const trackId = await resolveTrackId(gameId);
    if (!trackId) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    const track = await getTrack(trackId);
    if (!track) {
      res.status(404).json({ error: 'Track no longer available' });
      return;
    }

    res.json({ answer: track });
  } catch (err) {
    console.error('Error revealing answer:', err);
    res.status(500).json({ error: 'Reveal failed' });
  }
});

export default router;
