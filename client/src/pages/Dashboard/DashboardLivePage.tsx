import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpenCheck, CalendarDays, Clock3, Flame, Loader2, RefreshCw, Target, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { backendService } from '../../services/backend';
import { StudyAttempt } from '../../types';

export const DashboardLivePage: React.FC = () => {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<StudyAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadHistory = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    const data = await backendService.getStudyHistory(user.id);
    if (data === null) setError('Không thể tải hoạt động học từ MySQL.');
    else setAttempts(data);
    setLoading(false);
  };

  useEffect(() => { void loadHistory(); }, [user?.id]);

  const metrics = useMemo(() => {
    const totalSeconds = attempts.reduce((total, item) => total + item.timeSpentSeconds, 0);
    const averageAccuracy = attempts.length
      ? Math.round(attempts.reduce((total, item) => total + item.accuracyRate, 0) / attempts.length)
      : 0;
    const bestScore = attempts.reduce((best, item) => Math.max(best, item.totalScore || 0), 0);
    return { totalMinutes: Math.round(totalSeconds / 60), averageAccuracy, bestScore };
  }, [attempts]);
  const chartData = [...attempts].reverse().slice(-8).map((item) => ({
    label: new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(new Date(item.completedAt)),
    score: item.totalScore || 0,
  }));

  if (!user) return null;
  const currentScore = Math.max(user.currentScore || 0, metrics.bestScore);
  const targetScore = user.targetScore || 750;
  const progress = Math.min(100, Math.round((currentScore / targetScore) * 100));
  const metricCards = [
    { label: 'Điểm cao nhất', value: currentScore || 'Chưa có', icon: Target },
    { label: 'Mục tiêu TOEIC', value: targetScore, icon: TrendingUp },
    { label: 'Tổng thời gian học', value: `${metrics.totalMinutes} phút`, icon: Clock3 },
    { label: 'Độ chính xác', value: `${metrics.averageAccuracy}%`, icon: BookOpenCheck },
  ];

  return (
    <div className="space-y-6 pb-10">
      <section className="rounded-[28px] border border-brand-300 bg-brand p-6 text-brand-ink sm:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div><div className="inline-flex items-center gap-2 rounded-lg bg-white/30 px-3 py-1.5 text-xs font-bold"><Flame className="size-4" /> Chuỗi học {user.streakDays} ngày</div><h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">Chào {user.name}</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-brand-ink/75">Tổng quan dưới đây chỉ sử dụng kết quả học và bài thi đã được lưu trên tài khoản của bạn.</p></div>
          <Link to="/mock-test" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-extrabold text-brand-800 shadow-sm hover:bg-brand-50">Luyện tập ngay <ArrowRight className="size-4" /></Link>
        </div>
      </section>

      {error && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-500/10"><p className="text-sm font-semibold text-red-700 dark:text-red-300">{error}</p><button type="button" onClick={() => void loadHistory()} className="btn-secondary text-sm"><RefreshCw className="size-4" /> Thử lại</button></div>}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metricCards.map(({ label, value, icon: Icon }) => <article key={label} className="rounded-2xl border border-line bg-surface p-4 shadow-sm dark:shadow-none"><span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"><Icon className="size-4" /></span><p className="mt-4 text-xl font-black text-content">{value}</p><p className="mt-1 text-xs font-semibold text-content-muted">{label}</p></article>)}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <article className="rounded-2xl border border-line bg-surface p-5 shadow-sm dark:shadow-none"><div className="flex items-start justify-between gap-3"><div><h2 className="text-base font-extrabold text-content">Tiến trình điểm số</h2><p className="mt-1 text-sm text-content-muted">Tối đa 8 lần làm bài gần nhất.</p></div><span className="text-sm font-extrabold text-brand-700 dark:text-brand-300">{progress}% mục tiêu</span></div>{loading ? <div className="mt-5 grid h-64 place-items-center"><Loader2 className="size-6 animate-spin text-content-muted motion-reduce:animate-none" /></div> : chartData.length ? <div className="mt-5 h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} /><YAxis domain={[0, 990]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} /><Line type="monotone" dataKey="score" name="Điểm" stroke="#ffc72c" strokeWidth={3} dot={{ r: 4, fill: '#ffc72c' }} /></LineChart></ResponsiveContainer></div> : <div className="mt-5 grid h-64 place-items-center rounded-xl border border-dashed border-line"><p className="text-sm text-content-muted">Chưa có kết quả thật để vẽ biểu đồ.</p></div>}</article>
        <article className="rounded-2xl border border-line bg-surface p-5 shadow-sm dark:shadow-none"><div className="flex items-center gap-2"><CalendarDays className="size-5 text-brand-700 dark:text-brand-300" /><h2 className="text-base font-extrabold text-content">Hoạt động gần đây</h2></div><div className="mt-4 space-y-2">{attempts.slice(0, 6).map((item) => <Link key={item.id} to={`/history?testId=${item.testId || ''}`} className="block rounded-xl bg-surface-elevated p-3 transition hover:bg-surface-hover"><p className="truncate text-sm font-bold text-content">{item.testName || item.testId || `Luyện Part ${item.part || ''}`}</p><p className="mt-1 text-xs text-content-muted">{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.completedAt))}, đúng {item.correctAnswers}/{item.totalQuestions}</p></Link>)}{!loading && attempts.length === 0 && <p className="rounded-xl bg-surface-elevated p-4 text-sm text-content-muted">Chưa có hoạt động học nào được lưu.</p>}</div></article>
      </section>
    </div>
  );
};
