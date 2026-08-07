import React, { useId, useState } from 'react';
import { BookMarked, ChevronDown, Quote, Languages } from 'lucide-react';
import { QuestionEvidence } from '../../types';
import { cleanExplanationText, cleanTranscriptSpacing } from '../../utils/practice';

interface EvidencePanelProps {
  evidence: QuestionEvidence;
  questionNumber?: number;
  explanationEn?: string;
}

const splitCitationTranslation = (text: string) => {
  const trimmed = text.trim();
  const match = trimmed.match(/^([\s\S]*["”])\s*\(([\s\S]+)\)\s*[.!?]?$/);
  if (!match) return { quote: trimmed };
  return {
    quote: match[1].trim(),
    translation: match[2].trim(),
  };
};

const splitParaphrase = (text: string) => {
  const parts = text.split(/\s*(?:=|≈)\s*/);
  if (parts.length < 2) return null;
  return {
    source: parts.shift()?.trim() || '',
    equivalent: parts.join(' = ').trim(),
  };
};

export const EvidencePanel: React.FC<EvidencePanelProps> = ({
  evidence,
  questionNumber,
  explanationEn,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const panelId = useId();
  const paraphrasePair = evidence.paraphrase ? splitParaphrase(evidence.paraphrase) : null;

  return (
    <section className="mt-3 overflow-hidden rounded-2xl border border-brand-200 bg-white dark:border-brand-900/80 dark:bg-surface">
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-brand-50/70 active:bg-brand-100/70 dark:hover:bg-brand-950/30"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-200">
            <BookMarked className="size-[18px]" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-extrabold text-slate-950 dark:text-content">
              {questionNumber ? `Giải thích câu ${questionNumber}` : 'Giải thích đáp án'}
            </span>
            <span className="mt-0.5 block text-xs font-medium text-slate-500 dark:text-content-muted">
              Dẫn chứng và cách diễn đạt tương đương
            </span>
          </span>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-slate-500 transition-transform duration-200 dark:text-content-muted ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div id={panelId} className="border-t border-slate-100 px-4 py-4 dark:border-line">
          <div className="divide-y divide-slate-100 dark:divide-line">
            {evidence.citations.map((citation, index) => {
              const content = splitCitationTranslation(citation.text);
              return (
                <div
                  key={`${citation.label}-${index}`}
                  className="grid gap-2.5 py-4 first:pt-0 last:pb-0 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4"
                >
                  <div className="flex items-center gap-2 self-start text-xs font-extrabold text-brand-700 dark:text-brand-200">
                    <Quote className="size-4" />
                    {citation.label}
                  </div>
                  <div className="min-w-0">
                    <blockquote className="border-l-2 border-brand-400 pl-3 text-sm font-semibold leading-relaxed text-slate-800 dark:text-content">
                      {content.quote}
                    </blockquote>
                    {content.translation && (
                      <div className="mt-2.5 grid gap-1 sm:grid-cols-[5rem_minmax(0,1fr)] sm:gap-3">
                        <span className="text-xs font-bold text-slate-500 dark:text-content-muted">Bản dịch</span>
                        <p className="text-sm leading-relaxed text-slate-600 dark:text-content-muted">
                          {content.translation}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {evidence.paraphrase && (
            <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/70 p-3.5 dark:border-brand-900 dark:bg-brand-950/25">
              <div className="text-xs font-extrabold text-brand-700 dark:text-brand-200">Paraphrase</div>
              {paraphrasePair ? (
                <div className="mt-2 grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                  <p className="rounded-lg bg-white px-3 py-2 text-sm font-semibold leading-relaxed text-slate-700 dark:bg-surface-elevated dark:text-content">
                    {paraphrasePair.source}
                  </p>
                  <span className="text-center text-sm font-black text-brand-700 dark:text-brand-200" aria-label="tương đương">
                    =
                  </span>
                  <p className="rounded-lg bg-white px-3 py-2 text-sm font-semibold leading-relaxed text-slate-700 dark:bg-surface-elevated dark:text-content">
                    {paraphrasePair.equivalent}
                  </p>
                </div>
              ) : (
                <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-content-muted">
                  {evidence.paraphrase}
                </p>
              )}
            </div>
          )}

          {explanationEn && (
            <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/70 p-3.5 dark:border-brand-900 dark:bg-brand-950/25">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-brand-700 dark:text-brand-200">
                <Languages className="size-3.5" />
                <span>Dịch nghĩa</span>
              </div>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-content-muted">
                {cleanTranscriptSpacing(cleanExplanationText(explanationEn) || explanationEn)}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
