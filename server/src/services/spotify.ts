/**
 * Spotify Web API client.
 * Handles Client Credentials auth with token caching, track/artist search,
 * and catalog browsing for artist and playlist game modes.
 *
 * All outgoing requests go through spotifyFetch which provides:
 *   - Response caching (TTL-based, avoids redundant API calls)
 *   - Concurrency limiting (prevents burst overload)
 *   - Retry with backoff on 429s
 */
import { config } from '../config.js';
import type { TrackSummary } from '../types.js';

interface SpotifyToken {
  accessToken: string;
  expiresAt: number;
}

interface SpotifyTrack {
  id: string;
  name: string;
  popularity: number;
  artists: { name: string }[];
  album: { images: { url: string }[] };
}

// ── Auth ─────────────────────────────────────────────────────────────

let cachedToken: SpotifyToken | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.accessToken;
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization:
        'Basic ' +
        Buffer.from(config.SPOTIFY_CLIENT_ID + ':' + config.SPOTIFY_CLIENT_SECRET).toString(
          'base64'
        ),
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`Spotify auth failed: ${response.status}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedToken.accessToken;
}

// ── Response cache ───────────────────────────────────────────────────

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const responseCache = new Map<string, CacheEntry>();

/** TTLs by endpoint pattern (in ms). */
const CACHE_TTLS: { pattern: RegExp; ttl: number }[] = [
  { pattern: /^\/artists\/[^/]+\/top-tracks/, ttl: 60 * 60 * 1000 },   // 1 hour
  { pattern: /^\/artists\/[^/]+\/albums/,     ttl: 60 * 60 * 1000 },   // 1 hour
  { pattern: /^\/albums\/[^/]+\/tracks/,      ttl: 60 * 60 * 1000 },   // 1 hour
  { pattern: /^\/tracks/,                     ttl: 30 * 60 * 1000 },   // 30 min
  { pattern: /^\/playlists\//,                ttl: 15 * 60 * 1000 },   // 15 min
  { pattern: /^\/search/,                     ttl: 5 * 60 * 1000 },    // 5 min
];

function getCacheTtl(path: string): number {
  for (const { pattern, ttl } of CACHE_TTLS) {
    if (pattern.test(path)) return ttl;
  }
  return 0; // no cache
}

// Cleanup stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of responseCache) {
    if (now >= entry.expiresAt) responseCache.delete(key);
  }
}, 10 * 60 * 1000);

// ── Concurrency limiter ──────────────────────────────────────────────

const MAX_CONCURRENT = 5;
let activeRequests = 0;
const requestQueue: (() => void)[] = [];

function acquireSlot(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT) {
    activeRequests++;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    requestQueue.push(() => { activeRequests++; resolve(); });
  });
}

function releaseSlot(): void {
  activeRequests--;
  const next = requestQueue.shift();
  if (next) next();
}

// ── Core fetch ───────────────────────────────────────────────────────

async function spotifyFetch(path: string, retries = 2): Promise<unknown> {
  // Check cache first
  const ttl = getCacheTtl(path);
  if (ttl > 0) {
    const cached = responseCache.get(path);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }
  }

  await acquireSlot();
  let slotReleased = false;
  try {
    const token = await getAccessToken();
    const response = await fetch(`https://api.spotify.com/v1${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 429) {
      const raw = response.headers.get('Retry-After');
      const parsed = parseInt(raw || '', 10);
      const retryAfter = (parsed > 0 && parsed <= 30) ? parsed : 2;
      console.warn(`Spotify 429 on ${path}, Retry-After: ${raw}, waiting ${retryAfter}s (${retries} retries left)`);

      slotReleased = true;
      releaseSlot();

      if (retries > 0) {
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        return spotifyFetch(path, retries - 1);
      }
      throw new Error(`Spotify rate limited on ${path} (retries exhausted)`);
    }

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status} on ${path}`);
    }

    const data = await response.json();

    // Store in cache
    if (ttl > 0) {
      responseCache.set(path, { data, expiresAt: Date.now() + ttl });
    }

    return data;
  } finally {
    if (!slotReleased) releaseSlot();
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

function toTrackSummary(track: SpotifyTrack): TrackSummary {
  return {
    trackId: track.id,
    title: track.name,
    artist: track.artists.map((a) => a.name).join(', '),
    albumArt: track.album.images[0]?.url ?? '',
    previewUrl: `spotify:track:${track.id}`,
    popularity: track.popularity,
  };
}

// ── Public API ───────────────────────────────────────────────────────

export async function searchTracks(query: string, limit = 5): Promise<TrackSummary[]> {
  const data = (await spotifyFetch(
    `/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`
  )) as { tracks: { items: SpotifyTrack[] } };

  return data.tracks.items.map(toTrackSummary);
}

export interface ArtistSummary {
  artistId: string;
  name: string;
  imageUrl: string;
}

export async function searchArtists(query: string, limit = 5): Promise<ArtistSummary[]> {
  const data = (await spotifyFetch(
    `/search?q=${encodeURIComponent(query)}&type=artist&limit=${limit}`
  )) as { artists: { items: { id: string; name: string; images: { url: string }[] }[] } };

  return data.artists.items.map((a) => ({
    artistId: a.id,
    name: a.name,
    imageUrl: a.images[0]?.url ?? '',
  }));
}

export async function getTrack(trackId: string): Promise<TrackSummary | null> {
  try {
    const data = (await spotifyFetch(`/tracks/${trackId}`)) as SpotifyTrack;
    return toTrackSummary(data);
  } catch (err) {
    console.error(`getTrack(${trackId}) failed:`, err);
    return null;
  }
}

/**
 * Get full discography for artist mode.
 * Uses batch endpoints to minimize API calls:
 *   1. Top tracks + album list in parallel (2 calls)
 *   2. "Get Several Albums" returns up to 20 albums WITH track listings per call (1-3 calls)
 *   3. Batch-fetch full track details with popularity etc. (1-3 calls)
 * Total: ~5-8 calls for a FULL discography vs 25+ with individual album fetches.
 */
export async function getArtistTracks(artistId: string): Promise<TrackSummary[]> {
  // Fetch top tracks and album list in parallel
  const [topData, albumsData] = await Promise.all([
    spotifyFetch(`/artists/${artistId}/top-tracks`) as Promise<{ tracks: SpotifyTrack[] }>,
    spotifyFetch(`/artists/${artistId}/albums?include_groups=album,single&limit=50`) as Promise<{ items: { id: string }[] }>,
  ]);

  // Batch-fetch albums (up to 20 per call) — each response includes track listings
  const albumIds = albumsData.items.map((a) => a.id);
  const albumTrackIds: string[] = [];

  for (let i = 0; i < albumIds.length; i += 20) {
    const batch = albumIds.slice(i, i + 20);
    const batchData = (await spotifyFetch(`/albums?ids=${batch.join(',')}`)) as {
      albums: { tracks: { items: { id: string }[] } }[];
    };
    for (const album of batchData.albums) {
      albumTrackIds.push(...album.tracks.items.map((t) => t.id));
    }
  }

  const allTrackIds = [
    ...new Set([...topData.tracks.map((t) => t.id), ...albumTrackIds]),
  ];

  // Batch-fetch full track details (popularity, album art, etc.)
  const tracks: TrackSummary[] = [];

  for (let i = 0; i < allTrackIds.length; i += 50) {
    const batch = allTrackIds.slice(i, i + 50);
    const batchData = (await spotifyFetch(`/tracks?ids=${batch.join(',')}`)) as {
      tracks: SpotifyTrack[];
    };
    for (const track of batchData.tracks) {
      tracks.push(toTrackSummary(track));
    }
  }

  return tracks;
}

export async function getPlaylistTracks(playlistId: string): Promise<TrackSummary[]> {
  const tracks: TrackSummary[] = [];
  let url = `/playlists/${playlistId}/tracks?limit=100`;

  while (url) {
    const data = (await spotifyFetch(url)) as {
      items: { track: SpotifyTrack }[];
      next: string | null;
    };

    for (const item of data.items) {
      if (item.track) {
        tracks.push(toTrackSummary(item.track));
      }
    }

    if (data.next) {
      const nextUrl = new URL(data.next);
      url = nextUrl.pathname.replace('/v1', '') + nextUrl.search;
    } else {
      break;
    }
  }

  return tracks;
}
