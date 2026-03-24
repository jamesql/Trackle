/**
 * Discord daily result routes.
 * Stores and retrieves daily game results for Discord users,
 * used by the /trackle daily command and the daily review.
 */
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

/** Store a Discord user's daily result (called by the client after game ends). */
router.post('/discord/daily-result', async (req, res) => {
  try {
    const { discordId, guildId, username, date, score, guessGrid, won, attempts } = req.body as {
      discordId: string;
      guildId: string;
      username: string;
      date: string;
      score: string;
      guessGrid: string;
      won: boolean;
      attempts: number;
    };

    if (!discordId || !guildId || !username || !date || !score || !guessGrid || typeof won !== 'boolean' || typeof attempts !== 'number') {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    await prisma.discordDailyResult.upsert({
      where: { date_discordId_guildId: { date, discordId, guildId } },
      update: { username, score, guessGrid, won, attempts },
      create: { date, discordId, guildId, username, score, guessGrid, won, attempts },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to store Discord daily result:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

/** Get a Discord user's daily result for a given date. */
router.get('/discord/daily-result/:discordId', async (req, res) => {
  try {
    const { discordId } = req.params;
    const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);

    const result = await prisma.discordDailyResult.findFirst({
      where: { discordId, date },
    });

    if (!result) {
      res.json({ found: false });
      return;
    }

    res.json({ found: true, result });
  } catch (err) {
    console.error('Failed to fetch Discord daily result:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
