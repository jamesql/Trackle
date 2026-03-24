import { useGameStore } from '../stores/gameStore';
import AudioPlayer from './AudioPlayer';
import GuessHistory from './GuessHistory';
import GuessInput from './GuessInput';
import ActionButtons from './ActionButtons';

export default function GameBoard() {
  const gameStatus = useGameStore((s) => s.gameStatus);
  const error = useGameStore((s) => s.error);

  if (gameStatus === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-white/5" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-green-400 animate-spin" />
        </div>
        <span className="text-sm text-white/30">Loading song...</span>
      </div>
    );
  }

  if (gameStatus === 'error' && error) {
    return (
      <div className="glass rounded-2xl p-8 text-center my-8 animate-scale-in">
        <div className="text-3xl mb-3">😔</div>
        <div className="text-white/60 text-sm">{error}</div>
      </div>
    );
  }

  const isGameOver = gameStatus === 'won' || gameStatus === 'lost';

  return (
    <div className="space-y-4 py-2">
      <AudioPlayer />
      <GuessHistory />
      {!isGameOver && (
        <div className="space-y-3 animate-fade-in">
          <GuessInput />
          <ActionButtons />
        </div>
      )}
    </div>
  );
}
