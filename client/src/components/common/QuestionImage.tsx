import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, ImageIcon, Maximize2, RefreshCw, X, ZoomIn } from 'lucide-react';
import { getModalMotion } from './modalMotion';
import { createPortal } from 'react-dom';

interface QuestionImageProps {
  src: string;
  alt?: string;
  className?: string;
  containerClassName?: string;
  allowZoom?: boolean;
  priority?: 'high' | 'auto' | 'low';
}

export const QuestionImage: React.FC<QuestionImageProps> = ({
  src,
  alt = 'Hình minh họa câu hỏi',
  className = 'mx-auto max-h-[22rem] max-w-full rounded-2xl border border-slate-200 object-contain shadow-xs dark:border-line',
  containerClassName = 'relative w-full flex flex-col items-center justify-center my-2',
  allowZoom = true,
  priority = 'high',
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const reduceMotion = useReducedMotion();
  const modalMotion = getModalMotion(reduceMotion);

  // Cache busting query param only on explicit user retry
  const imageSrcWithRetry = retryCount > 0
    ? `${src}${src.includes('?') ? '&' : '?'}_retry=${retryCount}`
    : src;

  // Reset state and check cached image status immediately (critical for iOS Safari)
  useEffect(() => {
    setLoading(true);
    setError(false);

    // If image is already complete in browser cache (especially iOS Safari), set loaded immediately
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setLoading(false);
    }
  }, [src, retryCount]);

  const handleReload = () => {
    setLoading(true);
    setError(false);
    setRetryCount((prev) => prev + 1);
  };

  return (
    <div className={containerClassName}>
      {/* Skeleton / Shimmer placeholder while loading */}
      {loading && !error && (
        <div
          role="status"
          aria-label="Đang tải hình ảnh"
          className="flex h-56 sm:h-72 w-full max-w-lg items-center justify-center rounded-2xl border border-slate-200 bg-slate-100/90 dark:border-line dark:bg-surface-elevated/70 animate-pulse overflow-hidden"
        >
          <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-content-muted">
            <ImageIcon className="size-8 animate-bounce opacity-70" />
            <span className="text-xs font-semibold">Đang tải hình ảnh...</span>
          </div>
        </div>
      )}

      {/* Error fallback state */}
      {error && (
        <div className="flex h-44 w-full max-w-lg flex-col items-center justify-center rounded-2xl border border-dashed border-rose-300 bg-rose-50/70 p-4 text-center dark:border-rose-900/60 dark:bg-rose-950/20">
          <AlertCircle className="size-6 text-rose-500 mb-1.5" />
          <p className="text-xs font-bold text-rose-700 dark:text-rose-300">Không thể tải được hình ảnh câu hỏi</p>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-content-muted">Đường truyền mạng chập chờn hoặc kết nối bị gián đoạn</p>
          <button
            type="button"
            onClick={handleReload}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs border border-slate-200 hover:bg-slate-50 active:scale-95 dark:bg-surface-elevated dark:border-line dark:text-content"
          >
            <RefreshCw className="size-3.5" />
            Thử tải lại ảnh
          </button>
        </div>
      )}

      {/* Main Image - Keep mounted without display:none so iOS WebKit handles image decode cleanly */}
      {!error && (
        <div className={`relative group inline-block ${loading ? 'opacity-0 absolute pointer-events-none -z-10' : 'opacity-100 relative'}`}>
          <img
            ref={imgRef}
            key={imageSrcWithRetry}
            src={imageSrcWithRetry}
            alt={alt}
            decoding="async"
            // @ts-expect-error - fetchpriority is standard in modern HTML
            fetchpriority={priority}
            loading="eager"
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
            className={`${className} transition-opacity duration-200 ${allowZoom ? 'cursor-zoom-in' : ''}`}
            onClick={() => {
              if (allowZoom && !loading && !error) setIsZoomed(true);
            }}
          />

          {allowZoom && !loading && !error && (
            <button
              type="button"
              onClick={() => setIsZoomed(true)}
              aria-label="Phóng to hình ảnh"
              title="Phóng to hình ảnh"
              className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-lg bg-slate-900/75 px-2 py-1 text-[11px] font-bold text-white opacity-0 backdrop-blur-xs transition-opacity group-hover:opacity-100 hover:bg-slate-900"
            >
              <Maximize2 className="size-3" />
              <span>Phóng to</span>
            </button>
          )}
        </div>
      )}

      {/* Zoom Lightbox Modal */}
      {allowZoom && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isZoomed && (
            <motion.div
              {...modalMotion.backdrop}
              className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md"
              onClick={() => setIsZoomed(false)}
            >
              <motion.div
                {...modalMotion.panel}
                className="relative max-h-[92vh] max-w-[94vw] overflow-hidden rounded-2xl bg-white p-2 shadow-2xl dark:bg-surface border border-slate-200 dark:border-line"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-line">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-content">
                    <ZoomIn className="size-4 text-brand-600 dark:text-brand-400" />
                    <span>Xem ảnh chi tiết</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsZoomed(false)}
                    aria-label="Đóng phóng to"
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-surface-hover dark:hover:text-slate-200"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="max-h-[82vh] overflow-auto p-2 flex items-center justify-center">
                  <img
                    src={imageSrcWithRetry}
                    alt={alt}
                    referrerPolicy="no-referrer"
                    className="max-h-[78vh] w-auto max-w-full rounded-xl object-contain"
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
};
