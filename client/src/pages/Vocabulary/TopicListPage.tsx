import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Briefcase,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
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
import { vocabularyService } from '../../services/vocabulary';
import { vocabularyTopicService, VocabularyTopic } from '../../services/vocabularyTopics';
import { systemVocabularyService, SystemVocabularySet } from '../../services/systemVocabulary';
import type { VocabularyWord } from '../../types';

const TopicIcon = ({ name }: { name: string }) => {
  if (name === 'chart') return <TrendingUp className="size-5" aria-hidden="true" />;
  if (name === 'sparkles') return <Sparkles className="size-5" aria-hidden="true" />;
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
              aria-label="Đóng"
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
              Huỷ
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-extrabold text-white shadow-md shadow-red-600/20 hover:bg-red-700 active:scale-98"
            >
              Xác nhận
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

const CATEGORY_TABS: CategoryTab[] = [
  { id: 'all', label: 'Tất cả các bộ', icon: Layers },
  { id: 'toeic', label: 'TOEIC Trọng Tâm', icon: Award },
  { id: 'general', label: 'Thông Dụng & Giao Tiếp', icon: Globe },
  { id: 'oxford', label: 'Oxford Standards', icon: BookOpen },
  { id: 'ielts', label: 'IELTS & Học Thuật', icon: GraduationCap },
];

export const TopicListPage: React.FC = () => {
  const { user } = useAuth();
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
      <article className="group relative flex flex-col justify-between rounded-3xl border border-line bg-surface p-5 shadow-sm transition hover:-translate-y-1 hover:border-accent/50 hover:shadow-lg dark:shadow-none">
        <Link
          to={`/vocabulary/${topic.id}`}
          className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <div className="flex items-start justify-between gap-4">
            <span className="grid size-12 place-items-center rounded-2xl bg-accent/15 text-accent-strong transition-transform group-hover:scale-105">
              <TopicIcon name={topic.icon} />
            </span>

            <div
              className="grid size-12 shrink-0 place-items-center rounded-full"
              style={{
                background: `conic-gradient(rgb(16 185 129) ${percent}%, rgb(226 232 240) 0)`,
              }}
            >
              <span className="grid size-10 place-items-center rounded-full bg-surface text-xs font-black text-content">
                {percent}%
              </span>
            </div>
          </div>

          <h3 className="mt-4 truncate pr-8 text-lg font-black text-content group-hover:text-accent-strong transition-colors">
            {topic.name}
          </h3>

          <p className="mt-1 line-clamp-2 min-h-10 text-xs font-medium leading-relaxed text-content-muted">
            {topic.description || 'Chủ đề từ vựng cá nhân.'}
          </p>

          <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3 text-xs font-extrabold text-content-muted">
            <span>{stats.total} từ vựng</span>
            <span className="text-emerald-600 dark:text-emerald-400">
              {stats.remembered}/{stats.total} đã thuộc
            </span>
          </div>
        </Link>

        <div className="mt-4 pt-1">
          <Link
            to={`/vocabulary/${topic.id}`}
            className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-4 text-xs font-extrabold text-accent-strong transition hover:bg-accent hover:text-accent-contrast active:scale-98"
          >
            <Play className="size-3.5 fill-current" />
            <span>Học chủ đề này</span>
          </Link>
        </div>

        <div className="absolute right-3 top-[76px]">
          <button
            type="button"
            onClick={() => setMenuId(menuId === topic.id ? '' : topic.id)}
            className="grid size-8 place-items-center rounded-lg text-content-muted hover:bg-surface-hover hover:text-content"
            aria-label={`Quản lý ${topic.name}`}
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
                Sửa chủ đề
              </button>
              <button
                type="button"
                onClick={() => {
                  setMerging(topic);
                  setMenuId('');
                }}
                className="w-full rounded-xl px-3 py-2 text-left text-xs font-bold text-content hover:bg-surface-hover"
              >
                Gộp chủ đề
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleting(topic);
                  setMenuId('');
                }}
                className="w-full rounded-xl px-3 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                Xoá chủ đề
              </button>
            </div>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Sổ tay từ vựng của tôi - Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-accent/30 bg-gradient-to-br from-accent/10 via-surface to-surface p-6 shadow-sm transition-all sm:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/15 px-3 py-1 text-xs font-black text-accent-strong">
              <BookMarked className="size-3.5" />
              <span>Sổ tay từ vựng cá nhân</span>
            </div>
            <h2 className="text-xl font-black text-content sm:text-2xl">
              Sổ tay từ vựng của tôi ({mySavedCount} từ đã lưu)
            </h2>
            <p className="max-w-2xl text-xs sm:text-sm font-medium leading-relaxed text-content-muted">
              Toàn bộ từ vựng bạn đã bôi đen tra cứu bằng AI khi đọc bài thi, luyện tập hoặc tự bổ sung. Ôn tập lại ngay với 5 chế độ học tương tác thông minh để nhớ lâu và phản xạ nhanh!
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-extrabold text-content">
                <span className="text-content-muted">Tổng:</span>
                <span>{mySavedCount} từ</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3.5" />
                <span>{myRememberedCount} đã thuộc ({myPercent}%)</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-extrabold text-amber-600 dark:text-amber-400">
                <span>{myNeedReviewCount} cần ôn luyện</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            <Link
              to="/vocabulary/my-words"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-accent px-6 text-sm font-extrabold text-accent-contrast shadow-lg shadow-accent/20 transition hover:bg-accent/90 active:scale-98"
            >
              <Play className="size-4 fill-current" />
              <span>Học sổ tay của tôi</span>
            </Link>
            <button
              type="button"
              onClick={() => setAddWordModalOpen(true)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-5 text-sm font-extrabold text-content transition hover:border-accent/40 hover:bg-surface-hover active:scale-98"
            >
              <Plus className="size-4" />
              <span>Thêm từ mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* Category Tabs & Search */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {CATEGORY_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategory(tab.id)}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-2xl px-4 text-xs font-black transition active:scale-98 ${
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
          <div className="relative w-full lg:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-content-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-h-10 w-full rounded-2xl border border-line bg-surface pl-10 pr-4 text-xs font-medium text-content outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
              placeholder="Tìm theo tên bộ từ vựng..."
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Cloned System Vocabulary Sets */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-content sm:text-xl">
              Các Bộ Từ Vựng Hệ Thống ({filteredSets.length} bộ)
            </h2>
            <p className="text-xs text-content-muted">
              Nhấp vào bất kỳ bộ từ vựng nào để chọn Unit và luyện tập với 5 chế độ trực quan
            </p>
          </div>
        </div>

        {filteredSets.length === 0 ? (
          <div className="rounded-3xl border border-line bg-surface py-12 text-center">
            <p className="text-sm font-bold text-content-muted">Không tìm thấy bộ từ vựng nào phù hợp với bộ lọc.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSets.map((set) => (
              <Link
                key={set.id}
                to={`/vocabulary/set/${set.id}`}
                className="group flex flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-sm transition hover:-translate-y-1 hover:border-accent/60 hover:shadow-xl dark:shadow-none"
              >
                {/* Set Cover Image Banner */}
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-elevated border-b border-line">
                  {set.cover_url ? (
                    <img
                      src={set.cover_url}
                      alt={set.name}
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="grid size-full place-items-center bg-accent/10 text-accent-strong">
                      <BookOpen className="size-12" />
                    </div>
                  )}
                  {/* Category Pill on Image */}
                  <div className="absolute left-3 top-3">
                    <span className="rounded-full bg-slate-950/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-md">
                      {set.category}
                    </span>
                  </div>
                  {/* Total Units Badge */}
                  <div className="absolute right-3 top-3">
                    <span className="rounded-full bg-accent/90 px-2.5 py-1 text-[10px] font-black text-accent-contrast backdrop-blur-md shadow-sm">
                      {set.total_tests} bài học
                    </span>
                  </div>
                </div>

                {/* Set Details */}
                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <h3 className="text-lg font-black text-content group-hover:text-accent-strong transition-colors">
                      {set.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 min-h-10 text-xs font-medium leading-relaxed text-content-muted">
                      {set.description ||
                        `Toàn bộ từ vựng chọn lọc thuộc bộ ${set.name} chia theo các bài học chuyên sâu.`}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-line/60">
                    <div className="flex items-center justify-between text-xs font-extrabold">
                      <span className="text-content-muted">{set.total_tests} bài học</span>
                      <span className="text-emerald-600 dark:text-emerald-400">{set.total_words} từ vựng</span>
                    </div>

                    <div className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-accent/10 px-4 text-xs font-extrabold text-accent-strong transition group-hover:bg-accent group-hover:text-accent-contrast">
                      <span>Khám phá các bài học</span>
                      <ChevronRight className="size-3.5" />
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
            <h2 className="text-lg font-black text-content sm:text-xl">Bộ từ vựng cá nhân của bạn</h2>
            <p className="text-xs text-content-muted">Các nhóm từ bạn tự tạo để phân loại và ôn tập theo nhu cầu riêng</p>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-xs font-extrabold text-content transition hover:border-accent/40 hover:bg-surface-hover"
          >
            <Plus className="size-3.5" />
            <span>Tạo bộ mới</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card: Sổ tay từ vựng của tôi */}
          <article className="group relative flex flex-col justify-between rounded-3xl border-2 border-accent/40 bg-surface p-5 shadow-sm transition hover:-translate-y-1 hover:border-accent hover:shadow-lg dark:shadow-none">
            <Link
              to="/vocabulary/my-words"
              className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="grid size-12 place-items-center rounded-2xl bg-accent text-accent-contrast shadow-md shadow-accent/20 transition-transform group-hover:scale-105">
                  <BookMarked className="size-6" />
                </span>

                <div
                  className="grid size-12 shrink-0 place-items-center rounded-full"
                  style={{
                    background: `conic-gradient(rgb(16 185 129) ${myPercent}%, rgb(226 232 240) 0)`,
                  }}
                >
                  <span className="grid size-10 place-items-center rounded-full bg-surface text-xs font-black text-content">
                    {myPercent}%
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <h3 className="truncate text-lg font-black text-content group-hover:text-accent-strong transition-colors">
                  Sổ tay từ vựng của tôi
                </h3>
                <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-black text-accent-strong">
                  Chính
                </span>
              </div>

              <p className="mt-1 line-clamp-2 min-h-10 text-xs font-medium leading-relaxed text-content-muted">
                Kho từ vựng cá nhân bạn đã tra cứu AI, lưu từ đề thi và bài đọc TOEIC.
              </p>

              <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3 text-xs font-extrabold text-content-muted">
                <span>{mySavedCount} từ vựng</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  {myRememberedCount}/{mySavedCount} đã thuộc
                </span>
              </div>
            </Link>

            <div className="mt-4 pt-1">
              <Link
                to="/vocabulary/my-words"
                className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-xs font-extrabold text-accent-contrast transition hover:bg-accent/90 active:scale-98 shadow-sm"
              >
                <Play className="size-3.5 fill-current" />
                <span>Học sổ tay ({mySavedCount} từ)</span>
              </Link>
            </div>
          </article>

          {/* Card: Tạo bộ từ mới */}
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="group flex min-h-52 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-accent/50 bg-accent/5 p-5 text-center text-accent-strong transition hover:border-accent hover:bg-accent/10 active:scale-[.99]"
          >
            <span className="grid size-13 place-items-center rounded-2xl bg-accent text-accent-contrast shadow-md shadow-accent/20 transition-transform group-hover:scale-110">
              <Plus className="size-6 stroke-[2.5]" />
            </span>
            <span className="mt-3 block text-base font-extrabold">Tạo bộ từ vựng mới</span>
            <span className="mt-1 block text-xs text-content-muted">Gom các từ cần ôn theo sở thích</span>
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
            title="Xoá chủ đề?"
            description={`Chủ đề “${deleting.name}” sẽ bị xoá. Các từ bên trong vẫn được giữ trong Sổ tay từ vựng của bạn.`}
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
            title="Gộp chủ đề"
            description={`Chọn chủ đề nhận toàn bộ từ của “${merging.name}”. Chủ đề hiện tại sẽ bị xoá sau khi gộp.`}
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
              <option value="">Chọn chủ đề đích</option>
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
              setAddWordModalOpen(false);
              void load();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
