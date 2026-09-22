import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  FastForward,
  Flame,
  Gauge,
  Loader2,
  RefreshCw,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Subtitles,
  Volume2,
  VolumeX,
  Youtube,
} from 'lucide-react';
import type { WordTimestamp } from '../../types';
import {
  AutoReplayConfig,
  AutoReplaySettingsModal,
  DEFAULT_AUTO_REPLAY_CONFIG,
} from './AutoReplaySettingsModal';
import { useLanguage } from '../../context/LanguageContext';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

export interface ListeningMediaPlayerHandle {
  seekTo: (seconds: number) => void;
  play: () => void;
  pause: () => void;
  playSegment: (start: number, end: number) => void;
}

export interface ListeningMediaPlayerProps {
  sentenceId?: string;
  audioUrl?: string;
  videoUrl?: string | null;
  autoPlayNext?: boolean;
  onToggleAutoPlayNext?: (val: boolean) => void;
  onSentenceCompleteAudioEnd?: () => void;
  onPreviousSentence?: () => void;
  onNextSentence?: () => void;
  hasPreviousSentence?: boolean;
  hasNextSentence?: boolean;
  startTime?: number;
  endTime?: number | null;
  prevSentenceEndTime?: number | null;
  nextSentenceStartTime?: number | null;
  text?: string;
  words?: WordTimestamp[];
  phoneticUs?: string;
  translationVi?: string;
  className?: string;
  onActiveWordIndexChange?: (index: number) => void;
  onTimeUpdate?: (time: number) => void;
  onIsPlayingChange?: (isPlaying: boolean) => void;
}

export const SHORT_SENTENCE_CONFIG = {
  maxDuration: 1.2, // seconds: ngưỡng câu ngắn
  maxWords: 1, // từ: ngưỡng câu 1 từ
  prePadding: 0.15, // giây: lùi điểm seek về sớm hơn start_time để không mất tiếng đầu
  postBuffer: 0.15, // giây: đệm trễ khi dừng để không cắt cụt âm cuối
  minPostSentenceDelayMs: 1200, // ms: thời gian chờ tối thiểu sau khi audio kết thúc
};

export function isShortSentence(
  startTime?: number,
  endTime?: number | null,
  text?: string,
  words?: WordTimestamp[]
): boolean {
  const duration =
    endTime && startTime !== undefined ? endTime - startTime : 999;
  const wordCount =
    words && words.length > 0
      ? words.length
      : text
      ? text.trim().split(/\s+/).length
      : 999;
  return (
    duration < SHORT_SENTENCE_CONFIG.maxDuration ||
    wordCount <= SHORT_SENTENCE_CONFIG.maxWords
  );
}

type NativeMediaStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'blocked' | 'stalled' | 'error';

interface PendingNativePlayback {
  sourceUrl: string;
  targetTime: number;
  shouldPlay: boolean;
  requestId: number;
}

const MEDIA_STALL_TIMEOUT_MS = 8000;

const isAutoplayBlocked = (error: unknown) => (
  error instanceof DOMException && error.name === 'NotAllowedError'
);

const SPEED_OPTIONS = [
  { value: 0.5, label: '0.5x' },
  { value: 0.75, label: '0.75x' },
  { value: 0.9, label: '0.9x' },
  { value: 1.0, label: '1.0x (Chuẩn)' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
  { value: 1.75, label: '1.75x' },
  { value: 2.0, label: '2.0x' },
];

function getYouTubeId(url?: string | null): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return match[2];
  }
  return null;
}

function loadYouTubeIframeApi(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.YT && window.YT.Player) {
      resolve();
      return;
    }
    const existingScript = document.getElementById('youtube-iframe-api-script');
    if (!existingScript) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
    let elapsed = 0;
    const checkInterval = setInterval(() => {
      elapsed += 50;
      if (window.YT && window.YT.Player) {
        clearInterval(checkInterval);
        resolve();
      } else if (elapsed > 10000) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 50);
  });
}

export const ListeningMediaPlayer = forwardRef<
  ListeningMediaPlayerHandle,
  ListeningMediaPlayerProps
>(
  (
    {
      sentenceId,
      audioUrl,
      videoUrl,
      autoPlayNext = false,
      onToggleAutoPlayNext,
      onSentenceCompleteAudioEnd,
      onPreviousSentence,
      onNextSentence,
      hasPreviousSentence = false,
      hasNextSentence = false,
      startTime = 0,
      endTime = null,
      prevSentenceEndTime = null,
      nextSentenceStartTime = null,
      text,
      words,
      phoneticUs,
      translationVi,
      className = '',
      onActiveWordIndexChange,
      onTimeUpdate,
      onIsPlayingChange,
    },
    ref
  ) => {
  const { language } = useLanguage();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytContainerRef = useRef<HTMLDivElement | null>(null);
  const wordSegmentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingWordSegmentRef = useRef<{ end: number } | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [nativeMediaStatus, setNativeMediaStatus] = useState<NativeMediaStatus>('idle');
  const [nativeRetryCount, setNativeRetryCount] = useState(0);
  const nativeRequestIdRef = useRef(0);
  const pendingNativePlaybackRef = useRef<PendingNativePlayback | null>(null);
  const nativeStallTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onIsPlayingChange?.(isPlaying);
  }, [isPlaying, onIsPlayingChange]);
  const [isYtReady, setIsYtReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(startTime || 0);
  const [isSentenceEnded, setIsSentenceEnded] = useState(false);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);
  const [isVideoExpanded, setIsVideoExpanded] = useState(false);
  const [isKaraokeVisible, setIsKaraokeVisible] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('listening_karaoke_enabled');
      return saved !== 'false';
    } catch {
      return true;
    }
  });

  const youtubeVideoId = useMemo(() => getYouTubeId(videoUrl), [videoUrl]);
  const isYouTube = Boolean(youtubeVideoId);
  const hasWords = Boolean(words && words.length > 0);

  // Nhận diện câu ngắn (duration < 1.2s hoặc số từ <= 1)
  const isShort = useMemo(() => {
    return isShortSentence(startTime, endTime, text, words);
  }, [startTime, endTime, text, words]);

  const prePadding = isShort ? SHORT_SENTENCE_CONFIG.prePadding : 0.08;
  const postBuffer = isShort ? SHORT_SENTENCE_CONFIG.postBuffer : 0.08;

  // Điểm seek an toàn: lùi trước start một khoảng nhỏ, KHÔNG lấn qua end câu trước
  const safeStart = useMemo(() => {
    const rawStart = startTime || 0;
    if (prePadding <= 0) return rawStart;
    const lowerBound =
      prevSentenceEndTime !== null && prevSentenceEndTime !== undefined
        ? prevSentenceEndTime
        : 0;
    return Math.max(lowerBound, rawStart - prePadding);
  }, [startTime, prevSentenceEndTime, prePadding]);

  // Điểm dừng an toàn: cho phép trễ thêm buffer nhỏ trước khi pause, KHÔNG lấn qua start câu kế
  const safeEnd = useMemo(() => {
    if (endTime === null || endTime === undefined) return null;
    if (postBuffer <= 0) return endTime;
    const upperBound =
      nextSentenceStartTime !== null && nextSentenceStartTime !== undefined
        ? nextSentenceStartTime
        : endTime + postBuffer;
    return Math.min(upperBound, endTime + postBuffer);
  }, [endTime, nextSentenceStartTime, postBuffer]);

  // Speed dropdown state & click outside
  const [isSpeedOpen, setIsSpeedOpen] = useState(false);
  const speedDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSpeedOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (speedDropdownRef.current && !speedDropdownRef.current.contains(e.target as Node)) {
        setIsSpeedOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSpeedOpen]);

  // Auto Replay config & modal state
  const [isAutoReplayModalOpen, setIsAutoReplayModalOpen] = useState(false);
  const [autoReplayConfig, setAutoReplayConfig] = useState<AutoReplayConfig>(() => {
    try {
      const saved = localStorage.getItem('listening_auto_replay_config');
      if (saved) {
        return { ...DEFAULT_AUTO_REPLAY_CONFIG, ...JSON.parse(saved) };
      }
    } catch {}
    return {
      ...DEFAULT_AUTO_REPLAY_CONFIG,
      autoAdvance: autoPlayNext ?? false,
    };
  });

  const handleSaveAutoReplayConfig = (newConfig: AutoReplayConfig) => {
    setAutoReplayConfig(newConfig);
    try {
      localStorage.setItem('listening_auto_replay_config', JSON.stringify(newConfig));
    } catch {}
    if (onToggleAutoPlayNext && newConfig.autoAdvance !== autoPlayNext) {
      onToggleAutoPlayNext(newConfig.autoAdvance);
    }
  };

  // Replay loop execution tracking
  const repeatCounterRef = useRef<number>(1);
  const [currentRepeat, setCurrentRepeat] = useState<number>(1);
  const [isWaitingBetweenLoops, setIsWaitingBetweenLoops] = useState<boolean>(false);
  const replayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const seekGraceUntilRef = useRef<number>(0);
  const isFirstMountRef = useRef<boolean>(true);
  const prevSentenceIdRef = useRef<string | undefined>(undefined);
  const prevSentenceStartRef = useRef<number | undefined>(undefined);
  const pendingSeekAndPlayRef = useRef<{ start: number; autoPlay: boolean } | null>(null);
  const prevAudioUrlRef = useRef<string | undefined>(audioUrl);

  // Clear pending loop timeouts when sentence changes or unmount
  useEffect(() => {
    if (replayTimeoutRef.current) {
      clearTimeout(replayTimeoutRef.current);
      replayTimeoutRef.current = null;
    }
    if (wordSegmentTimeoutRef.current) {
      clearTimeout(wordSegmentTimeoutRef.current);
      wordSegmentTimeoutRef.current = null;
    }
    pendingWordSegmentRef.current = null;
    repeatCounterRef.current = 1;
    setCurrentRepeat(1);
    setIsWaitingBetweenLoops(false);

    return () => {
      if (wordSegmentTimeoutRef.current) {
        clearTimeout(wordSegmentTimeoutRef.current);
        wordSegmentTimeoutRef.current = null;
      }
    };
  }, [startTime]);

  const restartCurrentRef = useRef<() => void>(() => {});

  const handleSentenceFinished = useCallback(() => {
    const isInfinite = autoReplayConfig.repeatCount === 0;
    const maxRepeats = autoReplayConfig.repeatCount;
    const currentIteration = repeatCounterRef.current;

    if (isInfinite || currentIteration < maxRepeats) {
      // Cần lặp lại câu này
      const nextIteration = currentIteration + 1;
      repeatCounterRef.current = nextIteration;
      setCurrentRepeat(nextIteration);
      setIsWaitingBetweenLoops(true);

      const delayMs = Math.max(300, autoReplayConfig.delaySeconds * 1000);
      if (replayTimeoutRef.current) clearTimeout(replayTimeoutRef.current);
      replayTimeoutRef.current = setTimeout(() => {
        setIsWaitingBetweenLoops(false);
        restartCurrentRef.current();
      }, delayMs);
    } else {
      // Đã hoàn thành tất cả các lần lặp
      repeatCounterRef.current = 1;
      setCurrentRepeat(1);
      setIsWaitingBetweenLoops(false);
      onSentenceCompleteAudioEnd?.();

      if (autoReplayConfig.autoAdvance && hasNextSentence && onNextSentence) {
        const delayMs = Math.max(500, autoReplayConfig.delaySeconds * 1000);
        if (replayTimeoutRef.current) clearTimeout(replayTimeoutRef.current);
        replayTimeoutRef.current = setTimeout(() => {
          onNextSentence();
        }, delayMs);
      }
    }
  }, [
    autoReplayConfig,
    hasNextSentence,
    onNextSentence,
    onSentenceCompleteAudioEnd,
  ]);

  const handleSentenceFinishedRef = useRef(handleSentenceFinished);
  handleSentenceFinishedRef.current = handleSentenceFinished;

  const safeStartRef = useRef(safeStart);
  safeStartRef.current = safeStart;

  const startTimeRef = useRef(startTime);
  startTimeRef.current = startTime;

  const clearNativeStallTimeout = useCallback(() => {
    if (nativeStallTimeoutRef.current) {
      clearTimeout(nativeStallTimeoutRef.current);
      nativeStallTimeoutRef.current = null;
    }
  }, []);

  const armNativeStallTimeout = useCallback(() => {
    clearNativeStallTimeout();
    nativeStallTimeoutRef.current = setTimeout(() => {
      const audio = audioRef.current;
      if (audio && audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
        setNativeMediaStatus('stalled');
        setIsPlaying(false);
      }
    }, MEDIA_STALL_TIMEOUT_MS);
  }, [clearNativeStallTimeout]);

  const performNativePlayback = useCallback(async (request: PendingNativePlayback) => {
    const audio = audioRef.current;
    if (!audio || !audioUrl || request.sourceUrl !== audioUrl) return false;
    if (request.requestId !== nativeRequestIdRef.current) return false;
    if (audio.readyState < HTMLMediaElement.HAVE_METADATA) return false;

    try {
      audio.currentTime = Math.max(0, request.targetTime);
      audio.playbackRate = playbackRate;
      setCurrentTime(request.targetTime);
      if (!request.shouldPlay) {
        pendingNativePlaybackRef.current = null;
        setNativeMediaStatus('ready');
        return true;
      }

      await audio.play();
      if (request.requestId !== nativeRequestIdRef.current) {
        audio.pause();
        return false;
      }
      pendingNativePlaybackRef.current = null;
      clearNativeStallTimeout();
      setNativeMediaStatus('playing');
      setIsPlaying(true);
      return true;
    } catch (error) {
      if (request.requestId !== nativeRequestIdRef.current) return false;
      console.warn('[!] Native listening audio play failed:', error);
      pendingNativePlaybackRef.current = null;
      setIsPlaying(false);
      setNativeMediaStatus(isAutoplayBlocked(error) ? 'blocked' : 'error');
      return false;
    }
  }, [audioUrl, clearNativeStallTimeout, playbackRate]);

  const requestNativePlayback = useCallback((targetTime: number, shouldPlay = true) => {
    if (!audioUrl || isYouTube) return;
    const request: PendingNativePlayback = {
      sourceUrl: audioUrl,
      targetTime: Math.max(0, targetTime),
      shouldPlay,
      requestId: nativeRequestIdRef.current,
    };
    pendingNativePlaybackRef.current = request;
    const audio = audioRef.current;
    if (!audio || audio.readyState < HTMLMediaElement.HAVE_METADATA) {
      setNativeMediaStatus('loading');
      armNativeStallTimeout();
      return;
    }
    void performNativePlayback(request);
  }, [armNativeStallTimeout, audioUrl, isYouTube, performNativePlayback]);

  const flushPendingNativePlayback = useCallback(() => {
    const pending = pendingNativePlaybackRef.current;
    if (!pending) {
      setNativeMediaStatus((current) => current === 'loading' || current === 'stalled' ? 'ready' : current);
      return;
    }
    void performNativePlayback(pending);
  }, [performNativePlayback]);

  const retryNativeAudio = useCallback(() => {
    if (!audioUrl || isYouTube) return;
    clearNativeStallTimeout();
    setIsPlaying(false);
    setIsSentenceEnded(false);
    setNativeMediaStatus('loading');
    setNativeRetryCount((count) => count + 1);
  }, [audioUrl, clearNativeStallTimeout, isYouTube]);

  const restartCurrent = useCallback(() => {
    if (replayTimeoutRef.current) {
      clearTimeout(replayTimeoutRef.current);
      replayTimeoutRef.current = null;
    }
    setIsWaitingBetweenLoops(false);
    setIsSentenceEnded(false);
    const target = loopA !== null ? loopA : safeStart;
    setCurrentTime(startTime || 0);
    seekGraceUntilRef.current = Date.now() + 600;

    if (isYouTube && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(target, true);
      ytPlayerRef.current.playVideo();
      setIsPlaying(true);
    } else {
      requestNativePlayback(target, true);
    }
  }, [isYouTube, loopA, requestNativePlayback, safeStart, startTime]);
  restartCurrentRef.current = restartCurrent;

  // Initialize YouTube IFrame Player API - ONLY runs when youtubeVideoId changes
  useEffect(() => {
    if (!youtubeVideoId) {
      setIsYtReady(false);
      ytPlayerRef.current = null;
      return;
    }

    let isMounted = true;
    void loadYouTubeIframeApi().then(() => {
      if (!isMounted) return;

      if (!ytContainerRef.current) return;

      // Clean up existing player if any
      if (ytPlayerRef.current?.destroy) {
        try {
          ytPlayerRef.current.destroy();
        } catch {}
        ytPlayerRef.current = null;
      }

      // Ensure fresh target placeholder div inside the container
      ytContainerRef.current.innerHTML = '';
      const targetElement = document.createElement('div');
      targetElement.id = 'yt-iframe-player-element';
      targetElement.className = 'size-full pointer-events-none';
      ytContainerRef.current.appendChild(targetElement);

      const initialStart = Math.floor(safeStartRef.current ?? startTimeRef.current ?? 0);

      ytPlayerRef.current = new window.YT.Player(targetElement, {
        videoId: youtubeVideoId,
        playerVars: {
          autoplay: 0,
          controls: 0, // Ẩn hoàn toàn thanh điều khiển và timeline YouTube
          disablekb: 1, // Vô hiệu hoá bàn phím can thiệp trực tiếp vào YouTube
          fs: 0, // Ẩn nút full-screen mặc định của YouTube
          cc_load_policy: 0, // Tắt phụ đề mặc định
          iv_load_policy: 3, // Ẩn video annotations
          rel: 0, // Không gợi ý video ngoài
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
          start: initialStart,
        },
        events: {
          onReady: (event: any) => {
            if (!isMounted) return;
            setIsYtReady(true);
            const dur = event.target.getDuration?.() || 0;
            setDuration(dur);

            const startPos =
              pendingSeekAndPlayRef.current?.start ??
              safeStartRef.current ??
              startTimeRef.current ??
              0;
            const shouldPlay =
              pendingSeekAndPlayRef.current ? pendingSeekAndPlayRef.current.autoPlay : true;

            seekGraceUntilRef.current = Date.now() + 800;
            event.target.seekTo(startPos, true);
            if (shouldPlay) {
              try {
                event.target.playVideo();
                setIsPlaying(true);
              } catch {}
            }
            pendingSeekAndPlayRef.current = null;

            // Tắt phụ đề (captions / closed captions) nếu có
            try {
              event.target.unloadModule?.('captions');
              event.target.setOption?.('captions', 'track', {});
              event.target.setOption?.('cc', 'track', {});
            } catch {}
          },
          onStateChange: (event: any) => {
            if (!isMounted) return;
            // 1: PLAYING, 2: PAUSED, 0: ENDED, 3: BUFFERING, -1: UNSTARTED, 5: VIDEO CUED
            if (event.data === 1) {
              setIsPlaying(true);
            } else if (event.data === 2) {
              // During seek grace period, YouTube momentarily transitions through paused state
              if (Date.now() >= seekGraceUntilRef.current) {
                setIsPlaying(false);
              }
            } else if (event.data === 0) {
              setIsPlaying(false);
              setIsSentenceEnded(true);
              setCurrentTime(endTime || duration);
              handleSentenceFinishedRef.current?.();
            }
          },
        },
      });
    });

    return () => {
      isMounted = false;
      if (ytPlayerRef.current?.destroy) {
        try {
          ytPlayerRef.current.destroy();
        } catch {}
        ytPlayerRef.current = null;
      }
    };
  }, [youtubeVideoId]);

  // Native HTML5 Audio callbacks to guarantee completion & time synchronization
  const handleNativeAudioEnded = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = safeStart;
    }
    setIsPlaying(false);
    setIsSentenceEnded(true);
    setCurrentTime(endTime || duration);
    handleSentenceFinishedRef.current?.();
  }, [safeStart, endTime, duration]);

  const handleNativeAudioTimeUpdate = useCallback(() => {
    if (!audioRef.current || isYouTube) return;
    const curr = audioRef.current.currentTime || 0;
    const stopThreshold = safeEnd !== null ? safeEnd : endTime;
    const isSeekingGrace = Date.now() < seekGraceUntilRef.current;

    if (audioRef.current.ended || (stopThreshold && curr >= (stopThreshold - 0.02))) {
      if (!isSeekingGrace && isPlaying) {
        audioRef.current.pause();
        audioRef.current.currentTime = safeStart;
        setIsPlaying(false);
        setIsSentenceEnded(true);
        setCurrentTime(endTime || stopThreshold || curr);
        handleSentenceFinishedRef.current?.();
      }
    }
  }, [isYouTube, safeEnd, endTime, isPlaying, safeStart]);

  // Ultra-smooth 60fps requestAnimationFrame ticker synchronized with screen refresh
  useEffect(() => {
    if (!isPlaying) return;

    let rafId: number;
    let lastReportedTime = -1;

    const tick = () => {
      let curr = 0;
      let isEnded = false;

      if (isYouTube && ytPlayerRef.current?.getCurrentTime) {
        try {
          curr = ytPlayerRef.current.getCurrentTime() || 0;
        } catch {
          rafId = requestAnimationFrame(tick);
          return;
        }
      } else if (audioRef.current) {
        curr = audioRef.current.currentTime || 0;
        isEnded = audioRef.current.ended;
      }

      const stopThreshold = safeEnd !== null ? safeEnd : endTime;
      const isSeekingGrace = Date.now() < seekGraceUntilRef.current;

      // Handle sentence segment end boundary with safeEnd buffer or natural audio end
      if (isEnded || (stopThreshold && curr >= (stopThreshold - 0.02))) {
        if (!isSeekingGrace) {
          if (isYouTube && ytPlayerRef.current) {
            ytPlayerRef.current.pauseVideo();
            seekGraceUntilRef.current = Date.now() + 600;
            ytPlayerRef.current.seekTo(safeStart, true);
          } else if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = safeStart;
          }
          setIsPlaying(false);
          setIsSentenceEnded(true);
          setCurrentTime(endTime || stopThreshold || curr);
          handleSentenceFinishedRef.current?.();
          return;
        }
      }

      // Smooth state update (frequency matching 60fps frame delta ~15ms)
      if (Math.abs(curr - lastReportedTime) >= 0.015) {
        lastReportedTime = curr;
        setCurrentTime(curr);
        onTimeUpdate?.(curr);
      }

      // Handle custom A-B repeat
      if (loopA !== null && loopB !== null && loopB > loopA) {
        if (curr >= loopB) {
          seekGraceUntilRef.current = Date.now() + 600;
          if (isYouTube && ytPlayerRef.current?.seekTo) {
            ytPlayerRef.current.seekTo(loopA, true);
            ytPlayerRef.current.playVideo();
          } else if (audioRef.current) {
            audioRef.current.currentTime = loopA;
            void audioRef.current.play();
          }
          rafId = requestAnimationFrame(tick);
          return;
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [isPlaying, isYouTube, endTime, safeStart, safeEnd, loopA, loopB, onTimeUpdate]);

  // Load a new native source only after React has committed the new `src`.
  // Playback is completed by media readiness events, never by the old resource's readyState.
  useEffect(() => {
    if (isYouTube || !audioUrl) return undefined;
    const audio = audioRef.current;
    if (!audio) return undefined;

    nativeRequestIdRef.current += 1;
    const requestId = nativeRequestIdRef.current;
    prevAudioUrlRef.current = audioUrl;
    pendingNativePlaybackRef.current = {
      sourceUrl: audioUrl,
      targetTime: safeStart,
      shouldPlay: true,
      requestId,
    };
    setDuration(0);
    setCurrentTime(startTime || 0);
    setIsSentenceEnded(false);
    setIsPlaying(false);
    setNativeMediaStatus('loading');
    clearNativeStallTimeout();
    audio.pause();
    audio.load();
    armNativeStallTimeout();

    return () => {
      if (nativeRequestIdRef.current === requestId) {
        pendingNativePlaybackRef.current = null;
      }
      clearNativeStallTimeout();
      audio.pause();
    };
  }, [armNativeStallTimeout, audioUrl, clearNativeStallTimeout, isYouTube, nativeRetryCount]);

  // Sentence navigation inside the same media file reuses the loaded resource.
  useEffect(() => {
    const isFirstMount = isFirstMountRef.current;
    const hasSentenceChanged =
      (sentenceId !== undefined && sentenceId !== prevSentenceIdRef.current) ||
      (startTime !== undefined && startTime !== prevSentenceStartRef.current);

    if (isFirstMount) isFirstMountRef.current = false;
    if (!isFirstMount && !hasSentenceChanged) return;

    prevSentenceIdRef.current = sentenceId;
    prevSentenceStartRef.current = startTime;
    setIsSentenceEnded(false);
    setCurrentTime(startTime || 0);
    setLoopA(null);
    setLoopB(null);
    seekGraceUntilRef.current = Date.now() + 800;
    repeatCounterRef.current = 1;
    setCurrentRepeat(1);
    setIsWaitingBetweenLoops(false);
    if (replayTimeoutRef.current) {
      clearTimeout(replayTimeoutRef.current);
      replayTimeoutRef.current = null;
    }

    if (isYouTube) {
      if (ytPlayerRef.current?.seekTo) {
        try {
          ytPlayerRef.current.seekTo(safeStart, true);
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        } catch (error) {
          console.warn('[!] YouTube auto-play error on sentence change:', error);
        }
      } else {
        pendingSeekAndPlayRef.current = { start: safeStart, autoPlay: true };
      }
      return;
    }

    if (audioUrl === prevAudioUrlRef.current) {
      requestNativePlayback(safeStart, true);
    }
  }, [audioUrl, isYouTube, requestNativePlayback, safeStart, sentenceId, startTime]);

  // Sentence-level timeline calculations (showing sentence duration, not full 10-minute video)
  const sentenceDuration = useMemo(() => {
    if (endTime && endTime > (startTime || 0)) {
      return endTime - (startTime || 0);
    }
    if (duration > 0 && duration > (startTime || 0)) {
      return duration - (startTime || 0);
    }
    return 3;
  }, [startTime, endTime, duration]);

  const sentenceCurrentTime = useMemo(() => {
    if (isSentenceEnded) return sentenceDuration;
    const rel = currentTime - (startTime || 0);
    return Math.max(0, Math.min(sentenceDuration, rel));
  }, [currentTime, startTime, sentenceDuration, isSentenceEnded]);

  const progressPercent = useMemo(() => {
    if (isSentenceEnded) return 100;
    if (!sentenceDuration || sentenceDuration <= 0) return 0;
    return Math.min(100, Math.max(0, (sentenceCurrentTime / sentenceDuration) * 100));
  }, [sentenceCurrentTime, sentenceDuration, isSentenceEnded]);

  // Real-time Karaoke Active Word Calculation
  // Xử lý khoảng lặng giữa các từ: giữ highlight ở từ vừa nói xong cho đến khi từ tiếp theo bắt đầu
  const activeWordIndex = useMemo(() => {
    if (!words || words.length === 0) return -1;
    if (currentTime < words[0].start) return -1;

    for (let i = 0; i < words.length; i++) {
      const currentWord = words[i];
      const nextWord = words[i + 1];

      // Đang trong khoảng thời gian phát âm của từ này
      if (currentTime >= currentWord.start && currentTime <= currentWord.end) {
        return i;
      }
      // Khoảng lặng giữa 2 từ: tiếp tục giữ sáng từ vừa nói xong, tránh chớp tắt giật cục
      if (currentTime > currentWord.end && nextWord && currentTime < nextWord.start) {
        return i;
      }
    }

    // Sau khi từ cuối cùng kết thúc: giữ sáng từ cuối cùng
    if (currentTime >= words[words.length - 1].end) {
      return words.length - 1;
    }

    return -1;
  }, [currentTime, words]);

  const togglePlay = useCallback(() => {
    if (isSentenceEnded) {
      setIsSentenceEnded(false);
      restartCurrent();
      return;
    }

    const stopThreshold = safeEnd !== null ? safeEnd : endTime;
    if (isYouTube && ytPlayerRef.current) {
      if (isPlaying) {
        ytPlayerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        const curr = ytPlayerRef.current.getCurrentTime?.() || 0;
        seekGraceUntilRef.current = Date.now() + 600;
        if (stopThreshold && curr >= stopThreshold) {
          ytPlayerRef.current.seekTo(safeStart, true);
        } else if (curr < safeStart - 0.2) {
          ytPlayerRef.current.seekTo(safeStart, true);
        }
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
      }
    } else if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        setNativeMediaStatus('ready');
      } else {
        seekGraceUntilRef.current = Date.now() + 600;
        const current = audioRef.current.currentTime;
        const target = stopThreshold && current >= stopThreshold
          ? safeStart
          : current < safeStart
            ? safeStart
            : current;
        requestNativePlayback(target, true);
      }
    }
  }, [endTime, isPlaying, isSentenceEnded, isYouTube, requestNativePlayback, restartCurrent, safeEnd, safeStart]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSentenceEnded(false);
    const relTime = parseFloat(e.target.value);
    const absTime = (startTime || 0) + relTime;
    setCurrentTime(absTime);
    seekGraceUntilRef.current = Date.now() + 600;
    if (isYouTube && ytPlayerRef.current?.seekTo) {
      ytPlayerRef.current.seekTo(absTime, true);
    } else if (audioRef.current) {
      audioRef.current.currentTime = absTime;
    }
  };

  const handleJumpToWord = (wordStart: number) => {
    setIsSentenceEnded(false);
    setCurrentTime(wordStart);
    seekGraceUntilRef.current = Date.now() + 600;
    if (isYouTube && ytPlayerRef.current?.seekTo) {
      ytPlayerRef.current.seekTo(wordStart, true);
      ytPlayerRef.current.playVideo();
      setIsPlaying(true);
    } else {
      requestNativePlayback(wordStart, true);
    }
  };

  useImperativeHandle(ref, () => ({
    seekTo: (seconds: number) => {
      handleJumpToWord(seconds);
    },
    play: () => {
      setIsSentenceEnded(false);
      seekGraceUntilRef.current = Date.now() + 600;
      if (isYouTube && ytPlayerRef.current?.playVideo) {
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
      } else {
        requestNativePlayback(audioRef.current?.currentTime ?? safeStart, true);
      }
    },
    pause: () => {
      if (isYouTube && ytPlayerRef.current?.pauseVideo) {
        ytPlayerRef.current.pauseVideo();
        setIsPlaying(false);
      } else if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    },
    playSegment: (start: number, end: number) => {
      if (wordSegmentTimeoutRef.current) {
        clearTimeout(wordSegmentTimeoutRef.current);
        wordSegmentTimeoutRef.current = null;
      }
      // Micro-padding: -0.04s âm đầu, +0.06s âm đuôi
      const paddedStart = Math.max(0, start - 0.04);
      const paddedEnd = Math.max(paddedStart + 0.12, end + 0.06);
      const durationMs = Math.max(120, ((paddedEnd - paddedStart) / playbackRate) * 1000);

      setCurrentTime(paddedStart);
      seekGraceUntilRef.current = Date.now() + 600;

      if (isYouTube && ytPlayerRef.current?.seekTo) {
        ytPlayerRef.current.seekTo(paddedStart, true);
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
        wordSegmentTimeoutRef.current = setTimeout(() => {
          try {
            ytPlayerRef.current?.pauseVideo();
            setIsPlaying(false);
          } catch {}
        }, durationMs);
      } else {
        pendingWordSegmentRef.current = { end: paddedEnd };
        requestNativePlayback(paddedStart, true);
      }
    },
  }));

  const lastActiveWordRef = useRef<number>(-1);
  useEffect(() => {
    const reportIndex = isKaraokeVisible ? activeWordIndex : -1;
    if (lastActiveWordRef.current !== reportIndex) {
      lastActiveWordRef.current = reportIndex;
      onActiveWordIndexChange?.(reportIndex);
    }
  }, [activeWordIndex, isKaraokeVisible, onActiveWordIndexChange]);

  const changeSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (isYouTube && ytPlayerRef.current?.setPlaybackRate) {
      ytPlayerRef.current.setPlaybackRate(rate);
    } else if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (isYouTube && ytPlayerRef.current) {
      if (next) ytPlayerRef.current.mute();
      else ytPlayerRef.current.unMute();
    } else if (audioRef.current) {
      audioRef.current.muted = next;
    }
  };

  const toggleKaraoke = () => {
    setIsKaraokeVisible((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('listening_karaoke_enabled', String(next));
      } catch {}
      return next;
    });
  };

  const setPointA = () => {
    setLoopA(currentTime);
    if (loopB !== null && loopB <= currentTime) {
      setLoopB(null);
    }
  };

  const setPointB = () => {
    if (loopA === null) {
      setLoopA(startTime || 0);
    }
    setLoopB(currentTime);
  };

  const clearABLoop = () => {
    setLoopA(null);
    setLoopB(null);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        if (e.key === 'r' && e.shiftKey) {
          e.preventDefault();
          restartCurrent();
        }
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        restartCurrent();
      } else if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        if (hasPreviousSentence && onPreviousSentence) onPreviousSentence();
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        if (hasNextSentence && onNextSentence) onNextSentence();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasNextSentence, hasPreviousSentence, onNextSentence, onPreviousSentence, restartCurrent, togglePlay]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-line bg-surface p-3.5 sm:p-4 shadow-sm transition-all ${className}`}
      role="region"
      aria-label="Trình phát âm thanh và video luyện nghe"
    >
      {/* HTML5 Audio: only rendered when not YouTube */}
      {!isYouTube && audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="auto"
          onLoadStart={() => {
            setNativeMediaStatus('loading');
            armNativeStallTimeout();
          }}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setDuration(Number.isFinite(audioRef.current.duration) ? audioRef.current.duration : 0);
            }
            flushPendingNativePlayback();
          }}
          onCanPlay={() => {
            clearNativeStallTimeout();
            flushPendingNativePlayback();
          }}
          onPlaying={() => {
            clearNativeStallTimeout();
            setNativeMediaStatus('playing');
            setIsPlaying(true);
            const pendingSegment = pendingWordSegmentRef.current;
            if (pendingSegment && audioRef.current) {
              pendingWordSegmentRef.current = null;
              if (wordSegmentTimeoutRef.current) clearTimeout(wordSegmentTimeoutRef.current);
              const remainingMs = Math.max(
                120,
                ((pendingSegment.end - audioRef.current.currentTime) / playbackRate) * 1000,
              );
              wordSegmentTimeoutRef.current = setTimeout(() => {
                if (audioRef.current) {
                  audioRef.current.pause();
                  setIsPlaying(false);
                  setNativeMediaStatus('ready');
                }
              }, remainingMs);
            }
          }}
          onPause={() => {
            setIsPlaying(false);
            setNativeMediaStatus((current) => {
              if (current === 'error' || current === 'blocked' || current === 'loading' || current === 'stalled') {
                return current;
              }
              return 'ready';
            });
          }}
          onWaiting={() => {
            setNativeMediaStatus('loading');
            armNativeStallTimeout();
          }}
          onStalled={() => {
            setNativeMediaStatus('stalled');
            armNativeStallTimeout();
          }}
          onEmptied={() => setNativeMediaStatus('loading')}
          onAbort={() => {
            if (pendingNativePlaybackRef.current) setNativeMediaStatus('stalled');
          }}
          onEnded={handleNativeAudioEnded}
          onTimeUpdate={handleNativeAudioTimeUpdate}
          onError={() => {
            clearNativeStallTimeout();
            pendingNativePlaybackRef.current = null;
            setIsPlaying(false);
            setNativeMediaStatus('error');
            console.warn('[!] Audio load error:', audioUrl);
          }}
        />
      )}

      {!isYouTube && audioUrl && nativeMediaStatus !== 'idle' && nativeMediaStatus !== 'ready' && nativeMediaStatus !== 'playing' && (
        <div
          className={`mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${
            nativeMediaStatus === 'error'
              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300'
              : nativeMediaStatus === 'blocked'
                ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'
                : 'border-line bg-surface-elevated text-content-muted'
          }`}
          role={nativeMediaStatus === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          <span className="inline-flex items-center gap-2 font-semibold">
            {nativeMediaStatus === 'loading' ? (
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <AlertCircle className="size-4" aria-hidden="true" />
            )}
            {nativeMediaStatus === 'blocked'
              ? (language === 'en' ? 'Autoplay was blocked. Select Play to start.' : 'Trình duyệt đã chặn tự phát. Hãy nhấn Phát để bắt đầu.')
              : nativeMediaStatus === 'error'
                ? (language === 'en' ? 'The audio could not be loaded.' : 'Không thể tải âm thanh của bài này.')
                : nativeMediaStatus === 'stalled'
                  ? (language === 'en' ? 'The connection paused while loading audio.' : 'Kết nối bị gián đoạn khi tải âm thanh.')
                  : (language === 'en' ? 'Loading audio…' : 'Đang tải âm thanh…')}
          </span>
          {(nativeMediaStatus === 'error' || nativeMediaStatus === 'stalled') && (
            <button
              type="button"
              onClick={retryNativeAudio}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-current/20 bg-surface px-2.5 py-1 font-bold text-content transition hover:bg-surface-hover"
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
              {language === 'en' ? 'Retry audio' : 'Thử tải lại âm thanh'}
            </button>
          )}
        </div>
      )}

      {/* Embedded YouTube Player: directly produces audio and video */}
      {isYouTube && (
        <div className="mb-4 overflow-hidden rounded-xl border border-line bg-black">
          <div className="flex items-center justify-between border-b border-line/40 bg-surface-elevated px-3 py-1.5 text-[11px] font-bold text-content-muted">
            <span className="flex items-center gap-1.5 text-red-500">
              <Youtube className="size-3.5" /> {language === 'en' ? 'YouTube Video (Synced Audio & Video)' : 'Video YouTube (Âm thanh & hình ảnh đồng bộ)'}
            </span>
            <button
              type="button"
              onClick={() => setIsVideoExpanded(!isVideoExpanded)}
              className="hover:text-content"
              title={isVideoExpanded ? (language === 'en' ? 'Collapse video' : 'Thu nhỏ video') : (language === 'en' ? 'Expand video' : 'Mở rộng video')}
            >
              {isVideoExpanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            </button>
          </div>
          <div
            className={`relative overflow-hidden transition-all select-none bg-black aspect-video w-full ${
              isVideoExpanded ? 'max-w-none' : 'max-w-3xl mx-auto'
            }`}
          >
            {/* Embedded YouTube Player: Vertical Letterbox Shift cleanly pushes YouTube title & watermark outside visible frame with zero video cropping */}
            <div
              ref={ytContainerRef}
              className="absolute left-0 w-full pointer-events-none select-none overflow-hidden [&_iframe]:size-full [&_iframe]:pointer-events-none"
              style={{ top: '-80px', height: 'calc(100% + 160px)' }}
            >
              <div
                id="yt-iframe-player-element"
                className="size-full pointer-events-none"
              />
            </div>

            {/* Loading Cover: clean backdrop while YouTube iframe initializes */}
            {!isYtReady && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black text-white/80">
                <Loader2 className="size-6 animate-spin text-accent-strong" />
                <span className="mt-2 text-xs font-medium text-white/70">Đang chuẩn bị video...</span>
              </div>
            )}

            {/* Completely inert overlay shield: blocks all clicks, taps, context menus, and interactions */}
            <div
              className="absolute inset-0 z-10 cursor-default select-none bg-transparent"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              role="presentation"
              aria-hidden="true"
            />
          </div>
        </div>
      )}



      {/* Time Progress Bar & Scrubber Scoped to Sentence */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs font-semibold tabular-nums text-content-muted">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-content">{formatTime(sentenceCurrentTime)}</span>
            <span className="text-[11px] text-content-muted/70">/ {formatTime(sentenceDuration)}</span>
            {autoReplayConfig.repeatCount !== 1 && (
              <span
                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                  isWaitingBetweenLoops
                    ? 'bg-accent/20 text-accent-strong dark:text-brand-300 animate-pulse'
                    : 'bg-surface-elevated text-content-muted'
                }`}
              >
                <span>
                  Lặp {currentRepeat}/
                  {autoReplayConfig.repeatCount === 0 ? '∞' : autoReplayConfig.repeatCount}
                </span>
                {isWaitingBetweenLoops && (
                  <span>(Nghỉ {autoReplayConfig.delaySeconds}s)</span>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            {loopA !== null && (
              <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent-strong">
                A: {formatTime(Math.max(0, loopA - (startTime || 0)))}
              </span>
            )}
            {loopB !== null && (
              <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent-strong">
                B: {formatTime(Math.max(0, loopB - (startTime || 0)))}
              </span>
            )}
            {isYouTube && duration > 0 && (
              <span className="hidden sm:inline text-content-muted/70 text-[10px]">
                (Video: {formatTime(currentTime)} / {formatTime(duration)})
              </span>
            )}
          </div>
        </div>

        {/* Custom Slim Progress Bar with brand fill */}
        <div className="relative flex items-center h-3 w-full group cursor-pointer">
          {/* Background track and brand fill */}
          <div className="absolute inset-x-0 h-1 group-hover:h-1.5 rounded-full bg-slate-200/90 dark:bg-slate-700/60 overflow-hidden pointer-events-none transition-all duration-150">
            <div
              className="h-full bg-brand dark:bg-brand-400 rounded-full will-change-[width]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Interactive range input with smooth precision */}
          <input
            type="range"
            min={0}
            max={sentenceDuration || 1}
            step="any"
            value={sentenceCurrentTime}
            onChange={handleSeek}
            aria-label="Thanh thời gian phát câu hiện tại"
            className="relative z-10 h-3 w-full cursor-pointer appearance-none bg-transparent accent-brand-600 dark:accent-brand-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Media Controls Bar */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5 border-t border-line/60 pt-2.5">
        {/* Left: Prev / Play-Pause / Next / Replay */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onPreviousSentence}
            disabled={!hasPreviousSentence}
            title={language === 'en' ? 'Previous sentence (Alt + Left)' : 'Câu trước đó (Alt + Mũi tên Trái)'}
            className="grid size-8 sm:size-8.5 place-items-center rounded-lg border border-line text-content-muted transition hover:bg-surface-hover hover:text-content active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <SkipBack className="size-3.5 sm:size-4" />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            title={isPlaying
              ? (language === 'en' ? 'Pause (Space)' : 'Tạm dừng (Phím Cách)')
              : (language === 'en' ? 'Play audio / video (Space)' : 'Phát âm thanh / video (Phím Cách)')}
            className="grid size-9.5 sm:size-10 place-items-center rounded-xl bg-accent text-accent-contrast shadow-sm transition hover:brightness-105 active:scale-95"
          >
            {isPlaying ? <Pause className="size-4.5 fill-current" /> : <Play className="size-4.5 fill-current translate-x-0.5" />}
          </button>

          <button
            type="button"
            onClick={onNextSentence}
            disabled={!hasNextSentence}
            title={language === 'en' ? 'Next sentence (Alt + Right)' : 'Câu kế tiếp (Alt + Mũi tên Phải)'}
            className="grid size-8 sm:size-8.5 place-items-center rounded-lg border border-line text-content-muted transition hover:bg-surface-hover hover:text-content active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <SkipForward className="size-3.5 sm:size-4" />
          </button>

          <button
            type="button"
            onClick={restartCurrent}
            title={language === 'en' ? 'Replay current sentence (R or Shift + R)' : 'Phát lại câu hiện tại (Phím R hoặc Shift + R)'}
            className="ml-0.5 inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1.5 text-xs font-semibold text-content-muted transition hover:bg-surface-hover hover:text-content active:scale-95"
          >
            <RotateCcw className="size-3" />
            <span className="hidden sm:inline text-[11px]">{language === 'en' ? 'Replay' : 'Phát lại'}</span>
          </button>
        </div>

        {/* Center: A-B Repeat Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={setPointA}
            title={language === 'en' ? 'Set loop start point A' : 'Đặt điểm bắt đầu lặp A'}
            className={`rounded-lg border px-2 py-1 text-[11px] font-bold transition active:scale-95 ${
              loopA !== null
                ? 'border-accent bg-accent/15 text-accent-strong'
                : 'border-line text-content-muted hover:bg-surface-hover hover:text-content'
            }`}
          >
            {language === 'en' ? 'Set A' : 'Đặt A'}
          </button>

          <button
            type="button"
            onClick={setPointB}
            title={language === 'en' ? 'Set loop end point B' : 'Đặt điểm kết thúc lặp B'}
            className={`rounded-lg border px-2 py-1 text-[11px] font-bold transition active:scale-95 ${
              loopB !== null
                ? 'border-accent bg-accent/15 text-accent-strong'
                : 'border-line text-content-muted hover:bg-surface-hover hover:text-content'
            }`}
          >
            {language === 'en' ? 'Set B' : 'Đặt B'}
          </button>

          {(loopA !== null || loopB !== null) && (
            <button
              type="button"
              onClick={clearABLoop}
              title={language === 'en' ? 'Clear A-B loop' : 'Xoá đoạn lặp A-B'}
              className="rounded-lg border border-negative/30 bg-negative/10 px-2 py-1 text-[11px] font-bold text-negative transition hover:bg-negative/20 active:scale-95"
            >
              {language === 'en' ? 'Cancel' : 'Hủy lặp'}
            </button>
          )}
        </div>

        {/* Right: Speed Dropdown / Karaoke / Auto-Replay Settings / Mute */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Playback speed dropdown */}
          <div className="relative" ref={speedDropdownRef}>
            <button
              type="button"
              onClick={() => setIsSpeedOpen((prev) => !prev)}
              title={language === 'en' ? 'Adjust playback speed' : 'Điều chỉnh tốc độ phát âm thanh'}
              className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition active:scale-95 ${
                isSpeedOpen
                  ? 'border-accent bg-accent/15 text-accent-strong shadow-sm'
                  : 'border-line text-content-muted hover:bg-surface-hover hover:text-content'
              }`}
            >
              <Gauge className="size-3.5" />
              <span>{playbackRate}x</span>
              <ChevronDown
                className={`size-3 transition-transform duration-200 ${
                  isSpeedOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isSpeedOpen && (
              <div className="absolute bottom-full right-0 mb-2 z-50 min-w-[125px] rounded-xl border border-line bg-surface p-1 shadow-lg backdrop-blur-md animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-content-muted/70">
                  {language === 'en' ? 'Playback speed' : 'Tốc độ phát'}
                </div>
                <div className="space-y-0.5">
                  {SPEED_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        changeSpeed(opt.value);
                        setIsSpeedOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
                        playbackRate === opt.value
                          ? 'bg-accent/15 text-accent-strong font-bold'
                          : 'text-content-muted hover:bg-surface-hover hover:text-content'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {playbackRate === opt.value && (
                        <Check className="size-3.5 text-accent-strong" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Karaoke toggle button */}
          {hasWords && (
            <button
              type="button"
              onClick={toggleKaraoke}
              title={isKaraokeVisible
                ? (language === 'en' ? 'Disable Karaoke subtitles' : 'Tắt chữ Karaoke chạy theo âm thanh')
                : (language === 'en' ? 'Enable Karaoke subtitles' : 'Bật chữ Karaoke chạy theo âm thanh')}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition active:scale-95 ${
                isKaraokeVisible
                  ? 'border-accent bg-accent/15 text-accent-strong shadow-sm'
                  : 'border-line text-content-muted hover:bg-surface-hover hover:text-content'
              }`}
            >
              <Subtitles className={`size-3.5 ${isKaraokeVisible ? 'text-accent-strong' : ''}`} />
              <span>Karaoke</span>
            </button>
          )}

          {/* Auto Replay Settings Button */}
          <button
            type="button"
            onClick={() => setIsAutoReplayModalOpen(true)}
            title={language === 'en' ? 'Auto-replay settings (Repeats, pause delay, auto-advance)' : 'Cài đặt tự động phát lại (Số lần lặp, khoảng nghỉ, tự động chuyển câu)'}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition active:scale-95 ${
              autoReplayConfig.autoAdvance || autoReplayConfig.repeatCount !== 1
                ? 'border-accent/40 bg-accent/10 text-accent-strong shadow-sm'
                : 'border-line text-content-muted hover:bg-surface-hover hover:text-content'
            }`}
          >
            <SlidersHorizontal className="size-3.5" />
            <span className="hidden sm:inline">{language === 'en' ? 'Auto-Replay' : 'Tự động phát lại'}</span>
            <span className="sm:hidden">{language === 'en' ? 'Auto' : 'Tự động'}</span>
            {autoReplayConfig.repeatCount !== 1 && (
              <span className="rounded-md bg-accent/20 px-1 py-0.2 text-[10px] font-extrabold text-accent-strong">
                {autoReplayConfig.repeatCount === 0 ? '∞' : `${autoReplayConfig.repeatCount}x`}
              </span>
            )}
          </button>

          {/* Mute button */}
          <button
            type="button"
            onClick={toggleMute}
            title={isMuted ? (language === 'en' ? 'Unmute' : 'Bật âm thanh') : (language === 'en' ? 'Mute' : 'Tắt tiếng')}
            className="grid size-8 place-items-center rounded-xl border border-line text-content-muted transition hover:bg-surface-hover hover:text-content active:scale-95"
          >
            {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
        </div>
      </div>

      {/* Auto Replay Settings Modal */}
      <AutoReplaySettingsModal
        isOpen={isAutoReplayModalOpen}
        onClose={() => setIsAutoReplayModalOpen(false)}
        config={autoReplayConfig}
        onSaveConfig={handleSaveAutoReplayConfig}
      />
    </div>
  );
});

ListeningMediaPlayer.displayName = 'ListeningMediaPlayer';
export default ListeningMediaPlayer;
