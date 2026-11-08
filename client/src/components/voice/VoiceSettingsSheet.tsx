import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import type { VoiceSettings } from '../../services/ai';
import { EN_VOICES, MODE_OPTIONS, PERSONA_OPTIONS, SCENARIOS } from './voiceOptions';
import { focusRing } from './voiceTheme';

interface VoiceSettingsSheetProps {
  open: boolean;
  settings: VoiceSettings;
  /** While a conversation is running, only display options can change. */
  inConversation: boolean;
  onChange: (next: VoiceSettings) => void;
  onClose: () => void;
}

const chip = (active: boolean) =>
  `min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors ${focusRing} ${
    active
      ? 'border-[var(--vo-text)] bg-[var(--vo-text)] text-[var(--vo-ground)]'
      : 'border-[var(--vo-line)] bg-[var(--vo-surface)] text-[var(--vo-text)] hover:bg-[var(--vo-surface-2)]'
  }`;

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-3">
    <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--vo-muted)]">{title}</h3>
    {children}
  </section>
);

export const VoiceSettingsSheet: React.FC<VoiceSettingsSheetProps> = ({ open, settings, inConversation, onChange, onClose }) => {
  const reduce = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  const set = (patch: Partial<VoiceSettings>) => onChange({ ...settings, ...patch });
  const locked = inConversation;

  useEffect(() => {
    if (!open) return undefined;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const slide = reduce ? { opacity: 0 } : { x: '100%' };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70]">
          <motion.div
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0.1 : 0.2, ease: 'easeOut' }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog" aria-modal="true" aria-label="Cài đặt trò chuyện"
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-[var(--vo-line)] bg-[var(--vo-ground)] text-[var(--vo-text)]"
            initial={slide} animate={{ x: 0, opacity: 1 }} exit={slide}
            transition={{ duration: reduce ? 0.1 : 0.26, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="flex items-center justify-between px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
              <h2 className="text-lg font-bold">Cài đặt trò chuyện</h2>
              <button ref={closeRef} type="button" onClick={onClose} aria-label="Đóng cài đặt"
                className={`grid size-11 place-items-center rounded-full hover:bg-[var(--vo-surface)] ${focusRing}`}>
                <X className="size-5" aria-hidden="true" />
              </button>
            </header>

            <div className="flex-1 space-y-8 overflow-y-auto px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-2">
              {locked && (
                <p className="rounded-2xl bg-[var(--vo-surface)] p-4 text-sm leading-relaxed text-[var(--vo-muted)]">
                  Các thay đổi về chế độ và giọng nói sẽ áp dụng từ cuộc trò chuyện sau.
                </p>
              )}

              <Section title="Bạn muốn làm gì?">
                <div className="grid gap-2" role="radiogroup" aria-label="Chế độ trò chuyện">
                  {MODE_OPTIONS.map((option) => {
                    const active = settings.mode === option.value;
                    return (
                      <button key={option.value} type="button" role="radio" aria-checked={active} disabled={locked}
                        onClick={() => set({ mode: option.value })}
                        className={`rounded-2xl border p-4 text-left transition-colors disabled:opacity-60 ${focusRing} ${
                          active ? 'border-[var(--vo-accent)] bg-[var(--vo-surface-2)]' : 'border-[var(--vo-line)] bg-[var(--vo-surface)] hover:bg-[var(--vo-surface-2)]'}`}>
                        <span className="block text-[15px] font-semibold">{option.label}</span>
                        <span className="mt-1 block text-sm leading-snug text-[var(--vo-muted)]">{option.hint}</span>
                      </button>
                    );
                  })}
                </div>
                {settings.mode === 'roleplay' && (
                  <div className="flex flex-wrap gap-2 pt-1" role="radiogroup" aria-label="Tình huống">
                    {SCENARIOS.map((scenario) => (
                      <button key={scenario.label} type="button" role="radio" disabled={locked}
                        aria-checked={settings.scenario === scenario.prompt}
                        onClick={() => set({ scenario: scenario.prompt })}
                        className={`${chip(settings.scenario === scenario.prompt)} disabled:opacity-60`}>
                        {scenario.label}
                      </button>
                    ))}
                  </div>
                )}
              </Section>

              <Section title="Phong cách của trợ lý">
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Phong cách">
                  {PERSONA_OPTIONS.map((option) => (
                    <button key={option.value} type="button" role="radio" disabled={locked}
                      aria-checked={settings.persona === option.value}
                      onClick={() => set({ persona: option.value })}
                      className={`${chip(settings.persona === option.value)} disabled:opacity-60`}>
                      {option.label}
                    </button>
                  ))}
                </div>
              </Section>

              <Section title="Khi bạn nói sai">
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cách sửa lỗi">
                  {([['summary', 'Nhận xét ở cuối'], ['instant', 'Sửa ngay khi nói']] as const).map(([value, label]) => (
                    <button key={value} type="button" role="radio" disabled={locked}
                      aria-checked={settings.correction === value} onClick={() => set({ correction: value })}
                      className={`${chip(settings.correction === value)} disabled:opacity-60`}>
                      {label}
                    </button>
                  ))}
                </div>
              </Section>

              <Section title="Giọng nói">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="voice-en" className="mb-2 block text-sm font-semibold">Giọng tiếng Anh</label>
                    <select id="voice-en" value={settings.voices.en ?? ''} disabled={locked}
                      onChange={(event) => set({ voices: { ...settings.voices, en: event.target.value || undefined } })}
                      className={`h-12 w-full rounded-xl border border-[var(--vo-line)] bg-[var(--vo-surface)] px-4 text-[15px] disabled:opacity-60 ${focusRing}`}>
                      {EN_VOICES.map((voice) => <option key={voice.value} value={voice.value}>{voice.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <label htmlFor="voice-speed" className="font-semibold">Tốc độ nói</label>
                      <span className="tabular-nums text-[var(--vo-muted)]">{settings.speed.toFixed(1)}×</span>
                    </div>
                    <input id="voice-speed" type="range" min={0.7} max={1.3} step={0.1} value={settings.speed} disabled={locked}
                      onChange={(event) => set({ speed: Number(event.target.value) })}
                      className={`h-11 w-full accent-[var(--vo-accent)] disabled:opacity-60 ${focusRing}`} />
                  </div>
                </div>
              </Section>

              <Section title="Hiển thị">
                <button type="button" role="switch" aria-checked={settings.captions}
                  onClick={() => set({ captions: !settings.captions })}
                  className={`flex min-h-12 w-full items-center justify-between rounded-2xl border border-[var(--vo-line)] bg-[var(--vo-surface)] px-4 text-left ${focusRing}`}>
                  <span className="text-[15px] font-semibold">Hiện phụ đề khi trợ lý nói</span>
                  <span aria-hidden="true" className={`relative h-7 w-12 rounded-full transition-colors ${settings.captions ? 'bg-[var(--vo-accent)]' : 'bg-[var(--vo-line)]'}`}>
                    <span className={`absolute top-1 size-5 rounded-full bg-white transition-all ${settings.captions ? 'left-6' : 'left-1'}`} />
                  </span>
                </button>
              </Section>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
