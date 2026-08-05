import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flame,
  RefreshCw,
  Target,
  TrendingUp,
} from 'lucide-react';
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

export const DashboardLivePage: React.FC = () => {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<StudyAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [todayActiveSeconds, setTodayActiveSeconds] = useState<number>(0);

  // Tải lịch sử làm bài từ backend
  const loadHistory = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const data = await backendService.getStudyHistory(user.id);
      if (data === null) {
        setError('Không thể tải lịch sử học tập từ hệ thống.');
      } else {
        setAttempts(data);
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

  // Đồng bộ thời gian học thực tế hôm nay từ localStorage (Giống Header ActiveTimeTracker)
  useEffect(() => {
    if (!user) return;

    const getActiveSeconds = () => {
      const today = new Date().toISOString().slice(0, 10);
      const uid = user?.id || 'guest';
      const saved = localStorage.getItem(`toeic_active_time_${uid}_${today}`);
      return saved ? parseInt(saved, 10) || 0 : 0;
    };

    setTodayActiveSeconds(getActiveSeconds());

    const interval = setInterval(() => {
      setTodayActiveSeconds(getActiveSeconds());
    }, 1000);

    return () => clearInterval(interval);
  }, [user?.id]);

  // Định dạng tổng thời gian học (kết hợp thời gian bài thi + thời gian active hôm nay)
  const formatTotalTime = (totalSecs: number) => {
    if (totalSecs <= 0) return '0 phút';
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    if (hours > 0) {
      return `${hours}g ${mins}p`;
    }
    if (mins > 0) {
      return `${mins}p ${secs}s`;
    }
    return `${secs} giây`;
  };

  // Tính toán chỉ số chính xác & thời gian
  const metrics = useMemo(() => {
    const historySeconds = attempts.reduce((total, item) => total + (item.timeSpentSeconds || 0), 0);
    const totalActiveSeconds = historySeconds + todayActiveSeconds;

    const totalQuestions = attempts.reduce((total, item) => total + (item.totalQuestions || 0), 0);
    const totalCorrect = attempts.reduce((total, item) => total + (item.correctAnswers || 0), 0);

    const averageAccuracy = totalQuestions > 0
      ? Math.round((totalCorrect / totalQuestions) * 100)
      : attempts.length
      ? Math.round(attempts.reduce((total, item) => total + item.accuracyRate, 0) / attempts.length)
      : 0;

    const bestScore = attempts.reduce((best, item) => Math.max(best, item.totalScore || 0), 0);

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
      displayTime: formatTotalTime(totalActiveSeconds),
      averageAccuracy,
      totalCorrect,
      totalQuestions,
      bestScore,
      totalAttempts: attempts.length,
      listeningAcc,
      readingAcc,
    };
  }, [attempts, todayActiveSeconds]);

  // Chuẩn bị dữ liệu cho biểu đồ Tiến trình điểm số (Tối đa 8 bài gần đây)
  const chartData = useMemo(() => {
    return [...attempts]
      .reverse()
      .slice(-8)
      .map((item) => {
        const dateStr = item.completedAt
          ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(new Date(item.completedAt))
          : 'Gần đây';
        const computedScore = item.totalScore || Math.min(990, Math.round((item.accuracyRate / 100) * 990));
        return {
          label: dateStr,
          score: computedScore,
          accuracy: item.accuracyRate,
          correct: `${item.correctAnswers}/${item.totalQuestions}`,
          name: item.testName || (item.part ? `Luyện Part ${item.part}` : 'Bài tập TOEIC'),
        };
      });
  }, [attempts]);

  if (!user) return null;

  const currentScore = Math.max(user.currentScore || 0, metrics.bestScore);
  const targetScore = user.targetScore || 750;
  const progress = Math.min(100, Math.round((currentScore / targetScore) * 100));
  const pointsRemaining = Math.max(0, targetScore - currentScore);

  const metricCards = [
    {
      label: 'Điểm cao nhất',
      value: currentScore > 0 ? `${currentScore} điểm` : 'Chưa có',
      subtext: currentScore >= targetScore ? 'Đã đạt mục tiêu 🎉' : `Còn thiếu ${pointsRemaining} điểm`,
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
      label: 'Tổng thời gian học',
      value: metrics.displayTime,
      subtext: 'Đồng bộ thời gian thực với Header',
      icon: Clock3,
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-300 border-amber-200/60 dark:border-amber-900/40',
    },
    {
      label: 'Độ chính xác trung bình',
      value: `${metrics.averageAccuracy}%`,
      subtext: metrics.totalQuestions > 0 ? `Đúng ${metrics.totalCorrect}/${metrics.totalQuestions} câu` : 'Dựa trên bài làm thực tế',
      icon: BookOpenCheck,
      color: 'text-brand-700 bg-brand-50 dark:bg-brand-500/10 dark:text-brand-300 border-brand-200/60 dark:border-brand-900/40',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Banner Chào mừng & Tiến độ Mục tiêu */}
      <section className="relative overflow-hidden rounded-[28px] border border-brand-300/80 bg-gradient-to-br from-brand via-amber-400 to-amber-500 p-6 text-brand-ink shadow-sm sm:p-8">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/40 px-3 py-1.5 text-xs font-black backdrop-blur-xs">
                <Flame className="size-4 text-orange-600" />
                <span>Chuỗi học {user.streakDays} ngày</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/40 px-3 py-1.5 text-xs font-black backdrop-blur-xs">
                <Target className="size-4 text-brand-900" />
                <span>Mục tiêu: {targetScore} TOEIC</span>
              </span>
            </div>

            <h1 className="flex flex-wrap items-center gap-2.5 text-2xl font-black tracking-tight text-brand-ink sm:text-3xl lg:text-4xl">
              <span>Chào mừng trở lại, {user.name}!</span>
              <span
                className="inline-flex items-center justify-center rounded-2xl border border-amber-300/80 bg-amber-100/90 px-2.5 py-1 text-2xl shadow-2xs dark:border-amber-400/40 dark:bg-amber-900/40"
                role="img"
                aria-label="Waving hand"
              >
                👋
              </span>
            </h1>

            <p className="text-sm font-medium leading-relaxed text-brand-ink/85">
              Tổng quan dưới đây tự động cập nhật kết quả bài thi và thời gian hoạt động thực tế trên tài khoản của bạn.
            </p>

            {/* Thanh tiến độ mục tiêu */}
            <div className="mt-4 rounded-2xl bg-white/40 p-4 backdrop-blur-xs">
              <div className="flex items-center justify-between text-xs font-extrabold text-brand-ink">
                <span>Tiến độ đạt mục tiêu ({currentScore}/{targetScore})</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/50">
                <div
                  className="h-full rounded-full bg-brand-ink transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2 text-[11px] font-bold text-brand-ink/80">
                {currentScore >= targetScore
                  ? '🎉 Xuất sắc! Bạn đã đạt mục tiêu điểm số đề ra.'
                  : `💪 Bạn còn thiếu ${pointsRemaining} điểm để chạm mốc ${targetScore} TOEIC.`}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center">
            <Link
              to="/mock-test"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand-ink px-6 text-sm font-black text-white shadow-md transition hover:bg-slate-900"
            >
              <span>Vào thi thử ngay</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

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

      {/* Metric Cards (Điểm cao nhất, Mục tiêu, Thời gian học, Độ chính xác) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <BoneyardSkeleton name="dashboard-metrics" count={4} variant="card" height={124} />
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

      {/* Chi tiết Độ chính xác & Biểu đồ Tiến trình điểm số */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_.8fr]">
        {/* Biểu đồ Tiến trình điểm số */}
        <article className="rounded-2xl border border-line bg-surface p-5 shadow-xs dark:shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div>
              <h2 className="text-base font-extrabold text-content">Tiến trình điểm số</h2>
              <p className="mt-0.5 text-xs text-content-muted">Theo dõi 8 kết quả làm bài gần nhất</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
              <CheckCircle2 className="size-3.5" /> {progress}% mục tiêu ({currentScore}/{targetScore})
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

        {/* Lịch sử hoạt động học tập gần đây */}
        <article className="rounded-2xl border border-line bg-surface p-5 shadow-xs dark:shadow-none">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-5 text-brand-600 dark:text-brand-400" />
              <h2 className="text-base font-extrabold text-content">Hoạt động gần đây</h2>
            </div>
            <Link to="/history" className="text-xs font-bold text-brand-600 hover:underline dark:text-brand-400">
              Xem tất cả
            </Link>
          </div>

          <div className="mt-4 space-y-2.5">
            {loading ? (
              <BoneyardSkeleton name="dashboard-activities-skeleton" count={5} variant="row" />
            ) : attempts.length > 0 ? (
              attempts.slice(0, 6).map((item) => (
                <Link
                  key={item.id}
                  to={`/history?testId=${item.testId || ''}`}
                  className="group flex items-center justify-between rounded-xl border border-line/60 bg-surface-elevated/50 p-3 transition hover:border-brand-300 hover:bg-surface-hover dark:hover:border-brand-800"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="truncate text-xs font-bold text-content group-hover:text-brand-600 dark:group-hover:text-brand-400">
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
                </Link>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-line p-6 text-center text-xs text-content-muted">
                Chưa có hoạt động học tập nào được ghi nhận.
              </div>
            )}
          </div>
        </article>
      </section>
    </div>
  );
};
