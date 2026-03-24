# Trackle — Server

Express backend for Trackle. Handles Spotify API integration, audio proxying, answer validation, daily song selection, and Discord bot commands.

## Tech Stack

- **Node.js** with Express and TypeScript (ESM)
- **Prisma** + **SQLite** — database ORM
- **discord.js** — slash commands + daily review scheduler
- **tsx** — dev server with hot reload

## Getting Started

```bash
npm install
cp .env.example .env       # Fill in Spotify credentials + secrets
npm run db:generate         # Generate Prisma client
npm run db:migrate          # Create/update SQLite tables
npm run dev                 # http://localhost:3001
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SPOTIFY_CLIENT_ID` | Yes | Spotify app client ID |
| `SPOTIFY_CLIENT_SECRET` | Yes | Spotify app client secret |
| `DAILY_SONG_SEED_SECRET` | Yes | Salt for deterministic daily song selection |
| `PORT` | No | Server port (default: 3001) |
| `FRONTEND_URL` | No | CORS origin (default: http://localhost:5173) |
| `DATABASE_URL` | No | SQLite path (default: file:./dev.db) |
| `DISCORD_CLIENT_ID` | No | Discord app client ID (for Activity + bot) |
| `DISCORD_CLIENT_SECRET` | No | Discord app client secret |
| `DISCORD_BOT_TOKEN` | No | Discord bot token (for slash commands + reviews) |

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload (tsx watch) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run production server |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:migrate` | Run database migrations (dev) |
| `npm run db:migrate:prod` | Deploy migrations (production) |
| `npm run db:seed` | Seed SongPool with 50 popular tracks |

## API Routes

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/health` | GET | Health check |
| `/api/daily` | GET | Today's daily challenge game payload |
| `/api/artist/:id` | GET | Random song from artist catalog |
| `/api/playlist/:id` | GET | Random song from playlist |
| `/api/search?q=` | GET | Track autocomplete (deduped by title+artist) |
| `/api/search/artists?q=` | GET | Artist search autocomplete |
| `/api/audio/:gameId` | GET | Proxied audio stream (no track identity exposed) |
| `/api/image?url=` | GET | Spotify album art proxy (Discord CSP) |
| `/api/validate` | POST | Validate guess (hash match + fuzzy matching) |
| `/api/reveal` | POST | Reveal answer after game over |
| `/api/discord/token` | POST | OAuth2 code → token exchange |
| `/api/discord/daily-result` | POST | Store Discord user's daily result |
| `/api/discord/daily-result/:id` | GET | Get Discord user's daily result |

## Project Structure

```
src/
├── routes/
│   ├── index.ts             # Route registration
│   ├── daily.ts             # Daily challenge endpoint
│   ├── artist.ts            # Artist mode endpoint
│   ├── playlist.ts          # Playlist mode endpoint
│   ├── search.ts            # Track + artist search
│   ├── validate.ts          # Guess validation + answer reveal
│   ├── audio.ts             # Audio stream proxy
│   ├── imageProxy.ts        # Album art proxy
│   ├── discord.ts           # Discord OAuth2
│   └── discordResults.ts    # Discord daily result storage
├── services/
│   ├── spotify.ts           # Spotify Web API client (Client Credentials)
│   ├── preview.ts           # Preview URL scraping + 30min cache
│   ├── daily.ts             # Seeded PRNG daily song selection
│   └── trackPoolCache.ts    # In-memory track pool cache (1hr TTL)
├── middleware/
│   ├── errorHandler.ts      # Global error handler
│   └── rateLimit.ts         # IP-based rate limiter (60 req/min)
├── utils/
│   ├── hash.ts              # SHA-256 answer hashing
│   ├── normalize.ts         # Fuzzy title/artist normalization
│   └── prng.ts              # Seeded PRNG (mulberry32)
├── config.ts                # Env var validation
├── types.ts                 # Shared API types
├── bot.ts                   # Discord bot (slash commands + daily review)
└── index.ts                 # Express server entry point
prisma/
├── schema.prisma            # Database schema (DailySong, SongPool, Discord tables)
├── seed.ts                  # SongPool seeder
└── migrations/              # Schema migrations
```

## Key Design Decisions

- **Audio proxying**: Spotify removed preview URLs from their API. The server scrapes ~30s preview URLs from Spotify's embed page HTML and streams the audio through `/api/audio/:gameId`, keeping track identity hidden from the client.
- **Answer security**: `sha256(trackId + gameId)` sent as hash. Server-side validation prevents brute-force. Answer only revealed on correct guess or final attempt.
- **Fuzzy matching**: Normalizes titles by stripping parentheticals, brackets, and suffixes (e.g. "Radio Edit", "Remastered") so different Spotify versions of the same song are accepted.
- **Daily selection**: Seeded PRNG (mulberry32) with `DAILY_SONG_SEED_SECRET + date`. Only tracks with Spotify popularity >= 60 are eligible, and previously used tracks are excluded. Resets at midnight UTC.
- **Discord bot**: `/trackle play` launches the Activity, `/trackle daily` shows results, `/trackle review` sets up automatic daily review posts per guild.
