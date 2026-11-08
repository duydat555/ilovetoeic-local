import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Trash2, X } from 'lucide-react';
import { aiService, type ConversationDetail, type ConversationListItem } from '../../services/ai';
import type { TranscriptEntry } from '../../hooks/voiceReducer';
import { BoneyardSkeleton } from '../common/BoneyardSkeleton';
import { MODE_OPTIONS } from './voiceOptions';
import { focusRing } from './voiceTheme';

interface VoiceHistoryDrawerProps {
  open: boolean;
  entries: TranscriptEntry[];
  onClose: () => void;
}

const formatDate = (value: string) => {
  const date = new Date(value.replace(' ', 'T') + (value.endsWith('Z') ? '' : 'Z'));
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const formatDuration = (seconds: number) => (seconds >= 60 ? `${Math.round(seconds / 60)} phút` : `${seconds} giây`);

const Bubble: React.FC<{ role: 'user' | 'assistant'; text: string; interrupted?: boolean }> = ({ role, text, interrupted }) => (
  <li className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
    <p className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
      role === 'user' ? 'bg-[var(--vo-text)] text-[var(--vo-ground)]' : 'bg-[var(--vo-surface-2)] text-[var(--vo-text)]'}`}>
      {text}
      {interrupted && <span className="ml-1 text-xs opacity-60">(đã ngắt)</span>}
    </p>
  </li>
);

export const VoiceHistoryDrawer: React.FC<VoiceHistoryDrawerProps> = ({ open, entries, onClose }) => {
  const reduce = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [tab, setTab] = useState<'current' | 'saved'>('current');
  const [list, setList] = useState<ConversationListItem[] | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setList(await aiService.listConversations());
    } catch {
      setList([]);
      setError('Chưa tải được các cuộc trò chuyện đã lưu.');
    }
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    closeRef.current?.focus();
    setDetail(null);
    void load();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, load, onClose]);

  useEffect(() => { if (open && entries.length === 0) setTab('saved'); }, [open, entries.length]);

  const openDetail = async (id: string) => {
    try { setDetail(await aiService.getConversation(id)); } catch { setError('Không mở được cuộc trò chuyện này.'); }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Xóa cuộc trò chuyện này? Bạn sẽ không khôi phục lại được.')) return;
    try {
      await aiService.deleteConversation(id);
      setDetail(null);
      setList((current) => (current ? current.filter((item) => item.id !== id) : current));
    } catch { setError('Chưa xóa được. Bạn thử lại nhé.'); }
  };

  const slide = reduce ? { opacity: 0 } : { x: '-100%' };
  const modeLabel = (mode: string) => MODE_OPTIONS.find((m) => m.value === mode)?.label ?? 'Trò chuyện';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70]">
          <motion.div className="absolute inset-0 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0.1 : 0.2, ease: 'easeOut' }} onClick={onClose} />
          <motion.aside role="dialog" aria-modal="true" aria-label="Lịch sử trò chuyện"
            className="absolute inset-y-0 left-0 flex w-full max-w-md flex-col border-r border-[var(--vo-line)] bg-[var(--vo-ground)] text-[var(--vo-text)]"
            initial={slide} animate={{ x: 0, opacity: 1 }} exit={slide}
            transition={{ duration: reduce ? 0.1 : 0.26, ease: [0.22, 1, 0.36, 1] }}>
            <header className="flex items-center justify-between px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
              {detail ? (
                <button type="button" onClick={() => setDetail(null)}
                  className={`flex min-h-11 items-center gap-2 rounded-full pr-3 text-[15px] font-semibold hover:bg-[var(--vo-surface)] ${focusRing}`}>
                  <ArrowLeft className="size-5" aria-hidden="true" /> Quay lại
                </button>
              ) : <h2 className="text-lg font-bold">Lịch sử trò chuyện</h2>}
              <button ref={closeRef} type="button" onClick={onClose} aria-label="Đóng lịch sử"
                className={`grid size-11 place-items-center rounded-full hover:bg-[var(--vo-surface)] ${focusRing}`}>
                <X className="size-5" aria-hidden="true" />
              </button>
            </header>

            {!detail && (
              <div role="tablist" aria-label="Loại lịch sử" className="mx-5 mb-3 flex gap-1 rounded-full bg-[var(--vo-surface)] p-1">
                {([['current', 'Cuộc này'], ['saved', 'Đã lưu']] as const).map(([value, label]) => (
                  <button key={value} role="tab" type="button" aria-selected={tab === value} onClick={() => setTab(value)}
                    className={`min-h-10 flex-1 rounded-full text-sm font-semibold ${focusRing} ${tab === value ? 'bg-[var(--vo-text)] text-[var(--vo-ground)]' : 'text-[var(--vo-muted)]'}`}>
                    {label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
              {error && <p role="alert" className="mb-3 rounded-xl bg-[var(--vo-surface)] p-3 text-sm text-[var(--vo-warm)]">{error}</p>}

              {detail ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-[15px] font-semibold">{modeLabel(detail.mode)}</p>
                    <p className="text-sm text-[var(--vo-muted)]">{formatDate(detail.createdAt)} · {formatDuration(detail.durationSeconds)}</p>
                  </div>
                  <ul className="space-y-2.5">{detail.messages.map((m, i) => <Bubble key={i} role={m.role} text={m.content} />)}</ul>
                  <button type="button" onClick={() => void remove(detail.id)}
                    className={`flex min-h-11 items-center gap-2 rounded-full border border-[var(--vo-line)] px-4 text-sm font-semibold text-[var(--vo-warm)] hover:bg-[var(--vo-surface)] ${focusRing}`}>
                    <Trash2 className="size-4" aria-hidden="true" /> Xóa cuộc trò chuyện
                  </button>
                </div>
              ) : tab === 'current' ? (
                entries.length === 0
                  ? <p className="pt-6 text-center text-[15px] text-[var(--vo-muted)]">Chưa có gì ở đây. Hãy bắt đầu nói chuyện nhé.</p>
                  : <ul className="space-y-2.5">{entries.map((e) => <Bubble key={e.id} role={e.role} text={e.text} interrupted={e.interrupted} />)}</ul>
              ) : list === null ? (
                <div className="space-y-3" aria-hidden="true">
                  <BoneyardSkeleton name="voice-history-row-1" height={68} />
                  <BoneyardSkeleton name="voice-history-row-2" height={68} />
                </div>
              ) : list.length === 0 ? (
                <p className="pt-6 text-center text-[15px] text-[var(--vo-muted)]">Bạn chưa có cuộc trò chuyện nào được lưu.</p>
              ) : (
                <ul className="space-y-2">
                  {list.map((item) => (
                    <li key={item.id}>
                      <button type="button" onClick={() => void openDetail(item.id)}
                        className={`w-full rounded-2xl border border-[var(--vo-line)] bg-[var(--vo-surface)] p-4 text-left hover:bg-[var(--vo-surface-2)] ${focusRing}`}>
                        <span className="block text-[15px] font-semibold">{modeLabel(item.mode)}</span>
                        <span className="mt-0.5 block text-sm text-[var(--vo-muted)]">
                          {formatDate(item.createdAt)} · {item.turns} lượt nói · {formatDuration(item.durationSeconds)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
