import React, { useEffect, useMemo, useState } from 'react';
import { History, Loader2 } from 'lucide-react';
import { LazyAnswerReviewList } from '../../components/results/LazyAnswerReviewList';
import { PartBreakdownList } from '../../components/results/PartBreakdownList';
import { formatScopeDescription, ResultsHeader } from '../../components/results/ResultsHeader';
import { ResultsSummaryCards } from '../../components/results/ResultsSummaryCards';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import { vocabularyService } from '../../services/vocabulary';
import { Question } from '../../types';
import { storage } from '../../utils/storage';

export const TestResultPage: React.FC = () => {
  const { user } = useAuth();
  const [result] = useState(() => storage.getTestHistory()[0]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [filter, setFilter] = useState<'all' | 'wrong' | 'correct'>('all');
  const [savedVocabWords, setSavedVocabWords] = useState<Record<string, boolean>>({});
  const [testMeta, setTestMeta] = useState<{ name?: string; year?: number }>({});

  // Tải thông tin metadata của đề thi (Tên đề & Năm phát hành)
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

  // Tải danh sách câu hỏi của bài thi
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

  // Tải danh sách từ vựng đã lưu để hiển thị dấu ✓ trên thẻ từ vựng
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

  // Lưu từ vựng nhanh vào Flashcard cá nhân
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

  // Xác định phạm vi làm bài và các chỉ số
  const scopeInfo = useMemo(() => {
    const parts = result?.selectedParts || [1, 2, 3, 4, 5, 6, 7];
    const totalCount = result?.questionIds?.length || 0;
    return formatScopeDescription(parts, totalCount);
  }, [result]);

  // Tính tổng số câu Listening & Reading trong phạm vi đã chọn
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

  // Lọc danh sách câu hỏi xem lại theo phạm vi & bộ lọc
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
      <div className="surface mx-auto max-w-xl rounded-2xl border border-line p-8 text-center shadow-xs">
        <History className="mx-auto size-10 text-content-muted" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-bold text-content">Chưa có kết quả bài thi</h1>
        <p className="mt-2 text-sm leading-relaxed text-content-muted">
          Kết quả sẽ xuất hiện tại đây sau khi bạn hoàn thành một bài thi thử từ kho đề.
        </p>
      </div>
    );
  }

  const totalQuestionsInScope = result.questionIds?.length || result.correctAnswers + result.wrongAnswers + result.skippedAnswers;

  return (
    <div className="space-y-7 pb-12">
      {/* 1. Header Kết quả bài thi */}
      <ResultsHeader
        testTitle={result.testTitle}
        testName={testMeta.name || result.testName}
        testYear={testMeta.year || result.testYear}
        testId={result.testId}
        selectedParts={result.selectedParts}
        isPartial={result.isPartial}
        completedAt={result.completedAt}
        accuracyRate={result.accuracyRate}
        totalScore={result.totalScore}
        correctAnswers={result.correctAnswers}
        totalQuestions={totalQuestionsInScope}
      />

      {/* 2. Khối thống kê tổng quan (Nằm đè nhẹ lên mép dưới Banner - Pattern Dashboard hiện đại) */}
      <div className="relative z-20 -mt-8 sm:-mt-10 px-3 sm:px-6">
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
        />
      </div>

      {/* 3. Chi tiết kết quả theo từng Part (Nội dung mở rộng theo phạm vi) */}
      <PartBreakdownList
        partBreakdown={result.partBreakdown}
        selectedParts={result.selectedParts}
        hasListening={scopeInfo.hasListening}
        hasReading={scopeInfo.hasReading}
      />

      {/* 4. Xem lại danh sách đáp án chi tiết */}
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs sm:p-8 dark:shadow-none space-y-6">
        <div className="flex flex-col justify-between gap-4 border-b border-line pb-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-base font-extrabold text-content">Xem lại đáp án chi tiết</h3>
            <p className="mt-0.5 text-xs text-content-muted">
              Bao gồm bản dịch nghĩa câu hỏi, dịch nghĩa phương án đáp án và kho từ vựng gợi ý.
            </p>
          </div>

          {/* Bộ lọc Tất cả / Câu sai / Câu đúng */}
          <div className="flex items-center gap-1.5 rounded-2xl bg-surface-elevated/70 p-1.5 border border-line">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all ${
                filter === 'all'
                  ? 'bg-surface text-brand-600 shadow-2xs dark:text-brand-400'
                  : 'text-content-muted hover:text-content'
              }`}
            >
              Tất cả câu
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
              Câu làm sai
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
              Câu làm đúng
            </button>
          </div>
        </div>

        {/* Danh sách câu hỏi xem lại Lazy Load */}
        {loadingQuestions ? (
          <div className="flex items-center justify-center gap-2.5 py-12 text-sm font-extrabold text-content-muted">
            <Loader2 className="size-5 animate-spin text-brand-600 dark:text-brand-400" />
            <span>Đang tải dữ liệu xem lại...</span>
          </div>
        ) : reviewQuestions.length > 0 ? (
          <LazyAnswerReviewList
            questions={reviewQuestions}
            userAnswers={result.answers}
            onSaveVocabulary={handleSaveVocabulary}
            savedVocabWords={savedVocabWords}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-line p-10 text-center text-sm font-semibold text-content-muted">
            Không có câu hỏi nào phù hợp với bộ lọc này.
          </div>
        )}
      </div>
    </div>
  );
};
