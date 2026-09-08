import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Plus,
  Languages,
  X,
  Loader2,
  BookOpen,
  Volume2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { getModalMotion } from '../../../components/common/modalMotion';
import { ModalPortal } from '../../../components/common/ModalPortal';
import { dictionaryService } from '../../../services/dictionary';
import { vocabularyService } from '../../../services/vocabulary';
import { vocabularyTopicService, VocabularyTopic } from '../../../services/vocabularyTopics';
import { WordTranslation } from '../../../types';
import { playPronunciation } from '../../../utils/audioPronunciation';

interface Props {
  userId: string;
  defaultTopicId?: string;
  topics?: VocabularyTopic[];
  onClose: () => void;
  onWordAdded?: () => void;
}

export const AddWordModal: React.FC<Props> = ({
  userId,
  defaultTopicId = 'ai',
  topics = [],
  onClose,
  onWordAdded,
}) => {
  const reduceMotion = useReducedMotion();
  const motionContract = getModalMotion(reduceMotion);

  const [wordInput, setWordInput] = useState('');
  const [phonetic, setPhonetic] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('NOUN');
  const [meaningVi, setMeaningVi] = useState('');
  const [definitionEn, setDefinitionEn] = useState('');
  const [exampleEn, setExampleEn] = useState('');
  const [exampleVi, setExampleVi] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState(defaultTopicId);
  const [personalNote, setPersonalNote] = useState('');

  const [loadingLookup, setLoadingLookup] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleLookupAI = async () => {
    const trimmed = wordInput.trim();
    if (!trimmed) return;
    setLoadingLookup(true);
    setError('');

    try {
      const res: WordTranslation = await dictionaryService.translateWord(trimmed);
      if (res) {
        setWordInput(res.sourceText || trimmed);
        setPhonetic(res.phonetic || '');
        setPartOfSpeech(res.partOfSpeech?.toUpperCase() || 'NOUN');
        setMeaningVi(res.translatedText || '');
        setDefinitionEn(res.definitionEn || '');
        if (res.examples && res.examples.length > 0) {
          setExampleEn(res.examples[0].en || '');
          setExampleVi(res.examples[0].vi || '');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tra từ bằng AI. Bạn có thể tự nhập nghĩa.');
    } finally {
      setLoadingLookup(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const word = wordInput.trim();
    const meaning = meaningVi.trim();

    if (!word) {
      setError('Vui lòng nhập từ tiếng Anh.');
      return;
    }
    if (!meaning) {
      setError('Vui lòng nhập nghĩa tiếng Việt.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const translationObj: WordTranslation = {
        sourceText: word,
        translatedText: meaning,
        phonetic: phonetic.trim(),
        partOfSpeech: partOfSpeech.toUpperCase().trim(),
        definitionEn: definitionEn.trim(),
        examples: exampleEn.trim()
          ? [{ en: exampleEn.trim(), vi: exampleVi.trim() }]
          : [],
        synonyms: [],
        aiSource: 'gemini',
      };

      const selectedTopicObj = topics.find((t) => t.id === selectedTopicId);
      const topicPayload = {
        id: selectedTopicObj?.id || selectedTopicId || 'ai',
        name: selectedTopicObj?.name || 'Từ đã tra bằng AI',
      };

      const res = await vocabularyService.add(
        userId,
        translationObj,
        personalNote,
        topicPayload,
      );

      // If user selected a custom topic, also add word to topic membership
      if (selectedTopicId && !selectedTopicId.startsWith('system-') && selectedTopicId !== 'ai') {
        vocabularyTopicService.addWords(userId, selectedTopicId, [res.word.id]);
      }

      setSuccess(true);
      setTimeout(() => {
        onWordAdded?.();
        onClose();
      }, 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu từ vựng vào hệ thống.');
      setSubmitting(false);
    }
  };

  return (
    <ModalPortal>
      <motion.div
        {...motionContract.backdrop}
        className="fixed inset-0 z-[100] grid h-[100dvh] w-screen place-items-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
        onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          {...motionContract.panel}
          role="dialog"
          aria-modal="true"
          className="w-full max-w-lg rounded-3xl border border-line bg-surface p-6 shadow-2xl dark:shadow-none sm:p-7"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-accent/15 text-accent-strong">
                <Plus className="size-5 stroke-[2.5]" />
              </span>
              <div>
                <h3 className="text-lg font-black text-content">Thêm từ vựng mới</h3>
                <p className="text-xs text-content-muted">Lưu vào sổ tay từ vựng hoặc bộ từ của bạn</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-xl text-content-muted transition hover:bg-surface-hover hover:text-content"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-bold text-rose-600 dark:text-rose-400">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>Đã thêm từ vào kho từ vựng thành công!</span>
              </div>
            )}

            {/* Word Input + AI lookup button */}
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-content-muted">
                Từ tiếng Anh <span className="text-rose-500">*</span>
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  type="text"
                  autoFocus
                  value={wordInput}
                  onChange={(e) => setWordInput(e.target.value)}
                  placeholder="Ví dụ: supervise, facilitate, compromise..."
                  className="min-h-11 flex-1 rounded-2xl border border-line bg-surface-elevated px-4 text-sm font-extrabold text-content outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
                />
                <button
                  type="button"
                  onClick={handleLookupAI}
                  disabled={loadingLookup || !wordInput.trim()}
                  className="group inline-flex min-h-11 items-center gap-2 rounded-2xl bg-accent px-4 text-xs font-black text-accent-contrast shadow-md transition-all hover:bg-accent-hover hover:-translate-y-0.5 active:scale-98 disabled:pointer-events-none disabled:opacity-50"
                >
                  {loadingLookup ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Languages className="size-4" />
                  )}
                  <span>Tra từ</span>
                </button>
              </div>
            </div>

            {/* Phonetic & POS */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-content-muted">Phiên âm IPA</label>
                <div className="relative mt-1">
                  <input
                    type="text"
                    value={phonetic}
                    onChange={(e) => setPhonetic(e.target.value)}
                    placeholder="/ˈsuːpəvaɪz/"
                    className="min-h-10 w-full rounded-xl border border-line bg-surface-elevated px-3 text-xs font-mono text-content outline-none focus:border-accent"
                  />
                  {wordInput && (
                    <button
                      type="button"
                      onClick={() => playPronunciation(wordInput, 'US')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-content-muted hover:text-accent"
                      title="Nghe thử"
                    >
                      <Volume2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-content-muted">Loại từ</label>
                <select
                  value={partOfSpeech}
                  onChange={(e) => setPartOfSpeech(e.target.value)}
                  className="mt-1 min-h-10 w-full rounded-xl border border-line bg-surface-elevated px-3 text-xs font-bold text-content outline-none focus:border-accent"
                >
                  <option value="NOUN">Danh từ (NOUN)</option>
                  <option value="VERB">Động từ (VERB)</option>
                  <option value="ADJECTIVE">Tính từ (ADJ)</option>
                  <option value="ADVERB">Phó từ (ADV)</option>
                  <option value="PHRASE">Cụm từ (PHRASE)</option>
                  <option value="PREPOSITION">Giới từ (PREP)</option>
                </select>
              </div>
            </div>

            {/* Vietnamese Meaning */}
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-content-muted">
                Nghĩa tiếng Việt <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={meaningVi}
                onChange={(e) => setMeaningVi(e.target.value)}
                placeholder="Giám sát, trông nom để bảo đảm đúng quy trình"
                className="mt-1.5 min-h-11 w-full rounded-2xl border border-line bg-surface-elevated px-4 text-sm font-semibold text-content outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
              />
            </div>

            {/* English Definition */}
            <div>
              <label className="text-xs font-bold text-content-muted">Định nghĩa tiếng Anh (tùy chọn)</label>
              <input
                type="text"
                value={definitionEn}
                onChange={(e) => setDefinitionEn(e.target.value)}
                placeholder="To watch a person or activity to make certain that everything is done correctly"
                className="mt-1 min-h-10 w-full rounded-xl border border-line bg-surface-elevated px-3 text-xs text-content outline-none focus:border-accent"
              />
            </div>

            {/* Examples */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-content-muted">Câu ví dụ TOEIC</label>
              <input
                type="text"
                value={exampleEn}
                onChange={(e) => setExampleEn(e.target.value)}
                placeholder="Example: The team leader will supervise the whole project."
                className="min-h-10 w-full rounded-xl border border-line bg-surface-elevated px-3 text-xs text-content outline-none focus:border-accent"
              />
              <input
                type="text"
                value={exampleVi}
                onChange={(e) => setExampleVi(e.target.value)}
                placeholder="Dịch ví dụ: Trưởng nhóm sẽ giám sát toàn bộ dự án."
                className="min-h-10 w-full rounded-xl border border-line bg-surface-elevated px-3 text-xs text-content-muted outline-none focus:border-accent"
              />
            </div>

            {/* Destination Topic */}
            <div>
              <label className="text-xs font-bold text-content-muted">Lưu vào bộ từ vựng</label>
              <select
                value={selectedTopicId}
                onChange={(e) => setSelectedTopicId(e.target.value)}
                className="mt-1 min-h-10 w-full rounded-xl border border-line bg-surface-elevated px-3 text-xs font-bold text-content outline-none focus:border-accent"
              >
                <option value="ai">⭐ Sổ tay cá nhân (Mặc định)</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 rounded-2xl border border-line px-5 text-xs font-bold text-content hover:bg-surface-hover"
              >
                Hủy bỏ
              </button>

              <button
                type="submit"
                disabled={submitting || !wordInput.trim() || !meaningVi.trim()}
                className="group inline-flex min-h-11 items-center gap-2 rounded-2xl bg-accent px-6 text-sm font-black text-accent-contrast shadow-lg shadow-accent/25 transition-all hover:bg-accent-hover hover:-translate-y-0.5 active:scale-98 disabled:pointer-events-none disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                <span>Lưu vào kho từ vựng</span>
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </ModalPortal>
  );
};
