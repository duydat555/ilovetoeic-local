import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Headphones,
  Highlighter,
  Languages,
  ListChecks,
  RefreshCcw,
  Sparkles,
  StickyNote,
  Target,
  XCircle,
} from 'lucide-react';
import {
  AnnotatablePassage, PracticeAnnotation,
} from '../../components/common/AnnotatablePassage';
import { AudioPlayer } from '../../components/common/AudioPlayer';
import { ChoiceCard } from '../../components/common/ChoiceCard';
import { EvidencePanel } from '../../components/common/EvidencePanel';
import { PassageContent } from '../../components/common/PassageContent';
import { QuestionDrawer } from '../../components/common/QuestionDrawer';
import { ResizableSplitPane } from '../../components/common/ResizableSplitPane';
import {
  PracticeTool, PracticeToolsPanel,
} from '../../components/common/PracticeToolsPanel';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { apiService } from '../../services/api';
import { backendService } from '../../services/backend';
import { Question } from '../../types';
import { createClientId } from '../../utils/id';
import { buildPracticeGroups, formatExplanationText, stripChoicePrefix } from '../../utils/practice';
import { parseTestPartScope, serializeTestPartScope } from '../../utils/testScope';

type ChoiceId = 'A' | 'B' | 'C' | 'D';

interface SavedPracticeSession {
  answers: Record<string, ChoiceId>;
  checkedGroupIds: string[];
  currentGroupIndex: number;
  secondsSpent: number;
  notes?: Record<string, string>;
  annotations?: Record<string, PracticeAnnotation[]>;
}

const formatTimer = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
};

const readPracticeSession = (key: string): SavedPracticeSession | null => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as SavedPracticeSession : null;
  } catch {
    return null;
  }
};

const savePracticeSession = (key: string, session: SavedPracticeSession) => {
  try {
    localStorage.setItem(key, JSON.stringify(session));
  } catch {
    // The practice flow remains usable when browser storage is unavailable.
  }
};

const clearPracticeSession = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // There may be no persisted session to clear.
  }
};

export const PracticeRunnerPage: React.FC = () => {
  const { user, recordStudyActivity } = useAuth();
  const { refreshNotifications } = useNotifications();
  const { partId = 'all' } = useParams<{ partId: string }>();
  const [searchParams] = useSearchParams();
  const testId = searchParams.get('testId');

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, ChoiceId>>({});
  const [checkedGroupIds, setCheckedGroupIds] = useState<Set<string>>(new Set());
  const [showTranslation, setShowTranslation] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [secondsSpent, setSecondsSpent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activityRecorded, setActivityRecorded] = useState(false);
  const [showQuestionDrawer, setShowQuestionDrawer] = useState(false);
  const [historySaveState, setHistorySaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [annotations, setAnnotations] = useState<Record<string, PracticeAnnotation[]>>({});
  const [activeTool, setActiveTool] = useState<PracticeTool | null>(null);
  const [annotatorEnabled, setAnnotatorEnabled] = useState(false);

  const scopeParts = useMemo(() => parseTestPartScope(partId), [partId]);
  const scopeKey = serializeTestPartScope(scopeParts);
  const storageKey = `toeic-practice:${testId || 'quick'}:${scopeKey}`;

  useEffect(() => {
    let active = true;

    const loadQuestions = async () => {
      setLoading(true);
      setError('');

      try {
        if (!testId) {
          throw new Error('Vui lòng chọn một đề thi thật trước khi bắt đầu luyện tập.');
        }
        const source = await apiService.getFullTestQuestions(testId);
        const filtered = source.filter((question) => scopeParts.includes(question.partId));

        if (!active) return;
        setQuestions(filtered);
        setUserAnswers({});
        setCheckedGroupIds(new Set());
        setCurrentGroupIndex(0);
        setSecondsSpent(0);
        setNotes({});
        setAnnotations({});
        setShowTranscript(false);

        const session = readPracticeSession(storageKey);
        if (session) {
          const validQuestionIds = new Set(filtered.map((question) => question.id));
          setUserAnswers(
            Object.fromEntries(
              Object.entries(session.answers || {}).filter(([id]) => validQuestionIds.has(id)),
            ) as Record<string, ChoiceId>,
          );
          setCheckedGroupIds(new Set(session.checkedGroupIds || []));
          setCurrentGroupIndex(Math.max(0, session.currentGroupIndex || 0));
          setSecondsSpent(Math.max(0, session.secondsSpent || 0));
          setNotes(session.notes || {});
          setAnnotations(session.annotations || {});
        }
      } catch {
        if (active) setError('Không thể tải bài luyện tập. Vui lòng thử lại sau.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadQuestions();
    return () => {
      active = false;
    };
  }, [scopeParts, storageKey, testId]);

  const groups = useMemo(() => buildPracticeGroups(questions), [questions]);
  const safeGroupIndex = Math.min(currentGroupIndex, Math.max(groups.length - 1, 0));
  const currentGroup = groups[safeGroupIndex];
  const currentGroupChecked = currentGroup ? checkedGroupIds.has(currentGroup.id) : false;
  const allCurrentAnswered = currentGroup?.questions.every((question) => userAnswers[question.id]) ?? false;
  const annotationGroupKey = currentGroup?.questions.map((question) => question.id).join(':') || '';
  const currentAnnotations = annotations[annotationGroupKey] || [];

  useEffect(() => {
    if (loading) return;
    const session: SavedPracticeSession = {
      answers: userAnswers,
      checkedGroupIds: [...checkedGroupIds],
      currentGroupIndex: safeGroupIndex,
      secondsSpent,
      notes,
      annotations,
    };
    savePracticeSession(storageKey, session);
  }, [annotations, checkedGroupIds, loading, notes, safeGroupIndex, secondsSpent, storageKey, userAnswers]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!showSummary && !loading && questions.length > 0) {
        setSecondsSpent((previous) => previous + 1);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [loading, questions.length, showSummary]);

  useEffect(() => {
    setShowTranslation(false);
    setShowTranscript(false);
    setAnnotatorEnabled(false);
  }, [safeGroupIndex]);

  const checkedQuestionCount = groups
    .filter((group) => checkedGroupIds.has(group.id))
    .reduce((total, group) => total + group.questions.length, 0);
  const correctCount = questions.filter(
    (question) =>
      checkedGroupIds.has(
        groups.find((group) => group.questions.some((candidate) => candidate.id === question.id))?.id || '',
      ) && userAnswers[question.id] === question.correctAnswer,
  ).length;
  const answeredCount = Object.keys(userAnswers).length;
  const progress = questions.length ? Math.round((checkedQuestionCount / questions.length) * 100) : 0;
  const allGroupsChecked = groups.length > 0 && checkedGroupIds.size >= groups.length;

  const selectChoice = (questionId: string, choiceId: ChoiceId) => {
    if (currentGroupChecked) return;
    setUserAnswers((previous) => ({ ...previous, [questionId]: choiceId }));
  };

  const checkCurrentGroup = () => {
    if (!currentGroup || !allCurrentAnswered) return;
    const nextChecked = new Set(checkedGroupIds);
    nextChecked.add(currentGroup.id);
    setCheckedGroupIds(nextChecked);

    if (nextChecked.size >= groups.length && !activityRecorded) {
      void recordStudyActivity().then(() => refreshNotifications());
      setActivityRecorded(true);
    }
  };

  const goToGroup = (index: number) => {
    setCurrentGroupIndex(Math.min(Math.max(index, 0), groups.length - 1));
    setShowSummary(false);
    setShowTranscript(false);
  };

  const savePracticeHistory = async () => {
    if (!user || historySaveState !== 'idle') return;
    setHistorySaveState('saving');

    const selectedParts = [...new Set(questions.map((question) => question.partId))].sort((a, b) => a - b);
    const saved = await backendService.saveStudyAttempt({
      id: createClientId(),
      userId: user.id,
      testId: testId || undefined,
      mode: 'practice',
      part: selectedParts.length === 1 ? selectedParts[0] : undefined,
      totalQuestions: questions.length,
      answeredQuestions: questions.filter((question) => Boolean(userAnswers[question.id])).length,
      correctAnswers: correctCount,
      accuracyRate: questions.length ? Math.round((correctCount / questions.length) * 100) : 0,
      timeSpentSeconds: secondsSpent,
      listeningCorrect: questions.filter(
        (question) => question.partId <= 4 && userAnswers[question.id] === question.correctAnswer,
      ).length,
      readingCorrect: questions.filter(
        (question) => question.partId >= 5 && userAnswers[question.id] === question.correctAnswer,
      ).length,
      answers: userAnswers,
      questionIds: questions.map((question) => question.id),
      metadata: {
        source: testId ? 'test_practice' : 'quick_practice',
        selected_parts: selectedParts,
      },
      completedAt: new Date().toISOString(),
    });

    setHistorySaveState(saved ? 'saved' : 'error');
    if (saved) await refreshNotifications();
  };

  const continuePractice = () => {
    if (!currentGroupChecked) {
      checkCurrentGroup();
      return;
    }
    if (safeGroupIndex < groups.length - 1) {
      goToGroup(safeGroupIndex + 1);
    } else {
      setShowSummary(true);
      void savePracticeHistory();
    }
  };

  const restartPractice = () => {
    clearPracticeSession(storageKey);
    setUserAnswers({});
    setCheckedGroupIds(new Set());
    setCurrentGroupIndex(0);
    setSecondsSpent(0);
    setShowSummary(false);
    setShowTranslation(false);
    setShowTranscript(false);
    setActivityRecorded(false);
    setHistorySaveState('idle');
    setNotes({});
    setAnnotations({});
    setActiveTool(null);
    setAnnotatorEnabled(false);
  };

  const openTool = (tool: PracticeTool) => {
    setShowQuestionDrawer(false);
    setActiveTool((current) => current === tool ? null : tool);
    if (tool === 'annotator' && currentGroup?.passageText) {
      setAnnotatorEnabled(true);
    }
  };

  const addAnnotation = (annotation: PracticeAnnotation) => {
    if (!annotationGroupKey) return;
    setAnnotations((current) => ({
      ...current,
      [annotationGroupKey]: [...(current[annotationGroupKey] || []), annotation],
    }));
  };

  const deleteAnnotation = (annotationId: string) => {
    setAnnotations((current) => ({
      ...current,
      [annotationGroupKey]: (current[annotationGroupKey] || []).filter(
        (annotation) => annotation.id !== annotationId,
      ),
    }));
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-5" role="status" aria-label="Đang tải bài luyện tập">
        <div className="h-20 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-surface-elevated" />
        <div className="h-96 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-surface-elevated" />
      </div>
    );
  }

  if (error || !currentGroup) {
    return (
      <div className="surface mx-auto max-w-lg p-8 text-center">
        <AlertCircle className="mx-auto size-10 text-amber-500" />
        <h1 className="mt-3 text-lg font-extrabold text-slate-950 dark:text-content">Không tìm thấy bài luyện tập</h1>
        <p className="mt-2 text-xs text-slate-500">{error || 'Vui lòng chọn lại danh sách bài tập từ trang trước.'}</p>
        <Link to="/mock-test" className="btn-primary mt-5 inline-flex">Quay lại kho đề thi</Link>
      </div>
    );
  }

  if (showSummary) {
    const accuracy = checkedQuestionCount ? Math.round((correctCount / checkedQuestionCount) * 100) : 0;
    return (
      <div className="mx-auto max-w-3xl space-y-6 pb-12">
        <div className="surface overflow-hidden rounded-2xl p-8 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand-hover text-brand-ink shadow-lg shadow-brand-500/20">
            <Sparkles className="size-8" />
          </div>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950 dark:text-content">Hoàn thành phần luyện tập!</h1>
          <p className="mt-1 text-xs text-slate-500">Bạn đã hoàn thành tất cả các câu hỏi trong phần luyện tập này.</p>

          <div
            className={`mx-auto mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
              historySaveState === 'saved'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                : historySaveState === 'error'
                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                : 'bg-slate-100 text-slate-600 dark:bg-surface-elevated dark:text-content-muted'
            }`}
          >
            {historySaveState === 'saving' && <RefreshCcw className="size-3.5 animate-spin" />}
            {historySaveState === 'saved' && <CheckCircle2 className="size-3.5" />}
            {historySaveState === 'error' && <AlertCircle className="size-3.5" />}
            {historySaveState === 'saving'
              ? 'Đang lưu lịch sử lên MySQL...'
              : historySaveState === 'saved'
              ? 'Đã lưu vào lịch sử làm bài'
              : historySaveState === 'error'
              ? 'Chưa thể đồng bộ lịch sử lên MySQL'
              : 'Đang chuẩn bị lưu lịch sử...'}
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4 border-y border-slate-100 py-6 dark:border-line">
            <div>
              <div className="text-2xl font-black text-brand-600 dark:text-brand-300">{correctCount}/{questions.length}</div>
              <div className="text-xs font-bold text-slate-500 dark:text-content-muted">Câu trả lời đúng</div>
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{accuracy}%</div>
              <div className="text-xs font-bold text-slate-500 dark:text-content-muted">Độ chính xác</div>
            </div>
            <div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{formatTimer(secondsSpent)}</div>
              <div className="text-xs font-bold text-slate-500 dark:text-content-muted">Thời gian làm bài</div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button onClick={restartPractice} className="btn-secondary text-xs">
              <RefreshCcw className="size-4" /> Luyện tập lại
            </button>
            <Link to="/mock-test" className="btn-primary text-xs">
              Quay lại kho đề thi
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const firstQuestionNumber = currentGroup.questions[0].questionNumber;
  const lastQuestionNumber = currentGroup.questions[currentGroup.questions.length - 1].questionNumber;
  const hasMultipleQuestions = currentGroup.questions.length > 1;
  const rangeLabel = hasMultipleQuestions
    ? `Questions ${firstQuestionNumber} - ${lastQuestionNumber}`
    : `Question ${firstQuestionNumber}`;
  const skillLabel = currentGroup.partId >= 5 ? 'Reading' : 'Listening';
  const practiceTitle = hasMultipleQuestions
    ? `${skillLabel}: Questions ${firstQuestionNumber} - ${lastQuestionNumber}`
    : `${skillLabel}: Question ${firstQuestionNumber}`;

  // Split view if Reading passage, Part 1 image, or 3+ listening audio questions
  const isSplitLayout =
    (currentGroup.partId >= 6 && Boolean(currentGroup.passageText)) ||
    Boolean(currentGroup.imageUrl) ||
    (Boolean(currentGroup.audioUrl) && currentGroup.questions.length >= 3);

  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col space-y-2 overflow-hidden">
      {/* Fixed Sticky Header Bar (Shrink-0) */}
      <div className="shrink-0 flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white p-2 shadow-xs dark:border-line dark:bg-surface">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/mock-test" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 p-1.5 text-xs font-bold text-slate-600 hover:border-brand-400 hover:bg-brand-50/50 dark:border-line dark:text-content-muted dark:hover:bg-surface-hover">
            <ArrowLeft className="size-4" /> <span className="hidden sm:inline">Kho đề</span>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-brand-100 px-2 py-0.5 text-[11px] font-black text-brand-700 dark:bg-brand-950 dark:text-brand-200">
                Part {currentGroup.partId}
              </span>
              <h1 className="truncate text-sm font-black tracking-tight text-slate-950 sm:text-base dark:text-content">
                {practiceTitle}
              </h1>
            </div>
            <p className="mt-0.5 text-[10px] font-bold text-slate-400">
              Nhóm {safeGroupIndex + 1}/{groups.length}
            </p>
          </div>
        </div>

        {/* Compact Progress Widget */}
        <div className="hidden md:flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-1 border border-slate-200/60 dark:bg-surface-elevated/60 dark:border-line/60">
          <div className="text-right text-xs">
            <div className="font-extrabold text-slate-800 dark:text-content">
              {progress}% <span className="text-[10px] text-slate-400">tiến độ</span>
            </div>
            <div className="text-[10px] font-semibold text-brand-600 dark:text-brand-300">
              {checkedQuestionCount}/{questions.length} câu đã kiểm tra
            </div>
          </div>
          <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-200 dark:bg-surface-hover">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand to-brand-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openTool('notes')}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition ${
              activeTool === 'notes'
                ? 'border-brand bg-brand text-brand-ink'
                : 'border-slate-200 bg-white text-slate-700 hover:border-brand-400 hover:bg-brand-50/50 dark:border-line dark:bg-surface-elevated dark:text-content dark:hover:bg-surface-hover'
            }`}
            aria-pressed={activeTool === 'notes'}
          >
            <StickyNote className={`size-4 ${activeTool === 'notes' ? 'text-brand-ink' : 'text-brand-600 dark:text-brand-300'}`} />
            <span className="hidden lg:inline">Ghi chú</span>
            {currentGroup.questions.some((question) => notes[question.id]?.trim()) && (
                <span className={`size-1.5 rounded-full ${activeTool === 'notes' ? 'bg-brand-ink' : 'bg-brand'}`} />
            )}
          </button>

          <button
            type="button"
            onClick={() => openTool('annotator')}
            disabled={!currentGroup.passageText}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition ${
              activeTool === 'annotator' || annotatorEnabled
                ? 'border-brand bg-brand text-brand-ink'
                : 'border-slate-200 bg-white text-slate-700 hover:border-brand-400 hover:bg-brand-50/50 dark:border-line dark:bg-surface-elevated dark:text-content dark:hover:bg-surface-hover'
            } disabled:cursor-not-allowed disabled:opacity-40`}
            aria-pressed={annotatorEnabled}
            title={currentGroup.passageText ? 'Đánh dấu nội dung bài đọc' : 'Nhóm này không có bài đọc'}
          >
            <Highlighter className={`size-4 ${activeTool === 'annotator' || annotatorEnabled ? 'text-brand-ink' : 'text-brand-600 dark:text-brand-300'}`} />
            <span className="hidden lg:inline">Annotator</span>
            {currentAnnotations.length > 0 && (
              <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-extrabold ${
                activeTool === 'annotator' || annotatorEnabled
                  ? 'bg-white/30 text-brand-ink'
                  : 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-200'
              }`}>
                {currentAnnotations.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTool(null);
              setShowQuestionDrawer(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-brand-400 hover:bg-brand-50/50 dark:border-line dark:bg-surface-elevated dark:text-content dark:hover:bg-surface-hover"
          >
            <ListChecks className="size-4 text-brand-600 dark:text-brand-300" />
            <span className="hidden sm:inline">Danh sách câu</span>
            <span className="rounded-md bg-brand-100 px-1.5 py-0.5 text-[10px] font-extrabold text-brand-700 dark:bg-brand-950 dark:text-brand-200">
              {answeredCount}/{questions.length}
            </span>
          </button>

          <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 dark:border-line dark:bg-surface-elevated dark:text-content">
            <Clock3 className="size-4 text-brand-600" /> {formatTimer(secondsSpent)}
          </span>
        </div>
      </div>

      {/* Main Workspace Area (Fixed height container) */}
      <main className="flex-1 min-h-0 overflow-hidden">
        {isSplitLayout ? (
          <ResizableSplitPane
            storageKey="ilovetoeic:practice-runner-split"
            defaultLeftPercent={65}
            minLeftPercent={30}
            minRightWidth={320}
            maxRightPercent={60}
            left={(
              <>
                {/* Left Column: Shared Media Pane */}
                {(currentGroup.audioUrl || currentGroup.passageText || currentGroup.imageUrl || currentGroup.transcript) && (
                  <section className="surface flex h-auto max-h-none flex-col overflow-hidden rounded-2xl lg:h-full lg:max-h-full">
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-line">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-extrabold text-slate-950 dark:text-content">
                      {currentGroup.audioUrl ? <Headphones className="size-4 text-brand-600" /> : <BookOpen className="size-4 text-brand-600" />}
                      Nội dung dùng chung
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">{rangeLabel} cùng sử dụng nội dung này</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {currentGroup.transcript && (
                      <button
                        type="button"
                        onClick={() => setShowTranscript((value) => !value)}
                        disabled={!currentGroupChecked}
                        aria-pressed={showTranscript}
                        aria-controls="shared-transcript"
                        title={currentGroupChecked ? 'Bật hoặc tắt transcript' : 'Transcript mở sau khi kiểm tra đáp án'}
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 ${
                          showTranscript
                            ? 'bg-brand text-brand-ink'
                            : 'bg-slate-100 text-slate-700 hover:bg-brand-50 hover:text-brand-700 dark:bg-surface-elevated dark:text-content-muted dark:hover:bg-brand-950/40 dark:hover:text-brand-200'
                        }`}
                      >
                        <Headphones className="size-4" /> {showTranscript ? 'Ẩn transcript' : 'Hiện transcript'}
                      </button>
                    )}
                    {currentGroup.passageText && (
                      <button
                        type="button"
                        onClick={() => setShowTranslation((value) => !value)}
                        aria-pressed={showTranslation}
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-[0.98] ${
                          showTranslation
                            ? 'bg-brand text-brand-ink'
                            : 'bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-200'
                        }`}
                      >
                        <Languages className="size-4" /> {showTranslation ? 'Ẩn bản dịch' : 'Xem bản dịch'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 space-y-4 overflow-visible p-4 lg:overflow-y-auto">
                  {currentGroup.audioUrl && (
                    <AudioPlayer audioUrl={currentGroup.audioUrl} title={`Audio dùng chung cho ${rangeLabel}`} />
                  )}
                  {showTranscript && currentGroupChecked && currentGroup.transcript && (
                    <section id="shared-transcript" className="rounded-2xl border border-brand-200 bg-brand-50/55 p-4 dark:border-brand-900 dark:bg-brand-950/20">
                      <div className="flex items-center gap-2 text-sm font-extrabold text-slate-950 dark:text-content">
                        <Headphones className="size-4 text-brand-600 dark:text-brand-300" /> Transcript dùng chung
                      </div>
                      <p className="mt-2.5 whitespace-pre-line text-sm leading-7 text-slate-700 dark:text-content-muted">
                        {currentGroup.transcript}
                      </p>
                    </section>
                  )}
                  {currentGroup.imageUrl && (
                    <img
                      src={currentGroup.imageUrl}
                      alt={`Hình minh họa cho ${rangeLabel}`}
                      referrerPolicy="no-referrer"
                      className="mx-auto max-h-[22rem] max-w-full rounded-2xl border border-slate-200 object-contain shadow-xs dark:border-line"
                    />
                  )}
                  {currentGroup.passageText && (
                    <div className="toeic-passage-panel">
                      <AnnotatablePassage
                        html={currentGroup.passageText}
                        annotations={currentAnnotations}
                        enabled={annotatorEnabled}
                        onAdd={addAnnotation}
                      />
                    </div>
                  )}
                  {showTranslation && currentGroup.passageText && (
                    <div className="toeic-passage-panel">
                      <div className="mb-3 flex items-center gap-2 border-b border-line pb-2 text-xs font-extrabold text-accent-strong">
                        <Languages className="size-4" /> Bản dịch tiếng Việt
                      </div>
                      <PassageContent
                        html={
                          currentGroup.passageTranslationFormatStatus === 'done'
                            && currentGroup.passageTranslationHtml
                            ? currentGroup.passageTranslationHtml
                            : currentGroup.passageTranslation
                              || 'Bản dịch cho đoạn văn này đang được cập nhật.'
                        }
                      />
                    </div>
                  )}
                </div>
                  </section>
                )}
              </>
            )}
            right={(
              <section className="flex h-auto max-h-none min-w-0 flex-col overflow-hidden lg:h-full lg:max-h-full">
                {/* Right Column: Questions List Pane (Scrolls independently, 100% visible) */}
                <div className="flex-1 space-y-3.5 overflow-visible pr-1.5 lg:overflow-y-auto">
                {currentGroup.questions.map((question) => {
                  const selectedAnswer = userAnswers[question.id];
                  return (
                    <article key={question.id} className="surface overflow-hidden rounded-2xl">
                      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-line">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="grid size-7 place-items-center rounded-lg bg-brand text-xs font-black text-brand-ink shadow-xs">
                            {question.questionNumber}
                          </span>
                          <div className="min-w-0">
                            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Part {question.partId}</div>
                            <h2 className="break-words text-sm font-bold text-slate-950 dark:text-content">
                              {question.promptText || (question.partId <= 2 ? 'Nghe và chọn phương án phù hợp nhất.' : 'Chọn đáp án đúng.')}
                            </h2>
                          </div>
                        </div>
                        {currentGroupChecked && (
                          selectedAnswer === question.correctAnswer
                            ? <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-bold text-emerald-600"><CheckCircle2 className="size-4" /> Chính xác</span>
                            : <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-bold text-rose-600"><XCircle className="size-4" /> Chưa đúng</span>
                        )}
                      </div>

                      <div className="space-y-2 p-3.5">
                        {question.choices.map((choice) => (
                          <ChoiceCard
                            key={choice.id}
                            choiceId={choice.id}
                            text={stripChoicePrefix(choice.text, choice.id)}
                            selected={selectedAnswer === choice.id}
                            onSelect={() => selectChoice(question.id, choice.id)}
                            disabled={currentGroupChecked}
                            checkMode={currentGroupChecked}
                            isCorrect={choice.id === question.correctAnswer}
                            isUserChoice={selectedAnswer === choice.id}
                            hiddenListeningText={!currentGroupChecked && (question.partId === 1 || question.partId === 2)}
                          />
                        ))}

                        {currentGroupChecked && question.evidence && (
                          <EvidencePanel evidence={question.evidence} questionNumber={question.questionNumber} />
                        )}

                        {currentGroupChecked && !question.evidence && (
                          <div className="mt-4 rounded-2xl border border-brand-100 bg-brand-50/60 p-4 dark:border-brand-900 dark:bg-brand-950/30">
                            <div className="flex items-center gap-2 text-xs font-extrabold text-brand-700 dark:text-brand-200">
                              <BookOpen className="size-4" /> Giải thích câu {question.questionNumber}
                            </div>
                            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-content-muted">
                              {formatExplanationText(question.explanation)}
                            </p>
                            {question.keyVocabulary && question.keyVocabulary.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {question.keyVocabulary.map((item) => (
                                  <span key={item.word} className="rounded-lg bg-white px-2.5 py-1.5 text-xs text-slate-600 shadow-xs dark:bg-surface dark:text-content-muted">
                                    <strong>{item.word}</strong>: {item.meaning}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}

              </div>

              {/* Group Action Controls at bottom of right pane */}
              <div className="shrink-0 mt-3 surface flex items-center justify-between rounded-2xl p-2.5">
                <button
                  type="button"
                  onClick={() => goToGroup(safeGroupIndex - 1)}
                  disabled={safeGroupIndex === 0}
                  className="btn-secondary text-xs py-1.5 disabled:opacity-40"
                >
                  <ChevronLeft className="size-4" /> Nhóm trước
                </button>
                <div className="text-center text-xs font-medium text-slate-500">
                  {!allCurrentAnswered && !currentGroupChecked
                    ? `Còn ${currentGroup.questions.filter((question) => !userAnswers[question.id]).length} câu chưa chọn`
                    : currentGroupChecked
                    ? 'Đã kiểm tra nhóm này'
                    : 'Sẵn sàng kiểm tra'}
                </div>
                <button
                  type="button"
                  onClick={continuePractice}
                  disabled={!currentGroupChecked && !allCurrentAnswered}
                  className="btn-primary text-xs py-1.5 disabled:opacity-40"
                >
                  {!currentGroupChecked
                    ? <>Kiểm tra đáp án <CheckCircle2 className="size-4" /></>
                    : safeGroupIndex < groups.length - 1
                    ? <>Nhóm tiếp theo <ChevronRight className="size-4" /></>
                    : <>Xem kết quả <Target className="size-4" /></>}
                </button>
              </div>
              </section>
            )}
          />
        ) : (
          /* Single Column Layout */
          <div className="flex h-full flex-col overflow-hidden max-w-4xl mx-auto">
            <div className="flex-1 overflow-y-auto space-y-4 pr-1.5">
              {(currentGroup.audioUrl || currentGroup.passageText || currentGroup.imageUrl || currentGroup.transcript) && (
                <section className="surface rounded-2xl p-5 space-y-4">
                  {currentGroup.transcript && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setShowTranscript((value) => !value)}
                        disabled={!currentGroupChecked}
                        aria-pressed={showTranscript}
                        aria-controls="shared-transcript"
                        title={currentGroupChecked ? 'Bật hoặc tắt transcript' : 'Transcript mở sau khi kiểm tra đáp án'}
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 ${
                          showTranscript
                            ? 'bg-brand text-brand-ink'
                            : 'bg-slate-100 text-slate-700 hover:bg-brand-50 hover:text-brand-700 dark:bg-surface-elevated dark:text-content-muted dark:hover:bg-brand-950/40 dark:hover:text-brand-200'
                        }`}
                      >
                        <Headphones className="size-4" /> {showTranscript ? 'Ẩn transcript' : 'Hiện transcript'}
                      </button>
                    </div>
                  )}
                  {currentGroup.audioUrl && (
                    <AudioPlayer audioUrl={currentGroup.audioUrl} title={`Audio dùng chung cho ${rangeLabel}`} />
                  )}
                  {showTranscript && currentGroupChecked && currentGroup.transcript && (
                    <section id="shared-transcript" className="rounded-2xl border border-brand-200 bg-brand-50/55 p-4 dark:border-brand-900 dark:bg-brand-950/20">
                      <div className="flex items-center gap-2 text-sm font-extrabold text-slate-950 dark:text-content">
                        <Headphones className="size-4 text-brand-600 dark:text-brand-300" /> Transcript dùng chung
                      </div>
                      <p className="mt-2.5 whitespace-pre-line text-sm leading-7 text-slate-700 dark:text-content-muted">
                        {currentGroup.transcript}
                      </p>
                    </section>
                  )}
                  {currentGroup.imageUrl && (
                    <img
                      src={currentGroup.imageUrl}
                      alt={`Hình minh họa cho ${rangeLabel}`}
                      referrerPolicy="no-referrer"
                      className="mx-auto max-h-[22rem] max-w-full rounded-2xl border border-slate-200 object-contain shadow-xs dark:border-line"
                    />
                  )}
                  {currentGroup.passageText && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-relaxed dark:border-line dark:bg-canvas">
                      <AnnotatablePassage
                        html={currentGroup.passageText}
                        annotations={currentAnnotations}
                        enabled={annotatorEnabled}
                        onAdd={addAnnotation}
                      />
                    </div>
                  )}
                </section>
              )}

              {currentGroup.questions.map((question) => {
                const selectedAnswer = userAnswers[question.id];
                return (
                  <article key={question.id} className="surface overflow-hidden rounded-2xl">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-line">
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-7 place-items-center rounded-lg bg-brand text-xs font-black text-brand-ink shadow-xs">
                          {question.questionNumber}
                        </span>
                        <div>
                          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Part {question.partId}</div>
                          <h2 className="text-sm font-bold text-slate-950 dark:text-content">
                            {question.promptText || (question.partId <= 2 ? 'Nghe và chọn phương án phù hợp nhất.' : 'Chọn đáp án đúng.')}
                          </h2>
                        </div>
                      </div>
                      {currentGroupChecked && (
                        selectedAnswer === question.correctAnswer
                          ? <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600"><CheckCircle2 className="size-4" /> Chính xác</span>
                          : <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600"><XCircle className="size-4" /> Chưa đúng</span>
                      )}
                    </div>

                    <div className="space-y-2 p-3.5">
                      {question.choices.map((choice) => (
                        <ChoiceCard
                          key={choice.id}
                          choiceId={choice.id}
                          text={stripChoicePrefix(choice.text, choice.id)}
                          selected={selectedAnswer === choice.id}
                          onSelect={() => selectChoice(question.id, choice.id)}
                          disabled={currentGroupChecked}
                          checkMode={currentGroupChecked}
                          isCorrect={choice.id === question.correctAnswer}
                          isUserChoice={selectedAnswer === choice.id}
                          hiddenListeningText={!currentGroupChecked && (question.partId === 1 || question.partId === 2)}
                        />
                      ))}

                      {currentGroupChecked && question.evidence && (
                        <EvidencePanel evidence={question.evidence} questionNumber={question.questionNumber} />
                      )}

                      {currentGroupChecked && !question.evidence && (
                        <div className="mt-4 rounded-2xl border border-brand-100 bg-brand-50/60 p-4 dark:border-brand-900 dark:bg-brand-950/30">
                          <div className="flex items-center gap-2 text-xs font-extrabold text-brand-700 dark:text-brand-200">
                            <BookOpen className="size-4" /> Giải thích câu {question.questionNumber}
                          </div>
                          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-content-muted">
                            {formatExplanationText(question.explanation)}
                          </p>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="shrink-0 mt-3 surface flex items-center justify-between rounded-2xl p-2.5">
              <button
                type="button"
                onClick={() => goToGroup(safeGroupIndex - 1)}
                disabled={safeGroupIndex === 0}
                className="btn-secondary text-xs py-1.5 disabled:opacity-40"
              >
                <ChevronLeft className="size-4" /> Nhóm trước
              </button>
              <div className="text-center text-xs font-medium text-slate-500">
                {!allCurrentAnswered && !currentGroupChecked
                  ? `Còn ${currentGroup.questions.filter((question) => !userAnswers[question.id]).length} câu chưa chọn`
                  : currentGroupChecked
                  ? 'Đã kiểm tra nhóm này'
                  : 'Sẵn sàng kiểm tra'}
              </div>
              <button
                type="button"
                onClick={continuePractice}
                disabled={!currentGroupChecked && !allCurrentAnswered}
                className="btn-primary text-xs py-1.5 disabled:opacity-40"
              >
                {!currentGroupChecked
                  ? <>Kiểm tra đáp án <CheckCircle2 className="size-4" /></>
                  : safeGroupIndex < groups.length - 1
                  ? <>Nhóm tiếp theo <ChevronRight className="size-4" /></>
                  : <>Xem kết quả <Target className="size-4" /></>}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Slide-over Question Drawer */}
      <QuestionDrawer
        isOpen={showQuestionDrawer}
        onClose={() => setShowQuestionDrawer(false)}
        questions={questions}
        currentIndex={currentGroup.questions[0] ? questions.findIndex((q) => q.id === currentGroup.questions[0].id) : 0}
        onSelectQuestion={(idx) => {
          const targetQ = questions[idx];
          if (targetQ) {
            const targetGrpIdx = groups.findIndex((g) => g.questions.some((q) => q.id === targetQ.id));
            if (targetGrpIdx >= 0) goToGroup(targetGrpIdx);
          }
        }}
        userAnswers={userAnswers}
        checkedGroupIds={checkedGroupIds}
      />

      <PracticeToolsPanel
        activeTool={activeTool}
        onClose={() => setActiveTool(null)}
        questions={currentGroup.questions}
        notes={notes}
        onNoteChange={(questionId, value) => {
          setNotes((current) => ({ ...current, [questionId]: value }));
        }}
        annotations={currentAnnotations}
        annotatorEnabled={annotatorEnabled}
        hasPassage={Boolean(currentGroup.passageText)}
        onToggleAnnotator={() => setAnnotatorEnabled((value) => !value)}
        onDeleteAnnotation={deleteAnnotation}
        onClearAnnotations={() => {
          setAnnotations((current) => ({ ...current, [annotationGroupKey]: [] }));
        }}
      />
    </div>
  );
};
