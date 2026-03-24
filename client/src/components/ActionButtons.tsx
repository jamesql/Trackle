import { useGameStore } from '../stores/gameStore';

export default function ActionButtons() {
  const skip = useGameStore((s) => s.skip);
  const gameStatus = useGameStore((s) => s.gameStatus);

  return (
    <div className="flex justify-center">
      <button
        onClick={skip}
        disabled={gameStatus !== 'playing'}
        className="px-8 py-2.5 text-sm font-semibold text-white/40 glass rounded-xl hover:text-white/70 hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
      >
        Skip →
      </button>
    </div>
  );
}
