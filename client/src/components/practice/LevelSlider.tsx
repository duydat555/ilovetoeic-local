import React, { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { LEVEL_LABELS, LEVEL_LABELS_EN } from '../../data/practiceByLevelData';
import { useLanguage } from '../../context/LanguageContext';

interface LevelSliderProps {
  value: number;
  onChange: (level: number) => void;
  completedLevels?: number[];
  className?: string;
  label?: string;
}

const getLevelColor = (level: number) => {
  if (level <= 2) return '#10b981';
  if (level === 3) return '#f59e0b';
  return '#f97316';
};

const LEVEL_EMOTIONS = ['😒', '😏', '😐', '😰', '🤯'] as const;

const getEmotionBubbleClass = (level: number) => {
  if (level <= 2) return 'border-emerald-300 bg-emerald-100 dark:border-emerald-500/50 dark:bg-emerald-500/20';
  if (level === 3) return 'border-amber-300 bg-amber-100 dark:border-amber-500/50 dark:bg-amber-500/20';
  return 'border-orange-300 bg-orange-100 dark:border-orange-500/50 dark:bg-orange-500/20';
};

export const LevelSlider: React.FC<LevelSliderProps> = ({
  value,
  onChange,
  completedLevels = [],
  className = '',
  label,
}) => {
  const { language } = useLanguage();
  const inputId = useId();
  const reduceMotion = useReducedMotion();
  const hideTimerRef = useRef<number | null>(null);
  const pointerActiveRef = useRef(false);
  const [showEmotion, setShowEmotion] = useState(false);
  const completed = new Set(completedLevels);
  const selectedColor = getLevelColor(value);
  const progress = `${((value - 1) / 4) * 100}%`;
  const labels = language === 'en' ? LEVEL_LABELS_EN : LEVEL_LABELS;
  const computedLabel = label || (language === 'en' ? 'Select difficulty' : 'Chọn độ khó');

  const clearHideTimer = () => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const scheduleEmotionHide = () => {
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      setShowEmotion(false);
      hideTimerRef.current = null;
    }, 450);
  };

  useEffect(() => () => clearHideTimer(), []);

  const handlePointerDown = () => {
    pointerActiveRef.current = true;
    clearHideTimer();
    setShowEmotion(true);
  };

  const handlePointerEnd = () => {
    pointerActiveRef.current = false;
    scheduleEmotionHide();
  };

  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setShowEmotion(true);
    onChange(Number(event.currentTarget.value));
    if (!pointerActiveRef.current) scheduleEmotionHide();
  };

  return (
    <div className={`level-slider ${className}`} style={{ '--level-color': selectedColor, '--level-progress': progress } as React.CSSProperties}>
      <label htmlFor={inputId} className="sr-only">{computedLabel}</label>
      <div className="relative px-3 pt-12 sm:px-4">
        <div className="pointer-events-none absolute inset-x-3 top-7 grid grid-cols-5 sm:inset-x-4" aria-hidden="true">
          {labels.map((_, index) => {
            const level = index + 1;
            const isCompleted = completed.has(level);
            return (
              <div key={level} className="relative flex justify-center">
                {isCompleted ? (
                  <span
                    className="pointer-events-auto grid size-4 place-items-center rounded-full bg-positive text-white shadow-sm"
                    title={language === 'en' ? `Completed Level ${level}` : `Đã hoàn thành Level ${level}`}
                  >
                    <Check className="size-2.5" strokeWidth={3} />
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="relative">
          <motion.div
            className="pointer-events-none absolute bottom-9 z-20"
            initial={false}
            animate={{ left: progress }}
            transition={reduceMotion
              ? { duration: 0 }
              : { type: 'spring', stiffness: 560, damping: 38, mass: 0.4 }}
            aria-hidden="true"
          >
            <AnimatePresence initial={false}>
              {showEmotion && (
                <motion.div
                  key="level-emotion-bubble"
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.82, y: 3 }}
                  transition={reduceMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 420, damping: 18, mass: 0.55 }}
                  className={`relative grid size-9 -translate-x-1/2 place-items-center rounded-full border text-lg leading-none shadow-sm transition-colors duration-150 motion-reduce:transition-none ${getEmotionBubbleClass(value)}`}
                >
                  <AnimatePresence initial={false} mode="popLayout">
                    <motion.span
                      key={value}
                      className="col-start-1 row-start-1"
                      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.55, y: 3 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.78, y: -2 }}
                      transition={reduceMotion
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 520, damping: 22, mass: 0.35 }}
                    >
                      {LEVEL_EMOTIONS[value - 1]}
                    </motion.span>
                  </AnimatePresence>
                  <span className="absolute -bottom-1 size-2 rotate-45 border-b border-r border-inherit bg-inherit" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <input
            id={inputId}
            type="range"
            min={1}
            max={5}
            step={1}
            value={value}
            onChange={handleValueChange}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onBlur={() => {
              pointerActiveRef.current = false;
              scheduleEmotionHide();
            }}
            className="level-range"
            aria-valuetext={`Level ${value}, ${labels[value - 1]}`}
          />
        </div>
      </div>

      <div className="mt-2 grid grid-cols-5">
        {labels.map((levelLabel, index) => {
          const level = index + 1;
          const selected = value === level;
          return (
            <button
              key={levelLabel}
              type="button"
              aria-label={language === 'en' ? `Select Level ${level}, ${levelLabel}` : `Chọn Level ${level}, ${levelLabel}`}
              aria-pressed={selected}
              onClick={() => onChange(level)}
              className={`min-w-0 px-0.5 text-center text-[10px] leading-tight sm:text-xs ${selected ? 'font-extrabold text-content' : 'font-semibold text-content-muted'}`}
            >
              <span className="block text-xs sm:text-sm">{level}</span>
              <span className="mt-0.5 block break-words">{levelLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
