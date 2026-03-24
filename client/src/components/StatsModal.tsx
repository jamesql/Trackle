import { useStatsStore } from '../stores/statsStore';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StatsModal({ isOpen, onClose }: StatsModalProps) {
  const stats = useStatsStore();

  if (!isOpen) return null;

  const winPct = stats.gamesPlayed > 0
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
    : 0;

  const distribution = stats.guessDistribution ?? [0, 0, 0, 0, 0, 0];
  const maxDistribution = Math.max(...distribution, 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative glass rounded-3xl p-6 sm:p-8 w-full max-w-sm space-y-6 animate-scale-in shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Statistics</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-all duration-200"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { value: stats.gamesPlayed, label: 'Played' },
            { value: winPct, label: 'Win %' },
            { value: stats.currentStreak, label: 'Streak' },
            { value: stats.maxStreak, label: 'Best' },
          ].map((stat) => (
            <div key={stat.label} className="text-center glass rounded-xl py-3">
              <div className="text-2xl font-black text-white">{stat.value}</div>
              <div className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Guess distribution */}
        <div>
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Guess Distribution</h3>
          <div className="space-y-1.5">
            {(stats.guessDistribution ?? [0, 0, 0, 0, 0, 0]).map((count, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className="text-xs font-bold text-white/30 w-3 text-right">{i + 1}</span>
                <div className="flex-1 h-6 relative">
                  <div
                    className={`h-full rounded-md flex items-center justify-end px-2 transition-all duration-500 ${
                      count > 0
                        ? 'bg-gradient-to-r from-green-500/30 to-emerald-500/20 border border-green-500/15'
                        : 'bg-white/5'
                    }`}
                    style={{
                      width: `${Math.max((count / maxDistribution) * 100, 10)}%`,
                    }}
                  >
                    <span className="text-[11px] font-bold text-white/60">{count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
