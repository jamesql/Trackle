/**
 * Spotify Web API client.
 * Handles Client Credentials auth with token caching, track/artist search,
 * and catalog browsing for artist and playlist game modes.
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

async function spotifyFetch(path: string): Promise<unknown> {
  const token = await getAccessToken();
  const response = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.status} on ${path}`);
  }

  return response.json();
}

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

export async function getArtistTracks(artistId: string): Promise<TrackSummary[]> {
  const topData = (await spotifyFetch(`/artists/${artistId}/top-tracks`)) as {
    tracks: SpotifyTrack[];
  };

  const albumsData = (await spotifyFetch(
    `/artists/${artistId}/albums?include_groups=album,single&limit=20`
  )) as { items: { id: string }[] };

  const albumTrackPromises = albumsData.items.map(async (album) => {
    const albumData = (await spotifyFetch(`/albums/${album.id}/tracks?limit=50`)) as {
      items: { id: string }[];
    };
    return albumData.items.map((t) => t.id);
  });

  const albumTrackIds = (await Promise.all(albumTrackPromises)).flat();

  const allTrackIds = [
    ...new Set([...topData.tracks.map((t) => t.id), ...albumTrackIds]),
  ];

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
