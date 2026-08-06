import React, { useEffect, useRef, useState } from 'react';
import { Question } from '../../types';
import { AnswerReviewItem } from './AnswerReviewItem';

export interface LazyAnswerReviewListProps {
  questions: Question[];
  userAnswers?: Record<string, string>;
  onSaveVocabulary?: (word: string, meaning: string) => Promise<void>;
  savedVocabWords?: Record<string, boolean>;
  batchSize?: number;
}

export const LazyAnswerReviewList: React.FC<LazyAnswerReviewListProps> = ({
  questions,
  userAnswers = {},
  onSaveVocabulary,
  savedVocabWords = {},
  batchSize = 15,
}) => {
  const [renderedCount, setRenderedCount] = useState(batchSize);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Reset renderedCount khi danh sách câu hỏi hoặc bộ lọc thay đổi
  useEffect(() => {
    setRenderedCount(batchSize);
  }, [questions.length, batchSize]);

  // Observer để nạp thêm các câu tiếp theo khi cuộn gần đáy
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
          Đang nạp thêm câu hỏi... ({renderedCount}/{questions.length})
        </div>
      )}
    </div>
  );
};
