import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Settings,
  List,
  BookOpen,
  HelpCircle,
  GraduationCap,
  PlusCircle,
  Gamepad2,
  CheckCircle2,
  Clock,
  Flame,
  Plus,
} from 'lucide-react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BoneyardSkeleton } from '../../components/common/BoneyardSkeleton';
import {
  VocabularyLivePageSkeleton,
  VocabularyLiveHeaderSkeleton,
  VocabularyLiveModesSkeleton,
} from './components/VocabularyLivePageSkeleton';
import {
  VOCABULARY_CHANGED_EVENT,
  vocabularyService,
} from '../../services/vocabulary';
import { systemVocabularyService } from '../../services/systemVocabulary';
import { VocabularyWord } from '../../types';
import { vocabularyTopicService, VocabularyTopic, MY_WORDS_TOPIC } from '../../services/vocabularyTopics';
import { WordListView } from './modes/WordListView';
import { GuessWordView } from './modes/GuessWordView';
import { FlashcardStudyView } from './modes/FlashcardStudyView';
import { PracticeHubView } from './modes/PracticeHubView';
import { WordGameView } from './modes/WordGameView';
import { VocabularySettingsModal } from './components/VocabularySettingsModal';
import { AddWordModal } from './components/AddWordModal';

export type VocabStudyMode = 'list' | 'guess' | 'flashcard' | 'practice' | 'game';

export const TopicFlashcardPage: React.FC = () => {
  const { user } = useAuth();
  const { topicId = 'my-words' } = useParams();

  if (topicId === 'all') {
    return <Navigate to="/vocabulary" replace />;
  }

  const [activeMode, setActiveMode] = useState<VocabStudyMode>('list');
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [topic, setTopic] = useState<VocabularyTopic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [addWordOpen, setAddWordOpen] = useState(false);

  const loadWords = useCallback(async (showLoading = true) => {
    if (!user) return;
    if (showLoading) setLoading(true);
    setError('');
    try {
      const isPersonalNotebook =
        topicId === 'my-words' || topicId === 'saved' || topicId === 'ai' || topicId === 'notebook';

      if (isPersonalNotebook) {
        const loadedWords = await vocabularyService.getAll(user.id);
        const topicWords = vocabularyTopicService.wordsForTopic(user.id, topicId, loadedWords);
        setWords(topicWords);
        setTopic(MY_WORDS_TOPIC);
      } else {
        const personalTopic = vocabularyTopicService.getTopics(user.id).find((item) => item.id === topicId && !item.system);
        if (personalTopic) {
          const loadedWords = await vocabularyService.getAll(user.id);
          const topicWords = vocabularyTopicService.wordsForTopic(user.id, topicId, loadedWords);
          setWords(topicWords);
          setTopic(personalTopic);
        } else {
          // System topic: fetch words directly from system vocabulary API
          try {
            const systemRes = await systemVocabularyService.getTopicWords(topicId);
            if (systemRes.words && systemRes.words.length > 0) {
              setWords(systemRes.words);
              setTopic({
                id: topicId,
                name: systemRes.topicName,
                icon: 'compass',
                description: `Bộ từ vựng trọng tâm (${systemRes.total} từ)`,
                system: true,
                createdAt: '',
              });
            } else {
              const loadedWords = await vocabularyService.getAll(user.id);
              const topicWords = vocabularyTopicService.wordsForTopic(user.id, topicId, loadedWords);
              setWords(topicWords);
              setTopic(vocabularyTopicService.getTopics(user.id).find((item) => item.id === topicId) || null);
            }
          } catch {
            const loadedWords = await vocabularyService.getAll(user.id);
            const topicWords = vocabularyTopicService.wordsForTopic(user.id, topicId, loadedWords);
            setWords(topicWords);
            setTopic(vocabularyTopicService.getTopics(user.id).find((item) => item.id === topicId) || null);
          }
        }
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải từ vựng.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [topicId, user]);

  useEffect(() => {
    void loadWords();
  }, [loadWords]);

  useEffect(() => {
    const reloadAfterChange = () => void loadWords(false);
    window.addEventListener(VOCABULARY_CHANGED_EVENT, reloadAfterChange);
    return () => window.removeEventListener(VOCABULARY_CHANGED_EVENT, reloadAfterChange);
  }, [loadWords]);

  const toggleRemembered = async (word: VocabularyWord) => {
    if (!user) return;
    const remembered = !word.remembered;
    const lastReviewedAt = new Date().toISOString();
    const updatedWord: VocabularyWord = { ...word, remembered, lastReviewedAt };
    setWords((current) =>
      current.map((item) =>
        item.id === word.id ? updatedWord : item
      )
    );
    try {
      await vocabularyService.saveOrUpdate(user.id, updatedWord);
    } catch (err) {
      setWords((current) =>
        current.map((item) =>
          item.id === word.id ? { ...item, remembered: word.remembered } : item
        )
      );
    }
  };

  const handleWordMastered = (wordId: string) => {
    const target = words.find((w) => w.id === wordId);
    if (target && !target.remembered) {
      toggleRemembered(target);
    }
  };

  const handleWordNeedReview = (wordId: string) => {
    const target = words.find((w) => w.id === wordId);
    if (target && target.remembered) {
      toggleRemembered(target);
    }
  };

  const handleDeleteWord = async (word: VocabularyWord) => {
    if (!user) return;
    try {
      await vocabularyService.remove(user.id, word.id);
      setWords((current) => current.filter((w) => w.id !== word.id));
    } catch (err) {
      console.error('Failed to delete word:', err);
    }
  };

  const totalCount = words.length;
  const learnedCount = words.filter((w) => w.remembered).length;
  const needReviewCount = totalCount - learnedCount;
  const newCount = needReviewCount;

  if (loading) {
    return <VocabularyLivePageSkeleton />;
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header & Statistics */}
      <BoneyardSkeleton
        name="vocab-live-header"
        loading={loading}
        fallback={<VocabularyLiveHeaderSkeleton />}
      >
        <header className="flex flex-col gap-4 border-b border-line pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/vocabulary"
              className="grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-surface text-content-muted transition hover:bg-surface-hover hover:text-content"
              title="Quay lại trang danh sách từ vựng"
            >
              <ArrowLeft className="size-4" />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-content-muted">Quay lại trang từ vựng</span>
                <span className="text-xs text-content-muted">/</span>
                <span className="text-xs font-bold text-accent-strong">{topic?.name || 'Sổ tay từ vựng của tôi'}</span>
              </div>
              <h1 className="text-xl font-black tracking-tight text-content sm:text-2xl">
                {topic?.name || 'Sổ tay từ vựng của tôi'}
              </h1>
            </div>
          </div>

          {/* Counter Badges & Settings */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-extrabold text-content">
              <span className="text-content-muted">#</span>
              <span>Tổng: {totalCount}</span>
            </div>

            <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-3.5" />
              <span>Đã học: {learnedCount}</span>
            </div>

            <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-extrabold text-amber-600 dark:text-amber-400">
              <Clock className="size-3.5" />
              <span>Cần ôn: {needReviewCount}</span>
            </div>

            <div className="flex items-center gap-1.5 rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 text-xs font-extrabold text-sky-600 dark:text-sky-400">
              <PlusCircle className="size-3.5" />
              <span>Mới: {newCount}</span>
            </div>

            <button
              type="button"
              onClick={() => setAddWordOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-extrabold text-accent-strong transition hover:bg-accent hover:text-accent-contrast active:scale-98"
            >
              <Plus className="size-3.5" />
              <span>Thêm từ mới</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-extrabold text-content transition hover:bg-surface-hover"
            >
              <Settings className="size-3.5" />
              <span>Cài đặt</span>
            </button>
          </div>
        </header>
      </BoneyardSkeleton>

      {/* Main 5 Mode Tabs */}
      <BoneyardSkeleton
        name="vocab-live-modes"
        loading={loading}
        fallback={<VocabularyLiveModesSkeleton />}
      >
        <nav aria-label="Chế độ học từ vựng" className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveMode('list')}
            className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-extrabold transition-all active:scale-98 ${
              activeMode === 'list'
                ? 'border-accent bg-accent text-accent-contrast shadow-md shadow-accent/20'
                : 'border-line bg-surface text-content hover:border-accent/40 hover:bg-surface-hover'
            }`}
          >
            <List className="size-4" />
            <span>Xem từ</span>
            <span className="rounded-full bg-black/15 px-2 py-0.5 text-xs font-bold dark:bg-white/20">
              {totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('guess')}
            className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-extrabold transition-all active:scale-98 ${
              activeMode === 'guess'
                ? 'border-accent bg-accent text-accent-contrast shadow-md shadow-accent/20'
                : 'border-line bg-surface text-content hover:border-accent/40 hover:bg-surface-hover'
            }`}
          >
            <HelpCircle className="size-4" />
            <span>Đoán</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('flashcard')}
            className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-extrabold transition-all active:scale-98 ${
              activeMode === 'flashcard'
                ? 'border-accent bg-accent text-accent-contrast shadow-md shadow-accent/20'
                : 'border-line bg-surface text-content hover:border-accent/40 hover:bg-surface-hover'
            }`}
          >
            <GraduationCap className="size-4" />
            <span>Học</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('practice')}
            className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-extrabold transition-all active:scale-98 ${
              activeMode === 'practice'
                ? 'border-accent bg-accent text-accent-contrast shadow-md shadow-accent/20'
                : 'border-line bg-surface text-content hover:border-accent/40 hover:bg-surface-hover'
            }`}
          >
            <Flame className="size-4" />
            <span>Luyện tập</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('game')}
            className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-extrabold transition-all active:scale-98 ${
              activeMode === 'game'
                ? 'border-accent bg-accent text-accent-contrast shadow-md shadow-accent/20'
                : 'border-line bg-surface text-content hover:border-accent/40 hover:bg-surface-hover'
            }`}
          >
            <Gamepad2 className="size-4" />
            <span>Chơi</span>
          </button>
        </nav>
      </BoneyardSkeleton>

      {/* Main Content Area */}
      {error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 text-center text-sm font-bold text-rose-600">
          {error}
        </div>
      ) : (
        <div>
          {words.length === 0 && activeMode !== 'list' ? (
            <div className="grid min-h-80 place-items-center rounded-3xl border border-line bg-surface p-8 text-center">
              <div>
                <BookOpen className="mx-auto size-12 text-accent" />
                <h3 className="mt-3 text-lg font-black text-content">Chưa có từ vựng để ôn tập</h3>
                <p className="mt-1 text-sm text-content-muted">
                  Hãy thêm từ mới vào sổ tay hoặc chuyển sang chế độ "Xem từ" để quản lý từ vựng.
                </p>
                <button
                  type="button"
                  onClick={() => setAddWordOpen(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs font-extrabold text-accent-contrast shadow-md"
                >
                  <Plus className="size-4" /> Thêm từ mới
                </button>
              </div>
            </div>
          ) : (
            <>
              {activeMode === 'list' && (
                <WordListView
                  words={words}
                  loading={loading}
                  onToggleRemembered={toggleRemembered}
                  onAddWord={() => setAddWordOpen(true)}
                  onDeleteWord={handleDeleteWord}
                />
              )}

              {activeMode === 'guess' && (
                <GuessWordView
                  words={words}
                  onWordMastered={handleWordMastered}
                  onWordNeedReview={handleWordNeedReview}
                />
              )}

              {activeMode === 'flashcard' && (
                <FlashcardStudyView words={words} onToggleRemembered={toggleRemembered} />
              )}

              {activeMode === 'practice' && (
                <PracticeHubView
                  words={words}
                  onWordMastered={handleWordMastered}
                  onWordNeedReview={handleWordNeedReview}
                />
              )}

              {activeMode === 'game' && <WordGameView words={words} topicName={topic?.name} />}
            </>
          )}
        </div>
      )}

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <VocabularySettingsModal onClose={() => setShowSettings(false)} />
        )}

        {addWordOpen && user && (
          <AddWordModal
            userId={user.id}
            defaultTopicId={topicId === 'my-words' ? 'ai' : topicId}
            onClose={() => setAddWordOpen(false)}
            onWordAdded={() => void loadWords(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
