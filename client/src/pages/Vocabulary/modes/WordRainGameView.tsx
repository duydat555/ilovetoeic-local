import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBasket,
  Heart,
  Trophy,
  Zap,
  RotateCcw,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ArrowLeft,
  Crown,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Rocket,
  Layers,
  CloudRain,
  Target,
  Gauge,
  HeartCrack,
  BookOpen,
} from 'lucide-react';
import { VocabularyWord } from '../../../types';
import { playPronunciation } from '../../../utils/audioPronunciation';

// Web Audio API Synthesizer for instant tactile sound effects with zero external assets
class GameSoundFX {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private getContext(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  playPop() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.exponentialRampToValueAtTime(920, now + 0.1);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // ignore
    }
  }

  playMistake() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(170, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.2);
      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch {
      // ignore
    }
  }

  playLevelUp() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.2, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.18);
      });
    } catch {
      // ignore
    }
  }

  playGameOver() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [440, 392, 349, 293].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);
        gain.gain.setValueAtTime(0.22, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.22);
      });
    } catch {
      // ignore
    }
  }
}

const soundFX = new GameSoundFX();

export type DifficultyMode = 'easy' | 'medium' | 'hard';

interface DifficultyConfig {
  name: string;
  bubbleCount: number;
  badge: string;
  description: string;
  bars: number;
}

const DIFFICULTY_SETTINGS: Record<DifficultyMode, DifficultyConfig> = {
  easy: {
    name: 'Dễ',
    bubbleCount: 4,
    badge: '4 từ đồng thời',
    description: 'Nhịp độ thư thái, dễ quan sát & làm quen.',
    bars: 1,
  },
  medium: {
    name: 'Vừa',
    bubbleCount: 5,
    badge: '5 từ đồng thời',
    description: 'Cân bằng phản xạ nhận diện chuẩn TOEIC.',
    bars: 2,
  },
  hard: {
    name: 'Khó',
    bubbleCount: 6,
    badge: '6 từ đồng thời',
    description: 'Mật độ dày đặc, nhiều từ gây nhiễu.',
    bars: 3,
  },
};

// Clean and normalize Part of Speech
export function formatPartOfSpeech(pos?: string): string {
  if (!pos) return 'TỪ VỰNG';
  const clean = pos.toLowerCase().trim();
  if (clean.includes('adj') || clean.includes('tính')) return 'ADJECTIVE';
  if (clean.includes('verb') || clean.includes('động') || clean === 'v') return 'VERB';
  if (clean.includes('noun') || clean.includes('danh') || clean === 'n') return 'NOUN';
  if (clean.includes('adv') || clean.includes('trạng')) return 'ADVERB';
  if (clean.includes('prep') || clean.includes('giới')) return 'PREPOSITION';
  if (clean.includes('conj') || clean.includes('liên')) return 'CONJUNCTION';
  if (clean.includes('pron') || clean.includes('đại')) return 'PRONOUN';
  return pos.toUpperCase();
}

// Clean meaning text for basket display
export function cleanMeaningText(meaning?: string): string {
  if (!meaning) return '';
  const first = meaning.split(';')[0].split(',')[0].trim();
  return first.length > 36 ? first.slice(0, 34) + '...' : first;
}

interface ActiveBubble {
  id: string;
  wordId: string;
  word: string;
  lane: number;
  xPercent: number;
  y: number;
  speed: number;
  isTarget: boolean;
  status: 'falling' | 'popping' | 'missed';
}

interface ScorePopup {
  id: string;
  text: string;
  xPercent: number;
  y: number;
  isCombo?: boolean;
}

interface Props {
  words: VocabularyWord[];
  topicName?: string;
  activeGameTab: 'rain' | 'tiles';
  onChangeGameTab: (tab: 'rain' | 'tiles') => void;
}

export const WordRainGameView: React.FC<Props> = ({
  words,
  topicName,
  activeGameTab,
  onChangeGameTab,
}) => {
  // Screen state: 'config' (Screen 1) | 'gameplay' (Screen 2) | 'gameover' (Screen 3)
  const [screen, setScreen] = useState<'config' | 'gameplay' | 'gameover'>('config');
  const [difficulty, setDifficulty] = useState<DifficultyMode>('medium');

  // Gameplay state
  const [hearts, setHearts] = useState(3);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [level, setLevel] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Target word displayed in the bottom basket
  const [targetWord, setTargetWord] = useState<VocabularyWord | null>(null);

  // Active falling bubbles & UI feedback
  const [bubbles, setBubbles] = useState<ActiveBubble[]>([]);
  const [scorePopups, setScorePopups] = useState<ScorePopup[]>([]);
  const [basketShake, setBasketShake] = useState(false);
  const [levelUpBanner, setLevelUpBanner] = useState(false);

  // References for the 60fps delta-time animation loop
  const canvasRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const bubblesRef = useRef<ActiveBubble[]>([]);
  const targetWordRef = useRef<VocabularyWord | null>(null);
  const heartsRef = useRef(3);
  const levelRef = useRef(1);
  const isPausedRef = useRef(false);
  const isGameOverRef = useRef(false);

  // Sync ref values for access within requestAnimationFrame
  bubblesRef.current = bubbles;
  targetWordRef.current = targetWord;
  heartsRef.current = hearts;
  levelRef.current = level;
  isPausedRef.current = isPaused;

  // Sound sync
  useEffect(() => {
    soundFX.enabled = soundEnabled;
  }, [soundEnabled]);

  // Filter valid words
  const validWords = useMemo(() => {
    return words.filter((w) => Boolean(w.word && w.meaningVi));
  }, [words]);

  // Calculate lane horizontal percentage
  const getLanePercent = (lane: number, totalLanes: number): number => {
    const spacing = 100 / (totalLanes + 1);
    return Math.round(spacing * (lane + 1));
  };

  // Helper to pick random distinct words
  const pickRandomWord = useCallback(
    (excludeWordIds: string[] = []): VocabularyWord => {
      const candidates = validWords.filter((w) => !excludeWordIds.includes(w.id));
      if (candidates.length > 0) {
        return candidates[Math.floor(Math.random() * candidates.length)];
      }
      return validWords[Math.floor(Math.random() * validWords.length)];
    },
    [validWords]
  );

  // Start a new game session
  const startGame = () => {
    if (validWords.length < 3) return;

    const totalBubbles = DIFFICULTY_SETTINGS[difficulty].bubbleCount;
    setHearts(3);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setCorrectCount(0);
    setLevel(1);
    setIsPaused(false);
    isGameOverRef.current = false;

    // Pick target word
    const firstTarget = pickRandomWord();
    setTargetWord(firstTarget);
    targetWordRef.current = firstTarget;

    // Pick which initial bubble will match the target
    const targetBubbleIndex = Math.floor(Math.random() * totalBubbles);

    // Generate initial bubbles staggered vertically
    const initialBubbles: ActiveBubble[] = [];
    const usedWordIds: string[] = [firstTarget.id];

    for (let i = 0; i < totalBubbles; i++) {
      const isTarget = i === targetBubbleIndex;
      const wordObj = isTarget ? firstTarget : pickRandomWord(usedWordIds);
      if (!isTarget) usedWordIds.push(wordObj.id);

      const lane = i;
      const xPercent = getLanePercent(lane, totalBubbles);
      const initialY = -60 - i * 75 - Math.random() * 40;
      const speed = 85 + Math.random() * 20;

      initialBubbles.push({
        id: `bubble-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        wordId: wordObj.id,
        word: wordObj.word,
        lane,
        xPercent,
        y: initialY,
        speed,
        isTarget,
        status: 'falling',
      });
    }

    setBubbles(initialBubbles);
    setScreen('gameplay');
    lastTimeRef.current = performance.now();
  };

  // Handle Game Over
  const triggerGameOver = useCallback(() => {
    isGameOverRef.current = true;
    soundFX.playGameOver();
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setScreen('gameover');
  }, []);

  // Pop / Score float helper
  const addScorePopup = (text: string, xPercent: number, y: number, isCombo = false) => {
    const newPopup: ScorePopup = {
      id: `popup-${Date.now()}-${Math.random()}`,
      text,
      xPercent,
      y,
      isCombo,
    };
    setScorePopups((prev) => [...prev, newPopup]);
    setTimeout(() => {
      setScorePopups((prev) => prev.filter((p) => p.id !== newPopup.id));
    }, 850);
  };

  // Switch to next target word
  const selectNextTarget = useCallback(
    (currentBubbles: ActiveBubble[], excludeWordId?: string): VocabularyWord => {
      const fallingCandidates = currentBubbles
        .filter((b) => b.status === 'falling' && b.wordId !== excludeWordId)
        .map((b) => validWords.find((w) => w.id === b.wordId))
        .filter((w): w is VocabularyWord => Boolean(w));

      if (fallingCandidates.length > 0) {
        return fallingCandidates[Math.floor(Math.random() * fallingCandidates.length)];
      }

      return pickRandomWord(excludeWordId ? [excludeWordId] : []);
    },
    [pickRandomWord, validWords]
  );

  // Handle player clicking / tapping a bubble
  const handleBubbleClick = (clickedBubble: ActiveBubble) => {
    if (screen !== 'gameplay' || isPaused || isGameOverRef.current) return;
    if (clickedBubble.status !== 'falling') return;

    const currentTarget = targetWordRef.current;
    if (!currentTarget) return;

    if (clickedBubble.wordId === currentTarget.id) {
      // === CORRECT! ===
      soundFX.playPop();
      void playPronunciation(clickedBubble.word, 'US');

      // Combo Multipliers: 1.5x for 2+, 2x for 4+, 3x for 7+
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      setMaxCombo((prev) => Math.max(prev, nextCombo));

      let multiplier = 1;
      if (nextCombo >= 7) multiplier = 3;
      else if (nextCombo >= 4) multiplier = 2;
      else if (nextCombo >= 2) multiplier = 1.5;

      const earnedScore = Math.round(100 * multiplier);
      setScore((prev) => prev + earnedScore);

      const nextCorrectCount = correctCount + 1;
      setCorrectCount(nextCorrectCount);

      // Score popup
      const comboText = multiplier > 1 ? `+${earnedScore} (x${multiplier})` : `+${earnedScore}`;
      addScorePopup(comboText, clickedBubble.xPercent, clickedBubble.y, multiplier > 1);

      // Check level up (every 5 correct answers)
      if (nextCorrectCount > 0 && nextCorrectCount % 5 === 0) {
        setLevel((prev) => {
          const nextLevel = prev + 1;
          soundFX.playLevelUp();
          setLevelUpBanner(true);
          setTimeout(() => setLevelUpBanner(false), 1600);
          return nextLevel;
        });
      }

      // Mark bubble as popping
      setBubbles((prev) =>
        prev.map((b) => (b.id === clickedBubble.id ? { ...b, status: 'popping' } : b))
      );

      // Select new target word immediately
      const nextTarget = selectNextTarget(bubblesRef.current, currentTarget.id);
      setTargetWord(nextTarget);
      targetWordRef.current = nextTarget;

      // Update bubbles to reflect new target and respawn popped bubble
      setTimeout(() => {
        setBubbles((prev) => {
          const totalBubbles = DIFFICULTY_SETTINGS[difficulty].bubbleCount;
          const activeAfterPop = prev.filter((b) => b.id !== clickedBubble.id);
          const hasTargetNow = activeAfterPop.some((b) => b.wordId === nextTarget.id);

          const nextWord = hasTargetNow
            ? pickRandomWord([nextTarget.id, ...activeAfterPop.map((b) => b.wordId)])
            : nextTarget;

          const newLane = clickedBubble.lane;
          const xPercent = getLanePercent(newLane, totalBubbles);
          const newSpeed =
            (85 + Math.random() * 20) * Math.pow(1.14, Math.min(levelRef.current - 1, 6));

          const respawned: ActiveBubble = {
            id: `bubble-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            wordId: nextWord.id,
            word: nextWord.word,
            lane: newLane,
            xPercent,
            y: -50 - Math.random() * 50,
            speed: newSpeed,
            isTarget: nextWord.id === nextTarget.id,
            status: 'falling',
          };

          return [
            ...activeAfterPop.map((b) => ({
              ...b,
              isTarget: b.wordId === nextTarget.id,
            })),
            respawned,
          ];
        });
      }, 140);
    } else {
      // === WRONG BUBBLE! ===
      soundFX.playMistake();
      setCombo(0);
      setBasketShake(true);
      setTimeout(() => setBasketShake(false), 400);

      const nextHearts = hearts - 1;
      setHearts(nextHearts);

      addScorePopup('Sai rồi! -1 ❤️', clickedBubble.xPercent, clickedBubble.y);

      if (nextHearts <= 0) {
        triggerGameOver();
      }
    }
  };

  // Main animation frame game loop (60fps delta-time)
  useEffect(() => {
    if (screen !== 'gameplay') {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    const loop = (currentTime: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = currentTime;
      const deltaTime = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = currentTime;

      if (!isPausedRef.current && !isGameOverRef.current) {
        const canvasHeight = canvasRef.current?.clientHeight || 540;
        const bottomThreshold = canvasHeight - 95;
        const currentTarget = targetWordRef.current;
        const currentLevel = levelRef.current;

        let lostHeartThisTick = false;

        const updatedBubbles = bubblesRef.current.map((bubble) => {
          if (bubble.status !== 'falling') return bubble;

          // Speed scaling with level: 14% increase per level
          const speedMultiplier = Math.pow(1.14, Math.min(currentLevel - 1, 6));
          const nextY = bubble.y + bubble.speed * speedMultiplier * deltaTime;

          // Check if bubble reaches the bottom threshold
          if (nextY >= bottomThreshold) {
            if (currentTarget && bubble.wordId === currentTarget.id) {
              lostHeartThisTick = true;
            }

            const newSpeed = 85 + Math.random() * 20;
            const newWord = pickRandomWord();

            return {
              ...bubble,
              id: `bubble-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              wordId: newWord.id,
              word: newWord.word,
              y: -50 - Math.random() * 60,
              speed: newSpeed,
              isTarget: currentTarget ? newWord.id === currentTarget.id : false,
              status: 'falling' as const,
            };
          }

          return { ...bubble, y: nextY };
        });

        // Ensure there is always a target bubble falling on screen
        if (currentTarget) {
          const hasTarget = updatedBubbles.some((b) => b.wordId === currentTarget.id);
          if (!hasTarget && updatedBubbles.length > 0) {
            const sortedByY = [...updatedBubbles].sort((a, b) => a.y - b.y);
            const highest = sortedByY[0];
            highest.wordId = currentTarget.id;
            highest.word = currentTarget.word;
            highest.isTarget = true;
          }
        }

        setBubbles(updatedBubbles);

        if (lostHeartThisTick) {
          soundFX.playMistake();
          setBasketShake(true);
          setTimeout(() => setBasketShake(false), 400);
          setCombo(0);

          setHearts((prev) => {
            const nextHearts = prev - 1;
            if (nextHearts <= 0) {
              triggerGameOver();
            }
            return Math.max(nextHearts, 0);
          });

          const nextTarget = selectNextTarget(updatedBubbles, currentTarget?.id);
          setTargetWord(nextTarget);
          targetWordRef.current = nextTarget;
        }
      }

      if (!isGameOverRef.current) {
        animFrameRef.current = requestAnimationFrame(loop);
      }
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [screen, difficulty, pickRandomWord, selectNextTarget, triggerGameOver]);

  // Insufficient words notice
  if (validWords.length < 3) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-line bg-surface p-8 text-center shadow-sm">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="size-8" />
        </div>
        <h3 className="mt-4 text-xl font-black text-content">Cần tối thiểu 3 từ vựng để chơi</h3>
        <p className="mt-2 text-sm text-content-muted">
          Unit hiện tại chưa đủ từ vựng để bắt đầu minigame &quot;Mưa Từ Vựng&quot;. Vui lòng thêm từ vào bộ hoặc chọn Unit khác.
        </p>
      </div>
    );
  }

  // ==========================================
  // SCREEN 1: LOBBY & CONFIGURATION
  // ==========================================
  if (screen === 'config') {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Game Navigation Tabs at Top */}
        <div className="flex items-center gap-1.5 rounded-2xl border border-line bg-surface-elevated p-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => onChangeGameTab('tiles')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-extrabold transition-all active:scale-98 ${
              activeGameTab === 'tiles'
                ? 'bg-surface text-content shadow-sm border border-line/60'
                : 'text-content-muted hover:text-content hover:bg-surface/50'
            }`}
          >
            <Layers className="size-4" />
            <span>Ghép thẻ</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeGameTab('rain')}
            className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-extrabold transition-all active:scale-98 ${
              activeGameTab === 'rain'
                ? 'bg-amber-400 text-amber-950 dark:bg-amber-400 dark:text-amber-950 font-black shadow-md shadow-amber-500/20 border border-amber-500/40'
                : 'text-content-muted hover:text-content hover:bg-surface/50'
            }`}
          >
            <CloudRain className="size-4 text-amber-950 dark:text-amber-950" />
            <span>Mưa từ vựng</span>
            <span className="flex items-center gap-0.5 rounded-full bg-amber-950/15 border border-amber-950/20 px-2 py-0.5 text-[10px] font-black uppercase text-amber-950 shadow-sm">
              <Zap className="size-2.5" />
              MỚI
            </span>
          </button>
        </div>

        {/* Hero Preview Card: Warm Amber / Golden Glow Atmosphere */}
        <div className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-7 sm:p-9 text-white shadow-xl">
          {/* Ambient Warm Golden Lighting Orbs */}
          <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 size-72 rounded-full bg-amber-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 right-10 size-64 rounded-full bg-yellow-500/10 blur-3xl" />

          {/* Watermarked Typography Drift */}
          <div className="pointer-events-none absolute inset-0 select-none overflow-hidden text-amber-400/5 font-black tracking-widest text-xs uppercase">
            <span className="absolute top-4 left-6 text-2xl rotate-6">VOCABULARY</span>
            <span className="absolute top-12 right-8 text-xl -rotate-6">RAIN</span>
            <span className="absolute bottom-12 left-12 text-3xl -rotate-12">REFLEX</span>
            <span className="absolute bottom-6 right-16 text-2xl rotate-6">TOEIC</span>
          </div>

          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Illuminated Golden Basket Orb */}
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="relative grid size-20 place-items-center rounded-3xl bg-amber-400/15 backdrop-blur-md border border-amber-400/30 shadow-xl shadow-amber-950/40"
            >
              <div className="absolute inset-0 rounded-3xl bg-amber-400/20 blur-md" />
              <ShoppingBasket className="relative size-10 text-amber-400 drop-shadow-sm" />
            </motion.div>

            <h2 className="mt-4 text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-sm">
              Mưa Từ Vựng
            </h2>

            {/* Unit Info Badge */}
            <div className="mt-2.5 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3.5 py-1 text-xs font-bold text-amber-200 backdrop-blur-md">
              <BookOpen className="size-3.5 text-amber-400" />
              <span className="truncate max-w-xs">{topicName || 'Unit Từ Vựng Trọng Tâm'}</span>
              <span className="text-amber-400/40">•</span>
              <span className="text-amber-300">{validWords.length} từ</span>
            </div>

            <p className="mt-3 max-w-md text-xs sm:text-sm font-medium leading-relaxed text-slate-300">
              Rèn luyện tốc độ phản xạ: Chạm nhanh bong bóng từ tiếng Anh khớp với nghĩa trong giỏ trước khi rơi chạm đáy!
            </p>
          </div>
        </div>

        {/* Rules Guide Block */}
        <div className="space-y-4 rounded-3xl border border-line bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <Target className="size-4 text-amber-500" />
              <h3 className="text-sm font-black text-content">Luật chơi & Cơ chế điểm</h3>
            </div>
            <span className="text-[11px] font-bold text-content-muted">Khởi động 3 phút</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
            <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface-elevated p-3.5">
              <div className="grid size-7 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Target className="size-4" />
              </div>
              <div className="space-y-0.5">
                <span className="font-black text-content">Bắt từ theo nghĩa</span>
                <p className="text-content-muted leading-relaxed">
                  Nhìn nghĩa & loại từ trong giỏ ở đáy, chạm đúng bong bóng tiếng Anh tương ứng.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface-elevated p-3.5">
              <div className="grid size-7 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Zap className="size-4" />
              </div>
              <div className="space-y-0.5">
                <span className="font-black text-content">Chuỗi Combo nhân điểm</span>
                <p className="text-content-muted leading-relaxed">
                  Chạm đúng liên tiếp để kích hoạt hệ số thưởng: <strong className="text-amber-600 dark:text-amber-400">1.5x ➔ 2x ➔ 3x</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface-elevated p-3.5">
              <div className="grid size-7 shrink-0 place-items-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <HeartCrack className="size-4" />
              </div>
              <div className="space-y-0.5">
                <span className="font-black text-content">Giới hạn 3 Trái tim</span>
                <p className="text-content-muted leading-relaxed">
                  Chạm nhầm từ hoặc để từ mục tiêu chạm đáy sẽ mất 1 tim. Hết tim kết thúc ván.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface-elevated p-3.5">
              <div className="grid size-7 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Gauge className="size-4" />
              </div>
              <div className="space-y-0.5">
                <span className="font-black text-content">Tăng tốc theo cấp</span>
                <p className="text-content-muted leading-relaxed">
                  Cứ mỗi 5 từ bắt đúng sẽ thăng cấp, tốc độ rơi tăng dần thử thách phản xạ.
                </p>
              </div>
            </div>
          </div>

          {/* Warning Notice Box: SRS Exemption */}
          <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs font-bold text-amber-700 dark:text-amber-300">
            <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Không lưu tiến độ SRS — chế độ minigame giải trí & khởi động phản xạ từ vựng.</span>
          </div>
        </div>

        {/* Difficulty Selector: Hardware/Card Style with Amber Highlights */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase tracking-wider text-content-muted">
              Chọn độ khó (Số từ hiển thị đồng thời)
            </label>
            <span className="text-[11px] font-bold text-content-muted">
              Mặc định: Vừa (5 từ)
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {(['easy', 'medium', 'hard'] as DifficultyMode[]).map((mode) => {
              const conf = DIFFICULTY_SETTINGS[mode];
              const isSelected = difficulty === mode;

              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDifficulty(mode)}
                  className={`group relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all active:scale-98 ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/25 shadow-sm'
                      : 'border-line bg-surface text-content hover:border-amber-400/50 hover:bg-surface-hover'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-content">{conf.name}</span>
                    <span className="text-[11px] font-black text-amber-600 dark:text-amber-400">
                      {conf.bubbleCount} từ
                    </span>
                  </div>

                  <p className="mt-2 text-[11px] font-medium text-content-muted leading-tight">
                    {conf.description}
                  </p>

                  {/* Segmented density bar */}
                  <div className="mt-3 flex items-center gap-1">
                    {[1, 2, 3].map((barIndex) => (
                      <div
                        key={barIndex}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          barIndex <= conf.bars
                            ? isSelected
                              ? 'bg-amber-500'
                              : 'bg-amber-400/50 dark:bg-amber-500/40'
                            : 'bg-line'
                        }`}
                      />
                    ))}
                  </div>

                  {isSelected && (
                    <div className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-amber-500 text-amber-950 shadow-sm">
                      <CheckCircle2 className="size-3.5" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary CTA Start Button: Golden Amber Palette */}
        <button
          type="button"
          onClick={startGame}
          className="group relative flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 px-6 text-base font-black text-amber-950 shadow-lg shadow-amber-500/25 transition-all hover:brightness-105 active:scale-[0.98]"
        >
          <Rocket className="size-5 transition-transform group-hover:-translate-y-0.5 group-hover:rotate-12" />
          <span>Bắt đầu chơi ngay</span>
        </button>
      </div>
    );
  }

  // ==========================================
  // SCREEN 2: GAMEPLAY CANVAS
  // ==========================================
  if (screen === 'gameplay') {
    const currentPos = formatPartOfSpeech(targetWord?.partOfSpeech);
    const currentMeaning = cleanMeaningText(targetWord?.meaningVi);

    return (
      <div className="mx-auto max-w-2xl space-y-3">
        {/* Top Header: Read-only compact indicator + Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 pointer-events-none select-none">
            <span className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-700 dark:text-amber-400">
              Mưa Từ Vựng
            </span>
            <span className="text-xs font-bold text-content-muted">
              Độ khó: {DIFFICULTY_SETTINGS[difficulty].name} ({DIFFICULTY_SETTINGS[difficulty].bubbleCount} từ)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled((prev) => !prev)}
              title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
              className="grid size-8 place-items-center rounded-xl border border-line bg-surface text-content-muted hover:text-content hover:bg-surface-hover active:scale-95"
            >
              {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4 text-rose-500" />}
            </button>

            <button
              type="button"
              onClick={() => setIsPaused((prev) => !prev)}
              className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1 text-xs font-extrabold text-content hover:bg-surface-hover active:scale-95"
            >
              {isPaused ? <Play className="size-3.5 text-emerald-500 fill-current" /> : <Pause className="size-3.5" />}
              <span>{isPaused ? 'Tiếp tục' : 'Tạm dừng'}</span>
            </button>

            <button
              type="button"
              onClick={() => setScreen('config')}
              className="flex items-center gap-1 rounded-xl border border-line bg-surface px-2.5 py-1 text-xs font-extrabold text-rose-500 hover:bg-rose-500/10 active:scale-95"
            >
              <ArrowLeft className="size-3.5" />
              <span>Thoát</span>
            </button>
          </div>
        </div>

        {/* HUD Status Bar: Hearts, Combo Tag, Trophy + Score */}
        <div className="flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3 shadow-sm">
          {/* Hearts indicator with heartbeat pulse when low */}
          <div className="flex items-center gap-1.5" aria-label={`Còn ${hearts} tim`}>
            {[1, 2, 3].map((heartIndex) => {
              const isAlive = heartIndex <= hearts;
              const isLastHeart = hearts === 1 && isAlive;

              return (
                <motion.div
                  key={heartIndex}
                  animate={
                    isLastHeart
                      ? { scale: [1, 1.25, 1] }
                      : basketShake && !isAlive && heartIndex === hearts + 1
                      ? { scale: [1.3, 0.9, 1], rotate: [0, -10, 10, 0] }
                      : {}
                  }
                  transition={
                    isLastHeart
                      ? { repeat: Infinity, duration: 0.8, ease: 'easeInOut' }
                      : { duration: 0.3 }
                  }
                >
                  <Heart
                    className={`size-6 transition-all ${
                      isAlive
                        ? 'fill-rose-500 text-rose-500 filter drop-shadow-[0_2px_6px_rgba(244,63,94,0.4)]'
                        : 'fill-transparent text-content-muted/25 stroke-1'
                    }`}
                  />
                </motion.div>
              );
            })}
          </div>

          {/* Combo Multiplier Tag: Warm Amber / Flame Progression */}
          <div>
            {combo >= 2 ? (
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black shadow-sm ${
                  combo >= 7
                    ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-amber-950 font-black animate-pulse'
                    : combo >= 4
                    ? 'bg-amber-500 text-amber-950 font-black'
                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                }`}
              >
                <Flame className="size-3.5 fill-current" />
                <span>
                  {combo >= 7 ? 'x3.0 MAX COMBO!' : combo >= 4 ? 'x2.0 COMBO!' : 'x1.5 COMBO!'}
                </span>
              </motion.div>
            ) : (
              <span className="text-[11px] font-bold text-content-muted">Chuỗi: {combo}</span>
            )}
          </div>

          {/* Score Counter */}
          <div className="flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Trophy className="size-4" />
            </div>
            <div className="text-right">
              <div className="text-base sm:text-lg font-black text-content leading-tight font-mono">
                {score.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Main Arcade Canvas with Ambient Amber Dot-Grid */}
        <div
          ref={canvasRef}
          className={`relative h-[530px] sm:h-[590px] w-full overflow-hidden rounded-3xl border select-none transition-colors ${
            basketShake
              ? 'border-rose-500 ring-4 ring-rose-500/20'
              : 'border-line'
          } bg-surface`}
          style={{
            backgroundImage: `radial-gradient(circle, rgba(245, 158, 11, 0.12) 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        >
          {/* Ambient Warm Amber Glow in Canvas */}
          <div className="pointer-events-none absolute -top-10 left-10 size-40 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-24 right-10 size-48 rounded-full bg-yellow-500/10 blur-3xl" />

          {/* Level Up Banner Notification */}
          <AnimatePresence>
            {levelUpBanner && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                className="absolute top-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 px-5 py-2.5 text-xs sm:text-sm font-black text-amber-950 shadow-xl shadow-amber-500/30"
              >
                <Zap className="size-4 fill-current text-amber-950" />
                <span>LÊN CẤP {level}! TỐC ĐỘ TĂNG DẦN!</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pause Overlay */}
          {isPaused && (
            <div className="absolute inset-0 z-40 grid place-items-center bg-black/40 backdrop-blur-sm">
              <div className="rounded-3xl border border-line bg-surface p-6 text-center shadow-2xl">
                <Pause className="mx-auto size-10 text-amber-500" />
                <h3 className="mt-3 text-lg font-black text-content">Trò chơi tạm dừng</h3>
                <p className="mt-1 text-xs text-content-muted">Nghỉ tay một chút rồi tiếp tục nhé!</p>
                <button
                  type="button"
                  onClick={() => setIsPaused(false)}
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-amber-400 hover:bg-amber-300 px-6 text-xs font-black text-amber-950 shadow-md"
                >
                  <Play className="size-4 fill-current" /> Tiếp tục chơi
                </button>
              </div>
            </div>
          )}

          {/* Score Popups */}
          {scorePopups.map((popup) => (
            <motion.div
              key={popup.id}
              initial={{ opacity: 1, y: 0, scale: 0.9 }}
              animate={{ opacity: 0, y: -35, scale: 1.15 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{
                left: `${popup.xPercent}%`,
                top: `${popup.y}px`,
                transform: 'translateX(-50%)',
              }}
              className="pointer-events-none absolute z-30 font-black text-sm sm:text-base whitespace-nowrap drop-shadow-md text-amber-600 dark:text-amber-400"
            >
              {popup.text}
            </motion.div>
          ))}

          {/* Falling Word Bubbles with Warm Amber Accents */}
          {bubbles.map((b) => {
            const isPopping = b.status === 'popping';

            return (
              <div
                key={b.id}
                onClick={() => handleBubbleClick(b)}
                style={{
                  position: 'absolute',
                  left: `${b.xPercent}%`,
                  top: `${b.y}px`,
                  transform: 'translateX(-50%)',
                  transition: isPopping ? 'transform 0.22s ease-out, opacity 0.22s ease-out' : 'none',
                  opacity: isPopping ? 0 : 1,
                  pointerEvents: isPopping || isPaused ? 'none' : 'auto',
                }}
                className={`z-20 cursor-pointer touch-manipulation select-none active:scale-95 ${
                  isPopping ? 'scale-125' : ''
                }`}
              >
                {/* Tactile Capsule: Amber outline + Inner glossy sheen + High-contrast text */}
                <div className="group relative flex items-center justify-center rounded-full border-2 border-amber-400/80 bg-surface/90 px-4 py-2 sm:px-6 sm:py-2.5 text-center shadow-lg shadow-amber-950/10 backdrop-blur-xl transition-all hover:scale-105 hover:border-amber-500 active:scale-95 dark:border-amber-400/60 dark:bg-slate-900/90 dark:shadow-black/40">
                  {/* Subtle glossy highlight arc */}
                  <div className="pointer-events-none absolute inset-x-3 top-1 h-1/2 rounded-full bg-gradient-to-b from-white/35 to-transparent dark:from-white/10" />

                  <span className="relative text-xs sm:text-sm md:text-base font-black tracking-wide text-content transition-colors group-hover:text-amber-600 dark:group-hover:text-amber-400">
                    {b.word}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Fixed Floating Basket Dock at Bottom with Amber Accents */}
          <div className="absolute inset-x-3 bottom-3 z-20 overflow-hidden rounded-3xl border border-line bg-surface/95 p-3.5 sm:p-4 backdrop-blur-xl shadow-2xl">
            {/* Luminous boundary line across top of dock */}
            <div className="absolute top-0 inset-x-4 border-t border-dashed border-amber-400/50 dark:border-amber-500/40" />

            <div className="flex items-center justify-between gap-3 pt-1">
              {/* Basket Icon + Meaning info */}
              <div className="flex items-center gap-3">
                <div className="grid size-11 sm:size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-amber-950 shadow-md shadow-amber-500/25">
                  <ShoppingBasket className="size-6" />
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                      HỨNG TỪ CÓ NGHĨA
                    </span>
                    {/* Part of Speech Tag */}
                    <span className="rounded-full bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                      {currentPos}
                    </span>
                  </div>

                  {/* Target Vietnamese Meaning */}
                  <h3 className="text-base sm:text-lg md:text-xl font-black text-content leading-tight">
                    {currentMeaning || 'Đang chuẩn bị từ...'}
                  </h3>
                </div>
              </div>

              {/* Level Badge */}
              <div className="shrink-0 text-right">
                <span className="inline-flex items-center gap-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-700 dark:text-amber-400">
                  <Zap className="size-3 text-amber-500 fill-current" />
                  Cấp {level}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Small Bottom Guidance */}
        <div className="flex items-center justify-between px-2 text-[11px] font-bold text-content-muted">
          <span>Chạm từ tiếng Anh khớp với nghĩa trong giỏ</span>
          <span>Đã bắt đúng: {correctCount} từ</span>
        </div>
      </div>
    );
  }

  // ==========================================
  // SCREEN 3: RESULTS / GAME OVER
  // ==========================================
  const getFeedbackRank = () => {
    if (score >= 2000) return { title: 'Bậc Thầy Bắt Từ! 🚀', desc: 'Phản xạ phi thường! Tốc độ và độ chính xác của bạn ở mức đỉnh cao.' };
    if (score >= 1000) return { title: 'Cao Thủ Phản Xạ! ⚡', desc: 'Rất xuất sắc! Vốn từ và tốc độ nhận diện của bạn cực kỳ nhạy bén.' };
    if (score >= 400) return { title: 'Luyện Tập Rất Tốt! 🎯', desc: 'Bạn đã bắt được khá nhiều từ vựng. Cố gắng thêm chút nữa để đạt kỷ lục mới!' };
    return { title: 'Khởi Động Tốt! 🌱', desc: 'Đừng nản lòng! Chơi lại vài ván để tăng dần phản xạ nhận diện từ vựng nhé.' };
  };

  const rank = getFeedbackRank();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="mx-auto max-w-xl space-y-6 rounded-3xl border border-line bg-surface p-7 sm:p-9 text-center shadow-xl"
    >
      {/* Trophy Badge */}
      <div className="relative mx-auto grid size-20 sm:size-24 place-items-center rounded-3xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-500 text-amber-950 shadow-xl shadow-amber-500/25">
        <Trophy className="size-10 sm:size-12" />
        <span className="absolute -top-1 -right-1 grid size-6 place-items-center rounded-full bg-slate-900 text-amber-400 shadow-md">
          <Crown className="size-3" />
        </span>
      </div>

      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-content">{rank.title}</h2>
        <p className="mt-1.5 text-xs sm:text-sm text-content-muted leading-relaxed">
          {rank.desc}
        </p>
      </div>

      {/* 4 Bento Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 text-left">
        <div className="rounded-2xl border border-line bg-surface-elevated p-4">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-content-muted">
            <Trophy className="size-4 text-amber-500" />
            <span>Tổng điểm</span>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black text-content font-mono">
            {score.toLocaleString()}
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface-elevated p-4">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-content-muted">
            <Flame className="size-4 text-amber-500" />
            <span>Combo cao nhất</span>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black text-content font-mono">
            {maxCombo}x
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface-elevated p-4">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-content-muted">
            <CheckCircle2 className="size-4 text-emerald-500" />
            <span>Từ bắt đúng</span>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black text-content">
            {correctCount} từ
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface-elevated p-4">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-content-muted">
            <Zap className="size-4 text-amber-500" />
            <span>Cấp độ đạt được</span>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black text-content">
            Cấp {level}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <button
          type="button"
          onClick={startGame}
          className="flex min-h-12 w-full flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 px-6 text-sm font-black text-amber-950 shadow-lg shadow-amber-500/25 transition-all hover:brightness-105 active:scale-98"
        >
          <RotateCcw className="size-4" />
          <span>Chơi lại ngay</span>
        </button>

        <button
          type="button"
          onClick={() => setScreen('config')}
          className="flex min-h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-5 text-sm font-extrabold text-content transition hover:bg-surface-hover active:scale-98"
        >
          <ArrowLeft className="size-4" />
          <span>Về trang chọn game</span>
        </button>
      </div>
    </motion.div>
  );
};
