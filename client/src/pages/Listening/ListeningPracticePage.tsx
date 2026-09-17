import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookMarked,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileCheck2,
  Headphones,
  HelpCircle,
  Languages,
  Layers3,
  ListRestart,
  PenTool,
  RotateCcw,
  Type,
  Volume2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { listeningService } from '../../services/listening';
import { BoneyardSkeleton } from '../../components/common/BoneyardSkeleton';
import {
  ListeningMediaPlayer,
  type ListeningMediaPlayerHandle,
  SHORT_SENTENCE_CONFIG,
} from '../../components/listening/ListeningMediaPlayer';
import { ListeningNotesModal } from '../../components/listening/ListeningNotesModal';
import { CellSignalBars } from '../../components/listening/CellSignalBars';
import { DictationFillBlankMode } from '../../components/listening/modes/DictationFillBlankMode';
import { MeaningSelectMode } from '../../components/listening/modes/MeaningSelectMode';
import { WordSelectMode } from '../../components/listening/modes/WordSelectMode';
import { ListenCheckMode } from '../../components/listening/modes/ListenCheckMode';
import { ListenTranscribeMode } from '../../components/listening/modes/ListenTranscribeMode';
import { ListenFullMode } from '../../components/listening/modes/ListenFullMode';
import type {
  ListeningMode,
  ListeningSentence,
  ListeningSet,
  UserListeningProgress,
} from '../../types';

interface ModeTab {
  key: ListeningMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const ListeningPracticePage: React.FC = () => {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const practiceModes: ModeTab[] = useMemo(() => [
    { key: 'mean_select', label: t('listening.modeMeanSelect'), icon: Languages },
    { key: 'word_select', label: t('listening.modeWordSelect'), icon: CheckCircle2 },
    { key: 'dictation', label: t('listening.modeDictation'), icon: Type },
    { key: 'listen_check', label: t('listening.modeListenCheck'), icon: Eye },
    { key: 'transcribe', label: t('listening.modeTranscribe'), icon: PenTool },
    { key: 'listen_full', label: t('listening.modeListenFull'), icon: Volume2 },
  ], [t]);

  const [setData, setSetData] = useState<ListeningSet | null>(null);
  const [sentences, setSentences] = useState<ListeningSentence[]>([]);
  const [userProgressMap, setUserProgressMap] = useState<Record<string, UserListeningProgress>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [activeMode, setActiveMode] = useState<ListeningMode>('dictation');
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [autoPlayNext, setAutoPlayNext] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<number | 'all'>('all');

  // Media Player Ref and Real-time Karaoke Active Word State
  const mediaPlayerRef = useRef<ListeningMediaPlayerHandle>(null);
  const [activeWordIndex, setActiveWordIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Modals
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [notesPrefillWord, setNotesPrefillWord] = useState('');

  // 1. Fetch set details and sentences
  useEffect(() => {
    if (!setId) return;
    let active = true;
    setIsLoading(true);
    setLoadError('');

    void listeningService
      .getSetDetail(setId)
      .then((res) => {
        if (!active) return;
        setSetData(res.set);
        setSentences(res.sentences);
        setUserProgressMap(res.progress || {});

        // Resume to last sentence index if available
        const defaultModeProgress = res.progress?.['dictation'];
        if (defaultModeProgress && defaultModeProgress.currentSentenceIndex !== undefined) {
          const validIdx = Math.max(
            0,
            Math.min(res.sentences.length - 1, defaultModeProgress.currentSentenceIndex)
          );
          setCurrentSentenceIndex(validIdx);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(err.message || 'Không thể tải bộ đề.');
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [setId]);

  const currentSentence = sentences[currentSentenceIndex];
  const prevSentence =
    currentSentenceIndex > 0 ? sentences[currentSentenceIndex - 1] : null;
  const nextSentence =
    currentSentenceIndex < sentences.length - 1
      ? sentences[currentSentenceIndex + 1]
      : null;

  // Timeout ref for enforcing minimum pause before auto-advancing
  const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoAdvanceTimeout = useCallback(() => {
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
  }, []);

  // Clear timeout and reset active word index on sentence change or unmount
  useEffect(() => {
    setActiveWordIndex(-1);
    return () => {
      clearAutoAdvanceTimeout();
    };
  }, [clearAutoAdvanceTimeout, currentSentenceIndex]);

  // Current mode's progress
  const currentModeProgress = userProgressMap[activeMode];
  const completedSentenceIds = useMemo(
    () => new Set(currentModeProgress?.completedSentences || []),
    [currentModeProgress]
  );

  // Completed count for current mode
  const completedCount = completedSentenceIds.size;
  const totalSentences = sentences.length;

  // Group sentences (e.g. 245 câu -> 25 nhóm)
  const groups = useMemo(() => {
    const map = new Map<number, { count: number; completedCount: number; startIndex: number; endIndex: number }>();
    sentences.forEach((s, idx) => {
      const g = s.groupIndex || 1;
      if (!map.has(g)) {
        map.set(g, { count: 0, completedCount: 0, startIndex: idx, endIndex: idx });
      }
      const item = map.get(g)!;
      item.count += 1;
      item.endIndex = idx;
      if (completedSentenceIds.has(s.id)) {
        item.completedCount += 1;
      }
    });
    return Array.from(map.entries()).map(([groupIndex, data]) => ({
      groupIndex,
      ...data,
    }));
  }, [sentences, completedSentenceIds]);

  // Filter sentences by group if selected
  const visibleSentences = useMemo(() => {
    return sentences
      .map((sent, idx) => ({ ...sent, originalIndex: idx }))
      .filter((sent) => selectedGroup === 'all' || sent.groupIndex === selectedGroup);
  }, [sentences, selectedGroup]);

  // Auto-sync selectedGroup with current sentence when navigating
  useEffect(() => {
    if (currentSentence && selectedGroup !== 'all' && currentSentence.groupIndex && currentSentence.groupIndex !== selectedGroup) {
      setSelectedGroup(currentSentence.groupIndex);
    }
  }, [currentSentence, selectedGroup]);

  // Format label for groups based on TOEIC part
  const getGroupLabel = useCallback(
    (grp: { groupIndex: number; startIndex: number; endIndex: number; count: number; completedCount: number }) => {
      const part = setData?.part;
      const sentRange = language === 'en'
        ? `Sentences ${grp.startIndex + 1} - ${grp.endIndex + 1}`
        : `Câu ${grp.startIndex + 1} - ${grp.endIndex + 1}`;
      if (part === 'Part 1') {
        return `${language === 'en' ? 'Image' : 'Tranh'} ${grp.groupIndex}: ${sentRange} (${grp.completedCount}/${grp.count})`;
      }
      if (part === 'Part 2') {
        const qNum = grp.groupIndex + 6;
        return `${language === 'en' ? 'Question' : 'Câu hỏi'} ${qNum} (${language === 'en' ? 'Group' : 'Nhóm'} ${grp.groupIndex}): ${sentRange} (${grp.completedCount}/${grp.count})`;
      }
      if (part === 'Part 3') {
        return `${language === 'en' ? 'Conversation' : 'Đoạn'} ${grp.groupIndex}: ${sentRange} (${grp.completedCount}/${grp.count})`;
      }
      if (part === 'Part 4') {
        return `${language === 'en' ? 'Talk' : 'Bài nói'} ${grp.groupIndex}: ${sentRange} (${grp.completedCount}/${grp.count})`;
      }
      return `${language === 'en' ? 'Group' : 'Nhóm'} ${grp.groupIndex}: ${sentRange} (${grp.completedCount}/${grp.count})`;
    },
    [language, setData?.part]
  );

  // Handle sentence completion
  const handleSentenceComplete = useCallback(
    async (score: number, hintCount: number) => {
      if (!setId || !currentSentence) return;

      // Update state locally
      setUserProgressMap((prev) => {
        const existing = prev[activeMode] || {
          currentSentenceIndex: currentSentenceIndex,
          completedSentences: [],
          sentenceScores: {},
          completionRate: 0,
          totalScore: 0,
          totalHintsUsed: 0,
        };

        const nextCompleted = new Set(existing.completedSentences);
        nextCompleted.add(currentSentence.id);

        const nextScores = {
          ...existing.sentenceScores,
          [currentSentence.id]: {
            score,
            hints: hintCount,
            completedAt: new Date().toISOString(),
          },
        };

        const rate = Math.min(100, Math.round((nextCompleted.size / totalSentences) * 100));

        return {
          ...prev,
          [activeMode]: {
            ...existing,
            currentSentenceIndex,
            completedSentences: Array.from(nextCompleted),
            sentenceScores: nextScores,
            completionRate: rate,
            totalScore: existing.totalScore + score,
            totalHintsUsed: existing.totalHintsUsed + hintCount,
          },
        };
      });

      // Sync with server
      await listeningService.saveProgress({
        setId,
        mode: activeMode,
        sentenceId: currentSentence.id,
        sentenceIndex: currentSentenceIndex,
        completed: true,
        score,
        hintCount,
      });
    },
    [activeMode, currentSentence, currentSentenceIndex, setId, totalSentences]
  );

  // Handle sentence reset / redo completely
  const handleSentenceReset = useCallback(
    async (sentenceId: string) => {
      if (!setId || !currentSentence) return;

      // Update state locally
      setUserProgressMap((prev) => {
        const existing = prev[activeMode];
        if (!existing) return prev;

        const nextCompleted = new Set(existing.completedSentences || []);
        nextCompleted.delete(sentenceId);

        const nextScores = { ...existing.sentenceScores };
        const removedScore = nextScores[sentenceId];
        delete nextScores[sentenceId];

        const rate = Math.min(100, Math.round((nextCompleted.size / totalSentences) * 100));
        const prevTotalScore = existing.totalScore || 0;
        const prevTotalHints = existing.totalHintsUsed || 0;

        return {
          ...prev,
          [activeMode]: {
            ...existing,
            completedSentences: Array.from(nextCompleted),
            sentenceScores: nextScores,
            completionRate: rate,
            totalScore: Math.max(0, prevTotalScore - (removedScore?.score || 0)),
            totalHintsUsed: Math.max(0, prevTotalHints - (removedScore?.hints || 0)),
          },
        };
      });

      // Sync reset to server & localStorage
      await listeningService.saveProgress({
        setId,
        mode: activeMode,
        sentenceId,
        sentenceIndex: currentSentenceIndex,
        completed: false,
        score: 0,
        hintCount: 0,
      });
    },
    [activeMode, currentSentence, currentSentenceIndex, setId, totalSentences]
  );

  const navigateToSentence = useCallback(
    (idx: number) => {
      clearAutoAdvanceTimeout();
      if (idx === currentSentenceIndex) {
        mediaPlayerRef.current?.seekTo(currentSentence?.startTime || 0);
        mediaPlayerRef.current?.play();
      } else {
        setCurrentSentenceIndex(idx);
      }
    },
    [clearAutoAdvanceTimeout, currentSentence?.startTime, currentSentenceIndex]
  );

  const handleNextSentence = useCallback(() => {
    if (currentSentenceIndex < totalSentences - 1) {
      navigateToSentence(currentSentenceIndex + 1);
    }
  }, [currentSentenceIndex, totalSentences, navigateToSentence]);

  const handlePreviousSentence = useCallback(() => {
    if (currentSentenceIndex > 0) {
      navigateToSentence(currentSentenceIndex - 1);
    }
  }, [currentSentenceIndex, navigateToSentence]);

  const handleActiveWordIndexChange = useCallback((idx: number) => {
    setActiveWordIndex(idx);
  }, []);

  const handleIsPlayingChange = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);

  const handlePlayWordAudio = useCallback((start: number, end?: number) => {
    if (end !== undefined && end > start && mediaPlayerRef.current?.playSegment) {
      mediaPlayerRef.current.playSegment(start, end);
    } else {
      mediaPlayerRef.current?.seekTo(start);
    }
  }, []);

  const handleAudioEnd = useCallback(() => {
    if (activeMode === 'listen_full' || autoPlayNext) {
      if (activeMode === 'listen_full') {
        if (currentSentenceIndex < totalSentences - 1) {
          clearAutoAdvanceTimeout();
          autoAdvanceTimeoutRef.current = setTimeout(() => {
            setCurrentSentenceIndex((prev) => prev + 1);
          }, 400);
        }
      }
    }
  }, [activeMode, autoPlayNext, clearAutoAdvanceTimeout, currentSentenceIndex, totalSentences]);

  const handleSwitchMode = (mode: ListeningMode) => {
    setActiveMode(mode);
    if (mode === 'listen_full') {
      setAutoPlayNext(true);
    }
  };

  const handleOpenNotesWithWord = (w?: string) => {
    setNotesPrefillWord(w || '');
    setNotesModalOpen(true);
  };

  const handleResetProgress = async () => {
    if (!setId) return;
    if (!window.confirm(t('listening.resetConfirm'))) return;
    await listeningService.resetProgress(setId, activeMode);
    setUserProgressMap((prev) => {
      const next = { ...prev };
      delete next[activeMode];
      return next;
    });
    navigateToSentence(0);
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-5 pb-12 text-content">
        <BoneyardSkeleton name="practice-head" height={70} className="rounded-2xl" />
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <BoneyardSkeleton name="player-skel" height={160} className="rounded-2xl" />
            <BoneyardSkeleton name="mode-skel" height={300} className="rounded-2xl" />
          </div>
          <BoneyardSkeleton name="sidebar-skel" height={480} className="rounded-2xl" />
        </div>
      </div>
    );
  }

  if (loadError || !setData) {
    return (
      <div className="mx-auto w-full max-w-lg rounded-3xl border border-line bg-surface p-8 text-center text-content">
        <h2 className="text-lg font-black text-negative">{t('listening.errorLoad')}</h2>
        <p className="mt-2 text-xs leading-relaxed text-content-muted">{loadError}</p>
        <button
          type="button"
          onClick={() => navigate('/listening')}
          className="btn-primary mx-auto mt-5 text-xs"
        >
          {t('listening.backToSets')}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 pb-12 text-content">
      {/* Top Navigation Bar & Set Metadata */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/listening')}
            className="grid size-9 place-items-center rounded-xl border border-line text-content-muted transition hover:bg-surface-hover hover:text-content active:scale-95"
            title={t('listening.backToList')}
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-accent/15 px-2 py-0.5 text-[10px] font-black text-accent-strong">
                {setData.part}
              </span>
              <CellSignalBars
                level={setData.difficultyLevel ?? (setData.difficulty === 'easy' ? 2 : setData.difficulty === 'hard' ? 4 : 3)}
                showLabel
              />
              <span className="text-xs font-semibold text-content-muted">
                {setData.categoryName}
              </span>
            </div>
            <h1 className="mt-0.5 text-base sm:text-lg font-black text-content">
              {setData.title}
            </h1>
          </div>
        </div>

        {/* Action icons: Notes, Reset */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => handleOpenNotesWithWord()}
            title={t('listening.notesTitle')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 text-xs font-bold text-content-muted transition hover:bg-surface-hover hover:text-content active:scale-95"
          >
            <BookMarked className="size-3.5 text-accent" />
            <span>{t('listening.vocabularyNotes')}</span>
          </button>

          <button
            type="button"
            onClick={handleResetProgress}
            title={t('listening.resetModeTitle')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 text-xs font-bold text-content-muted transition hover:bg-surface-hover hover:text-negative active:scale-95"
          >
            <RotateCcw className="size-3.5" />
            <span className="hidden sm:inline">{t('listening.resetSet')}</span>
          </button>
        </div>
      </div>

      {/* Practice Mode Selector Tabs */}
      <nav
        id="tour-lp-modes"
        aria-label={language === 'en' ? 'Practice modes' : 'Chế độ luyện tập'}
        className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-line bg-surface p-1.5 shadow-sm scrollbar-none sm:rounded-full"
      >
        {practiceModes.map((mode) => {
          const isActive = activeMode === mode.key;
          const Icon = mode.icon;

          return (
            <button
              key={mode.key}
              type="button"
              onClick={() => handleSwitchMode(mode.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition active:scale-95 sm:rounded-full ${
                isActive
                  ? 'bg-accent text-accent-contrast shadow-xs font-extrabold'
                  : 'text-content-muted hover:bg-surface-hover hover:text-content'
              }`}
            >
              <Icon className="size-3.5 shrink-0" />
              <span>{mode.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Main Practice Layout: Left Content (Player + Mode) | Right Sidebar (Sentence Navigation) */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px] items-start">
        {/* Left Column */}
        <div className="space-y-5">
          {/* Header Section: PART X · X/Y & Câu X */}
          {currentSentence && (
            <div className="space-y-0.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                {setData.part} &middot; {currentSentenceIndex + 1}/{totalSentences}
              </div>
              <h1 className="text-2xl font-black text-content">
                {t('listening.sentenceNum', { num: currentSentenceIndex + 1 })}
              </h1>
            </div>
          )}
          {/* Audio / Video Unified Player (2.5) */}
          {currentSentence && (
            <div id="tour-lp-player">
              <ListeningMediaPlayer
                ref={mediaPlayerRef}
                sentenceId={currentSentence.id}
                audioUrl={currentSentence.audioUrl || setData?.audioUrl}
                videoUrl={currentSentence.videoUrl}
                autoPlayNext={autoPlayNext}
                onToggleAutoPlayNext={setAutoPlayNext}
                onSentenceCompleteAudioEnd={handleAudioEnd}
                onPreviousSentence={handlePreviousSentence}
                onNextSentence={handleNextSentence}
                hasPreviousSentence={currentSentenceIndex > 0}
                hasNextSentence={currentSentenceIndex < totalSentences - 1}
                startTime={currentSentence.startTime}
                endTime={currentSentence.endTime}
                prevSentenceEndTime={prevSentence?.audioUrl === (currentSentence.audioUrl || setData?.audioUrl) ? (prevSentence?.endTime ?? null) : null}
                nextSentenceStartTime={nextSentence?.audioUrl === (currentSentence.audioUrl || setData?.audioUrl) ? (nextSentence?.startTime ?? null) : null}
                text={currentSentence.text}
                words={currentSentence.words}
                phoneticUs={currentSentence.phoneticUs}
                translationVi={currentSentence.translationVi}
                onActiveWordIndexChange={handleActiveWordIndexChange}
                onIsPlayingChange={handleIsPlayingChange}
              />
            </div>
          )}

          {/* Active Mode Interaction Card (2.3 - 2.4) */}
          {currentSentence && (
            <div id="tour-lp-interaction" className="transition-all">
              {activeMode === 'dictation' && (
                <DictationFillBlankMode
                  key={currentSentence.id}
                  sentence={currentSentence}
                  onComplete={handleSentenceComplete}
                  onReset={handleSentenceReset}
                  onOpenNotes={handleOpenNotesWithWord}
                  isCompletedAlready={completedSentenceIds.has(currentSentence.id)}
                  activeWordIndex={activeWordIndex}
                  isPlaying={isPlaying}
                  onJumpToWord={(t) => mediaPlayerRef.current?.seekTo(t)}
                  onPlayWordAudio={handlePlayWordAudio}
                  onNextSentence={handleNextSentence}
                  hasNextSentence={currentSentenceIndex < totalSentences - 1}
                />
              )}

              {activeMode === 'mean_select' && (
                <MeaningSelectMode
                  key={currentSentence.id}
                  sentence={currentSentence}
                  onComplete={handleSentenceComplete}
                  onReset={handleSentenceReset}
                  isCompletedAlready={completedSentenceIds.has(currentSentence.id)}
                  onNextSentence={handleNextSentence}
                  hasNextSentence={currentSentenceIndex < totalSentences - 1}
                />
              )}

              {activeMode === 'word_select' && (
                <WordSelectMode
                  key={currentSentence.id}
                  sentence={currentSentence}
                  onComplete={handleSentenceComplete}
                  onReset={handleSentenceReset}
                  isCompletedAlready={completedSentenceIds.has(currentSentence.id)}
                  onNextSentence={handleNextSentence}
                  hasNextSentence={currentSentenceIndex < totalSentences - 1}
                />
              )}

              {activeMode === 'listen_check' && (
                <ListenCheckMode
                  key={currentSentence.id}
                  sentence={currentSentence}
                  onComplete={handleSentenceComplete}
                  isCompletedAlready={completedSentenceIds.has(currentSentence.id)}
                />
              )}

              {activeMode === 'transcribe' && (
                <ListenTranscribeMode
                  key={currentSentence.id}
                  sentence={currentSentence}
                  onComplete={handleSentenceComplete}
                  onReset={handleSentenceReset}
                  isCompletedAlready={completedSentenceIds.has(currentSentence.id)}
                />
              )}

              {activeMode === 'listen_full' && (
                <ListenFullMode
                  sentences={sentences}
                  currentSentenceIndex={currentSentenceIndex}
                  onSelectSentence={navigateToSentence}
                  activeWordIndex={activeWordIndex}
                  isPlaying={isPlaying}
                  onJumpToWord={(t) => mediaPlayerRef.current?.seekTo(t)}
                  onNextSentence={handleNextSentence}
                  onPreviousSentence={handlePreviousSentence}
                  onTogglePlay={() => {
                    if (isPlaying) {
                      mediaPlayerRef.current?.pause();
                    } else {
                      mediaPlayerRef.current?.play();
                    }
                  }}
                  autoPlayNext={autoPlayNext}
                  onToggleAutoPlayNext={setAutoPlayNext}
                />
              )}
            </div>
          )}
        </div>

        {/* Right Column: Sentence List Sidebar (2.2) */}
        <aside className="sticky top-20 rounded-3xl border border-line bg-surface p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h2 className="text-xs font-extrabold text-content">
                {activeMode === 'listen_full' ? t('listening.script') : t('listening.sentenceList')}
              </h2>
              <p className="mt-0.5 text-[11px] font-semibold text-content-muted">
                {activeMode === 'listen_full'
                  ? t('listening.listeningNow', { current: currentSentenceIndex + 1, total: totalSentences })
                  : t('listening.completedStatus', { completed: completedCount, total: totalSentences })}
              </p>
            </div>
            {activeMode !== 'listen_full' && (
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-black text-accent-strong tabular-nums">
                {Math.round((completedCount / Math.max(1, totalSentences)) * 100)}%
              </span>
            )}
          </div>

          {/* Group Filter for large sets */}
          {groups.length > 1 && (
            <div className="space-y-1.5 border-b border-line pb-3">
              <div className="flex items-center justify-between text-[11px] font-bold text-content-muted">
                <span className="flex items-center gap-1">
                  <Layers3 className="size-3 text-accent" /> {t('listening.sentenceGroups', { count: groups.length })}
                </span>
                {selectedGroup !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedGroup('all')}
                    className="text-[10px] text-accent font-bold hover:underline"
                  >
                    {t('listening.viewAll')}
                  </button>
                )}
              </div>
              <select
                value={selectedGroup}
                onChange={(e) => {
                  const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                  setSelectedGroup(val);
                  if (val !== 'all') {
                    const grp = groups.find((g) => g.groupIndex === val);
                    if (grp) navigateToSentence(grp.startIndex);
                  }
                }}
                className="w-full rounded-xl border border-line bg-surface-elevated px-2.5 py-1.5 text-xs font-bold text-content outline-none focus:border-accent cursor-pointer"
              >
                <option value="all">{t('listening.allSentences', { count: totalSentences })}</option>
                {groups.map((grp) => (
                  <option key={grp.groupIndex} value={grp.groupIndex}>
                    {getGroupLabel(grp)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sentences list with direct jump */}
          <div className="max-h-[60vh] space-y-1.5 overflow-y-auto pr-1 scrollbar-thin">
            {visibleSentences.map((sent) => {
              const idx = sent.originalIndex;
              const isCurrent = idx === currentSentenceIndex;
              const isDone = completedSentenceIds.has(sent.id);

              return (
                <button
                  key={sent.id}
                  type="button"
                  onClick={() => navigateToSentence(idx)}
                  className={`flex w-full items-center justify-between rounded-xl p-2.5 text-left text-xs transition active:scale-[0.99] ${
                    isCurrent
                      ? 'border border-accent bg-accent/10 text-accent-strong font-extrabold'
                      : 'border border-transparent bg-surface-elevated/30 hover:bg-surface-hover text-content font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span
                      className={`grid size-6 shrink-0 place-items-center rounded-lg text-[11px] font-black ${
                        isCurrent
                          ? 'bg-accent text-accent-contrast'
                          : 'bg-surface-elevated text-content-muted'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="truncate">{t('listening.sentenceNum', { num: idx + 1 })}</span>
                  </div>

                  {activeMode === 'listen_full' ? (
                    isCurrent && isPlaying ? (
                      <Volume2 className="size-4 shrink-0 text-accent animate-pulse" />
                    ) : null
                  ) : (
                    isDone && <CheckCircle2 className="size-4 shrink-0 text-positive" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom navigation buttons: Prev & Next */}
          <div className="grid grid-cols-2 gap-2 border-t border-line pt-3">
            <button
              type="button"
              onClick={handlePreviousSentence}
              disabled={currentSentenceIndex === 0}
              className="btn-secondary justify-center gap-1 text-xs py-2 disabled:opacity-40"
            >
              <ChevronLeft className="size-3.5" />
              <span>{t('listening.prevSentence')}</span>
            </button>
            <button
              type="button"
              onClick={handleNextSentence}
              disabled={currentSentenceIndex === totalSentences - 1}
              className="btn-secondary justify-center gap-1 text-xs py-2 disabled:opacity-40"
            >
              <span>{t('listening.nextSentence')}</span>
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </aside>
      </div>


      {/* Notes Modal */}
      <ListeningNotesModal
        isOpen={notesModalOpen}
        onClose={() => setNotesModalOpen(false)}
        setId={setData.id}
        setTitle={setData.title}
        currentSentenceId={currentSentence?.id}
        prefillWord={notesPrefillWord}
      />
    </div>
  );
};
export default ListeningPracticePage;
