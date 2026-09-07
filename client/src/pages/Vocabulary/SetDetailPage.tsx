import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  Sparkles,
  Play,
  Search,
  BookMarked,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { BoneyardSkeleton } from '../../components/common/BoneyardSkeleton';
import { SetDetailPageSkeleton } from './components/SetDetailPageSkeleton';
import { systemVocabularyService, SystemVocabularySet, SystemVocabularyTopic } from '../../services/systemVocabulary';

export const SetDetailPage: React.FC = () => {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();

  const [setData, setSetData] = useState<SystemVocabularySet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!setId) return;
    let mounted = true;
    setLoading(true);
    setError('');

    systemVocabularyService
      .getSetDetail(setId)
      .then((data) => {
        if (mounted) {
          setSetData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Không thể tải bộ từ vựng.');
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [setId]);

  if (loading) {
    return <SetDetailPageSkeleton />;
  }

  if (error || !setData) {
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-red-500/10 text-red-500">
          <BookOpen className="size-8" />
        </div>
        <h2 className="mt-4 text-xl font-black text-content">Không tìm thấy bộ từ vựng</h2>
        <p className="mt-2 text-sm text-content-muted">{error || 'Bộ từ vựng không tồn tại hoặc đã bị ẩn.'}</p>
        <button
          type="button"
          onClick={() => navigate('/vocabulary')}
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-accent px-5 text-sm font-extrabold text-accent-contrast shadow-md shadow-accent/20 transition hover:bg-accent/90"
        >
          <ArrowLeft className="size-4" />
          <span>Về danh sách bộ từ vựng</span>
        </button>
      </div>
    );
  }

  const topics = setData.topics || [];
  const query = searchQuery.trim().toLowerCase();
  const visibleTopics = topics.filter((t) => !query || t.name.toLowerCase().includes(query));

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-20">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-bold text-content-muted">
        <Link to="/vocabulary" className="transition hover:text-content">
          Bộ từ vựng
        </Link>
        <ChevronRight className="size-3 text-content-muted/60" />
        <span className="truncate text-content font-extrabold">{setData.name}</span>
      </nav>

      {/* Set Hero Banner */}
      <BoneyardSkeleton name="set-detail-banner" loading={false}>
        <header className="relative overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              {/* Cover image */}
              <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl border border-line bg-surface-elevated sm:size-32">
                {setData.cover_url ? (
                  <img
                    src={setData.cover_url}
                    alt={setData.name}
                    className="size-full object-cover"
                    loading="eager"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="grid size-full place-items-center bg-accent/10 text-accent-strong">
                    <BookOpen className="size-10" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-accent-strong">
                    <Sparkles className="size-3" />
                    {setData.category}
                  </span>
                  <span className="rounded-full border border-line bg-surface-elevated px-3 py-1 text-xs font-extrabold text-content-muted">
                    Đơn vị: {setData.source?.toUpperCase() || 'ILOVETOEIC'}
                  </span>
                </div>

                <h1 className="text-2xl font-black tracking-tight text-content sm:text-3xl">
                  {setData.name}
                </h1>

                <p className="max-w-2xl text-xs sm:text-sm font-medium leading-relaxed text-content-muted">
                  {setData.description ||
                    `Toàn bộ từ vựng tuyển chọn thuộc bộ ${setData.name}, chia thành ${setData.total_tests} bài học theo lộ trình hiệu quả.`}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-extrabold text-content">
                  <div className="rounded-xl border border-line bg-surface-elevated px-3 py-1.5">
                    <span className="text-content-muted">Tổng số bài:</span>{' '}
                    <span className="text-accent-strong">{setData.total_tests} Units</span>
                  </div>
                  <div className="rounded-xl border border-line bg-surface-elevated px-3 py-1.5">
                    <span className="text-content-muted">Tổng số từ:</span>{' '}
                    <span className="text-emerald-600 dark:text-emerald-400">{setData.total_words} từ vựng</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <Link
                to="/vocabulary"
                className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-line bg-surface-elevated px-4 text-sm font-extrabold text-content transition hover:bg-surface-hover active:scale-98"
              >
                <ArrowLeft className="size-4" />
                <span>Quay lại</span>
              </Link>
            </div>
          </div>
        </header>
      </BoneyardSkeleton>

      {/* Filter and Units Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-content sm:text-xl">
            Danh sách bài học ({visibleTopics.length} Units)
          </h2>
          <p className="text-xs text-content-muted">Chọn Unit bất kỳ để bắt đầu học với 5 chế độ tương tác</p>
        </div>

        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-content-muted" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="min-h-10 w-full rounded-2xl border border-line bg-surface pl-10 pr-4 text-xs font-medium text-content outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
            placeholder="Tìm theo tên bài học..."
          />
        </div>
      </div>

      {/* Units Grid */}
      <BoneyardSkeleton name="set-detail-units-grid" loading={false}>
        {visibleTopics.length === 0 ? (
          <div className="rounded-3xl border border-line bg-surface py-12 text-center">
            <p className="text-sm font-bold text-content-muted">Không tìm thấy bài học nào phù hợp.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleTopics.map((topic, idx) => (
              <BoneyardSkeleton key={topic.id} name={`unit-card-${topic.id}`} loading={false}>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.3) }}
                >
                  <Link
                    to={`/vocabulary/${topic.id}`}
                    className="group relative flex flex-col justify-between rounded-3xl border border-line bg-surface p-5 shadow-sm transition hover:-translate-y-1 hover:border-accent/60 hover:shadow-lg dark:shadow-none"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex size-9 items-center justify-center rounded-xl bg-accent/10 text-xs font-black text-accent-strong">
                          #{topic.order_index + 1}
                        </span>
                        <span className="rounded-full border border-line bg-surface-elevated px-2.5 py-1 text-[11px] font-extrabold text-content-muted">
                          {topic.total_words || 0} từ
                        </span>
                      </div>

                      <h3 className="mt-3 truncate text-base font-black text-content group-hover:text-accent-strong transition-colors">
                        {topic.name}
                      </h3>
                      <p className="mt-1 text-xs font-medium text-content-muted">
                        Luyện tập 5 chế độ: Xem từ, Đoán từ, Flashcard, Trắc nghiệm & Nối từ
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-line/60">
                      <div className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-accent/10 px-3 text-xs font-extrabold text-accent-strong transition group-hover:bg-accent group-hover:text-accent-contrast">
                        <Play className="size-3.5 fill-current" />
                        <span>Luyện tập ngay</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              </BoneyardSkeleton>
            ))}
          </div>
        )}
      </BoneyardSkeleton>
    </div>
  );
};
