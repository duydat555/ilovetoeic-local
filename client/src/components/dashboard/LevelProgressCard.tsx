import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award,
  ChevronRight,
  Lock,
  CheckCircle2,
  Sparkles,
  X,
  History,
  TrendingUp,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import {
  gamificationService,
  LevelDefinition,
  UserLevelInfo,
  XpLedgerItem,
} from '../../services/backend';
import { ModalPortal } from '../common/ModalPortal';

export const LevelProgressCard: React.FC = () => {
  const { language } = useLanguage();
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

  if (loading) {
    return (
      <div className="rounded-3xl border border-line bg-surface p-5 shadow-xs animate-pulse">
        <div className="h-5 w-32 rounded bg-slate-200 dark:bg-surface-elevated" />
        <div className="mt-4 h-4 w-full rounded-full bg-slate-200 dark:bg-surface-elevated" />
      </div>
    );
  }

  if (!levelInfo) return null;

  const {
    currentLevel,
    title,
    currentXp,
    nextLevel,
    nextLevelXp,
    progressPercent,
    xpRemaining,
  } = levelInfo;

  return (
    <>
      <article
        id="tour-db-level-card"
        className="relative overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-xs transition hover:border-brand-500/30 dark:shadow-none"
      >
        <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-brand-500/5 blur-3xl" />

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl border border-brand-200/60 bg-gradient-to-br from-brand-500 to-indigo-600 text-white shadow-xs shadow-brand-500/20 shrink-0">
              <Award className="size-5.5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-brand-500/10 px-2 py-0.5 text-xs font-black text-brand-600 dark:text-brand-400">
                  Cấp {currentLevel}
                </span>
                <h2 className="text-base font-extrabold text-content">{title}</h2>
              </div>
              <p className="mt-0.5 text-xs text-content-muted">
                {language === 'en'
                  ? `Total XP earned: ${currentXp.toLocaleString()}`
                  : `Tổng XP tích lũy: ${currentXp.toLocaleString()} XP`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface-elevated px-2.5 py-1.5 text-xs font-bold text-content hover:bg-surface-hover transition-colors"
              title="Lịch sử cộng XP"
            >
              <History className="size-3.5 text-slate-400" />
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

        {/* XP Progress Bar */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-content flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-amber-500" />
              {nextLevel ? (
                <>
                  {language === 'en' ? 'Progress to' : 'Tiến trình lên'}{' '}
                  <span className="font-black text-brand-600 dark:text-brand-400">
                    Cấp {nextLevel}
                  </span>
                </>
              ) : (
                <span className="font-black text-amber-500">Đã đạt Cấp tối đa!</span>
              )}
            </span>
            <span className="font-extrabold text-content-muted">
              {nextLevel ? (
                <>
                  <span className="text-content font-black">{currentXp}</span> / {nextLevelXp} XP (
                  <span className="text-brand-600 dark:text-brand-400">{progressPercent}%</span>)
                </>
              ) : (
                'MAX'
              )}
            </span>
          </div>

          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-surface-hover">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-brand-500 via-indigo-500 to-purple-500"
            />
          </div>

          {nextLevel && (
            <p className="text-right text-[11px] font-medium text-content-muted">
              Còn <strong className="font-bold text-content">{xpRemaining.toLocaleString()} XP</strong> nữa để thăng cấp tiếp theo
            </p>
          )}
        </div>
      </article>

      {/* Modal 16 Cấp Độ & Danh Hiệu */}
      <AnimatePresence>
        {showLevelsModal && (
          <ModalPortal>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLevelsModal(false)}
              className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-x-4 top-[10%] z-[9999] mx-auto max-w-lg max-h-[80vh] overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <Award className="size-5 text-brand-600 dark:text-brand-400" />
                  <h3 className="text-base font-black text-content">Hệ thống Cấp độ & Danh hiệu</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLevelsModal(false)}
                  className="rounded-full p-1 text-content-muted hover:bg-surface-hover"
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

      {/* Modal Sổ Cái Lịch Sử XP */}
      <AnimatePresence>
        {showHistoryModal && (
          <ModalPortal>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistoryModal(false)}
              className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-x-4 top-[15%] z-[9999] mx-auto max-w-lg max-h-[75vh] overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <History className="size-5 text-brand-600 dark:text-brand-400" />
                  <h3 className="text-base font-black text-content">Lịch sử nhận XP (Sổ cái)</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  className="rounded-full p-1 text-content-muted hover:bg-surface-hover"
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
                    Chưa có giao dịch XP nào được ghi nhận.
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
