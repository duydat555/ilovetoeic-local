import React, { useState } from 'react';
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Languages,
  Plus,
  Sparkles,
} from 'lucide-react';
import { Question } from '../../types';
import { cleanExplanationText, cleanTranscriptSpacing, getUnifiedQuestionTranslationText } from '../../utils/practice';
import { AudioPlayer } from '../common/AudioPlayer';
import { EvidencePanel } from '../common/EvidencePanel';
import { QuestionImage } from '../common/QuestionImage';

export interface AnswerReviewItemProps {
  question: Question;
  userAnswer?: string;
  isCorrect: boolean;
  onSaveVocabulary?: (word: string, meaning: string) => Promise<void>;
  savedVocabWords?: Record<string, boolean>;
}

export const AnswerReviewItem: React.FC<AnswerReviewItemProps> = ({
  question,
  userAnswer,
  isCorrect,
  onSaveVocabulary,
  savedVocabWords = {},
}) => {
  const [passageExpanded, setPassageExpanded] = useState(false);

  const explanationText = cleanExplanationText(question.explanation);
  const isReadingPart = question.partId >= 5;

  return (
    <div className="space-y-3.5 rounded-2xl border border-line bg-surface p-5 shadow-xs transition hover:shadow-md dark:shadow-none">
      {/* Header: Số câu + Part + Badge đáp án */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <span className="font-extrabold text-content">
          Câu {question.questionNumber} <span className="text-content-muted">(Part {question.partId})</span>
        </span>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 font-extrabold ${
              isCorrect
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
            }`}
          >
            Bạn chọn: {userAnswer || 'Bỏ qua'}
          </span>
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 font-extrabold text-emerald-600 dark:text-emerald-400">
            Đáp án đúng: {question.correctAnswer}
          </span>
        </div>
      </div>

      {/* Trình phát Audio nếu là câu hỏi Listening */}
      {question.audioUrl && (
        <div className="py-1">
          <AudioPlayer audioUrl={question.audioUrl} />
        </div>
      )}

      {/* Bài đọc liên quan (Passage) cho câu Reading - Có thể thu gọn/mở rộng */}
      {isReadingPart && question.passageText && (
        <div className="rounded-xl border border-line bg-surface-elevated/40 p-3.5 text-xs">
          <button
            type="button"
            onClick={() => setPassageExpanded(!passageExpanded)}
            className="flex w-full items-center justify-between font-bold text-brand-700 hover:underline dark:text-brand-300"
          >
            <span className="flex items-center gap-1.5">
              <BookOpen className="size-4 text-brand-600" />
              <span>Đoạn văn bài đọc (Passage)</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[11px]">
              {passageExpanded ? 'Thu gọn' : 'Xem đoạn văn'}
              {passageExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </span>
          </button>

          {passageExpanded && (
            <div className="mt-3 whitespace-pre-line border-t border-line pt-3 font-mono text-xs leading-relaxed text-content">
              {question.passageText}
            </div>
          )}
        </div>
      )}

      {/* Nội dung câu hỏi (Transcript / Question Prompt) */}
      <div className="text-xs font-semibold text-content sm:text-sm">
        {question.partId === 2 && question.promptText ? (
          <span>
            <strong className="text-brand-600 dark:text-brand-400">Câu hỏi (Transcript):</strong> {question.promptText}
          </span>
        ) : (
          question.promptText || (question.partId <= 2 ? 'Nghe và chọn phương án phù hợp nhất.' : 'Chọn đáp án đúng.')
        )}
      </div>

      {/* Ảnh minh họa nếu có */}
      {question.imageUrl && (
        <QuestionImage
          src={question.imageUrl}
          alt={`Minh họa câu ${question.questionNumber}`}
          className="max-h-72 w-full object-contain p-2"
        />
      )}

      {/* Khối bằng chứng (Evidence) nếu có */}
      {question.evidence && (
        <EvidencePanel evidence={question.evidence} questionNumber={question.questionNumber} explanationEn={question.explanationEn} />
      )}

      {/* Khối Giải thích chi tiết */}
      {explanationText && (
        <div className="whitespace-pre-line rounded-xl border border-line bg-surface-elevated/50 p-3.5 text-xs leading-relaxed text-content-muted">
          <div className="mb-1 font-bold text-brand-600 dark:text-brand-400">Giải thích chi tiết</div>
          <div>{explanationText}</div>
        </div>
      )}

      {/* Khối Dịch nghĩa đồng bộ 100% theo Ảnh 2 */}
      {getUnifiedQuestionTranslationText(question) && (
        <div className="mt-3 rounded-xl border border-brand-200/80 bg-brand-50/40 p-3.5 text-xs leading-relaxed text-slate-700 dark:border-brand-900/60 dark:bg-brand-950/20 dark:text-content-muted">
          <div className="mb-1 flex items-center gap-1.5 font-bold text-brand-700 dark:text-brand-300">
            <Languages className="size-3.5" />
            <span>Dịch nghĩa:</span>
          </div>
          <div className="whitespace-pre-line text-sm leading-relaxed text-slate-800 dark:text-content">
            {getUnifiedQuestionTranslationText(question)}
          </div>
        </div>
      )}

      {/* Khối Từ vựng cần học (dạng Chip với nút + lưu Flashcard) */}
      {question.keyVocabulary && question.keyVocabulary.length > 0 && (
        <div className="mt-3.5 border-t border-line pt-3">
          <div className="mb-2 flex items-center justify-between text-xs font-extrabold text-brand-700 dark:text-brand-200">
            <span className="flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-amber-500" />
              <span>Từ vựng cần học ({question.keyVocabulary.length}):</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {question.keyVocabulary.map((item) => (
              <div
                key={item.word}
                className="flex items-center gap-1.5 rounded-xl border border-line bg-surface-elevated px-2.5 py-1.5 text-xs text-content shadow-2xs"
              >
                <strong className="font-extrabold text-brand-700 dark:text-brand-300">{item.word}</strong>
                {item.meaning && <span className="text-content-muted">: {item.meaning}</span>}
                {onSaveVocabulary && (
                  <button
                    type="button"
                    onClick={() => void onSaveVocabulary(item.word, item.meaning)}
                    title={savedVocabWords[item.word] ? 'Đã lưu vào Flashcard' : `Lưu từ "${item.word}" vào Flashcard`}
                    className={`ml-1 flex size-5 items-center justify-center rounded-md transition ${
                      savedVocabWords[item.word]
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'text-content-muted hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/20'
                    }`}
                  >
                    {savedVocabWords[item.word] ? (
                      <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Plus className="size-3" />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
