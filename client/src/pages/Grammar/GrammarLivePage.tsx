import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  AlertCircle,
  Database,
  FileQuestion,
  Layers3,
  LibraryBig,
  ListChecks,
  ListRestart,
  Loader2,
  Plus,
  RefreshCcw,
  RotateCcw,
  Sparkles,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { BoneyardSkeleton } from '../../components/common/BoneyardSkeleton';
import { DeleteWrongQuestionsModal } from '../../components/mock-test/DeleteTestHistoryModal';
import {
  GrammarCatalog,
  GrammarMode,
  GrammarQuestion,
  GrammarQuestionFilters,
  grammarService,
} from '../../services/grammar';
import { VOCABULARY_CHANGED_EVENT, vocabularyService } from '../../services/vocabulary';
import type { WordTranslation } from '../../types';
import { createClientId } from '../../utils/id';
import { useQuestionActivityBatch } from '../../hooks/useQuestionActivityBatch';
import { GrammarQuestionDrawer } from './GrammarQuestionDrawer';

const QUESTION_BATCH_SIZE = 50;
const GRAMMAR_PROGRESS_STORAGE_PREFIX = 'toeic_grammar_progress';
const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;
const MODE_META: Record<GrammarMode, { label: string; description: string; icon: typeof LibraryBig }> = {
  topic: { label: 'Theo chuyên đề', description: 'Học đúng điểm ngữ pháp cần củng cố', icon: LibraryBig },
  bank: { label: 'Kho đề thật', description: 'Luyện câu Part 5 theo từng bộ ETS', icon: Database },
  difficulty: { label: 'Theo độ khó', description: 'Tăng dần từ nền tảng đến nâng cao', icon: Target },
};

type Selection = Omit<GrammarQuestionFilters, 'offset' | 'limit'>;

interface GrammarVocabularyEntry {
  word: string;
  partOfSpeech: string;
  meaning: string;
}

interface GrammarWrongAnswer {
  question: GrammarQuestion;
  selectedAnswer: string;
  answeredAt: string;
}

interface GrammarWrongSection {
  key: string;
  mode: GrammarMode;
  label: string;
  parentLabel?: string;
  count: number;
}

interface StoredGrammarProgress {
  answers: Record<string, string>;
  wrongAnswers: Record<string, GrammarWrongAnswer>;
}

const grammarProgressStorageKey = (userId: string) => `${GRAMMAR_PROGRESS_STORAGE_PREFIX}:${userId}`;

const getWrongSectionIdentity = (question: GrammarQuestion) => {
  if (question.source_mode === 'topic') {
    const parentLabel = question.topic_name_vi || 'Chuyên đề khác';
    const label = question.subtopic_name_vi || parentLabel;
    const sectionId = question.subtopic_id || question.topic_id || `${parentLabel}:${label}`;
    return { key: `topic:${sectionId}`, mode: question.source_mode, label, parentLabel: label === parentLabel ? undefined : parentLabel };
  }
  if (question.source_mode === 'bank') {
    const parentLabel = question.bank_set_name || 'Bộ đề khác';
    const label = question.test_name || parentLabel;
    const sectionId = question.test_id || question.bank_set_id || `${parentLabel}:${label}`;
    return { key: `bank:${sectionId}`, mode: question.source_mode, label, parentLabel: label === parentLabel ? undefined : parentLabel };
  }
  const label = question.difficulty_name_vi || (question.difficulty_level ? `Cấp độ ${question.difficulty_level}` : 'Độ khó khác');
  return { key: `difficulty:${question.difficulty_level || label}`, mode: question.source_mode, label, parentLabel: undefined };
};

const GRAMMAR_KEYWORD_REGEX = /(thì hiện tại đơn|thì hiện tại tiếp diễn|thì hiện tại hoàn thành|thì quá khứ đơn|thì quá khứ tiếp diễn|thì quá khứ hoàn thành|thì tương lai đơn|thì tương lai tiếp diễn|thì tương lai hoàn thành|thì tương lai gần|thì hiện tại|thì quá khứ|thì tương lai|chủ ngữ ngôi thứ ba số ít|chủ ngữ số ít|chủ ngữ số nhiều|chủ ngữ|động từ nguyên mẫu|động từ chia|động từ chính|động từ|hiện tại phân từ|quá khứ phân từ|tính từ|trạng từ|danh từ|giới từ|liên từ|mệnh đề quan hệ|mệnh đề thời gian|mệnh đề|cấu trúc|rút gọn|V-ing|to-V|V-ed|v-ing|v-ed|v-s|v-es|v-inf|past tense|present participle|base form|present perfect|past simple|future simple|singular|plural)/gi;

function highlightGrammarTokens(content: string) {
  const parts = content.split(/("[^"]+"|\([^)]+\))/g);
  return parts.map((part, idx) => {
    if (part.startsWith('"') && part.endsWith('"')) {
      return (
        <span key={idx} className="font-bold text-accent-strong dark:text-brand-300 bg-accent/10 dark:bg-accent/20 px-1.5 py-0.5 rounded mx-0.5 border border-accent/20">
          {part}
        </span>
      );
    }
    if (part.startsWith('(') && part.endsWith(')')) {
      return (
        <span key={idx} className="font-semibold text-content-muted italic bg-surface-elevated px-1.5 py-0.5 rounded text-xs mx-0.5 border border-line/50">
          {part}
        </span>
      );
    }

    const tokens = part.split(GRAMMAR_KEYWORD_REGEX);
    if (tokens.length <= 1) return part;

    return tokens.map((subToken, subIdx) => {
      if (GRAMMAR_KEYWORD_REGEX.test(subToken)) {
        return (
          <span key={`${idx}-${subIdx}`} className="font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 dark:bg-amber-400/20 px-1 py-0.5 rounded mx-0.5 border border-amber-500/20">
            {subToken}
          </span>
        );
      }
      return subToken;
    });
  });
}

function renderFormattedExplanation(text?: string, correctAnswer?: string) {
  if (!text || text === 'None') return null;

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  return (
    <div className="mt-3 space-y-2.5 text-xs sm:text-sm leading-relaxed text-content">
      {lines.map((line, idx) => {
        const optMatch = line.match(/^(?:\(([A-D])\)|([A-D])[\.\:\)])\s*(.*)$/);
        if (optMatch) {
          const rawLetter = (optMatch[1] || optMatch[2]).toUpperCase();
          const rest = optMatch[3];
          const isCorrect = rawLetter === correctAnswer;
          return (
            <div
              key={idx}
              className={`flex items-start gap-2.5 rounded-xl p-3 border transition-all ${isCorrect
                ? 'bg-positive/10 border-positive/40 text-positive dark:bg-positive/20'
                : 'bg-surface-elevated/70 border-line/60 text-content-muted'
                }`}
            >
              <div className="flex shrink-0 items-center gap-1.5">
                <span
                  className={`font-black px-2 py-0.5 rounded-md text-xs tabular-nums ${isCorrect
                    ? 'bg-positive text-white'
                    : 'bg-brand-500/15 text-brand-700 dark:bg-brand-400/20 dark:text-brand-300'
                    }`}
                >
                  ({rawLetter})
                </span>
                {isCorrect && (
                  <span className="hidden sm:inline-flex items-center gap-1 rounded bg-positive/20 px-1.5 py-0.5 text-[10px] font-extrabold text-positive">
                    <Check className="size-3" /> Đáp án đúng
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1 leading-relaxed">
                {highlightGrammarTokens(rest)}
              </div>
            </div>
          );
        }

        if (line.startsWith('Giải thích:')) {
          const rest = line.replace(/^Giải thích:\s*/, '');
          return (
            <div key={idx} className="mb-3 rounded-xl bg-surface-elevated/90 p-3 border border-brand-500/20 shadow-xs">
              <span className="font-extrabold block text-xs uppercase tracking-wider mb-1.5 text-accent-strong flex items-center gap-1.5">
                <Sparkles className="size-3.5" /> Giải thích chi tiết:
              </span>
              <div className="text-content leading-relaxed">{highlightGrammarTokens(rest)}</div>
            </div>
          );
        }

        return (
          <p key={idx} className="leading-relaxed text-content-muted">
            {highlightGrammarTokens(line)}
          </p>
        );
      })}
    </div>
  );
}

const readGrammarProgress = (userId: string): StoredGrammarProgress => {
  try {
    const parsed = JSON.parse(localStorage.getItem(grammarProgressStorageKey(userId)) || '{}');
    return {
      answers: parsed?.answers && typeof parsed.answers === 'object' ? parsed.answers : {},
      wrongAnswers: parsed?.wrongAnswers && typeof parsed.wrongAnswers === 'object' ? parsed.wrongAnswers : {},
    };
  } catch {
    return { answers: {}, wrongAnswers: {} };
  }
};

const writeGrammarProgress = (userId: string, progress: StoredGrammarProgress) => {
  try {
    localStorage.setItem(grammarProgressStorageKey(userId), JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
};

const vocabularyKey = (word: string) => word.trim().toLocaleLowerCase('en');

const parseGrammarVocabulary = (value?: string | null): GrammarVocabularyEntry[] => {
  if (!value || value === 'None') return [];
  return value
    .split(/\r?\n+|;+/)
    .map((line) => line.replace(/^[-•]\s*/, '').trim())
    .filter(Boolean)
    .map((line) => {
      const detailed = line.match(/^(.+?)\s*\(([^)]+)\)\s*:\s*(.+)$/);
      if (detailed) return { word: detailed[1].trim(), partOfSpeech: detailed[2].trim(), meaning: detailed[3].trim() };
      const simple = line.match(/^(.+?)\s*:\s*(.+)$/);
      if (simple) return { word: simple[1].trim(), partOfSpeech: '', meaning: simple[2].trim() };
      return { word: line, partOfSpeech: '', meaning: '' };
    });
};

interface AnswerTranslationEntry {
  letter?: string;
  word?: string;
  partOfSpeech?: string;
  meaning: string;
}

const parseAnswerTranslations = (value?: string | null): AnswerTranslationEntry[] => {
  if (!value || value === 'None') return [];
  const lines = value.split(/\r?\n+/).map((l) => l.trim()).filter(Boolean);

  return lines.map((line, index) => {
    const withLetter = line.match(/^(?:\(([A-D])\)|([A-D])[\.\:\)])\s*(.*)$/i);
    let letter = ['A', 'B', 'C', 'D'][index];
    let rest = line;
    if (withLetter) {
      letter = (withLetter[1] || withLetter[2]).toUpperCase();
      rest = withLetter[3];
    }

    const detailed = rest.match(/^(.+?)\s*\(([^)]+)\)\s*:\s*(.+)$/);
    if (detailed) {
      return { letter, word: detailed[1].trim(), partOfSpeech: detailed[2].trim(), meaning: detailed[3].trim() };
    }
    const simple = rest.match(/^(.+?)\s*:\s*(.+)$/);
    if (simple) {
      return { letter, word: simple[1].trim(), partOfSpeech: '', meaning: simple[2].trim() };
    }
    return { letter, meaning: rest };
  });
};

const getInitialSelection = (catalog: GrammarCatalog, mode: GrammarMode): Selection => {
  if (mode === 'topic') {
    const topic = catalog.topics[0];
    return { mode, topicId: topic?.id };
  }
  if (mode === 'bank') {
    const bank = catalog.banks[0];
    return { mode, bankSetId: bank?.set_id };
  }
  return { mode, difficultyLevel: catalog.difficulties[0]?.level };
};

const GrammarQuestionLoadingState: React.FC<{ name: string }> = ({ name }) => (
  <div className="space-y-4" role="status" aria-label="Đang tải câu hỏi ngữ pháp">
    <div className="surface overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3 sm:px-6">
        <BoneyardSkeleton name={`${name}-number`} height={24} width={74} className="rounded-md" />
        <BoneyardSkeleton name={`${name}-total`} variant="text" width={118} />
      </div>
      <div className="px-4 py-5 sm:px-6 sm:py-6">
        <div className="space-y-2.5">
          <BoneyardSkeleton name={`${name}-prompt-1`} variant="text" width="92%" />
          <BoneyardSkeleton name={`${name}-prompt-2`} variant="text" width="68%" />
        </div>
        <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <BoneyardSkeleton
              key={index}
              name={`${name}-choice-${index + 1}`}
              height={56}
              className="rounded-xl border border-line"
            />
          ))}
        </div>
      </div>
    </div>
    <div className="surface grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl p-3">
      <BoneyardSkeleton name={`${name}-previous`} variant="button" height={44} width={84} className="rounded-xl" />
      <BoneyardSkeleton name={`${name}-position`} variant="text" width={92} className="mx-auto" />
      <BoneyardSkeleton name={`${name}-next`} variant="button" height={44} width={84} className="rounded-xl" />
    </div>
  </div>
);

const GrammarLoadingState = () => (
  <div className="mx-auto w-full max-w-7xl space-y-5 pb-10" role="status" aria-label="Đang tải thư viện ngữ pháp">
    <div className="overflow-hidden rounded-2xl bg-brand-ink px-5 py-6 sm:px-7 sm:py-7">
      <BoneyardSkeleton name="grammar-heading-label" variant="text" width={128} className="!bg-white/10" />
      <BoneyardSkeleton name="grammar-heading-title" height={34} width="min(100%, 36rem)" className="mt-4 !bg-white/10" />
      <BoneyardSkeleton name="grammar-heading-copy" variant="text" width="min(100%, 42rem)" className="mt-3 !bg-white/10" />
    </div>
    <div className="grid gap-3 sm:grid-cols-3">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="surface flex items-center gap-3 rounded-2xl p-4">
          <BoneyardSkeleton name={`grammar-mode-icon-${index}`} height={40} width={40} className="shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <BoneyardSkeleton name={`grammar-mode-title-${index}`} variant="text" width="54%" />
            <BoneyardSkeleton name={`grammar-mode-copy-${index}`} variant="text" width="88%" />
          </div>
        </div>
      ))}
    </div>
    <div className="grid gap-5 lg:grid-cols-[21rem_minmax(0,1fr)] lg:items-start">
      <div className="surface rounded-2xl p-4">
        <BoneyardSkeleton name="grammar-catalog-title" variant="text" width="46%" />
        <div className="mt-5 space-y-2.5">
          {Array.from({ length: 7 }, (_, index) => (
            <BoneyardSkeleton key={index} name={`grammar-catalog-row-${index}`} height={52} className="rounded-xl border border-line" />
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <BoneyardSkeleton name="grammar-progress" height={76} className="rounded-2xl" />
        <GrammarQuestionLoadingState name="grammar-initial-question" />
      </div>
    </div>
  </div>
);

export const GrammarLivePage: React.FC = () => {
  const { user } = useAuth();
  const [activityAttemptId, setActivityAttemptId] = useState(() => createClientId());
  const [catalog, setCatalog] = useState<GrammarCatalog | null>(null);
  const [selection, setSelection] = useState<Selection>({ mode: 'topic' });
  const [questions, setQuestions] = useState<GrammarQuestion[]>([]);
  const [pagination, setPagination] = useState({ offset: 0, limit: QUESTION_BATCH_SIZE, total: 0, has_more: false });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [wrongAnswers, setWrongAnswers] = useState<Record<string, GrammarWrongAnswer>>({});
  const [progressOwner, setProgressOwner] = useState('');
  const [progressStorageError, setProgressStorageError] = useState('');
  const [isWrongReview, setIsWrongReview] = useState(false);
  const [wrongReviewSection, setWrongReviewSection] = useState<{ key: string; label: string } | null>(null);
  const [showDeleteWrongHistory, setShowDeleteWrongHistory] = useState(false);
  const [showQuestionDrawer, setShowQuestionDrawer] = useState(false);
  const [isQuestionListLoading, setIsQuestionListLoading] = useState(false);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [isQuestionLoading, setIsQuestionLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState('');
  const [error, setError] = useState('');
  const [savedVocabulary, setSavedVocabulary] = useState<Set<string>>(() => new Set());
  const [savingVocabulary, setSavingVocabulary] = useState('');
  const [vocabularyMessage, setVocabularyMessage] = useState('');
  const [vocabularyError, setVocabularyError] = useState('');
  const practiceRef = useRef<HTMLElement>(null);
  const questionCardRef = useRef<HTMLElement>(null);
  const questionAbortRef = useRef<AbortController | null>(null);
  const questionRequestRef = useRef(0);
  const questionListRequestRef = useRef(0);
  const grammarActivityContext = useMemo(() => user ? ({
    userId: user.id,
    attemptId: activityAttemptId,
    sourceType: 'grammar' as const,
  }) : null, [activityAttemptId, user]);
  const { enqueue: enqueueQuestionActivity } = useQuestionActivityBatch(grammarActivityContext);

  const scrollToPractice = useCallback(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    practiceRef.current?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }, []);

  const scrollToQuestionCard = useCallback(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    questionCardRef.current?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }, []);

  const loadCatalog = useCallback(async () => {
    setIsCatalogLoading(true);
    setError('');
    try {
      const nextCatalog = await grammarService.getCatalog();
      setCatalog(nextCatalog);
      setSelection(getInitialSelection(nextCatalog, 'topic'));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể tải thư viện ngữ pháp.');
    } finally {
      setIsCatalogLoading(false);
    }
  }, []);

  useEffect(() => { void loadCatalog(); }, [loadCatalog]);

  useEffect(() => {
    if (!user) {
      setAnswers({});
      setWrongAnswers({});
      setProgressOwner('');
      return;
    }
    const stored = readGrammarProgress(user.id);
    setAnswers(stored.answers);
    setWrongAnswers(stored.wrongAnswers);
    setProgressOwner(user.id);
  }, [user]);

  useEffect(() => {
    if (!user || progressOwner !== user.id) return;
    const saved = writeGrammarProgress(user.id, { answers, wrongAnswers });
    setProgressStorageError(saved ? '' : 'Không thể lưu tiến độ trên trình duyệt này. Hãy kiểm tra quyền lưu trữ của trang.');
  }, [answers, progressOwner, user, wrongAnswers]);

  useEffect(() => {
    if (!user) {
      setSavedVocabulary(new Set());
      return undefined;
    }
    const refreshSavedWords = () => {
      setSavedVocabulary(new Set(vocabularyService.getLocal(user.id).map((item) => vocabularyKey(item.word))));
    };
    refreshSavedWords();
    let active = true;
    void vocabularyService.getAll(user.id).then((words) => {
      if (active) setSavedVocabulary(new Set(words.map((item) => vocabularyKey(item.word))));
    }).catch(() => {
      // Local vocabulary remains available when the cloud endpoint is offline.
    });
    window.addEventListener(VOCABULARY_CHANGED_EVENT, refreshSavedWords);
    return () => {
      active = false;
      window.removeEventListener(VOCABULARY_CHANGED_EVENT, refreshSavedWords);
    };
  }, [user]);

  const loadQuestions = useCallback(async (nextSelection: Selection, offset = 0, append = false) => {
    const hasFilter = Boolean(
      nextSelection.topicId || nextSelection.bankSetId || nextSelection.difficultyLevel,
    );
    if (!hasFilter) return;
    if (!append) {
      questionListRequestRef.current += 1;
      setShowQuestionDrawer(false);
      setIsQuestionListLoading(false);
    }
    questionAbortRef.current?.abort();
    const controller = new AbortController();
    const requestId = questionRequestRef.current + 1;
    questionRequestRef.current = requestId;
    questionAbortRef.current = controller;
    if (append) {
      setIsLoadingMore(true);
      setLoadMoreError('');
    } else {
      setIsLoadingMore(false);
      setLoadMoreError('');
      setIsQuestionLoading(true);
      setError('');
    }
    try {
      const page = await grammarService.getQuestions({
        ...nextSelection,
        offset,
        limit: QUESTION_BATCH_SIZE,
      }, controller.signal);
      if (requestId !== questionRequestRef.current) return;
      setQuestions((current) => {
        if (!append) return page.data;
        const existingIds = new Set(current.map((question) => question.membership_id));
        return [...current, ...page.data.filter((question) => !existingIds.has(question.membership_id))];
      });
      setPagination(page.pagination);
      if (!append) setCurrentIndex(0);
    } catch (requestError) {
      if (controller.signal.aborted || requestId !== questionRequestRef.current) return;
      const message = requestError instanceof Error ? requestError.message : 'Không thể tải câu hỏi.';
      if (append) {
        setLoadMoreError(message);
      } else {
        setQuestions([]);
        setError(message);
      }
    } finally {
      if (requestId === questionRequestRef.current) {
        if (append) setIsLoadingMore(false);
        else setIsQuestionLoading(false);
        if (questionAbortRef.current === controller) questionAbortRef.current = null;
      }
    }
  }, []);

  useEffect(() => () => {
    questionRequestRef.current += 1;
    questionListRequestRef.current += 1;
    questionAbortRef.current?.abort();
  }, []);

  useLayoutEffect(() => {
    if (!catalog) return;
    void loadQuestions(selection, 0);
  }, [catalog, loadQuestions, selection]);

  useEffect(() => {
    if (
      !pagination.has_more
      || isQuestionLoading
      || isLoadingMore
      || questions.length === 0
      || currentIndex < questions.length - 5
    ) return;
    void loadQuestions(selection, questions.length, true);
  }, [currentIndex, isLoadingMore, isQuestionLoading, loadQuestions, pagination.has_more, questions.length, selection]);

  const currentQuestion = questions[currentIndex];
  const vocabularyEntries = useMemo(
    () => parseGrammarVocabulary(currentQuestion?.vocabulary),
    [currentQuestion?.vocabulary],
  );
  const answerTranslationEntries = useMemo(
    () => parseAnswerTranslations(currentQuestion?.answer_translation_vi),
    [currentQuestion?.answer_translation_vi],
  );
  const selectedAnswer = currentQuestion ? answers[currentQuestion.membership_id] : undefined;

  useEffect(() => {
    setVocabularyMessage('');
    setVocabularyError('');
  }, [currentQuestion?.membership_id]);

  const detailPanelCount = currentQuestion ? [
    currentQuestion.translation_vi,
    currentQuestion.answer_translation_vi,
    currentQuestion.vocabulary,
  ].filter(Boolean).length : 0;
  const answeredCount = questions.filter((question) => Boolean(answers[question.membership_id])).length;
  const correctCount = questions.filter(
    (question) => answers[question.membership_id] === question.correct_answer,
  ).length;
  const wrongAnswerCount = Object.keys(wrongAnswers).length;
  const wrongAnswerSectionsByMode = useMemo<Record<GrammarMode, GrammarWrongSection[]>>(() => {
    const grouped: Record<GrammarMode, Map<string, GrammarWrongSection>> = {
      topic: new Map(), bank: new Map(), difficulty: new Map(),
    };
    Object.values(wrongAnswers).forEach(({ question }) => {
      const identity = getWrongSectionIdentity(question);
      const existing = grouped[identity.mode].get(identity.key);
      grouped[identity.mode].set(identity.key, {
        ...identity,
        count: (existing?.count || 0) + 1,
      });
    });
    return {
      topic: Array.from(grouped.topic.values()).sort((a, b) => a.label.localeCompare(b.label, 'vi')),
      bank: Array.from(grouped.bank.values()).sort((a, b) => a.label.localeCompare(b.label, 'vi')),
      difficulty: Array.from(grouped.difficulty.values()).sort((a, b) => a.label.localeCompare(b.label, 'vi')),
    };
  }, [wrongAnswers]);
  const practiceHistoryCount = Object.keys(answers).length;
  const hasPracticeHistory = practiceHistoryCount > 0 || wrongAnswerCount > 0;

  const activeTopic = useMemo(
    () => catalog?.topics.find((item) => item.id === selection.topicId),
    [catalog, selection.topicId],
  );
  const activeBank = useMemo(
    () => catalog?.banks.find((item) => item.set_id === selection.bankSetId),
    [catalog, selection.bankSetId],
  );
  const contextLabel = useMemo(() => {
    if (isWrongReview && wrongReviewSection) return `Câu sai: ${wrongReviewSection.label}`;
    if (!catalog) return '';
    if (selection.mode === 'topic') {
      return activeTopic?.subtopics.find((item) => item.id === selection.subtopicId)?.title_vi
        || activeTopic?.title_vi || '';
    }
    if (selection.mode === 'bank') {
      return activeBank?.tests.find((item) => item.test_id === selection.testId)?.test_name
        || activeBank?.set_name || '';
    }
    return catalog.difficulties.find((item) => item.level === selection.difficultyLevel)?.name_vi || '';
  }, [activeBank, activeTopic, catalog, isWrongReview, selection, wrongReviewSection]);

  const changeMode = (mode: GrammarMode) => {
    if (!catalog || (mode === selection.mode && !isWrongReview)) return;
    setIsWrongReview(false);
    setWrongReviewSection(null);
    setSelection(getInitialSelection(catalog, mode));
  };

  const chooseTopic = (topicId: string) => {
    setIsWrongReview(false);
    setWrongReviewSection(null);
    setSelection({ mode: 'topic', topicId });
  };

  const chooseBank = (bankSetId: string) => {
    setIsWrongReview(false);
    setWrongReviewSection(null);
    setSelection({ mode: 'bank', bankSetId });
  };

  const moveToQuestion = (index: number) => {
    setCurrentIndex(Math.max(0, Math.min(questions.length - 1, index)));
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(scrollToQuestionCard);
    });
  };

  const openQuestionDrawer = async () => {
    setShowQuestionDrawer(true);
    if (isWrongReview || !pagination.has_more || isQuestionListLoading) return;

    const requestId = questionListRequestRef.current + 1;
    questionListRequestRef.current = requestId;
    setIsQuestionListLoading(true);
    let mergedQuestions = [...questions];
    let offset = questions.length;
    try {
      while (offset < pagination.total) {
        const page = await grammarService.getQuestions({
          ...selection,
          offset,
          limit: QUESTION_BATCH_SIZE,
        });
        if (requestId !== questionListRequestRef.current) return;
        const existingIds = new Set(mergedQuestions.map((question) => question.membership_id));
        const nextQuestions = page.data.filter((question) => !existingIds.has(question.membership_id));
        mergedQuestions = [...mergedQuestions, ...nextQuestions];
        offset += page.data.length;
        if (page.data.length === 0 || !page.pagination.has_more) break;
      }
      if (requestId !== questionListRequestRef.current) return;
      setQuestions(mergedQuestions);
      setPagination({
        offset: 0,
        limit: mergedQuestions.length,
        total: pagination.total,
        has_more: mergedQuestions.length < pagination.total,
      });
    } catch {
      // Keep the already loaded questions available in the drawer.
    } finally {
      if (requestId === questionListRequestRef.current) setIsQuestionListLoading(false);
    }
  };

  const resetCurrentPractice = () => {
    setActivityAttemptId(createClientId());
    const visibleQuestionIds = new Set(questions.map((question) => question.membership_id));
    setAnswers((current) => Object.fromEntries(
      Object.entries(current).filter(([membershipId]) => !visibleQuestionIds.has(membershipId)),
    ));
  };

  const answerQuestion = (question: GrammarQuestion, answer: string) => {
    enqueueQuestionActivity(question.membership_id, answer);
    setAnswers((current) => ({ ...current, [question.membership_id]: answer }));
    setWrongAnswers((current) => {
      if (answer === question.correct_answer) {
        const next = { ...current };
        delete next[question.question_id];
        return next;
      }
      return {
        ...current,
        [question.question_id]: {
          question,
          selectedAnswer: answer,
          answeredAt: new Date().toISOString(),
        },
      };
    });
  };

  const startWrongReview = (section: GrammarWrongSection) => {
    const reviewQuestions = Object.values(wrongAnswers)
      .filter((item) => getWrongSectionIdentity(item.question).key === section.key)
      .sort((a, b) => b.answeredAt.localeCompare(a.answeredAt))
      .map((item) => item.question);
    if (reviewQuestions.length === 0) return;
    setActivityAttemptId(createClientId());
    const reviewMembershipIds = new Set(reviewQuestions.map((question) => question.membership_id));
    setAnswers((current) => Object.fromEntries(
      Object.entries(current).filter(([membershipId]) => !reviewMembershipIds.has(membershipId)),
    ));
    setQuestions(reviewQuestions);
    setPagination({ offset: 0, limit: reviewQuestions.length, total: reviewQuestions.length, has_more: false });
    setCurrentIndex(0);
    setError('');
    setLoadMoreError('');
    setIsQuestionLoading(false);
    setIsLoadingMore(false);
    setIsWrongReview(true);
    setWrongReviewSection({ key: section.key, label: section.label });
    window.requestAnimationFrame(scrollToPractice);
  };

  const clearPracticeHistory = () => {
    setAnswers({});
    setWrongAnswers({});
    setShowDeleteWrongHistory(false);
    if (isWrongReview) {
      setIsWrongReview(false);
      setWrongReviewSection(null);
      void loadQuestions(selection, 0);
    }
  };

  const saveVocabularyEntry = async (entry: GrammarVocabularyEntry) => {
    if (!user || savingVocabulary) return;
    const key = vocabularyKey(entry.word);
    setSavingVocabulary(key);
    setVocabularyMessage('');
    setVocabularyError('');
    const translation: WordTranslation = {
      sourceText: entry.word,
      translatedText: entry.meaning,
      phonetic: '',
      partOfSpeech: entry.partOfSpeech,
      definitionEn: '',
      examples: currentQuestion ? [{ en: currentQuestion.question_text, vi: currentQuestion.translation_vi || '' }] : [],
      synonyms: [],
      cached: true,
      aiSource: 'local',
    };
    try {
      const result = await vocabularyService.add(user.id, translation);
      setSavedVocabulary((current) => new Set(current).add(key));
      setVocabularyMessage(
        result.isDuplicate
          ? `“${entry.word}” đã có trong sổ từ vựng.`
          : result.cloudSynced
            ? `Đã thêm “${entry.word}” vào sổ từ vựng.`
            : `Đã lưu “${entry.word}” trên thiết bị; hệ thống sẽ đồng bộ lại khi kết nối ổn định.`,
      );
    } catch (saveError) {
      setVocabularyError(saveError instanceof Error ? saveError.message : 'Không thể lưu từ vựng. Vui lòng thử lại.');
    } finally {
      setSavingVocabulary('');
    }
  };

  if (isCatalogLoading) return <GrammarLoadingState />;

  if (!catalog) {
    return (
      <div className="mx-auto grid min-h-[55vh] w-full max-w-3xl place-items-center pb-10">
        <section className="surface w-full rounded-2xl px-6 py-12 text-center">
          <AlertCircle className="mx-auto size-9 text-negative" />
          <h1 className="mt-4 text-xl font-extrabold text-content">Chưa thể mở thư viện ngữ pháp</h1>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-content-muted">{error}</p>
          <button type="button" onClick={() => void loadCatalog()} className="btn-primary mt-6 text-sm">
            <RefreshCcw className="size-4" /> Thử tải lại
          </button>
        </section>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto w-full max-w-7xl space-y-5 pb-10 text-content">
        <header className="relative overflow-hidden rounded-2xl bg-brand-ink px-5 py-6 text-white shadow-[0_18px_45px_rgba(15,23,42,0.16)] sm:px-7 sm:py-7">
          <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-bold text-brand-200">
                <LibraryBig className="size-3.5" /> Ngữ pháp TOEIC
              </div>
              <h1 className="max-w-xl text-2xl font-black tracking-[-0.035em] sm:text-3xl">Hiểu cấu trúc, chọn đáp án chắc hơn</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
                Luyện {Object.values(catalog.mode_counts).reduce((total, count) => total + count, 0).toLocaleString('vi-VN')} lượt câu hỏi theo chuyên đề, kho đề thật hoặc độ khó. Mỗi câu đều có giải thích tiếng Việt.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:w-64">
              <div className="rounded-xl bg-white/10 px-3.5 py-3 ring-1 ring-white/10 backdrop-blur-sm">
                <span className="block text-2xl font-black tabular-nums">{catalog.question_count.toLocaleString('vi-VN')}</span>
                <span className="text-[11px] font-semibold text-slate-300">câu độc lập</span>
              </div>
              <div className="rounded-xl bg-brand-300 px-3.5 py-3 text-brand-950">
                <span className="block text-2xl font-black tabular-nums">{catalog.topics.length}</span>
                <span className="text-[11px] font-bold">chuyên đề</span>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-3" aria-label="Chọn cách luyện ngữ pháp">
          {(Object.keys(MODE_META) as GrammarMode[]).map((mode) => {
            const meta = MODE_META[mode];
            const Icon = meta.icon;
            const active = selection.mode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => changeMode(mode)}
                aria-pressed={active}
                className={`group flex items-center gap-3 rounded-2xl px-4 py-4 text-left ring-1 transition-all duration-200 active:scale-[0.99] ${active
                  ? 'bg-accent text-brand-950 ring-accent shadow-[0_10px_24px_rgba(180,125,20,0.16)]'
                  : 'bg-surface text-content ring-line hover:-translate-y-0.5 hover:bg-surface-hover'
                  }`}
              >
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${active ? 'bg-brand-950/10' : 'bg-surface-elevated text-accent-strong'}`}>
                  <Icon className="size-4.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-extrabold">{meta.label}</span>
                  <span className={`mt-0.5 block truncate text-[11px] font-medium ${active ? 'text-brand-950/70' : 'text-content-muted'}`}>
                    {catalog.mode_counts[mode]?.toLocaleString('vi-VN') || 0} câu · {meta.description}
                  </span>
                </span>
              </button>
            );
          })}
        </section>

        <div className="grid min-w-0 gap-5 lg:grid-cols-[21rem_minmax(0,1fr)] lg:items-start">
          <aside className="surface min-w-0 overflow-hidden rounded-2xl lg:sticky lg:top-5" aria-label="Danh mục ngữ pháp">
            <div className="border-b border-line px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-extrabold">{MODE_META[selection.mode].label}</h2>
                  <p className="mt-0.5 text-[11px] text-content-muted">Chọn nội dung để bắt đầu</p>
                </div>
                <Layers3 className="size-4 text-content-muted" />
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2.5 lg:max-h-[calc(100dvh-20rem)]">
              {selection.mode === 'topic' && catalog.topics.map((topic) => {
                const active = topic.id === selection.topicId;
                return (
                  <div key={topic.id} className="mb-1.5">
                    <button
                      type="button"
                      onClick={() => chooseTopic(topic.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${active ? 'bg-surface-elevated' : 'hover:bg-surface-hover'}`}
                    >
                      <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${active ? 'bg-accent text-brand-950' : 'bg-surface-elevated text-content-muted'}`}>
                        <BookOpenCheck className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-extrabold">{topic.title_vi}</span>
                        <span className="mt-0.5 block text-[10px] font-semibold text-content-muted">{topic.question_count} câu</span>
                      </span>
                      <ChevronDown className={`size-3.5 text-content-muted transition-transform ${active ? 'rotate-180' : ''}`} />
                    </button>
                    {active && (
                      <div className="ml-7 mt-1 border-l border-line pl-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsWrongReview(false);
                            setWrongReviewSection(null);
                            setSelection({ mode: 'topic', topicId: topic.id });
                          }}
                          className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] transition-colors ${!selection.subtopicId ? 'bg-accent/15 font-extrabold text-accent-strong' : 'font-semibold text-content-muted hover:bg-surface-hover hover:text-content'
                            }`}
                        >
                          <span>Tất cả câu trong chuyên đề</span>
                          <span className="shrink-0 tabular-nums">{topic.question_count}</span>
                        </button>
                        {topic.subtopics.map((subtopic) => (
                          <button
                            key={subtopic.id}
                            type="button"
                            onClick={() => {
                              setIsWrongReview(false);
                              setWrongReviewSection(null);
                              setSelection({ mode: 'topic', topicId: topic.id, subtopicId: subtopic.id });
                            }}
                            className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] transition-colors ${selection.subtopicId === subtopic.id ? 'bg-accent/15 font-extrabold text-accent-strong' : 'font-semibold text-content-muted hover:bg-surface-hover hover:text-content'
                              }`}
                          >
                            <span className="line-clamp-2">{subtopic.title_vi}</span>
                            <span className="shrink-0 tabular-nums">{subtopic.question_count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {selection.mode === 'bank' && catalog.banks.map((bank) => {
                const active = bank.set_id === selection.bankSetId;
                return (
                  <div key={bank.set_id} className="mb-1.5">
                    <button type="button" onClick={() => chooseBank(bank.set_id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${active ? 'bg-surface-elevated' : 'hover:bg-surface-hover'}`}>
                      <span className={`grid size-8 shrink-0 place-items-center rounded-lg text-xs font-black ${active ? 'bg-accent text-brand-950' : 'bg-surface-elevated text-content-muted'}`}>
                        {bank.year ? String(bank.year).slice(-2) : <Database className="size-3.5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-extrabold">{bank.set_name}</span>
                        <span className="mt-0.5 block text-[10px] font-semibold text-content-muted">{bank.test_count} đề · {bank.question_count} câu</span>
                      </span>
                      <ChevronDown className={`size-3.5 text-content-muted transition-transform ${active ? 'rotate-180' : ''}`} />
                    </button>
                    {active && (
                      <div className="ml-7 mt-1 grid grid-cols-2 gap-1 border-l border-line pl-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsWrongReview(false);
                            setWrongReviewSection(null);
                            setSelection({ mode: 'bank', bankSetId: bank.set_id });
                          }}
                          className={`col-span-2 rounded-lg px-2.5 py-2 text-left text-[11px] transition-colors ${!selection.testId ? 'bg-accent/15 font-extrabold text-accent-strong' : 'font-semibold text-content-muted hover:bg-surface-hover hover:text-content'
                            }`}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span>Tất cả câu trong bộ đề</span>
                            <span className="tabular-nums">{bank.question_count}</span>
                          </span>
                        </button>
                        {bank.tests.map((test) => (
                          <button
                            key={test.test_id}
                            type="button"
                            onClick={() => {
                              setIsWrongReview(false);
                              setWrongReviewSection(null);
                              setSelection({ mode: 'bank', bankSetId: bank.set_id, testId: test.test_id });
                            }}
                            className={`rounded-lg px-2.5 py-2 text-left text-[11px] transition-colors ${selection.testId === test.test_id ? 'bg-accent/15 font-extrabold text-accent-strong' : 'font-semibold text-content-muted hover:bg-surface-hover hover:text-content'}`}
                          >
                            <span className="block truncate">{test.test_name}</span>
                            <span className="mt-0.5 block text-[9px] opacity-75">{test.question_count} câu</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {selection.mode === 'difficulty' && (
                <div className="space-y-1.5">
                  {catalog.difficulties.map((difficulty) => {
                    const active = difficulty.level === selection.difficultyLevel;
                    return (
                      <button
                        key={difficulty.level}
                        type="button"
                        onClick={() => {
                          setIsWrongReview(false);
                          setWrongReviewSection(null);
                          setSelection({ mode: 'difficulty', difficultyLevel: difficulty.level });
                        }}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all ${active ? 'bg-surface-elevated ring-1 ring-accent/40' : 'hover:bg-surface-hover'}`}
                      >
                        <span className={`grid size-9 shrink-0 place-items-center rounded-xl text-sm font-black ${active ? 'bg-accent text-brand-950' : 'bg-surface-elevated text-content-muted'}`}>{difficulty.level}</span>
                        <span className="flex-1">
                          <span className="block text-xs font-extrabold">{difficulty.name_vi}</span>
                          <span className="mt-0.5 block text-[10px] font-semibold text-content-muted">{difficulty.question_count.toLocaleString('vi-VN')} câu</span>
                        </span>
                        {active && <Check className="size-4 text-positive" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          <section ref={practiceRef} className="min-w-0 scroll-mt-5 space-y-4" id="grammar-practice" aria-label="Bài luyện ngữ pháp">
            {progressStorageError && <p className="text-[11px] font-semibold text-negative" role="alert">{progressStorageError}</p>}

            {isQuestionLoading ? (
              <GrammarQuestionLoadingState name="grammar-active-question" />
            ) : error ? (
              <section className="surface rounded-2xl px-6 py-12 text-center">
                <AlertCircle className="mx-auto size-8 text-negative" />
                <h2 className="mt-3 text-base font-extrabold">Không thể tải câu hỏi</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-content-muted">{error}</p>
                <button type="button" onClick={() => void loadQuestions(selection, 0)} className="btn-primary mt-5 text-xs"><RefreshCcw className="size-3.5" /> Thử lại</button>
              </section>
            ) : currentQuestion ? (
              <>
                <article ref={questionCardRef} className="surface scroll-mt-24 overflow-hidden rounded-2xl">
                  {/* Embedded Practice Status & Controls Header */}
                  <header className="border-b border-line bg-surface-elevated/40 px-4 py-3.5 sm:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="shrink-0 rounded-md bg-brand-ink px-2 py-0.5 text-[10px] font-black text-white uppercase tracking-wider">
                            Đang luyện
                          </span>
                          <h2 className="truncate text-xs font-extrabold text-content sm:text-sm">{contextLabel}</h2>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => void openQuestionDrawer()}
                          disabled={questions.length === 0 || isQuestionLoading}
                          className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-[11px] font-extrabold text-content shadow-xs transition-colors hover:border-brand-400 hover:bg-surface-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {isQuestionListLoading ? (
                            <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
                          ) : (
                            <ListChecks className="size-3.5 text-accent-strong" />
                          )}
                          <span>Danh sách câu</span>
                        </button>

                        <div className="flex items-center gap-2 rounded-lg bg-surface px-2.5 py-1 border border-line/60 text-[11px]">
                          <span className="font-extrabold text-content">
                            Câu {currentIndex + 1}/{pagination.total}
                          </span>
                          <span className="text-line">|</span>
                          <span className="font-bold text-positive flex items-center gap-1">
                            <CheckCircle2 className="size-3" /> {correctCount} đúng
                          </span>
                          {answeredCount > 0 && (
                            <span className="font-black tabular-nums text-content">
                              ({Math.round((correctCount / answeredCount) * 100)}%)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-elevated">
                      <div
                        className="h-full rounded-full bg-accent transition-[width] duration-300"
                        style={{ width: `${pagination.total ? (answeredCount / pagination.total) * 100 : 0}%` }}
                      />
                    </div>
                  </header>

                  <div className="px-4 py-5 sm:px-6 sm:py-6">
                    {(currentQuestion.question_number || currentQuestion.difficulty_name_vi) && (
                      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold text-content-muted">
                        {currentQuestion.question_number && <span>Gốc #{currentQuestion.question_number}</span>}
                        {currentQuestion.difficulty_name_vi && <span>· {currentQuestion.difficulty_name_vi}</span>}
                      </div>
                    )}

                    <p className="text-base font-bold leading-7 tracking-[-0.01em] text-content sm:text-lg">{currentQuestion.question_text}</p>
                    <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                      {OPTION_KEYS.map((key) => {
                        const option = currentQuestion[`option_${key.toLowerCase()}` as keyof GrammarQuestion] as string | undefined;
                        if (!option) return null;
                        const answered = Boolean(selectedAnswer);
                        const isCorrect = key === currentQuestion.correct_answer;
                        const isSelected = key === selectedAnswer;
                        const stateClass = answered && isCorrect
                          ? 'border-positive bg-positive/10 text-positive'
                          : answered && isSelected
                            ? 'border-negative bg-negative/10 text-negative'
                            : 'border-line bg-surface hover:border-accent/70 hover:bg-accent/5';
                        return (
                          <button
                            key={key}
                            type="button"
                            disabled={answered}
                            onClick={() => answerQuestion(currentQuestion, key)}
                            className={`flex min-h-14 items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm font-semibold transition-all duration-200 enabled:active:scale-[0.99] disabled:cursor-default ${stateClass}`}
                          >
                            <span className={`grid size-7 shrink-0 place-items-center rounded-lg text-xs font-black ${answered && isCorrect ? 'bg-positive text-white' : answered && isSelected ? 'bg-negative text-white' : 'bg-surface-elevated text-content-muted'}`}>
                              {answered && isCorrect ? <Check className="size-3.5" /> : answered && isSelected ? <X className="size-3.5" /> : key}
                            </span>
                            <span>{option}</span>
                          </button>
                        );
                      })}
                    </div>

                    {selectedAnswer && (
                      <div className={`mt-5 rounded-xl border p-4 ${selectedAnswer === currentQuestion.correct_answer ? 'border-positive/30 bg-positive/5' : 'border-negative/30 bg-negative/5'}`} role="status" aria-live="polite">
                        <div className="flex items-start gap-3">
                          <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg text-white ${selectedAnswer === currentQuestion.correct_answer ? 'bg-positive' : 'bg-negative'}`}>
                            {selectedAnswer === currentQuestion.correct_answer ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                          </span>
                          <div className="min-w-0">
                            <h3 className="text-sm font-extrabold">{selectedAnswer === currentQuestion.correct_answer ? 'Chính xác' : `Đáp án đúng là ${currentQuestion.correct_answer}`}</h3>
                            {renderFormattedExplanation(currentQuestion.explanation_vi, currentQuestion.correct_answer)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedAnswer && (currentQuestion.translation_vi || currentQuestion.answer_translation_vi || currentQuestion.vocabulary) && (
                    <div className={`grid gap-px border-t border-line bg-line ${detailPanelCount === 3 ? 'sm:grid-cols-3' : detailPanelCount === 2 ? 'sm:grid-cols-2' : 'grid-cols-1'
                      }`}>
                      {currentQuestion.translation_vi && (
                        <section className="bg-surface px-4 py-4 sm:px-5">
                          <h3 className="flex items-center gap-2 text-[11px] font-extrabold text-content"><Sparkles className="size-3.5 text-accent-strong" /> Bản dịch câu</h3>
                          <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-content-muted">{currentQuestion.translation_vi}</p>
                        </section>
                      )}
                      {currentQuestion.answer_translation_vi && (
                        <section className="bg-surface px-4 py-4 sm:px-5">
                          <h3 className="flex items-center gap-2 text-[11px] font-extrabold text-content"><FileQuestion className="size-3.5 text-accent-strong" /> Nghĩa đáp án</h3>
                          <div className="mt-2.5 space-y-2">
                            {answerTranslationEntries.map((entry, idx) => {
                              const isCorrectOption = entry.letter === currentQuestion.correct_answer;
                              return (
                                <div
                                  key={idx}
                                  className={`flex items-start gap-2.5 rounded-xl p-2.5 text-xs transition-colors ${isCorrectOption
                                    ? 'bg-positive/10 border border-positive/30 text-positive'
                                    : 'bg-surface-elevated/70 border border-line/60'
                                    }`}
                                >
                                  {entry.letter && (
                                    <span
                                      className={`shrink-0 font-black px-1.5 py-0.5 rounded text-[10px] tabular-nums ${isCorrectOption
                                        ? 'bg-positive text-white'
                                        : 'bg-surface text-content-muted border border-line/60'
                                        }`}
                                    >
                                      ({entry.letter})
                                    </span>
                                  )}
                                  <div className="min-w-0 flex-1 leading-relaxed">
                                    {entry.word && <strong className="font-extrabold text-content mr-1">{entry.word}</strong>}
                                    {entry.partOfSpeech && <span className="text-[10px] font-semibold text-content-muted italic mr-1">({entry.partOfSpeech})</span>}
                                    {entry.meaning && <span className="text-content-muted">{entry.meaning}</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </section>
                      )}
                      {currentQuestion.vocabulary && (
                        <section className="bg-surface px-4 py-4 sm:px-5">
                          <h3 className="flex items-center gap-2 text-[11px] font-extrabold text-content"><BookOpenCheck className="size-3.5 text-accent-strong" /> Từ vựng cần nhớ</h3>
                          <div className="mt-2 flex flex-col items-start gap-2">
                            {vocabularyEntries.map((entry) => {
                              const key = vocabularyKey(entry.word);
                              const saved = savedVocabulary.has(key);
                              const saving = savingVocabulary === key;
                              return (
                                <div key={`${key}-${entry.meaning}`} className="inline-flex max-w-full items-start gap-2 rounded-lg bg-surface-elevated py-2.5 pl-3 pr-2">
                                  <div className="min-w-0 text-xs leading-relaxed">
                                    <p className="font-extrabold text-content">
                                      {entry.word}{entry.partOfSpeech && <span className="ml-1 font-semibold text-content-muted">({entry.partOfSpeech})</span>}
                                    </p>
                                    {entry.meaning && <p className="mt-0.5 text-content-muted">{entry.meaning}</p>}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => void saveVocabularyEntry(entry)}
                                    disabled={saved || Boolean(savingVocabulary) || !user}
                                    aria-label={saved ? `${entry.word} đã có trong sổ từ vựng` : `Thêm ${entry.word} vào sổ từ vựng`}
                                    title={saved ? 'Đã lưu' : 'Thêm vào sổ từ vựng'}
                                    className={`grid size-8 shrink-0 place-items-center rounded-lg transition-colors ${saved ? 'bg-positive/10 text-positive' : 'bg-accent/15 text-accent-strong hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-50'}`}
                                  >
                                    {saving ? <Loader2 className="size-3.5 animate-spin" /> : saved ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                          {vocabularyMessage && <p className="mt-2 text-[11px] font-semibold leading-relaxed text-positive" role="status">{vocabularyMessage}</p>}
                          {vocabularyError && <p className="mt-2 text-[11px] font-semibold leading-relaxed text-negative" role="alert">{vocabularyError}</p>}
                        </section>
                      )}
                    </div>
                  )}
                </article>

                <nav className="surface rounded-2xl p-3" aria-label="Điều hướng câu hỏi ngữ pháp">
                  <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                    <button type="button" disabled={currentIndex === 0} onClick={() => moveToQuestion(currentIndex - 1)} className="btn-secondary px-3.5 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40 sm:px-5"><ArrowLeft className="size-3.5" /> <span>Trước</span></button>
                    <div className="min-w-0 text-center" aria-live="polite">
                      <p className="text-sm font-extrabold tabular-nums text-content">Câu {currentIndex + 1} / {pagination.total}</p>
                      {isLoadingMore && <p className="mt-0.5 text-[10px] font-semibold text-content-muted">Đang nạp các câu tiếp theo…</p>}
                      {loadMoreError && (
                        <button type="button" onClick={() => void loadQuestions(selection, questions.length, true)} className="mt-0.5 text-[10px] font-bold text-negative hover:underline">
                          Không thể nạp thêm · Thử lại
                        </button>
                      )}
                    </div>
                    <button type="button" disabled={currentIndex >= questions.length - 1} onClick={() => moveToQuestion(currentIndex + 1)} className="btn-primary px-3.5 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40 sm:px-5"><span>Sau</span> <ArrowRight className="size-3.5" /></button>
                  </div>
                </nav>

                {wrongAnswerCount > 0 && (
                  <details className="group surface overflow-hidden rounded-2xl border border-line transition-all">
                    <summary className="flex cursor-pointer items-center justify-between px-4 py-3 sm:px-5 select-none text-xs font-extrabold text-content hover:bg-surface-hover">
                      <div className="flex items-center gap-2">
                        <ListRestart className="size-4 text-negative" />
                        <span>Làm lại câu sai theo phần</span>
                        <span className="rounded-full bg-negative/10 px-2 py-0.5 text-[10px] font-black text-negative">
                          {wrongAnswerCount}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteWrongHistory(true);
                          }}
                          disabled={!hasPracticeHistory}
                          className="inline-flex min-h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-bold text-content-muted transition-colors hover:bg-surface-hover hover:text-negative active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 className="size-3" /> Xoá lịch sử
                        </button>
                        <ChevronDown className="size-4 transition-transform group-open:rotate-180 text-content-muted" />
                      </div>
                    </summary>

                    <div className="border-t border-line p-4 sm:p-5 bg-surface-elevated/30">
                      <div className="grid gap-2 sm:grid-cols-3" aria-label="Chọn phần có câu sai cần làm lại">
                        {(Object.keys(MODE_META) as GrammarMode[]).map((mode) => {
                          const meta = MODE_META[mode];
                          const Icon = meta.icon;
                          const sections = wrongAnswerSectionsByMode[mode];
                          const modeCount = sections.reduce((total, section) => total + section.count, 0);
                          return (
                            <section key={mode} className="overflow-hidden rounded-xl border border-line bg-canvas">
                              <header className="flex min-h-11 items-center gap-2.5 border-b border-line px-3">
                                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-surface-elevated text-content-muted">
                                  <Icon className="size-3.5" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[11px] font-extrabold text-content">{meta.label}</span>
                                  <span className="mt-0.5 block text-[10px] font-semibold text-content-muted">{modeCount.toLocaleString('vi-VN')} câu sai</span>
                                </span>
                              </header>
                              <div className="max-h-52 space-y-1 overflow-y-auto p-1.5">
                                {sections.length === 0 ? (
                                  <p className="px-2 py-4 text-center text-[10px] font-semibold text-content-muted">Chưa có câu sai</p>
                                ) : sections.map((section) => {
                                  const active = isWrongReview && wrongReviewSection?.key === section.key;
                                  return (
                                    <button
                                      key={section.key}
                                      type="button"
                                      onClick={() => startWrongReview(section)}
                                      aria-pressed={active}
                                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-colors active:scale-[0.99] ${active
                                        ? 'bg-negative/10 text-negative ring-1 ring-negative/30'
                                        : 'text-content hover:bg-surface-hover'
                                        }`}
                                    >
                                      <span className="min-w-0">
                                        <span className="block line-clamp-2 text-[10px] font-extrabold leading-4">{section.label}</span>
                                        {section.parentLabel && <span className="mt-0.5 block truncate text-[9px] font-semibold text-content-muted">{section.parentLabel}</span>}
                                      </span>
                                      <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-black tabular-nums ${active ? 'bg-negative text-white' : 'bg-surface-elevated text-content-muted'}`}>
                                        {section.count}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </section>
                          );
                        })}
                      </div>
                    </div>
                  </details>
                )}

                {answeredCount > 0 && (
                  <button type="button" onClick={resetCurrentPractice} className="mx-auto flex items-center gap-2 text-xs font-bold text-content-muted transition-colors hover:text-content"><RotateCcw className="size-3.5" /> {isWrongReview ? 'Làm lại danh sách này' : 'Làm lại chuyên mục này'}</button>
                )}
              </>
            ) : (
              <section className="surface rounded-2xl px-6 py-12 text-center">
                <FileQuestion className="mx-auto size-8 text-content-muted" />
                <h2 className="mt-3 text-base font-extrabold">Mục này chưa có câu hỏi</h2>
              </section>
            )}
          </section>
        </div>
      </div>
      <GrammarQuestionDrawer
        isOpen={showQuestionDrawer}
        onClose={() => setShowQuestionDrawer(false)}
        questions={questions}
        total={pagination.total}
        currentIndex={currentIndex}
        answers={answers}
        loadingMore={isQuestionListLoading}
        onSelectQuestion={moveToQuestion}
      />
      <AnimatePresence>
        {showDeleteWrongHistory && (
          <DeleteWrongQuestionsModal
            scopeLabel="Ngữ pháp TOEIC"
            wrongCount={practiceHistoryCount}
            deleting={false}
            error=""
            title="Xoá lịch sử làm bài?"
            description={<>Toàn bộ <strong className="text-content">{practiceHistoryCount} câu đã trả lời</strong> trong trang <strong className="text-content">Ngữ pháp TOEIC</strong>, bao gồm câu đúng và câu sai, sẽ bị xoá khỏi trình duyệt. Thao tác này không thể hoàn tác.</>}
            confirmLabel="Xoá toàn bộ lịch sử"
            closeLabel="Đóng xác nhận xoá lịch sử làm bài"
            onConfirm={clearPracticeHistory}
            onClose={() => setShowDeleteWrongHistory(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default GrammarLivePage;
