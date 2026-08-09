import React, { useEffect, useRef, useState } from 'react';
import {
  Gauge,
  Keyboard,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface AudioPlayerProps {
  audioUrl?: string;
  title?: string;
  autoPlay?: boolean;
}

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2];
const SEEK_SECONDS = 5;

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  title = 'Bài nghe TOEIC',
  autoPlay = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [hasError, setHasError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setHasError(false);
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl || !autoPlay) return undefined;

    let cancelled = false;
    audio.currentTime = 0;
    void audio.play().catch((error) => {
      if (!cancelled) {
        // Autoplay can be rejected before the browser has received a user
        // gesture. This is not a broken media file, so keep manual play usable.
        console.warn('[!] Audio autoplay was blocked:', error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [audioUrl, autoPlay]);

  // Read the media clock every animation frame so the progress indicator does
  // not jump between the browser's relatively sparse `timeupdate` events.
  useEffect(() => {
    const updateProgress = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    };

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  const handleAudioError = () => {
    console.warn('[!] Audio play error on:', audioUrl);
    setHasError(true);
    setIsPlaying(false);
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl || hasError) return;

    if (audio.paused) {
      audio.play().catch((error) => {
        console.warn('[!] Audio play failed:', error);
        handleAudioError();
      });
    } else {
      audio.pause();
    }
  };

  const seekTo = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextTime = Math.min(Math.max(time, 0), Number.isFinite(audio.duration) ? audio.duration : 0);
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const seekBy = (amount: number) => {
    if (!audioRef.current) return;
    seekTo(audioRef.current.currentTime + amount);
  };

  const handleRestart = () => {
    seekTo(0);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setIsMuted(audio.muted);
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    seekTo(Number(event.target.value));
  };

  const handleRateChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextRate = Number(event.target.value);
    if (audioRef.current) audioRef.current.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.tagName === 'BUTTON' ||
        target?.isContentEditable;
      if (isTyping || event.ctrlKey || event.metaKey || event.altKey) return;

      const key = event.key.toLowerCase();
      if (event.code === 'Space') {
        event.preventDefault();
        togglePlay();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        seekBy(event.shiftKey ? -10 : -SEEK_SECONDS);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        seekBy(event.shiftKey ? 10 : SEEK_SECONDS);
      } else if (key === 'm') {
        toggleMute();
      } else if (key === 'r') {
        handleRestart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const formatTime = (timeInSeconds: number) => {
    if (!Number.isFinite(timeInSeconds)) return '00:00';
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const progress = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;

  return (
    <section
      aria-label="Trình phát âm thanh"
      className="overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-brand-50/70 shadow-sm dark:border-line dark:from-slate-800 dark:to-slate-900"
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        autoPlay={autoPlay}
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleLoadedMetadata}
        onError={handleAudioError}
        onPlaying={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(duration);
        }}
      />

      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-300">
              Listening audio
            </div>
            <h3 className="truncate text-sm font-bold text-slate-800 dark:text-content">{title}</h3>
            {hasError && (
              <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                Không thể tải âm thanh. Vui lòng kiểm tra kết nối và thử lại.
              </p>
            )}
          </div>
          <span className="shrink-0 rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-xs font-bold text-white dark:bg-surface-hover">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.01"
          value={Math.min(currentTime, duration || 0)}
          onChange={handleSeek}
          disabled={!duration}
          aria-label="Tua đến vị trí trong bài nghe"
          className="audio-progress w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: `linear-gradient(to right, #ffc72c ${progress}%, #cbd5e1 ${progress}%)` }}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => seekBy(-SEEK_SECONDS)}
              disabled={!duration}
              title={`Tua lùi ${SEEK_SECONDS} giây (←)`}
              aria-label={`Tua lùi ${SEEK_SECONDS} giây`}
              className="audio-control"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="text-[10px] font-black">{SEEK_SECONDS}</span>
            </button>

            <button
              type="button"
              onClick={togglePlay}
              disabled={!audioUrl || hasError}
              aria-label={isPlaying ? 'Tạm dừng bài nghe' : 'Phát bài nghe'}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-brand-ink shadow-lg shadow-brand-600/25 transition hover:bg-brand-hover hover:shadow-brand-600/35 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
            </button>

            <button
              type="button"
              onClick={() => seekBy(SEEK_SECONDS)}
              disabled={!duration}
              title={`Tua tới ${SEEK_SECONDS} giây (→)`}
              aria-label={`Tua tới ${SEEK_SECONDS} giây`}
              className="audio-control"
            >
              <RotateCw className="h-4 w-4" />
              <span className="text-[10px] font-black">{SEEK_SECONDS}</span>
            </button>

            <button
              type="button"
              onClick={toggleMute}
              title="Bật hoặc tắt tiếng (M)"
              aria-label={isMuted ? 'Bật tiếng' : 'Tắt tiếng'}
              className="audio-control ml-1"
            >
              {isMuted ? <VolumeX className="h-4 w-4 text-red-500" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-600 dark:border-line dark:bg-surface-elevated dark:text-content-muted">
              <Gauge className="h-4 w-4 text-brand-600" />
              <span className="sr-only sm:not-sr-only">Tốc độ</span>
              <select
                value={playbackRate}
                onChange={handleRateChange}
                aria-label="Tốc độ phát"
                className="cursor-pointer bg-transparent font-bold text-slate-800 outline-none dark:text-content"
              >
                {PLAYBACK_RATES.map(rate => (
                  <option key={rate} value={rate}>{rate}x</option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => setShowShortcuts(value => !value)}
              aria-expanded={showShortcuts}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                showShortcuts
                  ? 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-950/50 dark:text-brand-200'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 dark:border-line dark:bg-surface-elevated dark:text-content-muted'
              }`}
            >
              <Keyboard className="h-4 w-4" />
              <span className="hidden sm:inline">Phím tắt</span>
            </button>
          </div>
        </div>
      </div>

      {showShortcuts && (
        <div className="grid grid-cols-2 gap-x-5 gap-y-2 border-t border-slate-200/80 bg-white/70 px-5 py-3 text-[11px] text-slate-600 dark:border-line dark:bg-surface/50 dark:text-content-muted sm:grid-cols-4">
          <span><kbd>Space</kbd> Phát / dừng</span>
          <span><kbd>←</kbd> <kbd>→</kbd> Tua 5 giây</span>
          <span><kbd>Shift</kbd> + <kbd>←</kbd>/<kbd>→</kbd> Tua 10 giây</span>
          <span><kbd>M</kbd> Tắt / bật tiếng · <kbd>R</kbd> Về đầu</span>
        </div>
      )}
    </section>
  );
};
