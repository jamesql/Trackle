import { useState, useRef, useEffect, useCallback } from 'react';
import { useGameStore } from '../stores/gameStore';
import { searchArtists } from '../lib/api';
import type { ArtistSummary } from '../lib/api';

function extractArtistId(input: string): string | null {
  const urlMatch = input.match(/spotify\.com\/artist\/([a-zA-Z0-9]+)/);
  if (urlMatch) return urlMatch[1];
  const uriMatch = input.match(/spotify:artist:([a-zA-Z0-9]+)/);
  if (uriMatch) return uriMatch[1];
  if (/^[a-zA-Z0-9]{22}$/.test(input.trim())) return input.trim();
  return null;
}

export default function ArtistInput() {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<ArtistSummary[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const startArtistGame = useGameStore((s) => s.startArtistGame);
  const gameStatus = useGameStore((s) => s.gameStatus);

  const doSearch = useCallback(async (q: string) => {
    // If it looks like a URL/ID, don't search
    if (extractArtistId(q)) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    if (q.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setIsSearching(true);
    try {
      const artists = await searchArtists(q);
      setResults(artists);
      setIsOpen(artists.length > 0);
      setSelectedIndex(-1);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleChange = (value: string) => {
    setInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => doSearch(value), 300);
  };

  const handleSelect = (artist: ArtistSummary) => {
    setInput(artist.name);
    setResults([]);
    setIsOpen(false);
    startArtistGame(artist.artistId);
  };

  const handleSubmit = () => {
    // If there's a URL/ID pasted, use it directly
    const artistId = extractArtistId(input);
    if (artistId) {
      startArtistGame(artistId);
      return;
    }
    // If dropdown is open and something is selected, use that
    if (isOpen && selectedIndex >= 0 && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
      return;
    }
    // If there are results, pick the first one
    if (results.length > 0) {
      handleSelect(results[0]);
      return;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
      return;
    }
    if (!isOpen || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (gameStatus === 'playing' || gameStatus === 'won' || gameStatus === 'lost') return null;

  return (
    <div className="relative space-y-2 mb-4 animate-slide-up">
      <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none"
        >
          <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search for an artist or paste Spotify URL..."
          className="w-full pl-11 pr-10 py-3.5 glass rounded-xl text-white text-sm placeholder-white/25 focus:outline-none focus:border-green-500/40 focus:shadow-[0_0_20px_rgba(29,185,84,0.08)] transition-all duration-300"
        />
        {isSearching && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-white/10 border-t-green-400 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 glass rounded-xl overflow-hidden shadow-2xl shadow-black/50 animate-scale-in"
        >
          {results.map((artist, i) => (
            <button
              key={artist.artistId}
              onClick={() => handleSelect(artist)}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all duration-150 ${
                i === selectedIndex
                  ? 'bg-white/10'
                  : 'hover:bg-white/[0.06]'
              } ${i > 0 ? 'border-t border-white/5' : ''}`}
            >
              {artist.imageUrl ? (
                <img
                  src={artist.imageUrl}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0 shadow-md"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-white/30 text-lg">🎤</span>
                </div>
              )}
              <div className="min-w-0">
                <div className="text-sm font-medium text-white/90 truncate">{artist.name}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
