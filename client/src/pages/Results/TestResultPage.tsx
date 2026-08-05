import React, { useEffect, useMemo, useState } from 'react';
import { Trophy, Headphones, BookOpen, CheckCircle2, XCircle, Loader2, History } from 'lucide-react';
import { EvidencePanel } from '../../components/common/EvidencePanel';
import { apiService } from '../../services/api';
import { Question } from '../../types';
import { formatExplanationText } from '../../utils/practice';
import { storage } from '../../utils/storage';
import { getTestPartScopeLabel } from '../../utils/testScope';

export const TestResultPage: React.FC = () => {
  const [result] = useState(() => storage.getTestHistory()[0]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [filter, setFilter] = useState<'all' | 'wrong' | 'correct'>('all');

  useEffect(() => {
    if (!result) {
      setLoadingQuestions(false);
      return undefined;
    }
    let active = true;
    setLoadingQuestions(true);
    apiService.getFullTestQuestions(result.testId)
      .then((data) => {
        if (active) setQuestions(data);
      })
      .finally(() => {
        if (active) setLoadingQuestions(false);
      });
    return () => {
      active = false;
    };
  }, [result?.testId]);

  const reviewQuestions = useMemo(() => {
    if (!result) return [];
    const selectedQuestionIds = result.questionIds ? new Set(result.questionIds) : null;
    const source = selectedQuestionIds
      ? questions.filter((question) => selectedQuestionIds.has(question.id))
      : questions;
    if (filter === 'all') return source;
    return source.filter((question) => {
      const selectedAnswer = result.answers?.[question.id];
      const isCorrect = selectedAnswer === question.correctAnswer;
      return filter === 'correct' ? isCorrect : !isCorrect;
    });
  }, [filter, questions, result]);

  if (!result) {
    return (
      <div className="surface mx-auto max-w-xl px-6 py-12 text-center">
        <History className="mx-auto size-9 text-content-muted" aria-hidden="true" />
        <h1 className="mt-4 text-lg font-bold text-content">Chưa có kết quả bài thi</h1>
        <p className="mt-2 text-sm leading-relaxed text-content-muted">
          Kết quả sẽ xuất hiện tại đây sau khi bạn hoàn thành một đề thi từ kho đề.
        </p>
      </div>
    );
  }

  const scopeLabel = getTestPartScopeLabel(result.selectedParts || [1, 2, 3, 4, 5, 6, 7]);
  const listeningBreakdown = result.partBreakdown.filter((item) => {
    const part = Number.parseInt(item.part.replace(/\D/g, ''), 10);
    return Number.isFinite(part) ? part <= 4 : item.part.toLowerCase().includes('listening');
  });
  const readingBreakdown = result.partBreakdown.filter((item) => {
    const part = Number.parseInt(item.part.replace(/\D/g, ''), 10);
    return Number.isFinite(part) ? part >= 5 : item.part.toLowerCase().includes('reading');
  });
  const sumBreakdown = (items: typeof result.partBreakdown) => items.reduce(
    (totals, item) => ({ correct: totals.correct + item.correct, total: totals.total + item.total }),
    { correct: 0, total: 0 },
  );
  const listeningResult = sumBreakdown(listeningBreakdown);
  const readingResult = sumBreakdown(readingBreakdown);

  return (
    <div className="space-y-7">
      {/* Header Result Summary Banner */}
      <div className="relative overflow-hidden bg-[linear-gradient(125deg,#e5ad00,#ffd13f)] rounded-[28px] border border-brand-400/30 p-6 sm:p-8 text-brand-ink shadow-[0_24px_70px_-32px_rgba(138,94,21,.8)] flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="pointer-events-none absolute -right-20 -top-32 size-80 rounded-full border-[52px] border-white/[.06]" />
        <div className="space-y-3 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold">
            <Trophy className="w-4 h-4 text-amber-300 fill-amber-300" />
            <span>{result.isPartial ? 'Kết quả bài thi theo phạm vi' : 'Kết quả bài thi thử TOEIC'}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold">{result.testTitle}</h1>
          <p className="text-xs sm:text-sm text-brand-ink/75">
            {result.isPartial ? `${scopeLabel}. ` : ''}Hoàn thành lúc: {result.completedAt}
          </p>
        </div>

        {/* Total Predicted Score Card */}
        <div className="bg-white/25 backdrop-blur-md p-6 rounded-3xl border border-brand-ink/10 text-center shrink-0 min-w-[200px]">
          <div className="text-xs font-bold uppercase tracking-wider text-brand-ink/70">
            {result.isPartial ? 'Độ chính xác' : 'Điểm TOEIC dự đoán'}
          </div>
          <div className="text-5xl font-black mt-1 text-brand-ink">
            {result.isPartial ? `${result.accuracyRate}%` : result.totalScore}
          </div>
          <div className="text-xs text-brand-ink/75 mt-1">
            {result.isPartial ? `${result.correctAnswers}/${result.questionIds?.length || 0} câu đúng` : 'trên thang điểm 990'}
          </div>
        </div>
      </div>

      {/* Score Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="surface surface-hover p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-600 flex items-center justify-center shrink-0">
            <Headphones className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">{result.isPartial ? 'Listening' : 'Điểm Listening'}</div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-content">
              {result.isPartial ? `${listeningResult.correct}/${listeningResult.total} câu` : `${result.listeningScore} / 495`}
            </div>
          </div>
        </div>

        <div className="surface surface-hover p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">{result.isPartial ? 'Reading' : 'Điểm Reading'}</div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-content">
              {result.isPartial ? `${readingResult.correct}/${readingResult.total} câu` : `${result.readingScore} / 495`}
            </div>
          </div>
        </div>

        <div className="surface surface-hover p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Số câu đúng</div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-content">{result.correctAnswers} câu ({result.accuracyRate}%)</div>
          </div>
        </div>

        <div className="surface surface-hover p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Số câu sai / Bỏ qua</div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-content">{result.wrongAnswers + result.skippedAnswers} câu</div>
          </div>
        </div>
      </div>

      {/* Part Breakdown Progress */}
      <div className="surface p-6 sm:p-8 space-y-6">
        <h3 className="font-bold text-base text-slate-800 dark:text-content">Chi tiết kết quả theo từng Part</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {result.partBreakdown.map((part, idx) => {
            const percent = Math.round((part.correct / part.total) * 100);
            return (
              <div key={idx} className="p-4 bg-slate-50 dark:bg-surface-hover/40 rounded-2xl space-y-2 border border-slate-200/60 dark:border-line">
                <div className="flex justify-between items-center text-xs font-bold text-slate-800 dark:text-content">
                  <span>{part.part}</span>
                  <span className="text-brand-600 dark:text-brand-300">{part.correct}/{part.total} ({percent}%)</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-surface-hover h-2 rounded-full overflow-hidden">
                  <div className="bg-brand h-full rounded-full" style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Answer Key Review Section */}
      <div className="surface p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-line pb-4">
          <h3 className="font-bold text-base text-slate-800 dark:text-content">Xem lại danh sách đáp án chi tiết</h3>

          <div className="flex items-center gap-2 bg-slate-100 dark:bg-surface-hover/50 p-1 rounded-xl">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'all' ? 'bg-white dark:bg-surface-elevated text-brand-600 shadow-sm' : 'text-slate-500'}`}
            >
              Tất cả câu
            </button>
            <button
              onClick={() => setFilter('wrong')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'wrong' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-500'}`}
            >
              Câu làm sai
            </button>
            <button
              onClick={() => setFilter('correct')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'correct' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500'}`}
            >
              Câu làm đúng
            </button>
          </div>
        </div>

        {/* Detailed Question Explanations */}
        <div className="space-y-4">
          {loadingQuestions ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm font-semibold text-slate-500">
              <Loader2 className="size-5 animate-spin" /> Đang tải dữ liệu xem lại...
            </div>
          ) : reviewQuestions.length > 0 ? (
            reviewQuestions.map((q) => {
              const selectedAnswer = result.answers?.[q.id];
              const isCorrect = selectedAnswer === q.correctAnswer;
              return (
                <div key={q.id} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-line dark:bg-surface-hover/40">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-slate-800 dark:text-content">Câu {q.questionNumber} (Part {q.partId})</span>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-2.5 py-1 font-bold ${
                        isCorrect
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-rose-500/10 text-rose-600'
                      }`}>
                        Bạn chọn: {selectedAnswer || 'Bỏ qua'}
                      </span>
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 font-bold text-emerald-600">
                        Đáp án đúng: {q.correctAnswer}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-slate-700 sm:text-sm dark:text-content-muted">
                    {q.partId === 2 && q.promptText ? (
                      <span><strong className="text-brand-600 dark:text-brand-400">Câu hỏi (Transcript):</strong> {q.promptText}</span>
                    ) : (
                      q.promptText || (q.partId <= 2 ? 'Nghe và chọn phương án phù hợp nhất.' : 'Chọn đáp án đúng.')
                    )}
                  </p>

                  {q.evidence ? (
                    <EvidencePanel evidence={q.evidence} questionNumber={q.questionNumber} />
                  ) : (
                    <div className="whitespace-pre-line rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-600 dark:border-line dark:bg-surface-elevated dark:text-content-muted">
                      <div className="mb-1 font-bold text-brand-600">Giải thích</div>
                      <div>{formatExplanationText(q.explanation)}</div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500 dark:border-line">
              Không có câu hỏi phù hợp với bộ lọc này.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
