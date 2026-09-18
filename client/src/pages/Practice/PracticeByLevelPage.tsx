import React, { useEffect, useMemo, useState } from 'react';
import { Award, ChevronDown, Database, Play, RefreshCcw, RotateCcw, Trash2 } from 'lucide-react';
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
  if (attempt.metadata?.source !== 'level_practice') return null;
  const part = Number(attempt.part ?? attempt.metadata?.selected_part);
  const level = Number(attempt.metadata?.selected_level);
  if (!Number.isInteger(part) || !Number.isInteger(level)) return null;
  return { part, level, passed: attempt.accuracyRate >= 70 };
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

  const currentPartLevels = useMemo(() => Object.entries(completedByPart)
    .filter(([, levels]) => levels.length > 0)
    .map(([part, levels]) => ({ part: Number(part), level: Math.max(...levels) }))
    .sort((a, b) => a.part - b.part), [completedByPart]);

  const averageLevel = useMemo(() => {
    if (levelStats?.average_level !== undefined && levelStats.average_level !== null) {
      return levelStats.average_level;
    }
    if (currentPartLevels.length === 0) return null;
    return currentPartLevels.reduce((total, item) => total + item.level, 0) / currentPartLevels.length;
  }, [levelStats, currentPartLevels]);

  const visibleParts = PRACTICE_LEVEL_PARTS.filter((part) => part.skill === skill);

  if (isLoading) {
    return (
      <div
        className="mx-auto w-full max-w-7xl space-y-4 pb-10 text-content"
        role="status"
        aria-label={t('common.loading')}
        aria-busy="true"
      >
        <header>
          <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">{t('practiceByLevel.title')}</h1>
          <p className="mt-1 text-xs text-content-muted sm:text-sm">{t('practiceByLevel.subtitle')}</p>
        </header>

        <BoneyardSkeleton
          name="practice-level-summary"
          height={108}
          className="rounded-2xl"
        />

        <div className="flex justify-center sm:justify-start">
          <BoneyardSkeleton
            name="practice-level-skill-toggle"
            variant="button"
            width={224}
            height={40}
            className="rounded-full"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <BoneyardSkeleton
              key={index}
              name={`practice-level-part-${index + 1}`}
              variant="card"
              height={238}
              className="rounded-2xl"
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
      // 1. Luôn dọn dẹp phiên làm bài local trước
      deleteLevelPracticeSessions(deleteScope.part, deleteScope.level);

      // 2. Gửi lệnh xoá lên database
      let serverDeleted = 0;
      let wrongDeleted = 0;

      try {
        const historyResult = await backendService.deleteLevelStudyHistory(
          deleteScope.part,
          deleteScope.level,
        );
        serverDeleted = historyResult?.deletedCount || 0;
      } catch (err) {
        console.warn('[!] Không thể xoá lịch sử level từ server:', err);
      }

      try {
        const wrongResult = await backendService.deleteWrongQuestions('level', {
          part: deleteScope.part,
          level: deleteScope.level,
        });
        wrongDeleted = wrongResult?.deletedCount || 0;
      } catch (err) {
        console.warn('[!] Không thể xoá câu sai level từ server:', err);
      }

      try {
        await backendService.deletePracticeSessionsForLevel(deleteScope.part, deleteScope.level);
      } catch (err) {
        console.warn('[!] Không thể xoá phiên level từ server:', err);
      }

      // 3. Cập nhật state UI và đóng modal
      const key = `${deleteScope.part}:${deleteScope.level}`;
      setAttempts((current) => current.filter((attempt) => {
        const parsed = getLevelAttempt(attempt);
        return !parsed || parsed.part !== deleteScope.part || parsed.level !== deleteScope.level;
      }));
      setWrongCounts((current) => ({ ...current, [key]: 0 }));
      const totalDeleted = Math.max(serverDeleted, deleteScope.displayCount || deleteScope.attemptCount || 0);
      setToastMessage(
        totalDeleted > 0 || wrongDeleted > 0
          ? (language === 'en'
            ? `Deleted ${totalDeleted} attempt(s) and ${wrongDeleted} wrong question(s) of ${deleteScope.label}.`
            : `Đã xoá ${totalDeleted} lượt làm và ${wrongDeleted} câu sai của ${deleteScope.label}.`)
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
    <div className="mx-auto w-full max-w-7xl space-y-4 pb-10 text-content">
      <header>
        <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">{t('practiceByLevel.title')}</h1>
        <p className="mt-1 text-xs text-content-muted sm:text-sm">{t('practiceByLevel.subtitle')}</p>
      </header>

      <section id="tour-pbl-summary" className="surface overflow-hidden rounded-2xl p-4 sm:p-5" aria-labelledby="current-level-title">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="icon-box size-9 rounded-xl"><Award className="size-4" /></div>
            <div>
              <h2 id="current-level-title" className="text-xs font-bold text-content-muted">{t('practiceByLevel.averageLevel')}</h2>
              <div className="mt-0.5 flex items-baseline gap-2">
                <strong className="text-3xl font-black tracking-tight text-content">
                  {averageLevel === null ? '--' : averageLevel.toFixed(1)}
                </strong>
                <span className="text-xs font-bold text-content-muted">
                  {averageLevel === null ? t('practiceByLevel.noData') : getAverageDescription(averageLevel, language)}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] font-semibold text-content-muted">
                {t('practiceByLevel.partsIdentified', { count: currentPartLevels.length })}
              </p>
            </div>
          </div>
          <p className="max-w-md text-xs leading-relaxed text-content-muted">
            {averageLevel === null
              ? (language === 'en'
                ? 'Complete a test with at least 70% correct answers to begin recording your Level.'
                : 'Hoàn thành một bài với ít nhất 70% câu đúng để bắt đầu ghi nhận Level.')
              : (language === 'en'
                ? 'Calculated from the highest completed Level in each Part.'
                : 'Kết quả được tính từ Level cao nhất bạn đã hoàn thành ở từng Part.')}
          </p>
        </div>

        <details className="group mt-4 border-t border-line pt-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-extrabold text-content marker:hidden">
            <span>{language === 'en' ? 'How Average Level is calculated' : 'Cách tính Level trung bình'}</span>
            <ChevronDown className="size-3.5 shrink-0 text-content-muted transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="mt-3 rounded-xl bg-surface-elevated px-3.5 py-3 text-xs leading-relaxed text-content-muted">
            <ol className="space-y-1.5">
              <li><strong className="text-content">1.</strong> {language === 'en' ? 'A Level is completed when you answer at least 70% of questions correctly.' : 'Một Level được hoàn thành khi bạn trả lời đúng ít nhất 70% số câu.'}</li>
              <li><strong className="text-content">2.</strong> {language === 'en' ? 'For each Part, the system takes the highest completed Level.' : 'Với mỗi Part, hệ thống lấy Level cao nhất bạn đã hoàn thành.'}</li>
              <li><strong className="text-content">3.</strong> {language === 'en' ? 'Sum the qualifying Parts, divide by the number of Parts, and round to one decimal place.' : 'Cộng Level của các Part đủ điều kiện, chia cho số Part đó và làm tròn một chữ số thập phân.'}</li>
            </ol>
            {currentPartLevels.length > 0 ? (
              <div className="mt-3 border-t border-line pt-2.5">
                <p className="font-bold text-content">
                  {language === 'en' ? 'Current formula' : 'Công thức hiện tại'}: ({currentPartLevels.map((item) => item.level).join(' + ')}) ÷ {currentPartLevels.length} = {averageLevel?.toFixed(1)}
                </p>
                <p className="mt-1">
                  {currentPartLevels.map((item) => `Part ${item.part}: Level ${item.level}`).join(', ')}
                </p>
              </div>
            ) : (
              <p className="mt-3 border-t border-line pt-2.5 font-semibold text-content">
                {language === 'en'
                  ? 'No Part has reached the 70% threshold yet. Your first result will appear after completing a Level.'
                  : 'Chưa có Part nào đạt ngưỡng 70%. Kết quả đầu tiên sẽ xuất hiện sau khi bạn hoàn thành một Level.'}
              </p>
            )}
          </div>
        </details>
      </section>

      <div id="tour-pbl-skill" className="flex justify-center sm:justify-start">
        <SkillToggle value={skill} onChange={setSkill} />
      </div>

      {usingFallback && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200" role="status">
          <Database className="mt-0.5 size-3.5 shrink-0" />
          <span>
            {language === 'en'
              ? 'Could not connect to live question counts. Displaying sample figures; will recheck on reload.'
              : 'Chưa kết nối được dữ liệu số lượng thực. Trang đang hiển thị số liệu mẫu và sẽ kiểm tra lại khi tải lại.'}
          </span>
        </div>
      )}

      <section
        id="tour-pbl-grid"
        role="tabpanel"
        aria-labelledby={`practice-skill-${skill}`}
        className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2"
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
          return (
            <article key={part.part} className="surface flex flex-col rounded-2xl p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-extrabold tracking-tight">Part {part.part}: {partTitle}</h2>
                  <p className="mt-1 text-xs leading-relaxed text-content-muted">{partDesc}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1 text-content-muted">
                  {wrongCount > 0 && (
                    <button
                      type="button"
                      onClick={() => navigate(`/practice/runner/${part.part}?level=${selectedLevel}&wrongSource=level`)}
                      aria-label={language === 'en' ? `Retry ${wrongCount} incorrect questions for Part ${part.part} Level ${selectedLevel}` : `Làm lại ${wrongCount} câu sai Part ${part.part} Level ${selectedLevel}`}
                      title={language === 'en' ? `Retry ${wrongCount} incorrect questions` : `Làm lại ${wrongCount} câu sai`}
                      className="relative grid size-8 place-items-center rounded-lg transition-colors hover:bg-negative/10 hover:text-negative active:scale-95"
                    >
                      <RotateCcw className="size-3.5" />
                      <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-negative px-1 text-[9px] font-black leading-none text-white">
                        {wrongCount}
                      </span>
                    </button>
                  )}
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
                    className="grid size-8 place-items-center rounded-lg text-content-muted transition-colors hover:bg-negative/10 hover:text-negative active:scale-95"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                  <span className="ml-1 grid size-8 place-items-center rounded-lg bg-accent/15 text-[11px] font-black text-accent-strong ring-1 ring-accent/25 dark:text-brand-300">
                    {part.part}
                  </span>
                </div>
              </div>

              <LevelSlider
                value={selectedLevel}
                onChange={(level) => updatePartLevel(part.part, level)}
                completedLevels={completedByPart[part.part] || []}
                className="mt-4"
                label={language === 'en' ? `Select difficulty for Part ${part.part}` : `Chọn độ khó cho Part ${part.part}`}
              />

              <div className="mt-4 flex flex-col gap-3 border-t border-line pt-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div aria-live="polite">
                  <p className="text-xs font-extrabold">Level {selectedLevel}: {labels[selectedLevel - 1]}</p>
                  <p className="mt-0.5 text-xs font-semibold text-content-muted">
                    {isLoading
                      ? (language === 'en' ? 'Checking question count...' : 'Đang kiểm tra số câu...')
                      : (language === 'en' ? `${questionCount} questions available` : `${questionCount} câu khả dụng`)}
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto">
                  <button
                    type="button"
                    disabled={isLoading || usingFallback || questionCount === 0}
                    onClick={() => navigate(`/practice/runner/${part.part}?level=${selectedLevel}`)}
                    className="btn-primary w-full whitespace-nowrap text-xs sm:w-auto"
                  >
                    {usingFallback || questionCount === 0 ? <RefreshCcw className="size-3.5" /> : <Play className="size-3.5 fill-current" />}
                    {usingFallback
                      ? (language === 'en' ? 'Retry later' : 'Thử lại sau')
                      : questionCount === 0
                        ? (language === 'en' ? 'No questions' : 'Chưa có câu hỏi')
                        : (language === 'en' ? 'Start Practice' : 'Bắt đầu luyện tập')}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>
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
                  <>Bạn có chắc muốn dọn sạch toàn bộ dữ liệu, câu sai đã lưu và bản nháp luyện tập của <strong className="text-content">{deleteScope.label}</strong>? Thao tác này sẽ đảm bảo dữ liệu của bạn được làm mới hoàn toàn.</>
                )
              )
            }
            confirmLabel={deleteScope.displayCount > 0
              ? (language === 'en' ? 'Delete all history' : 'Xoá toàn bộ lịch sử')
              : (language === 'en' ? 'Clean up data' : 'Dọn sạch dữ liệu')}
            closeLabel={language === 'en' ? 'Close confirmation' : 'Đóng xác nhận xoá lịch sử làm bài'}
            onConfirm={() => void handleDeleteHistory()}
            onClose={closeDeleteModal}
          />
        )}
        {toastMessage && <TopToast key={toastMessage} message={toastMessage} />}
      </AnimatePresence>
    </div>
  );
};

export default PracticeByLevelPage;
