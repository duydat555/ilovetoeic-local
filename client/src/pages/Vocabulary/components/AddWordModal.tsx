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
  ListPlus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { getModalMotion } from '../../../components/common/modalMotion';
import { ModalPortal } from '../../../components/common/ModalPortal';
import { BoneyardSkeleton } from '../../../components/common/BoneyardSkeleton';
import { dictionaryService } from '../../../services/dictionary';
import { vocabularyService } from '../../../services/vocabulary';
import { vocabularyTopicService, VocabularyTopic } from '../../../services/vocabularyTopics';
import { WordTranslation } from '../../../types';
import { playPronunciation } from '../../../utils/audioPronunciation';

const MAX_BULK_WORDS = 20;
const LOOKUP_CONCURRENCY = 3;

type AddMode = 'single' | 'bulk';

interface BulkWordDraft {
  id: string;
  sourceText: string;
  translatedText: string;
  phonetic: string;
  partOfSpeech: string;
  definitionEn: string;
  examples: { en: string; vi: string }[];
  synonyms: string[];
  status: 'ready' | 'error';
  error?: string;
}

export const parseBulkWordInput = (input: string) => {
  const seen = new Set<string>();
  return input
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => {
      const key = line.toLocaleLowerCase('en');
      if (!line || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

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
  const [mode, setMode] = useState<AddMode>('single');
  const [bulkInput, setBulkInput] = useState('');
  const [bulkDrafts, setBulkDrafts] = useState<BulkWordDraft[]>([]);
  const [bulkStep, setBulkStep] = useState<'input' | 'review' | 'done'>('input');
  const [bulkSummary, setBulkSummary] = useState<{
    added: number;
    duplicates: number;
    cloudSynced: boolean;
  } | null>(null);

  const [loadingLookup, setLoadingLookup] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const busy = loadingLookup || submitting;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [busy, onClose]);

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

  const lookupBulkWords = async () => {
    const words = parseBulkWordInput(bulkInput);
    if (!words.length) {
      setError('Nhập ít nhất một từ hoặc cụm từ, mỗi mục trên một dòng.');
      return;
    }
    if (words.length > MAX_BULK_WORDS) {
      setError(`Mỗi lần chỉ có thể thêm tối đa ${MAX_BULK_WORDS} mục.`);
      return;
    }

    setLoadingLookup(true);
    setError('');
    try {
      const results = new Array<BulkWordDraft>(words.length);
      let nextIndex = 0;
      const worker = async () => {
      while (nextIndex < words.length) {
        const index = nextIndex++;
        const word = words[index];
        try {
          const translated = await dictionaryService.translateWord(word);
          results[index] = {
            id: `${index}-${word.toLocaleLowerCase('en')}`,
            sourceText: translated.sourceText || word,
            translatedText: translated.translatedText || '',
            phonetic: translated.phonetic || '',
            partOfSpeech: translated.partOfSpeech?.toUpperCase() || 'NOUN',
            definitionEn: translated.definitionEn || '',
            examples: translated.examples || [],
            synonyms: translated.synonyms || [],
            status: translated.translatedText ? 'ready' : 'error',
            error: translated.translatedText ? undefined : 'Chưa tìm thấy nghĩa. Vui lòng nhập thủ công.',
          };
        } catch (reason) {
          results[index] = {
            id: `${index}-${word.toLocaleLowerCase('en')}`,
            sourceText: word,
            translatedText: '',
            phonetic: '',
            partOfSpeech: 'NOUN',
            definitionEn: '',
            examples: [],
            synonyms: [],
            status: 'error',
            error: reason instanceof Error ? reason.message : 'Không thể tra mục này.',
          };
        }
      }
    };

      await Promise.all(
        Array.from({ length: Math.min(LOOKUP_CONCURRENCY, words.length) }, () => worker()),
      );
      setBulkDrafts(results);
      setBulkStep('review');
    } finally {
      setLoadingLookup(false);
    }
  };

  const updateBulkDraft = (id: string, changes: Partial<BulkWordDraft>) => {
    setBulkDrafts((current) => current.map((item) => (
      item.id === id
        ? {
            ...item,
            ...changes,
            status: (changes.translatedText ?? item.translatedText).trim() ? 'ready' : 'error',
          }
        : item
    )));
  };

  const retryBulkDraft = async (draft: BulkWordDraft) => {
    updateBulkDraft(draft.id, { error: undefined });
    try {
      const translated = await dictionaryService.translateWord(draft.sourceText);
      updateBulkDraft(draft.id, {
        sourceText: translated.sourceText || draft.sourceText,
        translatedText: translated.translatedText || '',
        phonetic: translated.phonetic || '',
        partOfSpeech: translated.partOfSpeech?.toUpperCase() || 'NOUN',
        definitionEn: translated.definitionEn || '',
        examples: translated.examples || [],
        synonyms: translated.synonyms || [],
        error: translated.translatedText ? undefined : 'Chưa tìm thấy nghĩa. Vui lòng nhập thủ công.',
      });
    } catch (reason) {
      updateBulkDraft(draft.id, {
        error: reason instanceof Error ? reason.message : 'Không thể tra mục này.',
      });
    }
  };

  const saveBulkWords = async () => {
    if (!bulkDrafts.length || bulkDrafts.some((item) => !item.sourceText.trim() || !item.translatedText.trim())) {
      setError('Mỗi mục cần có từ tiếng Anh và nghĩa tiếng Việt trước khi lưu.');
      return;
    }
    setSubmitting(true);
    setError('');
    const selectedTopicObj = topics.find((topic) => topic.id === selectedTopicId);
    const topicPayload = {
      id: selectedTopicObj?.id || selectedTopicId || 'ai',
      name: selectedTopicObj?.name || 'Từ đã tra bằng AI',
    };
    try {
      const translations: WordTranslation[] = bulkDrafts.map((item) => ({
        sourceText: item.sourceText.trim(),
        translatedText: item.translatedText.trim(),
        phonetic: item.phonetic.trim(),
        partOfSpeech: item.partOfSpeech.trim().toUpperCase(),
        definitionEn: item.definitionEn.trim(),
        examples: item.examples,
        synonyms: item.synonyms,
        aiSource: 'gemini',
      }));
      const result = await vocabularyService.addMany(userId, translations, '', topicPayload);
      if (selectedTopicId && !selectedTopicId.startsWith('system-') && selectedTopicId !== 'ai') {
        vocabularyTopicService.addWords(userId, selectedTopicId, result.words.map((word) => word.id));
      }
      setBulkSummary(result);
      setBulkStep('done');
      onWordAdded?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể lưu danh sách từ vựng.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'bulk') return;
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
        onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
      >
        <motion.div
          {...motionContract.panel}
          role="dialog"
          aria-modal="true"
          className="flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl dark:shadow-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-7">
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
              disabled={busy}
              aria-label="Đóng cửa sổ thêm từ vựng"
              className="grid size-8 place-items-center rounded-xl text-content-muted transition hover:bg-surface-hover hover:text-content disabled:pointer-events-none disabled:opacity-40"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="border-b border-line px-5 py-3 sm:px-7">
            <div className="grid grid-cols-2 rounded-xl bg-surface-elevated p-1" role="tablist" aria-label="Cách thêm từ">
              {([
                ['single', 'Một từ'],
                ['bulk', 'Nhiều từ'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={mode === value}
                  onClick={() => {
                    setMode(value);
                    setError('');
                    setSuccess(false);
                  }}
                  disabled={busy}
                  className={`min-h-9 rounded-lg px-3 text-xs font-bold transition-colors disabled:opacity-50 ${
                    mode === value ? 'bg-surface text-content shadow-xs' : 'text-content-muted hover:text-content'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-7">
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

            {mode === 'bulk' ? (
              <div className="space-y-4">
                {bulkStep === 'input' && (
                  <>
                    <div>
                      <div className="flex items-end justify-between gap-3">
                        <label className="text-xs font-black uppercase tracking-wider text-content-muted">
                          Danh sách từ hoặc cụm từ
                        </label>
                        <span className="text-[11px] font-semibold text-content-muted">
                          {parseBulkWordInput(bulkInput).length}/{MAX_BULK_WORDS} mục
                        </span>
                      </div>
                      <textarea
                        autoFocus
                        rows={9}
                        value={bulkInput}
                        onChange={(event) => setBulkInput(event.target.value)}
                        placeholder={'supervise\nfacilitate\nreach an agreement\nannual performance review'}
                        className="mt-2 w-full resize-y rounded-2xl border border-line bg-surface-elevated px-4 py-3 text-sm font-semibold leading-7 text-content outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
                      />
                      <p className="mt-2 text-[11px] leading-relaxed text-content-muted">
                        Mỗi dòng một mục. Dòng trống và mục trùng nhau sẽ tự động được loại bỏ.
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-content-muted">Lưu vào bộ từ vựng</label>
                      <select
                        value={selectedTopicId}
                        onChange={(event) => setSelectedTopicId(event.target.value)}
                        className="mt-1 min-h-10 w-full rounded-xl border border-line bg-surface-elevated px-3 text-xs font-bold text-content outline-none focus:border-accent"
                      >
                        <option value="ai">Sổ tay cá nhân (Mặc định)</option>
                        {topics.map((topic) => (
                          <option key={topic.id} value={topic.id}>{topic.name}</option>
                        ))}
                      </select>
                    </div>

                    {loadingLookup ? (
                      <div className="space-y-2" role="status" aria-label="Đang tra danh sách từ">
                        {[1, 2, 3].map((item) => (
                          <BoneyardSkeleton key={item} name={`bulk-word-${item}`} variant="row" height={64} />
                        ))}
                      </div>
                    ) : (
                      <div className="flex justify-end border-t border-line pt-4">
                        <button
                          type="button"
                          onClick={() => void lookupBulkWords()}
                          disabled={!bulkInput.trim() || parseBulkWordInput(bulkInput).length > MAX_BULK_WORDS}
                          className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-accent px-5 text-sm font-black text-accent-contrast transition hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-50"
                        >
                          <Languages className="size-4" />
                          Tra và kiểm tra danh sách
                        </button>
                      </div>
                    )}
                  </>
                )}

                {bulkStep === 'review' && (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-black text-content">Kiểm tra trước khi lưu</h4>
                        <p className="text-xs text-content-muted">Bạn có thể sửa nghĩa hoặc bỏ mục không cần thiết.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBulkStep('input')}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-xs font-bold text-content hover:bg-surface-hover"
                      >
                        <RotateCcw className="size-3.5" /> Sửa danh sách
                      </button>
                    </div>
                    <div className="space-y-2.5">
                      {bulkDrafts.map((draft, index) => (
                        <div key={draft.id} className="rounded-2xl border border-line bg-surface-elevated/60 p-3">
                          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:gap-3">
                            <div className="flex items-center justify-between sm:block">
                              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-surface text-[11px] font-black text-content-muted">
                                {index + 1}
                              </span>
                              <div className="flex gap-1 sm:hidden">
                                {draft.status === 'error' && (
                                  <button
                                    type="button"
                                    onClick={() => void retryBulkDraft(draft)}
                                    className="grid size-8 place-items-center rounded-lg text-content-muted hover:bg-surface hover:text-accent"
                                    aria-label={`Tra lại ${draft.sourceText}`}
                                  >
                                    <RotateCcw className="size-3.5" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setBulkDrafts((current) => current.filter((item) => item.id !== draft.id))}
                                  className="grid size-8 place-items-center rounded-lg text-content-muted hover:bg-rose-500/10 hover:text-rose-600"
                                  aria-label={`Bỏ ${draft.sourceText}`}
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            </div>
                            <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                              <input
                                value={draft.sourceText}
                                onChange={(event) => updateBulkDraft(draft.id, { sourceText: event.target.value })}
                                aria-label={`Từ tiếng Anh ${index + 1}`}
                                className="min-h-10 rounded-xl border border-line bg-surface px-3 text-xs font-bold text-content outline-none focus:border-accent"
                              />
                              <input
                                value={draft.translatedText}
                                onChange={(event) => updateBulkDraft(draft.id, { translatedText: event.target.value, error: undefined })}
                                placeholder="Nhập nghĩa tiếng Việt"
                                aria-label={`Nghĩa tiếng Việt ${index + 1}`}
                                className={`min-h-10 rounded-xl border bg-surface px-3 text-xs font-semibold text-content outline-none focus:border-accent ${
                                  draft.translatedText.trim() ? 'border-line' : 'border-rose-400'
                                }`}
                              />
                            </div>
                            <div className="hidden shrink-0 gap-1 sm:flex">
                              {draft.status === 'error' && (
                                <button
                                  type="button"
                                  onClick={() => void retryBulkDraft(draft)}
                                  className="grid size-8 place-items-center rounded-lg text-content-muted hover:bg-surface hover:text-accent"
                                  title="Tra lại"
                                  aria-label={`Tra lại ${draft.sourceText}`}
                                >
                                  <RotateCcw className="size-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setBulkDrafts((current) => current.filter((item) => item.id !== draft.id))}
                                className="grid size-8 place-items-center rounded-lg text-content-muted hover:bg-rose-500/10 hover:text-rose-600"
                                title="Bỏ mục này"
                                aria-label={`Bỏ ${draft.sourceText}`}
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </div>
                          {draft.error && <p className="mt-2 text-[11px] text-rose-600 dark:text-rose-400 sm:pl-10">{draft.error}</p>}
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                      <span className="text-xs font-semibold text-content-muted">{bulkDrafts.length} mục sẽ được lưu</span>
                      <button
                        type="button"
                        onClick={() => void saveBulkWords()}
                        disabled={submitting || !bulkDrafts.length || bulkDrafts.some((item) => !item.sourceText.trim() || !item.translatedText.trim())}
                        className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-accent px-5 text-sm font-black text-accent-contrast transition hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-50"
                      >
                        {submitting ? <Loader2 className="size-4 animate-spin" /> : <ListPlus className="size-4" />}
                        Lưu {bulkDrafts.length} mục
                      </button>
                    </div>
                  </>
                )}

                {bulkStep === 'done' && bulkSummary && (
                  <div className="space-y-4 py-3 text-center">
                    <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-7" />
                    </span>
                    <div>
                      <h4 className="text-lg font-black text-content">Đã thêm danh sách từ vựng</h4>
                      <p className="mt-1 text-sm text-content-muted">
                        {bulkSummary.added} mục mới · {bulkSummary.duplicates} mục đã có
                      </p>
                      {!bulkSummary.cloudSynced && (
                        <p className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                          Đã lưu trên thiết bị nhưng chưa đồng bộ lên máy chủ. Hệ thống sẽ thử lại sau.
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="min-h-11 rounded-2xl bg-accent px-6 text-sm font-black text-accent-contrast hover:bg-accent-hover"
                    >
                      Hoàn tất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
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
                <option value="ai">Sổ tay cá nhân (Mặc định)</option>
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
              </>
            )}
          </form>
        </motion.div>
      </motion.div>
    </ModalPortal>
  );
};
