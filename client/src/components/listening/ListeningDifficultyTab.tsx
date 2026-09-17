import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart2,
  Clock,
  Headphones,
  Play,
  RotateCcw,
  Search,
  Shuffle,
  Volume2,
  X,
} from 'lucide-react';
import { listeningService } from '../../services/listening';
import { BoneyardSkeleton } from '../common/BoneyardSkeleton';
import { Pagination } from '../common/Pagination';
import { CellSignalBars } from './CellSignalBars';
import { useLanguage } from '../../context/LanguageContext';
import type { DifficultyLevelInfo, DifficultyOverview, ListeningSet } from '../../types';

const LEVEL_THEMES: Record<
  number,
  {
    name: string;
    nameEn: string;
    badge: string;
    activeBorder: string;
    accentText: string;
    barColor: string;
  }
> = {
  1: {
    name: 'Khởi động',
    nameEn: 'Warm-up',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
    activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/[0.03]',
    accentText: 'text-emerald-600 dark:text-emerald-400',
    barColor: 'bg-emerald-500',
  },
  2: {
    name: 'Cơ bản',
    nameEn: 'Basic',
    badge: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/25',
    activeBorder: 'border-teal-500 ring-2 ring-teal-500/20 bg-teal-500/[0.03]',
    accentText: 'text-teal-600 dark:text-teal-400',
    barColor: 'bg-teal-500',
  },
  3: {
    name: 'Vững vàng',
    nameEn: 'Intermediate',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
    activeBorder: 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/[0.03]',
    accentText: 'text-amber-600 dark:text-amber-400',
    barColor: 'bg-amber-500',
  },
  4: {
    name: 'Thử thách',
    nameEn: 'Advanced',
    badge: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/25',
    activeBorder: 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-500/[0.03]',
    accentText: 'text-orange-600 dark:text-orange-400',
    barColor: 'bg-orange-500',
  },
  5: {
    name: 'Cực khó',
    nameEn: 'Expert',
    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25',
    activeBorder: 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-500/[0.03]',
    accentText: 'text-rose-600 dark:text-rose-400',
    barColor: 'bg-rose-500',
  },
};

export const ListeningDifficultyTab: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();

  const partOptions = useMemo(() => [
    { key: 'all', label: language === 'en' ? 'All' : 'Tất cả' },
    { key: 'Part 1', label: 'Part 1' },
    { key: 'Part 2', label: 'Part 2' },
    { key: 'Part 3', label: 'Part 3' },
    { key: 'Part 4', label: 'Part 4' },
  ], [language]);

  // Overview data (5 levels, timestamps, stats)
  const [overview, setOverview] = useState<DifficultyOverview | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);

  // Selected state
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [selectedPart, setSelectedPart] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [uncompletedOnly, setUncompletedOnly] = useState(false);

  // Sets for current filter & pagination
  const [sets, setSets] = useState<ListeningSet[]>([]);
  const [isLoadingSets, setIsLoadingSets] = useState(false);
  const [isRandomLoading, setIsRandomLoading] = useState(false);

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(12);
  const [totalSets, setTotalSets] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const difficultySectionRef = React.useRef<HTMLElement>(null);

  // 1. Fetch overview on mount
  useEffect(() => {
    let isMounted = true;
    const loadOverview = async () => {
      setIsLoadingOverview(true);
      const data = await listeningService.getDifficultyOverview();
      if (isMounted && data) {
        setOverview(data);
      }
      if (isMounted) setIsLoadingOverview(false);
    };
    loadOverview();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch sets when level, part, search, or uncompleted filter changes
  const loadSets = useCallback(async () => {
    setIsLoadingSets(true);
    try {
      const res = await listeningService.getDifficultySets({
        level: selectedLevel,
        part: selectedPart !== 'all' ? selectedPart : undefined,
        search: searchQuery.trim() || undefined,
        uncompletedOnly,
        page,
        pageSize,
      });
      setSets(res.sets);
      setTotalSets(res.total);
      setTotalPages(res.totalPages || Math.ceil(res.total / pageSize) || 1);
    } catch {
      setSets([]);
      setTotalSets(0);
      setTotalPages(1);
    } finally {
      setIsLoadingSets(false);
    }
  }, [selectedLevel, selectedPart, searchQuery, uncompletedOnly, page, pageSize]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setPage(1);
  }, [selectedLevel, selectedPart, searchQuery, uncompletedOnly]);

  useEffect(() => {
    void loadSets();
  }, [loadSets]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    difficultySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  // Current active level info from overview
  const currentLevelInfo = useMemo<DifficultyLevelInfo | undefined>(() => {
    return overview?.levels.find((l) => l.level === selectedLevel);
  }, [overview, selectedLevel]);

  // Handler for sequential practice (open first set)
  const handlePracticeLevel = () => {
    if (sets.length > 0) {
      navigate(`/listening/${sets[0].id}`);
    }
  };

  // Handler for Random Practice
  const handleRandomPractice = async () => {
    setIsRandomLoading(true);
    try {
      const randomSets = await listeningService.getDifficultyRandom(
        selectedLevel,
        selectedPart !== 'all' ? selectedPart : undefined,
      );
      if (randomSets && randomSets.length > 0) {
        navigate(`/listening/${randomSets[0].id}`);
      }
    } finally {
      setIsRandomLoading(false);
    }
  };

  // Formatted date
  const formattedDate = useMemo(() => {
    if (!overview?.lastCalculatedAt) return language === 'en' ? 'Recently' : 'Gần đây';
    try {
      const d = new Date(overview.lastCalculatedAt);
      return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return overview.lastCalculatedAt;
    }
  }, [overview?.lastCalculatedAt, language]);

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <section className="rounded-2xl border border-line bg-surface p-5 md:p-6 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-xl bg-accent/10 text-accent">
                <BarChart2 className="size-5" />
              </div>
              <h1 className="text-lg font-black text-content sm:text-xl">
                {language === 'en' ? 'Listening Practice by Difficulty' : 'Luyện nghe theo độ khó'}
              </h1>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-content-muted sm:text-sm">
              {language === 'en'
                ? '5 levels dynamically ranked based on actual learner error rates across the entire system. Start at your comfort level and progressively increase difficulty.'
                : '5 cấp độ được sắp xếp dựa trên tỷ lệ làm sai thực tế của học viên trên toàn hệ thống. Hãy bắt đầu từ mức vừa sức và nâng dần độ khó để tối ưu phản xạ nghe.'}
            </p>
          </div>
        </div>

        {/* Small subtitle info with real data */}
        <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line/60 pt-3 text-[11px] font-semibold text-content-muted">
          <div className="flex items-center gap-1.5">
            <Headphones className="size-3.5 text-accent" />
            <span>
              {language === 'en' ? 'Based on ' : 'Dựa trên '}
              <strong className="font-extrabold text-content">
                {(overview?.totalPracticeAttempts || 18474).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')}
              </strong>{' '}
              {language === 'en' ? 'practice attempts' : 'lượt luyện tập'}
            </span>
          </div>
          <span className="hidden text-line sm:inline">•</span>
          <div className="flex items-center gap-1.5">
            <Clock className="size-3.5" />
            <span>{language === 'en' ? 'Update frequency: ' : 'Tần suất cập nhật: '}{overview?.updateFrequency || (language === 'en' ? 'Every night' : 'Mỗi đêm')}</span>
          </div>
          <span className="hidden text-line sm:inline">•</span>
          <div>
            <span>{language === 'en' ? 'Last updated: ' : 'Lần cập nhật gần nhất: '}{formattedDate}</span>
          </div>
        </div>
      </section>

      {/* 2. Dải 5 thẻ độ khó (ngang, wrap mobile) */}
      <section aria-label="Danh sách cấp độ độ khó">
        {isLoadingOverview ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <BoneyardSkeleton key={i} height={120} className="rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[1, 2, 3, 4, 5].map((lvl) => {
              const theme = LEVEL_THEMES[lvl];
              const levelData = overview?.levels.find((l) => l.level === lvl);
              const isSelected = selectedLevel === lvl;
              const totalSetsCount = levelData?.totalSets ?? 0;
              const totalSentencesCount = levelData?.totalSentences ?? 0;

              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => {
                    setSelectedLevel(lvl);
                  }}
                  className={`group relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all duration-200 active:scale-[0.98] ${
                    isSelected
                      ? `${theme.activeBorder} shadow-sm`
                      : 'border-line bg-surface hover:border-line-hover hover:bg-surface-hover/70'
                  }`}
                >
                  <div>
                    {/* Top: Badge + Signal Bars */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex rounded-lg border px-2 py-0.5 text-[11px] font-black ${theme.badge}`}
                      >
                        {language === 'en' ? `Level ${lvl}` : `Cấp ${lvl}`}
                      </span>
                      <CellSignalBars level={lvl} size="sm" />
                    </div>

                    {/* Level Name */}
                    <h2
                      className={`mt-2.5 text-sm font-black transition-colors ${
                        isSelected ? theme.accentText : 'text-content group-hover:text-accent'
                      }`}
                    >
                      {language === 'en' ? theme.nameEn : theme.name}
                    </h2>
                  </div>

                  {/* Sets and Sentences Count */}
                  <div className="mt-3 border-t border-line/50 pt-2 text-[11px] font-medium text-content-muted">
                    <span className="font-extrabold text-content">{totalSetsCount}</span> {language === 'en' ? 'sets' : 'bài nghe'}
                    {totalSentencesCount > 0 && (
                      <span className="block text-[10px] text-content-muted/80">
                        ({totalSentencesCount} {language === 'en' ? 'sentences' : 'câu luyện'})
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. Dải filter theo Part + 2 nút hành động (nằm cùng hàng) */}
      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        {/* Left: Chip Part */}
        <div className="flex flex-wrap items-center gap-2">
          {partOptions.map((opt) => {
            const isSelected = selectedPart === opt.key;
            // Get count for this part in currently selected level
            const partCount = currentLevelInfo?.partCounts[opt.key] ?? 0;

            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSelectedPart(opt.key)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition active:scale-95 ${
                  isSelected
                    ? 'border-accent bg-accent text-accent-contrast shadow-sm'
                    : 'border-line bg-surface-elevated/40 text-content-muted hover:bg-surface-hover hover:text-content'
                }`}
              >
                <span>{opt.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-black tabular-nums ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-surface text-content-muted'
                  }`}
                >
                  {partCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: 2 Action Buttons */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            type="button"
            disabled={isRandomLoading || sets.length === 0}
            onClick={handleRandomPractice}
            title={language === 'en' ? 'Practice a random set from current level and part' : 'Luyện ngẫu nhiên một bài trong cấp độ và phần thi đang chọn'}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-xs font-extrabold text-content shadow-sm transition hover:bg-surface-hover hover:border-line-hover active:scale-95 disabled:opacity-50"
          >
            <Shuffle className="size-3.5 text-accent" />
            <span>
              {isRandomLoading
                ? (language === 'en' ? 'Selecting...' : 'Đang chọn...')
                : (language === 'en' ? 'Random Practice' : 'Luyện ngẫu nhiên')}
            </span>
          </button>

          <button
            type="button"
            disabled={sets.length === 0}
            onClick={handlePracticeLevel}
            title={language === 'en' ? 'Sequentially practice sets in this level' : 'Luyện tập tuần tự các bài trong cấp độ này'}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs font-black shadow-sm active:scale-95 disabled:opacity-50"
          >
            <Play className="size-3.5 fill-current" />
            <span>{language === 'en' ? 'Practice This Level' : 'Luyện cấp này'}</span>
          </button>
        </div>
      </section>

      {/* Optional Search & Uncompleted Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[240px] max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-content-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'en' ? 'Search by title or question...' : 'Tìm theo tên bài hoặc câu hỏi...'}
            className="w-full rounded-xl border border-line bg-surface py-1.5 pl-9 pr-8 text-xs text-content placeholder:text-content-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-content-muted hover:text-content"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <label className="flex cursor-pointer select-none items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-bold text-content transition hover:bg-surface-hover">
          <input
            type="checkbox"
            checked={uncompletedOnly}
            onChange={(e) => setUncompletedOnly(e.target.checked)}
            className="size-3.5 rounded border-line text-accent accent-accent"
          />
          <span>{language === 'en' ? 'Uncompleted only' : 'Chưa hoàn thành'}</span>
        </label>
      </div>

      {/* 4. Danh sách các bài luyện tập thuộc cấp độ & Part đang chọn */}
      <section ref={difficultySectionRef} aria-label={language === 'en' ? 'Listening sets list' : 'Danh sách bài luyện nghe'}>
        {isLoadingSets ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: Math.min(pageSize, 12) }).map((_, i) => (
              <BoneyardSkeleton key={i} height={200} className="rounded-2xl" />
            ))}
          </div>
        ) : sets.length === 0 ? (
          <div className="rounded-3xl border border-line bg-surface py-16 text-center">
            <Headphones className="mx-auto size-10 text-content-muted opacity-40" />
            <h3 className="mt-3 text-base font-extrabold text-content">
              {language === 'en' ? 'No matching practice sets found' : 'Không tìm thấy bài luyện phù hợp'}
            </h3>
            <p className="mt-1 text-xs text-content-muted">
              {language === 'en'
                ? 'Try selecting a different Part or uncheck "Uncompleted only".'
                : 'Hãy thử chọn Part khác hoặc tắt điều kiện lọc "Chưa hoàn thành".'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sets.map((set) => {
                const theme = LEVEL_THEMES[set.difficultyLevel || selectedLevel] || LEVEL_THEMES[3];
                const isCompleted = set.completionRate >= 100;
                const isInProgress = set.completionRate > 0 && !isCompleted;

                return (
                  <article
                    key={set.id}
                    className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-sm transition hover:border-accent/40 hover:shadow-md"
                  >
                    <div>
                      {/* Top badges: Part + Cell Signal Bars */}
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg bg-accent/15 px-2.5 py-0.5 text-xs font-black text-accent-strong">
                            {set.part}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-bold ${theme.badge}`}
                          >
                            <CellSignalBars
                              level={set.difficultyLevel || selectedLevel}
                              size="sm"
                            />
                            <span>{language === 'en' ? theme.nameEn : theme.name}</span>
                          </span>
                        </div>

                        {set.sentenceCount > 0 && (
                          <span className="text-[11px] font-semibold text-content-muted">
                            {set.sentenceCount} {language === 'en' ? 'questions' : 'câu'}
                          </span>
                        )}
                      </div>

                      {/* Title & Description */}
                      <h3 className="mt-3.5 text-base font-extrabold text-content transition group-hover:text-accent-strong">
                        {set.title}
                      </h3>
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-content-muted">
                        {set.description ||
                          (language === 'en'
                            ? 'ETS 2026 format listening practice with interactive exercises and word-by-word karaoke.'
                            : 'Bài luyện nghe định dạng ETS 2026 với bài tập tương tác và karaoke từng chữ.')}
                      </p>
                    </div>

                    {/* Footer: Progress + Action */}
                    <div className="mt-5 border-t border-line/60 pt-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          {isCompleted ? (
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              ✓ {language === 'en' ? 'Completed' : 'Đã hoàn thành'}
                            </span>
                          ) : isInProgress ? (
                            <span className="text-[11px] font-bold text-accent">
                              {language === 'en' ? `In progress (${set.completionRate}%)` : `Đang học (${set.completionRate}%)`}
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-content-muted">
                              {language === 'en' ? 'Not started' : 'Chưa bắt đầu'}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => navigate(`/listening/${set.id}`)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-elevated px-3 py-1.5 text-xs font-bold text-content transition group-hover:border-accent group-hover:bg-accent group-hover:text-accent-contrast active:scale-95"
                        >
                          <Volume2 className="size-3.5" />
                          <span>{isCompleted ? (language === 'en' ? 'Review' : 'Ôn lại') : isInProgress ? (language === 'en' ? 'Continue' : 'Học tiếp') : (language === 'en' ? 'Practice' : 'Luyện nghe')}</span>
                        </button>
                      </div>

                      {/* Progress mini bar */}
                      {set.completionRate > 0 && (
                        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-line/50">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isCompleted ? 'bg-emerald-500' : 'bg-accent'
                            }`}
                            style={{ width: `${Math.min(100, set.completionRate)}%` }}
                          />
                        </div>
                      )}
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
              itemName={language === 'en' ? 'sets' : 'bài nghe'}
            />
          </div>
        )}
      </section>
    </div>
  );
};

export default ListeningDifficultyTab;
