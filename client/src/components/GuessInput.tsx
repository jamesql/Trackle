import { useState, useRef, useEffect, useCallback } from 'react';
import { useGameStore, searchTracksForGuess } from '../stores/gameStore';
import type { TrackSummary } from '../lib/api';

export default function GuessInput() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TrackSummary[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const gameStatus = useGameStore((s) => s.gameStatus);
  const submitGuess = useGameStore((s) => s.submitGuess);

  const doSearch = useCallback(
    async (q: string) => {
      if (q.trim().length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }
      setIsSearching(true);
      try {
        const tracks = await searchTracksForGuess(q);
        setResults(tracks);
        setIsOpen(tracks.length > 0);
        setSelectedIndex(-1);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => doSearch(value), 300);
  };

  const handleSelect = (track: TrackSummary) => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    submitGuess(track);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

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

  const isDisabled = gameStatus !== 'playing';

  return (
    <div className="relative">
      <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none"
        >
          <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
          placeholder={isDisabled ? 'Game over' : 'Search for a song...'}
          className="w-full pl-11 pr-10 py-3.5 glass rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-green-500/40 focus:shadow-[0_0_20px_rgba(29,185,84,0.08)] transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
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
          className="absolute z-10 w-full mt-2 glass rounded-xl overflow-hidden shadow-2xl shadow-black/50 animate-scale-in"
        >
          {results.map((track, i) => (
            <button
              key={track.trackId}
              onClick={() => handleSelect(track)}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all duration-150 ${
                i === selectedIndex
                  ? 'bg-white/10'
                  : 'hover:bg-white/[0.06]'
              } ${i > 0 ? 'border-t border-white/5' : ''}`}
            >
              {track.albumArt && (
                <img
                  src={track.albumArt}
                  alt=""
                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0 shadow-md"
                />
              )}
              <div className="min-w-0">
                <div className="text-sm font-medium text-white/90 truncate">{track.title}</div>
                <div className="text-xs text-white/35 truncate">{track.artist}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
