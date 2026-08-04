import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Layers3,
  Languages,
  List,
  RefreshCw,
  RotateCcw,
  Search,
  Volume2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  VOCABULARY_CHANGED_EVENT,
  vocabularyService,
} from '../../services/vocabulary';
import { VocabularyWord } from '../../types';

type ViewMode = 'flashcards' | 'list';

const speak = (word: string) => {
  if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'en-US';
  utterance.rate = 0.88;
  window.speechSynthesis.speak(utterance);
};

const VocabularySkeleton = () => (
  <div className="grid min-h-80 place-items-center rounded-2xl border border-line bg-surface p-6" role="status">
    <span className="sr-only">Đang tải từ vựng</span>
    <div className="w-full max-w-2xl animate-pulse space-y-4 motion-reduce:animate-none">
      <div className="mx-auto h-5 w-28 rounded bg-surface-elevated" />
      <div className="mx-auto h-12 w-52 rounded-xl bg-surface-elevated" />
      <div className="mx-auto h-4 w-36 rounded bg-surface-elevated" />
      <div className="mt-8 h-20 rounded-xl bg-surface-elevated" />
    </div>
  </div>
);

export const VocabularyLivePage: React.FC = () => {
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [query, setQuery] = useState('');
  const [rememberedOnly, setRememberedOnly] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('flashcards');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [direction, setDirection] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadWords = useCallback(async (showLoading = true) => {
    if (!user) return;
    if (showLoading) setLoading(true);
    setError('');
    try {
      setWords(await vocabularyService.getAll(user.id));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải từ vựng đã lưu.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadWords();
  }, [loadWords]);

  useEffect(() => {
    const reloadAfterChange = () => void loadWords(false);
    window.addEventListener(VOCABULARY_CHANGED_EVENT, reloadAfterChange);
    return () => window.removeEventListener(VOCABULARY_CHANGED_EVENT, reloadAfterChange);
  }, [loadWords]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('vi');
    return words.filter((word) => {
      const searchable = `${word.word} ${word.meaningVi} ${word.topicName || ''}`;
      const matchesQuery = !normalized || searchable.toLocaleLowerCase('vi').includes(normalized);
      return matchesQuery && (!rememberedOnly || word.remembered);
    });
  }, [query, rememberedOnly, words]);

  useEffect(() => {
    setCurrentIndex((current) => Math.min(current, Math.max(filtered.length - 1, 0)));
    setFlipped(false);
  }, [filtered.length, query, rememberedOnly]);

  const currentWord = filtered[currentIndex];

  const changeCard = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= filtered.length || nextIndex === currentIndex) return;
    setDirection(nextIndex > currentIndex ? 1 : -1);
    setFlipped(false);
    setCurrentIndex(nextIndex);
  };

  const toggleRemembered = async (word: VocabularyWord) => {
    if (!user) return;
    const remembered = !word.remembered;
    setWords((current) => current.map((item) => (
      item.id === word.id ? { ...item, remembered } : item
    )));
    try {
      await vocabularyService.update(user.id, word.id, { remembered });
    } catch (updateError) {
      setWords((current) => current.map((item) => (
        item.id === word.id ? { ...item, remembered: word.remembered } : item
      )));
      setError(updateError instanceof Error ? updateError.message : 'Không thể cập nhật trạng thái từ.');
    }
  };

  return (
    <div className="space-y-5 pb-10">
      <header>
        <div className="eyebrow mb-3">
          <Languages className="size-3.5" aria-hidden="true" />
          Kho từ cá nhân
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-content sm:text-3xl">
          Từ vựng đã lưu
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-content-muted">
          Ôn bằng flashcard hoặc xem danh sách những từ bạn đã tra và lưu.
        </p>
      </header>

      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-sm">
          <span className="sr-only">Tìm từ vựng</span>
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-content-muted" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-line bg-surface-elevated pl-10 pr-4 text-sm text-content outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
            placeholder="Tìm từ, nghĩa hoặc chủ đề"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={rememberedOnly}
            onClick={() => setRememberedOnly((current) => !current)}
            className={`min-h-10 rounded-xl px-3.5 text-sm font-bold transition active:scale-[.98] ${
              rememberedOnly
                ? 'bg-accent text-accent-contrast'
                : 'bg-surface-elevated text-content-muted hover:bg-surface-hover'
            }`}
          >
            Đã thuộc {words.filter((word) => word.remembered).length}
          </button>
          <div className="flex rounded-xl bg-surface-elevated p-1" aria-label="Kiểu hiển thị">
            <button
              type="button"
              aria-pressed={viewMode === 'flashcards'}
              onClick={() => setViewMode('flashcards')}
              className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition ${
                viewMode === 'flashcards'
                  ? 'bg-surface text-content shadow-sm'
                  : 'text-content-muted hover:text-content'
              }`}
            >
              <Layers3 className="size-3.5" aria-hidden="true" />
              Flashcard
            </button>
            <button
              type="button"
              aria-pressed={viewMode === 'list'}
              onClick={() => setViewMode('list')}
              className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition ${
                viewMode === 'list'
                  ? 'bg-surface text-content shadow-sm'
                  : 'text-content-muted hover:text-content'
              }`}
            >
              <List className="size-3.5" aria-hidden="true" />
              Danh sách
            </button>
          </div>
        </div>
      </section>

      {error && words.length > 0 && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <VocabularySkeleton />
      ) : error && words.length === 0 ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-500/10">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
          <button type="button" onClick={() => void loadWords()} className="btn-secondary mt-4 text-sm">
            <RefreshCw className="size-4" aria-hidden="true" />
            Thử lại
          </button>
        </section>
      ) : filtered.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-line bg-surface px-6 py-14 text-center">
          <BookOpen className="mx-auto size-9 text-content-muted" aria-hidden="true" />
          <h2 className="mt-4 text-lg font-extrabold text-content">
            {words.length ? 'Không có từ phù hợp' : 'Chưa có từ vựng đã lưu'}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-content-muted">
            {words.length
              ? 'Thử đổi từ khoá hoặc tắt bộ lọc đã thuộc.'
              : 'Bôi đen một từ tiếng Anh trong bài học để tra nghĩa và lưu vào kho cá nhân.'}
          </p>
        </section>
      ) : viewMode === 'flashcards' && currentWord ? (
        <section aria-label="Ôn tập bằng flashcard">
          <div className="mx-auto max-w-3xl">
            <div className="mb-3 flex items-center justify-between text-xs font-semibold text-content-muted">
              <span>{currentIndex + 1} / {filtered.length}</span>
              <span>{currentWord.topicName || 'Từ đã tra bằng AI'}</span>
            </div>

            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <motion.div
                key={currentWord.id}
                custom={direction}
                initial={reduceMotion ? false : { opacity: 0, x: direction * 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, x: direction * -24 }}
                transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="perspective-1000"
              >
                <div
                  role="button"
                  tabIndex={0}
                  aria-pressed={flipped}
                  aria-label={flipped ? 'Đang xem mặt nghĩa. Nhấn để xem lại từ tiếng Anh.' : 'Đang xem từ tiếng Anh. Nhấn để xem nghĩa.'}
                  onClick={() => setFlipped((current) => !current)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setFlipped((current) => !current);
                    }
                  }}
                  className="group relative min-h-[360px] w-full rounded-2xl focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-canvas"
                >
                  <motion.div
                    animate={{ rotateY: flipped ? 180 : 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.36, ease: [0.22, 1, 0.36, 1] }}
                    style={{ transformStyle: 'preserve-3d' }}
                    className="absolute inset-0"
                  >
                    <div className="backface-hidden absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-line bg-surface px-6 py-10 text-center shadow-[0_24px_60px_-38px_rgba(15,23,42,.4)] dark:shadow-none">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          speak(currentWord.word);
                        }}
                        className="absolute right-4 top-4 grid size-10 place-items-center rounded-xl border border-line text-content-muted transition hover:border-accent/60 hover:bg-accent/10 hover:text-accent-strong active:scale-[.96]"
                        aria-label={`Phát âm ${currentWord.word}`}
                      >
                        <Volume2 className="size-4.5" aria-hidden="true" />
                      </button>
                      <p className="text-xs font-bold uppercase tracking-[.12em] text-accent-strong dark:text-brand-300">
                        Mặt trước
                      </p>
                      <h2 className="mt-5 break-words text-4xl font-extrabold tracking-tight text-content sm:text-5xl">
                        {currentWord.word}
                      </h2>
                      <p className="mt-3 text-sm font-medium text-content-muted">
                        {[currentWord.phonetic, currentWord.partOfSpeech].filter(Boolean).join('  ')}
                      </p>
                      <span className="mt-10 inline-flex items-center gap-2 text-xs font-semibold text-content-muted">
                        <RotateCcw className="size-4 transition-transform group-hover:-rotate-12" aria-hidden="true" />
                        Nhấn để lật thẻ
                      </span>
                    </div>

                    <div className="backface-hidden rotate-y-180 absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-accent/40 bg-brand-50 px-6 py-10 text-center shadow-[0_24px_60px_-38px_rgba(138,94,21,.4)] dark:bg-brand-500/10 dark:shadow-none">
                      <p className="text-xs font-bold uppercase tracking-[.12em] text-accent-strong dark:text-brand-300">
                        Nghĩa tiếng Việt
                      </p>
                      <h2 className="mt-4 max-w-2xl text-2xl font-extrabold leading-snug text-content sm:text-3xl">
                        {currentWord.meaningVi}
                      </h2>
                      {currentWord.definitionEn && (
                        <p className="mt-4 max-w-xl text-sm leading-relaxed text-content-muted">
                          {currentWord.definitionEn}
                        </p>
                      )}
                      {currentWord.exampleEn && (
                        <div className="mt-6 max-w-xl rounded-xl border border-accent/20 bg-surface/75 px-4 py-3 text-left">
                          <p className="text-sm font-medium leading-relaxed text-content">{currentWord.exampleEn}</p>
                          {currentWord.exampleVi && (
                            <p className="mt-1.5 text-xs leading-relaxed text-content-muted">{currentWord.exampleVi}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-4 grid grid-cols-[44px_1fr_44px] items-center gap-3">
              <button
                type="button"
                onClick={() => changeCard(currentIndex - 1)}
                disabled={currentIndex === 0}
                className="grid size-11 place-items-center rounded-xl border border-line bg-surface text-content transition hover:border-accent/60 hover:bg-accent/10 active:scale-[.96] disabled:pointer-events-none disabled:opacity-35"
                aria-label="Từ trước"
              >
                <ChevronLeft className="size-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => void toggleRemembered(currentWord)}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold transition active:scale-[.98] ${
                  currentWord.remembered
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300'
                    : 'border-line bg-surface text-content hover:border-accent/60 hover:bg-accent/10'
                }`}
              >
                <CheckCircle2 className="size-4" aria-hidden="true" />
                {currentWord.remembered ? 'Đã thuộc' : 'Đánh dấu đã thuộc'}
              </button>
              <button
                type="button"
                onClick={() => changeCard(currentIndex + 1)}
                disabled={currentIndex === filtered.length - 1}
                className="grid size-11 place-items-center rounded-xl border border-line bg-surface text-content transition hover:border-accent/60 hover:bg-accent/10 active:scale-[.96] disabled:pointer-events-none disabled:opacity-35"
                aria-label="Từ tiếp theo"
              >
                <ChevronRight className="size-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-3 lg:grid-cols-2" aria-label="Danh sách từ vựng">
          {filtered.map((word) => (
            <article key={word.id} className="rounded-2xl border border-line bg-surface p-4 shadow-sm dark:shadow-none">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-lg font-extrabold text-content">{word.word}</h2>
                    <button
                      type="button"
                      onClick={() => speak(word.word)}
                      aria-label={`Phát âm ${word.word}`}
                      className="grid size-8 place-items-center rounded-lg text-content-muted transition hover:bg-surface-hover hover:text-content"
                    >
                      <Volume2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                  <p className="mt-0.5 text-xs font-medium text-content-muted">
                    {[word.phonetic, word.partOfSpeech].filter(Boolean).join('  ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void toggleRemembered(word)}
                  className={`grid size-9 shrink-0 place-items-center rounded-xl border transition ${
                    word.remembered
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300'
                      : 'border-line text-content-muted hover:bg-surface-hover'
                  }`}
                  title={word.remembered ? 'Đánh dấu chưa thuộc' : 'Đánh dấu đã thuộc'}
                  aria-label={word.remembered ? `Đánh dấu ${word.word} là chưa thuộc` : `Đánh dấu ${word.word} là đã thuộc`}
                >
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                </button>
              </div>
              <p className="mt-3 text-sm font-bold text-content">{word.meaningVi}</p>
              {word.exampleEn && (
                <div className="mt-3 rounded-xl bg-surface-elevated p-3">
                  <p className="text-sm leading-relaxed text-content">{word.exampleEn}</p>
                  {word.exampleVi && (
                    <p className="mt-1 text-xs leading-relaxed text-content-muted">{word.exampleVi}</p>
                  )}
                </div>
              )}
              <p className="mt-3 text-xs text-content-muted">{word.topicName || 'Từ đã tra bằng AI'}</p>
            </article>
          ))}
        </section>
      )}
    </div>
  );
};
