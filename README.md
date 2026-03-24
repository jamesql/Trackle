# Trackle

A music guessing game where players hear progressively longer clips of a song and try to identify it in as few attempts as possible. Built with React, Express, and the Spotify Web API.

## Game Modes

| Mode | How it works |
|---|---|
| **Daily Challenge** | A new random song every day — same for all players. Come back tomorrow for a new one. |
| **Artist Mode** | Search for any Spotify artist and guess from their catalog. |
| **Playlist Mode** | Paste a Spotify playlist URL and guess songs from it. |

## How to Play

1. Press play to hear a **1-second** clip
2. Search for a song and submit your guess — or skip
3. Wrong guess or skip? The clip gets longer: **1s → 2s → 4s → 7s → 11s → 16s**
4. You have **6 attempts** to guess correctly
5. Share your results with an emoji grid

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS v4, Zustand, Howler.js
- **Backend:** Node.js, Express, TypeScript, Prisma, SQLite
- **API:** Spotify Web API (Client Credentials flow)

## Setup

### Prerequisites

- Node.js 18+
- A [Spotify Developer](https://developer.spotify.com/dashboard) app (Client ID + Secret)

### Backend

```bash
cd server
npm install
cp .env.example .env
# Fill in SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env
npx prisma migrate dev
npm run db:seed    # Seeds song pool from Spotify (requires API credentials)
npm run dev        # Starts on http://localhost:3001
```

### Frontend

```bash
cd client
npm install
npm run dev        # Starts on http://localhost:5173 (proxies /api to :3001)
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SPOTIFY_CLIENT_ID` | Yes | Spotify app client ID |
| `SPOTIFY_CLIENT_SECRET` | Yes | Spotify app client secret |
| `DAILY_SONG_SEED_SECRET` | Yes | Secret salt for deterministic daily song selection |
| `PORT` | No | Server port (default: 3001) |
| `FRONTEND_URL` | No | CORS origin (default: http://localhost:5173) |
| `DATABASE_URL` | No | SQLite path (default: file:./dev.db) |

## Architecture

```
client/                     server/
├── src/                    ├── src/
│   ├── components/         │   ├── routes/
│   │   ├── AudioPlayer     │   │   ├── daily      GET  /api/daily
│   │   ├── GuessInput      │   │   ├── artist     GET  /api/artist/:id
│   │   ├── GuessHistory    │   │   ├── playlist   GET  /api/playlist/:id
│   │   ├── ResultsModal    │   │   ├── search     GET  /api/search?q=
│   │   └── ...             │   │   ├── validate   POST /api/validate
│   ├── stores/             │   │   ├── audio      GET  /api/audio/:gameId
│   │   ├── gameStore       │   │   └── ...
│   │   └── statsStore      │   ├── services/
│   ├── lib/api             │   │   ├── spotify    Spotify API client
│   └── utils/share         │   │   ├── daily      Song selection logic
│                           │   │   └── preview    Preview URL extraction
│                           │   └── middleware/
│                           │       ├── rateLimit
│                           │       └── errorHandler
│                           └── prisma/
│                               └── schema.prisma
```

### Key Design Decisions

**Audio playback:** Spotify removed preview URLs from their API. The backend scrapes preview URLs from Spotify's embed page HTML and proxies the audio stream through `/api/audio/:gameId`, so the client never sees the track identity.

**Answer security:** The server sends `sha256(trackId + gameId)` as the answer hash. Guesses are validated server-side. The answer is only revealed on correct guess or final attempt.

**Fuzzy matching:** Different Spotify versions of the same song (remasters, deluxe editions) are accepted as correct. Titles are normalized by stripping parentheticals, brackets, and suffixes before comparison.

**Daily determinism:** A seeded PRNG (mulberry32) with `DAILY_SONG_SEED_SECRET + date` ensures all players get the same song. Only tracks with a Spotify popularity score of 60+ are eligible, and previously used tracks are excluded to prevent repeats. The daily song resets at midnight UTC (7 PM EST / 8 PM EDT). The selection is cached in SQLite.

## Scripts

### Server

| Script | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload (tsx watch) |
| `npm run build` | Compile TypeScript |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed the song pool from Spotify |

### Client

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

## License

MIT
