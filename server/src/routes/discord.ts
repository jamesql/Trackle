/**
 * Discord OAuth2 token exchange route.
 * Exchanges an authorization code (from the Activity SDK) for an access token.
 */
import { Router } from 'express';
import { config } from '../config.js';

const router = Router();

router.post('/discord/token', async (req, res) => {
  try {
    const { code } = req.body as { code: string };

    if (!code) {
      res.status(400).json({ error: 'Missing authorization code' });
      return;
    }

    if (!config.DISCORD_CLIENT_ID || !config.DISCORD_CLIENT_SECRET) {
      res.status(500).json({ error: 'Discord credentials not configured' });
      return;
    }

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.DISCORD_CLIENT_ID,
        client_secret: config.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('Discord token exchange failed:', err);
      res.status(tokenRes.status).json({ error: 'Token exchange failed' });
      return;
    }

    const data = await tokenRes.json() as { access_token: string };
    res.json({ access_token: data.access_token });
  } catch (err) {
    console.error('Discord token error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
