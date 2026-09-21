import React, { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronRight,
  Flame,
  HelpCircle,
  History,
  Lock,
  Play,
  Target,
  TrendingUp,
  Trophy,
  X,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { DogMascot } from '../DogMascot';
import { BoneyardSkeleton } from '../common/BoneyardSkeleton';
import { ModalPortal } from '../common/ModalPortal';
import { getModalMotion } from '../common/modalMotion';
import { XpExplanationTooltip } from '../common/XpExplanationTooltip';
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

interface DashboardModalProps {
  open: boolean;
  title: string;
  description: string;
  closeLabel: string;
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}

const DEFAULT_MESSAGES = {
  vi: 'Gâu gâu! Tinh Tú đây, hôm nay mình luyện phần nào?',
  en: 'Woof woof! Tinh Tu here, which part are we practicing today?',
};

const INTERACTION_MESSAGES = {
  vi: [
    'Cậu vừa gọi mình à? 🐾',
    'Hôm nay học chưa nè?',
    'Đợi mình lấy đề cho cậu nha!',
    'Cố lên, mình luôn ủng hộ cậu! 🚀',
    'Tích lũy thêm XP thôi nào!',
  ],
  en: [
    'Did you call me? 🐾',
    'Have you practiced today?',
    'Let me fetch a practice set for you!',
    "Keep going, I'm cheering for you! 🚀",
    'Ready to earn more XP?',
  ],
};

const MESSAGE_ACTIONS = new Set([
  'jump',
  'double-jump',
  'happy',
  'excited',
  'love',
  'lick',
  'dance',
  'derp',
  'dizzy',
  'cool',
  'wink',
]);

const clampProgress = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
};

const DashboardModal: React.FC<DashboardModalProps> = ({
  open,
  title,
  description,
  closeLabel,
  icon,
  onClose,
  children,
}) => {
  const reduceMotion = useReducedMotion();
  const modalMotion = getModalMotion(reduceMotion);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return undefined;

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const focusPanel = window.requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector<HTMLElement>('[data-modal-close]')
        ?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );

      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusPanel);
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose, open]);

  return (
    <AnimatePresence>
      {open && (
        <ModalPortal>
          <motion.div
            {...modalMotion.backdrop}
            className="fixed inset-0 z-[9998] grid min-h-[100dvh] place-items-center overflow-y-auto bg-slate-950/65 p-4 backdrop-blur-xs"
            onClick={(event) => {
              if (event.target === event.currentTarget) onClose();
            }}
          >
            <motion.div
              ref={panelRef}
              {...modalMotion.panel}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={descriptionId}
              className="flex max-h-[min(80dvh,44rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl dark:shadow-none"
              onClick={(event) => event.stopPropagation()}
            >
              <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6 sm:py-5">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="icon-box size-10 rounded-xl" aria-hidden="true">
                    {icon}
                  </span>
                  <div className="min-w-0">
                    <h2 id={titleId} className="text-base font-black text-content sm:text-lg">
                      {title}
                    </h2>
                    <p id={descriptionId} className="mt-1 text-xs leading-relaxed text-content-muted">
                      {description}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  data-modal-close
                  className="grid size-10 shrink-0 place-items-center rounded-xl text-content-muted transition-colors hover:bg-surface-hover hover:text-content"
                  aria-label={closeLabel}
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
                {children}
              </div>
            </motion.div>
          </motion.div>
        </ModalPortal>
      )}
    </AnimatePresence>
  );
};

const WelcomeBackCardSkeleton: React.FC = () => {
  const { t } = useLanguage();

  return (
    <section
      className="welcome-dashboard-card surface overflow-hidden p-5 sm:p-6 lg:p-7"
      role="status"
      aria-label={t('dashboard.welcomeLoading')}
    >
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center">
      <div className="space-y-3">
        <BoneyardSkeleton name="welcome-badge-skel" height={24} width={154} className="!rounded-full" />
        <BoneyardSkeleton name="welcome-title-skel" height={40} width="min(72%, 31rem)" className="!rounded-xl" />
        <BoneyardSkeleton name="welcome-subtitle-skel" height={16} width="min(88%, 37rem)" className="!rounded-lg" />
        <div className="flex gap-2 pt-2">
          <BoneyardSkeleton name="welcome-cta-skel" height={44} width={150} className="!rounded-xl" />
          <BoneyardSkeleton name="welcome-target-skel" height={44} width={132} className="!rounded-xl" />
        </div>
      </div>
      <div className="flex items-center justify-center gap-3 lg:justify-end">
        <BoneyardSkeleton name="welcome-mascot-skel" height={108} width={108} className="!rounded-full shrink-0" />
        <BoneyardSkeleton name="welcome-bubble-skel" height={72} width={190} className="!rounded-2xl" />
      </div>
    </div>

    <div className="my-5 border-t border-line" />

    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="rounded-2xl border border-line bg-surface-elevated/50 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <BoneyardSkeleton name="welcome-xp-skel" height={30} width={190} className="!rounded-lg" />
          <BoneyardSkeleton name="welcome-actions-skel" height={32} width={170} className="!rounded-xl" />
        </div>
        <BoneyardSkeleton name="welcome-progress-skel" height={10} className="mt-5 !rounded-full" />
        <BoneyardSkeleton name="welcome-progress-copy-skel" height={14} width="64%" className="mt-3 !rounded-md" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <BoneyardSkeleton name="welcome-streak-skel" height={118} className="!rounded-2xl" />
        <BoneyardSkeleton name="welcome-record-skel" height={118} className="!rounded-2xl" />
      </div>
    </div>
  </section>
  );
};

const StandardWelcomeBackCard: React.FC<WelcomeBackCardProps> = ({
  userName,
  xp,
  targetScore,
  level: propLevel = 1,
  streakDays = 0,
  longestStreak = 0,
  ctaLink = '/practice-by-level',
  isLoading: propLoading = false,
}) => {
  const { language, t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const locale = language === 'en' ? 'en-US' : 'vi-VN';
  const numberFormatter = new Intl.NumberFormat(locale);

  const [levelInfo, setLevelInfo] = useState<UserLevelInfo | null>(null);
  const [allLevels, setAllLevels] = useState<LevelDefinition[]>([]);
  const [recentXp, setRecentXp] = useState<XpLedgerItem[]>([]);
  const [loadingGamification, setLoadingGamification] = useState(true);
  const [gamificationUnavailable, setGamificationUnavailable] = useState(false);
  const [showLevelsModal, setShowLevelsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const defaultMessage = DEFAULT_MESSAGES[language];
  const [bubbleText, setBubbleText] = useState(defaultMessage);

  useEffect(() => {
    setBubbleText(DEFAULT_MESSAGES[language]);
  }, [language]);

  useEffect(() => {
    if (bubbleText === defaultMessage) return undefined;
    const timer = window.setTimeout(() => setBubbleText(defaultMessage), 5000);
    return () => window.clearTimeout(timer);
  }, [bubbleText, defaultMessage]);

  useEffect(() => {
    let isMounted = true;

    const loadGamification = async () => {
      try {
        const [infoRes, levelsRes, xpRes] = await Promise.all([
          gamificationService.getLevelInfo(),
          gamificationService.getLevelDefinitions(),
          gamificationService.getXpHistory(5),
        ]);

        if (!isMounted) return;
        if (infoRes?.data) setLevelInfo(infoRes.data);
        if (levelsRes?.data) setAllLevels(levelsRes.data);
        if (xpRes?.data) setRecentXp(xpRes.data);
      } catch (error) {
        console.warn('[WelcomeBackCard] Failed to load gamification data:', error);
        if (isMounted) setGamificationUnavailable(true);
      } finally {
        if (isMounted) setLoadingGamification(false);
      }
    };

    void loadGamification();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleMascotInteract = (action: string) => {
    if (!MESSAGE_ACTIONS.has(action)) return;

    const messages = INTERACTION_MESSAGES[language];
    setBubbleText((currentText) => {
      const alternatives = messages.filter((message) => message !== currentText);
      return alternatives[Math.floor(Math.random() * alternatives.length)] ?? messages[0];
    });
  };

  if (propLoading || loadingGamification) {
    return <WelcomeBackCardSkeleton />;
  }

  const currentLevel = levelInfo?.currentLevel ?? propLevel;
  const title = levelInfo?.title ?? (language === 'en' ? 'TOEIC Apprentice' : 'Tập sự TOEIC');
  const currentXp = levelInfo?.currentXp ?? xp ?? 0;
  const currentLevelXp = levelInfo?.currentLevelXp ?? 0;
  const nextLevel = levelInfo?.nextLevel ?? (gamificationUnavailable ? null : currentLevel + 1);
  const nextLevelXp = levelInfo?.nextLevelXp ?? null;
  const progressPercent = clampProgress(levelInfo?.progressPercent ?? 0);
  const xpRemaining = levelInfo?.xpRemaining ?? Math.max(0, (nextLevelXp ?? currentXp) - currentXp);
  const levelCount = allLevels.length || 16;
  const streakLabel = language === 'en' && streakDays === 1 ? 'day' : t('common.days');
  const longestStreakLabel = language === 'en' && longestStreak === 1 ? 'day' : t('common.days');

  return (
    <>
      <article
        className="welcome-dashboard-card surface relative overflow-hidden p-5 sm:p-6 lg:p-7"
        aria-labelledby="welcome-card-title"
      >
        <div className="welcome-card-accent" aria-hidden="true" />

        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center">
          <div className="min-w-0 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-100/80 px-3 py-1 text-xs font-black text-brand-800 dark:border-brand-500/25 dark:bg-brand-500/10 dark:text-brand-300">
              <Award className="size-3.5" aria-hidden="true" />
              <span>{t('dashboard.levelAndTitle', { level: currentLevel, title })}</span>
            </div>

            <h1
              id="welcome-card-title"
              className="mt-3 text-2xl font-black leading-tight tracking-tight text-content sm:text-3xl lg:text-4xl"
            >
              {t('dashboard.greeting', { name: userName })}
              <span className="ml-2 inline-block welcome-wave" aria-hidden="true">👋</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-content-muted">
              {t('dashboard.greetingSubtitle')}
            </p>

            <div className="mt-5 flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center">
              <Link to={ctaLink} className="btn-primary group">
                <Play className="size-4 fill-current" aria-hidden="true" />
                <span>{t('dashboard.practiceNow')}</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>

              {targetScore ? (
                <div className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-bold text-content sm:justify-start">
                  <Target className="size-4 text-positive" aria-hidden="true" />
                  <span className="text-content-muted">{t('dashboard.targetScore')}</span>
                  <strong>{numberFormatter.format(targetScore)}</strong>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex min-w-0 flex-col items-center justify-center gap-2 sm:flex-row lg:justify-end">
            <DogMascot
              onInteraction={handleMascotInteract}
              size={112}
              className="shrink-0"
            />
            <div className="welcome-speech-bubble relative w-full max-w-[15rem] rounded-2xl border border-line bg-surface p-3.5 text-left shadow-sm dark:shadow-none">
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.14em] text-accent-strong dark:text-brand-300">
                Tinh Tú
              </p>
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={bubbleText}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                  transition={{ duration: reduceMotion ? 0.1 : 0.18 }}
                  className="min-h-10 text-xs font-semibold leading-relaxed text-content"
                  aria-live="polite"
                >
                  {bubbleText}
                </motion.p>
              </AnimatePresence>
              <p className="mt-2 text-[10px] font-medium text-content-muted">
                {t('dashboard.mascotHint')}
              </p>
            </div>
          </div>
        </div>

        <div className="relative my-5 border-t border-line" />

        <div className="relative grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="rounded-2xl border border-line bg-surface-elevated/55 p-4 sm:p-5" aria-label={t('dashboard.levelProgress')}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-content-muted">
                  {t('dashboard.levelProgress')}
                </p>
                <div className="mt-1 flex flex-wrap items-baseline gap-2">
                  <strong className="text-2xl font-black tracking-tight text-content sm:text-3xl">
                    {numberFormatter.format(currentXp)}
                  </strong>
                  <span className="text-sm font-bold text-content-muted">XP</span>
                  {nextLevel && nextLevelXp ? (
                    <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-black text-brand-800 dark:bg-brand-500/10 dark:text-brand-300">
                      {numberFormatter.format(progressPercent)}%
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <XpExplanationTooltip align="right" side="bottom">
                  <button
                    type="button"
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-line bg-surface px-2.5 py-1.5 text-xs font-bold text-content transition-colors hover:bg-surface-hover"
                    title={t('dashboard.xpInfo')}
                  >
                    <HelpCircle className="size-3.5 text-accent-strong dark:text-brand-300" aria-hidden="true" />
                    <span>{t('dashboard.xpInfo')}</span>
                  </button>
                </XpExplanationTooltip>
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(true)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-line bg-surface px-2.5 py-1.5 text-xs font-bold text-content transition-colors hover:bg-surface-hover"
                >
                  <History className="size-3.5 text-content-muted" aria-hidden="true" />
                  <span>{t('dashboard.xpHistoryShort')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowLevelsModal(true)}
                  className="inline-flex min-h-9 items-center gap-1 rounded-xl bg-accent px-3 py-1.5 text-xs font-black text-accent-contrast transition-colors hover:bg-accent-hover"
                >
                  <span>{t('dashboard.levelCount', { count: levelCount })}</span>
                  <ChevronRight className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" aria-hidden="true">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: reduceMotion ? 0.1 : 0.65, ease: 'easeOut' }}
                className="h-full rounded-full bg-accent"
              />
            </div>

            <div className="mt-3 flex flex-col gap-1.5 text-xs text-content-muted sm:flex-row sm:items-center sm:justify-between">
              {gamificationUnavailable ? (
                <span>{t('dashboard.gamificationUnavailable')}</span>
              ) : nextLevel && nextLevelXp ? (
                <span>
                  {t('dashboard.xpUntilNext', {
                    xp: numberFormatter.format(xpRemaining),
                    level: nextLevel,
                  })}
                </span>
              ) : (
                <span>{t('dashboard.maxLevelReached')}</span>
              )}

              {nextLevel && nextLevelXp ? (
                <span className="inline-flex items-center gap-1 font-bold text-content">
                  <TrendingUp className="size-3.5 text-positive" aria-hidden="true" />
                  {t('dashboard.levelRange', {
                    currentLevel,
                    currentXp: numberFormatter.format(currentLevelXp),
                    nextLevel,
                    nextXp: numberFormatter.format(nextLevelXp),
                  })}
                </span>
              ) : null}
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3">
            <section className="rounded-2xl border border-line bg-surface p-3.5 sm:p-4" aria-label={t('dashboard.currentStreak')}>
              <span className="grid size-10 place-items-center rounded-xl border border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300">
                <Flame className="size-5" aria-hidden="true" />
              </span>
              <p className="mt-3 text-[11px] font-bold text-content-muted">{t('dashboard.currentStreak')}</p>
              <p className="mt-0.5 text-lg font-black text-content sm:text-xl">
                {numberFormatter.format(streakDays)} <span className="text-xs font-bold text-content-muted">{streakLabel}</span>
              </p>
            </section>

            <section className="rounded-2xl border border-line bg-surface p-3.5 sm:p-4" aria-label={t('dashboard.longestStreak')}>
              <span className="grid size-10 place-items-center rounded-xl border border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-300">
                <Trophy className="size-5" aria-hidden="true" />
              </span>
              <p className="mt-3 text-[11px] font-bold text-content-muted">{t('dashboard.longestStreak')}</p>
              <p className="mt-0.5 text-lg font-black text-content sm:text-xl">
                {numberFormatter.format(longestStreak)} <span className="text-xs font-bold text-content-muted">{longestStreakLabel}</span>
              </p>
            </section>
          </div>
        </div>
      </article>

      <DashboardModal
        open={showLevelsModal}
        onClose={() => setShowLevelsModal(false)}
        title={t('dashboard.levelSystemTitle', { count: levelCount })}
        description={t('dashboard.levelSystemDescription')}
        closeLabel={t('common.close')}
        icon={<Award className="size-5" aria-hidden="true" />}
      >
        {allLevels.length ? (
          <div className="space-y-2.5">
            {allLevels.map((levelDefinition) => {
              const isUnlocked = currentXp >= levelDefinition.xp_required;
              const isCurrent = levelDefinition.level === currentLevel;

              return (
                <div
                  key={levelDefinition.level}
                  className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 ${
                    isCurrent
                      ? 'border-accent bg-brand-50 dark:bg-brand-500/10'
                      : isUnlocked
                        ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-500/5'
                        : 'border-line bg-surface-elevated/45'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`grid size-10 shrink-0 place-items-center rounded-xl text-xs font-black ${
                      isCurrent
                        ? 'bg-accent text-accent-contrast'
                        : isUnlocked
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                          : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                      {levelDefinition.level}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-sm font-black text-content">{levelDefinition.title}</p>
                        {isCurrent ? (
                          <span className="rounded-md bg-accent px-1.5 py-0.5 text-[9px] font-black text-accent-contrast">
                            {t('dashboard.currentLevelBadge')}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-[11px] font-semibold text-content-muted">
                        {t('dashboard.requiredXp', { xp: numberFormatter.format(levelDefinition.xp_required) })}
                      </p>
                    </div>
                  </div>

                  {isUnlocked ? (
                    <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-black text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                      <span className="hidden sm:inline">{t('dashboard.unlocked')}</span>
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-content-muted">
                      <Lock className="size-3.5" aria-hidden="true" />
                      <span className="hidden sm:inline">{t('dashboard.locked')}</span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-content-muted">
            {t('dashboard.gamificationUnavailable')}
          </div>
        )}
      </DashboardModal>

      <DashboardModal
        open={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title={t('dashboard.xpHistoryTitle')}
        description={t('dashboard.xpHistoryDescription')}
        closeLabel={t('common.close')}
        icon={<History className="size-5" aria-hidden="true" />}
      >
        {recentXp.length ? (
          <div className="space-y-2.5">
            {recentXp.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface-elevated/45 p-3.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-content">
                    {item.description || item.activityType}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-content-muted">
                    {item.createdAt
                      ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.createdAt))
                      : ''}
                  </p>
                </div>
                <span className="shrink-0 rounded-xl bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  +{numberFormatter.format(item.xpAmount)} XP
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-content-muted">
            {t('dashboard.noXpHistory')}
          </div>
        )}
      </DashboardModal>
    </>
  );
};

export const WelcomeBackCard: React.FC<WelcomeBackCardProps> = (props) => {
  const { isFeatureEnabled } = useFeatureFlags();

  if (isFeatureEnabled('national_day_theme')) {
    return <NationalDayBanner {...props} />;
  }

  return <StandardWelcomeBackCard {...props} />;
};
