import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen, Check, Cpu, FolderOpen, Loader2, Plus, StickyNote, Volume2, X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BoneyardSkeleton } from './BoneyardSkeleton';
import { dictionaryService } from '../../services/dictionary';
import { playPronunciation } from '../../utils/audioPronunciation';
import {
  VocabularyTopicSelection,
  vocabularyService,
} from '../../services/vocabulary';
import {
  AiSource, DictionaryCollocation, DictionaryDetailResult, DictionaryDetailSection,
  DictionaryExample, DictionaryWordFamily, WordTranslation,
} from '../../types';

interface Position {
  left: number;
  top: number;
}

type TabId = 'meaning' | DictionaryDetailSection;

/**
 * Trích xuất text từ vùng chọn có chèn khoảng trắng ở ranh giới các thẻ DOM.
 * Khắc phục triệt để lỗi dính liền chữ (vd: <span>westchester</span> <b>reviews</b> -> "westchester reviews").
 */
const extractTextFromSelection = (selection: Selection): string => {
  if (!selection || selection.rangeCount === 0) return '';
  const range = selection.getRangeAt(0);
  const fragment = range.cloneContents();
  const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_TEXT);
  let extracted = '';
  let node = walker.nextNode();
  while (node) {
    const val = node.nodeValue || '';
    if (val) {
      if (extracted && !/\s$/.test(extracted) && !/^\s/.test(val)) {
        extracted += ' ';
      }
      extracted += val;
    }
    node = walker.nextNode();
  }
  return extracted.replace(/\s+/g, ' ').trim();
};

/**
 * Kiểm tra tính hợp lệ của vùng chọn trước khi gọi mạng:
 * - Chỉ cho phép 1-4 từ.
 * - Mỗi từ >= 2 ký tự (chặn nhãn trắc nghiệm a, b, c, d).
 * - Chỉ chứa chữ cái và dấu nháy/gạch nối hợp lệ.
 * - Giới hạn độ dài <= 40 ký tự (tránh kéo lố cả câu).
 */
export const isValidSelection = (text: string): boolean => {
  const trimmed = text.trim();
  const pattern = /^[A-Za-z]{2,}(?:['’-][A-Za-z]+)*(\s[A-Za-z]{2,}(?:['’-][A-Za-z]+)*){0,3}$/;
  if (!pattern.test(trimmed)) return false;
  if (trimmed.length > 40) return false;
  return true;
};

const CARD_WIDTH = 450;
const CARD_HEIGHT = 560;
const DEFAULT_VOCABULARY_TOPIC: VocabularyTopicSelection = {
  id: 'ai',
  name: 'Từ đã tra bằng AI',
};
const DEFAULT_VOCABULARY_TOPICS: VocabularyTopicSelection[] = [
  DEFAULT_VOCABULARY_TOPIC,
];
const TABS: { id: TabId; label: string }[] = [
  { id: 'meaning', label: 'Nghĩa' },
  { id: 'collocations', label: 'Cụm từ' },
  { id: 'examples', label: 'Ví dụ' },
  { id: 'synonyms', label: 'Đồng nghĩa' },
  { id: 'wordFamily', label: 'Họ từ' },
];

interface DualPhonetic {
  us: string;
  uk: string;
}

const parseDualPhonetic = (
  rawPhonetic?: string,
  phoneticUs?: string,
  phoneticUk?: string,
): DualPhonetic => {
  let us = (phoneticUs || '').trim();
  let uk = (phoneticUk || '').trim();

  if (us && uk) {
    return {
      us: us.startsWith('/') ? us : `/${us}/`,
      uk: uk.startsWith('/') ? uk : `/${uk}/`,
    };
  }

  const text = (rawPhonetic || '').trim();
  if (!text) return { us: '', uk: '' };

  const ukMatch = text.match(/(?:UK|Anh|GB)[:\s]+(\/[^/]+\/|\[[^\]]+\]|[^\s|,|]+)/i);
  const usMatch = text.match(/(?:US|Mỹ|Ame)[:\s]+(\/[^/]+\/|\[[^\]]+\]|[^\s|,|]+)/i);

  if (ukMatch) uk = ukMatch[1].trim();
  if (usMatch) us = usMatch[1].trim();

  if (!uk && !us) {
    const clean = text.startsWith('/') ? text : `/${text}/`;
    return { us: clean, uk: clean };
  }

  const fallback = uk || us;
  return {
    us: us ? (us.startsWith('/') ? us : `/${us}/`) : (fallback.startsWith('/') ? fallback : `/${fallback}/`),
    uk: uk ? (uk.startsWith('/') ? uk : `/${uk}/`) : (fallback.startsWith('/') ? fallback : `/${fallback}/`),
  };
};

const TabSkeleton = () => (
  <div className="space-y-3 py-1" role="status" aria-label="Đang tải nội dung">
    <BoneyardSkeleton name="translator-skeleton" variant="card" count={3} height={64} />
  </div>
);

const SourceBadge = ({ source }: { source: AiSource }) => {
  if (source !== 'local') return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-50 px-2 py-1 text-[10px] font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
      <Cpu className="size-3" />
      AI Local · Chrome
    </span>
  );
};

export const SelectionTranslator: React.FC = () => {
  const { user } = useAuth();
  const rootRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);
  const contextRef = useRef('');
  const lookupAbortRef = useRef<AbortController | null>(null);
  const detailAbortRef = useRef<AbortController | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [selectedWord, setSelectedWord] = useState('');
  const [translation, setTranslation] = useState<WordTranslation | null>(null);
  const [playingAccent, setPlayingAccent] = useState<'US' | 'UK' | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('meaning');

  const dualPhonetic = useMemo(() => {
    if (!translation) return { us: '', uk: '' };
    return parseDualPhonetic(translation.phonetic, translation.phoneticUs, translation.phoneticUk);
  }, [translation]);

  const handlePlay = useCallback(async (accent: 'US' | 'UK') => {
    if (!selectedWord) return;
    setPlayingAccent(accent);
    try {
      const audioUrl = accent === 'UK' ? translation?.audioUk : translation?.audioUs;
      await playPronunciation(selectedWord, accent, undefined, audioUrl);
    } finally {
      setPlayingAccent((curr) => (curr === accent ? null : curr));
    }
  }, [selectedWord, translation]);
  const [details, setDetails] = useState<Partial<Record<DictionaryDetailSection, DictionaryDetailResult>>>({});
  const [loadingTabs, setLoadingTabs] = useState<Partial<Record<DictionaryDetailSection, boolean>>>({});
  const [tabErrors, setTabErrors] = useState<Partial<Record<DictionaryDetailSection, string>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [personalNote, setPersonalNote] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vocabularyTopics, setVocabularyTopics] = useState<VocabularyTopicSelection[]>(
    DEFAULT_VOCABULARY_TOPICS,
  );
  const [selectedTopicId, setSelectedTopicId] = useState(DEFAULT_VOCABULARY_TOPIC.id);

  useEffect(() => {
    if (!user) {
      setVocabularyTopics(DEFAULT_VOCABULARY_TOPICS);
      return;
    }

    let active = true;
    const mergeTopics = (
      words: Awaited<ReturnType<typeof vocabularyService.getAll>>,
      overrides: Awaited<ReturnType<typeof vocabularyService.getAllTopicOverrides>>,
    ) => {
      const topics = new Map(DEFAULT_VOCABULARY_TOPICS.map((topic) => [topic.id, topic]));
      words.forEach((word) => {
        if (word.topicId && word.topicName && !topics.has(word.topicId)) {
          topics.set(word.topicId, { id: word.topicId, name: word.topicName });
        }
      });
      Object.values(overrides).forEach((topic) => {
        if (topic.topicId && topic.topicName && !topics.has(topic.topicId)) {
          topics.set(topic.topicId, { id: topic.topicId, name: topic.topicName });
        }
      });
      if (active) setVocabularyTopics(Array.from(topics.values()));
    };

    const localWords = vocabularyService.getLocal(user.id);
    const localOverrides = vocabularyService.getTopicOverrides(user.id);
    mergeTopics(localWords, localOverrides);
    void Promise.all([
      vocabularyService.getAll(user.id),
      vocabularyService.getAllTopicOverrides(user.id),
    ]).then(([words, overrides]) => mergeTopics(words, overrides));

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => () => {
    lookupAbortRef.current?.abort();
    detailAbortRef.current?.abort();
  }, []);

  useEffect(() => {
    void dictionaryService.prewarm();
  }, []);

  const close = useCallback(() => {
    lookupAbortRef.current?.abort();
    detailAbortRef.current?.abort();
    lookupAbortRef.current = null;
    detailAbortRef.current = null;
    requestId.current += 1;
    setPosition(null);
    setSelectedWord('');
    setTranslation(null);
    setActiveTab('meaning');
    setDetails({});
    setLoadingTabs({});
    setTabErrors({});
    setLoading(false);
    setError('');
    setPersonalNote('');
    setSaved(false);
    setSaving(false);
    setPlayingAccent(null);
    setSelectedTopicId(DEFAULT_VOCABULARY_TOPIC.id);
  }, []);

  const lookupWord = useCallback(async (word: string, context = contextRef.current) => {
    lookupAbortRef.current?.abort();
    detailAbortRef.current?.abort();
    const controller = new AbortController();
    lookupAbortRef.current = controller;
    detailAbortRef.current = null;
    const id = ++requestId.current;
    contextRef.current = context;
    setSelectedWord(word);
    setTranslation(null);
    setActiveTab('meaning');
    setDetails({});
    setLoadingTabs({});
    setTabErrors({});
    setSaved(false);
    setSaving(false);
    setSelectedTopicId(DEFAULT_VOCABULARY_TOPIC.id);
    setPersonalNote('');
    setError('');
    setLoading(true);

    try {
      const result = await dictionaryService.translateWord(word, context, controller.signal);
      if (id !== requestId.current) return;
      setTranslation(result);
    } catch (reason) {
      if (id !== requestId.current) return;
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setError(reason instanceof Error ? reason.message : 'Không thể dịch từ này.');
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        if (lookupAbortRef.current === controller) lookupAbortRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    let debounceTimer: number | null = null;

    const translateSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
      if (rootRef.current?.contains(selection.anchorNode)) return;

      const word = extractTextFromSelection(selection);
      if (!isValidSelection(word)) return;

      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer.parentElement;
      if (!container || container.closest('input, textarea, [contenteditable="true"], [data-no-translate]')) return;

      const rect = range.getBoundingClientRect();
      const visibleWidth = Math.min(CARD_WIDTH, window.innerWidth - 24);
      const left = Math.min(
        Math.max(12, rect.left + rect.width / 2 - visibleWidth / 2),
        window.innerWidth - visibleWidth - 12,
      );
      const preferredTop = rect.top < CARD_HEIGHT + 36 ? rect.bottom + 10 : rect.top - CARD_HEIGHT - 10;
      const top = Math.min(
        Math.max(12, preferredTop),
        Math.max(12, window.innerHeight - Math.min(CARD_HEIGHT, window.innerHeight - 24) - 12),
      );
      const context = (container.closest('.toeic-passage')?.textContent || container.textContent || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 500);

      const passageEl = container.closest('[data-passage-id]');
      const passageId = passageEl?.getAttribute('data-passage-id');
      if (passageId) {
        void dictionaryService.prewarmPassage(passageId);
      }

      setPosition({ left, top });
      void lookupWord(word, context);
    };

    const onMouseUp = () => {
      if (debounceTimer) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(translateSelection, 180);
    };

    const onTouchEnd = () => {
      if (debounceTimer) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(translateSelection, 180);
    };

    const onMouseDown = (event: MouseEvent | TouchEvent) => {
      if (debounceTimer) {
        window.clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      lookupAbortRef.current?.abort();
      detailAbortRef.current?.abort();
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        close();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (debounceTimer) {
          window.clearTimeout(debounceTimer);
          debounceTimer = null;
        }
        close();
      }
    };

    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('touchstart', onMouseDown);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      if (debounceTimer) window.clearTimeout(debounceTimer);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('touchstart', onMouseDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [close, lookupWord]);

  const selectTab = async (tab: TabId) => {
    setActiveTab(tab);
    if (tab === 'meaning' || details[tab] || loadingTabs[tab] || !translation) return;

    detailAbortRef.current?.abort();
    const controller = new AbortController();
    detailAbortRef.current = controller;
    const id = requestId.current;
    setLoadingTabs((current) => ({ ...current, [tab]: true }));
    setTabErrors((current) => ({ ...current, [tab]: '' }));
    try {
      const result = await dictionaryService.getDetail(
        selectedWord,
        tab,
        contextRef.current,
        controller.signal,
      );
      if (id !== requestId.current) return;
      setDetails((current) => ({ ...current, [tab]: result }));
    } catch (reason) {
      if (id !== requestId.current) return;
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setTabErrors((current) => ({
        ...current,
        [tab]: reason instanceof Error ? reason.message : 'Không thể tải nội dung tab này.',
      }));
    } finally {
      if (id === requestId.current) {
        setLoadingTabs((current) => ({ ...current, [tab]: false }));
        if (detailAbortRef.current === controller) detailAbortRef.current = null;
      }
    }
  };

  const addToVocabulary = async () => {
    if (!user || !translation || saved || saving) return;
    setSaving(true);
    setError('');
    try {
      const selectedTopic = vocabularyTopics.find((topic) => topic.id === selectedTopicId) ||
        DEFAULT_VOCABULARY_TOPIC;
      const result = await vocabularyService.add(user.id, translation, personalNote, selectedTopic);
      setSaved(result.cloudSynced);
      if (!result.cloudSynced) {
        setError('Từ đã lưu trên thiết bị nhưng chưa đồng bộ được lên MySQL. Vui lòng thử lại.');
      } else if (result.isDuplicate) {
        setError(personalNote.trim()
          ? 'Từ đã có trong kho; ghi chú riêng và dữ liệu MySQL đã được cập nhật.'
          : 'Từ này đã có trong kho và đã được đồng bộ MySQL.');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể thêm từ vào kho từ vựng.');
    } finally {
      setSaving(false);
    }
  };

  const activeDetail = activeTab === 'meaning' ? null : details[activeTab];
  const activeSource = activeDetail?.aiSource || translation?.aiSource || 'gemini';

  const renderTabContent = () => {
    if (!translation) return null;
    if (activeTab === 'meaning') {
      return (
        <div className="space-y-3">
          <div className="rounded-xl bg-brand-50 px-3.5 py-3 dark:bg-brand-500/10">
            <p className="text-[10px] font-bold uppercase tracking-[.12em] text-brand-700 dark:text-brand-200">Nghĩa tiếng Việt</p>
            <p className="mt-1 text-[15px] font-bold leading-snug text-slate-900 dark:text-content">{translation.translatedText}</p>
          </div>
          {translation.definitionEn && (
            <div className="flex gap-2.5 rounded-xl border border-slate-100 px-3.5 py-3 text-xs leading-relaxed text-slate-600 dark:border-line dark:text-content-muted">
              <BookOpen className="mt-0.5 size-3.5 shrink-0 text-brand-600 dark:text-brand-300" />
              <div>
                <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Định nghĩa tiếng Anh</p>
                {translation.definitionEn}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (loadingTabs[activeTab]) return <TabSkeleton />;
    if (tabErrors[activeTab]) {
      return (
        <div className="rounded-xl bg-rose-50 px-3 py-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          {tabErrors[activeTab]}
          <button
            onClick={() => {
              setDetails((current) => ({ ...current, [activeTab]: undefined }));
              void selectTab(activeTab);
            }}
            className="ml-2 font-bold underline underline-offset-2"
          >
            Thử lại
          </button>
        </div>
      );
    }
    if (!activeDetail) return <TabSkeleton />;
    if (activeDetail.items.length === 0) {
      return (
        <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-xs text-slate-500 dark:bg-surface-elevated dark:text-content-muted">
          Chưa tìm thấy dữ liệu phù hợp cho mục này.
        </p>
      );
    }

    if (activeDetail.section === 'collocations') {
      return (
        <div className="space-y-2">
          {(activeDetail.items as DictionaryCollocation[]).map((item) => (
            <div key={item.phrase} className="rounded-xl border border-slate-100 px-3.5 py-3 dark:border-line">
              <p className="text-sm font-bold text-slate-900 dark:text-content">{item.phrase}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-content-muted">{item.meaningVi}</p>
            </div>
          ))}
        </div>
      );
    }

    if (activeDetail.section === 'examples') {
      return (
        <div className="space-y-3">
          {(activeDetail.items as DictionaryExample[]).map((item, index) => (
            <div key={`${item.en}-${index}`} className="border-l-2 border-brand-500 pl-3">
              <div className="mb-1 flex flex-wrap gap-1.5">
                {item.level && <span className="text-[9px] font-bold uppercase tracking-wide text-brand-600 dark:text-brand-300">{item.level}</span>}
                {item.context && <span className="text-[9px] font-semibold text-slate-400">· {item.context}</span>}
              </div>
              <p className="text-xs font-medium leading-relaxed text-slate-700 dark:text-content">“{item.en}”</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-content-muted">{item.vi}</p>
            </div>
          ))}
        </div>
      );
    }

    if (activeDetail.section === 'synonyms') {
      return (
        <div>
          <p className="mb-3 text-xs leading-relaxed text-slate-500 dark:text-content-muted">
            Chọn một từ để tra tiếp ngay trong cửa sổ này.
          </p>
          <div className="flex flex-wrap gap-2">
            {(activeDetail.items as string[]).map((synonym) => (
              <button
                key={synonym}
                onClick={() => void lookupWord(synonym)}
                className="rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-700 transition hover:-translate-y-0.5 hover:bg-brand-100 dark:border-brand-900 dark:bg-brand-500/10 dark:text-brand-200 dark:hover:bg-brand-500/20"
              >
                {synonym}
              </button>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100 dark:divide-line dark:border-line">
        {(activeDetail.items as DictionaryWordFamily[]).map((item) => (
          <button
            key={`${item.word}-${item.partOfSpeech}`}
            onClick={() => void lookupWord(item.word)}
            className="grid w-full grid-cols-[1fr_auto] items-center gap-3 px-3.5 py-2.5 text-left transition hover:bg-brand-50 dark:hover:bg-brand-500/10"
          >
            <span>
              <strong className="block text-sm text-slate-900 dark:text-content">{item.word}</strong>
              <span className="text-[11px] text-slate-400">{item.phonetic}</span>
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500 dark:bg-surface-elevated dark:text-content-muted">
              {item.partOfSpeech}
            </span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {position && (
        <motion.div
          ref={rootRef}
          data-no-translate
          role="dialog"
          aria-label={`AI Dictionary: ${selectedWord}`}
          initial={{ opacity: 0, y: 8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 5, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 430, damping: 32 }}
          style={{
            left: position.left,
            top: position.top,
            width: `min(${CARD_WIDTH}px, calc(100vw - 24px))`,
          }}
          className="fixed z-[100] flex max-h-[min(560px,calc(100vh-24px))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/95 text-slate-800 shadow-[0_24px_70px_-20px_rgba(15,23,42,.3)] backdrop-blur-xl dark:border-line dark:bg-surface/95 dark:text-content"
          onMouseUp={(event) => event.stopPropagation()}
        >
          <header className="shrink-0 border-b border-slate-200 bg-white/95 px-4 pt-3 dark:border-line dark:bg-surface/95">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-[.14em] text-slate-500 dark:text-content-muted">AI Dictionary</span>
                {translation && <SourceBadge source={activeSource} />}
              </div>
              <button
                onClick={close}
                aria-label="Đóng"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-surface-hover dark:hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-3.5 space-y-2.5">
              <div className="flex flex-wrap items-baseline gap-2.5">
                <h3 className="truncate text-[26px] font-black tracking-tight text-slate-950 dark:text-content">
                  {selectedWord}
                </h3>
                {translation?.partOfSpeech && (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:bg-surface-elevated dark:text-content-muted">
                    {translation.partOfSpeech}
                  </span>
                )}
              </div>

              {translation && (
                <div className="flex flex-wrap items-center gap-2">
                  {/* UK Pronunciation */}
                  <button
                    type="button"
                    onClick={() => void handlePlay('UK')}
                    className={`group relative flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95 ${
                      playingAccent === 'UK'
                        ? 'border-indigo-500 bg-indigo-500/15 text-indigo-700 shadow-sm dark:text-indigo-300 ring-2 ring-indigo-500/20'
                        : 'border-slate-200/80 bg-slate-50/70 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-700 dark:border-line dark:bg-surface-elevated/50 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-950/30 dark:text-content'
                    }`}
                    title="Nghe phát âm Anh - Anh (UK)"
                    aria-label={`Nghe phát âm Anh - Anh: ${dualPhonetic.uk || selectedWord}`}
                  >
                    <span className="flex items-center justify-center rounded-md bg-indigo-100/90 px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                      UK
                    </span>
                    <Volume2
                      className={`size-3.5 transition-transform duration-200 group-hover:scale-110 ${
                        playingAccent === 'UK'
                          ? 'text-indigo-600 animate-pulse dark:text-indigo-400'
                          : 'text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                      }`}
                    />
                    <span className="font-mono text-[12px] text-slate-600 dark:text-content-muted">
                      {dualPhonetic.uk || translation.phonetic || 'Phát âm'}
                    </span>
                  </button>

                  {/* US Pronunciation */}
                  <button
                    type="button"
                    onClick={() => void handlePlay('US')}
                    className={`group relative flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95 ${
                      playingAccent === 'US'
                        ? 'border-rose-500 bg-rose-500/15 text-rose-700 shadow-sm dark:text-rose-300 ring-2 ring-rose-500/20'
                        : 'border-slate-200/80 bg-slate-50/70 hover:border-rose-300 hover:bg-rose-50/50 text-slate-700 dark:border-line dark:bg-surface-elevated/50 dark:hover:border-rose-500/50 dark:hover:bg-rose-950/30 dark:text-content'
                    }`}
                    title="Nghe phát âm Anh - Mỹ (US)"
                    aria-label={`Nghe phát âm Anh - Mỹ: ${dualPhonetic.us || selectedWord}`}
                  >
                    <span className="flex items-center justify-center rounded-md bg-rose-100/90 px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide text-rose-700 dark:bg-rose-950/80 dark:text-rose-300">
                      US
                    </span>
                    <Volume2
                      className={`size-3.5 transition-transform duration-200 group-hover:scale-110 ${
                        playingAccent === 'US'
                          ? 'text-rose-600 animate-pulse dark:text-rose-400'
                          : 'text-slate-400 group-hover:text-rose-600 dark:group-hover:text-rose-400'
                      }`}
                    />
                    <span className="font-mono text-[12px] text-slate-600 dark:text-content-muted">
                      {dualPhonetic.us || translation.phonetic || 'Phát âm'}
                    </span>
                  </button>
                </div>
              )}
            </div>

            <div className="-mx-1 mt-3 flex gap-0.5 overflow-x-auto pb-2" role="tablist" aria-label="Nội dung từ điển">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => void selectTab(tab.id)}
                  disabled={!translation}
                  className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
                    activeTab === tab.id
                      ? 'bg-brand text-brand-ink'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 dark:text-content-muted dark:hover:bg-surface-hover dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {loading && (
              <div className="space-y-3 py-2" role="status">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <Loader2 className="size-4 animate-spin text-brand-600" />
                  Đang phân tích theo ngữ cảnh...
                </div>
                <TabSkeleton />
              </div>
            )}
            {translation && renderTabContent()}
            {error && (
              <p className={`rounded-xl px-3 py-2 text-xs ${translation ? 'mt-3 bg-slate-100 text-slate-600 dark:bg-surface-elevated dark:text-content-muted' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'}`}>
                {error}
              </p>
            )}
          </div>

          {translation && (
            <footer className="shrink-0 border-t border-slate-200 bg-white/95 p-3 dark:border-line dark:bg-surface/95">
              <label className="mb-2 block">
                <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">
                  <FolderOpen className="size-3.5" />
                  Lưu vào chủ đề
                </span>
                <select
                  value={selectedTopicId}
                  onChange={(event) => {
                    setSelectedTopicId(event.target.value);
                    setSaved(false);
                    setError('');
                  }}
                  disabled={saving}
                  className="block min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 disabled:opacity-60 dark:border-line dark:bg-surface-elevated dark:text-content dark:focus:border-brand dark:focus:bg-slate-900 dark:focus:ring-brand-500/10"
                  aria-label="Chọn chủ đề lưu từ vựng"
                >
                  {vocabularyTopics.map((topic) => (
                    <option key={topic.id} value={topic.id}>{topic.name}</option>
                  ))}
                </select>
              </label>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">Nghĩa riêng của bạn</p>
              <label className="relative block">
                <StickyNote className="absolute left-3 top-2.5 size-3.5 text-slate-400" />
                <textarea
                  value={personalNote}
                  onChange={(event) => {
                    setPersonalNote(event.target.value);
                    setSaved(false);
                  }}
                  rows={2}
                  maxLength={500}
                  placeholder="Thêm nghĩa hoặc ghi chú theo cách hiểu của bạn..."
                  className="block max-h-20 min-h-14 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs leading-relaxed text-slate-700 outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 dark:border-line dark:bg-surface-elevated dark:text-content dark:focus:border-brand dark:focus:bg-slate-900 dark:focus:ring-brand-500/10"
                />
              </label>
              <button
                onClick={addToVocabulary}
                disabled={saved || saving || !user}
                className="mt-2 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-xs font-bold text-brand-ink transition hover:bg-brand-hover active:scale-[.99] disabled:bg-brand-500 disabled:opacity-70"
              >
                {saving
                  ? <Loader2 className="size-4 animate-spin" />
                  : saved
                    ? <Check className="size-4" />
                    : <Plus className="size-4" />}
                {saving ? 'Đang đồng bộ...' : saved ? 'Đã có trong kho từ vựng' : 'Thêm vào kho từ vựng'}
              </button>
            </footer>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
