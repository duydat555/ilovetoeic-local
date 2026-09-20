import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Target,
  TrendingUp,
  CalendarDays,
  Clock,
  Edit3,
  CheckCircle2,
  Headphones,
  BookOpen,
  ArrowRight,
  X,
  Compass,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  gamificationService,
  ScorePredictionData,
} from '../../services/backend';
import { BoneyardSkeleton } from '../common/BoneyardSkeleton';
import { getModalMotion } from '../common/modalMotion';
import { CountUp } from './CountUp';

const SCORE_MILESTONES = [500, 600, 700, 800, 900];

export const PredictionCard: React.FC = () => {
  const { language } = useLanguage();
  const { refreshSession } = useAuth();
  const reduceMotion = useReducedMotion();
  const modalMotion = getModalMotion(reduceMotion);

  const [data, setData] = useState<ScorePredictionData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Edit Goal Form states
  const [newScore, setNewScore] = useState<number>(750);
  const [newDate, setNewDate] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await gamificationService.getPrediction();
      if (res && res.data) {
        setData(res.data);
        setNewScore(res.data.targetScore || 750);
        const examDateVal = res.data.examDate || res.data.targetDate;
        if (examDateVal) {
          setNewDate(examDateVal);
        }
      }
    } catch (err) {
      console.warn('[PredictionCard] Failed to fetch prediction:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newScore < 100 || newScore > 990) return;
    setSubmitting(true);
    setUpdateMsg(null);
    try {
      const res = await gamificationService.updateTargetGoal({
        targetScore: newScore,
        examDate: newDate || undefined,
        targetDate: newDate || undefined,
      });
      if (res && res.success) {
        setUpdateMsg(language === 'en' ? 'Goal updated successfully!' : 'Cập nhật mục tiêu thành công!');
        await Promise.all([
          fetchData(),
          refreshSession(),
        ]);
        setTimeout(() => {
          setIsModalOpen(false);
          setUpdateMsg(null);
        }, 800);
      }
    } catch (err) {
      console.error('[PredictionCard] Update goal failed:', err);
      setUpdateMsg(language === 'en' ? 'Failed to update goal' : 'Không thể lưu mục tiêu, vui lòng thử lại');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-line bg-surface p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-line">
          <BoneyardSkeleton name="pred-skel-title" height={24} width={220} />
          <BoneyardSkeleton name="pred-skel-btn" height={32} width={120} className="rounded-xl" />
        </div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <BoneyardSkeleton name="pred-skel-col-1" height={160} className="rounded-2xl" />
          <BoneyardSkeleton name="pred-skel-col-2" height={160} className="rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const {
    predictedScore,
    predictedRange,
    predictedListening,
    predictedReading,
    targetScore,
    examDate,
    targetDate,
    daysRemaining,
    probability,
    suggestedDailyMinutes,
    aiSummary,
  } = data;

  const displayExamDate = examDate || targetDate;

  const probColor =
    probability >= 75
      ? 'bg-emerald-500 text-emerald-700 dark:text-emerald-400'
      : probability >= 50
      ? 'bg-amber-500 text-amber-700 dark:text-amber-400'
      : 'bg-rose-500 text-rose-700 dark:text-rose-400';

  const probBg =
    probability >= 75
      ? 'bg-emerald-500/10'
      : probability >= 50
      ? 'bg-amber-500/10'
      : 'bg-rose-500/10';

  const GAUGE_RADIUS = 88;
  const GAUGE_CENTER_X = 120;
  const GAUGE_CENTER_Y = 115;
  const GAUGE_CIRCUMFERENCE = Math.PI * GAUGE_RADIUS; // ~276.46

  const scoreRatio = Math.min(1, Math.max(0, (predictedScore || 0) / 990));
  const strokeDashoffset = GAUGE_CIRCUMFERENCE * (1 - scoreRatio);

  const knobAngleRad = Math.PI * (1 - scoreRatio);
  const knobX = GAUGE_CENTER_X + GAUGE_RADIUS * Math.cos(knobAngleRad);
  const knobY = GAUGE_CENTER_Y - GAUGE_RADIUS * Math.sin(knobAngleRad);

  return (
    <>
      <article
        id="tour-db-prediction"
        className="relative overflow-hidden rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-xs transition hover:border-brand-500/30 dark:shadow-none"
      >
        {/* Soft atmospheric gradient backdrops */}
        <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-brand-500/5 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 size-56 rounded-full bg-sky-500/5 blur-3xl" />

        {/* Card Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl border border-brand-200/60 bg-brand-50 text-brand-600 dark:border-brand-900/40 dark:bg-brand-500/10 dark:text-brand-400 shrink-0">
              <Compass className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-content">
                {language === 'en' ? 'AI TOEIC Score Forecast' : 'Dự đoán Điểm TOEIC & Mục tiêu'}
              </h2>
              <p className="mt-0.5 text-xs text-content-muted">
                {language === 'en'
                  ? 'Smart diagnostic prediction based on your practice track record'
                  : 'Ước lượng năng lực thực tế dựa trên lịch sử luyện tập'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-elevated/70 px-3 py-1.5 text-xs font-bold text-content transition hover:border-brand-500/40 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
          >
            <Edit3 className="size-3.5" />
            <span>{language === 'en' ? 'Edit Target' : 'Đặt mục tiêu'}</span>
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Column 1: Predicted TOEIC Score with Semi-Circle Gauge */}
          <div className="flex flex-col justify-between rounded-2xl border border-line/70 bg-surface-elevated/40 p-4 sm:p-5">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-content-muted uppercase tracking-wider">
                  {language === 'en' ? 'Predicted Performance' : 'Phong độ Dự đoán'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-2.5 py-0.5 text-[11px] font-bold text-brand-600 dark:text-brand-400">
                  <TrendingUp className="size-3" />
                  {language === 'en' ? 'AI Estimated' : 'Độ chuẩn cao'}
                </span>
              </div>

              {/* Biểu đồ Nửa đường tròn (Semi-Circle Gauge) */}
              <div className="relative mt-2 flex flex-col items-center justify-center pt-2">
                <div className="relative w-full max-w-[260px] aspect-[240/135]">
                  <svg
                    viewBox="0 0 240 135"
                    className="w-full h-full overflow-visible"
                    aria-label={`Điểm dự đoán: ${predictedScore} trên 990`}
                  >
                    {/* Subtle dashed inner guide arc */}
                    <path
                      d="M 44 115 A 76 76 0 0 1 196 115"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeDasharray="3 4"
                      className="text-slate-300/70 dark:text-slate-700/60"
                    />

                    {/* Background Track Arc */}
                    <path
                      d="M 32 115 A 88 88 0 0 1 208 115"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="14"
                      strokeLinecap="round"
                      className="text-slate-200 dark:text-surface-hover/80"
                    />

                    {/* Progress Arc */}
                    <path
                      d="M 32 115 A 88 88 0 0 1 208 115"
                      fill="none"
                      stroke="#FF5000"
                      strokeWidth="14"
                      strokeLinecap="round"
                      strokeDasharray={276.46}
                      strokeDashoffset={strokeDashoffset}
                      style={{
                        transition: reduceMotion ? 'none' : 'stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
                      }}
                    />

                    {/* Indicator Knob Dot */}
                    <circle
                      cx={knobX}
                      cy={knobY}
                      r="6.5"
                      fill="#ffffff"
                      stroke="#FF5000"
                      strokeWidth="3.5"
                      className="drop-shadow-sm transition-all duration-700"
                    />

                    {/* Min & Max Labels */}
                    <text x="24" y="132" textAnchor="middle" className="text-[10px] font-bold fill-slate-400 select-none">
                      0
                    </text>
                    <text x="216" y="132" textAnchor="middle" className="text-[10px] font-bold fill-slate-400 select-none">
                      990
                    </text>
                  </svg>

                  {/* Centered Score Inside Arc */}
                  <div className="absolute inset-x-0 bottom-1 flex flex-col items-center justify-center text-center select-none pointer-events-none">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-3xl sm:text-4xl font-black tracking-tight text-content">
                        <CountUp end={predictedScore} duration={1200} />
                      </span>
                      <span className="text-xs font-bold text-content-muted">/ 990</span>
                    </div>
                    <span className="mt-0.5 rounded-md border border-line/80 bg-surface/90 px-2 py-0.5 text-[10px] font-bold text-content-subtle shadow-2xs">
                      {predictedRange[0]} – {predictedRange[1]}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-skill Listening & Reading split */}
            <div className="mt-5 grid grid-cols-2 gap-3 pt-3 border-t border-line/60">
              <div className="flex items-center gap-2.5 rounded-xl bg-surface p-2.5">
                <span className="grid size-8 place-items-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0">
                  <Headphones className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-content-muted truncate">
                    {language === 'en' ? 'Listening' : 'Kỹ năng Nghe'}
                  </p>
                  <p className="text-sm font-extrabold text-content">~{predictedListening} pts</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-xl bg-surface p-2.5">
                <span className="grid size-8 place-items-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0">
                  <BookOpen className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-content-muted truncate">
                    {language === 'en' ? 'Reading' : 'Kỹ năng Đọc'}
                  </p>
                  <p className="text-sm font-extrabold text-content">~{predictedReading} pts</p>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Target Goal & Probability */}
          <div className="flex flex-col justify-between rounded-2xl border border-line/70 bg-surface-elevated/40 p-4 sm:p-5">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-content-muted uppercase tracking-wider">
                  {language === 'en' ? 'Exam Goal & Pace' : 'Mục tiêu Thi & Kế hoạch'}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-content">
                  <Target className="size-3.5 text-brand-500" />
                  <span>{language === 'en' ? 'Goal' : 'Mục tiêu'}: {targetScore}</span>
                </span>
              </div>

              {/* Countdown & Pace Info */}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-content-muted">
                  <CalendarDays className="size-3.5 text-content-subtle" />
                  <span>
                    {displayExamDate
                      ? `${displayExamDate} ${daysRemaining !== null ? `(${daysRemaining} ${language === 'en' ? 'days left' : 'ngày nữa'})` : ''}`
                      : (language === 'en' ? 'No exam date set' : 'Chưa đặt ngày thi')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-content-muted">
                  <Clock className="size-3.5 text-content-subtle" />
                  <span>
                    {language === 'en'
                      ? `Rec: ${suggestedDailyMinutes} min/day`
                      : `Gợi ý: ${suggestedDailyMinutes} phút/ngày`}
                  </span>
                </div>
              </div>

              {/* Goal Probability Bar */}
              <div className="mt-5">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-content-subtle">
                    {language === 'en' ? 'Goal Achievement Probability' : 'Khả năng đạt mục tiêu'}
                  </span>
                  <span className={`font-black rounded px-1.5 py-0.5 ${probBg} ${probColor}`}>
                    {probability}%
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-surface-elevated">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      probability >= 75
                        ? 'bg-emerald-500'
                        : probability >= 50
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, probability))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Practice Link */}
            <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between">
              <span className="text-xs text-content-muted">
                {predictedScore >= targetScore
                  ? (language === 'en' ? 'You are ahead of your target!' : 'Bạn đang vượt mục tiêu đề ra!')
                  : (language === 'en' ? `Gap to target: +${targetScore - predictedScore} pts` : `Cần tăng thêm: +${targetScore - predictedScore} điểm`)}
              </span>
              <Link
                to="/practice-by-level"
                className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
              >
                <span>{language === 'en' ? 'Practice now' : 'Luyện thêm'}</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* AI Study Advisor Summary Box */}
        {aiSummary && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-brand-500/20 bg-brand-500/5 p-4">
            <span className="grid size-7 place-items-center rounded-lg bg-brand-500/20 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5">
              <CheckCircle2 className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold text-content">
                {language === 'en' ? 'AI Learning Recommendation' : 'Lời khuyên từ Cố vấn Học tập'}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-content-subtle">
                {aiSummary}
              </p>
            </div>
          </div>
        )}
      </article>

      {/* Target Goal Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
          >
            {/* Backdrop */}
            <motion.div
              {...modalMotion.backdrop}
              onClick={() => !submitting && setIsModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Panel */}
            <motion.div
              {...modalMotion.panel}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-9 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                    <Target className="size-4" />
                  </span>
                  <h3 className="text-base font-extrabold text-content">
                    {language === 'en' ? 'Set Your TOEIC Goal' : 'Cài đặt Mục tiêu TOEIC'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="rounded-lg p-1.5 text-content-muted hover:bg-surface-elevated hover:text-content"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleSaveGoal} className="mt-5 space-y-4">
                {/* Target Score Selection */}
                <div>
                  <label className="block text-xs font-bold text-content mb-2">
                    {language === 'en' ? 'Target Score (100 - 990)' : 'Điểm mục tiêu (100 - 990)'}
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {SCORE_MILESTONES.map((sc) => (
                      <button
                        key={sc}
                        type="button"
                        onClick={() => setNewScore(sc)}
                        className={`rounded-xl px-3 py-1 text-xs font-bold transition ${
                          newScore === sc
                            ? 'bg-brand-600 text-white shadow-xs'
                            : 'border border-line bg-surface-elevated/70 text-content-muted hover:border-brand-500/40 hover:text-content'
                        }`}
                      >
                        {sc}+
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min={100}
                    max={990}
                    step={5}
                    value={newScore}
                    onChange={(e) => setNewScore(parseInt(e.target.value, 10) || 0)}
                    className="w-full rounded-xl border border-line bg-surface-elevated/40 px-3.5 py-2 text-sm font-bold text-content focus:border-brand-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Target Exam Date */}
                <div>
                  <label className="block text-xs font-bold text-content mb-2">
                    {language === 'en' ? 'Expected Exam Date (Optional)' : 'Ngày thi dự kiến (Tùy chọn)'}
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface-elevated/40 px-3.5 py-2 text-sm font-bold text-content focus:border-brand-500 focus:outline-none"
                  />
                </div>

                {updateMsg && (
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {updateMsg}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={submitting}
                    className="rounded-xl border border-line px-4 py-2 text-xs font-bold text-content-muted hover:bg-surface-elevated hover:text-content transition"
                  >
                    {language === 'en' ? 'Cancel' : 'Hủy'}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || newScore < 100 || newScore > 990}
                    className="rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-700 transition disabled:opacity-50"
                  >
                    {submitting
                      ? (language === 'en' ? 'Saving...' : 'Đang lưu...')
                      : (language === 'en' ? 'Save Goal' : 'Lưu mục tiêu')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
