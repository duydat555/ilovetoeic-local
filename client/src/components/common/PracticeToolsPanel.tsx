import React, { useEffect, useState } from 'react';
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

  return (
    <AnimatePresence>
      {activeTool && (
        <div className="fixed inset-0 z-[60]">
          <motion.button
            type="button"
            aria-label="Đóng công cụ luyện tập"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/25 backdrop-blur-[1px]"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-line dark:bg-surface"
            role="dialog"
            aria-label={activeTool === 'notes' ? 'Ghi chú luyện tập' : 'Annotator'}
          >
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-line">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
                  {activeTool === 'notes' ? <StickyNote className="size-4.5" /> : <Highlighter className="size-4.5" />}
                </span>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-950 dark:text-content">
                    {activeTool === 'notes' ? 'Ghi chú' : 'Annotator'}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {activeTool === 'notes' ? 'Tự động lưu trong phiên luyện tập' : 'Đánh dấu trực tiếp trên bài đọc'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-surface-hover dark:hover:text-white"
                aria-label="Đóng"
              >
                <X className="size-5" />
              </button>
            </header>

            {activeTool === 'notes' ? (
              <div className="flex min-h-0 flex-1 flex-col">
                {questions.length > 1 && (
                  <div className="flex gap-1.5 overflow-x-auto border-b border-slate-100 p-3 dark:border-line">
                    {questions.map((question) => (
                      <button
                        key={question.id}
                        type="button"
                        onClick={() => setSelectedQuestionId(question.id)}
                        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                          selectedQuestion?.id === question.id
                            ? 'bg-brand text-brand-ink'
                            : 'bg-slate-100 text-slate-500 hover:text-slate-900 dark:bg-surface-elevated dark:text-content-muted dark:hover:text-white'
                        }`}
                      >
                        Câu {question.questionNumber}
                        {notes[question.id]?.trim() && <span className="ml-1 opacity-70">•</span>}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex-1 p-5">
                  <div className="mb-3 flex items-start gap-2.5 rounded-xl bg-slate-50 p-3 dark:bg-surface-elevated/60">
                    <FileText className="mt-0.5 size-4 shrink-0 text-brand-600 dark:text-brand-300" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Câu {selectedQuestion?.questionNumber}
                      </p>
                      <p className="mt-0.5 line-clamp-3 text-xs font-medium leading-relaxed text-slate-700 dark:text-content-muted">
                        {selectedQuestion?.partId === 2
                          ? 'Nghe và chọn phương án phù hợp nhất.'
                          : (selectedQuestion?.promptText || 'Ghi lại từ khóa, bẫy đáp án hoặc cách suy luận của bạn.')}
                      </p>
                    </div>
                  </div>
                  <label className="block">
                    <span className="mb-2 block text-xs font-bold text-slate-700 dark:text-content-muted">Nội dung ghi chú</span>
                    <textarea
                      value={selectedQuestion ? notes[selectedQuestion.id] || '' : ''}
                      onChange={(event) => selectedQuestion && onNoteChange(selectedQuestion.id, event.target.value)}
                      maxLength={2000}
                      autoFocus
                      placeholder="Ví dụ: Chú ý giới từ “by” chỉ thời hạn hoàn thành..."
                      className="min-h-56 w-full resize-y rounded-2xl border border-slate-200 bg-white p-3.5 text-sm leading-relaxed text-slate-700 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:border-line dark:bg-canvas dark:text-content dark:focus:border-brand dark:focus:ring-brand-500/10"
                    />
                  </label>
                  <p className="mt-2 text-right text-[10px] font-medium text-slate-400">
                    {(selectedQuestion ? notes[selectedQuestion.id]?.length : 0) || 0}/2000
                  </p>
                </div>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4 dark:border-brand-900 dark:bg-brand-500/10">
                  <p className="text-xs font-bold text-brand-800 dark:text-brand-200">Cách sử dụng</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-content-muted">
                    Bật Annotator, sau đó bôi đen nội dung trong bài đọc và chọn Highlight hoặc Gạch chân.
                  </p>
                  <button
                    type="button"
                    onClick={onToggleAnnotator}
                    disabled={!hasPassage}
                    className={`mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-bold transition ${
                      annotatorEnabled
                        ? 'bg-brand text-brand-ink hover:bg-brand-hover'
                        : 'border border-brand-200 bg-white text-brand-700 hover:bg-brand-100 dark:border-brand-800 dark:bg-surface dark:text-brand-200'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <Highlighter className="size-4" />
                    {!hasPassage ? 'Nhóm này không có bài đọc' : annotatorEnabled ? 'Đang bật Annotator' : 'Bật Annotator'}
                  </button>
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-900 dark:text-content">Đã đánh dấu</h3>
                    <p className="text-[10px] text-slate-400">{annotations.length} đoạn trong nội dung hiện tại</p>
                  </div>
                  {annotations.length > 0 && (
                    <button
                      type="button"
                      onClick={onClearAnnotations}
                      className="text-[10px] font-bold text-rose-600 hover:underline"
                    >
                      Xóa tất cả
                    </button>
                  )}
                </div>

                <div className="mt-3 space-y-2">
                  {annotations.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center dark:border-line">
                      <Highlighter className="mx-auto size-6 text-slate-300" />
                      <p className="mt-2 text-xs font-medium text-slate-400">Chưa có đoạn nào được đánh dấu.</p>
                    </div>
                  ) : (
                    annotations.map((annotation) => (
                      <div key={annotation.id} className="group flex items-start gap-3 rounded-xl border border-slate-100 p-3 dark:border-line">
                        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
                          {annotation.type === 'highlight' ? <Highlighter className="size-3.5" /> : <Underline className="size-3.5" />}
                        </span>
                        <p className="min-w-0 flex-1 text-xs leading-relaxed text-slate-600 dark:text-content-muted">
                          “{annotation.text}”
                        </p>
                        <button
                          type="button"
                          onClick={() => onDeleteAnnotation(annotation.id)}
                          className="rounded-lg p-1.5 text-slate-300 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
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
    </AnimatePresence>
  );
};
