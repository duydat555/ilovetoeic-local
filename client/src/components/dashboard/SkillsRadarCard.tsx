import React, { useEffect, useState } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  Compass,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Headphones,
  BookOpen,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import {
  gamificationService,
  SkillsRadarData,
} from '../../services/backend';

export const SkillsRadarCard: React.FC = () => {
  const { language } = useLanguage();
  const [data, setData] = useState<SkillsRadarData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await gamificationService.getSkillsRadar();
        if (isMounted && res && res.data) {
          setData(res.data);
        }
      } catch (err) {
        console.warn('[SkillsRadarCard] Failed to fetch radar data:', err);
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
        <div className="h-5 w-48 rounded bg-slate-200 dark:bg-surface-elevated" />
        <div className="mt-6 h-64 w-full rounded-2xl bg-slate-100 dark:bg-surface-elevated" />
      </div>
    );
  }

  if (!data || data.radarData.length === 0) return null;

  const {
    radarData,
    listeningAccuracy,
    readingAccuracy,
    strongestPart,
    weakestPart,
    totalAnswered,
  } = data;

  return (
    <article
      id="tour-db-radar"
      className="relative overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-xs transition hover:border-indigo-500/30 dark:shadow-none"
    >
      {/* Soft background radial blur */}
      <div className="pointer-events-none absolute -left-12 -bottom-12 size-48 rounded-full bg-indigo-500/5 blur-3xl" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl border border-indigo-200/60 bg-indigo-50 text-indigo-600 dark:border-indigo-900/40 dark:bg-indigo-500/10 dark:text-indigo-400 shrink-0">
            <Compass className="size-5" />
          </span>
          <div>
            <h2 className="text-base font-extrabold text-content">
              {language === 'en' ? 'TOEIC 7-Part Skills Radar' : 'Biểu đồ Năng lực 7 Phần TOEIC'}
            </h2>
            <p className="mt-0.5 text-xs text-content-muted">
              {language === 'en'
                ? `Based on ${totalAnswered} questions answered`
                : `Phân tích từ ${totalAnswered} câu hỏi bạn đã làm`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 rounded-lg bg-sky-500/10 px-2.5 py-1 text-sky-700 dark:text-sky-300 font-bold">
            <Headphones className="size-3.5" />
            <span>Nghe: {listeningAccuracy}%</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-violet-500/10 px-2.5 py-1 text-violet-700 dark:text-violet-300 font-bold">
            <BookOpen className="size-3.5" />
            <span>Đọc: {readingAccuracy}%</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Radar Chart + Insights */}
      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr] items-center">
        {/* Radar Chart Visual */}
        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%" debounce={100}>
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
              <PolarGrid stroke="#e2e8f0" strokeDasharray="2 2" />
              <PolarAngleAxis
                dataKey="part"
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: '#94a3b8', fontSize: 9 }}
              />
              <Radar
                name="Mục tiêu (80%)"
                dataKey="target"
                stroke="#10b981"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                fill="#10b981"
                fillOpacity={0.05}
              />
              <Radar
                name="Độ chính xác"
                dataKey="accuracy"
                stroke="#6366f1"
                strokeWidth={2}
                fill="#6366f1"
                fillOpacity={0.4}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="rounded-xl border border-line bg-surface p-2.5 shadow-xl text-xs space-y-1">
                        <p className="font-extrabold text-content">{item.fullName}</p>
                        <p className="text-indigo-600 dark:text-indigo-400 font-bold">
                          Chính xác: {item.accuracy}% ({item.totalCorrect}/{item.totalAnswered} câu)
                        </p>
                        <p className="text-[11px] text-content-muted">Trạng thái: {item.mastery}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Insights & Recommendations */}
        <div className="space-y-3">
          {/* Strongest Part */}
          {strongestPart && (
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-3 sm:p-3.5">
              <div className="flex items-center gap-2 text-xs font-black text-emerald-700 dark:text-emerald-400">
                <TrendingUp className="size-4 shrink-0" />
                <span>Thế mạnh vượt trội: {strongestPart.fullName}</span>
              </div>
              <p className="mt-1 text-xs text-content-muted">
                Độ chính xác đạt <strong className="text-emerald-600 dark:text-emerald-400">{strongestPart.accuracy}%</strong>. Duy trì nhịp luyện tập để củng cố phản xạ!
              </p>
            </div>
          )}

          {/* Weakest Part & AI Action */}
          {weakestPart && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 sm:p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-black text-amber-700 dark:text-amber-400">
                <AlertTriangle className="size-4 shrink-0" />
                <span>Cần cải thiện: {weakestPart.fullName}</span>
              </div>
              <p className="text-xs text-content-muted">
                Độ chính xác đang ở mức <strong className="text-amber-600 dark:text-amber-400">{weakestPart.accuracy}%</strong>.
              </p>
              <div className="rounded-xl bg-surface p-2 text-[11px] font-medium text-content-muted border border-line/60">
                <span className="font-bold text-amber-600 dark:text-amber-400 mr-1">💡 Lời khuyên:</span>
                {weakestPart.tip}
              </div>

              <Link
                to={`/practice-by-level?part=${weakestPart.partNumber}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-black text-slate-950 shadow-xs hover:bg-amber-400 transition-colors"
              >
                <Zap className="size-3.5" />
                <span>Luyện ngay {weakestPart.part}</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          )}

          {!strongestPart && !weakestPart && (
            <div className="rounded-2xl border border-dashed border-line p-5 text-center text-xs text-content-muted">
              Làm thêm bài tập để AI vẽ biểu đồ năng lực chi tiết từng phần.
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
