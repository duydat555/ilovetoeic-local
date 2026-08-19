import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FileText, Highlighter, StickyNote, Trash2, Underline, X,
} from 'lucide-react';
import { Question } from '../../types';
import { PracticeAnnotation } from './AnnotatablePassage';

export type PracticeTool = 'notes' | 'annotator';

interface PracticeToolsPanelProps {
  activeTool: PracticeTool | null;
  onClose: () => void;
  questions: Question[];
  notes: Record<string, string>;
  onNoteChange: (questionId: string, value: string) => void;
  annotations: PracticeAnnotation[];
  annotatorEnabled: boolean;
  hasPassage: boolean;
  onToggleAnnotator: () => void;
  onDeleteAnnotation: (id: string) => void;
  onClearAnnotations: () => void;
}

export const PracticeToolsPanel: React.FC<PracticeToolsPanelProps> = ({
  activeTool,
  onClose,
  questions,
  notes,
  onNoteChange,
  annotations,
  annotatorEnabled,
  hasPassage,
  onToggleAnnotator,
  onDeleteAnnotation,
  onClearAnnotations,
}) => {
  const [selectedQuestionId, setSelectedQuestionId] = useState(questions[0]?.id || '');

  useEffect(() => {
    if (!questions.some((question) => question.id === selectedQuestionId)) {
      setSelectedQuestionId(questions[0]?.id || '');
    }
  }, [questions, selectedQuestionId]);

  useEffect(() => {
    if (!activeTool) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [activeTool, onClose]);

  const selectedQuestion = questions.find((question) => question.id === selectedQuestionId) || questions[0];

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {activeTool && (
        <div className="fixed inset-0 z-[100]">
          <motion.button
            type="button"
            aria-label="Đóng công cụ luyện tập"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col border-l border-line bg-surface shadow-2xl text-content"
            role="dialog"
            aria-label={activeTool === 'notes' ? 'Ghi chú luyện tập' : 'Annotator'}
          >
            <header className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-accent-strong dark:bg-brand-500/10">
                  {activeTool === 'notes' ? <StickyNote className="size-4.5" /> : <Highlighter className="size-4.5" />}
                </span>
                <div>
                  <h2 className="text-sm font-extrabold text-content">
                    {activeTool === 'notes' ? 'Ghi chú' : 'Annotator'}
                  </h2>
                  <p className="text-[11px] text-content-muted">
                    {activeTool === 'notes' ? 'Tự động lưu trong phiên luyện tập' : 'Đánh dấu trực tiếp trên bài đọc'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng bảng công cụ"
                className="rounded-xl p-2 text-content-muted hover:bg-surface-hover hover:text-content transition-colors"
              >
                <X className="size-5" />
              </button>
            </header>

            {activeTool === 'notes' ? (
              <div className="flex min-h-0 flex-1 flex-col p-5">
                {questions.length > 1 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {questions.map((question) => {
                      const hasNote = Boolean(notes[question.id]);
                      const isSelected = question.id === selectedQuestion.id;
                      return (
                        <button
                          key={question.id}
                          type="button"
                          onClick={() => setSelectedQuestionId(question.id)}
                          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                            isSelected
                              ? 'bg-brand text-brand-ink shadow-sm ring-2 ring-brand-500/20'
                              : hasNote
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                              : 'bg-surface-elevated text-content-muted hover:bg-surface-hover hover:text-content'
                          }`}
                        >
                          Câu {question.questionNumber}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-content-muted">
                    Ghi chú cho Câu {selectedQuestion.questionNumber}
                  </span>
                  {notes[selectedQuestion.id] && (
                    <button
                      type="button"
                      onClick={() => onNoteChange(selectedQuestion.id, '')}
                      className="text-xs font-semibold text-rose-500 hover:text-rose-600"
                    >
                      Xóa ghi chú
                    </button>
                  )}
                </div>

                <textarea
                  value={notes[selectedQuestion.id] || ''}
                  onChange={(event) => onNoteChange(selectedQuestion.id, event.target.value)}
                  placeholder="Nhập ghi chú quan trọng, từ mới hoặc lưu ý cho câu này..."
                  className="flex-1 w-full resize-none rounded-2xl border border-line bg-surface-elevated/70 p-3.5 text-xs text-content leading-relaxed placeholder:text-content-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
                />
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5">
                {!hasPassage ? (
                  <div className="flex flex-1 flex-col items-center justify-center text-center text-xs text-content-muted">
                    <FileText className="mb-2 size-8 opacity-40" />
                    Chỉ hỗ trợ đánh dấu trên các phần có đoạn văn bài đọc (Part 6 & Part 7).
                  </div>
                ) : (
                  <div className="mb-4 rounded-2xl border border-line bg-surface-elevated/70 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-extrabold text-content">Chế độ Highlight</div>
                        <div className="text-[11px] text-content-muted">
                          Bôi đen văn bản trong đoạn đọc để highlight hoặc gạch chân
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={onToggleAnnotator}
                        className={`rounded-xl px-3 py-1.5 text-xs font-extrabold transition ${
                          annotatorEnabled
                            ? 'bg-brand text-brand-ink shadow-sm'
                            : 'bg-surface-elevated text-content-muted hover:bg-surface-hover hover:text-content'
                        }`}
                      >
                        {annotatorEnabled ? 'Đang bật' : 'Đang tắt'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-content-muted">
                    Đã đánh dấu ({annotations.length})
                  </span>
                  {annotations.length > 0 && (
                    <button
                      type="button"
                      onClick={onClearAnnotations}
                      className="text-xs font-semibold text-rose-500 hover:text-rose-600"
                    >
                      Xóa tất cả
                    </button>
                  )}
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                  {annotations.length === 0 ? (
                    <div className="flex h-32 items-center justify-center text-center text-xs text-content-muted">
                      Chưa có đoạn nào được highlight
                    </div>
                  ) : (
                    annotations.map((annotation) => (
                      <div key={annotation.id} className="group flex items-start gap-3 rounded-xl border border-line bg-surface-elevated/40 p-3">
                        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-accent-strong dark:bg-brand-500/10">
                          {annotation.type === 'highlight' ? <Highlighter className="size-3.5" /> : <Underline className="size-3.5" />}
                        </span>
                        <p className="min-w-0 flex-1 text-xs leading-relaxed text-content">
                          “{annotation.text}”
                        </p>
                        <button
                          type="button"
                          onClick={() => onDeleteAnnotation(annotation.id)}
                          className="rounded-lg p-1.5 text-content-muted transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                          aria-label="Xóa đánh dấu"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
