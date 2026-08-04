import React from 'react';

export interface HomeworkSetupStepProps {
  title: string;
  description: string;
  deadline: string;
  allowLate: boolean;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onDeadlineChange: (value: string) => void;
  onAllowLateChange: (value: boolean) => void;
}

const fieldClassName =
  'min-h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-content outline-none transition-colors duration-200 placeholder:text-content-muted focus:border-accent focus:ring-4 focus:ring-accent/10';

export const HomeworkSetupStep: React.FC<HomeworkSetupStepProps> = ({
  title,
  description,
  deadline,
  allowLate,
  onTitleChange,
  onDescriptionChange,
  onDeadlineChange,
  onAllowLateChange,
}) => (
  <div className="mx-auto max-w-2xl">
    <h2 className="text-lg font-bold tracking-tight text-content">Thiết lập bài tập</h2>
    <p className="mt-1.5 text-sm font-normal leading-relaxed text-content-muted">
      Kiểm tra tên, mô tả và hạn nộp.
    </p>

    <div className="mt-5 space-y-4">
      <div>
        <label htmlFor="homework-title" className="mb-2 block text-sm font-medium text-content">
          Tên bài tập
        </label>
        <input
          id="homework-title"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          className={fieldClassName}
        />
      </div>

      <div>
        <label htmlFor="homework-description" className="mb-2 block text-sm font-medium text-content">
          Mô tả ngắn
        </label>
        <textarea
          id="homework-description"
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          rows={2}
          placeholder="Hướng dẫn ngắn cho học sinh..."
          className={`${fieldClassName} min-h-20 resize-y py-3 leading-relaxed`}
        />
      </div>

      <div>
        <label htmlFor="homework-deadline" className="mb-2 block text-sm font-medium text-content">
          Hạn nộp
        </label>
        <input
          id="homework-deadline"
          type="date"
          value={deadline}
          onChange={(event) => onDeadlineChange(event.target.value)}
          className={fieldClassName}
        />
      </div>
    </div>

    <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface-elevated p-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-content">Cho phép nộp trễ</p>
        <p id="allow-late-description" className="mt-1 text-sm font-normal leading-relaxed text-content-muted">
          Bài nộp sau hạn sẽ được đánh dấu trễ.
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={allowLate}
        aria-label="Cho phép nộp trễ"
        aria-describedby="allow-late-description"
        data-state={allowLate ? 'on' : 'off'}
        onClick={() => onAllowLateChange(!allowLate)}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-transparent p-0 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20 ${
          allowLate ? 'bg-accent' : 'bg-slate-300 dark:bg-slate-600'
        }`}
      >
        <span
          aria-hidden="true"
          data-switch-thumb
          className={`pointer-events-none absolute left-1 top-1 block size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
            allowLate ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  </div>
);
