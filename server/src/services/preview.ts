/**
 * Extracts Spotify's ~30s mp3 preview URL from their embed page HTML.
 * This works because the embed page contains the preview URL even though
 * the API no longer exposes it. Results are cached for 30 minutes.
 */
const previewCache = new Map<string, { url: string; expiresAt: number }>();
const TTL = 30 * 60 * 1000; // 30 minutes

export async function getPreviewUrl(trackId: string): Promise<string | null> {
  const cached = previewCache.get(trackId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.url;
  }

  try {
    const res = await fetch(`https://open.spotify.com/embed/track/${trackId}`);
    if (!res.ok) return null;

    const html = await res.text();
    const match = html.match(/https:\/\/p\.scdn\.co\/mp3-preview\/[a-f0-9]+/);
    if (!match) return null;

    const url = match[0];
    previewCache.set(trackId, { url, expiresAt: Date.now() + TTL });
    return url;
  } catch {
    return null;
  }
}
