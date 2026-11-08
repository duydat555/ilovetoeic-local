import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { VoiceSummaryData } from '../../hooks/voiceReducer';
import { focusRing } from './voiceTheme';

interface VoiceSummaryProps {
  summary: VoiceSummaryData;
  onAgain: () => void;
  onHistory: () => void;
  onExit: () => void;
}

const minutes = (seconds: number) => (seconds >= 60 ? `${Math.floor(seconds / 60)} phút ${seconds % 60} giây` : `${seconds} giây`);

export const VoiceSummary: React.FC<VoiceSummaryProps> = ({ summary, onAgain, onHistory, onExit }) => {
  const clean = summary.mistakes.length === 0;
  return (
    <div className="mx-auto w-full max-w-xl space-y-8 px-5 pb-10 pt-4 text-[var(--vo-text)]">
      <header className="space-y-2">
        <p className="text-sm font-semibold text-[var(--vo-muted)]">Kết thúc cuộc trò chuyện</p>
        <h1 className="text-balance text-3xl font-bold leading-tight">
          {clean ? 'Bạn nói rất tốt hôm nay' : 'Cùng xem lại vài điểm nhỏ nhé'}
        </h1>
        <p className="text-[15px] text-[var(--vo-muted)]">{minutes(summary.durationSeconds)} · {summary.turns} lượt nói</p>
      </header>

      {summary.tip && (
        <p className="rounded-2xl border border-[var(--vo-line)] bg-[var(--vo-surface)] p-5 text-[15px] leading-relaxed">{summary.tip}</p>
      )}

      {summary.mistakes.length > 0 && (
        <section aria-labelledby="sum-mistakes" className="space-y-3">
          <h2 id="sum-mistakes" className="text-lg font-bold">Có thể nói tự nhiên hơn</h2>
          <ul className="space-y-3">
            {summary.mistakes.map((item, index) => (
              <li key={index} className="space-y-2 rounded-2xl border border-[var(--vo-line)] bg-[var(--vo-surface)] p-4">
                <p className="text-[15px] text-[var(--vo-muted)] line-through decoration-[var(--vo-warm)]">{item.original}</p>
                <p className="flex items-start gap-2 text-[15px] font-semibold">
                  <ArrowRight className="mt-1 size-4 shrink-0 text-[var(--vo-accent)]" aria-hidden="true" />
                  <span>{item.better}</span>
                </p>
                {item.note && <p className="text-sm leading-relaxed text-[var(--vo-muted)]">{item.note}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {summary.newWords.length > 0 && (
        <section aria-labelledby="sum-words" className="space-y-3">
          <h2 id="sum-words" className="text-lg font-bold">Từ và cụm từ mới</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {summary.newWords.map((word, index) => (
              <li key={index} className="rounded-2xl border border-[var(--vo-line)] bg-[var(--vo-surface)] p-4">
                <p className="text-[15px] font-semibold">{word.word}</p>
                <p className="text-sm text-[var(--vo-muted)]">{word.meaning_vi}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <button type="button" onClick={onAgain}
          className={`min-h-12 flex-1 rounded-full bg-[var(--vo-text)] px-6 text-[15px] font-bold text-[var(--vo-ground)] hover:bg-white ${focusRing}`}>
          Trò chuyện tiếp
        </button>
        {summary.conversationId && (
          <button type="button" onClick={onHistory}
            className={`min-h-12 flex-1 rounded-full border border-[var(--vo-line)] px-6 text-[15px] font-semibold hover:bg-[var(--vo-surface)] ${focusRing}`}>
            Xem lại nội dung
          </button>
        )}
        <button type="button" onClick={onExit}
          className={`min-h-12 flex-1 rounded-full border border-[var(--vo-line)] px-6 text-[15px] font-semibold hover:bg-[var(--vo-surface)] ${focusRing}`}>
          Thoát
        </button>
      </div>
    </div>
  );
};
