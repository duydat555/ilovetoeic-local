import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Search,
  Volume2,
  LayoutGrid,
  List as ListIcon,
  CheckCircle2,
  X,
  BookOpen,
  Quote,
  ExternalLink,
  Plus,
  Trash2,
  Languages,
  Copy,
  Check,
} from 'lucide-react';
import { VocabularyWord } from '../../../types';
import { playPronunciation } from '../../../utils/audioPronunciation';
import { getModalMotion } from '../../../components/common/modalMotion';
import { ModalPortal } from '../../../components/common/ModalPortal';
import { BoneyardSkeleton } from '../../../components/common/BoneyardSkeleton';
import {
  VocabularyToolbarSkeleton,
  WordGridSkeleton,
} from '../components/VocabularyLivePageSkeleton';

interface Props {
  words: VocabularyWord[];
  loading?: boolean;
  onToggleRemembered: (word: VocabularyWord) => void;
  onAddWord?: () => void;
  onDeleteWord?: (word: VocabularyWord) => void;
}

const posBadgeColors: Record<string, string> = {
  ADJECTIVE: 'bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400',
  NOUN: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
  VERB: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400',
  ADVERB: 'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400',
  PREPOSITION: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
  CONJUNCTION: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
};

export const WordListView: React.FC<Props> = ({
  words,
  loading = false,
  onToggleRemembered,
  onAddWord,
  onDeleteWord,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isGridView, setIsGridView] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [detailWord, setDetailWord] = useState<VocabularyWord | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredWords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return words;
    return words.filter(
      (w) =>
        w.word.toLowerCase().includes(q) ||
        w.meaningVi.toLowerCase().includes(q) ||
        (w.definitionEn && w.definitionEn.toLowerCase().includes(q))
    );
  }, [words, searchQuery]);

  // Keyboard navigation: ↑ ↓ ← →, Enter to play audio, / to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs or when modal is open
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }
      if (detailWord) return;

      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (filteredWords.length === 0) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredWords.length - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const current = filteredWords[selectedIndex];
        if (current) {
          playPronunciation(current.word, 'US', undefined, current.audioUrl);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredWords, selectedIndex, detailWord]);

  return (
    <div className="space-y-4">
      {/* Search and Toolbar */}
      <BoneyardSkeleton
        name="vocab-word-toolbar"
        loading={loading}
        fallback={<VocabularyToolbarSkeleton />}
      >
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3.5 sm:flex-row sm:items-center sm:justify-between">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-content-muted" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Tìm từ vựng..."
              className="w-full rounded-xl border border-line bg-surface-elevated pl-10 pr-12 py-2 text-sm text-content outline-none transition-all placeholder:text-content-muted focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] font-mono text-content-muted">
              /
            </kbd>
          </div>

          {/* Shortcuts hint & View toggle */}
          <div className="flex items-center justify-between gap-3 text-xs text-content-muted sm:justify-end">
            <span className="hidden items-center gap-1.5 font-medium lg:inline-flex">
              <kbd className="rounded border border-line bg-surface-elevated px-1.5 py-0.5 font-mono text-[10px] text-content">
                ↑↓←→
              </kbd>{' '}
              di chuyển ·{' '}
              <kbd className="rounded border border-line bg-surface-elevated px-1.5 py-0.5 font-mono text-[10px] text-content">
                Enter
              </kbd>{' '}
              phát audio
            </span>

            <span className="font-bold text-content">{filteredWords.length} từ</span>

            {/* Add Word CTA */}
            {onAddWord && (
              <button
                type="button"
                onClick={onAddWord}
                className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-black text-accent-contrast shadow-sm transition hover:bg-accent/90 active:scale-98"
              >
                <Plus className="size-3.5" />
                <span>Thêm từ</span>
              </button>
            )}

            {/* Grid / List view toggle */}
            <div className="flex items-center rounded-xl border border-line bg-surface-elevated p-0.5">
              <button
                type="button"
                onClick={() => setIsGridView(true)}
                className={`rounded-lg p-1.5 transition-colors ${
                  isGridView ? 'bg-surface text-content shadow-sm' : 'text-content-muted hover:text-content'
                }`}
                title="Chế độ lưới"
                aria-label="Chế độ lưới"
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsGridView(false)}
                className={`rounded-lg p-1.5 transition-colors ${
                  !isGridView ? 'bg-surface text-content shadow-sm' : 'text-content-muted hover:text-content'
                }`}
                title="Chế độ danh sách"
                aria-label="Chế độ danh sách"
              >
                <ListIcon className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </BoneyardSkeleton>

      {/* Word Cards Display */}
      <BoneyardSkeleton
        name="vocab-word-grid"
        loading={loading}
        fallback={<WordGridSkeleton isGridView={isGridView} count={9} />}
      >
        {filteredWords.length === 0 ? (
          <div className="grid min-h-64 place-items-center rounded-3xl border border-dashed border-line bg-surface/50 p-8 text-center">
            <div>
              <BookOpen className="mx-auto size-12 text-content-muted/60" />
              <h3 className="mt-3 text-base font-extrabold text-content">
                {words.length === 0 ? 'Chưa có từ vựng nào trong danh sách' : 'Không tìm thấy từ vựng nào'}
              </h3>
              <p className="mt-1 text-xs text-content-muted">
                {words.length === 0
                  ? 'Bắt đầu bổ sung từ vựng để học và ôn tập ngay hôm nay.'
                  : 'Thử tìm kiếm với từ khoá khác hoặc thêm từ mới vào bộ.'}
              </p>
              {onAddWord && (
                <button
                  type="button"
                  onClick={onAddWord}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-extrabold text-accent-contrast shadow-md transition hover:bg-accent/90 active:scale-98"
                >
                  <Plus className="size-4" />
                  <span>Thêm từ mới ngay</span>
                </button>
              )}
            </div>
          </div>
        ) : isGridView ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredWords.map((word, idx) => {
              const isSelected = idx === selectedIndex;
              const posBadge =
                posBadgeColors[word.partOfSpeech?.toUpperCase()] ||
                'bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400';

              return (
                <BoneyardSkeleton key={word.id} name={`word-card-${word.id}`} loading={false}>
                  <div
                    onClick={() => {
                      setSelectedIndex(idx);
                      setDetailWord(word);
                    }}
                    className={`group relative flex cursor-pointer gap-3 rounded-2xl border bg-surface p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-md ${
                      isSelected
                        ? 'border-accent ring-2 ring-accent/20 shadow-sm'
                        : 'border-line hover:border-accent/40'
                    }`}
                  >
                    {/* Thumbnail Illustration / Icon */}
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-line bg-slate-100 dark:bg-slate-800">
                      {word.imageUrl ? (
                        <img
                          src={word.imageUrl}
                          alt={word.word}
                          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex size-full flex-col items-center justify-center bg-gradient-to-br from-accent/15 via-brand-500/10 to-accent/5 text-accent-strong">
                          <span className="text-base font-black tracking-tight">{word.word.slice(0, 2).toUpperCase()}</span>
                          <span className="text-[9px] uppercase font-bold opacity-70">
                            {word.partOfSpeech?.slice(0, 3) || 'WORD'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Word Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <h4 className="truncate text-base font-extrabold text-content group-hover:text-accent-strong transition-colors">
                            {word.word}
                          </h4>
                          <span className="font-mono text-xs font-medium text-sky-600 dark:text-sky-400">
                            {word.phonetic || '//—//'}
                          </span>
                        </div>

                        {/* US and UK Audio buttons */}
                        <div
                          className="flex shrink-0 items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => playPronunciation(word.word, 'US', undefined, word.audioUrl)}
                            title="Phát âm Anh-Mỹ (US)"
                            className="grid size-7 place-items-center rounded-lg border border-sky-500/20 bg-sky-500/10 text-sky-600 transition hover:bg-sky-500 hover:text-white dark:text-sky-400"
                            aria-label={`Phát âm US ${word.word}`}
                          >
                            <Volume2 className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => playPronunciation(word.word, 'UK', undefined, word.audioUkUrl)}
                            title="Phát âm Anh-Anh (UK)"
                            className="grid size-7 place-items-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-600 transition hover:bg-rose-500 hover:text-white dark:text-rose-400"
                            aria-label={`Phát âm UK ${word.word}`}
                          >
                            <Volume2 className="size-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Part of speech pill */}
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className={`inline-block rounded-md border px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${posBadge}`}>
                          {word.partOfSpeech || 'WORD'}
                        </span>
                        {word.remembered && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="size-3" /> Đã thuộc
                          </span>
                        )}
                      </div>

                      {/* Vietnamese meaning preview */}
                      <p className="mt-1 line-clamp-2 text-xs font-medium leading-relaxed text-content-muted">
                        {word.meaningVi}
                      </p>
                    </div>
                  </div>
                </BoneyardSkeleton>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="divide-y divide-line rounded-2xl border border-line bg-surface overflow-hidden">
            {filteredWords.map((word, idx) => {
              const isSelected = idx === selectedIndex;
              const posBadge =
                posBadgeColors[word.partOfSpeech?.toUpperCase()] ||
                'bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400';

              return (
                <BoneyardSkeleton key={word.id} name={`word-row-${word.id}`} loading={false}>
                  <div
                    onClick={() => {
                      setSelectedIndex(idx);
                      setDetailWord(word);
                    }}
                    className={`flex cursor-pointer items-center justify-between gap-4 p-3.5 transition-colors ${
                      isSelected
                        ? 'bg-accent/10 dark:bg-accent/15'
                        : 'hover:bg-surface-hover'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-line bg-slate-100 dark:bg-slate-800">
                        {word.imageUrl ? (
                          <img src={word.imageUrl} alt={word.word} className="size-full object-cover" loading="lazy" />
                        ) : (
                          <div className="flex size-full items-center justify-center bg-accent/10 text-xs font-black text-accent-strong">
                            {word.word.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-content">{word.word}</span>
                          <span className="font-mono text-xs font-medium text-sky-600 dark:text-sky-400">
                            {word.phonetic}
                          </span>
                          <span className={`rounded-md border px-1.5 py-0.2 text-[9px] font-extrabold uppercase ${posBadge}`}>
                            {word.partOfSpeech || 'WORD'}
                          </span>
                        </div>
                        <p className="truncate text-xs text-content-muted">{word.meaningVi}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => playPronunciation(word.word, 'US', undefined, word.audioUrl)}
                        className="grid size-8 place-items-center rounded-lg border border-sky-500/20 bg-sky-500/10 text-sky-600 transition hover:bg-sky-500 hover:text-white dark:text-sky-400"
                        title="Phát âm US"
                      >
                        <Volume2 className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => playPronunciation(word.word, 'UK', undefined, word.audioUkUrl)}
                        className="grid size-8 place-items-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-600 transition hover:bg-rose-500 hover:text-white dark:text-rose-400"
                        title="Phát âm UK"
                      >
                        <Volume2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </BoneyardSkeleton>
              );
            })}
          </div>
        )}
      </BoneyardSkeleton>

      {/* Word Detail Slide-Over / Modal */}
      <AnimatePresence>
        {detailWord && (
          <WordDetailModal
            word={detailWord}
            onClose={() => setDetailWord(null)}
            onToggleRemembered={onToggleRemembered}
            onDeleteWord={onDeleteWord}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

interface DetailModalProps {
  word: VocabularyWord;
  onClose: () => void;
  onToggleRemembered: (word: VocabularyWord) => void;
  onDeleteWord?: (word: VocabularyWord) => void;
}

const renderHighlightedExample = (example: string, targetWord: string) => {
  if (!targetWord || !example) return example;
  const cleanWord = targetWord.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b(${cleanWord}\\w*)\\b`, 'gi');
  const parts = example.split(regex);

  return parts.map((part, index) => {
    if (part.toLowerCase().startsWith(cleanWord.toLowerCase())) {
      return (
        <span
          key={index}
          className="rounded-md bg-amber-500/20 px-1.5 py-0.5 font-black text-amber-900 dark:text-amber-200 ring-1 ring-amber-500/30"
        >
          {part}
        </span>
      );
    }
    return part;
  });
};

const WordDetailModal: React.FC<DetailModalProps> = ({
  word,
  onClose,
  onToggleRemembered,
  onDeleteWord,
}) => {
  const reduceMotion = useReducedMotion();
  const contract = getModalMotion(reduceMotion);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter') playPronunciation(word.word, 'US', undefined, word.audioUrl);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [word, onClose]);

  const posBadge =
    posBadgeColors[word.partOfSpeech?.toUpperCase()] ||
    'bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400';

  return (
    <ModalPortal>
      <motion.div
        {...contract.backdrop}
        className="fixed inset-0 z-[100] grid h-[100dvh] w-screen place-items-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
        onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          {...contract.panel}
          role="dialog"
          aria-modal="true"
          className="w-full max-w-xl rounded-3xl border border-line bg-surface p-6 shadow-2xl dark:shadow-none"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-black tracking-tight text-content">{word.word}</h3>
                <span className={`rounded-lg border px-2 py-0.5 text-xs font-black uppercase ${posBadge}`}>
                  {word.partOfSpeech}
                </span>
                {word.level && (
                  <span className="rounded-lg border border-line bg-surface-elevated px-2 py-0.5 text-xs font-bold text-content-muted">
                    {word.level}
                  </span>
                )}
              </div>
              <span className="mt-1 inline-block font-mono text-sm font-semibold text-sky-600 dark:text-sky-400">
                {word.phonetic}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => playPronunciation(word.word, 'US', undefined, word.audioUrl)}
                className="flex items-center gap-1.5 rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-600 transition hover:bg-sky-500 hover:text-white dark:text-sky-400"
              >
                <Volume2 className="size-3.5" /> US
              </button>
              <button
                type="button"
                onClick={() => playPronunciation(word.word, 'UK', undefined, word.audioUkUrl)}
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-500 hover:text-white dark:text-rose-400"
              >
                <Volume2 className="size-3.5" /> UK
              </button>
              <button
                type="button"
                onClick={onClose}
                className="grid size-9 place-items-center rounded-xl text-content-muted hover:bg-surface-hover hover:text-content"
                aria-label="Đóng"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="mt-5 space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
            {/* 1. Nghĩa tiếng Việt */}
            <div className="group relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.08] via-surface to-surface p-4 transition-all hover:border-emerald-500/40 hover:shadow-md">
              <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-emerald-500/10 blur-2xl" />

              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  <Languages className="size-3.5" />
                  <span>Nghĩa tiếng Việt</span>
                </span>
                <button
                  type="button"
                  onClick={() => void handleCopy(word.meaningVi, 'meaning')}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold text-content-muted transition hover:bg-emerald-500/10 hover:text-emerald-600"
                  title="Sao chép nghĩa"
                >
                  {copiedKey === 'meaning' ? (
                    <>
                      <Check className="size-3 text-emerald-500" />
                      <span className="text-[10px] text-emerald-600 font-bold">Đã chép</span>
                    </>
                  ) : (
                    <Copy className="size-3" />
                  )}
                </button>
              </div>

              <p className="mt-2 text-base sm:text-lg font-black tracking-tight text-content leading-snug">
                {word.meaningVi}
              </p>
            </div>

            {/* 2. Định nghĩa tiếng Anh */}
            {word.definitionEn && (
              <div className="group relative overflow-hidden rounded-2xl border border-sky-500/25 bg-gradient-to-br from-sky-500/[0.08] via-surface to-surface p-4 transition-all hover:border-sky-500/40 hover:shadow-md">
                <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-sky-500/10 blur-2xl" />

                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/20 bg-sky-500/15 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-300">
                    <BookOpen className="size-3.5" />
                    <span>Định nghĩa tiếng Anh</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleCopy(word.definitionEn!, 'definition')}
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold text-content-muted transition hover:bg-sky-500/10 hover:text-sky-600"
                    title="Sao chép định nghĩa"
                  >
                    {copiedKey === 'definition' ? (
                      <>
                        <Check className="size-3 text-emerald-500" />
                        <span className="text-[10px] text-emerald-600 font-bold">Đã chép</span>
                      </>
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>
                </div>

                <p className="mt-2 text-sm sm:text-[15px] font-semibold leading-relaxed text-content/90 font-sans">
                  "{word.definitionEn}"
                </p>
              </div>
            )}

            {/* 3. Câu ví dụ TOEIC thực tế */}
            {word.exampleEn && (
              <div className="group relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/[0.10] via-amber-500/[0.03] to-surface p-4 transition-all hover:border-amber-500/50 hover:shadow-md">
                <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-amber-500/15 blur-2xl" />

                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/20 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    <Quote className="size-3.5" />
                    <span>Câu ví dụ TOEIC thực tế</span>
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => playPronunciation(word.exampleEn!, 'US')}
                      className="grid size-7 place-items-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 transition hover:bg-amber-500 hover:text-white dark:text-amber-300"
                      title="Nghe câu ví dụ"
                      aria-label="Nghe câu ví dụ"
                    >
                      <Volume2 className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCopy(word.exampleEn!, 'example')}
                      className="grid size-7 place-items-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 transition hover:bg-amber-500 hover:text-white dark:text-amber-300"
                      title="Sao chép câu ví dụ"
                      aria-label="Sao chép câu ví dụ"
                    >
                      {copiedKey === 'example' ? (
                        <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* English sentence with highlighted target word */}
                <p className="mt-2.5 text-sm sm:text-base font-bold leading-relaxed text-content">
                  {renderHighlightedExample(word.exampleEn, word.word)}
                </p>

                {/* Vietnamese translation */}
                {word.exampleVi && (
                  <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-amber-500/15 bg-amber-500/[0.06] p-2.5">
                    <Languages className="size-3.5 mt-0.5 shrink-0 text-amber-600/80 dark:text-amber-400/80" />
                    <p className="text-xs sm:text-sm font-medium leading-relaxed text-content-muted italic">
                      {word.exampleVi}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onToggleRemembered(word);
                  onClose();
                }}
                className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-xs font-extrabold transition ${
                  word.remembered
                    ? 'border border-line bg-surface-elevated text-content hover:bg-surface-hover'
                    : 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700'
                }`}
              >
                <CheckCircle2 className="size-4" />
                {word.remembered ? 'Đã thuộc' : 'Đánh dấu đã thuộc'}
              </button>

              {onDeleteWord && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Bạn có chắc muốn xoá từ "${word.word}" khỏi sổ tay không?`)) {
                      onDeleteWord(word);
                      onClose();
                    }
                  }}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 text-xs font-extrabold text-rose-600 transition hover:bg-rose-500 hover:text-white dark:text-rose-400"
                  title="Xoá từ khỏi sổ tay"
                >
                  <Trash2 className="size-3.5" />
                  <span>Xoá từ</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-surface-elevated px-5 text-xs font-bold text-content hover:bg-surface-hover"
            >
              Đóng
            </button>
          </div>
        </motion.div>
      </motion.div>
    </ModalPortal>
  );
};
