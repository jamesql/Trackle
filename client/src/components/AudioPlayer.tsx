import { useCallback, useEffect, useRef, useState } from 'react';
import { Howl } from 'howler';
import { useGameStore } from '../stores/gameStore';

export default function AudioPlayer() {
  const previewUrl = useGameStore((s) => s.previewUrl);
  const currentAttempt = useGameStore((s) => s.currentAttempt);
  const clipDurations = useGameStore((s) => s.clipDurations);
  const gameStatus = useGameStore((s) => s.gameStatus);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const howlRef = useRef<Howl | null>(null);
  const timerRef = useRef<number | null>(null);
  const progressRef = useRef<number | null>(null);

  const durations = clipDurations ?? [1, 2, 4, 7, 11, 16];
  const clipDuration = durations[Math.min(currentAttempt, durations.length - 1)];
  const maxDuration = durations[durations.length - 1];

  useEffect(() => {
    if (!previewUrl) {
      setReady(false);
      return;
    }

    howlRef.current?.unload();
    setReady(false);

    const sound = new Howl({
      src: [previewUrl],
      format: ['mp3'],
      html5: true,
      preload: true,
      onload: () => setReady(true),
      onloaderror: () => setReady(false),
    });

    howlRef.current = sound;

    return () => {
      sound.unload();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressRef.current) cancelAnimationFrame(progressRef.current);
    };
  }, [previewUrl]);

  const stopPlayback = useCallback(() => {
    howlRef.current?.stop();
    setIsPlaying(false);
    setProgress(0);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressRef.current) cancelAnimationFrame(progressRef.current);
  }, []);

  const play = useCallback(() => {
    const sound = howlRef.current;
    if (!sound || !ready) return;

    stopPlayback();
    sound.seek(0);
    sound.play();
    setIsPlaying(true);

    timerRef.current = window.setTimeout(() => {
      sound.stop();
      setIsPlaying(false);
      setProgress(0);
    }, clipDuration * 1000);

    const startTime = Date.now();
    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const pct = Math.min(elapsed / clipDuration, 1);
      setProgress(pct);
      if (pct < 1) {
        progressRef.current = requestAnimationFrame(animate);
      }
    };
    progressRef.current = requestAnimationFrame(animate);
  }, [ready, clipDuration, stopPlayback]);

  // Current playback position as fraction of maxDuration
  const playheadPct = isPlaying ? (progress * clipDuration / maxDuration) * 100 : 0;
  // How far the unlocked region extends
  const unlockedPct = (clipDuration / maxDuration) * 100;

  return (
    <div className="glass rounded-2xl p-4 space-y-3 animate-slide-up">
      {/* Timeline */}
      <div className="relative pt-4 pb-0.5">
        {/* Tick marks + labels above the bar */}
        {durations.map((d, i) => (
          <div
            key={i}
            className="absolute top-0 flex flex-col items-center -translate-x-1/2"
            style={{ left: `${(d / maxDuration) * 100}%` }}
          >
            <span className={`text-[10px] font-semibold tabular-nums ${
              i <= currentAttempt ? 'text-white/40' : 'text-white/15'
            }`}>
              {d}s
            </span>
          </div>
        ))}
        {/* 0s label at start */}
        <div className="absolute top-0 left-0 flex flex-col items-center">
          <span className="text-[10px] font-semibold text-white/40 tabular-nums">0s</span>
        </div>

        {/* Bar */}
        <div className="relative h-2 rounded-full bg-white/5 overflow-hidden mt-1">
          {/* Segment dividers */}
          {durations.slice(0, -1).map((d, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-px bg-white/10 z-10"
              style={{ left: `${(d / maxDuration) * 100}%` }}
            />
          ))}

          {/* Unlocked region */}
          <div
            className="absolute inset-y-0 left-0 bg-white/10 rounded-full transition-all duration-500"
            style={{ width: `${unlockedPct}%` }}
          />

          {/* Playback progress */}
          {isPlaying && (
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full progress-glow"
              style={{ width: `${playheadPct}%`, transition: 'none' }}
            />
          )}
        </div>
      </div>

      {/* Play button */}
      <div className="flex justify-center pt-0.5">
        <div className="relative">
          {isPlaying && <div className="absolute inset-0 rounded-full pulse-ring" />}
          <button
            onClick={isPlaying ? stopPlayback : play}
            disabled={!ready || gameStatus !== 'playing'}
            className={`relative w-14 h-14 flex items-center justify-center rounded-full transition-all duration-300 ${
              ready && gameStatus === 'playing'
                ? 'bg-gradient-to-br from-green-400 to-emerald-500 glow-green hover:scale-105 active:scale-95'
                : 'bg-white/10 cursor-not-allowed'
            }`}
            aria-label={isPlaying ? 'Stop' : 'Play'}
          >
            {!ready && gameStatus === 'playing' ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-black">
                <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-black ml-0.5">
                <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
