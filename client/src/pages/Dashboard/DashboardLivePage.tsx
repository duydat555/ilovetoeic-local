import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  RefreshCw,
  Target,
  TrendingUp,
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
import { LevelProgressCard } from '../../components/dashboard/LevelProgressCard';
import { SkillsRadarCard } from '../../components/dashboard/SkillsRadarCard';
import { PredictionCard } from '../../components/dashboard/PredictionCard';
import { CommunityChatWidget } from '../../components/dashboard/CommunityChatWidget';
import { getBestToeicGoalScore, isToeicGoalAttempt } from '../../utils/toeicGoal';

const formatRelativeTime = (dateString?: string, lang: 'vi' | 'en' = 'vi') => {
  if (!dateString) return lang === 'en' ? 'Just now' : 'Vừa xong';
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return lang === 'en' ? 'Just now' : 'Vừa truy cập';
  if (diffSec < 3600) return lang === 'en' ? `${Math.floor(diffSec / 60)}m ago` : `${Math.floor(diffSec / 60)} phút trước`;
  if (diffSec < 86400) return lang === 'en' ? `${Math.floor(diffSec / 3600)}h ago` : `${Math.floor(diffSec / 3600)} giờ trước`;
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date);
};

const DashboardLoadingState: React.FC = () => (
  <div className="space-y-6 pb-12" role="status" aria-label="Đang tải trang tổng quan">
    <WelcomeBackCard
      isLoading
      userName=""
      xp={0}
      streakDays={0}
      longestStreak={0}
    />

    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Đang tải chỉ số học tập">
      {Array.from({ length: 3 }, (_, index) => (
        <article key={index} className="surface rounded-2xl border border-line p-5">
          <BoneyardSkeleton name={`dashboard-metric-icon-${index}`} height={44} width={44} className="rounded-2xl" />
          <BoneyardSkeleton name={`dashboard-metric-value-${index}`} height={28} width="58%" className="mt-4 rounded-lg" />
          <BoneyardSkeleton name={`dashboard-metric-label-${index}`} variant="text" width="42%" className="mt-2" />
          <BoneyardSkeleton name={`dashboard-metric-note-${index}`} variant="text" width="72%" className="mt-2" />
        </article>
      ))}
    </section>

    <section className="surface rounded-2xl border border-line p-4 sm:p-5">
      <div className="flex items-start gap-3 border-b border-line pb-4">
        <BoneyardSkeleton name="dashboard-activity-icon" height={36} width={36} className="shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2">
          <BoneyardSkeleton name="dashboard-activity-title" variant="text" width={150} />
          <BoneyardSkeleton name="dashboard-activity-copy" variant="text" width="min(80%, 28rem)" />
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <BoneyardSkeleton name="dashboard-activity-parts" height={286} className="rounded-2xl border border-line" />
        <BoneyardSkeleton name="dashboard-activity-calendar" height={286} className="rounded-2xl border border-line" />
      </div>
    </section>

    <section className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
      <article className="surface rounded-2xl border border-line p-5">
        <div className="space-y-2 border-b border-line pb-4">
          <BoneyardSkeleton name="dashboard-chart-title" variant="text" width={156} />
          <BoneyardSkeleton name="dashboard-chart-copy" variant="text" width={248} />
        </div>
        <BoneyardSkeleton name="dashboard-chart" height={256} className="mt-4 rounded-xl" />
      </article>
      <article className="surface rounded-2xl border border-line p-5">
        <BoneyardSkeleton name="dashboard-recent-title" variant="text" width={164} className="mb-4" />
        <BoneyardSkeleton name="dashboard-recent-rows" count={4} variant="row" />
      </article>
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

  if (!user) return null;
  if (loading) return <DashboardLoadingState />;

  // History is the source of truth. Cached scores from before this eligibility
  // rule must not make practice or partial exams count toward the TOEIC goal.
  const currentScore = metrics.bestScore;
  const hasToeicScore = currentScore > 0;
  const targetScore = user.targetScore || 750;
  const progress = Math.min(100, Math.round((currentScore / targetScore) * 100));
  const pointsRemaining = Math.max(0, targetScore - currentScore);

  const metricCards = [
    {
      label: t('dashboard.bestScore'),
      value: hasToeicScore ? `${currentScore} ${t('common.points')}` : t('dashboard.noScore'),
      subtext: hasToeicScore
        ? (currentScore >= targetScore ? t('dashboard.goalAchieved') : t('dashboard.scoreNeeded', { points: pointsRemaining }))
        : t('dashboard.fullTestHint'),
      icon: Target,
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/40',
    },
    {
      label: t('dashboard.targetScore'),
      value: `${targetScore} ${t('common.points')}`,
      subtext: `${progress}% ${t('common.completed')}`,
      icon: TrendingUp,
      color: 'text-sky-600 bg-sky-50 dark:bg-sky-500/10 dark:text-sky-300 border-sky-200/60 dark:border-sky-900/40',
    },
    {
      label: t('dashboard.accuracy'),
      value: `${metrics.averageAccuracy}%`,
      subtext: metrics.totalQuestions > 0 ? t('dashboard.questionsCorrect', { correct: metrics.totalCorrect, total: metrics.totalQuestions }) : t('dashboard.noAnswersYet'),
      icon: BookOpenCheck,
      color: 'text-brand-700 bg-brand-50 dark:bg-brand-500/10 dark:text-brand-300 border-brand-200/60 dark:border-brand-900/40',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Back Card with Three.js Mascot */}
      <div id="tour-db-welcome">
        <WelcomeBackCard
          userName={user.name}
          xp={user.xp ?? user.questionsAnswered ?? 0}
          level={user.level ?? 1}
          streakDays={user.streakDays}
          longestStreak={user.longestStreak ?? user.streakDays}
        />
      </div>

      {/* Alert Lỗi nếu có */}
      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/30">
          <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">{error}</p>
          <button
            type="button"
            onClick={() => void loadHistory()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-rose-700 shadow-2xs hover:bg-rose-100 dark:bg-rose-900/40 dark:text-rose-200"
          >
            <RefreshCw className="size-3.5" /> Thử lại
          </button>
        </div>
      )}

      {/* Metric Cards (Điểm cao nhất, Mục tiêu, Độ chính xác) */}
      <section id="tour-db-metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [1, 2, 3].map((id) => (
            <BoneyardSkeleton key={id} name={`dashboard-metric-${id}`} variant="card" height={124} />
          ))
        ) : (
          metricCards.map(({ label, value, subtext, icon: Icon, color }) => (
            <article
              key={label}
              className="group relative overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-xs transition hover:border-brand-300 dark:hover:border-brand-800 dark:shadow-none"
            >
              <div className="flex items-center justify-between">
                <span className={`grid size-11 place-items-center rounded-2xl border ${color}`}>
                  <Icon className="size-5" />
                </span>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-black tracking-tight text-content">{value}</p>
                <p className="mt-1 text-xs font-bold text-content-muted">{label}</p>
                <p className="mt-1 text-[11px] font-medium text-slate-400 dark:text-content-muted">{subtext}</p>
              </div>
            </article>
          ))
        )}
      </section>

      {/* Gamification Level */}
      <LevelProgressCard />

      {/* Thời gian học 7 ngày qua & Biểu đồ Tiến trình điểm số */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WeeklyStudyTimeCard />

        {/* Biểu đồ Tiến trình điểm số */}
        <article id="tour-db-chart" className="rounded-3xl border border-line bg-surface p-5 shadow-xs dark:shadow-none flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
              <div>
                <h2 className="text-base font-extrabold text-content">{t('dashboard.scoreProgress')}</h2>
                <p className="mt-0.5 text-xs text-content-muted">{t('dashboard.scoreProgressDesc')}</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                <CheckCircle2 className="size-3.5" /> {progress}% {language === 'en' ? 'of goal' : 'mục tiêu'}
                ({hasToeicScore ? `${currentScore}/${targetScore}` : (language === 'en' ? 'No score yet' : 'Chưa có điểm')})
              </span>
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
                            <div className="rounded-xl border border-line bg-surface p-3 shadow-lg text-xs space-y-1.5">
                              <p className="font-extrabold text-content">{data.name}</p>
                              <p className="text-amber-600 dark:text-amber-400 font-black text-sm">
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
                  <p className="mt-1 text-xs text-content-muted">{language === 'en' ? 'Complete your first mock test to track score progression.' : 'Hoàn thành bài thi thử đầu tiên để bắt đầu theo dõi tiến trình điểm số.'}</p>
                  <Link
                    to="/mock-test"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-600"
                  >
                    {t('dashboard.takeTestNow')}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </article>
      </section>

      <div id="tour-db-activity">
        <PracticeActivityPanel />
      </div>

      <PredictionCard />

      <SkillsRadarCard />

      {/* Community Chat & Recent Activities Grid */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <div id="tour-db-chat">
          <CommunityChatWidget />
        </div>

        {/* Học viên vừa truy cập trang web */}
        <article id="tour-db-active-students" className="rounded-3xl border border-line bg-surface p-5 shadow-xs dark:shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-2">
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500"></span>
                </span>
                <h2 className="text-base font-extrabold text-content">{t('dashboard.activeStudents')}</h2>
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
                    className="flex items-center justify-between gap-3 rounded-2xl border border-line/60 bg-surface-elevated/50 p-3 transition hover:border-brand-500/30"
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
                        <p className="truncate text-xs font-extrabold text-content">{student.name}</p>
                        <p className="mt-0.5 truncate text-[11px] font-medium text-content-muted">
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
                        <p className="mt-1 text-[10px] font-bold text-amber-500">
                          🔥 {student.streakDays} {language === 'en' ? 'days' : 'ngày'}
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
        </article>
      </section>
    </div>
  );
};
