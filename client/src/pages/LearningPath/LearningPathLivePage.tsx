import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Map, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { backendService } from '../../services/backend';
import { StudyAttempt } from '../../types';

export const LearningPathLivePage: React.FC = () => {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<StudyAttempt[]>([]);
  useEffect(() => { if (user) void backendService.getStudyHistory(user.id).then((data) => setAttempts(data || [])); }, [user?.id]);
  if (!user) return null;
  const averageAccuracy = attempts.length ? Math.round(attempts.reduce((total, item) => total + item.accuracyRate, 0) / attempts.length) : 0;
  const milestones = [
    { title: 'Hoàn thành bài đánh giá đầu tiên', complete: attempts.length > 0 },
    { title: 'Đạt độ chính xác trung bình từ 70%', complete: averageAccuracy >= 70 },
    { title: `Chạm mục tiêu ${user.targetScore} TOEIC`, complete: attempts.some((item) => (item.totalScore || 0) >= user.targetScore) },
  ];
  return <div className="space-y-6 pb-10"><header><div className="eyebrow mb-3"><Map className="size-3.5" /> Lộ trình từ dữ liệu thật</div><h1 className="text-2xl font-extrabold tracking-tight text-content sm:text-3xl">Lộ trình học tập</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-content-muted">Tiến độ được tính từ lịch sử làm bài đã lưu, không dùng bài học hoặc trạng thái mẫu.</p></header><section className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]"><article className="rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-800 dark:bg-brand-500/10"><Target className="size-6 text-brand-700 dark:text-brand-300" /><p className="mt-5 text-sm font-bold text-content-muted">Mục tiêu hiện tại</p><p className="mt-1 text-3xl font-black text-content">{user.targetScore} TOEIC</p><p className="mt-3 text-sm text-content-muted">{attempts.length} lần học đã lưu, độ chính xác trung bình {averageAccuracy}%.</p></article><article className="rounded-2xl border border-line bg-surface p-5 shadow-sm dark:shadow-none"><h2 className="text-base font-extrabold text-content">Các mốc tiếp theo</h2><div className="mt-4 space-y-3">{milestones.map((item) => <div key={item.title} className="flex items-center gap-3 rounded-xl bg-surface-elevated p-3"><CheckCircle2 className={`size-5 ${item.complete ? 'text-emerald-500' : 'text-content-muted'}`} /><span className={`text-sm font-semibold ${item.complete ? 'text-content' : 'text-content-muted'}`}>{item.title}</span></div>)}</div><Link to="/mock-test" className="btn-primary mt-5 text-sm">Chọn đề để học <ArrowRight className="size-4" /></Link></article></section></div>;
};
