/** Rewrites Spotify CDN image URLs to go through our server proxy (needed for Discord Activity CSP). */
export function proxyImageUrl(url: string | undefined): string {
  if (!url) return '';
  // Only proxy Spotify image CDN URLs
  if (url.includes('scdn.co') || url.includes('spotifycdn.com')) {
    return `/api/image?url=${encodeURIComponent(url)}`;
  }
  return url;
}
