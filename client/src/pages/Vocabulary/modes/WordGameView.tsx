import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Gamepad2,
  Trophy,
  RotateCcw,
  Timer,
  Flame,
  CheckCircle2,
  Layers,
  CloudRain,
  Zap,
} from 'lucide-react';
import { VocabularyWord } from '../../../types';
import { playPronunciation } from '../../../utils/audioPronunciation';
import { soundFX } from '../../../utils/soundEffects';
import { WordRainGameView } from './WordRainGameView';

interface Props {
  words: VocabularyWord[];
  topicName?: string;
}

interface GameTile {
  id: string; // unique tile id
  wordId: string; // reference to VocabularyWord
  text: string;
  type: 'word' | 'meaning';
  isMatched: boolean;
}

export const WordGameView: React.FC<Props> = ({ words, topicName }) => {
  const [activeGame, setActiveGame] = useState<'rain' | 'tiles'>('rain');
  const [tiles, setTiles] = useState<GameTile[]>([]);
  const [firstPick, setFirstPick] = useState<GameTile | null>(null);
  const [secondPick, setSecondPick] = useState<GameTile | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isWon, setIsWon] = useState(false);
  const [combo, setCombo] = useState(0);

  // Initialize game with 6 random words (12 tiles)
  const initGame = () => {
    if (words.length < 3) return;
    const shuffledWords = [...words].sort(() => Math.random() - 0.5).slice(0, 6);

    const generatedTiles: GameTile[] = [];
    shuffledWords.forEach((w) => {
      generatedTiles.push({
        id: `${w.id}-en`,
        wordId: w.id,
        text: w.word,
        type: 'word',
        isMatched: false,
      });
      generatedTiles.push({
        id: `${w.id}-vi`,
        wordId: w.id,
        text: w.meaningVi.split(';')[0].split(',')[0].trim(), // keep concise for tile
        type: 'meaning',
        isMatched: false,
      });
    });

    setTiles(generatedTiles.sort(() => Math.random() - 0.5));
    setFirstPick(null);
    setSecondPick(null);
    setIsEvaluating(false);
    setTimerSeconds(0);
    setIsTimerRunning(true);
    setIsWon(false);
    setCombo(0);
  };

  useEffect(() => {
    initGame();
  }, [words]);

  // Timer loop
  useEffect(() => {
    if (!isTimerRunning || isWon) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, isWon]);

  const handleTileClick = (tile: GameTile) => {
    if (isEvaluating || tile.isMatched || tile.id === firstPick?.id) return;

    if (!firstPick) {
      setFirstPick(tile);
    } else {
      setSecondPick(tile);
      setIsEvaluating(true);

      // Check match: must be same wordId and different type (one word, one meaning)
      const isMatch = firstPick.wordId === tile.wordId && firstPick.type !== tile.type;

      if (isMatch) {
        soundFX.playWordPop();
        setTimeout(() => {
          setTiles((prev) =>
            prev.map((t) => (t.wordId === tile.wordId ? { ...t, isMatched: true } : t))
          );
          setCombo((c) => c + 1);

          // Play pronunciation
          const matchingWord = words.find((w) => w.id === tile.wordId);
          if (matchingWord) {
            playPronunciation(matchingWord.word, 'US');
          }

          setFirstPick(null);
          setSecondPick(null);
          setIsEvaluating(false);
        }, 300);
      } else {
        soundFX.playWrong();
        setCombo(0);
        setTimeout(() => {
          setFirstPick(null);
          setSecondPick(null);
          setIsEvaluating(false);
        }, 700);
      }
    }
  };

  // Check win condition
  useEffect(() => {
    if (tiles.length > 0 && tiles.every((t) => t.isMatched)) {
      setIsWon(true);
      setIsTimerRunning(false);
      soundFX.playComplete();
    }
  }, [tiles]);

  if (words.length < 3) {
    return (
      <div className="grid min-h-72 place-items-center rounded-3xl border border-line bg-surface p-8 text-center">
        <div>
          <Gamepad2 className="mx-auto size-12 text-content-muted" />
          <h3 className="mt-3 text-base font-black text-content">Cần tối thiểu 3 từ vựng để chơi</h3>
          <p className="mt-1 text-xs text-content-muted">Vui lòng thêm từ vào bộ để bắt đầu trò chơi nối từ.</p>
        </div>
      </div>
    );
  }

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (activeGame === 'rain') {
    return (
      <WordRainGameView
        words={words}
        topicName={topicName}
        activeGameTab={activeGame}
        onChangeGameTab={setActiveGame}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Game Navigation Tabs at Top */}
      <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface p-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveGame('tiles')}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-extrabold bg-accent text-accent-contrast shadow-sm transition-all"
        >
          <Layers className="size-4" />
          <span>Ghép thẻ</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveGame('rain')}
          className="relative flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-extrabold text-content-muted hover:bg-surface-hover hover:text-content transition-all"
        >
          <CloudRain className="size-4 text-amber-500" />
          <span>Mưa từ vựng</span>
          <span className="flex items-center gap-0.5 rounded-full bg-amber-500/20 border border-amber-500/35 px-2 py-0.5 text-[10px] font-black uppercase text-amber-700 dark:text-amber-300 shadow-sm">
            <Zap className="size-2.5" />
            MỚI
          </span>
        </button>
      </div>

      {/* Top Bar: Timer, Combos & Reset */}
      <div className="flex items-center justify-between rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs font-black text-content">
            <Timer className="size-4 text-accent" />
            <span>{formatTime(timerSeconds)}</span>
          </div>

          {combo > 1 && (
            <div className="flex items-center gap-1 text-xs font-black text-amber-500 animate-pulse">
              <Flame className="size-4 fill-current" />
              <span>{combo}x Combo!</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={initGame}
          className="flex items-center gap-1.5 rounded-xl border border-line bg-surface-elevated px-3 py-1.5 text-xs font-extrabold text-content hover:bg-surface-hover"
        >
          <RotateCcw className="size-3.5" /> Chơi ván mới
        </button>
      </div>

      {/* Main Game Grid */}
      {!isWon ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {tiles.map((tile) => {
            const isSelected = firstPick?.id === tile.id || secondPick?.id === tile.id;
            const isFailed =
              secondPick &&
              isSelected &&
              !(firstPick?.wordId === secondPick?.wordId && firstPick?.type !== secondPick?.type);

            let style =
              'border-line bg-surface text-content hover:border-accent hover:scale-[1.02] shadow-sm';

            if (tile.isMatched) {
              style = 'invisible pointer-events-none opacity-0';
            } else if (isFailed) {
              style = 'border-rose-500 bg-rose-500/20 text-rose-700 dark:text-rose-300 scale-95';
            } else if (isSelected) {
              style =
                'border-accent bg-accent text-accent-contrast shadow-lg shadow-accent/25 scale-105';
            }

            return (
              <button
                key={tile.id}
                type="button"
                disabled={tile.isMatched || isEvaluating}
                onClick={() => handleTileClick(tile)}
                className={`flex min-h-24 select-none flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all ${style}`}
              >
                <span
                  className={`text-xs ${
                    tile.type === 'word' ? 'font-black text-base' : 'font-semibold text-xs leading-snug'
                  }`}
                >
                  {tile.text}
                </span>
                <span className="mt-1 text-[9px] uppercase font-bold opacity-60">
                  {tile.type === 'word' ? 'English' : 'Nghĩa'}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        /* Victory Screen */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl border border-line bg-surface p-8 text-center shadow-xl"
        >
          <div className="mx-auto grid size-20 place-items-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <Trophy className="size-10" />
          </div>
          <h3 className="mt-4 text-2xl font-black text-content">Tuyệt vời! Hoàn thành ván chơi!</h3>
          <p className="mt-1 text-sm text-content-muted">
            Bạn đã ghép đúng tất cả các cặp từ trong thời gian{' '}
            <span className="font-extrabold text-content">{formatTime(timerSeconds)}</span>.
          </p>

          <button
            type="button"
            onClick={initGame}
            className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-accent px-6 text-sm font-extrabold text-accent-contrast shadow-lg shadow-accent/25 hover:bg-accent/90"
          >
            <RotateCcw className="size-4" /> Chơi tiếp bộ khác
          </button>
        </motion.div>
      )}
    </div>
  );
};
