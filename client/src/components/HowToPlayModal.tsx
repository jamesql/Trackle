interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HowToPlayModal({ isOpen, onClose }: HowToPlayModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative glass rounded-3xl p-6 sm:p-8 w-full max-w-sm space-y-5 animate-scale-in shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">How to Play</h2>
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

        <div className="space-y-4 text-sm text-white/50 leading-relaxed">
          <p className="text-white/70">
            Listen to a song clip and try to guess what it is. You have <span className="text-white font-semibold">6 attempts</span>.
          </p>

          <div>
            <p className="text-white/30 text-xs font-bold uppercase tracking-wider mb-2">Clip lengths</p>
            <div className="flex gap-1.5">
              {[1, 2, 4, 7, 11, 16].map((d) => (
                <div key={d} className="flex-1 glass rounded-lg py-2 text-center text-xs font-bold text-white/40">
                  {d}s
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            {[
              { icon: '☀️', title: 'Daily', desc: 'A new song every day — same for everyone' },
              { icon: '🎤', title: 'Artist', desc: 'Paste a Spotify artist link to guess their songs' },
              { icon: '📋', title: 'Playlist', desc: 'Paste a Spotify playlist link to guess from it' },
            ].map((m) => (
              <div key={m.title} className="flex items-start gap-3 glass rounded-xl p-3">
                <span className="text-lg mt-0.5">{m.icon}</span>
                <div>
                  <div className="text-xs font-bold text-white/70">{m.title}</div>
                  <div className="text-xs text-white/35 mt-0.5">{m.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
