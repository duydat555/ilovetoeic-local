import React, {
  CSSProperties,
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { RotateCcw } from 'lucide-react';

interface ResizableSplitPaneProps {
  left: ReactNode;
  right: ReactNode;
  storageKey: string;
  defaultLeftPercent?: number;
  minLeftPercent?: number;
  minRightWidth?: number;
  maxRightPercent?: number;
  className?: string;
  leftPaneClassName?: string;
  rightPaneClassName?: string;
  dividerLabel?: string;
}

const DIVIDER_WIDTH = 12;
const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)';
const RESET_DURATION = 220;
const KEYBOARD_STEP = 2;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum);

const readStoredPercent = (storageKey: string, fallback: number, minimum: number) => {
  if (typeof window === 'undefined') return fallback;

  try {
    const storedValue = Number.parseFloat(window.localStorage.getItem(storageKey) || '');
    return Number.isFinite(storedValue) ? clamp(storedValue, minimum, 100) : fallback;
  } catch {
    return fallback;
  }
};

const persistPercent = (storageKey: string, value: number) => {
  try {
    window.localStorage.setItem(storageKey, value.toFixed(2));
  } catch {
    // Resizing remains available when browser storage is blocked.
  }
};

export const ResizableSplitPane: React.FC<ResizableSplitPaneProps> = ({
  left,
  right,
  storageKey,
  defaultLeftPercent = 65,
  minLeftPercent = 30,
  minRightWidth = 320,
  maxRightPercent = 60,
  className = '',
  leftPaneClassName = '',
  rightPaneClassName = '',
  dividerLabel = 'Điều chỉnh chiều rộng hai khung',
}) => {
  const staticMinimum = Math.max(minLeftPercent, 100 - maxRightPercent);
  const [leftPercent, setLeftPercent] = useState(() =>
    readStoredPercent(storageKey, defaultLeftPercent, staticMinimum),
  );
  const [maximumLeftPercent, setMaximumLeftPercent] = useState(100);
  const [isDragging, setIsDragging] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const livePercentRef = useRef(leftPercent);
  const preferredPercentRef = useRef(leftPercent);
  const resetTimerRef = useRef<number | null>(null);
  const resetFrameRef = useRef<number | null>(null);

  const getLimits = useCallback(() => {
    const containerWidth = containerRef.current?.getBoundingClientRect().width || 0;
    const availableWidth = Math.max(containerWidth - DIVIDER_WIDTH, 1);
    const minimum = Math.max(minLeftPercent, 100 - maxRightPercent);
    const maximumFromRightWidth = 100 - (minRightWidth / availableWidth) * 100;
    const maximum = Math.max(minimum, Math.min(100, maximumFromRightWidth));

    return { minimum, maximum, availableWidth };
  }, [maxRightPercent, minLeftPercent, minRightWidth]);

  const applyLivePercent = useCallback((value: number) => {
    livePercentRef.current = value;
    containerRef.current?.style.setProperty('--split-left', `${value}fr`);
    containerRef.current?.style.setProperty('--split-right', `${100 - value}fr`);
  }, []);

  const commitPercent = useCallback((value: number) => {
    livePercentRef.current = value;
    preferredPercentRef.current = value;
    setLeftPercent(value);
    persistPercent(storageKey, value);
  }, [storageKey]);

  const reset = useCallback(() => {
    if (!containerRef.current || !window.matchMedia(DESKTOP_MEDIA_QUERY).matches) return;

    const { minimum, maximum } = getLimits();
    const nextPercent = clamp(defaultLeftPercent, minimum, maximum);

    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
    if (resetFrameRef.current !== null) window.cancelAnimationFrame(resetFrameRef.current);

    setIsResetting(true);
    resetFrameRef.current = window.requestAnimationFrame(() => {
      preferredPercentRef.current = defaultLeftPercent;
      livePercentRef.current = nextPercent;
      setLeftPercent(nextPercent);
      persistPercent(storageKey, defaultLeftPercent);
      resetTimerRef.current = window.setTimeout(() => {
        setIsResetting(false);
        resetTimerRef.current = null;
      }, RESET_DURATION);
      resetFrameRef.current = null;
    });
  }, [defaultLeftPercent, getLimits, storageKey]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const desktopQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const syncToContainer = () => {
      if (!desktopQuery.matches) return;
      const { minimum, maximum } = getLimits();
      setMaximumLeftPercent(maximum);
      const constrainedPercent = clamp(preferredPercentRef.current, minimum, maximum);
      applyLivePercent(constrainedPercent);
      if (constrainedPercent !== leftPercent) setLeftPercent(constrainedPercent);
    };

    const observer = new ResizeObserver(syncToContainer);
    observer.observe(container);
    desktopQuery.addEventListener('change', syncToContainer);
    syncToContainer();

    return () => {
      observer.disconnect();
      desktopQuery.removeEventListener('change', syncToContainer);
    };
  }, [applyLivePercent, getLimits, leftPercent]);

  useEffect(() => {
    if (!isDragging) return undefined;

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const moveDivider = (event: PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const { minimum, maximum, availableWidth } = getLimits();
      const pointerOffset = clamp(event.clientX - rect.left - DIVIDER_WIDTH / 2, 0, availableWidth);
      const nextPercent = clamp((pointerOffset / availableWidth) * 100, minimum, maximum);
      applyLivePercent(nextPercent);
    };

    const finishDragging = () => {
      commitPercent(livePercentRef.current);
      setIsDragging(false);
    };

    window.addEventListener('pointermove', moveDivider);
    window.addEventListener('pointerup', finishDragging);
    window.addEventListener('pointercancel', finishDragging);
    window.addEventListener('blur', finishDragging);

    return () => {
      window.removeEventListener('pointermove', moveDivider);
      window.removeEventListener('pointerup', finishDragging);
      window.removeEventListener('pointercancel', finishDragging);
      window.removeEventListener('blur', finishDragging);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [applyLivePercent, commitPercent, getLimits, isDragging]);

  useEffect(() => () => {
    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
    if (resetFrameRef.current !== null) window.cancelAnimationFrame(resetFrameRef.current);
  }, []);

  const startDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !window.matchMedia(DESKTOP_MEDIA_QUERY).matches) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus();
    setIsResetting(false);
    setIsDragging(true);
  };

  const handleKeyboardResize = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!window.matchMedia(DESKTOP_MEDIA_QUERY).matches) return;
    if (event.key === 'Home') {
      event.preventDefault();
      reset();
      return;
    }
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

    event.preventDefault();
    const { minimum, maximum } = getLimits();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextPercent = clamp(livePercentRef.current + direction * KEYBOARD_STEP, minimum, maximum);
    applyLivePercent(nextPercent);
    commitPercent(nextPercent);
  };

  const style = {
    '--split-left': `${leftPercent}fr`,
    '--split-right': `${100 - leftPercent}fr`,
    transitionDuration: isResetting ? `${RESET_DURATION}ms` : '0ms',
    transitionProperty: isResetting ? 'grid-template-columns' : 'none',
    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
  } as CSSProperties & { '--split-left': string; '--split-right': string };

  return (
    <div
      ref={containerRef}
      style={style}
      data-resizing={isDragging || undefined}
      className={`grid h-full min-h-0 grid-cols-1 items-start gap-4 overflow-y-auto motion-reduce:!transition-none lg:grid-cols-[minmax(0,var(--split-left))_0.75rem_minmax(0,var(--split-right))] lg:items-stretch lg:gap-0 lg:overflow-hidden ${className}`}
    >
      <div className={`min-w-0 lg:h-full lg:min-h-0 ${leftPaneClassName}`}>{left}</div>

      <div
        role="separator"
        aria-label={dividerLabel}
        aria-orientation="vertical"
        aria-valuemin={Math.round(staticMinimum)}
        aria-valuemax={Math.round(maximumLeftPercent)}
        aria-valuenow={Math.round(leftPercent)}
        aria-valuetext={`Khung trái ${Math.round(leftPercent)} phần trăm, khung phải ${Math.round(100 - leftPercent)} phần trăm`}
        tabIndex={0}
        title="Kéo để thay đổi chiều rộng. Nhấn đúp để đặt lại."
        onPointerDown={startDragging}
        onDoubleClick={reset}
        onKeyDown={handleKeyboardResize}
        className="group relative hidden h-full touch-none cursor-col-resize items-stretch justify-center outline-none lg:flex"
      >
        <div
          className={`h-full w-1 rounded-full transition-colors duration-150 group-hover:bg-brand-300 group-focus-visible:bg-brand-400 dark:group-hover:bg-brand-700 ${
            isDragging ? 'bg-brand-400 dark:bg-brand-600' : 'bg-slate-200 dark:bg-line'
          }`}
        />
        <button
          type="button"
          aria-label="Đặt lại tỷ lệ hai khung"
          title="Đặt lại tỷ lệ mặc định"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            reset();
          }}
          className="pointer-events-none absolute left-1/2 top-3 grid size-7 -translate-x-1/2 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 opacity-0 shadow-sm transition-[opacity,color,border-color,background-color] duration-150 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 dark:border-line dark:bg-surface-elevated dark:text-content-muted dark:hover:border-brand-700 dark:hover:bg-brand-950/40 dark:hover:text-brand-200"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
        </button>
      </div>

      <div className={`min-w-0 lg:h-full lg:min-h-0 ${rightPaneClassName}`}>{right}</div>

      {isDragging && (
        <div
          className="fixed inset-0 z-40 cursor-col-resize bg-slate-950/[0.015] dark:bg-white/[0.01]"
          aria-hidden="true"
        />
      )}
    </div>
  );
};
