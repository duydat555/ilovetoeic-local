import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Award,
  ChevronRight,
  Lock,
  CheckCircle2,
  X,
  History,
  TrendingUp,
  HelpCircle,
  Flame,
  Trophy,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import {
  gamificationService,
  LevelDefinition,
  UserLevelInfo,
  XpLedgerItem,
} from '../../services/backend';
import { ModalPortal } from '../common/ModalPortal';
import { getModalMotion } from '../common/modalMotion';
import { BoneyardSkeleton } from '../common/BoneyardSkeleton';
import { XpExplanationTooltip } from '../common/XpExplanationTooltip';

export interface LevelProgressCardProps {
  streakDays?: number;
  longestStreak?: number;
  isLoading?: boolean;
}

export const LevelProgressCard: React.FC<LevelProgressCardProps> = ({
  streakDays = 0,
  longestStreak = 0,
  isLoading: propLoading = false,
}) => {
  const { language } = useLanguage();
  const reduceMotion = useReducedMotion();
  const modalMotion = getModalMotion(reduceMotion);

  const [levelInfo, setLevelInfo] = useState<UserLevelInfo | null>(null);
  const [allLevels, setAllLevels] = useState<LevelDefinition[]>([]);
  const [recentXp, setRecentXp] = useState<XpLedgerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showLevelsModal, setShowLevelsModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const [infoRes, levelsRes, xpRes] = await Promise.all([
          gamificationService.getLevelInfo(),
          gamificationService.getLevelDefinitions(),
          gamificationService.getXpHistory(5),
        ]);
        if (isMounted) {
          if (infoRes && infoRes.data) setLevelInfo(infoRes.data);
          if (levelsRes && levelsRes.data) setAllLevels(levelsRes.data);
          if (xpRes && xpRes.data) setRecentXp(xpRes.data);
        }
      } catch (err) {
        console.warn('[LevelProgressCard] Failed to load gamification data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading || propLoading) {
    return (
      <section
        id="tour-db-level-card-loading"
        className="rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-xs dark:shadow-none"
        aria-label="Đang tải thông tin cấp độ và điểm kinh nghiệm"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <BoneyardSkeleton name="lvl-icon-skel" height={44} width={44} className="!rounded-2xl" />
            <div className="space-y-1.5">
              <BoneyardSkeleton name="lvl-pill-skel" height={18} width={80} className="!rounded-md" />
              <BoneyardSkeleton name="lvl-title-skel" height={22} width={150} className="!rounded-lg" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BoneyardSkeleton name="lvl-btn-1" height={34} width={100} className="!rounded-xl" />
            <BoneyardSkeleton name="lvl-btn-2" height={34} width={90} className="!rounded-xl" />
            <BoneyardSkeleton name="lvl-btn-3" height={34} width={90} className="!rounded-xl" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_260px] xl:grid-cols-[1fr_280px] gap-3 sm:gap-4">
          <div className="rounded-2xl border border-line/70 bg-surface-elevated/40 p-4 sm:p-5 space-y-3">
            <div className="flex items-baseline justify-between">
              <BoneyardSkeleton name="lvl-xp-val" height={32} width={160} className="!rounded-xl" />
              <BoneyardSkeleton name="lvl-target-val" height={18} width={110} className="!rounded-lg" />
            </div>
            <BoneyardSkeleton name="lvl-progress-bar" height={10} width="100%" className="!rounded-full" />
            <div className="flex items-center justify-between pt-1">
              <BoneyardSkeleton name="lvl-subtext-left" height={14} width={220} className="!rounded" />
              <BoneyardSkeleton name="lvl-subtext-right" height={14} width={160} className="!rounded" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-1">
            <BoneyardSkeleton name="lvl-streak-skel-1" height={76} className="!rounded-2xl" />
            <BoneyardSkeleton name="lvl-streak-skel-2" height={76} className="!rounded-2xl" />
          </div>
        </div>
      </section>
    );
  }

  if (!levelInfo) return null;

  const {
    currentLevel,
    title,
    currentXp,
    currentLevelXp,
    nextLevel,
    nextLevelXp,
    progressPercent,
    xpRemaining,
  } = levelInfo;

  return (
    <>
      <article
        id="tour-db-level-card"
        className="relative overflow-hidden rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-xs transition hover:border-brand-500/30 dark:shadow-none"
      >
        {/* Header: Cấp độ, Danh hiệu và Các nút thao tác */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl border border-brand-200/60 bg-brand-500 text-white shadow-xs shadow-brand-500/20 shrink-0">
              <Award className="size-5.5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-brand-500/10 px-2.5 py-0.5 text-xs font-black text-brand-600 dark:text-brand-400">
                  Cấp {currentLevel}
                </span>
                <h2 className="text-base sm:text-lg font-extrabold text-content">{title}</h2>
              </div>
              <p className="text-xs text-content-muted mt-0.5 font-medium">
                {nextLevel ? `Cột mốc tiếp theo: Cấp ${nextLevel}` : 'Đã chinh phục danh hiệu cao nhất'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <XpExplanationTooltip align="right" side="bottom">
              <button
                type="button"
                className="inline-flex cursor-help items-center gap-1.5 rounded-xl border border-line bg-surface-elevated px-2.5 py-1.5 text-xs font-bold text-content hover:bg-surface-hover transition-colors"
                title="Xem cách tính điểm XP"
              >
                <HelpCircle className="size-3.5 text-amber-500" />
                <span>Cách tính XP</span>
              </button>
            </XpExplanationTooltip>
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-elevated px-2.5 py-1.5 text-xs font-bold text-content hover:bg-surface-hover transition-colors"
              title="Lịch sử tích lũy XP"
            >
              <History className="size-3.5 text-content-muted" />
              <span className="hidden sm:inline">Lịch sử XP</span>
            </button>
            <button
              type="button"
              onClick={() => setShowLevelsModal(true)}
              className="inline-flex items-center gap-1 rounded-xl bg-brand-500/10 px-3 py-1.5 text-xs font-black text-brand-600 dark:text-brand-400 hover:bg-brand-500/20 transition-colors"
            >
              <span>16 Cấp độ</span>
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>

        {/* ── MODULE GỘP TIẾN TRÌNH XP & CHUỖI HỌC TẬP (STREAK) ── */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_260px] xl:grid-cols-[1fr_280px] gap-3 sm:gap-4">
          {/* Bên trái: Giữ nguyên toàn bộ nội dung card XP */}
          <div className="rounded-2xl border border-line/70 bg-surface-elevated/40 p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-content tracking-tight">
                      {currentXp.toLocaleString()}
                    </span>
                    {nextLevel && nextLevelXp ? (
                      <span className="text-xs sm:text-sm font-bold text-content-muted">
                        / {nextLevelXp.toLocaleString()} XP
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                        {language === 'en' ? 'Max Level' : 'Cấp tối đa (MAX)'}
                      </span>
                    )}
                    {nextLevel && (
                      <span className="inline-flex items-center rounded-full bg-brand-500/10 px-2.5 py-0.5 text-xs font-black text-brand-600 dark:text-brand-400">
                        {progressPercent}%
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-semibold text-content-muted mt-0.5">
                    {language === 'en' ? 'Accumulated experience points for level progression' : 'Điểm kinh nghiệm tích lũy để thăng cấp'}
                  </p>
                </div>

                <div className="text-right">
                  {nextLevel ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-content">
                      <TrendingUp className="size-3.5 text-brand-500" />
                      {language === 'en' ? 'Target: ' : 'Mục tiêu: '}<span className="font-extrabold text-brand-600 dark:text-brand-400">{language === 'en' ? `Level ${nextLevel}` : `Cấp ${nextLevel}`}</span>
                    </span>
                  ) : (
                    <span className="text-xs font-extrabold text-amber-500">
                      {language === 'en' ? 'Peak TOEIC Master' : 'Đỉnh cao TOEIC Master'}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar (Màu đơn sắc phẳng, không gradient) */}
              <div className="mt-3.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-surface-hover">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full bg-brand-500"
                />
              </div>
            </div>

            {/* Subtext info */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-content-muted">
              <span>
                {nextLevel ? (
                  language === 'en' ? (
                    <>
                      Need <strong className="font-extrabold text-content">{xpRemaining.toLocaleString()} XP</strong> more to advance
                    </>
                  ) : (
                    <>
                      Còn <strong className="font-extrabold text-content">{xpRemaining.toLocaleString()} XP</strong> nữa để thăng cấp tiếp theo
                    </>
                  )
                ) : (
                  language === 'en' ? 'You have conquered all level milestones!' : 'Bạn đã hoàn thành tất cả các mốc cấp độ cao nhất!'
                )}
              </span>
              {nextLevel && (
                <span className="text-[11px] font-medium text-slate-400 dark:text-content-muted">
                  {language === 'en'
                    ? `Lv.${currentLevel} (${currentLevelXp.toLocaleString()} XP) → Lv.${nextLevel} (${(nextLevelXp ?? 0).toLocaleString()} XP)`
                    : `Cấp ${currentLevel} (${currentLevelXp.toLocaleString()} XP) → Cấp ${nextLevel} (${(nextLevelXp ?? 0).toLocaleString()} XP)`}
                </span>
              )}
            </div>
          </div>

          {/* Bên phải: 2 chỉ số Streak & Kỷ lục chuỗi (layout ngang trên desktop, layout 2 cột dưới trên mobile) */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-1">
            {/* Chuỗi hiện tại */}
            <div className="flex items-center gap-3 rounded-2xl border border-line/70 bg-surface-elevated/40 p-3.5 sm:p-4 transition hover:border-orange-500/30">
              <span className="grid size-10 sm:size-11 place-items-center rounded-xl border border-orange-200/60 bg-orange-50 text-orange-600 dark:border-orange-900/40 dark:bg-orange-500/10 dark:text-orange-400 shrink-0">
                <Flame className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-content-muted">
                  {language === 'en' ? 'Current Streak' : 'Chuỗi hiện tại'}
                </p>
                <p className="mt-0.5 text-base sm:text-lg font-black text-content tracking-tight">
                  {streakDays} {language === 'en' ? (streakDays === 1 ? 'day' : 'days') : 'ngày'}
                </p>
              </div>
            </div>

            {/* Kỷ lục chuỗi */}
            <div className="flex items-center gap-3 rounded-2xl border border-line/70 bg-surface-elevated/40 p-3.5 sm:p-4 transition hover:border-amber-500/30">
              <span className="grid size-10 sm:size-11 place-items-center rounded-xl border border-amber-200/60 bg-amber-50 text-amber-600 dark:border-amber-900/40 dark:bg-amber-500/10 dark:text-amber-400 shrink-0">
                <Trophy className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-content-muted">
                  {language === 'en' ? 'Longest Streak' : 'Kỷ lục chuỗi'}
                </p>
                <p className="mt-0.5 text-base sm:text-lg font-black text-content tracking-tight">
                  {longestStreak} {language === 'en' ? (longestStreak === 1 ? 'day' : 'days') : 'ngày'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* Modal 16 Cấp Độ & Danh Hiệu */}
      <AnimatePresence>
        {showLevelsModal && (
          <ModalPortal>
            <motion.div
              {...modalMotion.backdrop}
              onClick={() => setShowLevelsModal(false)}
              className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              {...modalMotion.panel}
              role="dialog"
              aria-modal="true"
              aria-label="Danh sách 16 cấp độ và danh hiệu"
              className="fixed inset-x-4 top-[10%] z-[9999] mx-auto max-w-lg max-h-[80vh] overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <Award className="size-5 text-brand-600 dark:text-brand-400" />
                  <h3 className="text-base font-black text-content">Hệ thống 16 Cấp độ & Danh hiệu</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLevelsModal(false)}
                  className="rounded-full p-1 text-content-muted hover:bg-surface-hover transition-colors"
                  aria-label="Đóng bảng cấp độ"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="mt-4 flex-1 overflow-y-auto space-y-2.5 pr-1">
                {allLevels.map((lvl) => {
                  const isUnlocked = currentXp >= lvl.xp_required;
                  const isCurrent = lvl.level === currentLevel;

                  return (
                    <div
                      key={lvl.level}
                      className={`flex items-center justify-between rounded-2xl border p-3 transition-all ${
                        isCurrent
                          ? 'border-brand-500 bg-brand-500/10 shadow-xs ring-1 ring-brand-500'
                          : isUnlocked
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : 'border-line/60 bg-surface-elevated/40 opacity-70'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`grid size-9 place-items-center rounded-xl text-xs font-black ${
                            isCurrent
                              ? 'bg-brand-600 text-white'
                              : isUnlocked
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                              : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {lvl.level}
                        </span>
                        <div>
                          <p className="text-xs font-black text-content flex items-center gap-1.5">
                            <span>{lvl.title}</span>
                            {isCurrent && (
                              <span className="rounded-md bg-brand-600 px-1.5 py-0.2 text-[9px] font-extrabold text-white">
                                Hiện tại
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] font-semibold text-content-muted">
                            Yêu cầu: {lvl.xp_required.toLocaleString()} XP
                          </p>
                        </div>
                      </div>

                      <div>
                        {isUnlocked ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="size-4" /> Đã mở
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
                            <Lock className="size-3.5" /> Khóa
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </ModalPortal>
        )}
      </AnimatePresence>

      {/* Modal Lịch Sử Tích Lũy XP */}
      <AnimatePresence>
        {showHistoryModal && (
          <ModalPortal>
            <motion.div
              {...modalMotion.backdrop}
              onClick={() => setShowHistoryModal(false)}
              className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              {...modalMotion.panel}
              role="dialog"
              aria-modal="true"
              aria-label="Lịch sử tích lũy điểm kinh nghiệm"
              className="fixed inset-x-4 top-[15%] z-[9999] mx-auto max-w-lg max-h-[75vh] overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <History className="size-5 text-brand-600 dark:text-brand-400" />
                  <h3 className="text-base font-black text-content">Lịch sử tích lũy XP</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  className="rounded-full p-1 text-content-muted hover:bg-surface-hover transition-colors"
                  aria-label="Đóng lịch sử XP"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="mt-4 flex-1 overflow-y-auto space-y-2.5 pr-1">
                {recentXp.length > 0 ? (
                  recentXp.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-line/60 bg-surface-elevated/50 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-extrabold text-content">
                          {item.description || item.activityType}
                        </p>
                        <p className="mt-0.5 text-[10px] font-medium text-content-muted">
                          {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : ''}
                        </p>
                      </div>
                      <span className="inline-flex items-center rounded-xl bg-emerald-500/10 px-2.5 py-1 text-xs font-black text-emerald-600 dark:text-emerald-400 shrink-0">
                        +{item.xpAmount} XP
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-content-muted">
                    Chưa có lịch sử tích lũy XP nào được ghi nhận.
                  </div>
                )}
              </div>
            </motion.div>
          </ModalPortal>
        )}
      </AnimatePresence>
    </>
  );
};
