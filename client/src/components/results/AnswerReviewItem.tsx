import React, { useState } from 'react';
import {
  BookMarked,
  BookOpen,
  CheckCircle2,
  Headphones,
  Languages,
  Plus,
  Volume2,
  XCircle,
} from 'lucide-react';
import { Question } from '../../types';
import { cleanExplanationText, getUnifiedQuestionTranslationText } from '../../utils/practice';
import { AudioPlayer } from '../common/AudioPlayer';
import { EvidencePanel } from '../common/EvidencePanel';
import { FormattedReadingExplanation } from '../common/FormattedReadingExplanation';
import { InterleavedPassage } from '../common/InterleavedPassage';
import { InterleavedTranscript } from '../common/InterleavedTranscript';
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
  // Mặc định bài đọc Part 6, 7 luôn hiện sẵn như trang Luyện theo Level
  const [showBilingualPassage, setShowBilingualPassage] = useState(false);
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);
  const [savingWord, setSavingWord] = useState<string | null>(null);

  const explanationText = cleanExplanationText(question.explanation);
  const isReadingPart = question.partId >= 5;
  const isListeningDialogue = question.partId === 3 || question.partId === 4;
  const isReadingPassage = question.partId === 6 || question.partId === 7;
  const isSkipped = !userAnswer;

  const transcriptText = !isReadingPart
    ? question.transcript || (isListeningDialogue ? question.passageText : undefined)
    : undefined;
  const transcriptTranslation =
    question.passageTranslationHtml ||
    question.passageTranslation ||
    question.questionTranslation ||
    '';

  const passageText = question.passageText || (isReadingPassage ? question.transcript : undefined);
  const passageTranslation =
    question.passageTranslationHtml ||
    question.passageTranslation ||
    '';

  const hasChoiceText =
    question.choices &&
    question.choices.length > 0 &&
    question.choices.some((c) => c.text && c.text.trim().length > 0);

  const handleSaveWord = async (word: string, meaning: string) => {
    if (!onSaveVocabulary) return;
    setSavingWord(word);
    try {
      await onSaveVocabulary(word, meaning);
    } finally {
      setSavingWord(null);
    }
  };

  return (
    <article
      id={`question-review-${question.questionNumber}`}
      className="scroll-mt-24 space-y-4 rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-2xs transition-all hover:shadow-xs"
    >
      {/* Header: Số câu + Part + Badge kết quả của bạn & Đáp án đúng */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-xl bg-surface-elevated font-mono text-xs font-black text-content tabular-nums border border-line/70">
            {question.questionNumber}
          </span>
          <div>
            <span className="text-xs font-extrabold text-content">
              Câu hỏi {question.questionNumber}
            </span>
            <span className="ml-1.5 text-[11px] font-semibold text-content-muted">
              (Part {question.partId})
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Badge câu trả lời của thí sinh */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-bold ${
              isCorrect
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : isSkipped
                ? 'border-slate-300 bg-slate-100 text-slate-600 dark:border-line dark:bg-surface-elevated dark:text-content-muted'
                : 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300'
            }`}
          >
            {isCorrect ? (
              <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : isSkipped ? (
              <span className="text-xs font-bold">—</span>
            ) : (
              <XCircle className="size-3.5 text-rose-600 dark:text-rose-400" />
            )}
            <span>Bạn chọn: {userAnswer || 'Chưa trả lời'}</span>
          </span>

          {/* Badge đáp án chuẩn */}
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-extrabold text-emerald-700 dark:text-emerald-300">
            <span>Đáp án: {question.correctAnswer}</span>
          </span>
        </div>
      </div>

      {/* Trình phát Audio nếu là câu hỏi Nghe hiểu (Listening) */}
      {(question.audioUrl || transcriptText || isListeningDialogue) && (
        <div className="rounded-2xl border border-line bg-surface-elevated/40 p-3.5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            {question.audioUrl && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                <Volume2 className="size-4 text-amber-500" />
                <span>Âm thanh câu hỏi:</span>
              </div>
            )}

            {/* Nút thao tác nhanh Transcript cho bài nghe Part 3, Part 4 */}
            {(isListeningDialogue || Boolean(transcriptText)) && (
              <button
                type="button"
                onClick={() => setTranscriptExpanded((value) => !value)}
                aria-expanded={transcriptExpanded}
                aria-controls={`review-transcript-${question.id}`}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition active:scale-[0.98] ${
                  transcriptExpanded
                    ? 'border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-300 shadow-2xs'
                    : 'border-line bg-surface text-content-muted hover:text-content hover:bg-surface-elevated shadow-2xs'
                }`}
                title={transcriptExpanded ? 'Ẩn lời thoại bài nghe' : 'Hiện lời thoại bài nghe song ngữ'}
              >
                <Headphones className="size-3.5 text-amber-500" />
                <span>{transcriptExpanded ? 'Ẩn transcript' : 'Hiện transcript'}</span>
              </button>
            )}
          </div>
          {question.audioUrl && <AudioPlayer audioUrl={question.audioUrl} />}
        </div>
      )}

      {/* Khối Transcript song ngữ cho bài nghe Part 3, Part 4 (khi đã mở) */}
      {(isListeningDialogue || Boolean(transcriptText)) && transcriptExpanded && (
        <div id={`review-transcript-${question.id}`} className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] p-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-amber-500/20 pb-2.5">
            <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
              <Headphones className="size-4 text-amber-500" />
              <span>Nội dung bài nghe (Transcript Part {question.partId})</span>
            </div>
          </div>

          <div className="mt-3">
            {transcriptText ? (
              <InterleavedTranscript
                transcript={transcriptText}
                translation={transcriptTranslation}
                partId={question.partId}
              />
            ) : (
              <p className="italic text-content-muted">Chưa có dữ liệu transcript cho bài nghe này.</p>
            )}
          </div>
        </div>
      )}

      {/* Bài đọc liên quan (Passage) cho câu Reading (Part 6, Part 7) - Mặc định luôn hiện bài đọc */}
      {(isReadingPassage || (isReadingPart && Boolean(passageText))) && Boolean(passageText) && (
        <div className="rounded-2xl border border-line bg-surface-elevated/40 p-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-300">
              <BookOpen className="size-4 text-amber-500" />
              <span>Đoạn văn bài đọc (Part {question.partId})</span>
            </div>

            <button
              type="button"
              onClick={() => setShowBilingualPassage((value) => !value)}
              aria-pressed={showBilingualPassage}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition active:scale-[0.98] ${
                showBilingualPassage
                  ? 'border-sky-500/40 bg-sky-500/15 text-sky-800 dark:text-sky-300 shadow-2xs'
                  : 'border-line bg-surface text-content-muted hover:text-content hover:bg-surface-elevated shadow-2xs'
              }`}
              title={showBilingualPassage ? 'Ẩn bản dịch tiếng Việt song ngữ' : 'Hiện bản dịch tiếng Việt song ngữ'}
            >
              <Languages className="size-3.5 text-sky-500" />
              <span>{showBilingualPassage ? 'Ẩn bản dịch' : 'Hiện bản dịch'}</span>
            </button>
          </div>

          <div className="mt-3 border-t border-line/70 pt-3 font-sans">
            <InterleavedPassage
              passageId={question.passageId}
              passageText={passageText!}
              passageSentencePairs={question.passageSentencePairs}
              passageTranslation={passageTranslation}
              showTranslation={showBilingualPassage}
            />
          </div>
        </div>
      )}

      {/* Hình ảnh đề bài nếu có */}
      {question.imageUrl && (
        <QuestionImage
          src={question.imageUrl}
          alt={`Minh họa câu ${question.questionNumber}`}
          className="max-h-80 w-full object-contain rounded-2xl border border-line p-2 bg-surface-elevated/30"
        />
      )}

      {/* Nội dung câu hỏi (Transcript / Prompt Text) */}
      <div className="text-sm font-semibold text-content leading-relaxed">
        {question.partId === 2 && question.promptText ? (
          <span>
            <strong className="text-amber-600 dark:text-amber-400">Lời thoại câu hỏi:</strong> {question.promptText}
          </span>
        ) : (
          question.promptText || (question.partId <= 2 ? 'Nghe và lựa chọn câu trả lời thích hợp nhất.' : 'Chọn đáp án chính xác.')
        )}
      </div>

      {/* Danh sách các lựa chọn A, B, C, D (nếu có nội dung chữ) */}
      {hasChoiceText && question.choices && (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {question.choices.map((choice) => {
            const isChoiceCorrect = choice.id === question.correctAnswer;
            const isChoiceSelected = choice.id === userAnswer;

            let cardStyle = 'border-line bg-surface-elevated/25 text-content-muted';
            if (isChoiceCorrect) {
              cardStyle = 'border-emerald-500/40 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 font-semibold';
            } else if (isChoiceSelected && !isCorrect) {
              cardStyle = 'border-rose-500/40 bg-rose-500/10 text-rose-950 dark:text-rose-200 font-semibold';
            }

            return (
              <div
                key={choice.id}
                className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs leading-relaxed transition-colors ${cardStyle}`}
              >
                <span className="font-mono font-bold shrink-0">{choice.id}.</span>
                <span className="flex-1">{choice.text}</span>

                {isChoiceCorrect && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-300 shrink-0">
                    <CheckCircle2 className="size-3" />
                    Đáp án đúng
                  </span>
                )}

                {isChoiceSelected && !isCorrect && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/20 px-2 py-0.5 text-[10px] font-black text-rose-700 dark:text-rose-300 shrink-0">
                    <XCircle className="size-3" />
                    Bạn chọn
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bằng chứng trong bài đọc (Evidence) */}
      {question.evidence && (
        <EvidencePanel
          evidence={question.evidence}
          questionNumber={question.questionNumber}
          explanationEn={question.explanationEn}
        />
      )}

      {/* Khối Giải thích chi tiết & Dịch nghĩa */}
      {isReadingPart ? (
        <FormattedReadingExplanation question={question} />
      ) : (
        <div className="space-y-3 pt-1">
          {/* Giải thích câu nghe */}
          {explanationText && (
            <div className="whitespace-pre-line rounded-2xl border border-line bg-surface-elevated/40 p-4 text-xs leading-relaxed text-content">
              <div className="mb-1 font-bold text-amber-600 dark:text-amber-400">
                Giải thích câu hỏi
              </div>
              <div className="text-content-muted">{explanationText}</div>
            </div>
          )}

          {/* Dịch nghĩa câu nghe */}
          {getUnifiedQuestionTranslationText(question) && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-4 text-xs leading-relaxed">
              <div className="mb-1.5 flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300">
                <Languages className="size-3.5" />
                <span>Bản dịch nghĩa:</span>
              </div>
              <div className="whitespace-pre-line text-content leading-relaxed">
                {getUnifiedQuestionTranslationText(question)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Khối Từ vựng quan trọng (Gợi ý học tập & Lưu Flashcard) */}
      {question.keyVocabulary && question.keyVocabulary.length > 0 && (
        <div className="border-t border-line/60 pt-3.5">
          <div className="mb-2.5 flex items-center justify-between text-xs font-bold text-content">
            <span className="flex items-center gap-1.5">
              <BookMarked className="size-3.5 text-amber-500" />
              <span>Từ vựng trọng tâm ({question.keyVocabulary.length}):</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {question.keyVocabulary.map((item) => {
              const isSaved = Boolean(savedVocabWords[item.word]);
              return (
                <div
                  key={item.word}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-elevated/60 px-2.5 py-1.5 text-xs text-content shadow-2xs transition hover:border-amber-400/40"
                >
                  <strong className="font-extrabold text-amber-700 dark:text-amber-300">
                    {item.word}
                  </strong>
                  {item.meaning && (
                    <span className="text-content-muted">: {item.meaning}</span>
                  )}
                  {onSaveVocabulary && (
                    <button
                      type="button"
                      onClick={() => void handleSaveWord(item.word, item.meaning)}
                      title={isSaved ? 'Đã lưu vào sổ từ vựng' : `Lưu từ "${item.word}"`}
                      disabled={savingWord === item.word}
                      className={`ml-1 flex size-5 items-center justify-center rounded-md transition ${
                        isSaved
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'text-content-muted hover:bg-amber-500/15 hover:text-amber-600'
                      }`}
                    >
                      {isSaved ? (
                        <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Plus className="size-3" />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </article>
  );
};

