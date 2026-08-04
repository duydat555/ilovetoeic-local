import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Check, CheckCircle2, FileText, Play, X } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { getModalMotion } from '../common/modalMotion';
import {
  ALL_TEST_PARTS,
  getExamDurationSeconds,
  getTestPartScopeLabel,
  LISTENING_TEST_PARTS,
  normalizeTestParts,
  READING_TEST_PARTS,
} from '../../utils/testScope';

export type TestMode = 'exam' | 'practice';
export type SelectedParts = number[];

interface SelectModeModalProps {
  testTitle: string;
  activeMode: TestMode;
  selectedParts: SelectedParts;
  onModeChange: (mode: TestMode) => void;
  onPartsChange: (parts: SelectedParts) => void;
  onStart: () => void;
  onClose: () => void;
}

export interface PartOption {
  id: number;
  name: string;
  count: string;
  category: 'listening' | 'reading';
}

export const PARTS_CONFIG: PartOption[] = [
  { id: 1, name: 'Part 1', count: '6 câu', category: 'listening' },
  { id: 2, name: 'Part 2', count: '25 câu', category: 'listening' },
  { id: 3, name: 'Part 3', count: '39 câu', category: 'listening' },
  { id: 4, name: 'Part 4', count: '30 câu', category: 'listening' },
  { id: 5, name: 'Part 5', count: '30 câu', category: 'reading' },
  { id: 6, name: 'Part 6', count: '16 câu', category: 'reading' },
  { id: 7, name: 'Part 7', count: '54 câu', category: 'reading' },
];

export const OPTION_BASE_CLASS =
  'border transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2';

export const getOptionStateClass = (isSelected: boolean) =>
  isSelected ? 'option-selected' : 'option-default option-hover';

export const SelectionIndicator: React.FC<{ selected: boolean }> = ({ selected }) => (
  <span
    aria-hidden="true"
    className={`flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 ${
      selected
        ? 'border-amber-500 bg-amber-500 text-white'
        : 'border-gray-300 bg-white text-transparent dark:border-slate-600 dark:bg-slate-900'
    }`}
  >
    <Check className="size-3 stroke-[3.5]" />
  </span>
);

interface PartGroupProps {
  id: string;
  label: string;
  category: PartOption['category'];
  selectedParts: SelectedParts;
  onTogglePart: (part: number) => void;
}

const PartGroup: React.FC<PartGroupProps> = ({
  id,
  label,
  category,
  selectedParts,
  onTogglePart,
}) => {
  const groupParts = PARTS_CONFIG.filter((part) => part.category === category);

  return (
    <section aria-labelledby={id}>
      <h3
        id={id}
        className="mb-2 mt-4 text-[11px] font-extrabold uppercase tracking-wider text-content-muted"
      >
        {label}
      </h3>
      <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2">
        {groupParts.map((part) => {
          const isSelected = selectedParts.includes(part.id);

          return (
            <button
              key={part.id}
              type="button"
              role="checkbox"
              aria-checked={isSelected}
              onClick={() => onTogglePart(part.id)}
              className={`${OPTION_BASE_CLASS} ${getOptionStateClass(
                isSelected,
              )} flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl p-3 text-left text-xs font-semibold`}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <SelectionIndicator selected={isSelected} />
                <span>{part.name}</span>
              </span>
              <span className="shrink-0 text-[11px] font-normal text-content-muted">
                {part.count}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export const SelectModeModal: React.FC<SelectModeModalProps> = ({
  testTitle,
  activeMode,
  selectedParts,
  onModeChange,
  onPartsChange,
  onStart,
  onClose,
}) => {
  const reduceMotion = useReducedMotion();
  const modalMotion = getModalMotion(reduceMotion);
  const normalizedParts = normalizeTestParts(selectedParts);
  const allPartsSelected = normalizedParts.length === ALL_TEST_PARTS.length;
  const selectedQuestionCount = PARTS_CONFIG.filter((part) => normalizedParts.includes(part.id))
    .reduce((total, part) => total + Number.parseInt(part.count, 10), 0);
  const examMinutes = Math.round(getExamDurationSeconds(normalizedParts) / 60);
  const scopeLabel = getTestPartScopeLabel(normalizedParts);
  const scopePresets = [
    { label: 'Toàn bộ đề', count: '200 câu', parts: [...ALL_TEST_PARTS] },
    { label: 'Listening', count: '100 câu', parts: [...LISTENING_TEST_PARTS] },
    { label: 'Reading', count: '100 câu', parts: [...READING_TEST_PARTS] },
  ];

  const togglePart = (part: number) => {
    onPartsChange(
      normalizedParts.includes(part)
        ? normalizedParts.filter((selected) => selected !== part)
        : normalizeTestParts([...normalizedParts, part]),
    );
  };

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose]);

  return createPortal(
    <motion.div
      {...modalMotion.backdrop}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/65 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        {...modalMotion.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mode-dialog-title"
        aria-describedby="mode-dialog-description"
        className="relative my-auto max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl border border-line bg-surface p-5 text-content shadow-2xl dark:shadow-none sm:p-7"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng màn hình chọn chế độ"
          title="Đóng"
          className="absolute right-4 top-4 rounded-full p-2 text-content-muted transition-colors duration-200 hover:bg-gray-50 hover:text-content dark:hover:bg-slate-800 sm:right-5 sm:top-5"
        >
          <X className="size-5" />
        </button>

        <div className="space-y-5">
          <header className="pr-11">
            <h2 id="mode-dialog-title" className="text-lg font-extrabold text-content">
              Chọn chế độ
            </h2>
            <p className="mt-0.5 text-xs font-medium text-content-muted">{testTitle}</p>
          </header>

          <div
            role="radiogroup"
            aria-label="Chế độ làm bài"
            className="grid grid-cols-2 gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-1.5 dark:border-slate-700 dark:bg-slate-900/60"
          >
            <button
              type="button"
              role="radio"
              aria-checked={activeMode === 'exam'}
              onClick={() => onModeChange('exam')}
              className={`${OPTION_BASE_CLASS} ${getOptionStateClass(
                activeMode === 'exam',
              )} flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold`}
            >
              <FileText className="size-4" />
              <span className="whitespace-nowrap">Thi</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={activeMode === 'practice'}
              onClick={() => onModeChange('practice')}
              className={`${OPTION_BASE_CLASS} ${getOptionStateClass(
                activeMode === 'practice',
              )} flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold`}
            >
              <BookOpen className="size-4" />
              <span className="whitespace-nowrap">Luyện tập</span>
            </button>
          </div>

          <div
            id="mode-dialog-description"
            className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs font-semibold leading-relaxed text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200"
          >
            {normalizedParts.length === 0
              ? 'Chọn ít nhất 1 Part để bắt đầu. Bạn có thể kết hợp Part Listening và Reading trong cùng một lượt.'
              : activeMode === 'exam'
              ? allPartsSelected
                ? 'Chế độ Thi: Làm đủ 200 câu trong 120 phút theo cấu trúc TOEIC.'
                : `Chế độ Thi: ${scopeLabel}, ${selectedQuestionCount} câu trong khoảng ${examMinutes} phút.`
              : `Chế độ Luyện tập: ${scopeLabel}. Xem đáp án và giải thích sau từng nhóm câu hỏi.`}
          </div>

          <div role="group" aria-label="Phạm vi làm bài">
            <div className="flex flex-col items-stretch gap-4 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between">
              <div>
                <span className="flex items-center gap-2 text-xs font-bold text-content">
                  <CheckCircle2 className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  Chọn phạm vi làm bài
                </span>
                <p className="mt-1 text-[11px] font-medium text-content-muted">
                  {normalizedParts.length > 0
                    ? `${normalizedParts.length} Part, ${selectedQuestionCount} câu`
                    : 'Chọn ít nhất 1 Part để bắt đầu'}
                </p>
              </div>
              <button
                type="button"
                onClick={onStart}
                disabled={normalizedParts.length === 0}
                className="flex min-h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-accent px-5 py-2 text-xs font-bold text-brand-ink shadow-md shadow-brand-500/20 transition-colors duration-200 hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 disabled:shadow-none dark:disabled:bg-surface-elevated dark:disabled:text-content-muted"
              >
                <Play className="size-3.5 fill-brand-ink" />
                {activeMode === 'exam' ? 'Bắt đầu thi' : 'Bắt đầu luyện'}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3" aria-label="Lựa chọn nhanh">
              {scopePresets.map((preset) => {
                const selected = preset.parts.length === normalizedParts.length
                  && preset.parts.every((part) => normalizedParts.includes(part));
                return (
                  <button
                    key={preset.label}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onPartsChange(selected ? [] : preset.parts)}
                    className={`${OPTION_BASE_CLASS} ${getOptionStateClass(
                      selected,
                    )} flex min-h-12 items-center gap-2.5 rounded-2xl p-3 text-left text-xs font-bold`}
                  >
                    <SelectionIndicator selected={selected} />
                    <span className="min-w-0">
                      <span className="block whitespace-nowrap">{preset.label}</span>
                      <span className="mt-0.5 block text-[10px] font-medium text-content-muted">{preset.count}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <PartGroup
              id="listening-parts-title"
              label="Listening"
              category="listening"
              selectedParts={normalizedParts}
              onTogglePart={togglePart}
            />
            <PartGroup
              id="reading-parts-title"
              label="Reading"
              category="reading"
              selectedParts={normalizedParts}
              onTogglePart={togglePart}
            />
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
};
