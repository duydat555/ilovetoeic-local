import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ListChecks, Loader2, X, XCircle } from 'lucide-react';
import type { GrammarQuestion } from '../../services/grammar';

type QuestionFilter = 'all' | 'unanswered' | 'correct' | 'wrong';

interface GrammarQuestionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  questions: GrammarQuestion[];
  total: number;
  currentIndex: number;
  answers: Record<string, string>;
  loadingMore: boolean;
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
  onSelectQuestion,
}) => {
  const [filter, setFilter] = useState<QuestionFilter>('all');

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

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
      if (filter === 'unanswered') return !answer;
      if (filter === 'correct') return answer === question.correct_answer;
      if (filter === 'wrong') return Boolean(answer) && answer !== question.correct_answer;
      return true;
    }), [answers, filter, questions]);

  const answeredCount = counts.correct + counts.wrong;
  const completionPercent = total ? Math.round((answeredCount / total) * 100) : 0;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] overflow-hidden">
          <motion.button
            type="button"
            aria-label="Đóng danh sách câu hỏi"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 size-full bg-slate-950/35 backdrop-blur-xs"
          />
          <div className="fixed inset-y-0 right-0 flex max-w-full pl-6">
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 240 }}
              aria-label="Danh sách câu hỏi ngữ pháp"
              className="flex w-screen max-w-md flex-col border-l border-line bg-surface shadow-2xl"
            >
              <header className="flex items-center justify-between border-b border-line px-5 py-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                    <ListChecks className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-base font-extrabold text-content">Danh sách câu</h2>
                    <p className="text-xs font-medium text-content-muted">Đã làm {answeredCount}/{total} câu ({completionPercent}%)</p>
                  </div>
                </div>
                <button type="button" onClick={onClose} aria-label="Đóng danh sách câu hỏi" className="rounded-xl p-2 text-content-muted transition-colors hover:bg-surface-hover hover:text-content">
                  <X className="size-5" />
                </button>
              </header>

              <div className="h-1 w-full bg-surface-elevated">
                <div className="h-full bg-brand transition-[width] duration-300" style={{ width: `${completionPercent}%` }} />
              </div>

              <div className="grid grid-cols-4 gap-1.5 border-b border-line bg-canvas/50 p-3">
                {([
                  { id: 'all', label: 'Tất cả', count: questions.length },
                  { id: 'unanswered', label: 'Chưa làm', count: Math.max(questions.length - answeredCount, 0) },
                  { id: 'correct', label: 'Đúng', count: counts.correct },
                  { id: 'wrong', label: 'Sai', count: counts.wrong },
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
                          title={`Câu ${index + 1}${question.question_number ? `, câu gốc ${question.question_number}` : ''}`}
                        >
                          <span>{index + 1}</span>
                          {!current && correct && <Check className="mt-0.5 size-3 stroke-[3]" />}
                          {!current && wrong && <XCircle className="mt-0.5 size-3" />}
                        </button>
                      );
                    })}
                  </div>
                ) : !loadingMore ? (
                  <div className="grid h-40 place-items-center text-center text-xs font-semibold text-content-muted">Không có câu hỏi trong trạng thái này.</div>
                ) : null}

                {loadingMore && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-content-muted" role="status">
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> Đang tải đầy đủ danh sách câu
                  </div>
                )}
              </div>

              <footer className="border-t border-line bg-canvas/60 p-4">
                <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-content-muted">
                  <span className="flex items-center gap-1.5"><i className="size-3 rounded bg-brand" />Đang xem</span>
                  <span className="flex items-center gap-1.5"><i className="size-3 rounded bg-positive/70" />Đúng</span>
                  <span className="flex items-center gap-1.5"><i className="size-3 rounded bg-negative/70" />Sai</span>
                  <span className="flex items-center gap-1.5"><i className="size-3 rounded border border-line bg-canvas" />Chưa làm</span>
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
