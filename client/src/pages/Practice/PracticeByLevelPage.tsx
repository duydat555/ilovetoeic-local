import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  BookOpenText,
  Check,
  CheckCircle2,
  ChevronDown,
  Database,
  Headphones,
  Info,
  Layers,
  Play,
  RefreshCcw,
  RotateCcw,
  Sparkles,
  Target,
  Trash2,
  Zap,
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BoneyardSkeleton } from '../../components/common/BoneyardSkeleton';
import { TopToast } from '../../components/common/TopToast';
import { DeleteWrongQuestionsModal } from '../../components/mock-test/DeleteTestHistoryModal';
import { LevelSlider } from '../../components/practice/LevelSlider';
import { SkillToggle } from '../../components/practice/SkillToggle';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  LEVEL_LABELS,
  LEVEL_LABELS_EN,
  PRACTICE_LEVEL_PARTS,
  PracticeSkill,
} from '../../data/practiceByLevelData';
import { apiService } from '../../services/api';
import { backendService } from '../../services/backend';
import { StudyAttempt } from '../../types';
import { countLevelPracticeSessions, deleteLevelPracticeSessions } from '../../utils/practiceSessions';

type CountMap = Record<number, Record<number, number>>;
type DeleteHistoryScope = { part: number; level: number; label: string; attemptCount: number; displayCount: number };

const createFallbackCounts = (): CountMap => Object.fromEntries(
  PRACTICE_LEVEL_PARTS.map((part) => [part.part, part.fallbackQuestionCounts]),
);

const getAverageDescription = (level: number, language: string) => {
  if (language === 'en') {
    if (level < 1.5) return 'Building Foundation';
    if (level < 2.5) return 'Solid Basics';
    if (level < 3.5) return 'Intermediate';
    if (level < 4.5) return 'Upper Intermediate';
    return 'Advanced';
  }
  if (level < 1.5) return 'Đang xây nền tảng';
  if (level < 2.5) return 'Cơ bản vững vàng';
  if (level < 3.5) return 'Trung bình khá';
  if (level < 4.5) return 'Khá nâng cao';
  return 'Nâng cao';
};

const getLevelAttempt = (attempt: StudyAttempt) => {
  const metadata = attempt.metadata || {};
  const isRetry = Boolean(
    metadata.is_wrong_retry
    || metadata.wrong_source
    || metadata.review_attempt_id
    || metadata.source === 'wrong_practice',
  );
  if (metadata.source !== 'level_practice' || isRetry) return null;

  const part = Number(attempt.part ?? metadata.selected_part);
  const level = Number(attempt.level ?? metadata.selected_level);
  const totalQuestions = Number(attempt.totalQuestions || 0);
  const answeredQuestions = Number(attempt.answeredQuestions || 0);
  const correctAnswers = Number(attempt.correctAnswers || 0);
  if (!Number.isInteger(part) || part < 1 || part > 7) return null;
  if (!Number.isInteger(level) || level < 1 || level > 5) return null;

  const passed = totalQuestions > 0
    && answeredQuestions === totalQuestions
    && correctAnswers >= 0
    && correctAnswers <= totalQuestions
    && correctAnswers * 100 >= totalQuestions * 70;
  return { part, level, passed };
};

export const PracticeByLevelPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const labels = language === 'en' ? LEVEL_LABELS_EN : LEVEL_LABELS;
  const [skill, setSkill] = useState<PracticeSkill>('listening');
  const [selectedLevels, setSelectedLevels] = useState<Record<number, number>>(
    () => Object.fromEntries(PRACTICE_LEVEL_PARTS.map((part) => [part.part, 3])),
  );
  const [counts, setCounts] = useState<CountMap>(createFallbackCounts);
  const [attempts, setAttempts] = useState<StudyAttempt[]>([]);
  const [levelStats, setLevelStats] = useState<{ average_level: number | null; parts: Array<{ part: number; max_level: number }> } | null>(null);
  const [wrongCounts, setWrongCounts] = useState<Record<string, number>>({});
  const [deleteScope, setDeleteScope] = useState<DeleteHistoryScope | null>(null);
  const [deletingWrong, setDeletingWrong] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    let active = true;
    const loadPageData = async () => {
      setIsLoading(true);
      const [countResult, historyResult, wrongResult, statsResult] = await Promise.allSettled([
        apiService.getPracticeLevelSummary(),
        user ? backendService.getStudyHistory(user.id) : Promise.resolve([]),
        user ? backendService.getWrongQuestions('level') : Promise.resolve([]),
        user ? backendService.getPracticeLevelStats() : Promise.resolve(null),
      ]);
      if (!active) return;

      if (countResult.status === 'fulfilled' && countResult.value.length > 0) {
        const liveCounts = createFallbackCounts();
        PRACTICE_LEVEL_PARTS.forEach((part) => {
          liveCounts[part.part] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        });
        countResult.value.forEach((item) => {
          if (liveCounts[item.part]) liveCounts[item.part][item.level] = item.questionCount;
        });
        setCounts(liveCounts);
        setUsingFallback(false);
      } else {
        setCounts(createFallbackCounts());
        setUsingFallback(true);
      }

      if (statsResult.status === 'fulfilled' && statsResult.value) {
        setLevelStats(statsResult.value);
      }
      if (historyResult.status === 'fulfilled' && Array.isArray(historyResult.value)) {
        setAttempts(historyResult.value);
      }
      if (wrongResult.status === 'fulfilled') {
        const next: Record<string, number> = {};
        wrongResult.value.forEach((item) => {
          if (item.level !== null) {
            const key = `${item.part}:${item.level}`;
            next[key] = (next[key] || 0) + 1;
          }
        });
        setWrongCounts(next);
      } else {
        setWrongCounts({});
      }
      setIsLoading(false);
    };
    void loadPageData();
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    if (!toastMessage) return undefined;
    const timeout = window.setTimeout(() => setToastMessage(''), 3200);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    const loadWrongCounts = () => {
      void backendService.getWrongQuestions('level').then((items) => {
        if (!active) return;
        const next: Record<string, number> = {};
        items.forEach((item) => {
          if (item.level !== null) {
            const key = `${item.part}:${item.level}`;
            next[key] = (next[key] || 0) + 1;
          }
        });
        setWrongCounts(next);
      }).catch(() => {
        if (!active) return;
        setWrongCounts({});
      });
    };
    window.addEventListener('wrong-questions-updated', loadWrongCounts);
    return () => {
      active = false;
      window.removeEventListener('wrong-questions-updated', loadWrongCounts);
    };
  }, [user?.id]);

  const completedByPart = useMemo(() => {
    const result: Record<number, number[]> = {};
    attempts.forEach((attempt) => {
      const parsed = getLevelAttempt(attempt);
      if (!parsed?.passed) return;
      result[parsed.part] = Array.from(new Set([...(result[parsed.part] || []), parsed.level]));
    });
    return result;
  }, [attempts]);

  const currentPartLevels = useMemo(() => {
    if (levelStats) {
      return levelStats.parts
        .filter((item) => Number.isInteger(item.part) && item.part >= 1 && item.part <= 7
          && Number.isInteger(item.max_level) && item.max_level >= 1 && item.max_level <= 5)
        .map((item) => ({ part: item.part, level: item.max_level }))
        .sort((a, b) => a.part - b.part);
    }

    return Object.entries(completedByPart)
      .filter(([, levels]) => levels.length > 0)
      .map(([part, levels]) => ({ part: Number(part), level: Math.max(...levels) }))
      .sort((a, b) => a.part - b.part);
  }, [completedByPart, levelStats]);

  const averageLevel = useMemo(() => {
    if (currentPartLevels.length === 0) return null;
    const calculated = currentPartLevels.reduce((total, item) => total + item.level, 0) / currentPartLevels.length;
    if (levelStats?.average_level !== undefined && levelStats.average_level !== null) {
      return Math.abs(levelStats.average_level - calculated) < 0.01
        ? levelStats.average_level
        : calculated;
    }
    return calculated;
  }, [levelStats, currentPartLevels]);

  const visibleParts = PRACTICE_LEVEL_PARTS.filter((part) => part.skill === skill);

  // Tổng số câu hỏi khả dụng trong kỹ năng hiện tại
  const totalQuestionsInSkill = useMemo(() => {
    return visibleParts.reduce((acc, part) => {
      const partCounts = counts[part.part];
      if (!partCounts) return acc;
      const sumForPart = Object.values(partCounts).reduce((s, c) => s + c, 0);
      return acc + sumForPart;
    }, 0);
  }, [counts, visibleParts]);

  if (isLoading) {
    return (
      <div
        className="mx-auto w-full max-w-7xl space-y-6 pb-16 text-content"
        role="status"
        aria-label={t('common.loading')}
        aria-busy="true"
      >
        <header className="space-y-2">
          <BoneyardSkeleton name="pbl-skel-title" height={28} width={280} className="rounded-xl" />
          <BoneyardSkeleton name="pbl-skel-sub" variant="text" width={420} />
        </header>

        <BoneyardSkeleton
          name="practice-level-summary"
          height={160}
          className="rounded-3xl"
        />

        <div className="flex justify-between items-center">
          <BoneyardSkeleton
            name="practice-level-skill-toggle"
            variant="button"
            width={240}
            height={44}
            className="rounded-full"
          />
          <BoneyardSkeleton name="pbl-skel-stat" height={32} width={160} className="rounded-xl" />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <BoneyardSkeleton
              key={index}
              name={`practice-level-part-${index + 1}`}
              variant="card"
              height={260}
              className="rounded-3xl"
            />
          ))}
        </div>
      </div>
    );
  }

  const updatePartLevel = (part: number, level: number) => {
    setSelectedLevels((current) => ({ ...current, [part]: level }));
  };

  const closeDeleteModal = () => {
    if (deletingWrong) return;
    setDeleteScope(null);
    setDeleteError('');
  };

  const handleDeleteHistory = async () => {
    if (!deleteScope || deletingWrong) return;
    setDeletingWrong(true);
    setDeleteError('');
    try {
      let serverDeleted = 0;
      if (user) {
        const historyResult = await backendService.deleteLevelStudyHistory(
          deleteScope.part,
          deleteScope.level,
        );
        serverDeleted = historyResult?.deletedCount || 0;
      }

      deleteLevelPracticeSessions(deleteScope.part, deleteScope.level);

      const key = `${deleteScope.part}:${deleteScope.level}`;
      setAttempts((current) => current.filter((attempt) => {
        const parsed = getLevelAttempt(attempt);
        return !parsed || parsed.part !== deleteScope.part || parsed.level !== deleteScope.level;
      }));
      try {
        const refreshedLevelStats = await backendService.getPracticeLevelStats();
        setLevelStats(refreshedLevelStats);
      } catch (statsError) {
        console.warn('[!] Không thể làm mới thống kê Level sau khi xoá:', statsError);
        setLevelStats(null);
      }
      setWrongCounts((current) => ({ ...current, [key]: 0 }));
      const totalDeleted = Math.max(serverDeleted, deleteScope.displayCount || deleteScope.attemptCount || 0);
      setToastMessage(
        totalDeleted > 0
          ? (language === 'en'
            ? `Deleted ${totalDeleted} attempt(s) and related data of ${deleteScope.label}.`
            : `Đã xoá ${totalDeleted} lượt làm và dữ liệu liên quan của ${deleteScope.label}.`)
          : (language === 'en'
            ? `Cleaned up practice data of ${deleteScope.label}.`
            : `Đã dọn sạch dữ liệu luyện tập của ${deleteScope.label}.`),
      );
      setDeleteScope(null);
      window.dispatchEvent(new CustomEvent('wrong-questions-updated'));
    } catch (requestError) {
      setDeleteError(requestError instanceof Error ? requestError.message : (language === 'en' ? 'Failed to delete practice history.' : 'Không thể xoá lịch sử làm bài.'));
    } finally {
      setDeletingWrong(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-16 text-content">
      {/* Toast thông báo */}
      {toastMessage && (
        <TopToast message={toastMessage} />
      )}

      {/* HEADER TRANG */}
      <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-2xl border border-brand-200/80 bg-brand-50 text-brand-700 dark:border-brand-900/40 dark:bg-brand-500/10 dark:text-brand-300">
              <Layers className="size-5" />
            </span>
            <h1 className="text-xl font-black tracking-tight sm:text-2xl">{t('practiceByLevel.title')}</h1>
          </div>
          <p className="mt-1.5 text-xs font-semibold text-content-muted sm:text-sm">
            {t('practiceByLevel.subtitle')}
          </p>
        </div>

        <div className="mt-2 sm:mt-0 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-elevated/70 px-3 py-1 text-xs font-bold text-content-muted">
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            <span>{language === 'en' ? 'Pass threshold: ≥ 70%' : 'Ngưỡng đạt: ≥ 70%'}</span>
          </span>
        </div>
      </header>

      {/* KHỐI 1: BẢNG CHỈ SỐ NĂNG LỰC & MA TRẬN 7 PART (SCORECARD & MASTERY MATRIX) */}
      <section
        id="tour-pbl-summary"
        className="relative overflow-hidden rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-xs"
        aria-labelledby="current-level-title"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-amber-500/5 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 size-48 rounded-full bg-brand-500/5 blur-3xl" />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
          {/* CỘT 1: CHỈ SỐ LEVEL TRUNG BÌNH */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4 border-b border-line pb-5 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
            <div className="flex items-start gap-4">
              <span className="grid size-12 place-items-center rounded-2xl border border-amber-200/80 bg-amber-50 text-amber-600 dark:border-amber-900/40 dark:bg-amber-500/10 dark:text-amber-400 shrink-0">
                <Award className="size-6" />
              </span>
              <div>
                <h2 id="current-level-title" className="text-xs font-black uppercase tracking-wider text-content-muted">
                  {t('practiceByLevel.averageLevel')}
                </h2>
                <div className="mt-1 flex items-baseline gap-2.5">
                  <span className="font-mono text-3xl sm:text-4xl font-black tracking-tight text-content">
                    {averageLevel === null ? '--' : averageLevel.toFixed(1)}
                  </span>
                  <span className="rounded-lg bg-amber-500/10 px-2 py-0.5 text-xs font-black text-amber-700 dark:text-amber-300">
                    {averageLevel === null ? t('practiceByLevel.noData') : getAverageDescription(averageLevel, language)}
                  </span>
                </div>
                <p className="mt-1.5 text-xs font-bold text-content-muted">
                  {t('practiceByLevel.partsIdentified', { count: currentPartLevels.length })}
                </p>
              </div>
            </div>

            {/* Thước đo 5 mốc Level */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-[10px] font-extrabold text-content-muted">
                <span>Lv.1 Cơ bản</span>
                <span>Lv.3 Trung bình</span>
                <span>Lv.5 Nâng cao</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-surface-elevated">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-orange-500 transition-all duration-500"
                  style={{ width: `${averageLevel === null ? 0 : Math.min(100, Math.max(10, ((averageLevel - 1) / 4) * 100))}%` }}
                />
              </div>
            </div>
          </div>

          {/* CỘT 2: MA TRẬN TRÌNH ĐỘ 7 PHẦN (PART MASTERY MATRIX) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-content-muted">
                {language === 'en' ? '7-Part Mastery Status' : 'Độ Thành Thạo 7 Phần Thi'}
              </h3>
              <span className="text-[11px] font-semibold text-content-muted">
                {language === 'en' ? 'Click to jump to Part' : 'Bấm để chuyển nhanh tới Part'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {PRACTICE_LEVEL_PARTS.map((part) => {
                const partLevel = currentPartLevels.find((p) => p.part === part.part)?.level;
                const isListening = part.skill === 'listening';
                return (
                  <button
                    key={part.part}
                    type="button"
                    onClick={() => {
                      setSkill(part.skill);
                      window.requestAnimationFrame(() => {
                        const targetCard = document.getElementById(`part-card-${part.part}`);
                        if (targetCard) {
                          targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      });
                    }}
                    className={`group flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 ${
                      partLevel
                        ? 'border-emerald-300/80 bg-emerald-50/60 dark:border-emerald-800/40 dark:bg-emerald-950/20'
                        : 'border-line/70 bg-surface-elevated/40 hover:border-brand-500/40'
                    }`}
                  >
                    <span className="text-[10px] font-black text-content-muted uppercase">
                      P{part.part}
                    </span>
                    <span className={`mt-0.5 text-xs font-black ${
                      partLevel
                        ? 'text-emerald-700 dark:text-emerald-300 font-mono'
                        : 'text-content-muted'
                    }`}>
                      {partLevel ? `Lv.${partLevel}` : '--'}
                    </span>
                    <span className="mt-0.5 text-[9px] font-bold text-content-muted truncate max-w-full">
                      {isListening ? (language === 'en' ? 'Listen' : 'Nghe') : (language === 'en' ? 'Read' : 'Đọc')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Accordion Giải Thích Cách Tính Level */}
        <details className="group mt-5 border-t border-line/80 pt-3.5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-extrabold text-content transition hover:text-brand-600 dark:hover:text-brand-400 marker:hidden">
            <span className="flex items-center gap-1.5">
              <Info className="size-3.5 text-brand-600 dark:text-brand-400" />
              <span>{language === 'en' ? 'How Average Level is calculated' : 'Công thức tính & điều kiện đạt chuẩn Level'}</span>
            </span>
            <ChevronDown className="size-3.5 shrink-0 text-content-muted transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="mt-3 rounded-2xl bg-surface-elevated/60 border border-line/50 p-4 text-xs leading-relaxed text-content-muted space-y-2.5">
            <ol className="space-y-1.5 font-medium">
              <li><strong className="text-content">1. Điều kiện đạt Level:</strong> {language === 'en' ? 'A Level is completed when you answer at least 70% of questions correctly.' : 'Một Level được tính là hoàn thành khi bạn trả lời đúng ít nhất 70% số câu hỏi.'}</li>
              <li><strong className="text-content">2. Lấy đỉnh cao nhất:</strong> {language === 'en' ? 'For each Part, the system takes the highest completed Level.' : 'Với mỗi Part, hệ thống ghi nhận Level cao nhất bạn đã vượt qua.'}</li>
              <li><strong className="text-content">3. Trung bình cộng:</strong> {language === 'en' ? 'Sum the qualifying Parts, divide by the number of Parts, and round to one decimal place.' : 'Cộng Level của các Part đủ điều kiện, chia cho số Part đó và làm tròn 1 chữ số thập phân.'}</li>
            </ol>
            {currentPartLevels.length > 0 ? (
              <div className="mt-2 border-t border-line/60 pt-2.5">
                <p className="font-mono font-black text-content">
                  {language === 'en' ? 'Current formula' : 'Công thức hiện tại'}: ({currentPartLevels.map((item) => item.level).join(' + ')}) ÷ {currentPartLevels.length} = <span className="text-emerald-600 dark:text-emerald-400">{averageLevel?.toFixed(1)}</span>
                </p>
                <p className="mt-1 text-[11px] font-semibold">
                  {currentPartLevels.map((item) => `Part ${item.part}: Lv.${item.level}`).join(' • ')}
                </p>
              </div>
            ) : (
              <p className="mt-2 border-t border-line/60 pt-2.5 font-bold text-amber-700 dark:text-amber-300">
                {language === 'en'
                  ? 'No Part has reached the 70% threshold yet. Your first result will appear after completing a Level.'
                  : 'Chưa có Part nào đạt ngưỡng 70%. Điểm Level đầu tiên sẽ xuất hiện ngay sau khi bạn hoàn thành bài thi đạt chuẩn.'}
              </p>
            )}
          </div>
        </details>
      </section>

      {/* KHỐI 2: THANH CHUYỂN KỸ NĂNG (SKILL TOGGLE) & SỐ LIỆU TỔNG QUAN */}
      <div id="tour-pbl-skill" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SkillToggle value={skill} onChange={setSkill} />

        <div className="flex items-center gap-2 text-xs font-bold text-content-muted">
          <span className="rounded-full bg-surface-elevated border border-line px-3 py-1">
            {skill === 'listening'
              ? (language === 'en' ? 'Part 1 to 4 • Listening' : 'Part 1 đến 4 • Kỹ năng Nghe')
              : (language === 'en' ? 'Part 5 to 7 • Reading' : 'Part 5 đến 7 • Kỹ năng Đọc')}
          </span>
          <span className="rounded-full bg-brand-500/10 px-3 py-1 text-brand-600 dark:text-brand-400 font-mono font-black">
            {totalQuestionsInSkill.toLocaleString('vi-VN')} {language === 'en' ? 'questions' : 'câu khả dụng'}
          </span>
        </div>
      </div>

      {/* CẢNH BÁO NẾU DÙNG DỮ LIỆU DỰ PHÒNG */}
      {usingFallback && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200" role="status">
          <Database className="mt-0.5 size-4 shrink-0" />
          <span>
            {language === 'en'
              ? 'Could not connect to live question counts. Displaying sample figures; will recheck on reload.'
              : 'Chưa kết nối được dữ liệu số lượng thực từ máy chủ. Trang đang hiển thị số liệu mẫu và sẽ cập nhật khi tải lại.'}
          </span>
        </div>
      )}

      {/* KHỐI 3: LƯỚI CARD CÁC PART THUỘC KỸ NĂNG ĐANG CHỌN */}
      <section
        id="tour-pbl-grid"
        role="tabpanel"
        aria-labelledby={`practice-skill-${skill}`}
        className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2"
      >
        {visibleParts.map((part) => {
          const selectedLevel = selectedLevels[part.part];
          const questionCount = counts[part.part]?.[selectedLevel] ?? 0;
          const wrongCount = wrongCounts[`${part.part}:${selectedLevel}`] || 0;
          const attemptCount = attempts.filter((attempt) => {
            const parsed = getLevelAttempt(attempt);
            return parsed?.part === part.part && parsed.level === selectedLevel;
          }).length;
          const savedSessionCount = countLevelPracticeSessions(part.part, selectedLevel);
          const displayCount = Math.max(attemptCount, savedSessionCount);
          const partTitle = language === 'en' && part.title_en ? part.title_en : part.title;
          const partDesc = language === 'en' && part.description_en ? part.description_en : part.description;
          const isLevelPassed = (completedByPart[part.part] || []).includes(selectedLevel);
          const isListening = part.skill === 'listening';

          return (
            <article
              id={`part-card-${part.part}`}
              key={part.part}
              className="group flex flex-col justify-between rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-xs transition-all duration-200 hover:border-brand-500/40 hover:shadow-sm"
            >
              <div>
                {/* Phần đầu Card: Tiêu đề Part & Nút thao tác */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-black ${
                        isListening
                          ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300'
                          : 'bg-violet-500/10 text-violet-700 dark:text-violet-300'
                      }`}>
                        {isListening ? <Headphones className="size-3" /> : <BookOpenText className="size-3" />}
                        <span>Part {part.part}</span>
                      </span>

                      {isLevelPassed && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-300">
                          <Check className="size-2.5 stroke-[3]" />
                          <span>{language === 'en' ? 'Passed' : 'Đã đạt'}</span>
                        </span>
                      )}
                    </div>

                    <h2 className="mt-2 text-base sm:text-lg font-black tracking-tight text-content">
                      {partTitle}
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-content-muted">
                      {partDesc}
                    </p>
                  </div>

                  {/* Nút xoá lịch sử làm bài */}
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError('');
                        setDeleteScope({
                          part: part.part,
                          level: selectedLevel,
                          label: `Part ${part.part} - Level ${selectedLevel}`,
                          attemptCount,
                          displayCount,
                        });
                      }}
                      aria-label={language === 'en' ? `Delete practice history for Part ${part.part} Level ${selectedLevel}` : `Xoá lịch sử làm bài Part ${part.part} Level ${selectedLevel}`}
                      title={language === 'en' ? `Delete practice history for Part ${part.part} Level ${selectedLevel}` : `Xoá lịch sử làm bài Part ${part.part} Level ${selectedLevel}`}
                      className="grid size-8 place-items-center rounded-xl text-content-muted transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 active:scale-95"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                {/* Banner Câu Sai (nếu có câu sai tại Level này) */}
                {wrongCount > 0 && (
                  <div className="mt-3.5 flex items-center justify-between gap-3 rounded-2xl border border-rose-200/80 bg-rose-50/70 p-3 dark:border-rose-900/40 dark:bg-rose-950/20">
                    <div className="flex items-center gap-2 text-xs font-bold text-rose-800 dark:text-rose-300">
                      <span className="grid size-6 place-items-center rounded-lg bg-rose-600 text-white font-mono text-[10px] font-black">
                        {wrongCount}
                      </span>
                      <span>
                        {language === 'en'
                          ? `${wrongCount} incorrect question(s) to review`
                          : `Có ${wrongCount} câu sai cần ôn lại ở Level ${selectedLevel}`}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate(`/practice/runner/${part.part}?level=${selectedLevel}&wrongSource=level`)}
                      className="inline-flex items-center gap-1 rounded-xl bg-white px-2.5 py-1 text-xs font-black text-rose-700 shadow-2xs transition hover:bg-rose-100 dark:bg-rose-900/40 dark:text-rose-200 active:scale-95 shrink-0"
                    >
                      <RotateCcw className="size-3" />
                      <span>{language === 'en' ? 'Retry' : 'Luyện lại'}</span>
                    </button>
                  </div>
                )}

                {/* Slider chọn độ khó tương tác */}
                <div className="mt-2">
                  <LevelSlider
                    value={selectedLevel}
                    onChange={(level) => updatePartLevel(part.part, level)}
                    completedLevels={completedByPart[part.part] || []}
                    className="mt-2"
                    label={language === 'en' ? `Select difficulty for Part ${part.part}` : `Chọn độ khó cho Part ${part.part}`}
                  />
                </div>
              </div>

              {/* Phần chân Card: Thông tin Level & Nút Bắt Đầu Luyện Tập */}
              <div className="mt-5 flex flex-col gap-3 border-t border-line/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-black text-content">
                      Level {selectedLevel}: {labels[selectedLevel - 1]}
                    </p>
                    <span className="text-line">•</span>
                    <p className="text-xs font-bold text-content-muted font-mono">
                      {isLoading
                        ? (language === 'en' ? 'Checking...' : 'Đang kiểm tra...')
                        : (language === 'en' ? `${questionCount} questions` : `${questionCount} câu khả dụng`)}
                    </p>
                  </div>
                  <p className="mt-0.5 text-[11px] font-medium text-content-muted">
                    {isLevelPassed
                      ? (language === 'en' ? '🎉 You have passed the ≥ 70% threshold' : '🎉 Bạn đã vượt ngưỡng đạt chuẩn 70%')
                      : (language === 'en' ? 'Target: Answer ≥ 70% correctly to pass' : 'Mục tiêu: Đúng ít nhất 70% số câu để đạt chuẩn')}
                  </p>
                </div>

                <div className="w-full sm:w-auto">
                  <button
                    type="button"
                    disabled={isLoading || usingFallback || questionCount === 0}
                    onClick={() => navigate(`/practice/runner/${part.part}?level=${selectedLevel}`)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-black text-primary-contrast shadow-sm transition hover:opacity-90 active:scale-95 disabled:pointer-events-none disabled:opacity-50 sm:w-auto whitespace-nowrap"
                  >
                    {usingFallback || questionCount === 0 ? (
                      <RefreshCcw className="size-3.5" />
                    ) : (
                      <Play className="size-3.5 fill-current" />
                    )}
                    <span>
                      {usingFallback
                        ? (language === 'en' ? 'Retry later' : 'Thử lại sau')
                        : questionCount === 0
                          ? (language === 'en' ? 'No questions' : 'Chưa có câu hỏi')
                          : (language === 'en' ? 'Start Practice' : 'Bắt đầu luyện tập')}
                    </span>
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {/* MODAL XÁC NHẬN XOÁ LỊCH SỬ LÀM BÀI */}
      <AnimatePresence initial={false}>
        {deleteScope && (
          <DeleteWrongQuestionsModal
            key={`delete-level-${deleteScope.part}-${deleteScope.level}`}
            scopeLabel={deleteScope.label}
            wrongCount={deleteScope.displayCount}
            deleting={deletingWrong}
            error={deleteError}
            title={deleteScope.displayCount > 0
              ? (language === 'en' ? 'Delete practice history?' : 'Xoá lịch sử làm bài?')
              : (language === 'en' ? 'Clean up practice data?' : 'Dọn sạch dữ liệu làm bài?')}
            description={
              deleteScope.displayCount > 0 ? (
                language === 'en' ? (
                  <>All <strong className="text-content">{deleteScope.displayCount} saved attempts or practice sessions</strong>, including correct and incorrect question records for <strong className="text-content">{deleteScope.label}</strong>, will be deleted. This cannot be undone.</>
                ) : (
                  <>Toàn bộ <strong className="text-content">{deleteScope.displayCount} lượt hoặc phiên làm bài đã lưu</strong>, gồm kết quả câu đúng và câu sai của <strong className="text-content">{deleteScope.label}</strong>, sẽ bị xoá khỏi database và trình duyệt. Thao tác này không thể hoàn tác.</>
                )
              ) : (
                language === 'en' ? (
                  <>Are you sure you want to clean up all data, saved incorrect questions, and draft sessions for <strong className="text-content">{deleteScope.label}</strong>?</>
                ) : (
                  <>Bạn có chắc chắn muốn dọn sạch toàn bộ dữ liệu, danh sách câu sai và phiên làm nháp của <strong className="text-content">{deleteScope.label}</strong> không?</>
                )
              )
            }
            onClose={closeDeleteModal}
            onConfirm={() => void handleDeleteHistory()}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
