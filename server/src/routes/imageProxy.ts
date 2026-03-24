/**
 * Image proxy route — proxies Spotify album art through the server
 * so it works inside Discord Activities where CSP blocks i.scdn.co.
 */
import { Router } from 'express';

const router = Router();

const ALLOWED_HOSTS = ['i.scdn.co', 'image-cdn-fa.spotifycdn.com', 'image-cdn-ak.spotifycdn.com'];

router.get('/image', async (req, res) => {
  try {
    const url = req.query.url as string;
    if (!url) {
      res.status(400).json({ error: 'Missing url parameter' });
      return;
    }

    // Only proxy Spotify image CDN URLs
    const parsed = new URL(url);
    if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
      res.status(403).json({ error: 'Host not allowed' });
      return;
    }

    const imageRes = await fetch(url);
    if (!imageRes.ok || !imageRes.body) {
      res.status(502).json({ error: 'Failed to fetch image' });
      return;
    }

    const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // cache 24h

    const reader = imageRes.body.getReader();
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
    console.error('Error proxying image:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Image proxy failed' });
    }
  }
});

export default router;
