# Trackle — Client

React frontend for Trackle, a music guessing game with daily challenges, artist mode, and playlist mode.

## Tech Stack

- **React 18** with TypeScript
- **Vite** — dev server + bundler
- **Tailwind CSS v4** — styling with custom glass-morphism theme
- **Zustand** — state management (game state, stats, daily result persistence)
- **Howler.js** — audio playback with timeline visualization
- **Axios** — API client
- **Discord Embedded App SDK** — optional Discord Activity integration

## Getting Started

```bash
npm install
npm run dev        # http://localhost:5173 (proxies /api → localhost:3001)
```

The backend must be running on port 3001 (or set `VITE_API_URL`).

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check + production build (outputs to `dist/`) |
| `npm run preview` | Preview production build locally |

## Project Structure

```
src/
├── components/
│   ├── AudioPlayer.tsx      # Howler.js player with clip timeline + volume
│   ├── GameBoard.tsx        # Main game container
│   ├── GuessInput.tsx       # Debounced track search with autocomplete
│   ├── GuessHistory.tsx     # 6-slot guess display (correct/wrong/skipped)
│   ├── ActionButtons.tsx    # Skip button
│   ├── ModeSelector.tsx     # Daily / Artist / Playlist tabs
│   ├── ArtistInput.tsx      # Artist search + Spotify URL support
│   ├── PlaylistInput.tsx    # Spotify playlist URL input
│   ├── ResultsModal.tsx     # Win/loss modal with share grid
│   ├── StatsModal.tsx       # Games played, win %, streaks, distribution
│   └── HowToPlayModal.tsx   # First-visit tutorial
├── stores/
│   ├── gameStore.ts         # Game state + API orchestration (Zustand)
│   ├── statsStore.ts        # Player statistics (localStorage-persisted)
│   └── dailyResultStore.ts  # Completed daily game persistence
├── lib/
│   ├── api.ts               # Axios instance + typed API calls
│   ├── discord.ts           # Discord Activity SDK integration
│   └── imageUrl.ts          # Spotify CDN → proxy URL rewriter
├── utils/
│   └── share.ts             # Emoji grid generation + clipboard copy
├── App.tsx                  # Root component + modal management
├── main.tsx                 # Entry point (Discord init)
└── index.css                # Tailwind + custom animations + theme
```

## Key Features

- **Progressive clips**: 1s → 2s → 4s → 7s → 11s → 16s (6 attempts max)
- **Keyboard navigation**: Arrow keys + Enter in search dropdowns
- **Share results**: Emoji grid copied to clipboard (or Discord share dialog)
- **Offline stats**: Win rate, streaks, and guess distribution stored in localStorage
- **Discord Activity**: Rich presence updates, in-app share, daily result reporting
- **Dark glass-morphism UI**: Blur effects, gradients, smooth animations
