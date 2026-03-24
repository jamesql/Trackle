import { useGameStore } from '../stores/gameStore';

const modes = [
  { key: 'daily' as const, label: 'Daily', icon: '☀️' },
  { key: 'artist' as const, label: 'Artist', icon: '🎤' },
  { key: 'playlist' as const, label: 'Playlist', icon: '📋' },
];

export default function ModeSelector() {
  const mode = useGameStore((s) => s.mode);
  const setMode = useGameStore((s) => s.setMode);

  return (
    <div className="flex gap-2 my-2">
      {modes.map((m) => (
        <button
          key={m.key}
          onClick={() => setMode(m.key)}
          className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
            mode === m.key
              ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 text-green-400 shadow-[0_0_20px_rgba(29,185,84,0.1)]'
              : 'glass text-white/40 hover:text-white/70 hover:bg-white/[0.08]'
          }`}
        >
          <span className="mr-1.5">{m.icon}</span>
          {m.label}
        </button>
      ))}
    </div>
  );
}
