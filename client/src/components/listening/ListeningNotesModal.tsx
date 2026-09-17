import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookMarked, Loader2, Plus, Trash2, X } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { getModalMotion } from '../common/modalMotion';
import { listeningService } from '../../services/listening';
import { useLanguage } from '../../context/LanguageContext';
import type { ListeningNote } from '../../types';

interface ListeningNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  setId: string;
  setTitle: string;
  currentSentenceId?: string;
  prefillWord?: string;
}

export const ListeningNotesModal: React.FC<ListeningNotesModalProps> = ({
  isOpen,
  onClose,
  setId,
  setTitle,
  currentSentenceId,
  prefillWord = '',
}) => {
  const { t, language } = useLanguage();
  const [notes, setNotes] = useState<ListeningNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [word, setWord] = useState(prefillWord);
  const [noteText, setNoteText] = useState('');
  const [error, setError] = useState('');

  const reduceMotion = useReducedMotion();
  const modalMotion = getModalMotion(reduceMotion);

  useEffect(() => {
    if (prefillWord) setWord(prefillWord);
  }, [prefillWord]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);
    setError('');

    void listeningService.getNotes(setId).then((items) => {
      if (active) {
        setNotes(items);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [isOpen, setId]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen, onClose]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || !noteText.trim() || saving) return;
    setSaving(true);
    setError('');

    const saved = await listeningService.saveNote(setId, {
      sentenceId: currentSentenceId,
      word: word.trim(),
      note: noteText.trim(),
    });

    if (saved) {
      setNotes((prev) => [...prev, saved]);
      setWord('');
      setNoteText('');
    } else {
      setError(
        language === 'en'
          ? 'Failed to save note. Please check network connection.'
          : 'Không thể lưu ghi chú. Vui lòng kiểm tra lại kết nối mạng.'
      );
    }
    setSaving(false);
  };

  if (!isOpen) return null;

  return createPortal(
    <motion.div
      {...modalMotion.backdrop}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/65 p-4 backdrop-blur-md"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        {...modalMotion.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="listening-notes-title"
        className="relative my-auto flex max-h-[85vh] w-full max-w-lg flex-col rounded-3xl border border-line bg-surface p-5 sm:p-6 text-content shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={language === 'en' ? 'Close notebook' : 'Đóng sổ ghi chú'}
          className="absolute right-4 top-4 rounded-full p-2 text-content-muted transition hover:bg-surface-hover hover:text-content"
        >
          <X className="size-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="grid size-10 place-items-center rounded-2xl bg-accent/15 text-accent-strong">
            <BookMarked className="size-5" />
          </div>
          <div className="min-w-0 pr-8">
            <h2 id="listening-notes-title" className="truncate text-base font-extrabold text-content">
              {language === 'en' ? 'Vocabulary & Phrase Notes' : 'Ghi chú từ vựng & Cụm từ'}
            </h2>
            <p className="truncate text-xs font-semibold text-content-muted">{setTitle}</p>
          </div>
        </div>

        {/* Add note form */}
        <form onSubmit={handleAddNote} className="mt-4 rounded-2xl border border-line bg-surface-elevated/40 p-3 sm:p-4">
          <h3 className="text-xs font-extrabold text-content">
            {language === 'en' ? 'Add new word or memo' : 'Thêm từ mới hoặc lưu ý'}
          </h3>
          <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
            <input
              type="text"
              placeholder={language === 'en' ? 'English word / phrase...' : 'Từ / Cụm từ tiếng Anh...'}
              value={word}
              onChange={(e) => setWord(e.target.value)}
              className="rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-content outline-none focus:border-accent"
              required
            />
            <input
              type="text"
              placeholder={language === 'en' ? 'Meaning or memo note...' : 'Nghĩa hoặc ghi chú nhớ...'}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-content outline-none focus:border-accent"
              required
            />
          </div>
          {error && <p className="mt-2 text-xs font-bold text-negative">{error}</p>}
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={saving || !word.trim() || !noteText.trim()}
              className="btn-primary gap-1.5 px-3 py-1.5 text-xs disabled:opacity-40"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              <span>{language === 'en' ? 'Save Note' : 'Lưu ghi chú'}</span>
            </button>
          </div>
        </form>

        {/* Notes list */}
        <div className="mt-4 flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-xs font-semibold text-content-muted">
              <Loader2 className="mr-2 size-4 animate-spin" /> {language === 'en' ? 'Loading notes...' : 'Đang tải danh sách ghi chú...'}
            </div>
          ) : notes.length === 0 ? (
            <div className="py-8 text-center text-xs font-semibold text-content-muted">
              {language === 'en'
                ? 'No notes for this set yet. You can add words to remember above!'
                : 'Chưa có ghi chú nào cho bộ đề này. Bạn có thể thêm từ vựng cần nhớ ở trên!'}
            </div>
          ) : (
            <div className="space-y-2">
              {notes.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="flex items-start justify-between rounded-xl border border-line bg-surface p-3 transition hover:bg-surface-hover/60"
                >
                  <div>
                    <span className="text-xs font-extrabold text-accent-strong">{item.word}</span>
                    <p className="mt-0.5 text-xs font-medium text-content">{item.note}</p>
                  </div>
                  <span className="text-[10px] font-medium text-content-muted">
                    {new Date(item.createdAt).toLocaleDateString(language === 'en' ? 'en-US' : 'vi-VN')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 border-t border-line pt-3 flex justify-end">
          <button type="button" onClick={onClose} className="btn-secondary px-4 py-2 text-xs">
            {t('common.close')}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
};
