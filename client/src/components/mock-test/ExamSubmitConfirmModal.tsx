import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Send, X } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { getModalMotion } from '../common/modalMotion';

interface ExamSubmitConfirmModalProps {
  answeredCount: number;
  totalQuestions: number;
  submitting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ExamSubmitConfirmModal: React.FC<ExamSubmitConfirmModalProps> = ({
  answeredCount,
  totalQuestions,
  submitting,
  onConfirm,
  onClose,
}) => {
  const reduceMotion = useReducedMotion();
  const modalMotion = getModalMotion(reduceMotion);
  const unansweredCount = Math.max(totalQuestions - answeredCount, 0);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose, submitting]);

  return createPortal(
    <motion.div
      {...modalMotion.backdrop}
      className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <motion.section
        {...modalMotion.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exam-submit-title"
        className="w-full max-w-md rounded-3xl border border-line bg-surface p-5 text-content shadow-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
              <AlertCircle className="size-4.5" />
            </span>
            <div>
              <h2 id="exam-submit-title" className="text-base font-extrabold">Submit test?</h2>
              <p className="mt-1 text-sm leading-relaxed text-content-muted">
                You have answered {answeredCount} of {totalQuestions} questions.
                {unansweredCount > 0 ? ` ${unansweredCount} unanswered.` : ' All questions have been answered.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close submission confirmation"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-content-muted transition hover:bg-surface-hover disabled:opacity-40"
          >
            <X className="size-4" />
          </button>
        </div>

        <p className="mt-4 rounded-xl bg-slate-100 p-3 text-xs font-semibold leading-relaxed text-slate-600 dark:bg-surface-elevated dark:text-content-muted">
          You cannot change your answers after submitting. There is no penalty for guessing.
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={submitting} className="btn-secondary text-xs">
            Return to Test
          </button>
          <button type="button" onClick={onConfirm} disabled={submitting} className="btn-primary text-xs">
            <Send className="size-3.5" /> {submitting ? 'Submitting...' : 'Submit Test'}
          </button>
        </div>
      </motion.section>
    </motion.div>,
    document.body,
  );
};
