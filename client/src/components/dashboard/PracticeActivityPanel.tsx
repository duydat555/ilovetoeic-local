import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Database,
  Headphones,
  RefreshCw,
  Search,
} from 'lucide-react';
import { backendService } from '../../services/backend';
import { StudyActivityDay } from '../../types';
import { BoneyardSkeleton } from '../common/BoneyardSkeleton';

type Period = 'day' | 'month' | 'year';

const PART_NAMES: Record<number, string> = {
  1: 'Mô tả tranh',
  2: 'Hỏi & đáp',
  3: 'Hội thoại',
  4: 'Bài nói ngắn',
  5: 'Hoàn thành câu',
  6: 'Hoàn thành đoạn văn',
  7: 'Đọc hiểu',
};

const WEEKDAYS = ['T2', '', 'T4', '', 'T6', '', 'CN'];
const PERIODS: Array<{ value: Period; label: string }> = [
  { value: 'day', label: 'Ngày' },
  { value: 'month', label: 'Tháng' },
  { value: 'year', label: 'Năm' },
];

const localDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseLocalDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatPeriodLabel = (period: Period, selectedDate: string) => {
  const date = parseLocalDate(selectedDate);
  if (period === 'day') {
    return new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  }
  if (period === 'month') {
    return new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(date);
  }
  return `Năm ${date.getFullYear()}`;
};

const shiftPeriod = (dateKey: string, period: Period, amount: number) => {
  const date = parseLocalDate(dateKey);
  if (period === 'day') date.setDate(date.getDate() + amount);
  if (period === 'month') date.setMonth(date.getMonth() + amount, 1);
  if (period === 'year') date.setFullYear(date.getFullYear() + amount, 0, 1);
  return localDateKey(date);
};

const cellColor = (questions: number, maxQuestions: number) => {
  if (questions === 0) return 'border-line bg-surface-elevated';
  const ratio = questions / Math.max(1, maxQuestions);
  if (ratio <= 0.25) return 'border-amber-200 bg-amber-200 dark:border-amber-900 dark:bg-amber-900/70';
  if (ratio <= 0.5) return 'border-amber-300 bg-amber-400 dark:border-amber-700 dark:bg-amber-700';
  if (ratio <= 0.75) return 'border-brand-500 bg-brand-500 dark:border-brand-500 dark:bg-brand-500';
  return 'border-orange-600 bg-orange-600 dark:border-orange-400 dark:bg-orange-500';
};

interface PracticeActivityPanelProps {
  studentId?: string;
  studentName?: string;
}

export const PracticeActivityPanel: React.FC<PracticeActivityPanelProps> = ({ studentId, studentName }) => {
  const [period, setPeriod] = useState<Period>('month');
  const [selectedDate, setSelectedDate] = useState(() => localDateKey(new Date()));
  const [days, setDays] = useState<StudyActivityDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');
  const lastAutomaticRefreshAt = useRef(0);
  const selectedYear = parseLocalDate(selectedDate).getFullYear();

  const loadActivity = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await backendService.getStudyActivity(selectedYear, studentId);
      setDays(response.data);
      setUpdatedAt(response.updatedAt);
      setError('');
    } catch {
      setError('Không thể tải lịch luyện tập từ database.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedYear, studentId]);

  useEffect(() => {
    void loadActivity(false);
  }, [loadActivity]);

  useEffect(() => {
    const refresh = () => {
      const now = Date.now();
      // Browsers normally emit both focus and visibilitychange when returning
      // to a tab. Treat them as one refresh to avoid duplicate state updates.
      if (now - lastAutomaticRefreshAt.current < 2_000) return;
      lastAutomaticRefreshAt.current = now;
      void loadActivity(true);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const interval = window.setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [loadActivity]);

  const dayMap = useMemo(() => new Map(days.map((day) => [day.date, day])), [days]);
  const filteredDays = useMemo(() => days.filter((day) => {
    if (period === 'day') return day.date === selectedDate;
    if (period === 'month') return day.date.slice(0, 7) === selectedDate.slice(0, 7);
    return day.date.startsWith(`${selectedYear}-`);
  }), [days, period, selectedDate, selectedYear]);

  const summary = useMemo(() => {
    const parts = Array.from({ length: 7 }, (_, index) => ({ part: index + 1, questions: 0 }));
    let totalQuestions = 0;
    let grammarQuestions = 0;
    let attempts = 0;
    let activeDays = 0;
    filteredDays.forEach((day) => {
      totalQuestions += day.totalQuestions;
      grammarQuestions += day.grammarQuestions || 0;
      attempts += day.attempts;
      if (day.totalQuestions > 0) activeDays += 1;
      day.parts.forEach((item) => {
        if (parts[item.part - 1]) parts[item.part - 1].questions += item.questions;
      });
    });
    return { parts, totalQuestions, grammarQuestions, attempts, activeDays };
  }, [filteredDays]);

  const calendar = useMemo(() => {
    const first = new Date(selectedYear, 0, 1);
    const last = new Date(selectedYear, 11, 31);
    const mondayOffset = (first.getDay() + 6) % 7;
    const cells: Array<{ key: string; date: string } | null> = Array(mondayOffset).fill(null);
    for (const cursor = new Date(first); cursor <= last; cursor.setDate(cursor.getDate() + 1)) {
      const date = localDateKey(cursor);
      cells.push({ key: date, date });
    }
    while (cells.length % 7) cells.push(null);
    const weeks = cells.length / 7;
    const monthLabels: Array<{ label: string; week: number }> = [];
    for (let month = 0; month < 12; month += 1) {
      const monthStart = new Date(selectedYear, month, 1);
      const dayOffset = Math.round((monthStart.getTime() - first.getTime()) / 86_400_000) + mondayOffset;
      monthLabels.push({ label: `T${month + 1}`, week: Math.floor(dayOffset / 7) });
    }
    return { cells, weeks, monthLabels };
  }, [selectedYear]);

  const maxQuestions = useMemo(
    () => Math.max(1, ...days.map((day) => day.totalQuestions)),
    [days],
  );
  const maxPartQuestions = Math.max(1, ...summary.parts.map((part) => part.questions));
  const nextPeriodIsFuture = shiftPeriod(selectedDate, period, 1) > localDateKey(new Date());

  return (
    <section className="rounded-2xl border border-line bg-surface p-4 shadow-xs dark:shadow-none sm:p-5">
      <div className="flex flex-col gap-4 border-b border-line pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-900/60 dark:bg-brand-500/10 dark:text-brand-300">
            <CalendarDays className="size-4.5" />
          </span>
          <div>
            <h2 className="text-base font-extrabold text-content">Chi tiết luyện tập</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-content-muted">
              Số câu đã trả lời theo từng Part, tổng hợp trực tiếp từ lịch sử luyện tập {studentName ? `của ${studentName}` : 'của bạn'}.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-surface-elevated p-1" aria-label="Chọn khoảng thời gian">
            {PERIODS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setPeriod(item.value)}
                className={`min-w-16 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  period === item.value
                    ? 'bg-surface text-brand-700 shadow-xs ring-1 ring-line dark:text-brand-300'
                    : 'text-content-muted hover:text-content'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void loadActivity(true)}
            disabled={refreshing}
            className="grid size-9 place-items-center rounded-xl border border-line text-content-muted transition hover:bg-surface-hover hover:text-content disabled:opacity-50"
            aria-label="Đồng bộ dữ liệu mới nhất"
            title="Đồng bộ dữ liệu mới nhất"
          >
            <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedDate((value) => shiftPeriod(value, period, -1))}
            className="grid size-9 place-items-center rounded-xl border border-line text-content-muted transition hover:bg-surface-hover hover:text-content"
            aria-label="Khoảng thời gian trước"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="min-w-52 text-center text-sm font-extrabold capitalize text-content">
            {formatPeriodLabel(period, selectedDate)}
          </div>
          <button
            type="button"
            onClick={() => setSelectedDate((value) => shiftPeriod(value, period, 1))}
            disabled={nextPeriodIsFuture}
            className="grid size-9 place-items-center rounded-xl border border-line text-content-muted transition hover:bg-surface-hover hover:text-content disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Khoảng thời gian sau"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <input
          type={period === 'day' ? 'date' : period === 'month' ? 'month' : 'number'}
          value={period === 'day' ? selectedDate : period === 'month' ? selectedDate.slice(0, 7) : selectedYear}
          max={period === 'day' ? localDateKey(new Date()) : period === 'month' ? localDateKey(new Date()).slice(0, 7) : new Date().getFullYear()}
          min={period === 'year' ? 2000 : undefined}
          onChange={(event) => {
            if (!event.target.value) return;
            if (period === 'day') setSelectedDate(event.target.value);
            else if (period === 'month') setSelectedDate(`${event.target.value}-01`);
            else setSelectedDate(`${event.target.value}-01-01`);
          }}
          className="h-9 rounded-xl border border-line bg-surface-elevated px-3 text-xs font-bold text-content outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/15"
          aria-label="Chọn thời gian cần xem"
        />
      </div>

      {error && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          <span>{error}</span>
          <button type="button" onClick={() => void loadActivity(false)} className="font-extrabold underline">Thử lại</button>
        </div>
      )}

      {loading ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-line bg-surface-elevated/45 p-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <BoneyardSkeleton key={index} name={`dashboard-part-stat-${index}`} height={66} className="rounded-xl border border-line" />
              ))}
            </div>
            <div className="mt-5 space-y-4">
              {Array.from({ length: 7 }, (_, index) => (
                <div key={index}>
                  <div className="flex justify-between gap-3">
                    <BoneyardSkeleton name={`dashboard-part-label-${index}`} variant="text" width="48%" />
                    <BoneyardSkeleton name={`dashboard-part-count-${index}`} variant="text" width={48} />
                  </div>
                  <BoneyardSkeleton name={`dashboard-part-bar-${index}`} height={6} className="mt-2 rounded-full" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-surface-elevated/45 p-4">
            <BoneyardSkeleton name="dashboard-calendar-title" variant="text" width="min(75%, 19rem)" />
            <BoneyardSkeleton name="dashboard-calendar-copy" variant="text" width="min(62%, 15rem)" className="mt-2" />
            <div className="mt-6 grid grid-cols-12 gap-1.5" aria-hidden="true">
              {Array.from({ length: 72 }, (_, index) => (
                <BoneyardSkeleton key={index} name={`dashboard-calendar-cell-${index}`} height={12} className="rounded-[3px]" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
          <div className="rounded-2xl border border-line bg-surface-elevated/45 p-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ['Câu đã làm', summary.totalQuestions],
                ['Câu Ngữ pháp', summary.grammarQuestions],
                ['Lượt làm', summary.attempts],
                ['Ngày hoạt động', summary.activeDays],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-line/70 bg-surface p-3">
                  <p className="text-lg font-black text-content sm:text-xl">{value}</p>
                  <p className="mt-0.5 text-[10px] font-bold leading-tight text-content-muted sm:text-[11px]">{label}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {summary.parts.map((item) => (
                <div key={item.part}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex min-w-0 items-center gap-2">
                      {item.part <= 4 ? <Headphones className="size-3.5 shrink-0 text-sky-500" /> : <Search className="size-3.5 shrink-0 text-emerald-500" />}
                      <span className="truncate font-bold text-content">Part {item.part} · {PART_NAMES[item.part]}</span>
                    </div>
                    <span className="shrink-0 font-black text-content">{item.questions} câu</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700">
                    <div
                      className={`h-full rounded-full transition-[width] duration-500 ${item.part <= 4 ? 'bg-sky-500' : 'bg-emerald-500'}`}
                      style={{ width: `${item.questions ? Math.max(5, (item.questions / maxPartQuestions) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-line bg-surface-elevated/45 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-content">Hoạt động {studentName ? `của ${studentName}` : 'của bạn'} trong năm {selectedYear}</h3>
                <p className="mt-0.5 text-[11px] text-content-muted">Chọn một ô để xem chi tiết của ngày đó.</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-content-muted">
                <Database className="size-3.5 text-emerald-500" />
                {refreshing ? 'Đang đồng bộ…' : updatedAt ? 'Đã đồng bộ' : 'Database'}
              </span>
            </div>

            <div className="mt-5 overflow-x-auto pb-2">
              <div className="min-w-max pl-7">
                <div
                  className="relative mb-1.5 h-4"
                  style={{ width: `${calendar.weeks * 15}px` }}
                  aria-hidden="true"
                >
                  {calendar.monthLabels.map((month) => (
                    <span
                      key={month.label}
                      className="absolute text-[9px] font-bold text-content-muted"
                      style={{ left: `${month.week * 15}px` }}
                    >
                      {month.label}
                    </span>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <div className="grid grid-rows-7 gap-[3px] pr-1 text-[9px] font-semibold leading-3 text-content-muted" aria-hidden="true">
                    {WEEKDAYS.map((label, index) => <span key={`${label}-${index}`} className="h-3">{label}</span>)}
                  </div>
                  <div
                    className="grid grid-flow-col grid-rows-7 gap-[3px]"
                    style={{ gridTemplateColumns: `repeat(${calendar.weeks}, 12px)` }}
                  >
                    {calendar.cells.map((cell, index) => {
                      if (!cell) return <span key={`blank-${index}`} className="size-3" />;
                      const activity = dayMap.get(cell.date);
                      const questions = activity?.totalQuestions || 0;
                      const grammarQuestions = activity?.grammarQuestions || 0;
                      const partText = activity?.parts.filter((item) => item.questions > 0).map((item) => `P${item.part}: ${item.questions}`).join(', ');
                      const dateLabel = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(parseLocalDate(cell.date));
                      return (
                        <button
                          key={cell.key}
                          type="button"
                          onClick={() => {
                            setSelectedDate(cell.date);
                            setPeriod('day');
                          }}
                          className={`size-3 rounded-[3px] border transition hover:z-10 hover:scale-125 focus:z-10 focus:outline-none focus:ring-2 focus:ring-brand-500 ${cellColor(questions, maxQuestions)} ${
                            cell.date === selectedDate ? 'ring-2 ring-brand-700 ring-offset-1 ring-offset-surface dark:ring-brand-300' : ''
                          }`}
                          title={`${dateLabel}: ${questions} câu${grammarQuestions ? ` · Ngữ pháp: ${grammarQuestions}` : ''}${partText ? ` · ${partText}` : ''}`}
                          aria-label={`${dateLabel}, ${questions} câu${grammarQuestions ? `, Ngữ pháp: ${grammarQuestions}` : ''}${partText ? `, ${partText}` : ''}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
              <p className="text-[10px] leading-relaxed text-content-muted">
                Mỗi ô là một ngày; màu đậm hơn nghĩa là số câu đã làm nhiều hơn.
              </p>
              <div className="flex items-center gap-1 text-[10px] font-semibold text-content-muted" aria-label="Thang cường độ hoạt động">
                <span>Ít</span>
                {[0, 0.2, 0.45, 0.7, 1].map((ratio, index) => (
                  <span key={ratio} className={`size-3 rounded-[3px] border ${cellColor(index === 0 ? 0 : ratio * maxQuestions, maxQuestions)}`} />
                ))}
                <span>Nhiều</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
