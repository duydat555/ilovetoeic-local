import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Flame,
  Trophy,
  Award,
  ArrowRight,
  Play,
  HelpCircle,
  History,
  ChevronRight,
  CheckCircle2,
  Lock,
  X,
  TrendingUp,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { DogMascot } from '../DogMascot';
import { BoneyardSkeleton } from '../common/BoneyardSkeleton';
import { XpExplanationTooltip } from '../common/XpExplanationTooltip';
import { ModalPortal } from '../common/ModalPortal';
import { getModalMotion } from '../common/modalMotion';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { useLanguage } from '../../context/LanguageContext';
import {
  gamificationService,
  LevelDefinition,
  UserLevelInfo,
  XpLedgerItem,
} from '../../services/backend';
import { NationalDayBanner } from './NationalDayBanner';
import './WelcomeBackCard.css';

export interface WelcomeBackCardProps {
  userName: string;
  xp?: number;
  targetScore?: number;
  level?: number;
  streakDays?: number;
  longestStreak?: number;
  ctaLink?: string;
  isLoading?: boolean;
}

const DEFAULT_MESSAGE_VI = "Gâu gâu! Tỉnh Tú đây, hôm nay mình luyện phần nào?";
const DEFAULT_MESSAGE_EN = "Woof woof! Tinh Tu here, which part are we practicing today?";
const JUMP_MESSAGES_VI = [
  "Cậu vừa nhéo mình à? 🐾",
  "Hôm nay học chưa nè?",
  "Nhảy phát cho vui thôi!",
  "Đợi mình lấy đề cho cậu nha!",
  "Cố lên nha, mình luôn ủng hộ cậu! 🚀",
  "Nhiều XP quá ta ơi!",
];
const JUMP_MESSAGES_EN = [
  "Did you just pinch me? 🐾",
  "Have you practiced today?",
  "Just a quick jump for fun!",
  "Hold on, let me fetch a test for you!",
  "Keep it up, I'm always cheering for you! 🚀",
  "So much XP!",
];

const StandardWelcomeBackCard: React.FC<WelcomeBackCardProps> = (props) => {
  const { language, t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const modalMotion = getModalMotion(reduceMotion);

  const {
    userName,
    level: propLevel = 1,
    streakDays = 0,
    longestStreak = 0,
    ctaLink = '/practice-by-level',
    isLoading: propLoading = false,
  } = props;

  const [levelInfo, setLevelInfo] = useState<UserLevelInfo | null>(null);
  const [allLevels, setAllLevels] = useState<LevelDefinition[]>([]);
  const [recentXp, setRecentXp] = useState<XpLedgerItem[]>([]);
  const [loadingGamification, setLoadingGamification] = useState<boolean>(true);
  const [showLevelsModal, setShowLevelsModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  const defaultMsg = language === 'en' ? DEFAULT_MESSAGE_EN : DEFAULT_MESSAGE_VI;
  const [bubbleText, setBubbleText] = useState(defaultMsg);

  useEffect(() => {
    setBubbleText(language === 'en' ? DEFAULT_MESSAGE_EN : DEFAULT_MESSAGE_VI);
  }, [language]);

  // Reset bubble text sau 5s
  useEffect(() => {
    if (bubbleText !== defaultMsg) {
      const timer = setTimeout(() => {
        setBubbleText(defaultMsg);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [bubbleText, defaultMsg]);

  // Tải thông tin cấp độ và lịch sử XP
  useEffect(() => {
    let isMounted = true;
    const loadGamification = async () => {
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
        console.warn('[WelcomeBackCard] Failed to load gamification data:', err);
      } finally {
        if (isMounted) setLoadingGamification(false);
      }
    };
    void loadGamification();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleMascotInteract = () => {
    const jumpMsgs = language === 'en' ? JUMP_MESSAGES_EN : JUMP_MESSAGES_VI;
    const randomMsg = jumpMsgs[Math.floor(Math.random() * jumpMsgs.length)];
    setBubbleText(randomMsg);
  };

  const isLoading = propLoading || loadingGamification;

  if (isLoading) {
    return (
      <section
        className="welcome-dashboard-card relative rounded-3xl border border-amber-200/80 bg-[#FFF9E5] dark:bg-slate-900 p-5 sm:p-7 shadow-xs dark:shadow-none overflow-hidden"
        aria-label="Đang tải thẻ chào mừng"
      >
        {/* Top Area Skeleton */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1 space-y-3 w-full md:w-auto">
            <BoneyardSkeleton name="welcome-badge-skel" height={26} width={160} className="!rounded-full !bg-amber-300/40" />
            <BoneyardSkeleton name="welcome-title-skel" height={36} width="55%" className="!rounded-xl !bg-amber-300/40" />
            <BoneyardSkeleton name="welcome-subtitle-skel" height={16} width="75%" className="!rounded-lg !bg-amber-300/30" />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0 w-full sm:w-auto">
            <BoneyardSkeleton name="welcome-mascot-skel" height={110} width={110} className="!rounded-full shrink-0 !bg-amber-300/40" />
            <div className="w-full sm:w-[200px] space-y-2.5">
              <BoneyardSkeleton name="bubble-text-skel" height={48} className="!rounded-2xl !bg-white/80" />
              <BoneyardSkeleton name="cta-btn-skel" height={36} className="!rounded-xl !bg-amber-400/50" />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="my-5 border-t border-amber-200/60 dark:border-slate-800" />

        {/* Bottom Gamification Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] xl:grid-cols-[1fr_380px] gap-3 sm:gap-4 items-stretch">
          <div className="rounded-2xl border border-amber-200/60 bg-white/85 dark:bg-slate-800/85 p-4 sm:p-5 space-y-2.5">
            <div className="flex items-baseline justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2.5">
              <BoneyardSkeleton name="lvl-xp-val" height={28} width={150} className="!rounded-xl" />
              <BoneyardSkeleton name="lvl-target-val" height={24} width={120} className="!rounded-lg" />
            </div>
            <BoneyardSkeleton name="lvl-progress-bar" height={14} width="100%" className="!rounded-full" />
            <BoneyardSkeleton name="lvl-subtext-left" height={14} width="60%" className="!rounded" />
          </div>
          <div className="rounded-2xl border border-amber-200/60 bg-white/85 dark:bg-slate-800/85 p-4 sm:p-5 flex items-center">
            <BoneyardSkeleton name="lvl-streak-skel" height={52} width="100%" className="!rounded-xl" />
          </div>
        </div>
      </section>
    );
  }

  const currentLevel = levelInfo?.currentLevel ?? propLevel;
  const title = levelInfo?.title ?? (language === 'en' ? 'TOEIC Apprentice' : 'Tập sự TOEIC');
  const currentXp = levelInfo?.currentXp ?? 0;
  const currentLevelXp = levelInfo?.currentLevelXp ?? 0;
  const nextLevel = levelInfo?.nextLevel ?? (currentLevel + 1);
  const nextLevelXp = levelInfo?.nextLevelXp ?? 100;
  const progressPercent = levelInfo?.progressPercent ?? 0;
  const xpRemaining = levelInfo?.xpRemaining ?? Math.max(0, nextLevelXp - currentXp);

  return (
    <>
      <article
        id="tour-db-welcome"
        className="welcome-dashboard-card relative rounded-3xl border border-amber-200/80 bg-[#FFF9E5] dark:bg-slate-900 p-5 sm:p-7 shadow-xs dark:shadow-none overflow-hidden"
        aria-label="Chào mừng người dùng"
      >
        {/* ─── PHẦN TRÊN: CHÀO MỪNG & LINH VẬT ĐỒNG HÀNH ─── */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Lời chào & Huy hiệu cấp độ */}
          <div className="flex-1 min-w-0 space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/80 bg-amber-400/90 px-3.5 py-1 text-xs font-black text-amber-950 shadow-xs shadow-amber-500/20">
              <Award className="size-3.5 text-amber-950" />
              <span>{`Cấp ${currentLevel} · ${title}`}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-amber-950 dark:text-amber-100 tracking-tight leading-snug">
              {t('dashboard.greeting', { name: userName })}{' '}
              <span className="inline-block animate-[wave-hand_2s_ease-in-out_infinite] origin-bottom-right">👋</span>
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-amber-900/80 dark:text-amber-200/70 max-w-lg leading-relaxed">
              {t('dashboard.greetingSubtitle')}
            </p>
          </div>

          {/* Linh vật Tinh Tú, bóng thoại & nút CTA luyện đề */}
          <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
            <div className="shrink-0 cursor-pointer" onClick={handleMascotInteract} title="Bấm vào Tinh Tú để tương tác">
              <DogMascot onInteraction={handleMascotInteract} size={110} />
            </div>
            <div className="flex flex-col justify-center w-full sm:w-[220px] text-center sm:text-left">
              <div className="relative rounded-2xl border border-amber-200/60 bg-white/95 dark:bg-slate-800/95 p-3 text-xs font-semibold text-slate-800 dark:text-content shadow-xs">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={bubbleText}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.18 }}
                    className="leading-snug"
                  >
                    {bubbleText}
                  </motion.p>
                </AnimatePresence>
              </div>
              <Link
                to={ctaLink}
                className="mt-2.5 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-500 px-4 py-2 text-xs font-black text-amber-950 shadow-md shadow-amber-500/25 transition-all hover:shadow-amber-500/40 hover:-translate-y-0.5"
              >
                <Play className="size-3.5 fill-current text-amber-950" />
                <span>{t('dashboard.practiceNow')}</span>
                <ArrowRight className="size-3.5 text-amber-950" />
              </Link>
            </div>
          </div>
        </div>

        {/* ─── ĐƯỜNG PHÂN CÁCH TINH TẾ ─── */}
        <div className="my-5 border-t border-amber-200/70 dark:border-slate-800" />

        {/* ─── PHẦN DƯỚI: KHỐI GAMIFICATION THỐNG NHẤT (XP + STREAK + MAX STREAK) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] xl:grid-cols-[1fr_380px] gap-3 sm:gap-4 items-stretch">
          {/* Cột trái: Tiến trình XP & Hành động cấp độ */}
          <div className="rounded-2xl border border-amber-200/60 bg-white/90 dark:bg-slate-800/90 shadow-xs backdrop-blur-sm p-4 sm:p-5 flex flex-col justify-between transition hover:shadow-md hover:border-amber-300/80">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-2.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-content tracking-tight">
                    {currentXp.toLocaleString()}
                  </span>
                  {nextLevel && nextLevelXp ? (
                    <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-content-muted">
                      / {nextLevelXp.toLocaleString()} XP
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      {language === 'en' ? 'Max Level' : 'Cấp tối đa (MAX)'}
                    </span>
                  )}
                  {nextLevel && (
                    <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 border border-blue-200/70 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60 px-2.5 py-0.5 text-xs font-black">
                      {progressPercent}%
                    </span>
                  )}
                </div>

                {/* Các nút thao tác cấp độ */}
                <div className="flex items-center gap-1.5">
                  <XpExplanationTooltip align="right" side="bottom">
                    <button
                      type="button"
                      className="inline-flex cursor-help items-center gap-1 rounded-xl border border-slate-200/80 bg-slate-50 dark:bg-slate-700/60 dark:border-slate-600 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors"
                      title="Xem cách tính điểm XP"
                    >
                      <HelpCircle className="size-3 text-sky-500" />
                      <span className="hidden sm:inline">{language === 'en' ? 'XP Info' : 'Cách tính'}</span>
                    </button>
                  </XpExplanationTooltip>
                  <button
                    type="button"
                    onClick={() => setShowHistoryModal(true)}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200/80 bg-slate-50 dark:bg-slate-700/60 dark:border-slate-600 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors"
                    title="Lịch sử tích lũy XP"
                  >
                    <History className="size-3 text-slate-500" />
                    <span className="hidden sm:inline">{language === 'en' ? 'History' : 'Lịch sử'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLevelsModal(true)}
                    className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 border border-indigo-200/80 dark:bg-indigo-950/40 dark:border-indigo-800/60 px-2.5 py-1 text-[11px] font-black text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors"
                  >
                    <span>{language === 'en' ? '16 Levels' : '16 Cấp độ'}</span>
                    <ChevronRight className="size-3 text-indigo-500" />
                  </button>
                </div>
              </div>

              {/* Progress Bar (Royal Blue & Indigo Gradient - Nổi bật & Hiện đại) */}
              <div className="mt-2.5 mb-2 h-3.5 sm:h-4 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700/60 p-0.5 border border-slate-200/80 dark:border-slate-700">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 shadow-xs shadow-blue-500/30"
                />
              </div>
            </div>

            {/* Subtext info */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-content-secondary pt-0">
              <span>
                {nextLevel ? (
                  language === 'en' ? (
                    <>
                      Need <strong className="font-extrabold text-slate-900 dark:text-content">{xpRemaining.toLocaleString()} XP</strong> more to advance
                    </>
                  ) : (
                    <>
                      Còn <strong className="font-extrabold text-slate-900 dark:text-content">{xpRemaining.toLocaleString()} XP</strong> nữa để thăng cấp tiếp theo
                    </>
                  )
                ) : (
                  language === 'en' ? 'You have conquered all level milestones!' : 'Bạn đã hoàn thành tất cả các mốc cấp độ cao nhất!'
                )}
              </span>
              {nextLevel && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-content-secondary">
                  <TrendingUp className="size-3 text-indigo-500" />
                  {language === 'en' ? 'Target: ' : 'Mục tiêu: '}
                  <strong className="text-indigo-600 dark:text-indigo-400">
                    {language === 'en' ? `Level ${nextLevel}` : `Cấp ${nextLevel}`}
                  </strong>
                </span>
              )}
            </div>
          </div>

          {/* Cột phải: Khối Streak GỘP duy nhất (Chuỗi hiện tại & Kỷ lục chuỗi) */}
          <div className="rounded-2xl border border-amber-200/60 bg-white/90 dark:bg-slate-800/90 shadow-xs backdrop-blur-sm p-4 sm:p-5 flex flex-col justify-center transition hover:shadow-md hover:border-amber-300/80">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-center">
              {/* Chuỗi hiện tại */}
              <div className="flex items-center gap-3">
                <span className="grid size-10 sm:size-11 place-items-center rounded-xl bg-gradient-to-br from-orange-400 to-red-500 text-white shadow-xs shadow-orange-500/25 shrink-0">
                  <Flame className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
                    {language === 'en' ? 'Current Streak' : 'Chuỗi hiện tại'}
                  </p>
                  <p className="text-base sm:text-lg font-black text-slate-900 dark:text-content tracking-tight">
                    {streakDays}{' '}
                    <span className="text-xs font-bold text-slate-400 dark:text-content-muted">
                      {language === 'en' ? (streakDays === 1 ? 'day' : 'days') : 'ngày'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Kỷ lục chuỗi */}
              <div className="flex items-center gap-3 border-t border-slate-100 pt-3 sm:border-t-0 sm:border-l sm:border-slate-200/70 dark:sm:border-slate-700/60 sm:pt-0 sm:pl-4 dark:border-slate-700/40">
                <span className="grid size-10 sm:size-11 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-xs shadow-amber-500/25 shrink-0">
                  <Trophy className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
                    {language === 'en' ? 'Longest Streak' : 'Kỷ lục chuỗi'}
                  </p>
                  <p className="text-base sm:text-lg font-black text-slate-900 dark:text-content tracking-tight">
                    {longestStreak}{' '}
                    <span className="text-xs font-bold text-slate-400 dark:text-content-muted">
                      {language === 'en' ? (longestStreak === 1 ? 'day' : 'days') : 'ngày'}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* ── MODAL 16 CẤP ĐỘ & DANH HIỆU ── */}
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

      {/* ── MODAL LỊCH SỬ TÍCH LŨY XP ── */}
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

export const WelcomeBackCard: React.FC<WelcomeBackCardProps> = (props) => {
  const { isFeatureEnabled } = useFeatureFlags();
  const isNationalDayTheme = isFeatureEnabled('national_day_theme');

  if (isNationalDayTheme) {
    return <NationalDayBanner {...props} />;
  }

  return <StandardWelcomeBackCard {...props} />;
};
