import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookMarked,
  CheckCircle2,
  Clock,
  Filter,
  Headphones,
  Layers3,
  Play,
  RotateCw,
  Search,
  Shuffle,
  Video,
  Volume2,
  X,
  Youtube,
} from 'lucide-react';
import { listeningService } from '../../services/listening';
import { BoneyardSkeleton } from '../../components/common/BoneyardSkeleton';
import { Pagination } from '../../components/common/Pagination';
import { ListeningNotesModal } from '../../components/listening/ListeningNotesModal';
import { CellSignalBars } from '../../components/listening/CellSignalBars';
import { ListeningDifficultyTab } from '../../components/listening/ListeningDifficultyTab';
import { useLanguage } from '../../context/LanguageContext';
import type { ListeningCategory, ListeningDifficulty, ListeningSet, ListeningTestSummary } from '../../types';

type ViewMode = 'study' | 'difficulty' | 'needs_review' | 'progress';

export const ListeningListPage: React.FC = () => {
  const navigate = useNavigate();
  const { language, t } = useLanguage();

  const viewTabs: Array<{ key: ViewMode; label: string }> = useMemo(() => [
    { key: 'study', label: t('listening.tabStudy') },
    { key: 'difficulty', label: t('listening.tabDifficulty') },
    { key: 'needs_review', label: t('listening.tabReview') },
    { key: 'progress', label: t('listening.tabProgress') },
  ], [language, t]);

  const partOptions = useMemo(() => [
    { key: 'all', label: language === 'en' ? 'All 4 Parts' : 'Tất cả 4 Part', badge: language === 'en' ? '4 sets' : '4 bài' },
    { key: 'Part 1', label: language === 'en' ? 'Part 1: Photographs' : 'Part 1: Mô tả tranh', badge: language === 'en' ? '24 Qs' : '24 câu' },
    { key: 'Part 2', label: language === 'en' ? 'Part 2: Question & Response' : 'Part 2: Hỏi & Đáp', badge: language === 'en' ? '100 Qs' : '100 câu' },
    { key: 'Part 3', label: language === 'en' ? 'Part 3: Conversations' : 'Part 3: Đoạn hội thoại', badge: language === 'en' ? '13 sets' : '13 đoạn' },
    { key: 'Part 4', label: language === 'en' ? 'Part 4: Short Talks' : 'Part 4: Bài nói ngắn', badge: language === 'en' ? '10 sets' : '10 bài nói' },
  ], [language]);

  const [categories, setCategories] = useState<ListeningCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ets-2026');
  const [selectedTest, setSelectedTest] = useState<number | null>(null);
  const [selectedPart, setSelectedPart] = useState<string>('all');
  const [testsSummary, setTestsSummary] = useState<ListeningTestSummary[]>([]);
  const [isLoadingTests, setIsLoadingTests] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>('study');
  const [searchQuery, setSearchQuery] = useState('');
  const [uncompletedOnly, setUncompletedOnly] = useState(false);

  const [sets, setSets] = useState<ListeningSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(12);
  const [totalSets, setTotalSets] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const setsSectionRef = React.useRef<HTMLDivElement>(null);

  // Mix random state
  const [mixRandomSets, setMixRandomSets] = useState<ListeningSet[]>([]);
  const [mixRandomCounts, setMixRandomCounts] = useState({ video: 0, audio: 0 });
  const [isRollingMix, setIsRollingMix] = useState(false);
  const [recentMixIds, setRecentMixIds] = useState<string[]>([]);

  // Modals state
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [activeNotesSet, setActiveNotesSet] = useState<{ id: string; title: string } | null>(null);

  // 1. Load dynamic categories
  useEffect(() => {
    let active = true;
    void listeningService.getCategories().then((items) => {
      if (active) {
        setCategories(items);
        const has2026 = items.some((c) => c.id === 'ets-2026');
        if (!has2026 && items.length > 0) {
          setSelectedCategory(items[0].id);
        }
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // 2. Load 10 Tests Summary for ETS 2026
  const loadTestsSummary = useCallback(async () => {
    setIsLoadingTests(true);
    const res = await listeningService.getTestsSummary(2026);
    if (res.success && res.tests) {
      setTestsSummary(res.tests);
    }
    setIsLoadingTests(false);
  }, []);

  useEffect(() => {
    if (selectedCategory === 'ets-2026') {
      void loadTestsSummary();
    }
  }, [selectedCategory, loadTestsSummary]);

  // Reset to page 1 whenever any filter changes
  useEffect(() => {
    setPage(1);
  }, [viewMode, selectedCategory, selectedTest, selectedPart, searchQuery, uncompletedOnly]);

  // 3. Load sets based on filters & pagination
  const loadSets = useCallback(async () => {
    // If in ETS 2026 category with no specific test selected and no search query, test overview is shown
    if (selectedCategory === 'ets-2026' && selectedTest === null && !searchQuery.trim()) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const result = await listeningService.getSets({
      viewMode,
      categoryId: selectedCategory,
      testNumber: selectedTest !== null ? selectedTest : undefined,
      part: selectedPart !== 'all' ? selectedPart : undefined,
      search: searchQuery,
      uncompletedOnly,
      page,
      pageSize,
    });
    setSets(result.sets);
    setTotalSets(result.total);
    setTotalPages(result.totalPages);
    setIsLoading(false);
  }, [viewMode, selectedCategory, selectedTest, selectedPart, searchQuery, uncompletedOnly, page, pageSize]);

  useEffect(() => {
    void loadSets();
  }, [loadSets]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    if (setsSectionRef.current) {
      setsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  // 3. Load or Re-roll Mix Random
  const handleRollMix = useCallback(async (excludeCurrent = false) => {
    setIsRollingMix(true);
    const excludeIds = excludeCurrent ? recentMixIds : [];
    const res = await listeningService.getMixRandom(4, 0.5, excludeIds);
    if (res.success && res.sets.length > 0) {
      setMixRandomSets(res.sets);
      setMixRandomCounts({ video: res.videoCount, audio: res.audioCount });
      setRecentMixIds(res.sets.map((s) => s.id));
    }
    setIsRollingMix(false);
  }, [recentMixIds]);

  useEffect(() => {
    void handleRollMix(false);
  }, []);

  const handleOpenNotes = (set: ListeningSet) => {
    setActiveNotesSet({ id: set.id, title: set.title });
    setNotesModalOpen(true);
  };

  const handleStartPractice = (set: ListeningSet) => {
    navigate(`/listening/${set.id}`);
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-12 text-content">
      {/* Header Banner */}
      <header className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-surface via-surface to-accent/5 p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-accent-strong">
            <Headphones className="size-3.5" />
            <span>{language === 'en' ? 'TOEIC Dictation & Audio Reflex' : 'Luyện nghe chép chính tả TOEIC'}</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl text-content">
            {t('listening.title')}
          </h1>
          <p className="text-xs sm:text-sm leading-relaxed text-content-muted">
            {t('listening.subtitle')}
          </p>
        </div>
      </header>

      {/* Block: Mix ngẫu nhiên (1.2) */}
      <section className="rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-accent/15 text-accent-strong">
              <Shuffle className="size-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-content">{t('listening.quickMixTitle')}</h2>
              <div className="flex items-center gap-2 text-[11px] font-semibold text-content-muted">
                <span>{language === 'en' ? `Mix: ${mixRandomCounts.video} video sets` : `Tổ hợp: ${mixRandomCounts.video} bộ video`}</span>
                <span>•</span>
                <span>{language === 'en' ? `${mixRandomCounts.audio} standard audio sets` : `${mixRandomCounts.audio} bộ audio thường`}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleRollMix(true)}
            disabled={isRollingMix}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface-elevated/40 px-3.5 py-2 text-xs font-bold text-content transition hover:bg-surface-hover hover:border-accent active:scale-95 disabled:opacity-40"
          >
            <RotateCw className={`size-3.5 ${isRollingMix ? 'animate-spin text-accent' : ''}`} />
            <span>{t('listening.rollNewMix')}</span>
          </button>
        </div>

        {/* Mix Cards Grid */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {mixRandomSets.map((set) => (
            <div
              key={set.id}
              className="group flex flex-col justify-between rounded-2xl border border-line bg-surface-elevated/30 p-4 transition hover:border-accent/40 hover:bg-surface-elevated/60"
            >
              <div>
                <div className="flex items-center justify-between gap-1.5">
                  <span className="rounded-md bg-accent/15 px-2 py-0.5 text-[10px] font-black text-accent-strong">
                    {set.part}
                  </span>
                  <div className="flex items-center gap-1">
                    {set.hasVideo && (
                      <span className="flex items-center gap-1 rounded-md bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                        <Youtube className="size-3" /> Video
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="mt-2.5 line-clamp-2 text-xs font-extrabold text-content group-hover:text-accent-strong transition">
                  {set.title}
                </h3>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3">
                <span className="text-[11px] font-medium text-content-muted">
                  {set.sentenceCount} {language === 'en' ? 'questions' : 'câu'}
                </span>
                <button
                  type="button"
                  onClick={() => handleStartPractice(set)}
                  className="btn-primary px-3 py-1.5 text-xs gap-1"
                >
                  <Play className="size-3 fill-current" />
                  <span>{t('listening.practiceNow')}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* View Mode Navigation Tabs */}
      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav
          id="tour-ls-tabs"
          aria-label={language === 'en' ? 'Listening mode filter' : 'Chế độ lọc bộ đề'}
          className="flex items-center overflow-x-auto rounded-2xl border border-line bg-surface p-1 shadow-sm w-fit"
        >
          {viewTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setViewMode(tab.key)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-extrabold transition sm:flex-none ${
                viewMode === tab.key
                  ? 'bg-accent text-accent-contrast shadow-sm'
                  : 'text-content-muted hover:text-content'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {viewMode !== 'difficulty' && (
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:w-64 sm:flex-none">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-content-muted" />
              <input
                type="text"
                placeholder={t('listening.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-xs font-semibold text-content outline-none transition focus:border-accent"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label={language === 'en' ? 'Clear search' : 'Xoá tìm kiếm'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-content-muted hover:text-content"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Toggle Chưa hoàn thành */}
            <label className="flex cursor-pointer select-none items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-bold text-content transition hover:bg-surface-hover">
              <input
                type="checkbox"
                checked={uncompletedOnly}
                onChange={(e) => setUncompletedOnly(e.target.checked)}
                className="size-3.5 rounded border-line text-accent accent-accent"
              />
              <span>{t('listening.uncompletedOnly')}</span>
            </label>
          </div>
        )}
      </section>

      {/* Main Tab Content */}
      {viewMode === 'difficulty' ? (
        <ListeningDifficultyTab />
      ) : (
        <>
          {/* Categories Horizontal Chips (Dynamic from DB) */}
          <section id="tour-ls-categories" className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSelectedTest(null);
                    setSelectedPart('all');
                  }}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition active:scale-95 ${
                    isSelected
                      ? 'border-accent bg-accent text-accent-contrast shadow-sm'
                      : 'border-line bg-surface text-content-muted hover:bg-surface-hover hover:text-content'
                  }`}
                >
                  <span>{cat.name}</span>
                  {cat.set_count > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-black tabular-nums ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-surface-elevated text-content-muted'
                      }`}
                    >
                      {cat.set_count}
                    </span>
                  )}
                </button>
              );
            })}
          </section>

          {/* Condition: ETS 2026 Category with 10 Tests Overview */}
          {selectedCategory === 'ets-2026' && selectedTest === null && !searchQuery.trim() ? (
            <div className="space-y-6">
              {/* Header Banner for 10 Tests */}
              <div className="rounded-3xl border border-line bg-gradient-to-br from-surface via-surface to-accent/5 p-6 sm:p-7 shadow-sm">
                <div className="flex flex-col gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-accent-strong w-fit">
                    <Layers3 className="size-3.5" />
                    <span>{language === 'en' ? 'TOEIC ETS 2026 Exam Sets' : 'Bộ đề thi TOEIC ETS 2026'}</span>
                  </div>
                  <h2 className="text-xl font-black tracking-tight sm:text-2xl text-content">
                    {language === 'en' ? 'Full 10 ETS 2026 Tests (40 Comprehensive Practice Sets)' : 'Trọn bộ 10 Test ETS 2026 (40 bài luyện nghe toàn diện)'}
                  </h2>
                  <p className="text-xs sm:text-sm text-content-muted max-w-3xl leading-relaxed">
                    {language === 'en'
                      ? 'Each test contains 4 standard TOEIC Listening practice sets (Part 1: 24 photo questions, Part 2: 100 Q&A questions, Part 3: 13 conversations, Part 4: 10 short talks). Select a test below to start interactive dictation.'
                      : 'Mỗi đề gồm trọn vẹn 4 bài luyện tập theo Part chuẩn TOEIC Listening (Part 1: 24 câu miêu tả tranh, Part 2: 100 câu hỏi & đáp, Part 3: 13 đoạn hội thoại, Part 4: 10 bài nói). Chọn đề bên dưới để bắt đầu luyện tập tương tác và chấm điểm tự động.'}
                  </p>
                </div>
              </div>

              {/* 10 Tests Grid */}
              {isLoadingTests ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <BoneyardSkeleton key={i} name={`test-card-${i}`} height={240} className="rounded-3xl" />
                  ))}
                </div>
              ) : testsSummary.length === 0 ? (
                <div className="rounded-3xl border border-line bg-surface py-16 text-center">
                  <Layers3 className="mx-auto size-10 text-content-muted opacity-40" />
                  <h3 className="mt-3 text-base font-extrabold text-content">
                    {language === 'en' ? 'Loading test list...' : 'Đang tải danh sách 10 đề thi...'}
                  </h3>
                </div>
              ) : (
                <div id="tour-ls-tests" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                  {testsSummary.map((test) => (
                    <article
                      key={test.testNumber}
                      onClick={() => {
                        setSelectedTest(test.testNumber);
                        setSelectedPart('all');
                      }}
                      className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-sm transition hover:border-accent/60 hover:shadow-md cursor-pointer active:scale-[0.99]"
                    >
                      <div>
                        {/* Top row: Badge + Set count */}
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 rounded-xl bg-accent/15 px-3 py-1 text-xs font-black text-accent-strong">
                            <Layers3 className="size-3.5" />
                            <span>Test {test.testNumber.toString().padStart(2, '0')}</span>
                          </span>
                          <span className="text-xs font-extrabold text-content-muted">
                            {test.setCount} {language === 'en' ? 'practice sets' : 'bài luyện tập'}
                          </span>
                        </div>

                        {/* Title & Description */}
                        <h3 className="mt-4 text-lg font-black text-content group-hover:text-accent-strong transition">
                          {test.title} • TOEIC ETS 2026
                        </h3>
                        <p className="mt-1 text-xs text-content-muted">
                          {language === 'en'
                            ? `Total ${test.sentenceCount} questions for dictation & audio reflex`
                            : `Tổng cộng ${test.sentenceCount} câu luyện chép chính tả & phản xạ âm thanh`}
                        </p>

                        {/* Part count chips */}
                        <div className="mt-4 grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
                          <span className="rounded-lg border border-line bg-surface-elevated/40 px-2.5 py-1 text-[11px] font-bold text-content-muted">
                            Part 1: <strong className="text-content font-extrabold">{language === 'en' ? '24 Qs' : '24 câu'}</strong>
                          </span>
                          <span className="rounded-lg border border-line bg-surface-elevated/40 px-2.5 py-1 text-[11px] font-bold text-content-muted">
                            Part 2: <strong className="text-content font-extrabold">{language === 'en' ? '100 Qs' : '100 câu'}</strong>
                          </span>
                          <span className="rounded-lg border border-line bg-surface-elevated/40 px-2.5 py-1 text-[11px] font-bold text-content-muted">
                            Part 3: <strong className="text-content font-extrabold">{language === 'en' ? '13 dialogues' : '13 đoạn'}</strong>
                          </span>
                          <span className="rounded-lg border border-line bg-surface-elevated/40 px-2.5 py-1 text-[11px] font-bold text-content-muted">
                            Part 4: <strong className="text-content font-extrabold">{language === 'en' ? '10 talks' : '10 bài nói'}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Progress and CTA */}
                      <div className="mt-6 space-y-3.5 border-t border-line/60 pt-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-content-muted">{language === 'en' ? 'Progress' : 'Tiến độ'}</span>
                            <span className="font-extrabold tabular-nums text-content">
                              {test.completionRate}% ({test.completedSets}/{test.setCount} {language === 'en' ? 'sets' : 'bài'})
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated">
                            <div
                              className="h-full bg-accent transition-all duration-300"
                              style={{ width: `${Math.min(100, test.completionRate)}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs font-semibold text-content-muted group-hover:text-content transition">
                            {test.setCount} {language === 'en' ? 'sets' : 'bài'} ({test.sentenceCount} {language === 'en' ? 'questions' : 'câu'})
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-extrabold text-accent-strong group-hover:translate-x-1 transition-transform">
                            <span>{language === 'en' ? 'Start Practice' : 'Vào luyện tập'}</span>
                            <ArrowRight className="size-3.5" />
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div ref={setsSectionRef} className="space-y-4">
              {/* Test Drill-down Navigation Header (when a test is selected in ETS 2026) */}
              {selectedCategory === 'ets-2026' && selectedTest !== null && (
                <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTest(null);
                        setSelectedPart('all');
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-elevated/40 px-3 py-2 text-xs font-bold text-content transition hover:border-accent hover:bg-surface-hover active:scale-95"
                    >
                      <ArrowLeft className="size-3.5" />
                      <span>{t('listening.backToTests')}</span>
                    </button>
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <span className="text-content-muted">ETS 2026</span>
                      <span className="text-content-muted">/</span>
                      <span className="rounded-lg bg-accent/15 px-2.5 py-1 text-accent-strong">
                        Test {selectedTest}
                      </span>
                    </div>
                  </div>

                  {/* Quick Switcher for Test 1 - 10 */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((tNum) => (
                      <button
                        key={tNum}
                        type="button"
                        onClick={() => {
                          setSelectedTest(tNum);
                          setSelectedPart('all');
                        }}
                        className={`rounded-lg px-2.5 py-1 text-xs font-extrabold transition ${
                          selectedTest === tNum
                            ? 'bg-accent text-accent-contrast shadow-sm'
                            : 'border border-line bg-surface-elevated/30 text-content-muted hover:text-content hover:bg-surface-hover'
                        }`}
                      >
                        T{tNum}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Part Filter Tabs (if inside ETS 2026 with a test selected) */}
              {selectedCategory === 'ets-2026' && selectedTest !== null && (
                <div id="tour-ls-parts" className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {partOptions.map((partOpt) => {
                    const isPartSelected = selectedPart === partOpt.key;
                    return (
                      <button
                        key={partOpt.key}
                        type="button"
                        onClick={() => setSelectedPart(partOpt.key)}
                        className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                          isPartSelected
                            ? 'border-accent bg-accent text-accent-contrast shadow-sm'
                            : 'border-line bg-surface text-content-muted hover:bg-surface-hover hover:text-content'
                        }`}
                      >
                        <span>{partOpt.label}</span>
                        <span
                          className={`rounded-full px-1.5 py-0.2 text-[10px] font-black tabular-nums ${
                            isPartSelected ? 'bg-white/20 text-white' : 'bg-surface-elevated text-content-muted'
                          }`}
                        >
                          {partOpt.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Search results banner if searching in ETS 2026 overview */}
              {selectedCategory === 'ets-2026' && selectedTest === null && searchQuery.trim() && (
                <div className="flex items-center justify-between rounded-2xl border border-line bg-surface p-3.5 shadow-sm">
                  <span className="text-xs font-bold text-content">
                    {language === 'en' ? 'Search results for: ' : 'Kết quả tìm kiếm cho: '}
                    <strong className="text-accent-strong">"{searchQuery}"</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-xs font-bold text-accent-strong hover:underline"
                  >
                    {language === 'en' ? 'Clear search (Back to 10 Tests)' : 'Xoá tìm kiếm (Quay lại 10 Test)'}
                  </button>
                </div>
              )}

              {/* Sets Grid */}
              {isLoading ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: Math.min(pageSize, 12) }).map((_, i) => (
                    <BoneyardSkeleton key={i} name={`set-card-${i}`} height={220} className="rounded-2xl" />
                  ))}
                </div>
              ) : sets.length === 0 ? (
                <div className="rounded-3xl border border-line bg-surface py-16 text-center">
                  <Headphones className="mx-auto size-10 text-content-muted opacity-40" />
                  <h3 className="mt-3 text-base font-extrabold text-content">{t('listening.noSetsFound')}</h3>
                  <p className="mt-1 text-xs text-content-muted">
                    {t('listening.noSetsDesc')}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div id="tour-ls-grid" className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {sets.map((set) => {
                      return (
                        <article
                          key={set.id}
                          className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-sm transition hover:border-accent/40 hover:shadow-md"
                        >
                          <div>
                            {/* Top badges: Part + Difficulty + Video */}
                            <div className="flex flex-wrap items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="rounded-lg bg-accent/15 px-2.5 py-0.5 text-xs font-black text-accent-strong">
                                  {set.part}
                                </span>
                                <CellSignalBars
                                  level={set.difficultyLevel ?? (set.difficulty === 'easy' ? 2 : set.difficulty === 'hard' ? 4 : 3)}
                                  showLabel
                                />
                              </div>

                              <div className="flex items-center gap-1.5">
                                {set.hasVideo && (
                                  <span className="flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                                    <Youtube className="size-3" /> Video
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Title & Description */}
                            <h2 className="mt-3.5 text-base font-extrabold text-content transition group-hover:text-accent-strong">
                              {set.title}
                            </h2>
                            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-content-muted">
                              {set.description || (language === 'en' ? 'Curated listening practice set with interactive exercises and automatic scoring.' : 'Bộ bài luyện nghe chọn lọc kèm bài tập tương tác và chấm điểm tự động.')}
                            </p>
                          </div>

                          {/* Bottom Section: Progress + Action Buttons */}
                          <div className="mt-5 space-y-3.5 border-t border-line/60 pt-4">
                            {/* Progress Indicator */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-content-muted">{t('listening.completionRate')}</span>
                                <span className="font-extrabold tabular-nums text-content">
                                  {set.completionRate}% ({set.sentenceCount} {language === 'en' ? 'questions' : 'câu'})
                                </span>
                              </div>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated">
                                <div
                                  className="h-full bg-accent transition-all duration-300"
                                  style={{ width: `${Math.min(100, set.completionRate)}%` }}
                                />
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenNotes(set)}
                                title={language === 'en' ? 'Review saved vocabulary and notes' : 'Xem lại các từ vựng và ghi chú đã lưu'}
                                className="inline-flex items-center gap-1 rounded-xl border border-line px-2.5 py-2 text-xs font-bold text-content-muted transition hover:bg-surface-hover hover:text-content active:scale-95"
                              >
                                <BookMarked className="size-3.5" />
                                <span>{t('listening.notes')}{set.notesCount ? ` (${set.notesCount})` : ''}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleStartPractice(set)}
                                className="btn-primary gap-1.5 text-xs px-3.5 py-2"
                              >
                                <Play className="size-3.5 fill-current" />
                                <span>{set.completionRate > 0 && set.completionRate < 100 ? t('listening.continuePractice') : t('listening.practice')}</span>
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  {/* Pagination Control */}
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalItems={totalSets}
                    pageSize={pageSize}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                    pageSizeOptions={[12, 24, 36]}
                    itemName={language === 'en' ? 'listening sets' : 'bài nghe'}
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}


      {/* Notes Modal */}
      {activeNotesSet && (
        <ListeningNotesModal
          isOpen={notesModalOpen}
          onClose={() => setNotesModalOpen(false)}
          setId={activeNotesSet.id}
          setTitle={activeNotesSet.title}
        />
      )}
    </div>
  );
};
export default ListeningListPage;
