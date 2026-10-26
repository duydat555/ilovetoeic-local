import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Settings, Volume2, Keyboard, X, Minus, Plus } from 'lucide-react';
import { getModalMotion } from '../../../components/common/modalMotion';
import { ModalPortal } from '../../../components/common/ModalPortal';
import {
  getStoredAudioSettings,
  saveAudioSettings,
  AudioSettings,
} from '../../../utils/audioPronunciation';

interface Props {
  onClose: () => void;
}

const MIN_RATE = 0.5;
const MAX_RATE = 1.5;
const RATE_STEP = 0.05;

export const VocabularySettingsModal: React.FC<Props> = ({ onClose }) => {
  const reduceMotion = useReducedMotion();
  const motionContract = getModalMotion(reduceMotion);
  const [settings, setSettings] = useState<AudioSettings>(getStoredAudioSettings());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const updateRate = (rawRate: number) => {
    const clamped = Math.min(MAX_RATE, Math.max(MIN_RATE, Number(rawRate.toFixed(2))));
    const updated = { ...settings, playbackRate: clamped };
    setSettings(updated);
    saveAudioSettings(updated);
  };

  const toggleAutoPlay = () => {
    const updated = { ...settings, autoPlay: !settings.autoPlay };
    setSettings(updated);
    saveAudioSettings(updated);
  };

  const speedOptions = [
    { label: 'Rất chậm', value: 0.5 },
    { label: 'Chậm vừa', value: 0.6 },
    { label: 'Chậm', value: 0.75 },
    { label: 'Khuyên dùng', value: 0.9 },
    { label: 'Tự nhiên', value: 1.0 },
    { label: 'Nhanh', value: 1.25 },
  ];

  return (
    <ModalPortal>
      <motion.div
        {...motionContract.backdrop}
        className="fixed inset-0 z-[100] grid h-[100dvh] w-screen place-items-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
        onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          {...motionContract.panel}
          role="dialog"
          aria-modal="true"
          className="w-full max-w-lg rounded-3xl border border-line bg-surface p-6 shadow-2xl dark:shadow-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-accent/15 text-accent-strong">
                <Settings className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-content">Cài đặt học từ vựng</h2>
                <p className="text-xs text-content-muted">Tuỳ chỉnh âm thanh và xem phím tắt thao tác</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid size-9 place-items-center rounded-xl text-content-muted hover:bg-surface-hover hover:text-content"
              aria-label="Đóng"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-5 space-y-6">
            {/* Audio Speed */}
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-content-muted">
                  <Volume2 className="size-4 text-accent" />
                  <span>Tốc độ phát âm</span>
                </div>
                <span className="rounded-lg bg-accent/15 px-2.5 py-0.5 font-mono text-xs font-black text-accent-strong">
                  {Number(settings.playbackRate.toFixed(2))}x
                </span>
              </div>

              {/* Thanh trượt điều chỉnh tốc độ tuỳ thích */}
              <div className="mt-3 rounded-2xl border border-line bg-surface-elevated p-3">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => updateRate(settings.playbackRate - RATE_STEP)}
                    disabled={settings.playbackRate <= MIN_RATE}
                    aria-label="Giảm tốc độ 0.05x"
                    className="grid size-8 shrink-0 place-items-center rounded-xl border border-line bg-surface text-content-muted transition hover:bg-surface-hover hover:text-content disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Minus className="size-4" />
                  </button>

                  <input
                    type="range"
                    min={MIN_RATE}
                    max={MAX_RATE}
                    step={RATE_STEP}
                    value={settings.playbackRate}
                    onChange={(e) => updateRate(Number(e.target.value))}
                    aria-label="Thanh trượt tốc độ phát âm"
                    className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-200 accent-brand-600 dark:bg-slate-700 dark:accent-brand-400"
                  />

                  <button
                    type="button"
                    onClick={() => updateRate(settings.playbackRate + RATE_STEP)}
                    disabled={settings.playbackRate >= MAX_RATE}
                    aria-label="Tăng tốc độ 0.05x"
                    className="grid size-8 shrink-0 place-items-center rounded-xl border border-line bg-surface text-content-muted transition hover:bg-surface-hover hover:text-content disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>

                <div className="mt-1.5 flex justify-between px-1 font-mono text-[10px] font-semibold text-content-muted">
                  <span>0.5x</span>
                  <span>1.0x</span>
                  <span>1.5x</span>
                </div>
              </div>

              <div className="mt-2.5 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {speedOptions.map((opt) => {
                  const isSelected = Math.abs(settings.playbackRate - opt.value) < 0.01;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateRate(opt.value)}
                      className={`flex flex-col items-center justify-center rounded-2xl border p-2.5 text-xs font-bold transition-all ${
                        isSelected
                          ? 'border-accent bg-accent/10 text-accent-strong shadow-sm'
                          : 'border-line bg-surface-elevated text-content-muted hover:border-accent/40 hover:text-content'
                      }`}
                    >
                      <span className="font-mono text-sm font-extrabold">{opt.value}x</span>
                      <span className="mt-0.5 text-[10px] opacity-80">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Auto-play Audio */}
            <div className="flex items-center justify-between rounded-2xl border border-line bg-surface-elevated p-4">
              <div>
                <span className="block text-sm font-bold text-content">Tự động phát âm thanh</span>
                <span className="block text-xs text-content-muted">Phát giọng đọc khi lật thẻ hoặc sang từ mới</span>
              </div>
              <button
                type="button"
                onClick={toggleAutoPlay}
                role="switch"
                aria-checked={settings.autoPlay}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.autoPlay ? 'bg-accent' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.autoPlay ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Keyboard Shortcuts Cheat Sheet */}
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-content-muted">
                <Keyboard className="size-4 text-accent" />
                <span>Phím tắt tiện lợi (Shortcuts)</span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl border border-line bg-surface-elevated px-3 py-2 text-xs">
                  <span className="text-content-muted">Di chuyển thẻ từ</span>
                  <kbd className="rounded-md border border-line bg-surface px-2 py-0.5 font-mono font-bold text-content">
                    ↑ ↓ ← →
                  </kbd>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-line bg-surface-elevated px-3 py-2 text-xs">
                  <span className="text-content-muted">Phát âm US / Check</span>
                  <kbd className="rounded-md border border-line bg-surface px-2 py-0.5 font-mono font-bold text-content">
                    Enter
                  </kbd>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-line bg-surface-elevated px-3 py-2 text-xs">
                  <span className="text-content-muted">Lật thẻ Flashcard</span>
                  <kbd className="rounded-md border border-line bg-surface px-2 py-0.5 font-mono font-bold text-content">
                    Space
                  </kbd>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-line bg-surface-elevated px-3 py-2 text-xs">
                  <span className="text-content-muted">Tìm kiếm nhanh</span>
                  <kbd className="rounded-md border border-line bg-surface px-2 py-0.5 font-mono font-bold text-content">
                    /
                  </kbd>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-line bg-surface-elevated px-3 py-2 text-xs">
                  <span className="text-content-muted">Đánh dấu Chưa thuộc</span>
                  <kbd className="rounded-md border border-line bg-surface px-2 py-0.5 font-mono font-bold text-content">
                    1
                  </kbd>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-line bg-surface-elevated px-3 py-2 text-xs">
                  <span className="text-content-muted">Đánh dấu Đã thuộc</span>
                  <kbd className="rounded-md border border-line bg-surface px-2 py-0.5 font-mono font-bold text-content">
                    2
                  </kbd>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-6 text-sm font-extrabold text-accent-contrast shadow-md shadow-accent/20 transition-transform active:scale-95"
            >
              Hoàn tất
            </button>
          </div>
        </motion.div>
      </motion.div>
    </ModalPortal>
  );
};
