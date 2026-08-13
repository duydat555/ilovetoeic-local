import React from 'react';
import { GraduationCap, RefreshCw } from 'lucide-react';

interface RankingHeaderProps {
  updatedAt?: string;
  loading: boolean;
  onRefresh: () => void;
}

const formatUpdatedAt = (value?: string) => {
  if (!value) return '19:23 13-08';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '19:23 13-08';
  const time = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
  const dayMonth = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(date).replace('/', '-');
  return `${time} ${dayMonth}`;
};

export const RankingHeader: React.FC<RankingHeaderProps> = ({ updatedAt, loading, onRefresh }) => (
  <header className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
        <GraduationCap className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        ilovetoeic
      </span>
      <h1 className="mt-2 text-2xl font-black tracking-tight text-content sm:text-3xl">Bảng xếp hạng</h1>
      <p className="mt-1 text-xs font-semibold text-content-muted sm:text-sm">
        Theo dõi tiến độ và thi đua lành mạnh cùng các học viên trong lớp.
      </p>
    </div>
    <button
      type="button"
      onClick={onRefresh}
      disabled={loading}
      className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-1.5 text-xs font-bold text-content-muted shadow-sm transition-all hover:bg-surface-hover hover:text-content active:scale-95 disabled:cursor-wait disabled:opacity-60"
    >
      <RefreshCw className={`size-3.5 text-brand-700 dark:text-brand-300 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
      <span>{loading ? 'Đang cập nhật' : `Cập nhật ${formatUpdatedAt(updatedAt)}`}</span>
    </button>
  </header>
);

