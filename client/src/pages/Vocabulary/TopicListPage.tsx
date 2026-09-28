import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Briefcase,
  Compass,
  MoreHorizontal,
  Plus,
  Search,
  TrendingUp,
  X,
  Play,
  CheckCircle2,
  BookOpen,
  BookMarked,
  Layers,
  GraduationCap,
  Globe,
  Award,
  ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { BoneyardSkeleton } from '../../components/common/BoneyardSkeleton';
import { VocabularyPageSkeleton } from './components/VocabularyPageSkeleton';
import { CreateTopicModal } from '../../components/vocabulary/CreateTopicModal';
import { AddWordModal } from './components/AddWordModal';
import { getModalMotion } from '../../components/common/modalMotion';
import { ModalPortal } from '../../components/common/ModalPortal';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { vocabularyService } from '../../services/vocabulary';
import { vocabularyTopicService, VocabularyTopic } from '../../services/vocabularyTopics';
import { systemVocabularyService, SystemVocabularySet } from '../../services/systemVocabulary';
import type { VocabularyWord } from '../../types';

const TopicIcon = ({ name }: { name: string }) => {
  if (name === 'chart') return <TrendingUp className="size-5" aria-hidden="true" />;
  if (name === 'sparkles' || name === 'compass') return <Compass className="size-5" aria-hidden="true" />;
  if (name === 'bookmark') return <BookMarked className="size-5" aria-hidden="true" />;
  return <Briefcase className="size-5" aria-hidden="true" />;
};

const ConfirmModal = ({
  title,
  description,
  children,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
  onClose: () => void;
  onConfirm: () => void;
}) => {
  const { language } = useLanguage();
  const reduceMotion = useReducedMotion();
  const contract = getModalMotion(reduceMotion);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <ModalPortal>
      <motion.div
        {...contract.backdrop}
        className="fixed inset-0 z-[100] grid h-[100dvh] w-screen place-items-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
        onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      >
        <motion.div
          {...contract.panel}
          role="dialog"
          aria-modal="true"
          className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-2xl dark:shadow-none"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-content">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-content-muted">{description}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid size-9 shrink-0 place-items-center rounded-xl text-content-muted hover:bg-surface-hover hover:text-content"
              aria-label={language === 'en' ? 'Close' : 'Đóng'}
            >
              <X className="size-4" />
            </button>
          </div>
          {children}
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-surface-elevated px-4 text-sm font-bold text-content hover:bg-surface-hover"
            >
              {language === 'en' ? 'Cancel' : 'Huỷ'}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-extrabold text-white shadow-md shadow-red-600/20 hover:bg-red-700 active:scale-98"
            >
              {language === 'en' ? 'Confirm' : 'Xác nhận'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </ModalPortal>
  );
};

interface CategoryTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const TopicListPage: React.FC = () => {
  const { user } = useAuth();
  const { language, t } = useLanguage();

  const categoryTabs: CategoryTab[] = useMemo(() => [
    { id: 'all', label: t('vocabulary.catAll'), icon: Layers },
    { id: 'toeic', label: t('vocabulary.catToeic'), icon: Award },
    { id: 'general', label: t('vocabulary.catGeneral'), icon: Globe },
    { id: 'oxford', label: t('vocabulary.catOxford'), icon: BookOpen },
    { id: 'ielts', label: t('vocabulary.catIelts'), icon: GraduationCap },
  ], [language, t]);

  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [personalTopics, setPersonalTopics] = useState<VocabularyTopic[]>([]);
  const [systemSets, setSystemSets] = useState<SystemVocabularySet[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<VocabularyTopic | null>(null);
  const [menuId, setMenuId] = useState('');
  const [deleting, setDeleting] = useState<VocabularyTopic | null>(null);
  const [merging, setMerging] = useState<VocabularyTopic | null>(null);
  const [mergeTarget, setMergeTarget] = useState('');
  const [addWordModalOpen, setAddWordModalOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [loadedWords, setsData] = await Promise.all([
        vocabularyService.getAll(user.id),
        systemVocabularyService.getSets(),
      ]);
      setWords(loadedWords);
      setSystemSets(setsData);
      const allTopics = vocabularyTopicService.getTopics(user.id);
      setPersonalTopics(allTopics.filter((t) => !t.system));
    } catch (err) {
      console.error('Failed to load vocabulary sets:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user) return null;

  if (loading) {
    return <VocabularyPageSkeleton />;
  }

  const normalized = query.trim().toLocaleLowerCase('vi');

  // Filter system sets
  const filteredSets = systemSets.filter((set) => {
    const matchCategory =
      activeCategory === 'all' ||
      set.category === activeCategory ||
      (activeCategory === 'ielts' && (set.category === 'ielts' || set.category === 'other'));

    const matchQuery =
      !normalized ||
      set.name.toLocaleLowerCase('vi').includes(normalized) ||
      (set.description && set.description.toLocaleLowerCase('vi').includes(normalized));

    return matchCategory && matchQuery;
  });

  // Filter personal topics
  const visiblePersonalTopics = personalTopics.filter(
    (topic) =>
      !normalized ||
      `${topic.name} ${topic.description}`.toLocaleLowerCase('vi').includes(normalized)
  );

  const mySavedCount = words.length;
  const myRememberedCount = words.filter((w) => w.remembered).length;
  const myNeedReviewCount = mySavedCount - myRememberedCount;
  const myPercent = mySavedCount ? Math.round((myRememberedCount / mySavedCount) * 100) : 0;

  const topicStats = (topic: VocabularyTopic) => {
    const topicWords = vocabularyTopicService.wordsForTopic(user.id, topic.id, words);
    return {
      total: topicWords.length,
      remembered: topicWords.filter((word) => word.remembered).length,
    };
  };

  const PersonalTopicCard = ({ topic }: { topic: VocabularyTopic }) => {
    const stats = topicStats(topic);
    const percent = stats.total ? Math.round((stats.remembered / stats.total) * 100) : 0;

    return (
      <article className="group relative flex flex-col justify-between rounded-3xl border border-line/80 bg-surface p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-lg dark:shadow-none">
        <div>
          {/* Card Header: Icon + Menu */}
          <div className="flex items-start justify-between gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-accent/10 text-accent-strong transition-transform group-hover:scale-105">
              <TopicIcon name={topic.icon} />
            </span>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuId(menuId === topic.id ? '' : topic.id)}
                className="grid size-8 place-items-center rounded-xl text-content-muted hover:bg-surface-hover hover:text-content transition-colors"
                aria-label={language === 'en' ? `Manage ${topic.name}` : `Quản lý ${topic.name}`}
              >
                <MoreHorizontal className="size-4" />
              </button>
              {menuId === topic.id && (
                <div className="absolute right-0 top-9 z-20 w-36 rounded-2xl border border-line bg-surface p-1.5 shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(topic);
                      setModalOpen(true);
                      setMenuId('');
                    }}
                    className="w-full rounded-xl px-3 py-2 text-left text-xs font-bold text-content hover:bg-surface-hover"
                  >
                    {language === 'en' ? 'Edit topic' : 'Sửa chủ đề'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMerging(topic);
                      setMenuId('');
                    }}
                    className="w-full rounded-xl px-3 py-2 text-left text-xs font-bold text-content hover:bg-surface-hover"
                  >
                    {language === 'en' ? 'Merge topic' : 'Gộp chủ đề'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleting(topic);
                      setMenuId('');
                    }}
                    className="w-full rounded-xl px-3 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    {language === 'en' ? 'Delete topic' : 'Xoá chủ đề'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <Link
            to={`/vocabulary/${topic.id}`}
            className="mt-3.5 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
          >
            <h3 className="truncate text-base font-extrabold text-content group-hover:text-accent-strong transition-colors">
              {topic.name}
            </h3>
            <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-xs font-normal leading-relaxed text-content-muted">
              {topic.description || (language === 'en' ? 'Custom vocabulary topic.' : 'Chủ đề từ vựng cá nhân.')}
            </p>
          </Link>
        </div>

        {/* Progress & Meta */}
        <div className="mt-5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-content-muted">
              {stats.total} {language === 'en' ? 'words' : 'từ vựng'}
            </span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {stats.remembered}/{stats.total} {language === 'en' ? 'mastered' : 'đã thuộc'} ({percent}%)
            </span>
          </div>

          {/* Clean minimal progress bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-line/60">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>

          <div className="pt-1.5">
            <Link
              to={`/vocabulary/${topic.id}`}
              className="flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-accent/20 bg-accent/5 px-3 text-xs font-bold text-accent-strong transition hover:bg-accent hover:text-accent-contrast active:scale-98"
            >
              <Play className="size-3 fill-current" />
              <span>{language === 'en' ? 'Practice now' : 'Luyện tập ngay'}</span>
            </Link>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Sổ tay từ vựng của tôi - Hero Banner */}
      <div id="tour-vocab-hero" className="relative overflow-hidden rounded-3xl border border-accent/25 bg-gradient-to-br from-accent/10 via-surface to-surface p-6 shadow-xs transition-all sm:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/15 px-3 py-1 text-xs font-black text-accent-strong">
              <BookMarked className="size-3.5" />
              <span>{language === 'en' ? 'Personal Vocabulary Notebook' : 'Sổ tay từ vựng cá nhân'}</span>
            </div>
            <h2 className="text-xl font-black text-content sm:text-2xl">
              {language === 'en'
                ? `My Vocabulary Notebook (${mySavedCount} words saved)`
                : `Sổ tay từ vựng của tôi (${mySavedCount} từ đã lưu)`}
            </h2>
            <p className="max-w-2xl text-xs sm:text-sm font-normal leading-relaxed text-content-muted">
              {language === 'en'
                ? 'All words you looked up with AI while taking tests, reading TOEIC passages, or added yourself. Review now with 5 interactive study modes to memorize faster!'
                : 'Toàn bộ từ vựng bạn đã bôi đen tra cứu bằng AI khi đọc bài thi, luyện tập hoặc tự bổ sung. Ôn tập lại ngay với 5 chế độ học tương tác thông minh để nhớ lâu và phản xạ nhanh!'}
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <div className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-content">
                <span className="text-content-muted">{language === 'en' ? 'Total:' : 'Tổng:'}</span>
                <strong className="font-bold">{mySavedCount} {language === 'en' ? 'words' : 'từ'}</strong>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3.5" />
                <span>{myRememberedCount} {language === 'en' ? 'mastered' : 'đã thuộc'} ({myPercent}%)</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                <span>{myNeedReviewCount} {language === 'en' ? 'need review' : 'cần ôn luyện'}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            <Link
              to="/vocabulary/my-words"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-accent px-6 text-sm font-bold text-accent-contrast shadow-md shadow-accent/20 transition hover:bg-accent/90 active:scale-98"
            >
              <Play className="size-4 fill-current" />
              <span>{language === 'en' ? 'Study my notebook' : 'Học sổ tay của tôi'}</span>
            </Link>
            <button
              type="button"
              onClick={() => setAddWordModalOpen(true)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-5 text-sm font-bold text-content transition hover:border-accent/40 hover:bg-surface-hover active:scale-98"
            >
              <Plus className="size-4" />
              <span>{language === 'en' ? 'Add new word' : 'Thêm từ mới'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Category Tabs & Search */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Category Tabs */}
          <div id="tour-vocab-categories" className="flex flex-wrap items-center gap-2">
            {categoryTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategory(tab.id)}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-2xl px-4 text-xs font-bold transition active:scale-98 ${
                    isActive
                      ? 'bg-accent text-accent-contrast shadow-md shadow-accent/20'
                      : 'border border-line bg-surface text-content-muted hover:bg-surface-hover hover:text-content'
                  }`}
                >
                  <Icon className="size-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div id="tour-vocab-search" className="relative w-full lg:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-content-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-h-10 w-full rounded-2xl border border-line bg-surface pl-10 pr-4 text-xs font-medium text-content outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
              placeholder={language === 'en' ? 'Search vocabulary sets...' : 'Tìm theo tên bộ từ vựng...'}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: System Vocabulary Sets */}
      <section id="tour-vocab-grid" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-content sm:text-xl">
              {language === 'en'
                ? `System Vocabulary Sets (${filteredSets.length} sets)`
                : `Các Bộ Từ Vựng Hệ Thống (${filteredSets.length} bộ)`}
            </h2>
            <p className="text-xs text-content-muted">
              {language === 'en'
                ? 'Click on any vocabulary set to select units and practice with 5 interactive modes'
                : 'Nhấp vào bất kỳ bộ từ vựng nào để chọn Unit và luyện tập với 5 chế độ trực quan'}
            </p>
          </div>
        </div>

        {filteredSets.length === 0 ? (
          <div className="rounded-3xl border border-line bg-surface py-12 text-center">
            <p className="text-sm font-bold text-content-muted">
              {language === 'en' ? 'No vocabulary sets match the filter.' : 'Không tìm thấy bộ từ vựng nào phù hợp với bộ lọc.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSets.map((set) => (
              <Link
                key={set.id}
                to={`/vocabulary/set/${set.id}`}
                className="group flex flex-col overflow-hidden rounded-3xl border border-line/80 bg-surface shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-lg dark:hover:border-accent/40"
              >
                {/* Set Cover Image Banner */}
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-elevated">
                  {set.cover_url ? (
                    <img
                      src={set.cover_url}
                      alt={set.name}
                      className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="grid size-full place-items-center bg-accent/10 text-accent-strong">
                      <BookOpen className="size-10 stroke-[1.5]" />
                    </div>
                  )}

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />

                  {/* Category Pill on Image */}
                  <div className="absolute left-3.5 top-3.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/75 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-md shadow-xs">
                      <span className="size-1.5 rounded-full bg-accent" />
                      {set.category}
                    </span>
                  </div>
                </div>

                {/* Set Details */}
                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-content group-hover:text-accent-strong transition-colors duration-200 line-clamp-1">
                      {set.name}
                    </h3>
                    <p className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-xs font-normal leading-relaxed text-content-muted">
                      {set.description ||
                        (language === 'en'
                          ? `Curated vocabulary from ${set.name} structured into in-depth units.`
                          : `Toàn bộ từ vựng chọn lọc thuộc bộ ${set.name} chia theo các bài học chuyên sâu.`)}
                    </p>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-line/60 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-medium text-content-muted">
                      <span className="inline-flex items-center gap-1">
                        <BookOpen className="size-3.5 text-accent" />
                        <strong className="font-bold text-content">{set.total_tests}</strong> {language === 'en' ? 'units' : 'bài'}
                      </span>
                      <span className="text-line">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Layers className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                        <strong className="font-bold text-content">{set.total_words}</strong> {language === 'en' ? 'words' : 'từ'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-bold text-accent-strong group-hover:translate-x-0.5 transition-transform">
                      <span>{language === 'en' ? 'Study Now' : 'Học ngay'}</span>
                      <ChevronRight className="size-4" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Personal Topics Section */}
      <section className="pt-6 border-t border-line">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-content sm:text-xl">
              {language === 'en' ? 'Your Personal Vocabulary Sets' : 'Bộ từ vựng cá nhân của bạn'}
            </h2>
            <p className="text-xs text-content-muted">
              {language === 'en'
                ? 'Custom vocabulary groups you created for personalized review'
                : 'Các nhóm từ bạn tự tạo để phân loại và ôn tập theo nhu cầu riêng'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-xs font-bold text-content transition hover:border-accent/40 hover:bg-surface-hover"
          >
            <Plus className="size-3.5" />
            <span>{language === 'en' ? 'Create Set' : 'Tạo bộ mới'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card: Sổ tay từ vựng của tôi */}
          <article className="group relative flex flex-col justify-between rounded-3xl border border-accent/40 bg-gradient-to-br from-accent/5 via-surface to-surface p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-accent hover:shadow-lg dark:shadow-none">
            <div>
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-accent text-accent-contrast shadow-sm transition-transform group-hover:scale-105">
                  <BookMarked className="size-5" />
                </span>
                <span className="rounded-full border border-accent/30 bg-accent/15 px-2.5 py-0.5 text-[10px] font-extrabold text-accent-strong">
                  {language === 'en' ? 'Default' : 'Mặc định'}
                </span>
              </div>

              <Link
                to="/vocabulary/my-words"
                className="mt-3.5 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
              >
                <h3 className="truncate text-base font-extrabold text-content group-hover:text-accent-strong transition-colors">
                  {language === 'en' ? 'My Vocabulary Notebook' : 'Sổ tay từ vựng của tôi'}
                </h3>
                <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-xs font-normal leading-relaxed text-content-muted">
                  {language === 'en'
                    ? 'Your personal repository of words looked up via AI and saved from TOEIC tests.'
                    : 'Kho từ vựng cá nhân bạn đã tra cứu AI, lưu từ đề thi và bài đọc TOEIC.'}
                </p>
              </Link>
            </div>

            <div className="mt-5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-content-muted">
                  {mySavedCount} {language === 'en' ? 'words' : 'từ vựng'}
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {myRememberedCount}/{mySavedCount} {language === 'en' ? 'mastered' : 'đã thuộc'} ({myPercent}%)
                </span>
              </div>

              <div className="h-1.5 w-full overflow-hidden rounded-full bg-line/60">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${myPercent}%` }}
                />
              </div>

              <div className="pt-1.5">
                <Link
                  to="/vocabulary/my-words"
                  className="flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-accent px-3 text-xs font-bold text-accent-contrast transition hover:bg-accent/90 active:scale-98 shadow-xs"
                >
                  <Play className="size-3 fill-current" />
                  <span>
                    {language === 'en' ? `Study Notebook (${mySavedCount} words)` : `Học sổ tay (${mySavedCount} từ)`}
                  </span>
                </Link>
              </div>
            </div>
          </article>

          {/* Card: Tạo bộ từ mới */}
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="group flex min-h-[220px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-line hover:border-accent/60 bg-surface/50 hover:bg-accent/5 p-5 text-center transition-all duration-200 active:scale-[.99]"
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-accent/10 text-accent-strong transition-transform group-hover:scale-110">
              <Plus className="size-5 stroke-[2.5]" />
            </span>
            <span className="mt-3 block text-sm font-extrabold text-content group-hover:text-accent-strong transition-colors">
              {language === 'en' ? 'Create New Set' : 'Tạo bộ từ vựng mới'}
            </span>
            <span className="mt-1 block text-xs text-content-muted">
              {language === 'en' ? 'Organize words you want to review' : 'Gom các từ cần ôn theo sở thích'}
            </span>
          </button>

          {visiblePersonalTopics.map((topic) => (
            <PersonalTopicCard key={topic.id} topic={topic} />
          ))}
        </div>
      </section>

      {/* Modals */}
      <AnimatePresence>
        {modalOpen && (
          <CreateTopicModal
            userId={user.id}
            words={words}
            topic={editing}
            onClose={() => setModalOpen(false)}
            onSaved={() => {
              setModalOpen(false);
              setPersonalTopics(vocabularyTopicService.getTopics(user.id).filter((t) => !t.system));
              void load();
            }}
          />
        )}

        {deleting && (
          <ConfirmModal
            title={language === 'en' ? 'Delete topic?' : 'Xoá chủ đề?'}
            description={
              language === 'en'
                ? `Topic "${deleting.name}" will be deleted. Words inside will still be kept in your Vocabulary Notebook.`
                : `Chủ đề “${deleting.name}” sẽ bị xoá. Các từ bên trong vẫn được giữ trong Sổ tay từ vựng của bạn.`
            }
            onClose={() => setDeleting(null)}
            onConfirm={() => {
              vocabularyTopicService.remove(user.id, deleting.id);
              setDeleting(null);
              setPersonalTopics(vocabularyTopicService.getTopics(user.id).filter((t) => !t.system));
            }}
          />
        )}

        {merging && (
          <ConfirmModal
            title={language === 'en' ? 'Merge topics' : 'Gộp chủ đề'}
            description={
              language === 'en'
                ? `Select target topic to receive all words from "${merging.name}". The current topic will be deleted after merging.`
                : `Chọn chủ đề nhận toàn bộ từ của “${merging.name}”. Chủ đề hiện tại sẽ bị xoá sau khi gộp.`
            }
            onClose={() => setMerging(null)}
            onConfirm={() => {
              if (!mergeTarget) return;
              vocabularyTopicService.merge(user.id, merging.id, mergeTarget);
              setMerging(null);
              setMergeTarget('');
              setPersonalTopics(vocabularyTopicService.getTopics(user.id).filter((t) => !t.system));
            }}
          >
            <select
              value={mergeTarget}
              onChange={(e) => setMergeTarget(e.target.value)}
              className="mt-4 min-h-11 w-full rounded-2xl border border-line bg-surface-elevated px-3 text-sm text-content outline-none focus:border-accent"
            >
              <option value="">{language === 'en' ? 'Select target topic' : 'Chọn chủ đề đích'}</option>
              {personalTopics
                .filter((topic) => topic.id !== merging.id)
                .map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
            </select>
          </ConfirmModal>
        )}

        {addWordModalOpen && (
          <AddWordModal
            userId={user.id}
            topics={vocabularyTopicService.getTopics(user.id)}
            onClose={() => setAddWordModalOpen(false)}
            onWordAdded={() => {
              void load();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
