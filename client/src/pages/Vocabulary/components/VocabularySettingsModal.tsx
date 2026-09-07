import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Settings, Volume2, Keyboard, X, Check } from 'lucide-react';
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

  const updateRate = (rate: number) => {
    const updated = { ...settings, playbackRate: rate };
    setSettings(updated);
    saveAudioSettings(updated);
  };

  const toggleAutoPlay = () => {
    const updated = { ...settings, autoPlay: !settings.autoPlay };
    setSettings(updated);
    saveAudioSettings(updated);
  };

  const speedOptions = [
    { label: '0.75x (Chậm)', value: 0.75 },
    { label: '0.9x (Khuyên dùng)', value: 0.9 },
    { label: '1.0x (Tự nhiên)', value: 1.0 },
    { label: '1.25x (Nhanh)', value: 1.25 },
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
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-content-muted">
                <Volume2 className="size-4 text-accent" />
                <span>Tốc độ phát âm (Voice Speed)</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {speedOptions.map((opt) => {
                  const isSelected = Math.abs(settings.playbackRate - opt.value) < 0.05;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateRate(opt.value)}
                      className={`flex flex-col items-center justify-center rounded-2xl border p-3 text-xs font-bold transition-all ${
                        isSelected
                          ? 'border-accent bg-accent/10 text-accent-strong shadow-sm'
                          : 'border-line bg-surface-elevated text-content-muted hover:border-accent/40 hover:text-content'
                      }`}
                    >
                      <span className="text-sm font-extrabold">{opt.value}x</span>
                      <span className="mt-0.5 text-[10px] opacity-80">{opt.label.split(' ')[1] || ''}</span>
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
