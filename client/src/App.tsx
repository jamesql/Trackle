import { useEffect, useState } from 'react';
import Header from './components/Header';
import ModeSelector from './components/ModeSelector';
import ArtistInput from './components/ArtistInput';
import PlaylistInput from './components/PlaylistInput';
import GameBoard from './components/GameBoard';
import ResultsModal from './components/ResultsModal';
import StatsModal from './components/StatsModal';
import HowToPlayModal from './components/HowToPlayModal';
import { useGameStore } from './stores/gameStore';

export default function App() {
  const mode = useGameStore((s) => s.mode);
  const startDaily = useGameStore((s) => s.startDaily);
  const gameStatus = useGameStore((s) => s.gameStatus);
  const previewUrl = useGameStore((s) => s.previewUrl);

  const [statsOpen, setStatsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(() => {
    return !localStorage.getItem('trackle-help-seen');
  });

  const handleCloseHelp = () => {
    setHelpOpen(false);
    localStorage.setItem('trackle-help-seen', '1');
  };

  useEffect(() => {
    if (mode === 'daily' && gameStatus === 'idle') {
      startDaily();
    }
  }, [mode, gameStatus, startDaily]);

  // If won/lost but no previewUrl, this is a restored daily result — only show the results card
  const isRestoredResult = (gameStatus === 'won' || gameStatus === 'lost') && !previewUrl;
  const showGameBoard = !isRestoredResult && (gameStatus === 'playing' || gameStatus === 'loading');

  return (
    <div className="max-w-lg mx-auto px-4 pb-6 h-dvh overflow-y-auto">
      <Header onStatsClick={() => setStatsOpen(true)} onHelpClick={() => setHelpOpen(true)} />
      <ModeSelector />

      {mode === 'artist' && <ArtistInput />}
      {mode === 'playlist' && <PlaylistInput />}

      {showGameBoard && <GameBoard />}

      {(gameStatus === 'won' || gameStatus === 'lost') && <ResultsModal isRestored={isRestoredResult} />}

      {gameStatus === 'error' && <GameBoard />}

      <StatsModal isOpen={statsOpen} onClose={() => setStatsOpen(false)} />
      <HowToPlayModal isOpen={helpOpen} onClose={handleCloseHelp} />
    </div>
  );
}
