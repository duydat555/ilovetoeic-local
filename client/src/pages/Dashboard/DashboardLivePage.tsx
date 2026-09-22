import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Compass,
  FileText,
  Flame,
  Headphones,
  Layers,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { WelcomeBackCard } from '../../components/dashboard/WelcomeBackCard';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { backendService, RecentActiveStudent } from '../../services/backend';
import { StudyAttempt } from '../../types';
import { BoneyardSkeleton } from '../../components/common/BoneyardSkeleton';
import { PracticeActivityPanel } from '../../components/dashboard/PracticeActivityPanel';
import { WeeklyStudyTimeCard } from '../../components/dashboard/WeeklyStudyTimeCard';
import { SkillsRadarCard } from '../../components/dashboard/SkillsRadarCard';
import { PredictionCard } from '../../components/dashboard/PredictionCard';
import { CommunityChatWidget } from '../../components/dashboard/CommunityChatWidget';
import { getBestToeicGoalScore, isToeicGoalAttempt } from '../../utils/toeicGoal';

const formatRelativeTime = (dateString?: string, lang: 'vi' | 'en' = 'vi') => {
  if (!dateString) return lang === 'en' ? 'Just now' : 'Vừa xong';
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return lang === 'en' ? 'Online' : 'Vừa truy cập';
  if (diffSec < 3600) return lang === 'en' ? `${Math.floor(diffSec / 60)}m ago` : `${Math.floor(diffSec / 60)} phút trước`;
  if (diffSec < 86400) return lang === 'en' ? `${Math.floor(diffSec / 3600)}h ago` : `${Math.floor(diffSec / 3600)} giờ trước`;
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date);
};

const DashboardLoadingState: React.FC = () => (
  <div className="space-y-8 pb-16" role="status" aria-label="Đang tải trang tổng quan">
    {/* Skeleton Hero Banner */}
    <WelcomeBackCard
      isLoading
      userName=""
      xp={0}
      streakDays={0}
      longestStreak={0}
    />

    {/* Skeleton KPI 3 Thẻ */}
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Đang tải chỉ số học tập">
      {Array.from({ length: 3 }, (_, index) => (
        <article key={index} className="rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <BoneyardSkeleton name={`dashboard-metric-icon-${index}`} height={44} width={44} className="rounded-2xl" />
            <BoneyardSkeleton name={`dashboard-metric-badge-${index}`} height={24} width={76} className="rounded-full" />
          </div>
          <BoneyardSkeleton name={`dashboard-metric-value-${index}`} height={34} width="58%" className="mt-4 rounded-xl" />
          <BoneyardSkeleton name={`dashboard-metric-label-${index}`} variant="text" width="42%" className="mt-2" />
          <BoneyardSkeleton name={`dashboard-metric-note-${index}`} variant="text" width="75%" className="mt-2" />
        </article>
      ))}
    </section>

    {/* Skeleton Quick Actions */}
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="Đang tải phím tắt">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
          <BoneyardSkeleton name={`dashboard-qa-icon-${index}`} height={36} width={36} className="rounded-xl" />
          <BoneyardSkeleton name={`dashboard-qa-title-${index}`} variant="text" width="70%" className="mt-3" />
          <BoneyardSkeleton name={`dashboard-qa-desc-${index}`} variant="text" width="90%" className="mt-1" />
        </div>
      ))}
    </section>

    {/* Skeleton 7-Day & Chart */}
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-xs">
        <BoneyardSkeleton name="dashboard-weekly-title" variant="text" width={180} />
        <BoneyardSkeleton name="dashboard-weekly-body" height={240} className="mt-4 rounded-2xl" />
      </div>
      <div className="rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-xs">
        <BoneyardSkeleton name="dashboard-chart-title" variant="text" width={180} />
        <BoneyardSkeleton name="dashboard-chart-body" height={240} className="mt-4 rounded-2xl" />
      </div>
    </section>

    {/* Skeleton Activity Panel */}
    <div className="rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-xs">
      <BoneyardSkeleton name="dashboard-activity-title" variant="text" width={220} />
      <BoneyardSkeleton name="dashboard-activity-body" height={280} className="mt-4 rounded-2xl" />
    </div>

    {/* Skeleton AI Diagnostic */}
    <div className="rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-xs">
      <BoneyardSkeleton name="dashboard-ai-title" variant="text" width={240} />
      <BoneyardSkeleton name="dashboard-ai-body" height={280} className="mt-4 rounded-2xl" />
    </div>

    {/* Skeleton Community */}
    <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-xs">
        <BoneyardSkeleton name="dashboard-chat-title" variant="text" width={160} />
        <BoneyardSkeleton name="dashboard-chat-body" height={320} className="mt-4 rounded-2xl" />
      </div>
      <div className="rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-xs">
        <BoneyardSkeleton name="dashboard-students-title" variant="text" width={180} />
        <BoneyardSkeleton name="dashboard-students-body" count={5} variant="row" className="mt-4" />
      </div>
    </section>
  </div>
);

export const DashboardLivePage: React.FC = () => {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [attempts, setAttempts] = useState<StudyAttempt[]>([]);
  const [studySummary, setStudySummary] = useState({ totalQuestions: 0, correctQuestions: 0, accuracyRate: 0 });
  const [activeStudents, setActiveStudents] = useState<RecentActiveStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Tải lịch sử làm bài và danh sách học viên vừa truy cập
  const loadHistory = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const [data, summary, activeList] = await Promise.all([
        backendService.getStudyHistory(user.id),
        backendService.getStudySummary(),
        backendService.getRecentActiveStudents(),
      ]);
      if (data === null) {
        setError(language === 'en' ? 'Could not load study history from server.' : 'Không thể tải lịch sử học tập từ hệ thống.');
      } else {
        setAttempts(data);
        setStudySummary(summary);
        setActiveStudents(activeList);
      }
    } catch {
      setError(language === 'en' ? 'Failed to connect to data server.' : 'Đã xảy ra lỗi khi kết nối dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    void loadHistory();
    // Tự động làm mới danh sách học viên vừa truy cập mỗi 15s
    const interval = setInterval(async () => {
      try {
        const list = await backendService.getRecentActiveStudents();
        if (isMounted && list.length > 0) setActiveStudents(list);
      } catch {
        // ignore background fetch error
      }
    }, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user?.id]);

  // Tính toán các chỉ số học tập chính.
  const metrics = useMemo(() => {
    const totalQuestions = studySummary.totalQuestions;
    const totalCorrect = studySummary.correctQuestions;
    const averageAccuracy = Math.round(studySummary.accuracyRate);

    const bestScore = getBestToeicGoalScore(attempts);

    // Tính chính xác cho Listening & Reading
    const listeningAttempts = attempts.filter((a) => a.listeningScore !== undefined || (a.part && a.part <= 4));
    const readingAttempts = attempts.filter((a) => a.readingScore !== undefined || (a.part && a.part >= 5));

    const listeningAcc = listeningAttempts.length
      ? Math.round(listeningAttempts.reduce((sum, a) => sum + a.accuracyRate, 0) / listeningAttempts.length)
      : null;

    const readingAcc = readingAttempts.length
      ? Math.round(readingAttempts.reduce((sum, a) => sum + a.accuracyRate, 0) / readingAttempts.length)
      : null;

    return {
      averageAccuracy,
      totalCorrect,
      totalQuestions,
      bestScore,
      totalAttempts: attempts.length,
      listeningAcc,
      readingAcc,
    };
  }, [attempts, studySummary]);

  // Chuẩn bị dữ liệu cho biểu đồ Tiến trình điểm số (Tối đa 8 bài gần đây)
  const chartData = useMemo(() => {
    return [...attempts]
      .filter(isToeicGoalAttempt)
      .reverse()
      .slice(-8)
      .map((item) => {
        const dateStr = item.completedAt
          ? new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'vi-VN', { day: '2-digit', month: '2-digit' }).format(new Date(item.completedAt))
          : (language === 'en' ? 'Recent' : 'Gần đây');
        return {
          label: dateStr,
          score: item.totalScore || 0,
          accuracy: item.accuracyRate,
          correct: `${item.correctAnswers}/${item.totalQuestions}`,
          name: item.testName || (item.part ? (language === 'en' ? `Practice Part ${item.part}` : `Luyện Part ${item.part}`) : (language === 'en' ? 'TOEIC Exercise' : 'Bài tập TOEIC')),
        };
      });
  }, [attempts, language]);

  // Tính điểm trung bình của 8 bài gần nhất
  const averageRecentScore = useMemo(() => {
    if (chartData.length === 0) return 0;
    const sum = chartData.reduce((acc, curr) => acc + curr.score, 0);
    return Math.round(sum / chartData.length);
  }, [chartData]);

  // Dải phím tắt hành động nhanh cho 5 chức năng cốt lõi
  const quickActions = useMemo(() => [
    {
      title: language === 'en' ? 'Mock Tests' : 'Kho Đề Thi Thử',
      desc: language === 'en' ? '200 questions · ETS test' : '200 câu · Bấm giờ chuẩn ETS',
      icon: BookOpenCheck,
      path: '/mock-test',
      badge: language === 'en' ? 'Simulate' : 'Mô phỏng',
      accent: 'border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-500/10 dark:text-emerald-300',
      badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
    },
    {
      title: language === 'en' ? 'Practice by Part' : 'Luyện Theo Part',
      desc: language === 'en' ? 'Drill Part 1-7 by level' : 'Cày Part 1-7 theo độ khó',
      icon: Layers,
      path: '/practice-by-level',
      badge: language === 'en' ? 'Drill' : 'Trọng tâm',
      accent: 'border-sky-200/80 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-500/10 dark:text-sky-300',
      badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300',
    },
    {
      title: language === 'en' ? 'Vocabulary' : 'Kho Từ Vựng',
      desc: language === 'en' ? '3,000+ words with flashcards' : '3,000+ từ vựng & flashcards',
      icon: BookOpen,
      path: '/vocabulary',
      badge: language === 'en' ? 'Flashcards' : 'Ghi nhớ',
      accent: 'border-amber-200/80 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-500/10 dark:text-amber-300',
      badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    },
    {
      title: language === 'en' ? 'Grammar Master' : 'Ngữ Pháp ETS',
      desc: language === 'en' ? '18 core topics & PDF sets' : '18 chuyên đề bám sát đề thi',
      icon: FileText,
      path: '/grammar',
      badge: language === 'en' ? 'Part 5-6' : 'Chuyên đề',
      accent: 'border-purple-200/80 bg-purple-50 text-purple-700 dark:border-purple-900/40 dark:bg-purple-500/10 dark:text-purple-300',
      badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300',
    },
    {
      title: language === 'en' ? 'Leaderboard' : 'Bảng Xếp Hạng',
      desc: language === 'en' ? 'Class & course rankings' : 'Đua top vinh danh cùng lớp',
      icon: Trophy,
      path: '/ranking',
      badge: language === 'en' ? 'Arena' : 'Đua Top',
      accent: 'border-rose-200/80 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-300',
      badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
    },
  ], [language]);

  if (!user) return null;
  if (loading) return <DashboardLoadingState />;

  const currentScore = metrics.bestScore;
  const hasToeicScore = currentScore > 0;
  const targetScore = user.targetScore || 750;

  // Kiểm tra ngày thi dự kiến nếu học viên có đặt exam_date
  const examDateObj = user.examDate ? new Date(user.examDate) : null;
  const now = new Date();
  const daysToExam = examDateObj && !isNaN(examDateObj.getTime())
    ? Math.ceil((examDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const hasFutureExam = daysToExam !== null && daysToExam > 0;
  const formattedExamDate = examDateObj && !isNaN(examDateObj.getTime())
    ? new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'vi-VN', { dateStyle: 'medium' }).format(examDateObj)
    : '';

  const targetProgressRatio = Math.min(100, Math.round((currentScore / targetScore) * 100));

  return (
    <div className="space-y-8 pb-16">

      {/* KHỐI 1: WELCOME BACK HERO BANNER VỚI LINH VẬT & GAMIFICATION HUB */}
      <div id="tour-db-welcome">
        <WelcomeBackCard
          userName={user.name}
          xp={user.xp}
          targetScore={targetScore}
          level={user.level ?? 1}
          streakDays={user.streakDays}
          longestStreak={user.longestStreak ?? user.streakDays}
        />
      </div>

      {/* CẢNH BÁO LỖI NẾU CÓ */}
      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/30">
          <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">{error}</p>
          <button
            type="button"
            onClick={() => void loadHistory()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-rose-700 shadow-2xs hover:bg-rose-100 dark:bg-rose-900/40 dark:text-rose-200"
          >
            <RefreshCw className="size-3.5" /> {language === 'en' ? 'Retry' : 'Thử lại'}
          </button>
        </div>
      )}

      {/* KHỐI 2: HÀNG 3 THẺ KPI TRỌNG TÂM (ĐIỂM CAO NHẤT, NGÀY THI/BÀI LUYỆN, ĐỘ CHÍNH XÁC) */}
      <section id="tour-db-metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* KPI 1: ĐIỂM TOEIC CAO NHẤT & TIẾN ĐỘ MỤC TIÊU */}
        <article className="group relative overflow-hidden rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-xs transition hover:border-emerald-500/40 hover:shadow-sm dark:shadow-none flex flex-col justify-between">
          <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-emerald-500/5 blur-2xl" />
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="grid size-11 place-items-center rounded-2xl border border-emerald-200/80 bg-emerald-50 text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-500/10 dark:text-emerald-300">
                <Target className="size-5" />
              </span>
              {hasToeicScore && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider ${
                  currentScore >= targetScore
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                }`}>
                  {currentScore >= targetScore
                    ? (language === 'en' ? 'Goal Met 🎉' : 'Đạt Mục Tiêu')
                    : (language === 'en' ? `Target ${targetScore}` : `Mục tiêu ${targetScore}`)}
                </span>
              )}
            </div>

            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black tracking-tight text-content">
                  {hasToeicScore ? currentScore : (language === 'en' ? 'No Score' : 'Chưa có điểm')}
                </span>
                {hasToeicScore && (
                  <span className="text-xs font-extrabold text-content-muted">/ 990 pts</span>
                )}
              </div>
              <h3 className="mt-1 text-xs font-bold text-content-muted">{t('dashboard.bestScore')}</h3>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-line/60">
            {hasToeicScore ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-content-muted">
                    {currentScore >= targetScore
                      ? (language === 'en' ? 'Target reached' : 'Đã vượt chỉ tiêu')
                      : (language === 'en' ? `Need +${targetScore - currentScore} pts` : `Cần +${targetScore - currentScore} điểm`)}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono font-black">{targetProgressRatio}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-surface-elevated">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${targetProgressRatio}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-[11px] font-medium text-slate-400 dark:text-content-muted">
                {t('dashboard.fullTestHint')}
              </p>
            )}
          </div>
        </article>

        {/* KPI 2: ĐẾM NGƯỢC NGÀY THI HOẶC TỔNG SỐ BÀI LUYỆN */}
        <article className="group relative overflow-hidden rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-xs transition hover:border-sky-500/40 hover:shadow-sm dark:shadow-none flex flex-col justify-between">
          <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-sky-500/5 blur-2xl" />
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="grid size-11 place-items-center rounded-2xl border border-sky-200/80 bg-sky-50 text-sky-600 dark:border-sky-900/40 dark:bg-sky-500/10 dark:text-sky-300">
                {hasFutureExam ? <CalendarDays className="size-5" /> : <BookOpenCheck className="size-5" />}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-black text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 uppercase tracking-wider">
                {hasFutureExam ? (language === 'en' ? 'Countdown' : 'Đếm Ngược') : (language === 'en' ? 'Sessions' : 'Luyện Tập')}
              </span>
            </div>

            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black tracking-tight text-content">
                  {hasFutureExam ? daysToExam : metrics.totalAttempts}
                </span>
                <span className="text-xs font-extrabold text-content-muted">
                  {hasFutureExam ? (language === 'en' ? 'days left' : 'ngày tới thi') : (language === 'en' ? 'completed' : 'bài hoàn tất')}
                </span>
              </div>
              <h3 className="mt-1 text-xs font-bold text-content-muted">
                {hasFutureExam ? t('dashboard.examCountdown') : t('dashboard.practicesCompleted')}
              </h3>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-line/60">
            <p className="text-[11px] font-semibold text-content-muted truncate">
              {hasFutureExam
                ? `${language === 'en' ? 'Exam date' : 'Lịch thi'}: ${formattedExamDate}`
                : (metrics.totalQuestions > 0
                    ? `${language === 'en' ? 'Questions solved' : 'Đã giải'}: ${metrics.totalCorrect}/${metrics.totalQuestions} câu`
                    : t('dashboard.practicesSubtext'))}
            </p>
          </div>
        </article>

        {/* KPI 3: ĐỘ CHÍNH XÁC TRUNG BÌNH & PHÂN TÁCH LISTENING / READING */}
        <article className="group relative overflow-hidden rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-xs transition hover:border-brand-500/40 hover:shadow-sm dark:shadow-none flex flex-col justify-between">
          <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-brand-500/5 blur-2xl" />
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="grid size-11 place-items-center rounded-2xl border border-brand-200/80 bg-brand-50 text-brand-700 dark:border-brand-900/40 dark:bg-brand-500/10 dark:text-brand-300">
                <TrendingUp className="size-5" />
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-0.5 text-[11px] font-black text-brand-800 dark:bg-brand-950/60 dark:text-brand-300 uppercase tracking-wider">
                {language === 'en' ? 'Accuracy' : 'Độ Chuẩn'}
              </span>
            </div>

            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black tracking-tight text-content font-mono">
                  {metrics.averageAccuracy}%
                </span>
                <span className="text-xs font-extrabold text-content-muted">
                  {metrics.totalQuestions > 0 ? `(${metrics.totalCorrect}/${metrics.totalQuestions})` : ''}
                </span>
              </div>
              <h3 className="mt-1 text-xs font-bold text-content-muted">{t('dashboard.accuracy')}</h3>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-line/60">
            {metrics.listeningAcc !== null || metrics.readingAcc !== null ? (
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="inline-flex items-center gap-1 text-sky-700 dark:text-sky-300">
                  <Headphones className="size-3" />
                  <span>Nghe: {metrics.listeningAcc ?? 0}%</span>
                </span>
                <span className="text-line">•</span>
                <span className="inline-flex items-center gap-1 text-violet-700 dark:text-violet-300">
                  <BookOpen className="size-3" />
                  <span>Đọc: {metrics.readingAcc ?? 0}%</span>
                </span>
              </div>
            ) : (
              <p className="text-[11px] font-medium text-slate-400 dark:text-content-muted">
                {metrics.totalQuestions > 0 ? t('dashboard.accuracy') : t('dashboard.noAnswersYet')}
              </p>
            )}
          </div>
        </article>
      </section>

      {/* KHỐI 3: THANH KHỞI ĐỘNG NHANH 5 HÀNH ĐỘNG CỐT LÕI (QUICK LAUNCH HUB) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="size-4 text-amber-500 fill-amber-500" />
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-content">
              {language === 'en' ? 'Quick Launch & Daily Study Path' : 'Lối Tắt Luyện Tập Trọng Tâm'}
            </h2>
          </div>
          <span className="text-[11px] font-bold text-content-muted">
            {language === 'en' ? 'Choose a study mode' : 'Chọn chế độ học'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.path}
                to={action.path}
                className="group relative flex flex-col justify-between rounded-2xl border border-line bg-surface p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500/50 hover:shadow-xs active:translate-y-0"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`grid size-9 place-items-center rounded-xl border ${action.accent} transition-transform group-hover:scale-105`}>
                      <Icon className="size-4.5" />
                    </span>
                    <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${action.badgeClass}`}>
                      {action.badge}
                    </span>
                  </div>
                  <h3 className="mt-3 text-xs font-black text-content group-hover:text-brand-600 dark:group-hover:text-brand-400">
                    {action.title}
                  </h3>
                  <p className="mt-1 text-[11px] font-semibold text-content-muted line-clamp-1">
                    {action.desc}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-end text-content-muted group-hover:text-brand-600 dark:group-hover:text-brand-400">
                  <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* KHỐI 4: THỜI GIAN HỌC 7 NGÀY QUA & BIỂU ĐỒ TIẾN TRÌNH ĐIỂM SỐ */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WeeklyStudyTimeCard />

        {/* BIỂU ĐỒ TIẾN TRÌNH ĐIỂM SỐ (8 ĐỀ THI GẦN NHẤT) */}
        <article id="tour-db-chart" className="rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-xs dark:shadow-none flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
              <div>
                <h2 className="text-base font-extrabold text-content">{t('dashboard.scoreProgress')}</h2>
                <p className="mt-0.5 text-xs text-content-muted">{t('dashboard.scoreProgressDesc')}</p>
              </div>
              <div className="flex items-center gap-2">
                {averageRecentScore > 0 && (
                  <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-black text-amber-700 dark:text-amber-300">
                    {language === 'en' ? `Avg: ${averageRecentScore} pts` : `Điểm TB: ~${averageRecentScore}`}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                  <TrendingUp className="size-3.5" /> {chartData.length > 0 ? `${chartData.length} ${language === 'en' ? 'tests' : 'đề gần nhất'}` : (language === 'en' ? 'No data' : 'Chưa có')}
                </span>
              </div>
            </div>

            {loading ? (
              <div className="mt-4">
                <BoneyardSkeleton name="dashboard-chart-skeleton" variant="card" height={260} />
              </div>
            ) : chartData.length > 0 ? (
              <div className="mt-4 h-56 sm:h-64 w-full">
                <ResponsiveContainer width="100%" height="100%" debounce={100}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -24, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                    />
                    <YAxis
                      domain={[0, 990]}
                      ticks={[0, 250, 500, 750, 990]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="rounded-2xl border border-line bg-surface p-3.5 shadow-lg text-xs space-y-1.5">
                              <p className="font-extrabold text-content">{data.name}</p>
                              <p className="text-amber-600 dark:text-amber-400 font-mono font-black text-sm">
                                {language === 'en' ? 'Score' : 'Điểm'}: {data.score} / 990
                              </p>
                              <div className="flex items-center gap-2 text-content-muted font-medium">
                                <span>{language === 'en' ? 'Accuracy' : 'Chính xác'}: {data.accuracy}%</span>
                                <span>•</span>
                                <span>{data.correct}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#scoreColor)"
                      dot={{ r: 5, fill: '#f59e0b', strokeWidth: 2, stroke: '#ffffff' }}
                      activeDot={{ r: 7 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="mt-4 grid h-56 sm:h-64 place-items-center rounded-2xl border border-dashed border-line p-6 text-center">
                <div>
                  <p className="text-sm font-bold text-content">{t('dashboard.scoreProgressEmpty')}</p>
                  <p className="mt-1 text-xs text-content-muted max-w-sm mx-auto">
                    {language === 'en' ? 'Complete your first mock test to track score progression.' : 'Hoàn thành bài thi thử đầu tiên để bắt đầu theo dõi tiến trình điểm số.'}
                  </p>
                  <Link
                    to="/mock-test"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-contrast shadow-xs hover:opacity-90 active:scale-95"
                  >
                    {t('dashboard.takeTestNow')}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </article>
      </section>

      {/* KHỐI 5: NHIỆT KẾ HOẠT ĐỘNG ÔN LUYỆN & TIẾN ĐỘ 7 PHẦN THI */}
      <div id="tour-db-activity">
        <PracticeActivityPanel />
      </div>

      {/* KHỐI 6: CHẨN ĐOÁN NĂNG LỰC & DỰ BÁO AI (AI DIAGNOSTICS & RADAR HUB) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="size-4" />
            </span>
            <div>
              <h2 className="text-base font-black text-content sm:text-lg">
                {language === 'en' ? 'AI Diagnostic & Skill Mastery' : 'Chẩn Đoán Năng Lực & Dự Báo Điểm AI'}
              </h2>
              <p className="text-xs font-semibold text-content-muted">
                {language === 'en'
                  ? 'Machine learning models forecasting exam score and 7-part strength distribution'
                  : 'Mô hình học máy ước lượng điểm số thực tế và đánh giá độ thành thạo 7 phần thi'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <PredictionCard />
          <SkillsRadarCard />
        </div>
      </section>

      {/* KHỐI 7: PHÒNG TỰ HỌC & CỘNG ĐỒNG BẠN HỌC (LIVE COMMUNITY & ONLINE LEARNERS) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Users className="size-4" />
            </span>
            <div>
              <h2 className="text-base font-black text-content sm:text-lg">
                {language === 'en' ? 'Live Study Hub & Community' : 'Phòng Tự Học & Bạn Cùng Tiến'}
              </h2>
              <p className="text-xs font-semibold text-content-muted">
                {language === 'en'
                  ? 'Real-time peer chat and recently active learners'
                  : 'Thảo luận kinh nghiệm, hỏi đáp bài tập và kết nối cùng học viên trực tuyến'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          {/* CỘT 1: HỘP CHAT CỘNG ĐỒNG */}
          <div id="tour-db-chat">
            <CommunityChatWidget />
          </div>

          {/* CỘT 2: HỌC VIÊN VỪA TRUY CẬP TRỰC TUYẾN */}
          <article id="tour-db-active-students" className="rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-xs dark:shadow-none flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div className="flex items-center gap-2">
                  <span className="relative flex size-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500"></span>
                  </span>
                  <h3 className="text-sm font-black text-content">{t('dashboard.activeStudents')}</h3>
                </div>
                <span className="text-[11px] font-bold text-content-muted">{t('dashboard.latestAccess')}</span>
              </div>

              <div className="mt-4 space-y-2.5">
                {loading ? (
                  <BoneyardSkeleton name="dashboard-activities-skeleton" count={5} variant="row" />
                ) : activeStudents.length > 0 ? (
                  activeStudents.slice(0, 5).map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-line/60 bg-surface-elevated/40 p-3 transition hover:border-brand-500/40 hover:bg-surface-elevated/70"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          <img
                            src={student.avatar}
                            alt={student.name}
                            className="size-9 rounded-full border border-line object-cover bg-surface-elevated"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(student.name)}`;
                            }}
                          />
                          {student.isOnline && (
                            <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-surface" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-black text-content">{student.name}</p>
                          <p className="mt-0.5 truncate text-[11px] font-semibold text-content-muted">
                            {student.isOnline ? (
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">{t('dashboard.onlineNow')}</span>
                            ) : (
                              formatRelativeTime(student.lastActiveAt, language)
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-brand-500/10 px-2 py-0.5 text-xs font-black text-brand-600 dark:text-brand-400">
                          {student.currentScore > 0 ? `${student.currentScore} ${language === 'en' ? 'pts' : 'điểm'}` : (language === 'en' ? 'Student' : 'Học viên')}
                        </span>
                        {student.streakDays > 0 && (
                          <p className="mt-1 text-[10px] font-bold text-amber-500 flex items-center justify-end gap-1">
                            <Flame className="size-3 fill-amber-500 text-amber-500" />
                            <span>{student.streakDays} {language === 'en' ? 'days' : 'ngày'}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-line p-6 text-center text-xs text-content-muted">
                    {t('dashboard.noActiveStudents')}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 border-t border-line/60 pt-4">
              <Link
                to="/ranking"
                className="group flex items-center justify-between text-xs font-extrabold text-content-muted transition hover:text-brand-600 dark:hover:text-brand-400"
              >
                <span className="flex items-center gap-1.5">
                  <Trophy className="size-3.5 text-amber-500" />
                  <span>{language === 'en' ? 'View Class & Course Rankings' : 'Xem Bảng Xếp Hạng Lớp & Toàn Khóa'}</span>
                </span>
                <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </article>
        </div>
      </section>

    </div>
  );
};
