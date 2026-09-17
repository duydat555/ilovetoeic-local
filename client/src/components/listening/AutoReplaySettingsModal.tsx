import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Clock, Minus, Plus, RefreshCw, Repeat, SlidersHorizontal, X } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { getModalMotion } from '../common/modalMotion';
import { useLanguage } from '../../context/LanguageContext';

export interface AutoReplayConfig {
  autoAdvance: boolean;
  repeatCount: number; // 1 = phát 1 lần (không lặp), 2 = 2 lần, 3 = 3 lần, 0 = vô hạn
  delaySeconds: number; // thời gian nghỉ giữa các lần lặp (giây)
}

export const DEFAULT_AUTO_REPLAY_CONFIG: AutoReplayConfig = {
  autoAdvance: false,
  repeatCount: 1,
  delaySeconds: 1.5,
};

interface AutoReplaySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AutoReplayConfig;
  onSaveConfig: (newConfig: AutoReplayConfig) => void;
}

const DELAY_PRESETS = [0.5, 1.0, 1.5, 2.0, 3.0, 4.0];

export const AutoReplaySettingsModal: React.FC<AutoReplaySettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const { language } = useLanguage();
  const [localConfig, setLocalConfig] = useState<AutoReplayConfig>(config);

  const repeatPresets = useMemo(() => [
    { value: 1, label: language === 'en' ? '1 time' : '1 lần' },
    { value: 2, label: language === 'en' ? '2 times' : '2 lần' },
    { value: 3, label: language === 'en' ? '3 times' : '3 lần' },
    { value: 5, label: language === 'en' ? '5 times' : '5 lần' },
    { value: 0, label: language === 'en' ? '∞ Infinite' : '∞ Vô hạn' },
  ], [language]);

  const reduceMotion = useReducedMotion();
  const modalMotion = getModalMotion(reduceMotion);

  useEffect(() => {
    if (isOpen) {
      setLocalConfig(config);
    }
  }, [isOpen, config]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleApply = () => {
    onSaveConfig(localConfig);
    onClose();
  };

  const handleResetDefaults = () => {
    setLocalConfig(DEFAULT_AUTO_REPLAY_CONFIG);
  };

  const adjustRepeatCount = (delta: number) => {
    setLocalConfig((prev) => {
      if (prev.repeatCount === 0 && delta < 0) {
        return { ...prev, repeatCount: 5 };
      }
      const next = Math.max(1, Math.min(10, prev.repeatCount + delta));
      return { ...prev, repeatCount: next };
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        {...modalMotion.backdrop}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        aria-hidden="true"
      />

      {/* Modal Dialog Panel */}
      <motion.div
        {...modalMotion.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auto-replay-modal-title"
        className="relative z-10 w-full max-w-lg rounded-3xl border border-line bg-surface p-6 sm:p-7 shadow-2xl space-y-6"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-accent/15 text-accent-strong ring-1 ring-accent/30 shadow-xs">
              <SlidersHorizontal className="size-5" />
            </div>
            <div>
              <h2 id="auto-replay-modal-title" className="text-base sm:text-lg font-extrabold text-content">
                {language === 'en' ? 'Auto-Replay Settings' : 'Cài đặt tự động phát lại'}
              </h2>
              <p className="mt-0.5 text-xs text-content-muted">
                {language === 'en'
                  ? 'Adjust repeat count and pause duration between replays'
                  : 'Điều chỉnh số lần lặp và thời gian nghỉ giữa các lần nghe'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={language === 'en' ? 'Close window' : 'Đóng cửa sổ'}
            className="grid size-8 place-items-center rounded-xl text-content-muted transition hover:bg-surface-elevated hover:text-content"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content Section */}
        <div className="space-y-5">
          {/* Section 1: Auto Advance Toggle */}
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface-elevated/40 p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Repeat className="size-4 text-accent-strong" />
                <span className="text-sm font-extrabold text-content">
                  {language === 'en' ? 'Auto-advance to next sentence' : 'Tự động chuyển câu tiếp theo'}
                </span>
              </div>
              <p className="text-xs text-content-muted">
                {language === 'en'
                  ? 'Automatically advance to next sentence after completing repeats for current sentence'
                  : 'Tự động sang câu kế tiếp sau khi đã phát hết số lần lặp của câu hiện tại'}
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={localConfig.autoAdvance}
              onClick={() => setLocalConfig((prev) => ({ ...prev, autoAdvance: !prev.autoAdvance }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent ${
                localConfig.autoAdvance ? 'bg-accent' : 'bg-surface-elevated border-line'
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  localConfig.autoAdvance ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Section 2: Repeat Count Selection */}
          <div className="space-y-3 rounded-2xl border border-line bg-surface-elevated/40 p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-extrabold text-content">
                  {language === 'en' ? 'Replay count per sentence' : 'Số lần phát lại mỗi câu'}
                </span>
                <p className="text-xs text-content-muted mt-0.5">
                  {language === 'en'
                    ? 'Repeating sentences improves phonetic listening and intonation reflex'
                    : 'Lặp lại câu giúp tăng khả năng bắt âm và phản xạ ngữ điệu'}
                </p>
              </div>

              {/* Stepper control */}
              <div className="flex items-center gap-1 rounded-xl border border-line bg-surface px-1.5 py-1">
                <button
                  type="button"
                  onClick={() => adjustRepeatCount(-1)}
                  disabled={localConfig.repeatCount === 1}
                  className="grid size-6 place-items-center rounded-lg text-content-muted transition hover:bg-surface-hover hover:text-content disabled:opacity-30"
                  aria-label={language === 'en' ? 'Decrease 1 repeat' : 'Giảm 1 lần lặp'}
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="w-14 text-center text-xs font-black text-content tabular-nums">
                  {localConfig.repeatCount === 0
                    ? (language === 'en' ? 'Infinite' : 'Vô hạn')
                    : (language === 'en' ? `${localConfig.repeatCount}x` : `${localConfig.repeatCount} lần`)}
                </span>
                <button
                  type="button"
                  onClick={() => adjustRepeatCount(1)}
                  disabled={localConfig.repeatCount >= 10 || localConfig.repeatCount === 0}
                  className="grid size-6 place-items-center rounded-lg text-content-muted transition hover:bg-surface-hover hover:text-content disabled:opacity-30"
                  aria-label={language === 'en' ? 'Increase 1 repeat' : 'Tăng 1 lần lặp'}
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            </div>

            {/* Quick chips for repeat count */}
            <div className="flex flex-wrap gap-2 pt-1">
              {repeatPresets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setLocalConfig((prev) => ({ ...prev, repeatCount: preset.value }))}
                  className={`flex-1 min-w-[70px] rounded-xl border px-2.5 py-1.5 text-xs font-bold transition active:scale-95 ${
                    localConfig.repeatCount === preset.value
                      ? 'border-accent bg-accent text-accent-contrast shadow-sm'
                      : 'border-line bg-surface text-content-muted hover:border-line-hover hover:text-content'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Pause Delay Duration Between Repeats */}
          <div className="space-y-3 rounded-2xl border border-line bg-surface-elevated/40 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-accent-strong" />
                <div>
                  <span className="text-sm font-extrabold text-content">
                    {language === 'en' ? 'Pause between repeats' : 'Khoảng nghỉ giữa các lần lặp'}
                  </span>
                  <p className="text-xs text-content-muted mt-0.5">
                    {language === 'en'
                      ? 'Pause duration for shadowing before replaying'
                      : 'Thời gian tạm dừng để nhại theo (shadowing) trước khi phát lại'}
                  </p>
                </div>
              </div>

              <span className="rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200 tabular-nums shadow-xs">
                {localConfig.delaySeconds.toFixed(1)} {language === 'en' ? 'sec' : 'giây'}
              </span>
            </div>

            {/* Range Slider for delay */}
            <div className="space-y-2 pt-1">
              <input
                type="range"
                min={0.5}
                max={5.0}
                step={0.5}
                value={localConfig.delaySeconds}
                onChange={(e) =>
                  setLocalConfig((prev) => ({
                    ...prev,
                    delaySeconds: parseFloat(e.target.value),
                  }))
                }
                aria-label={language === 'en' ? 'Pause between repeats in seconds' : 'Khoảng nghỉ giữa các lần lặp tính theo giây'}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-surface accent-accent"
              />

              {/* Quick preset chips */}
              <div className="flex flex-wrap gap-2 pt-1">
                {DELAY_PRESETS.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setLocalConfig((prev) => ({ ...prev, delaySeconds: sec }))}
                    className={`flex-1 rounded-xl border px-2 py-1 text-xs font-bold transition active:scale-95 ${
                      localConfig.delaySeconds === sec
                        ? 'border-accent bg-accent text-accent-contrast shadow-sm'
                        : 'border-line bg-surface text-content-muted hover:border-line-hover hover:text-content'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-content-muted hover:text-content transition"
          >
            <RefreshCw className="size-3.5" />
            <span>{language === 'en' ? 'Defaults' : 'Mặc định'}</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-line px-4 py-2 text-xs font-bold text-content-muted transition hover:bg-surface-elevated hover:text-content"
            >
              {language === 'en' ? 'Cancel' : 'Hủy'}
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="btn-primary gap-1.5 text-xs px-5 py-2"
            >
              <Check className="size-4" />
              <span>{language === 'en' ? 'Apply Settings' : 'Áp dụng cài đặt'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};
