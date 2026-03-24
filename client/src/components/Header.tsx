interface HeaderProps {
  onStatsClick?: () => void;
  onHelpClick?: () => void;
}

export default function Header({ onStatsClick, onHelpClick }: HeaderProps) {
  return (
    <header className="flex items-center justify-between py-3">
      <button
        onClick={onHelpClick}
        className="w-10 h-10 flex items-center justify-center rounded-xl glass glass-hover transition-all duration-200 text-white/40 hover:text-white/80"
        aria-label="How to play"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm11.378-3.917c-.89-.777-2.366-.777-3.255 0a.75.75 0 01-.988-1.129c1.454-1.272 3.776-1.272 5.23 0 1.513 1.324 1.513 3.518 0 4.842a3.75 3.75 0 01-.837.552c-.676.37-1.028.768-1.028 1.152v.75a.75.75 0 01-1.5 0v-.75c0-1.279 1.06-1.972 1.676-2.31.236-.13.445-.298.615-.497.713-.623.713-1.587 0-2.21zM12 17.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
        </svg>
      </button>

      <div className="text-center">
        <h1 className="text-2xl font-black tracking-[0.25em] bg-gradient-to-r from-green-400 via-emerald-300 to-teal-400 bg-clip-text text-transparent">
          TRACKLE
        </h1>
        <div className="text-[10px] font-medium tracking-[0.3em] text-white/20 uppercase mt-0.5">
          Guess the track
        </div>
      </div>

      <button
        onClick={onStatsClick}
        className="w-10 h-10 flex items-center justify-center rounded-xl glass glass-hover transition-all duration-200 text-white/40 hover:text-white/80"
        aria-label="Statistics"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 01-1.875-1.875V8.625zM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 013 19.875v-6.75z" />
        </svg>
      </button>
    </header>
  );
}
