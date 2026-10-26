import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  Gauge,
  Keyboard,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface AudioPlayerProps {
  audioUrl?: string;
  title?: string;
  autoPlay?: boolean;
  examMode?: boolean;
  locked?: boolean;
  onStarted?: () => void;
  onEnded?: () => void;
}

const PLAYBACK_RATES = [0.5, 0.6, 0.75, 0.9, 1, 1.25, 1.5, 2];
const SEEK_SECONDS = 5;
const MIN_RATE = 0.5;
const MAX_RATE = 2.0;
const RATE_STEP = 0.05;
const PLAYBACK_RATE_STORAGE_KEY = 'toeic_audio_playback_rate';

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  autoPlay = false,
  examMode = false,
  locked = false,
  onStarted,
  onEnded,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(() => {
    if (examMode) return 1;
    try {
      const saved = Number(localStorage.getItem(PLAYBACK_RATE_STORAGE_KEY));
      if (Number.isFinite(saved) && saved >= MIN_RATE && saved <= MAX_RATE) {
        return Number(saved.toFixed(2));
      }
    } catch {
      // ignore
    }
    return 1;
  });
  const [isSpeedOpen, setIsSpeedOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speedPopoverRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setHasError(false);
    setHasStarted(false);
    setHasEnded(false);
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = examMode ? 1 : playbackRate;
  }, [audioUrl, examMode, playbackRate]);

  useEffect(() => {
    if (!isSpeedOpen) return undefined;
    const handleClickOutside = (event: MouseEvent) => {
      if (speedPopoverRef.current && !speedPopoverRef.current.contains(event.target as Node)) {
        setIsSpeedOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSpeedOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isSpeedOpen]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl || !autoPlay || locked) return undefined;

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
  }, [audioUrl, autoPlay, locked]);

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
    if (!audio || !audioUrl || hasError || locked || (examMode && hasStarted)) return;

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
    audio.playbackRate = examMode ? 1 : playbackRate;
    setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    seekTo(Number(event.target.value));
  };

  const applyPlaybackRate = (rawRate: number) => {
    const clamped = Math.min(MAX_RATE, Math.max(MIN_RATE, Number(rawRate.toFixed(2))));
    if (audioRef.current) {
      audioRef.current.playbackRate = clamped;
    }
    setPlaybackRate(clamped);
    try {
      localStorage.setItem(PLAYBACK_RATE_STORAGE_KEY, String(clamped));
    } catch {
      // ignore
    }
  };

  const formatRate = (rate: number) => `${Number(rate.toFixed(2))}x`;

  useEffect(() => {
    if (examMode) return undefined;
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
  }, [examMode, hasError, audioUrl]);

  const formatTime = (timeInSeconds: number) => {
    if (!Number.isFinite(timeInSeconds)) return '00:00';
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const progress = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;

  return (
    <section
      aria-label={examMode ? 'Listening audio player' : 'Trình phát âm thanh'}
      className="relative rounded-3xl border border-slate-200/80 bg-surface shadow-sm dark:border-line"
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        autoPlay={autoPlay}
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleLoadedMetadata}
        onError={handleAudioError}
        onPlaying={() => {
          setIsPlaying(true);
          if (!hasStarted) {
            setHasStarted(true);
            onStarted?.();
          }
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(duration);
          setHasEnded(true);
          onEnded?.();
        }}
      />

      {examMode ? (
        <div className="flex min-h-24 items-center justify-between gap-4 p-4 sm:p-5">
          <div className="min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">
              Listening · played once only
            </div>
            <h3 className="mt-1 truncate text-sm font-bold text-content"></h3>
            <p className="mt-1 text-xs font-medium text-content-muted" aria-live="polite">
              {hasError
                ? 'The audio could not be loaded. Check your connection before continuing.'
                : locked || hasEnded
                  ? 'The audio has ended.'
                  : isPlaying
                    ? 'Audio is playing. Pause, replay, seeking, and speed controls are disabled.'
                    : 'If autoplay was blocked, select Play Audio to begin.'}
            </p>
          </div>
          {!locked && !hasEnded && !isPlaying && !hasStarted && (
            <button
              type="button"
              onClick={togglePlay}
              disabled={!audioUrl || hasError}
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-extrabold text-brand-ink transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play className="size-4 fill-current" /> Play Audio
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-4 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-300">
                  Listening audio
                </div>
                <h3 className="truncate text-sm font-bold text-slate-800 dark:text-content"></h3>
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
                <div className="relative" ref={speedPopoverRef}>
                  <button
                    type="button"
                    onClick={() => setIsSpeedOpen((prev) => !prev)}
                    aria-expanded={isSpeedOpen}
                    aria-label="Điều chỉnh tốc độ phát"
                    title="Điều chỉnh tốc độ phát âm thanh"
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                      isSpeedOpen || playbackRate !== 1
                        ? 'border-brand-300 bg-brand-50/80 text-brand-800 dark:border-brand-700/60 dark:bg-brand-950/40 dark:text-brand-200'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 dark:border-line dark:bg-surface-elevated dark:text-content-muted'
                    }`}
                  >
                    <Gauge className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                    <span className="hidden sm:inline">Tốc độ</span>
                    <span className="font-mono font-extrabold text-slate-900 dark:text-content">
                      {formatRate(playbackRate)}
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${
                        isSpeedOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isSpeedOpen && (
                    <div className="absolute right-0 bottom-full z-50 mb-2 w-72 rounded-2xl border border-line bg-surface p-3.5 shadow-xl">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-content">
                          Tốc độ phát âm thanh
                        </span>
                        <div className="flex items-center gap-1.5">
                          {playbackRate !== 1 && (
                            <button
                              type="button"
                              onClick={() => applyPlaybackRate(1)}
                              className="rounded-lg border border-line bg-surface-elevated px-2 py-0.5 text-[10px] font-bold text-content-muted transition hover:bg-surface-hover hover:text-content"
                            >
                              Mặc định (1x)
                            </button>
                          )}
                          <span className="rounded-lg bg-brand/15 px-2 py-0.5 font-mono text-xs font-black text-brand-700 dark:text-brand-300">
                            {formatRate(playbackRate)}
                          </span>
                        </div>
                      </div>

                      {/* Thanh trượt điều chỉnh tốc độ tuỳ thích */}
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => applyPlaybackRate(playbackRate - RATE_STEP)}
                          disabled={playbackRate <= MIN_RATE}
                          aria-label="Giảm tốc độ 0.05x"
                          title="Giảm 0.05x"
                          className="grid size-7 shrink-0 place-items-center rounded-lg border border-line bg-surface-elevated text-content-muted transition hover:bg-surface-hover hover:text-content disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Minus className="size-3.5" />
                        </button>

                        <input
                          type="range"
                          min={MIN_RATE}
                          max={MAX_RATE}
                          step={RATE_STEP}
                          value={playbackRate}
                          onChange={(e) => applyPlaybackRate(Number(e.target.value))}
                          aria-label="Thanh trượt điều chỉnh tốc độ phát"
                          className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-200 accent-brand-600 dark:bg-slate-700 dark:accent-brand-400"
                        />

                        <button
                          type="button"
                          onClick={() => applyPlaybackRate(playbackRate + RATE_STEP)}
                          disabled={playbackRate >= MAX_RATE}
                          aria-label="Tăng tốc độ 0.05x"
                          title="Tăng 0.05x"
                          className="grid size-7 shrink-0 place-items-center rounded-lg border border-line bg-surface-elevated text-content-muted transition hover:bg-surface-hover hover:text-content disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>

                      <div className="mt-1 flex justify-between px-1 font-mono text-[10px] font-semibold text-content-muted">
                        <span>0.5x (Chậm)</span>
                        <span>1.0x (Chuẩn)</span>
                        <span>2.0x (Nhanh)</span>
                      </div>

                      {/* Các mức chọn nhanh */}
                      <div className="mt-3 border-t border-line pt-2.5">
                        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-content-muted">
                          Mức chọn nhanh
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {PLAYBACK_RATES.map((rate) => {
                            const isActive = Math.abs(playbackRate - rate) < 0.01;
                            return (
                              <button
                                key={rate}
                                type="button"
                                onClick={() => applyPlaybackRate(rate)}
                                className={`flex items-center justify-center rounded-xl border py-1.5 font-mono text-xs font-bold transition ${
                                  isActive
                                    ? 'border-brand bg-brand text-brand-ink shadow-xs font-extrabold'
                                    : 'border-line bg-surface-elevated text-content-muted hover:border-brand/40 hover:text-content'
                                }`}
                              >
                                {rate}x
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowShortcuts(value => !value)}
                  aria-expanded={showShortcuts}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${showShortcuts
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
        </>
      )}
    </section>
  );
};
