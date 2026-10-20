import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Bookmark, Check, ListChecks, X, XCircle } from 'lucide-react';
import type { GrammarQuestion } from '../../services/grammar';
import { BoneyardSkeleton } from '../../components/common/BoneyardSkeleton';
import { useLanguage } from '../../context/LanguageContext';

type QuestionFilter = 'all' | 'unanswered' | 'correct' | 'wrong' | 'saved';

interface GrammarQuestionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  questions: GrammarQuestion[];
  total: number;
  currentIndex: number;
  answers: Record<string, string>;
  loadingMore: boolean;
  savedQuestions?: Record<string, boolean>;
  onSelectQuestion: (index: number) => void;
}

export const GrammarQuestionDrawer: React.FC<GrammarQuestionDrawerProps> = ({
  isOpen,
  onClose,
  questions,
  total,
  currentIndex,
  answers,
  loadingMore,
  savedQuestions = {},
  onSelectQuestion,
}) => {
  const { language } = useLanguage();
  const [filter, setFilter] = useState<QuestionFilter>('all');
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

  const counts = useMemo(() => questions.reduce((result, question) => {
    const answer = answers[question.membership_id];
    if (!answer) result.unanswered += 1;
    else if (answer === question.correct_answer) result.correct += 1;
    else result.wrong += 1;
    return result;
  }, { unanswered: 0, correct: 0, wrong: 0 }), [answers, questions]);

  const filteredQuestions = useMemo(() => questions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => {
      const answer = answers[question.membership_id];
      if (filter === 'saved') return Boolean(savedQuestions[question.question_id]);
      if (filter === 'unanswered') return !answer;
      if (filter === 'correct') return answer === question.correct_answer;
      if (filter === 'wrong') return Boolean(answer) && answer !== question.correct_answer;
      return true;
    }), [answers, filter, questions, savedQuestions]);

  const answeredCount = counts.correct + counts.wrong;
  const completionPercent = total ? Math.round((answeredCount / total) * 100) : 0;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence onExitComplete={handleExitComplete}>
      {isOpen && (
        <div className="fixed inset-0 z-[100] overflow-hidden">
          <motion.button
            type="button"
            aria-label={language === 'en' ? 'Close question list' : 'Đóng danh sách câu hỏi'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.2, ease: 'easeOut' }}
            onClick={onClose}
            className="absolute inset-0 size-full bg-slate-950/45 backdrop-blur-xs transform-gpu [will-change:opacity] [webkit-backface-visibility:hidden]"
          />
          <div className="fixed inset-y-0 right-0 flex max-w-full pl-6">
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{
                duration: reduceMotion ? 0.1 : 0.24,
                ease: [0.22, 1, 0.36, 1],
              }}
              aria-label={language === 'en' ? 'Grammar question drawer' : 'Danh sách câu hỏi ngữ pháp'}
              className="flex w-screen max-w-md flex-col border-l border-line bg-surface shadow-2xl transform-gpu [will-change:transform] [webkit-backface-visibility:hidden]"
            >
              <header className="flex items-center justify-between border-b border-line px-5 py-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                    <ListChecks className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-base font-extrabold text-content">
                      {language === 'en' ? 'Question List' : 'Danh sách câu'}
                    </h2>
                    <p className="text-xs font-medium text-content-muted">
                      {language === 'en'
                        ? `Solved ${answeredCount}/${total} questions (${completionPercent}%)`
                        : `Đã làm ${answeredCount}/${total} câu (${completionPercent}%)`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={language === 'en' ? 'Close question list' : 'Đóng danh sách câu hỏi'}
                  className="rounded-xl p-2 text-content-muted transition-colors hover:bg-surface-hover hover:text-content"
                >
                  <X className="size-5" />
                </button>
              </header>

              <div className="h-1 w-full bg-surface-elevated">
                <div className="h-full bg-brand transition-[width] duration-300" style={{ width: `${completionPercent}%` }} />
              </div>

              <div className="grid grid-cols-5 gap-1.5 border-b border-line bg-canvas/50 p-3">
                {([
                  { id: 'all', label: language === 'en' ? 'All' : 'Tất cả', count: questions.length },
                  { id: 'unanswered', label: language === 'en' ? 'Unanswered' : 'Chưa làm', count: Math.max(questions.length - answeredCount, 0) },
                  { id: 'correct', label: language === 'en' ? 'Correct' : 'Đúng', count: counts.correct },
                  { id: 'wrong', label: language === 'en' ? 'Incorrect' : 'Sai', count: counts.wrong },
                  { id: 'saved', label: language === 'en' ? 'Saved' : 'Đã lưu', count: questions.filter((q) => savedQuestions[q.question_id]).length },
                ] as const).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFilter(item.id)}
                    aria-pressed={filter === item.id}
                    className={`rounded-xl px-1 py-2 text-center transition-colors ${filter === item.id ? 'bg-surface text-brand-700 shadow-xs ring-1 ring-line dark:text-brand-300' : 'text-content-muted hover:bg-surface-hover'}`}
                  >
                    <span className="block text-xs font-black tabular-nums">{item.count}</span>
                    <span className="block text-[10px] font-bold">{item.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {filteredQuestions.length > 0 ? (
                  <div className="grid grid-cols-5 gap-2.5 sm:grid-cols-6">
                    {filteredQuestions.map(({ question, index }) => {
                      const answer = answers[question.membership_id];
                      const correct = answer === question.correct_answer;
                      const wrong = Boolean(answer) && !correct;
                      const current = index === currentIndex;
                      const stateClass = current
                        ? 'border-2 border-brand bg-brand text-brand-ink shadow-md ring-2 ring-brand-500/30'
                        : correct
                          ? 'border border-positive/40 bg-positive/10 text-positive'
                          : wrong
                            ? 'border border-negative/40 bg-negative/10 text-negative'
                            : 'border border-line bg-canvas text-content-muted hover:border-brand-400 hover:bg-surface-hover';
                      return (
                        <button
                          key={question.membership_id}
                          type="button"
                          onClick={() => {
                            onSelectQuestion(index);
                            onClose();
                          }}
                          className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-xs font-extrabold transition-colors ${stateClass}`}
                          title={
                            language === 'en'
                              ? `Question ${index + 1}${question.question_number ? `, original #${question.question_number}` : ''}${question.source_category === 'book' ? ' [In Textbook]' : ''}`
                              : `Câu ${index + 1}${question.question_number ? `, câu gốc ${question.question_number}` : ''}${question.source_category === 'book' ? ' [Trong sách]' : ''}`
                          }
                        >
                          {question.source_category === 'book' && (
                            <span className="absolute top-1 left-1 size-1.5 rounded-full bg-amber-500" />
                          )}
                          {savedQuestions[question.question_id] && <Bookmark className="absolute right-1 top-1 size-2.5 fill-current text-amber-600 dark:text-amber-300" aria-label={language === 'en' ? 'Saved' : 'Đã lưu'} />}
                          <span>{index + 1}</span>
                          {!current && correct && <Check className="mt-0.5 size-3 stroke-[3]" />}
                          {!current && wrong && <XCircle className="mt-0.5 size-3" />}
                        </button>
                      );
                    })}
                  </div>
                ) : !loadingMore ? (
                  <div className="grid h-40 place-items-center text-center text-xs font-semibold text-content-muted">
                    {language === 'en' ? 'No questions in this state.' : 'Không có câu hỏi trong trạng thái này.'}
                  </div>
                ) : null}

                {loadingMore && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-content-muted" role="status">
                    <BoneyardSkeleton name="grammar-question-list-more" variant="row" height={32} width="100%" />
                    <span>{language === 'en' ? 'Loading full question list...' : 'Đang tải đầy đủ danh sách câu'}</span>
                  </div>
                )}
              </div>

              <footer className="border-t border-line bg-canvas/60 p-4">
                <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-content-muted">
                  <span className="flex items-center gap-1.5"><i className="size-3 rounded bg-brand" />{language === 'en' ? 'Current' : 'Đang xem'}</span>
                  <span className="flex items-center gap-1.5"><i className="size-3 rounded bg-positive/70" />{language === 'en' ? 'Correct' : 'Đúng'}</span>
                  <span className="flex items-center gap-1.5"><i className="size-3 rounded bg-negative/70" />{language === 'en' ? 'Incorrect' : 'Sai'}</span>
                  <span className="flex items-center gap-1.5"><i className="size-3 rounded border border-line bg-canvas" />{language === 'en' ? 'Unanswered' : 'Chưa làm'}</span>
                  <span className="flex items-center gap-1.5"><Bookmark className="size-3 fill-current text-amber-600" />{language === 'en' ? 'Saved' : 'Đã lưu'}</span>
                </div>
              </footer>
            </motion.aside>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
