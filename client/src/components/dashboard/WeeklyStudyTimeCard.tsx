import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Flame,
  CheckCircle2,
  Target,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { studyTimeService, WeeklyStudyStats } from '../../services/backend';

interface WeeklyStudyTimeCardProps {
  onStreakUpdate?: (streak: number) => void;
}

export const WeeklyStudyTimeCard: React.FC<WeeklyStudyTimeCardProps> = () => {
  const { language } = useLanguage();
  const [stats, setStats] = useState<WeeklyStudyStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditingGoal, setIsEditingGoal] = useState<boolean>(false);
  const [selectedGoal, setSelectedGoal] = useState<number>(30);
  const [savingGoal, setSavingGoal] = useState<boolean>(false);

  const fetchStats = async () => {
    try {
      const res = await studyTimeService.getWeekly();
      if (res && res.success && res.data) {
        setStats(res.data);
        setSelectedGoal(res.data.dailyGoalMinutes || 30);
      }
    } catch (err) {
      console.warn('[WeeklyStudyTime] Failed to fetch weekly stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStats();
  }, []);

  const handleUpdateGoal = async (minutes: number) => {
    setSavingGoal(true);
    try {
      const res = await studyTimeService.updateDailyGoal(minutes);
      if (res && res.success) {
        setSelectedGoal(res.dailyGoalMinutes);
        setIsEditingGoal(false);
        await fetchStats();
      }
    } catch (err) {
      console.warn('[WeeklyStudyTime] Failed to update daily goal:', err);
    } finally {
      setSavingGoal(false);
    }
  };

  const formatMinutes = (totalMins: number) => {
    const hours = Math.floor(totalMins / 60);
    const mins = Math.round(totalMins % 60);
    if (hours > 0 && mins > 0) {
      return language === 'en' ? `${hours}h ${mins}m` : `${hours} giờ ${mins} phút`;
    }
    if (hours > 0) {
      return language === 'en' ? `${hours} hours` : `${hours} giờ`;
    }
    return language === 'en' ? `${mins} mins` : `${mins} phút`;
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-line bg-surface p-5 shadow-xs animate-pulse dark:shadow-none">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="h-5 w-40 rounded-lg bg-slate-200 dark:bg-surface-elevated" />
          <div className="h-7 w-24 rounded-full bg-slate-200 dark:bg-surface-elevated" />
        </div>
        <div className="mt-6 flex h-40 items-end justify-between gap-3 px-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex-1 space-y-2">
              <div className="h-28 rounded-t-xl bg-slate-200 dark:bg-surface-elevated" />
              <div className="h-3 mx-auto w-6 rounded bg-slate-200 dark:bg-surface-elevated" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const days = stats?.days || [];
  const dailyGoal = stats?.dailyGoalMinutes || 30;
  const maxMinutes = Math.max(
    dailyGoal * 1.5,
    ...days.map((d) => d.minutes),
    60
  );
  const totalWeeklyMinutes = stats?.weeklyTotalMinutes || 0;
  const todayStat = days.find((d) => d.isToday);
  const todayMinutes = todayStat ? todayStat.minutes : (stats?.todayMinutes || 0);
  const reachedDaysCount = days.filter((d) => d.isGoalReached).length;
  const todayPercent = Math.min(100, Math.round((todayMinutes / dailyGoal) * 100));

  return (
    <article
      id="tour-db-weekly-time"
      className="relative overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-xs transition hover:border-emerald-500/30 dark:shadow-none"
    >
      {/* Background soft glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-emerald-500/5 blur-3xl" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl border border-emerald-200/60 bg-emerald-50 text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-500/10 dark:text-emerald-400 shrink-0">
            <Clock className="size-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-content">
                {language === 'en' ? 'Weekly Study Time' : 'Thời gian học 7 ngày qua'}
              </h2>
              {reachedDaysCount >= 5 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                  <Flame className="size-3" />
                  {language === 'en' ? 'Super Diligent' : 'Chăm chỉ'}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-content-muted">
              {language === 'en'
                ? `Total this week: ${formatMinutes(totalWeeklyMinutes)}`
                : `Tổng tuần này: ${formatMinutes(totalWeeklyMinutes)}`}
            </p>
          </div>
        </div>

        {/* Goal Selector Dropdown / Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsEditingGoal((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-elevated px-3 py-1.5 text-xs font-bold text-content hover:bg-surface-hover transition-colors"
          >
            <Target className="size-3.5 text-emerald-500 shrink-0" />
            <span>
              {language === 'en' ? `Goal: ${dailyGoal}m/day` : `Mục tiêu: ${dailyGoal}p/ngày`}
            </span>
            <ChevronDown className="size-3 text-content-muted" />
          </button>

          {isEditingGoal && (
            <div className="absolute right-0 top-full z-20 mt-2 w-44 rounded-2xl border border-line bg-surface p-2 shadow-xl backdrop-blur-xl">
              <p className="px-2 py-1 text-[11px] font-bold text-content-muted">
                {language === 'en' ? 'Set daily goal:' : 'Chọn mục tiêu ngày:'}
              </p>
              {[15, 30, 45, 60, 90, 120].map((m) => (
                <button
                  key={m}
                  type="button"
                  disabled={savingGoal}
                  onClick={() => void handleUpdateGoal(m)}
                  className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-bold transition-colors ${
                    selectedGoal === m
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'text-content hover:bg-surface-hover'
                  }`}
                >
                  <span>{m} {language === 'en' ? 'minutes' : 'phút'}</span>
                  {selectedGoal === m && <CheckCircle2 className="size-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 7-Day Chart */}
      <div className="mt-6">
        <div className="relative flex h-44 items-end justify-between gap-2 sm:gap-4 px-1 sm:px-4">
          {/* Dashed Goal Line */}
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-emerald-500/40 z-0"
            style={{
              bottom: `${Math.min(95, Math.max(10, (dailyGoal / maxMinutes) * 140))}px`,
            }}
          >
            <span className="absolute -top-3.5 right-2 rounded-md bg-surface px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {dailyGoal}p
            </span>
          </div>

          {days.map((day) => {
            const heightPercent = Math.min(
              100,
              Math.max(6, (day.minutes / maxMinutes) * 100)
            );
            const isReached = day.isGoalReached;
            const isToday = day.isToday;

            return (
              <div
                key={day.date}
                className="group relative flex flex-1 flex-col items-center z-10"
              >
                {/* Tooltip on hover */}
                <div className="pointer-events-none absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity z-20 whitespace-nowrap rounded-lg border border-line bg-surface-elevated px-2 py-1 text-[10px] font-black text-content shadow-lg">
                  {day.minutes} {language === 'en' ? 'min' : 'phút'} ({day.date.slice(5)})
                </div>

                {/* Bar */}
                <div className="w-full flex justify-center items-end h-36">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPercent}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className={`w-full max-w-[28px] sm:max-w-[36px] rounded-t-xl transition-all ${
                      isReached
                        ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-xs shadow-emerald-500/20'
                        : day.minutes > 0
                        ? 'bg-gradient-to-t from-slate-300 to-slate-200 dark:from-slate-700 dark:to-slate-600'
                        : 'bg-slate-100 dark:bg-surface-elevated/50'
                    } ${
                      isToday
                        ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-surface'
                        : ''
                    }`}
                  />
                </div>

                {/* Day Label */}
                <div className="mt-2 text-center">
                  <span
                    className={`block text-xs font-black ${
                      isToday
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : isReached
                        ? 'text-content'
                        : 'text-content-muted'
                    }`}
                  >
                    {day.dayOfWeek}
                  </span>
                  <span className="block text-[9px] font-medium text-slate-400">
                    {day.date.slice(8, 10)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Footer */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 rounded-2xl border border-line/60 bg-surface-elevated/40 p-3.5">
        <div className="flex items-center gap-3">
          <div className="relative grid size-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
            <Sparkles className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-content">
                {language === 'en' ? 'Today\'s Progress' : 'Tiến độ hôm nay'}
              </span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                {todayMinutes} / {dailyGoal}p ({todayPercent}%)
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-surface-hover">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${todayPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 sm:border-l sm:border-line sm:pl-4">
          <div className="text-left sm:text-right">
            <p className="text-xs font-bold text-content">
              {language === 'en' ? 'Goals Reached' : 'Số ngày đạt mục tiêu'}
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-content-muted">
              {language === 'en'
                ? `${reachedDaysCount} of 7 days this week`
                : `${reachedDaysCount} trên 7 ngày trong tuần`}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/10 px-2.5 py-1 text-xs font-black text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="size-3.5" />
            {reachedDaysCount}/7
          </span>
        </div>
      </div>
    </article>
  );
};
