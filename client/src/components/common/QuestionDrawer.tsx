import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Bookmark, Check, ListChecks, X } from 'lucide-react';
import { Question } from '../../types';

type ChoiceId = 'A' | 'B' | 'C' | 'D';

interface QuestionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  currentIndex: number;
  onSelectQuestion: (index: number) => void;
  userAnswers: Record<string, ChoiceId>;
  flaggedQuestions?: Record<string, boolean>;
  checkedQuestionIds?: Set<string>;
  checkedGroupIds?: Set<string>;
  language?: 'vi' | 'en';
}

type FilterTab = 'all' | 'answered' | 'unanswered' | 'flagged' | 'correct' | 'wrong';

export const QuestionDrawer: React.FC<QuestionDrawerProps> = ({
  isOpen,
  onClose,
  questions,
  currentIndex,
  onSelectQuestion,
  userAnswers,
  flaggedQuestions = {},
  checkedQuestionIds,
  language = 'vi',
}) => {
  const english = language === 'en';
  const [filter, setFilter] = useState<FilterTab>('all');
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleExitComplete = () => {
    document.body.style.overflow = '';
  };

  const hasCheckedQuestions = Boolean(checkedQuestionIds && checkedQuestionIds.size > 0);
  const answeredCount = Object.keys(userAnswers).length;
  const flaggedCount = Object.values(flaggedQuestions).filter(Boolean).length;
  const unansweredCount = Math.max(questions.length - answeredCount, 0);
  const correctCount = questions.filter(
    (q) => checkedQuestionIds?.has(q.id) && userAnswers[q.id] === q.correctAnswer,
  ).length;
  const wrongCount = questions.filter(
    (q) => checkedQuestionIds?.has(q.id) && (!userAnswers[q.id] || userAnswers[q.id] !== q.correctAnswer),
  ).length;
  const completionPercent = questions.length
    ? Math.round((answeredCount / questions.length) * 100)
    : 0;

  const filteredQuestions = questions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => {
      const isAnswered = Boolean(userAnswers[question.id]);
      const isFlagged = Boolean(flaggedQuestions[question.id]);
      const isChecked = checkedQuestionIds?.has(question.id) ?? false;
      const isCorrect = isChecked && isAnswered && userAnswers[question.id] === question.correctAnswer;
      const isWrong = isChecked && (!isAnswered || userAnswers[question.id] !== question.correctAnswer);

      if (filter === 'correct') return isCorrect;
      if (filter === 'wrong') return isWrong;
      if (filter === 'answered') return isAnswered;
      if (filter === 'unanswered') return !isAnswered;
      if (filter === 'flagged') return isFlagged;
      return true;
    });

  const tabs = hasCheckedQuestions
    ? [
        { id: 'all' as const, label: english ? 'All' : 'Tất cả', count: questions.length },
        { id: 'correct' as const, label: english ? 'Correct' : 'Đúng', count: correctCount },
        { id: 'wrong' as const, label: english ? 'Wrong' : 'Sai', count: wrongCount },
        { id: 'unanswered' as const, label: english ? 'Blank' : 'Chưa làm', count: unansweredCount },
        { id: 'flagged' as const, label: english ? 'Marked' : 'Đã lưu', count: flaggedCount },
      ]
    : [
        { id: 'all' as const, label: english ? 'All' : 'Tất cả', count: questions.length },
        { id: 'answered' as const, label: english ? 'Answered' : 'Đã làm', count: answeredCount },
        { id: 'unanswered' as const, label: english ? 'Blank' : 'Chưa làm', count: unansweredCount },
        { id: 'flagged' as const, label: english ? 'Marked' : 'Đã lưu', count: flaggedCount },
      ];

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence onExitComplete={handleExitComplete}>
      {isOpen && (
        <div className="fixed inset-0 z-[100] overflow-hidden">
          {/* Full Screen Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.2, ease: 'easeOut' }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-xs transform-gpu [will-change:opacity] [webkit-backface-visibility:hidden]"
          />

          {/* Slide-over Drawer Panel */}
          <div className="fixed inset-y-0 right-0 flex max-w-full pl-6">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{
                duration: reduceMotion ? 0.1 : 0.24,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="flex w-screen max-w-md flex-col bg-surface shadow-2xl border-l border-line text-content transform-gpu [will-change:transform] [webkit-backface-visibility:hidden]"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-accent-strong dark:bg-brand-950/60">
                    <ListChecks className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-content">
                      {english ? 'Question Navigator' : 'Danh sách câu hỏi'}
                    </h2>
                    <p className="text-xs font-medium text-content-muted">
                      {english
                        ? `${answeredCount}/${questions.length} answered (${completionPercent}%)`
                        : `Đã làm ${answeredCount}/${questions.length} câu (${completionPercent}%)`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={english ? 'Close question navigator' : 'Đóng danh sách câu hỏi'}
                  className="rounded-xl p-2 text-content-muted hover:bg-surface-hover hover:text-content transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Progress Line */}
              <div className="h-1 w-full bg-surface-elevated">
                <div
                  className="h-full bg-brand transition-all duration-300"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>

              {/* Filter Tabs with Live Counters */}
              <div className="flex gap-1.5 border-b border-line bg-canvas/40 p-3">
                {tabs.map((tab) => {
                  const active = filter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFilter(tab.id)}
                      className={`flex flex-1 flex-col items-center rounded-xl py-2 px-1 text-center transition-all ${
                        active
                          ? 'bg-surface text-accent-strong shadow-xs ring-1 ring-line font-bold'
                          : 'text-content-muted hover:bg-surface-hover/60'
                      }`}
                    >
                      <span className="text-xs font-black">{tab.count}</span>
                      <span className="text-[10px] font-bold">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Question Grid Area */}
              <div className="flex-1 overflow-y-auto p-4">
                {filteredQuestions.length === 0 ? (
                  <div className="flex h-40 flex-col items-center justify-center text-xs text-content-muted">
                    {english ? 'No questions match this filter.' : 'Không có câu hỏi nào trong mục này.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-5 sm:grid-cols-6 gap-2.5">
                    {filteredQuestions.map(({ question, index }) => {
                      const answered = Boolean(userAnswers[question.id]);
                      const flagged = Boolean(flaggedQuestions[question.id]);
                      const isCurrent = index === currentIndex;
                      const isChecked = checkedQuestionIds ? checkedQuestionIds.has(question.id) : false;
                      const isCorrect = isChecked && answered && userAnswers[question.id] === question.correctAnswer;
                      const isWrong = isChecked && (!answered || userAnswers[question.id] !== question.correctAnswer);

                      let tileStyle =
                        'relative flex aspect-square flex-col items-center justify-center rounded-xl text-xs font-extrabold transition-all duration-150 cursor-pointer select-none';

                      if (isCurrent) {
                        tileStyle +=
                          ' border-2 border-brand bg-brand text-brand-ink shadow-md ring-2 ring-brand-500/30 scale-105 z-10';
                      } else if (flagged) {
                        tileStyle +=
                          ' border border-amber-500 bg-amber-500 text-white shadow-xs';
                      } else if (isChecked) {
                        if (isCorrect) {
                          tileStyle +=
                            ' border border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-black';
                        } else {
                          tileStyle +=
                            ' border border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-black';
                        }
                      } else if (answered) {
                        tileStyle +=
                          ' border border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-950/60 dark:text-brand-300 font-bold';
                      } else {
                        tileStyle +=
                          ' border border-line bg-surface-elevated/60 text-content-muted hover:border-brand-400 hover:bg-surface-hover hover:text-content';
                      }

                      return (
                        <button
                          key={question.id}
                          type="button"
                          onClick={() => {
                            onSelectQuestion(index);
                            onClose();
                          }}
                          className={tileStyle}
                          title={english ? `Question ${question.questionNumber}` : `Câu ${question.questionNumber}`}
                        >
                          <span>{question.questionNumber}</span>

                          {!isCurrent && !flagged && isChecked && isCorrect && (
                            <Check className="mt-0.5 size-3 stroke-[3] text-emerald-700 dark:text-emerald-400" />
                          )}
                          {!isCurrent && !flagged && isChecked && isWrong && (
                            <X className="mt-0.5 size-3 stroke-[3] text-rose-700 dark:text-rose-400" />
                          )}
                          {!isCurrent && !flagged && !isChecked && answered && (
                            <Check className="mt-0.5 size-3 stroke-[3] text-brand-600 dark:text-brand-400" />
                          )}
                          {flagged && (
                            <Bookmark className="absolute top-0.5 right-0.5 size-2.5 fill-current" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Legend & Footer */}
              <div className="border-t border-line bg-canvas/40 p-4">
                <div className={`mb-3 grid ${hasCheckedQuestions ? 'grid-cols-3' : 'grid-cols-2'} gap-2 text-[11px] font-bold text-content-muted`}>
                  <div className="flex items-center gap-1.5">
                    <span className="size-3 rounded-md bg-brand" />
                    <span>{english ? 'Current' : 'Đang xem'}</span>
                  </div>
                  {hasCheckedQuestions ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span className="size-3 rounded-md bg-emerald-500" />
                        <span>{english ? 'Correct' : 'Đúng'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="size-3 rounded-md bg-rose-500" />
                        <span>{english ? 'Wrong' : 'Sai'}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="size-3 rounded-md bg-brand-500" />
                      <span>{english ? 'Answered' : 'Đã làm'}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="size-3 rounded-md border border-line bg-surface-elevated" />
                    <span>{english ? 'Unanswered' : 'Chưa làm'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-3 rounded-md bg-amber-500" />
                    <span>{english ? 'Marked' : 'Đã lưu'}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-xl bg-surface-elevated border border-line py-2.5 text-xs font-bold text-content shadow-xs hover:bg-surface-hover transition-colors"
                >
                  {english ? 'Close Navigator' : 'Đóng danh sách'}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
