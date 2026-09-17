import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemName?: string;
  className?: string;
  hideOnSinglePage?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [12, 24, 36],
  itemName = 'bài nghe',
  className = '',
  hideOnSinglePage = false,
}) => {
  if (totalItems <= 0) return null;
  if (hideOnSinglePage && totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  const pages = useMemo<(number | 'ellipsis')[]>(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, 'ellipsis', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, 'ellipsis', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages];
  }, [currentPage, totalPages]);

  return (
    <nav
      aria-label="Điều hướng phân trang"
      className={`flex flex-col gap-3.5 rounded-2xl border border-line bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between ${className}`.trim()}
    >
      {/* Thông tin số lượng hiển thị */}
      <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-content-muted">
        <div>
          Hiển thị{' '}
          <strong className="font-extrabold text-content tabular-nums">{startItem}</strong>
          {' – '}
          <strong className="font-extrabold text-content tabular-nums">{endItem}</strong>
          {' trong '}
          <strong className="font-extrabold text-content tabular-nums">{totalItems}</strong>
          {' '}{itemName}
        </div>

        {/* Lựa chọn số lượng hiển thị mỗi trang nếu có */}
        {onPageSizeChange && pageSizeOptions.length > 1 && (
          <div className="flex items-center gap-1.5 pl-0 sm:border-l sm:border-line sm:pl-3">
            <span className="text-[11px] text-content-muted">Mỗi trang:</span>
            <div className="inline-flex items-center gap-1">
              {pageSizeOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onPageSizeChange(opt)}
                  className={`rounded-lg px-2 py-0.5 text-xs font-bold transition active:scale-95 ${
                    pageSize === opt
                      ? 'border border-accent/30 bg-accent/15 text-accent-strong shadow-2xs'
                      : 'border border-line bg-surface-elevated/30 text-content-muted hover:bg-surface-hover hover:text-content'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Điều khiển chuyển trang */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-1 sm:justify-end">
          {/* Nút lùi trang */}
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            aria-label="Trang trước"
            title="Trang trước"
            className="grid size-8 place-items-center rounded-xl border border-line bg-surface text-content transition hover:border-accent hover:bg-surface-hover active:scale-95 disabled:pointer-events-none disabled:opacity-35"
          >
            <ChevronLeft className="size-4" />
          </button>

          {/* Danh sách nút số trang */}
          <div className="flex items-center gap-1">
            {pages.map((p, idx) => {
              if (p === 'ellipsis') {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="grid size-8 place-items-center text-xs font-bold text-content-muted select-none"
                  >
                    •••
                  </span>
                );
              }

              const isActive = p === currentPage;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  aria-label={`Trang ${p}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={`grid size-8 place-items-center rounded-xl text-xs font-extrabold transition active:scale-95 ${
                    isActive
                      ? 'bg-accent text-accent-contrast shadow-xs font-black'
                      : 'border border-line bg-surface-elevated/20 text-content-muted hover:border-accent/40 hover:bg-surface-hover hover:text-content'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {/* Nút tiến trang */}
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            aria-label="Trang sau"
            title="Trang sau"
            className="grid size-8 place-items-center rounded-xl border border-line bg-surface text-content transition hover:border-accent hover:bg-surface-hover active:scale-95 disabled:pointer-events-none disabled:opacity-35"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </nav>
  );
};

export default Pagination;
