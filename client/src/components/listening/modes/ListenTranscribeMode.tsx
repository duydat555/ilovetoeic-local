import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, RotateCcw, Send } from 'lucide-react';
import type { ListeningSentence } from '../../../types';
import { soundFX } from '../../../utils/soundEffects';
import { useLanguage } from '../../../context/LanguageContext';

export interface ListenTranscribeModeProps {
  sentence: ListeningSentence;
  onComplete: (score: number, hintCount: number) => void;
  onReset?: (sentenceId: string) => void;
  isCompletedAlready?: boolean;
}

const cleanString = (str: string) =>
  str
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export const ListenTranscribeMode: React.FC<ListenTranscribeModeProps> = ({
  sentence,
  onComplete,
  onReset,
  isCompletedAlready = false,
}) => {
  const { language } = useLanguage();
  const [typedText, setTypedText] = useState(isCompletedAlready ? sentence.text : '');
  const [isSubmitted, setIsSubmitted] = useState(isCompletedAlready);
  const [similarity, setSimilarity] = useState<number>(isCompletedAlready ? 100 : 0);

  const targetClean = cleanString(sentence.text);
  const targetWords = targetClean.split(' ');

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!typedText.trim() || isSubmitted) return;

    const userClean = cleanString(typedText);
    const userWords = userClean.split(' ');

    // Calculate word matching overlap
    let matchCount = 0;
    userWords.forEach((w) => {
      if (targetWords.includes(w)) matchCount++;
    });

    const ratio = Math.min(1, matchCount / Math.max(1, targetWords.length));
    const percent = Math.round(ratio * 100);
    setSimilarity(percent);
    setIsSubmitted(true);

    if (ratio >= 0.7) {
      soundFX.playCorrect();
    } else {
      soundFX.playWrong();
    }

    const score = Math.max(1, Math.round(ratio * 10));
    onComplete(score, 0);
  };

  const handleReset = () => {
    setTypedText('');
    setIsSubmitted(false);
    setSimilarity(0);
    onReset?.(sentence.id);
  };

  return (
    <div className="space-y-4">
      {/* Transcribe Input Box */}
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="rounded-md bg-accent/15 px-2 py-0.5 text-[11px] font-black text-accent-strong">
            {language === 'en' ? 'Full Sentence Transcription' : 'Chép chính tả toàn câu'}
          </span>
          <span className="text-xs font-semibold text-content-muted">
            {language === 'en'
              ? 'Listen and transcribe the whole sentence you hear'
              : 'Lắng nghe và gõ lại toàn bộ câu bạn nghe được'}
          </span>
        </div>

        <textarea
          rows={3}
          value={typedText}
          disabled={isSubmitted}
          onChange={(e) => setTypedText(e.target.value)}
          placeholder={language === 'en' ? 'Type the entire English sentence you hear here...' : 'Gõ toàn bộ câu tiếng Anh nghe được vào đây...'}
          className="w-full resize-none rounded-xl border border-line bg-surface-elevated/40 p-3.5 text-sm font-semibold text-content outline-none transition focus:border-accent focus:bg-surface"
        />

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-content-muted hover:text-content"
          >
            <RotateCcw className="size-3.5" />
            <span>{language === 'en' ? 'Clear & Redo' : 'Xoá gõ lại'}</span>
          </button>

          {!isSubmitted && (
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!typedText.trim()}
              className="btn-primary gap-1.5 text-xs disabled:opacity-40"
            >
              <Send className="size-3.5" />
              <span>{language === 'en' ? 'Grade' : 'Chấm điểm'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Comparison Diff Result */}
      {isSubmitted && (
        <div className="rounded-2xl border border-line bg-surface-elevated/40 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-content">
              {language === 'en' ? 'Matching accuracy:' : 'Độ chính xác so khớp:'}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-black ${
                similarity >= 80
                  ? 'bg-positive/15 text-positive'
                  : similarity >= 50
                  ? 'bg-amber-500/15 text-amber-500'
                  : 'bg-negative/15 text-negative'
              }`}
            >
              {similarity}%
            </span>
          </div>

          <div className="space-y-2 border-t border-line/60 pt-3 text-xs">
            <div>
              <span className="font-extrabold text-content-muted">
                {language === 'en' ? 'Reference sentence: ' : 'Câu gốc chuẩn: '}
              </span>
              <p className="mt-1 font-bold text-positive">{sentence.text}</p>
            </div>

            <div>
              <span className="font-extrabold text-content-muted">
                {language === 'en' ? 'Your transcription: ' : 'Câu bạn đã gõ: '}
              </span>
              <p className="mt-1 font-semibold text-content">{typedText}</p>
            </div>

            <div className="border-t border-line/40 pt-2 text-content-muted">
              <strong>{language === 'en' ? 'Meaning: ' : 'Dịch nghĩa: '}</strong>
              <span className="font-medium text-content">{sentence.translationVi}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
