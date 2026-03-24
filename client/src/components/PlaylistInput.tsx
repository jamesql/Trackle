import { useState } from 'react';
import { useGameStore } from '../stores/gameStore';

function extractPlaylistId(input: string): string | null {
  const urlMatch = input.match(/spotify\.com\/playlist\/([a-zA-Z0-9]+)/);
  if (urlMatch) return urlMatch[1];
  const uriMatch = input.match(/spotify:playlist:([a-zA-Z0-9]+)/);
  if (uriMatch) return uriMatch[1];
  if (/^[a-zA-Z0-9]{22}$/.test(input.trim())) return input.trim();
  return null;
}

export default function PlaylistInput() {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const startPlaylistGame = useGameStore((s) => s.startPlaylistGame);
  const gameStatus = useGameStore((s) => s.gameStatus);

  const handleSubmit = () => {
    const playlistId = extractPlaylistId(input);
    if (!playlistId) {
      setError('Enter a valid Spotify playlist URL or ID');
      return;
    }
    setError('');
    startPlaylistGame(playlistId);
  };

  if (gameStatus === 'playing' || gameStatus === 'won' || gameStatus === 'lost') return null;

  return (
    <div className="space-y-2 mb-4 animate-slide-up">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Paste Spotify playlist URL..."
          className="flex-1 px-4 py-3 glass rounded-xl text-white text-sm placeholder-white/25 focus:outline-none focus:border-green-500/40 focus:shadow-[0_0_20px_rgba(29,185,84,0.08)] transition-all duration-300"
        />
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || gameStatus === 'loading'}
          className="px-5 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-black rounded-xl font-semibold text-sm hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 transition-all duration-200 shadow-lg shadow-green-500/20"
        >
          Play
        </button>
      </div>
      {error && <p className="text-red-400/70 text-xs pl-1">{error}</p>}
    </div>
  );
}
