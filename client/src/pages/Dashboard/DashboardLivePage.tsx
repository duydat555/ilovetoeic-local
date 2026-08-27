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
import { backendService } from '../../services/backend';
import { StudyAttempt } from '../../types';
import { BoneyardSkeleton } from '../../components/common/BoneyardSkeleton';
import { PracticeActivityPanel } from '../../components/dashboard/PracticeActivityPanel';
import { CommunityChatWidget } from '../../components/dashboard/CommunityChatWidget';
import { getBestToeicGoalScore, isToeicGoalAttempt } from '../../utils/toeicGoal';

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
  const [attempts, setAttempts] = useState<StudyAttempt[]>([]);
  const [studySummary, setStudySummary] = useState({ totalQuestions: 0, correctQuestions: 0, accuracyRate: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Tải lịch sử làm bài từ backend
  const loadHistory = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const [data, summary] = await Promise.all([
        backendService.getStudyHistory(user.id),
        backendService.getStudySummary(),
      ]);
      if (data === null) {
        setError('Không thể tải lịch sử học tập từ hệ thống.');
      } else {
        setAttempts(data);
        setStudySummary(summary);
      }
    } catch {
      setError('Đã xảy ra lỗi khi kết nối dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
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
          ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(new Date(item.completedAt))
          : 'Gần đây';
        return {
          label: dateStr,
          score: item.totalScore || 0,
          accuracy: item.accuracyRate,
          correct: `${item.correctAnswers}/${item.totalQuestions}`,
          name: item.testName || (item.part ? `Luyện Part ${item.part}` : 'Bài tập TOEIC'),
        };
      });
  }, [attempts]);

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
      label: 'Điểm cao nhất',
      value: hasToeicScore ? `${currentScore} điểm` : 'Chưa có điểm',
      subtext: hasToeicScore
        ? (currentScore >= targetScore ? 'Đã đạt mục tiêu 🎉' : `Còn thiếu ${pointsRemaining} điểm`)
        : 'Cần hoàn thành đề thi đủ 200 câu',
      icon: Target,
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/40',
    },
    {
      label: 'Mục tiêu TOEIC',
      value: `${targetScore} điểm`,
      subtext: `${progress}% tiến độ hoàn thành`,
      icon: TrendingUp,
      color: 'text-sky-600 bg-sky-50 dark:bg-sky-500/10 dark:text-sky-300 border-sky-200/60 dark:border-sky-900/40',
    },
    {
      label: 'Độ chính xác trung bình',
      value: `${metrics.averageAccuracy}%`,
      subtext: metrics.totalQuestions > 0 ? `Đúng ${metrics.totalCorrect}/${metrics.totalQuestions} câu` : 'Chưa có câu trả lời được ghi nhận',
      icon: BookOpenCheck,
      color: 'text-brand-700 bg-brand-50 dark:bg-brand-500/10 dark:text-brand-300 border-brand-200/60 dark:border-brand-900/40',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Back Card with Three.js Mascot */}
      <WelcomeBackCard
        userName={user.name}
        xp={user.questionsAnswered || 0}
        streakDays={user.streakDays}
        longestStreak={user.longestStreak ?? user.streakDays}
      />

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
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

      <PracticeActivityPanel />

      {/* Community Chat & Recent Activities Grid */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <CommunityChatWidget />

        {/* Lịch sử hoạt động học tập gần đây */}
        <article className="rounded-3xl border border-line bg-surface p-5 shadow-xs dark:shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-5 text-brand-600 dark:text-brand-400" />
                <h2 className="text-base font-extrabold text-content">Hoạt động gần đây</h2>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              {loading ? (
                <BoneyardSkeleton name="dashboard-activities-skeleton" count={5} variant="row" />
              ) : attempts.length > 0 ? (
                attempts.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl border border-line/60 bg-surface-elevated/50 p-3"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="truncate text-xs font-bold text-content">
                        {item.testName || (item.part ? `Luyện Part ${item.part}` : 'Bài thi TOEIC')}
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-content-muted">
                        {item.completedAt
                          ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.completedAt))
                          : 'Vừa hoàn thành'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-0.5 text-xs font-black text-emerald-600 dark:text-emerald-400">
                        {item.accuracyRate}%
                      </span>
                      <p className="mt-1 text-[10px] font-semibold text-content-muted">
                        {item.correctAnswers}/{item.totalQuestions} câu
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-line p-6 text-center text-xs text-content-muted">
                  Chưa có hoạt động học tập nào được ghi nhận.
                </div>
              )}
            </div>
          </div>
        </article>
      </section>

      {/* Biểu đồ Tiến trình điểm số */}
      <article className="rounded-3xl border border-line bg-surface p-5 shadow-xs dark:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <h2 className="text-base font-extrabold text-content">Tiến trình điểm số</h2>
            <p className="mt-0.5 text-xs text-content-muted">Theo dõi 8 đề thi đầy đủ 200 câu gần nhất</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
            <CheckCircle2 className="size-3.5" /> {progress}% mục tiêu
            ({hasToeicScore ? `${currentScore}/${targetScore}` : 'Chưa có điểm'})
          </span>
        </div>

        {loading ? (
          <div className="mt-4">
            <BoneyardSkeleton name="dashboard-chart-skeleton" variant="card" height={260} />
          </div>
        ) : chartData.length > 0 ? (
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
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
                            Điểm: {data.score} / 990
                          </p>
                          <div className="flex items-center gap-2 text-content-muted font-medium">
                            <span>Chính xác: {data.accuracy}%</span>
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
          <div className="mt-4 grid h-64 place-items-center rounded-2xl border border-dashed border-line p-6 text-center">
            <div>
              <p className="text-sm font-bold text-content">Chưa có kết quả thi để vẽ biểu đồ</p>
              <p className="mt-1 text-xs text-content-muted">Hoàn thành bài thi thử đầu tiên để bắt đầu theo dõi tiến trình điểm số.</p>
              <Link
                to="/mock-test"
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-600"
              >
                Làm bài thi thử ngay
              </Link>
            </div>
          </div>
        )}
      </article>
    </div>
  );
};
