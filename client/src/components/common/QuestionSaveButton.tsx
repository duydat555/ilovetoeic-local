import React, { useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';

interface QuestionSaveButtonProps {
  saved: boolean;
  onToggle: () => void;
  language?: 'vi' | 'en';
}

export const QuestionSaveButton: React.FC<QuestionSaveButtonProps> = ({ saved, onToggle, language = 'vi' }) => {
  const [failed, setFailed] = useState(false);
  const english = language === 'en';
  const label = saved ? (english ? 'Unsave question' : 'Bỏ lưu câu hỏi') : (english ? 'Save question' : 'Lưu câu hỏi');
  const Icon = saved ? BookmarkCheck : Bookmark;

  return (
    <div className="flex max-w-full shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        aria-label={label}
        aria-pressed={saved}
        title={label}
        onClick={() => {
          try {
            onToggle();
            setFailed(false);
          } catch {
            setFailed(true);
          }
        }}
        className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${saved
          ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300'
          : 'border-line bg-surface text-content-muted hover:bg-surface-hover hover:text-content'}`}
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <span>{saved ? (english ? 'Saved' : 'Đã lưu') : (english ? 'Save question' : 'Lưu câu hỏi')}</span>
      </button>
      {failed && <span role="alert" className="max-w-56 text-xs text-negative">{english ? 'Unable to save. Check browser storage and try again.' : 'Chưa lưu được. Kiểm tra bộ nhớ trình duyệt và thử lại.'}</span>}
    </div>
  );
};
