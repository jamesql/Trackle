import { useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { generateShareText, copyShareText } from '../utils/share';
import { proxyImageUrl } from '../lib/imageUrl';
import { isInDiscord, shareResults } from '../lib/discord';

interface ResultsModalProps {
  isRestored?: boolean;
}

export default function ResultsModal({ isRestored = false }: ResultsModalProps) {
  const gameStatus = useGameStore((s) => s.gameStatus);
  const answer = useGameStore((s) => s.answer);
  const guesses = useGameStore((s) => s.guesses);
  const gameId = useGameStore((s) => s.gameId);
  const mode = useGameStore((s) => s.mode);
  const resetGame = useGameStore((s) => s.resetGame);

  const [copied, setCopied] = useState(false);

  if (gameStatus !== 'won' && gameStatus !== 'lost') return null;
  if (!answer || !gameId) return null;

  const won = gameStatus === 'won';

  const handleShare = async () => {
    const text = generateShareText(gameId, guesses, won);

    // Use Discord's native share when inside an Activity
    if (isInDiscord()) {
      const shared = await shareResults(text);
      if (shared) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        return;
      }
    }

    // Fallback: copy to clipboard
    const success = await copyShareText(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePlayAgain = () => {
    resetGame();
  };

  // Build the emoji grid visually
  const emojiGrid = Array.from({ length: 6 }, (_, i) => {
    const entry = guesses[i];
    if (!entry) return 'empty';
    if (entry.type === 'skipped') return 'skipped';
    if (entry.type === 'wrong') return 'wrong';
    return 'correct';
  });

  return (
    <div className="animate-scale-in mt-6">
      <div className="relative overflow-hidden rounded-3xl">
        {/* Background gradient */}
        <div className={`absolute inset-0 ${
          won
            ? 'bg-gradient-to-br from-green-900/60 via-emerald-900/40 to-teal-900/60'
            : 'bg-gradient-to-br from-red-900/30 via-gray-900/40 to-purple-900/30'
        }`} />
        <div className="absolute inset-0 glass" />

        <div className="relative p-6 sm:p-8 flex flex-col items-center space-y-5">
          {/* "Already played" banner for restored daily */}
          {isRestored && mode === 'daily' && (
            <div className="glass rounded-xl px-4 py-2.5 text-xs font-semibold text-white/50 text-center">
              You already played today's daily challenge — come back tomorrow!
            </div>
          )}

          {/* Status badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
            won
              ? 'bg-green-500/20 text-green-300 border border-green-500/20'
              : 'bg-red-500/15 text-red-300 border border-red-500/15'
          }`}>
            {won ? '🎉 Correct!' : '💔 Not this time'}
          </div>

          {/* Album art with glow */}
          {answer.albumArt && (
            <div className="relative">
              <div className={`absolute inset-0 rounded-2xl blur-2xl opacity-40 ${
                won ? 'bg-green-500' : 'bg-purple-500'
              }`} />
              <img
                src={proxyImageUrl(answer.albumArt)}
                alt={answer.title}
                className="relative w-36 h-36 sm:w-40 sm:h-40 rounded-2xl shadow-2xl shadow-black/50 object-cover"
              />
            </div>
          )}

          {/* Song info */}
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-white leading-tight">{answer.title}</div>
            <div className="text-sm text-white/40 mt-1 font-medium">{answer.artist}</div>
          </div>

          {/* Score */}
          <div className={`text-4xl font-black ${won ? 'text-green-400' : 'text-white/20'}`}>
            {won ? `${guesses.length}/6` : 'X/6'}
          </div>

          {/* Visual emoji grid */}
          <div className="flex justify-center gap-1.5">
            {emojiGrid.map((type, i) => (
              <div
                key={i}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-lg transition-all duration-300 ${
                  type === 'correct'
                    ? 'bg-green-500/30 border border-green-500/30 shadow-[0_0_12px_rgba(29,185,84,0.2)]'
                    : type === 'wrong'
                    ? 'bg-red-500/20 border border-red-500/20'
                    : type === 'skipped'
                    ? 'bg-white/10 border border-white/10'
                    : 'bg-white/[0.03] border border-white/5'
                }`}
              >
                {type === 'correct' ? '🟩' : type === 'wrong' ? '🟥' : type === 'skipped' ? '⬜' : ''}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleShare}
              className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                copied
                  ? 'bg-green-500/20 text-green-300 border border-green-500/20'
                  : 'bg-gradient-to-r from-green-500 to-emerald-500 text-black hover:scale-105 active:scale-95 shadow-lg shadow-green-500/20'
              }`}
            >
              {copied ? '✓ Copied!' : 'Share Results'}
            </button>

            {mode !== 'daily' && (
              <button
                onClick={handlePlayAgain}
                className="px-6 py-3 glass rounded-xl font-semibold text-sm text-white/60 hover:text-white/90 hover:bg-white/[0.08] transition-all duration-200"
              >
                Play Again
              </button>
            )}
          </div>

          {/* Branding for screenshots */}
          <div className="text-[10px] font-medium text-white/15 tracking-widest uppercase pt-1">
            Trackle • {gameId}
          </div>
        </div>
      </div>
    </div>
  );
}
