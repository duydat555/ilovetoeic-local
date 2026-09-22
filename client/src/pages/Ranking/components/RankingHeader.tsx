import React from 'react';
import { Trophy, RefreshCw } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

interface RankingHeaderProps {
  updatedAt?: string;
  loading: boolean;
  onRefresh: () => void;
}

const formatUpdatedAt = (value?: string, lang: 'vi' | 'en' = 'vi') => {
  if (!value) return '19:23 13-08';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '19:23 13-08';
  const locale = lang === 'en' ? 'en-US' : 'vi-VN';
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
  const dayMonth = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit' }).format(date).replace('/', '-');
  return `${time} ${dayMonth}`;
};

export const RankingHeader: React.FC<RankingHeaderProps> = ({ updatedAt, loading, onRefresh }) => {
  const { language } = useLanguage();

  return (
    <header className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
      <div>
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-content-muted">
          <Trophy className="size-3.5 text-accent" />
          <span>{language === 'en' ? 'TOEICMaster Competitive Arena' : 'Đấu Trường Thi Đua TOEICMaster'}</span>
        </div>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-content sm:text-3xl">
          {language === 'en' ? 'Learner Leaderboard' : 'Bảng Xếp Hạng Học Viên'}
        </h1>
        <p className="mt-1 text-xs font-semibold text-content-muted sm:text-sm max-w-2xl leading-relaxed">
          {language === 'en'
            ? 'Honoring learners with outstanding study streaks, high accuracy, and top accumulated XP.'
            : 'Vinh danh học viên nỗ lực luyện đề, duy trì chuỗi học và tích luỹ điểm XP cao nhất.'}
        </p>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-2 text-xs font-bold text-content-muted shadow-xs transition-all hover:bg-surface-hover hover:text-content active:scale-95 disabled:cursor-wait disabled:opacity-60 self-start sm:self-auto"
      >
        <RefreshCw className={`size-3.5 text-accent ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
        <span>
          {loading
            ? (language === 'en' ? 'Updating...' : 'Đang cập nhật')
            : (language === 'en' ? `Updated ${formatUpdatedAt(updatedAt, 'en')}` : `Cập nhật ${formatUpdatedAt(updatedAt, 'vi')}`)}
        </span>
      </button>
    </header>
  );
};
