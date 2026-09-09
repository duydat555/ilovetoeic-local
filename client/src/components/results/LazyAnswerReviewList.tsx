import React, { useEffect, useRef, useState } from 'react';
import { Question } from '../../types';
import { AnswerReviewItem } from './AnswerReviewItem';

export interface LazyAnswerReviewListProps {
  questions: Question[];
  userAnswers?: Record<string, string>;
  onSaveVocabulary?: (word: string, meaning: string) => Promise<void>;
  savedVocabWords?: Record<string, boolean>;
  batchSize?: number;
  jumpToQuestionNumber?: number | null;
}

export const LazyAnswerReviewList: React.FC<LazyAnswerReviewListProps> = ({
  questions,
  userAnswers = {},
  onSaveVocabulary,
  savedVocabWords = {},
  batchSize = 15,
  jumpToQuestionNumber,
}) => {
  const [renderedCount, setRenderedCount] = useState(batchSize);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Đặt lại số câu đã render khi danh sách câu hỏi hoặc bộ lọc thay đổi
  useEffect(() => {
    setRenderedCount(batchSize);
  }, [questions.length, batchSize]);

  // Nhảy trực tiếp đến câu hỏi được chỉ định từ Bảng câu hỏi nhanh
  useEffect(() => {
    if (!jumpToQuestionNumber) return;

    const targetIdx = questions.findIndex((q) => q.questionNumber === jumpToQuestionNumber);
    if (targetIdx === -1) return;

    if (targetIdx >= renderedCount) {
      setRenderedCount(Math.min(questions.length, targetIdx + 15));
    }

    // Đợi DOM hoàn tất render rồi cuộn mượt tới câu hỏi
    const timer = setTimeout(() => {
      const el = document.getElementById(`question-review-${jumpToQuestionNumber}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-amber-500', 'ring-offset-2', 'transition-all');
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-amber-500', 'ring-offset-2');
        }, 2200);
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [jumpToQuestionNumber, questions, renderedCount]);

  // Observer để hiển thị thêm các câu tiếp theo khi cuộn gần đáy
  useEffect(() => {
    if (renderedCount >= questions.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setRenderedCount((prev) => Math.min(prev + batchSize, questions.length));
        }
      },
      { rootMargin: '400px' }
    );

    const currentRef = bottomRef.current;
    if (currentRef) observer.observe(currentRef);

    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [renderedCount, questions.length, batchSize]);

  const visibleQuestions = questions.slice(0, renderedCount);

  return (
    <div className="space-y-4">
      {visibleQuestions.map((q) => {
        const userAnswer = userAnswers[q.id];
        const isCorrect = userAnswer === q.correctAnswer;
        return (
          <AnswerReviewItem
            key={q.id}
            question={q}
            userAnswer={userAnswer}
            isCorrect={isCorrect}
            onSaveVocabulary={onSaveVocabulary}
            savedVocabWords={savedVocabWords}
          />
        );
      })}

      {renderedCount < questions.length && (
        <div ref={bottomRef} className="py-6 text-center text-xs font-semibold text-content-muted">
          Đang hiển thị thêm câu hỏi... ({renderedCount}/{questions.length})
        </div>
      )}
    </div>
  );
};

