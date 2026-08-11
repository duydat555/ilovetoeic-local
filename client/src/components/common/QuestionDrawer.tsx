import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
  checkedGroupIds?: Set<string>;
  language?: 'vi' | 'en';
}

type FilterTab = 'all' | 'answered' | 'unanswered' | 'flagged';

export const QuestionDrawer: React.FC<QuestionDrawerProps> = ({
  isOpen,
  onClose,
  questions,
  currentIndex,
  onSelectQuestion,
  userAnswers,
  flaggedQuestions = {},
  checkedGroupIds,
  language = 'vi',
}) => {
  const english = language === 'en';
  const [filter, setFilter] = useState<FilterTab>('all');

  const answeredCount = Object.keys(userAnswers).length;
  const flaggedCount = Object.values(flaggedQuestions).filter(Boolean).length;
  const unansweredCount = Math.max(questions.length - answeredCount, 0);
  const completionPercent = questions.length
    ? Math.round((answeredCount / questions.length) * 100)
    : 0;

  const filteredQuestions = questions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => {
      const isAnswered = Boolean(userAnswers[question.id]);
      const isFlagged = Boolean(flaggedQuestions[question.id]);
      if (filter === 'answered') return isAnswered;
      if (filter === 'unanswered') return !isAnswered;
      if (filter === 'flagged') return isFlagged;
      return true;
    });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-xs transition-opacity"
          />

          {/* Slide-over Drawer Panel */}
          <div className="fixed inset-y-0 right-0 flex max-w-full pl-6">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 240 }}
              className="flex w-screen max-w-md flex-col bg-white shadow-2xl dark:bg-surface border-l border-slate-200 dark:border-line"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-line">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-300">
                    <ListChecks className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-content">
                      {english ? 'Question Navigator' : 'Danh sách câu hỏi'}
                    </h2>
                    <p className="text-xs font-medium text-slate-500 dark:text-content-muted">
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
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-surface-hover dark:hover:text-slate-200"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Progress Line */}
              <div className="h-1 w-full bg-slate-100 dark:bg-surface-elevated">
                <div
                  className="h-full bg-brand transition-all duration-300"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>

              {/* Filter Tabs with Live Counters */}
              <div className="flex gap-1.5 border-b border-slate-100 bg-slate-50/50 p-3 dark:border-line dark:bg-canvas/30">
                {(
                  [
                    { id: 'all', label: english ? 'All' : 'Tất cả', count: questions.length },
                    { id: 'answered', label: english ? 'Answered' : 'Đã làm', count: answeredCount },
                    { id: 'unanswered', label: english ? 'Blank' : 'Chưa làm', count: unansweredCount },
                    { id: 'flagged', label: english ? 'Marked' : 'Đã lưu', count: flaggedCount },
                  ] as const
                ).map((tab) => {
                  const active = filter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFilter(tab.id)}
                      className={`flex flex-1 flex-col items-center rounded-xl py-2 px-1 text-center transition-all ${
                        active
                          ? 'bg-white text-brand-600 shadow-xs ring-1 ring-slate-200 dark:bg-surface-elevated dark:text-brand-300 dark:ring-line'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-content-muted dark:hover:bg-surface-hover/50'
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
                  <div className="flex h-40 flex-col items-center justify-center text-xs text-slate-400">
                    {english ? 'No questions match this filter.' : 'Không có câu hỏi nào trong mục này.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-5 sm:grid-cols-6 gap-2.5">
                    {filteredQuestions.map(({ question, index }) => {
                      const answered = Boolean(userAnswers[question.id]);
                      const flagged = Boolean(flaggedQuestions[question.id]);
                      const isCurrent = index === currentIndex;

                      let tileStyle =
                        'relative flex aspect-square flex-col items-center justify-center rounded-xl text-xs font-extrabold transition-all duration-150 cursor-pointer select-none';

                      if (isCurrent) {
                        tileStyle +=
                          ' border-2 border-brand bg-brand text-brand-ink shadow-md ring-2 ring-brand-500/30 scale-105 z-10';
                      } else if (flagged) {
                        tileStyle +=
                          ' border border-amber-500 bg-amber-500 text-white shadow-xs';
                      } else if (answered) {
                        tileStyle +=
                          ' border border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-black';
                      } else {
                        tileStyle +=
                          ' border border-slate-200 bg-slate-50 text-slate-700 hover:border-brand-400 hover:bg-white dark:border-line dark:bg-surface-elevated/60 dark:text-content-muted dark:hover:bg-surface-hover';
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

                          {answered && !isCurrent && !flagged && (
                            <Check className="mt-0.5 size-3 stroke-[3] text-emerald-700 dark:text-emerald-400" />
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
              <div className="border-t border-slate-100 bg-slate-50/60 p-4 dark:border-line dark:bg-canvas/40">
                <div className="mb-3 grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-600 dark:text-content-muted">
                  <div className="flex items-center gap-1.5">
                    <span className="size-3 rounded-md bg-brand" />
                    <span>{english ? 'Current' : 'Đang xem'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-3 rounded-md bg-emerald-500" />
                    <span>{english ? 'Answered' : 'Đã làm'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-3 rounded-md bg-slate-200 border border-slate-300 dark:bg-surface-hover" />
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
                  className="w-full rounded-xl bg-white border border-slate-200 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-100 dark:bg-surface-elevated dark:border-line dark:text-content dark:hover:bg-surface-hover"
                >
                  {english ? 'Close Navigator' : 'Đóng danh sách'}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
