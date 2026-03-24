import { useGameStore, type GuessEntry } from '../stores/gameStore';

const MAX_ATTEMPTS = 6;

function GuessSlot({ entry, index }: { entry: GuessEntry | null; index: number }) {
  const baseClasses = 'flex items-center h-11 px-4 rounded-xl text-sm transition-all duration-300';

  if (!entry) {
    return (
      <div className={`${baseClasses} border border-white/5 text-white/15`}>
        <span className="w-5 font-semibold text-white/10">{index + 1}</span>
      </div>
    );
  }

  if (entry.type === 'skipped') {
    return (
      <div className={`${baseClasses} bg-white/5 text-white/30 animate-slide-up`}
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <span className="w-5 font-semibold text-white/20">{index + 1}</span>
        <span className="ml-2 italic">Skipped</span>
      </div>
    );
  }

  if (entry.type === 'wrong') {
    return (
      <div className={`${baseClasses} bg-red-500/10 border border-red-500/20 text-red-300/80 animate-slide-up`}
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <span className="w-5 font-semibold text-red-400/50">{index + 1}</span>
        <span className="ml-2 truncate">{entry.track.title}</span>
        <span className="ml-1.5 text-red-400/40 truncate hidden sm:inline">— {entry.track.artist}</span>
      </div>
    );
  }

  return (
    <div className={`${baseClasses} bg-green-500/15 border border-green-500/25 text-green-300 animate-scale-in`}>
      <span className="w-5 font-semibold text-green-400/60">{index + 1}</span>
      <span className="ml-2 truncate font-medium">{entry.track.title}</span>
      <span className="ml-1.5 text-green-400/50 truncate hidden sm:inline">— {entry.track.artist}</span>
    </div>
  );
}

export default function GuessHistory() {
  const guesses = useGameStore((s) => s.guesses) ?? [];
  const slots = Array.from({ length: MAX_ATTEMPTS }, (_, i) => guesses[i] ?? null);

  return (
    <div className="space-y-1.5">
      {slots.map((entry, i) => (
        <GuessSlot key={i} entry={entry} index={i} />
      ))}
    </div>
  );
}
