import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  History,
  LayoutGrid,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BoneyardSkeleton } from '../../components/common/BoneyardSkeleton';
import { LazyAnswerReviewList } from '../../components/results/LazyAnswerReviewList';
import { PartBreakdownList } from '../../components/results/PartBreakdownList';
import { formatScopeDescription, ResultsHeader } from '../../components/results/ResultsHeader';
import { ResultsSummaryCards } from '../../components/results/ResultsSummaryCards';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import { backendService } from '../../services/backend';
import { vocabularyService } from '../../services/vocabulary';
import { Question, TestResultData } from '../../types';
import { storage } from '../../utils/storage';

export const TestResultPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const attemptIdParam = searchParams.get('attemptId');

  const [result, setResult] = useState<TestResultData | null>(() => {
    if (attemptIdParam) {
      const match = storage.getTestHistory().find((h) => h.attemptId === attemptIdParam);
      if (match) return match;
    }
    return storage.getTestHistory()[0] || null;
  });
  const [loadingAttempt, setLoadingAttempt] = useState(Boolean(attemptIdParam && !result));
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [filter, setFilter] = useState<'all' | 'wrong' | 'correct' | 'skipped'>('all');
  const [savedVocabWords, setSavedVocabWords] = useState<Record<string, boolean>>({});
  const [testMeta, setTestMeta] = useState<{ name?: string; year?: number }>({});
  const [jumpTarget, setJumpTarget] = useState<number | null>(null);
  const [showMatrix, setShowMatrix] = useState(true);

  // Tải chi tiết lượt làm bài nếu có attemptId trên URL
  useEffect(() => {
    if (!attemptIdParam) return;
    let active = true;
    setLoadingAttempt(true);

    backendService
      .getStudyAttemptReview(attemptIdParam)
      .then((data) => {
        if (!active || !data.attempt) return;
        const att = data.attempt;
        const parts =
          (att.metadata?.selected_parts as number[]) || (att.part ? [att.part] : [1, 2, 3, 4, 5, 6, 7]);
        const isPartial = Boolean(
          att.metadata?.is_partial || parts.length < 7 || att.totalQuestions !== 200,
        );
        let partBreakdown = (att.partStats || []).map((ps) => ({
          part: `Part ${ps.part}`,
          correct: ps.correct,
          total: ps.total,
        }));
        if (!partBreakdown.length && att.metadata?.part_breakdown) {
          partBreakdown = att.metadata.part_breakdown as any;
        }

        const loadedResult: TestResultData = {
          attemptId: att.id,
          testId: att.testId || '',
          testTitle: att.testName || (att.metadata?.test_name as string) || 'Đề thi TOEIC',
          testName: att.testName,
          testYear: att.testYear,
          totalScore: isPartial ? 0 : att.totalScore || 0,
          listeningScore: att.listeningScore || 0,
          readingScore: att.readingScore || 0,
          correctAnswers: att.correctAnswers,
          wrongAnswers: Math.max(att.answeredQuestions - att.correctAnswers, 0),
          skippedAnswers: Math.max(att.totalQuestions - att.answeredQuestions, 0),
          timeSpentSeconds: att.timeSpentSeconds,
          accuracyRate: att.accuracyRate,
          completedAt: att.completedAt,
          partBreakdown,
          answers: att.answers,
          questionIds: att.questionIds,
          selectedParts: parts,
          isPartial,
        };
        setResult(loadedResult);
      })
      .catch((err) => {
        console.warn('[!] Không thể mở kết quả bài thi:', err);
      })
      .finally(() => {
        if (active) setLoadingAttempt(false);
      });

    return () => {
      active = false;
    };
  }, [attemptIdParam]);

  // Tải thông tin đề thi (Tên đề & Năm)
  useEffect(() => {
    if (!result?.testId) return;
    let active = true;
    apiService.getTestDetail(result.testId).then((meta) => {
      if (active && meta) {
        setTestMeta({ name: meta.name, year: meta.year });
      }
    });
    return () => {
      active = false;
    };
  }, [result?.testId]);

  // Tải danh sách câu hỏi chi tiết của bài thi
  useEffect(() => {
    if (!result) {
      setLoadingQuestions(false);
      return undefined;
    }
    let active = true;
    setLoadingQuestions(true);
    apiService
      .getFullTestQuestions(result.testId)
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

  // Tải danh sách từ vựng đã lưu trong sổ từ vựng
  useEffect(() => {
    if (!user) return;
    void vocabularyService.getAll(user.id).then((words) => {
      const map: Record<string, boolean> = {};
      words.forEach((w) => {
        map[w.word] = true;
      });
      setSavedVocabWords(map);
    });
  }, [user?.id]);

  // Lưu từ vựng nhanh vào sổ Flashcard cá nhân
  const handleSaveVocabulary = async (word: string, meaning: string) => {
    if (!user) return;
    try {
      await vocabularyService.add(user.id, {
        sourceText: word,
        translatedText: meaning,
        phonetic: '',
        partOfSpeech: '',
        definitionEn: '',
        examples: [],
        synonyms: [],
        aiSource: 'local',
      });
      setSavedVocabWords((prev) => ({ ...prev, [word]: true }));
    } catch (error) {
      console.error('Không thể lưu từ vựng:', error);
    }
  };

  // Xác định nội dung phần thi đã chọn
  const scopeInfo = useMemo(() => {
    const parts = result?.selectedParts || [1, 2, 3, 4, 5, 6, 7];
    const totalCount = result?.questionIds?.length || 0;
    return formatScopeDescription(parts, totalCount);
  }, [result]);

  // Tính tổng số câu Listening & Reading
  const { listeningResult, readingResult } = useMemo(() => {
    if (!result || !result.partBreakdown) {
      return { listeningResult: { correct: 0, total: 0 }, readingResult: { correct: 0, total: 0 } };
    }

    const listeningItems = result.partBreakdown.filter((item) => {
      const partNum = parseInt(item.part.replace(/\D/g, ''), 10);
      return Number.isFinite(partNum) ? partNum <= 4 : item.part.toLowerCase().includes('listening');
    });

    const readingItems = result.partBreakdown.filter((item) => {
      const partNum = parseInt(item.part.replace(/\D/g, ''), 10);
      return Number.isFinite(partNum) ? partNum >= 5 : item.part.toLowerCase().includes('reading');
    });

    const sumItems = (items: typeof result.partBreakdown) =>
      items.reduce(
        (acc, item) => ({ correct: acc.correct + item.correct, total: acc.total + item.total }),
        { correct: 0, total: 0 }
      );

    return {
      listeningResult: sumItems(listeningItems),
      readingResult: sumItems(readingItems),
    };
  }, [result]);

  // Danh sách toàn bộ câu hỏi trong bài làm này (theo các Part đã chọn)
  const inScopeQuestions = useMemo(() => {
    if (!result || !questions.length) return [];
    const selectedQuestionIds = result.questionIds ? new Set(result.questionIds) : null;
    return selectedQuestionIds
      ? questions.filter((q) => selectedQuestionIds.has(q.id))
      : questions;
  }, [questions, result]);

  // Thống kê số câu đúng / sai / chưa làm theo danh sách câu hỏi thực tế
  const questionCounts = useMemo(() => {
    if (!result || !inScopeQuestions.length) {
      return {
        total: inScopeQuestions.length,
        correct: result?.correctAnswers || 0,
        wrong: result?.wrongAnswers || 0,
        skipped: result?.skippedAnswers || 0,
      };
    }
    let correct = 0;
    let wrong = 0;
    let skipped = 0;

    inScopeQuestions.forEach((q) => {
      const ans = result.answers?.[q.id];
      if (!ans) {
        skipped++;
      } else if (ans === q.correctAnswer) {
        correct++;
      } else {
        wrong++;
      }
    });

    return {
      total: inScopeQuestions.length,
      correct,
      wrong,
      skipped,
    };
  }, [inScopeQuestions, result]);

  // Lọc danh sách câu hỏi xem lại theo bộ lọc người dùng
  const reviewQuestions = useMemo(() => {
    if (!result) return [];
    if (filter === 'all') return inScopeQuestions;

    return inScopeQuestions.filter((question) => {
      const selectedAnswer = result.answers?.[question.id];
      if (filter === 'skipped') {
        return !selectedAnswer;
      }
      if (filter === 'correct') {
        return selectedAnswer === question.correctAnswer;
      }
      if (filter === 'wrong') {
        return Boolean(selectedAnswer && selectedAnswer !== question.correctAnswer);
      }
      return true;
    });
  }, [filter, inScopeQuestions, result]);

  // Nhấp vào số câu trong Bảng câu hỏi nhanh để chuyển trực tiếp đến câu đó
  const handleJumpToQuestion = (qNum: number) => {
    const targetQuestion = inScopeQuestions.find((q) => q.questionNumber === qNum);
    if (targetQuestion) {
      const ans = result?.answers?.[targetQuestion.id];
      const isCorrect = ans === targetQuestion.correctAnswer;
      const isSkipped = !ans;
      const isWrong = Boolean(ans && !isCorrect);

      if (
        (filter === 'correct' && !isCorrect) ||
        (filter === 'wrong' && !isWrong) ||
        (filter === 'skipped' && !isSkipped)
      ) {
        setFilter('all');
      }
    }

    setJumpTarget(null);
    setTimeout(() => {
      setJumpTarget(qNum);
    }, 25);
  };

  // Trạng thái đang tải kết quả
  if (loadingAttempt && !result) {
    return (
      <div className="surface mx-auto my-14 max-w-lg rounded-3xl border border-line p-10 text-center shadow-xs space-y-4">
        <Loader2 className="mx-auto size-8 text-amber-500 animate-spin" aria-hidden="true" />
        <h2 className="text-base font-black text-content">Đang mở kết quả bài thi...</h2>
        <p className="text-xs text-content-muted leading-relaxed">
          Vui lòng đợi giây lát trong khi bảng điểm và lời giải chi tiết được chuẩn bị.
        </p>
      </div>
    );
  }

  // Trạng thái chưa có kết quả
  if (!result) {
    return (
      <div className="surface mx-auto my-14 max-w-lg rounded-3xl border border-line p-10 text-center shadow-xs space-y-5">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <History className="size-8" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-black text-content">Chưa tìm thấy kết quả bài thi</h1>
          <p className="mt-2 text-xs leading-relaxed text-content-muted">
            Bạn có thể chọn một đề thi trong kho đề để bắt đầu luyện tập hoặc xem lại danh sách các bài thi đã hoàn thành.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/tests')}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-black text-brand-ink transition hover:bg-accent-hover shadow-2xs"
          >
            <LayoutGrid className="size-4" />
            <span>Kho đề thi TOEIC</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/tests?tab=history')}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-xs font-bold text-content transition hover:bg-surface-hover shadow-2xs"
          >
            <History className="size-4 text-content-muted" />
            <span>Lịch sử làm bài</span>
          </button>
        </div>
      </div>
    );
  }

  const totalQuestionsInScope =
    result.questionIds?.length ||
    result.correctAnswers + result.wrongAnswers + result.skippedAnswers;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Hero Header Kết quả bài thi */}
      <ResultsHeader
        testTitle={result.testTitle}
        testName={testMeta.name || result.testName}
        testYear={testMeta.year || result.testYear}
        testId={result.testId}
        selectedParts={result.selectedParts}
        isPartial={result.isPartial}
        completedAt={result.completedAt}
        timeSpentSeconds={result.timeSpentSeconds}
        accuracyRate={result.accuracyRate}
        totalScore={result.totalScore}
        listeningScore={result.listeningScore}
        readingScore={result.readingScore}
        correctAnswers={result.correctAnswers}
        wrongAnswers={result.wrongAnswers}
        skippedAnswers={result.skippedAnswers}
        totalQuestions={totalQuestionsInScope}
      />

      {/* 2. Thống kê tổng quan 4 chỉ số KPI */}
      <ResultsSummaryCards
        hasListening={scopeInfo.hasListening}
        hasReading={scopeInfo.hasReading}
        isPartial={result.isPartial}
        listeningResult={listeningResult}
        readingResult={readingResult}
        listeningScore={result.listeningScore}
        readingScore={result.readingScore}
        correctAnswers={result.correctAnswers}
        wrongAnswers={result.wrongAnswers}
        skippedAnswers={result.skippedAnswers}
        accuracyRate={result.accuracyRate}
        totalQuestions={totalQuestionsInScope}
        timeSpentSeconds={result.timeSpentSeconds}
      />

      {/* 3. Phân tích chi tiết kết quả theo từng phần thi (Part) */}
      <PartBreakdownList
        partBreakdown={result.partBreakdown}
        selectedParts={result.selectedParts}
        hasListening={scopeInfo.hasListening}
        hasReading={scopeInfo.hasReading}
      />

      {/* 4. Xem lại danh sách đáp án chi tiết & Bảng điều hướng câu hỏi */}
      <div className="rounded-3xl border border-line bg-surface p-6 shadow-xs sm:p-8 space-y-6">
        {/* Tiêu đề & Bộ lọc câu hỏi */}
        <div className="flex flex-col justify-between gap-4 border-b border-line/60 pb-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-black tracking-tight text-content sm:text-lg">
              Xem lại đáp án & lời giải chi tiết
            </h2>
            <p className="mt-0.5 text-xs text-content-muted">
              Đối chiếu đáp án của bạn, xem giải thích chi tiết, dịch nghĩa câu hỏi và lưu từ vựng trọng tâm.
            </p>
          </div>

          {/* Bộ lọc: Tất cả / Làm đúng / Làm sai / Chưa làm */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-line bg-surface-elevated/60 p-1.5">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all ${
                filter === 'all'
                  ? 'bg-surface text-amber-600 dark:text-amber-400 shadow-2xs border border-line/60'
                  : 'text-content-muted hover:text-content'
              }`}
            >
              Tất cả ({questionCounts.total})
            </button>
            <button
              type="button"
              onClick={() => setFilter('wrong')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all ${
                filter === 'wrong'
                  ? 'bg-rose-500 text-white shadow-2xs'
                  : 'text-content-muted hover:text-content'
              }`}
            >
              Làm sai ({questionCounts.wrong})
            </button>
            <button
              type="button"
              onClick={() => setFilter('correct')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all ${
                filter === 'correct'
                  ? 'bg-emerald-500 text-white shadow-2xs'
                  : 'text-content-muted hover:text-content'
              }`}
            >
              Làm đúng ({questionCounts.correct})
            </button>
            {questionCounts.skipped > 0 && (
              <button
                type="button"
                onClick={() => setFilter('skipped')}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all ${
                  filter === 'skipped'
                    ? 'bg-slate-700 text-white shadow-2xs dark:bg-slate-600'
                    : 'text-content-muted hover:text-content'
                }`}
              >
                Chưa làm ({questionCounts.skipped})
              </button>
            )}
          </div>
        </div>

        {/* Bảng câu hỏi nhanh (Question Palette Matrix) */}
        {inScopeQuestions.length > 0 && (
          <div className="rounded-2xl border border-line bg-surface-elevated/30 p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-amber-500" />
                <span className="text-xs font-extrabold text-content">
                  Bảng câu hỏi nhanh
                </span>
                <span className="hidden sm:inline text-[11px] font-semibold text-content-muted">
                  (Nhấp vào số câu để chuyển nhanh đến xem lời giải)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowMatrix(!showMatrix)}
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:underline dark:text-amber-400"
              >
                <span>{showMatrix ? 'Thu gọn bảng' : 'Hiện bảng câu hỏi'}</span>
                {showMatrix ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </button>
            </div>

            {showMatrix && (
              <div className="space-y-3 pt-1 border-t border-line/60">
                <div className="flex flex-wrap items-center gap-4 text-[11px] font-semibold text-content-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-emerald-500 inline-block" />
                    <span>Làm đúng ({questionCounts.correct})</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-rose-500 inline-block" />
                    <span>Làm sai ({questionCounts.wrong})</span>
                  </span>
                  {questionCounts.skipped > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full bg-slate-400 inline-block" />
                      <span>Chưa trả lời ({questionCounts.skipped})</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto pr-1">
                  {inScopeQuestions.map((q) => {
                    const ans = result.answers?.[q.id];
                    const isCorrect = ans === q.correctAnswer;
                    const isSkipped = !ans;

                    let btnStyle =
                      'border-line bg-surface text-content-muted hover:border-amber-400 hover:text-content';
                    if (isCorrect) {
                      btnStyle =
                        'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25';
                    } else if (!isSkipped) {
                      btnStyle =
                        'border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-300 hover:bg-rose-500/25';
                    } else {
                      btnStyle =
                        'border-line bg-slate-100 text-slate-500 dark:bg-surface-elevated dark:text-content-muted hover:bg-slate-200';
                    }

                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => handleJumpToQuestion(q.questionNumber)}
                        title={`Câu ${q.questionNumber} (Part ${q.partId}): ${
                          isCorrect ? 'Đúng' : isSkipped ? 'Chưa trả lời' : 'Sai'
                        }`}
                        className={`size-8 rounded-lg border font-mono text-xs font-bold transition tabular-nums shrink-0 ${btnStyle}`}
                      >
                        {q.questionNumber}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Danh sách câu hỏi xem lại Lazy Load */}
        {loadingQuestions ? (
          <BoneyardSkeleton name="test-result-review" height={280} />
        ) : reviewQuestions.length > 0 ? (
          <LazyAnswerReviewList
            questions={reviewQuestions}
            userAnswers={result.answers}
            onSaveVocabulary={handleSaveVocabulary}
            savedVocabWords={savedVocabWords}
            jumpToQuestionNumber={jumpTarget}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-line p-10 text-center text-xs font-semibold text-content-muted">
            Không có câu hỏi nào trong danh mục này.
          </div>
        )}
      </div>
    </div>
  );
};

