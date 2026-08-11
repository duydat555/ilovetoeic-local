import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Headphones,
  Languages,
  ListChecks,
  Loader2,
  LockKeyhole,
  Maximize2,
  Send,
} from 'lucide-react';
import { BoneyardSkeleton } from '../../components/common/BoneyardSkeleton';
import { ExamSubmitConfirmModal } from '../../components/mock-test/ExamSubmitConfirmModal';
import { AudioPlayer } from '../../components/common/AudioPlayer';
import { ChoiceCard } from '../../components/common/ChoiceCard';
import { PassageContent } from '../../components/common/PassageContent';
import { QuestionDrawer } from '../../components/common/QuestionDrawer';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { apiService } from '../../services/api';
import { backendService } from '../../services/backend';
import { Question } from '../../types';
import { createClientId } from '../../utils/id';
import { buildPracticeGroups, stripChoicePrefix } from '../../utils/practice';
import { storage } from '../../utils/storage';
import { clearSyncedLocalWrongQuestions, updateLocalWrongQuestions } from '../../utils/localWrongQuestions';
import {
  getExamDurationSeconds,
  getTestPartScopeLabel,
  parseTestPartScope,
  serializeTestPartScope,
} from '../../utils/testScope';

type ChoiceId = 'A' | 'B' | 'C' | 'D';

export const TestExamPage: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, recordStudyActivity } = useAuth();
  const { refreshNotifications } = useNotifications();

  const partsParam = searchParams.get('parts');
  const selectedParts = useMemo(() => parseTestPartScope(partsParam), [partsParam]);
  const scopeKey = serializeTestPartScope(selectedParts);
  const scopeLabel = getTestPartScopeLabel(selectedParts);
  const examScopeLabel = selectedParts.length === 7
    ? 'Complete TOEIC Test'
    : selectedParts.join(', ').replace(/(^|, )(\d+)/g, '$1Part $2');
  const examDurationSeconds = getExamDurationSeconds(selectedParts);
  const examDraftKey = testId ? `${testId}:${scopeKey}` : '';

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, ChoiceId>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [secondsRemaining, setSecondsRemaining] = useState(examDurationSeconds);
  const [submitting, setSubmitting] = useState(false);
  const [showQuestionDrawer, setShowQuestionDrawer] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [completedListeningGroups, setCompletedListeningGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const syncFullscreenState = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.body.style.overflow = 'hidden';
    document.addEventListener('fullscreenchange', syncFullscreenState);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('fullscreenchange', syncFullscreenState);
    };
  }, []);

  useEffect(() => {
    const loadExamData = async () => {
      if (!testId) return;
      setLoading(true);
      const data = await apiService.getFullTestQuestions(testId);
      const filteredQuestions = data.filter((question) => selectedParts.includes(question.partId));
      setQuestions(filteredQuestions);
      setCurrentIndex(0);
      setUserAnswers({});
      setFlaggedQuestions({});
      setCompletedListeningGroups(new Set());
      setSecondsRemaining(examDurationSeconds);

      const draft = storage.getExamDraft(examDraftKey);
      if (draft) {
        const validQuestionIds = new Set(filteredQuestions.map((question) => question.id));
        setUserAnswers(Object.fromEntries(
          Object.entries(draft.answers).filter(([questionId]) => validQuestionIds.has(questionId)),
        ) as Record<string, ChoiceId>);
        setSecondsRemaining(Math.max(examDurationSeconds - (draft.timeSpentSeconds || 0), 0));
      }
      setLoading(false);
    };
    void loadExamData();
  }, [examDraftKey, examDurationSeconds, selectedParts, testId]);

  useEffect(() => {
    if (examDraftKey && Object.keys(userAnswers).length > 0) {
      storage.saveExamDraft(examDraftKey, userAnswers, examDurationSeconds - secondsRemaining);
    }
  }, [examDraftKey, examDurationSeconds, secondsRemaining, userAnswers]);

  const handleFinishExam = async () => {
    if (!testId || !user || submitting) return;
    setSubmitting(true);
    try {
      const timeSpentSeconds = examDurationSeconds - secondsRemaining;
      const completedAt = new Date().toISOString();
      const result = await apiService.submitTest(testId, userAnswers, timeSpentSeconds, user.id, questions);
      const completedResult = { ...result, answers: userAnswers };
      storage.saveTestResult(completedResult);

      const correctAnswers = questions.filter(
        (question) => userAnswers[question.id] === question.correctAnswer,
      );
      const listeningCorrect = correctAnswers.filter((question) => question.partId <= 4).length;
      const readingCorrect = correctAnswers.length - listeningCorrect;
      const attemptId = result.attemptId || createClientId();

      try {
        await backendService.saveStudyAttempt({
          id: attemptId,
          userId: user.id,
          testId,
          testName: result.testName || result.testTitle,
          testYear: result.testYear,
          mode: 'exam',
          part: selectedParts.length === 1 ? selectedParts[0] : undefined,
          totalQuestions: questions.length,
          answeredQuestions: questions.filter((question) => Boolean(userAnswers[question.id])).length,
          correctAnswers: correctAnswers.length,
          accuracyRate: questions.length ? Math.round((correctAnswers.length / questions.length) * 100) : 0,
          timeSpentSeconds,
          listeningCorrect,
          readingCorrect,
          listeningScore: result.listeningScore,
          readingScore: result.readingScore,
          totalScore: result.totalScore,
          answers: userAnswers,
          questionIds: questions.map((question) => question.id),
          metadata: {
            test_name: result.testTitle,
            selected_parts: selectedParts,
            scope_label: scopeLabel,
            is_partial: selectedParts.length < 7 || questions.length !== 200,
          },
          completedAt,
        });

        const answeredQuestions = questions.filter((question) => Boolean(userAnswers[question.id]));
        for (let index = 0; index < answeredQuestions.length; index += 20) {
          const batch = answeredQuestions.slice(index, index + 20);
          const synced = await backendService.saveQuestionActivity({
            attemptId,
            sourceType: 'test',
            testId,
            answers: batch.map((question) => ({
              questionId: question.id,
              selectedAnswer: userAnswers[question.id],
            })),
            answeredAt: completedAt,
          });
          if (synced) {
            clearSyncedLocalWrongQuestions(user.id, 'test', batch.map((question) => question.id));
          }
        }

      } catch (err) {
        console.warn('[!] Cloud sync attempt error, fallback to local storage:', err);
      }

      storage.clearExamDraft(examDraftKey);

      try {
        await recordStudyActivity();
        await refreshNotifications();
      } catch (err) {
        console.warn('[!] Optional post submit triggers error:', err);
      }

      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen().catch(() => undefined);
      }
      navigate('/results');
    } catch (error) {
      console.error('Error submitting exam:', error);
      alert('Your test result has been saved.');
      navigate('/results');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (loading || questions.length === 0 || submitting) return undefined;
    const timer = window.setInterval(() => {
      setSecondsRemaining((previous) => Math.max(previous - 1, 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [loading, questions.length, submitting]);

  useEffect(() => {
    if (secondsRemaining === 0 && !loading && questions.length > 0 && !submitting) {
      void handleFinishExam();
    }
  }, [loading, questions.length, secondsRemaining, submitting]);

  const groups = useMemo(() => buildPracticeGroups(questions), [questions]);
  const currentQuestion = questions[currentIndex] || questions[0];
  const currentGroupIndex = Math.max(
    groups.findIndex((group) => group.questions.some((question) => question.id === currentQuestion?.id)),
    0,
  );
  const currentGroup = groups[currentGroupIndex];
  const answeredCount = Object.keys(userAnswers).length;
  const completionPercent = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;
  const isFullExam = selectedParts.length === 7;
  const isListeningSection = Boolean(currentGroup && currentGroup.partId <= 4);
  const elapsedSeconds = examDurationSeconds - secondsRemaining;
  const sectionSecondsRemaining = isFullExam && isListeningSection
    ? Math.max(45 * 60 - elapsedSeconds, 0)
    : secondsRemaining;
  const isTimeCritical = sectionSecondsRemaining <= 300;

  useEffect(() => {
    if (!isFullExam || !isListeningSection || sectionSecondsRemaining > 0) return;
    const firstReadingIndex = questions.findIndex((question) => question.partId >= 5);
    if (firstReadingIndex >= 0) setCurrentIndex(firstReadingIndex);
  }, [isFullExam, isListeningSection, questions, sectionSecondsRemaining]);

  const selectChoice = (questionId: string, choiceId: ChoiceId) => {
    setUserAnswers((previous) => ({ ...previous, [questionId]: choiceId }));
    const question = questions.find((item) => item.id === questionId);
    if (user && testId && question) {
      updateLocalWrongQuestions(
        user.id,
        'test',
        { testId },
        [question],
        { [questionId]: choiceId },
      );
    }
  };

  const toggleFlag = (questionId: string) => {
    setFlaggedQuestions((previous) => ({ ...previous, [questionId]: !previous[questionId] }));
  };

  const goToGroup = (groupIndex: number) => {
    const target = groups[Math.min(Math.max(groupIndex, 0), groups.length - 1)];
    if (!target) return;
    const targetQuestionIndex = questions.findIndex((question) => question.id === target.questions[0].id);
    setCurrentIndex(Math.max(targetQuestionIndex, 0));
  };

  const enterFullscreen = () => {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      void document.documentElement.requestFullscreen().catch((error) => {
        console.warn('[!] Fullscreen request failed:', error);
      });
    }
  };

  const completeListeningGroup = (groupId: string) => {
    setCompletedListeningGroups((previous) => new Set(previous).add(groupId));
    const nextGroup = groups[currentGroupIndex + 1];
    if (nextGroup) goToGroup(currentGroupIndex + 1);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remaining = seconds % 60;
    return `${hours > 0 ? `${hours}:` : ''}${minutes.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  const getExamQuestionPrompt = (question: Question) => {
    if (question.partId === 1) return 'Select the statement that best describes the photograph.';
    if (question.partId === 2) return 'Select the best response to the question or statement.';
    return question.promptText || 'Select the best answer.';
  };

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-4" role="status" aria-label="Preparing your test">
        <BoneyardSkeleton name="test-exam-shell" height={420} width="min(100%, 64rem)" />
      </div>
    );
  }

  if (!currentGroup) {
    return (
      <div className="surface mx-auto max-w-lg p-8 text-center">
        <h1 className="text-xl font-extrabold text-slate-950 dark:text-content">No questions are available for this test</h1>
        <button onClick={() => navigate('/mock-test')} className="btn-primary mt-5">Return to Test Library</button>
      </div>
    );
  }

  const firstNumber = currentGroup.questions[0].questionNumber;
  const lastNumber = currentGroup.questions[currentGroup.questions.length - 1].questionNumber;
  const multipleQuestions = currentGroup.questions.length > 1;
  const skillLabel = currentGroup.partId >= 5 ? 'Reading' : 'Listening';
  const examTitle = multipleQuestions
    ? `${skillLabel}: Questions ${firstNumber} - ${lastNumber}`
    : `${skillLabel}: Question ${firstNumber}`;

  // Split view if Reading passage, Part 1 image, or 3+ listening audio questions
  const isSplitLayout =
    (currentGroup.partId >= 6 && Boolean(currentGroup.passageText)) ||
    Boolean(currentGroup.imageUrl) ||
    (Boolean(currentGroup.audioUrl) && currentGroup.questions.length >= 3);

  return (
    <div className="fixed inset-0 z-40 flex min-h-dvh flex-col gap-2 overflow-hidden bg-slate-100 p-2 dark:bg-canvas sm:p-3">
      {!isFullscreen && (
        <button
          type="button"
          onClick={enterFullscreen}
          className="flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 text-xs font-bold text-amber-900 transition hover:bg-amber-100 active:scale-[0.99] dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200"
        >
          <Maximize2 className="size-3.5" /> Return to Full Screen
        </button>
      )}
      {/* Fixed Header Bar (Shrink-0, Shifted up, Never overlaps questions) */}
      <header className="shrink-0 rounded-xl border border-slate-200/80 bg-white p-2 shadow-xs dark:border-line dark:bg-surface">
        <div className="flex items-center justify-between gap-3">
          {/* Title & Group Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-brand-100 px-2 py-0.5 text-[11px] font-black text-brand-700 dark:bg-brand-950 dark:text-brand-200">
                Part {currentGroup.partId}
              </span>
              <h1 className="truncate text-sm font-extrabold tracking-tight text-slate-900 sm:text-base dark:text-content">
                {examTitle}
              </h1>
            </div>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
              {examScopeLabel} · Set {currentGroupIndex + 1}/{groups.length}
            </p>
          </div>

          {/* Compact Progress Widget */}
          <div className="hidden md:flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-1 border border-slate-200/60 dark:bg-surface-elevated/60 dark:border-line/60">
            <div className="text-right text-xs">
              <div className="font-extrabold text-slate-800 dark:text-content">
                {answeredCount}/{questions.length} <span className="text-[10px] text-slate-400">answered</span>
              </div>
              <div className="text-[10px] font-semibold text-brand-600 dark:text-brand-300">
                {completionPercent}% complete
              </div>
            </div>
            <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-200 dark:bg-surface-hover">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand to-brand-400 transition-all duration-300"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowQuestionDrawer(true)}
              disabled={isListeningSection}
              title={isListeningSection ? 'Listening questions follow the audio sequence' : 'Open question navigator'}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-brand-400 hover:bg-brand-50/50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-line dark:bg-surface-elevated dark:text-content dark:hover:bg-surface-hover"
            >
              <ListChecks className="size-4 text-brand-600 dark:text-brand-300" />
              <span className="hidden sm:inline">Questions</span>
              <span className="rounded-md bg-brand-100 px-1.5 py-0.5 text-[10px] font-extrabold text-brand-700 dark:bg-brand-950 dark:text-brand-200">
                {answeredCount}/{questions.length}
              </span>
            </button>

            <div
              role="timer"
              aria-label={`Time remaining ${formatTime(sectionSecondsRemaining)}`}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-mono text-xs font-black ${
                isTimeCritical
                  ? 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900 dark:bg-rose-950/50'
                  : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40'
              }`}
            >
              <Clock3 className={`size-4 ${isTimeCritical ? 'animate-pulse' : ''}`} />
              <span className="hidden sm:inline">{isListeningSection ? 'Listening' : 'Reading'}</span>
              {formatTime(sectionSecondsRemaining)}
            </div>

            <button
              type="button"
              onClick={() => setShowSubmitConfirm(true)}
              disabled={submitting}
              className="btn-primary min-h-8 px-3 text-xs sm:px-3.5"
            >
              {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              <span className="hidden sm:inline">{submitting ? 'Submitting...' : 'Submit Test'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Area (Fixed height container) */}
      <main className="flex-1 min-h-0 overflow-hidden">
        {isSplitLayout ? (
          <div className="grid h-full items-start gap-4 xl:grid-cols-[minmax(0,.95fr)_minmax(440px,1.05fr)] overflow-hidden">
            {/* Left Column: Shared Media Pane (Scrolls independently) */}
            {(currentGroup.audioUrl || currentGroup.passageText || currentGroup.imageUrl) && (
              <section className="surface flex h-full max-h-full flex-col overflow-hidden rounded-2xl">
                <div className="shrink-0 flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-line">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-extrabold text-slate-950 dark:text-content">
                      {currentGroup.audioUrl ? <Headphones className="size-4 text-brand-600" /> : <Languages className="size-4 text-brand-600" />}
                      Test Content
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {multipleQuestions ? `Questions ${firstNumber} - ${lastNumber}` : `Question ${firstNumber}`}
                    </p>
                  </div>
                  {currentGroup.passageText && (
                    <button
                      type="button"
                      disabled
                      title="Translations are available after submission"
                      aria-label="Translations are locked until the test is submitted"
                      className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-400 dark:bg-surface-elevated dark:text-content-muted"
                    >
                      <LockKeyhole className="size-4" /> Available after submission
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {currentGroup.audioUrl && (
                    <AudioPlayer
                      autoPlay
                      examMode
                      locked={completedListeningGroups.has(currentGroup.id)}
                      audioUrl={currentGroup.audioUrl}
                      title={`Audio for Questions ${firstNumber}–${lastNumber}`}
                      onEnded={() => completeListeningGroup(currentGroup.id)}
                    />
                  )}
                  {currentGroup.imageUrl && (
                    <img
                      src={currentGroup.imageUrl}
                      alt={`Test content for Question ${firstNumber}`}
                      className="mx-auto max-h-[22rem] max-w-full rounded-2xl border border-slate-200 object-contain dark:border-line shadow-xs"
                    />
                  )}
                  {currentGroup.passageText && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-relaxed dark:border-line dark:bg-canvas">
                      <PassageContent html={currentGroup.passageText} />
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Right Column: Questions List Pane (Scrolls independently, 100% visible) */}
            <section className="flex h-full max-h-full flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto pr-1.5 space-y-3.5">
                {currentGroup.questions.map((question) => {
                  const selectedAnswer = userAnswers[question.id];
                  const flagged = Boolean(flaggedQuestions[question.id]);

                  return (
                    <article key={question.id} className="surface overflow-hidden rounded-2xl">
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-line">
                        <div className="flex min-w-0 items-start gap-2.5">
                          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand text-xs font-black text-brand-ink shadow-xs">
                            {question.questionNumber}
                          </span>
                          <h2 className="pt-0.5 text-sm font-bold leading-relaxed text-slate-950 dark:text-content">
                            {getExamQuestionPrompt(question)}
                          </h2>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleFlag(question.id)}
                          aria-label={`Mark Question ${question.questionNumber} for review`}
                          className={`grid size-7 shrink-0 place-items-center rounded-lg transition ${
                            flagged ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-100 text-slate-400 hover:text-amber-500 dark:bg-surface-elevated'
                          }`}
                        >
                          <Bookmark className="size-3.5" />
                        </button>
                      </div>

                      <div className="space-y-2 p-3.5">
                        {question.choices.map((choice) => (
                          <ChoiceCard
                            key={choice.id}
                            choiceId={choice.id}
                            text={stripChoicePrefix(choice.text, choice.id)}
                            selected={selectedAnswer === choice.id}
                            onSelect={() => selectChoice(question.id, choice.id)}
                            hiddenListeningText={question.partId === 1 || question.partId === 2}
                            hiddenListeningLabel={(choiceId) => `Answer ${choiceId}`}
                          />
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Fixed Group Navigation Bar at bottom of right pane */}
              <div className="shrink-0 mt-3 surface flex items-center justify-between rounded-2xl p-2.5">
                <button
                  type="button"
                  onClick={() => goToGroup(currentGroupIndex - 1)}
                  disabled={currentGroupIndex === 0 || isListeningSection}
                  className="btn-secondary text-xs py-1.5 disabled:opacity-40"
                >
                  <ChevronLeft className="size-4" /> Back
                </button>
                <span className="text-xs font-extrabold text-slate-400">
                  {currentGroupIndex + 1} / {groups.length}
                </span>
                <button
                  type="button"
                  onClick={() => goToGroup(currentGroupIndex + 1)}
                  disabled={currentGroupIndex === groups.length - 1 || (isListeningSection && Boolean(currentGroup.audioUrl))}
                  className="btn-primary text-xs py-1.5 disabled:opacity-40"
                >
                  Next <ChevronRight className="size-4" />
                </button>
              </div>
            </section>
          </div>
        ) : (
          /* Single Column Layout */
          <div className="flex h-full flex-col overflow-hidden max-w-4xl mx-auto">
            <div className="flex-1 overflow-y-auto space-y-4 pr-1.5">
              {(currentGroup.audioUrl || currentGroup.passageText || currentGroup.imageUrl) && (
                <section className="surface rounded-2xl p-5 space-y-4">
                  {currentGroup.audioUrl && (
                    <AudioPlayer
                      autoPlay
                      examMode
                      locked={completedListeningGroups.has(currentGroup.id)}
                      audioUrl={currentGroup.audioUrl}
                      title={`Audio for Questions ${firstNumber}–${lastNumber}`}
                      onEnded={() => completeListeningGroup(currentGroup.id)}
                    />
                  )}
                  {currentGroup.imageUrl && (
                    <img
                      src={currentGroup.imageUrl}
                      alt={`Test content for Question ${firstNumber}`}
                      className="mx-auto max-h-[22rem] max-w-full rounded-2xl border border-slate-200 object-contain dark:border-line shadow-xs"
                    />
                  )}
                  {currentGroup.passageText && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-relaxed dark:border-line dark:bg-canvas">
                      <PassageContent html={currentGroup.passageText} />
                    </div>
                  )}
                </section>
              )}

              {currentGroup.questions.map((question) => {
                const selectedAnswer = userAnswers[question.id];
                const flagged = Boolean(flaggedQuestions[question.id]);

                return (
                  <article key={question.id} className="surface overflow-hidden rounded-2xl">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-line">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand text-xs font-black text-brand-ink shadow-xs">
                          {question.questionNumber}
                        </span>
                        <h2 className="pt-0.5 text-sm font-bold leading-relaxed text-slate-950 dark:text-content">
                          {getExamQuestionPrompt(question)}
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleFlag(question.id)}
                        aria-label={`Mark Question ${question.questionNumber} for review`}
                        className={`grid size-7 shrink-0 place-items-center rounded-lg transition ${
                          flagged ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-100 text-slate-400 hover:text-amber-500 dark:bg-surface-elevated'
                        }`}
                      >
                        <Bookmark className="size-3.5" />
                      </button>
                    </div>

                    <div className="space-y-2 p-3.5">
                      {question.choices.map((choice) => (
                        <ChoiceCard
                          key={choice.id}
                          choiceId={choice.id}
                          text={stripChoicePrefix(choice.text, choice.id)}
                          selected={selectedAnswer === choice.id}
                          onSelect={() => selectChoice(question.id, choice.id)}
                          hiddenListeningText={question.partId === 1 || question.partId === 2}
                          hiddenListeningLabel={(choiceId) => `Answer ${choiceId}`}
                        />
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="shrink-0 mt-3 surface flex items-center justify-between rounded-2xl p-2.5">
              <button
                type="button"
                onClick={() => goToGroup(currentGroupIndex - 1)}
                disabled={currentGroupIndex === 0 || isListeningSection}
                className="btn-secondary text-xs py-1.5 disabled:opacity-40"
              >
                <ChevronLeft className="size-4" /> Back
              </button>
              <span className="text-xs font-extrabold text-slate-400">
                {currentGroupIndex + 1} / {groups.length}
              </span>
              <button
                type="button"
                onClick={() => goToGroup(currentGroupIndex + 1)}
                disabled={currentGroupIndex === groups.length - 1 || (isListeningSection && Boolean(currentGroup.audioUrl))}
                className="btn-primary text-xs py-1.5 disabled:opacity-40"
              >
                Next <ChevronRight className="size-4" />
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
        currentIndex={currentIndex}
        onSelectQuestion={(idx) => {
          setCurrentIndex(idx);
          const targetQ = questions[idx];
          if (targetQ) {
            const targetGrpIdx = groups.findIndex((g) => g.questions.some((q) => q.id === targetQ.id));
            if (targetGrpIdx >= 0) goToGroup(targetGrpIdx);
          }
        }}
        userAnswers={userAnswers}
        flaggedQuestions={flaggedQuestions}
        language="en"
      />

      <AnimatePresence initial={false}>
        {showSubmitConfirm && (
          <ExamSubmitConfirmModal
            key="exam-submit-confirm"
            answeredCount={answeredCount}
            totalQuestions={questions.length}
            submitting={submitting}
            onClose={() => setShowSubmitConfirm(false)}
            onConfirm={() => void handleFinishExam()}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
