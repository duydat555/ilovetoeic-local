import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import { Crop, RotateCw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { getModalMotion } from './modalMotion';
import { useLanguage } from '../../context/LanguageContext';

export interface AvatarCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropComplete: (croppedDataUrl: string) => void;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

function calculateRotatedBox(width: number, height: number, rotation: number) {
  const rad = (rotation * Math.PI) / 180;
  return {
    width: Math.abs(Math.cos(rad) * width) + Math.abs(Math.sin(rad) * height),
    height: Math.abs(Math.sin(rad) * width) + Math.abs(Math.cos(rad) * height),
  };
}

async function getCroppedAvatarImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0,
  maxOutputSize = 512,
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  const rotRad = (rotation * Math.PI) / 180;
  const { width: bBoxWidth, height: bBoxHeight } = calculateRotatedBox(
    image.width,
    image.height,
    rotation,
  );

  // Set canvas size to match the rotated bounding box
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  // Output square canvas
  const croppedCanvas = document.createElement('canvas');
  const croppedCtx = croppedCanvas.getContext('2d');

  if (!croppedCtx) {
    throw new Error('Canvas 2D context unavailable');
  }

  const outputSize = Math.min(maxOutputSize, Math.max(pixelCrop.width, 64));
  croppedCanvas.width = outputSize;
  croppedCanvas.height = outputSize;

  croppedCtx.imageSmoothingEnabled = true;
  croppedCtx.imageSmoothingQuality = 'high';

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize,
  );

  return croppedCanvas.toDataURL('image/jpeg', 0.88);
}

export const AvatarCropModal: React.FC<AvatarCropModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
}) => {
  const { language } = useLanguage();
  const reduceMotion = useReducedMotion();
  const motionContract = getModalMotion(reduceMotion);

  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset state whenever new image is loaded
  useEffect(() => {
    if (isOpen) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setCroppedAreaPixels(null);
      setIsProcessing(false);
    }
  }, [isOpen, imageSrc]);

  // Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const onCropChange = useCallback((location: Point) => {
    setCrop(location);
  }, []);

  const onZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);

  const handleCropComplete = useCallback((_croppedArea: Area, currentCroppedAreaPixels: Area) => {
    setCroppedAreaPixels(currentCroppedAreaPixels);
  }, []);

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleApply = async () => {
    if (!imageSrc || !croppedAreaPixels || isProcessing) return;
    setIsProcessing(true);
    try {
      const croppedDataUrl = await getCroppedAvatarImg(
        imageSrc,
        croppedAreaPixels,
        rotation,
        512,
      );
      onCropComplete(croppedDataUrl);
      onClose();
    } catch (err) {
      console.error('[!] Failed to crop avatar:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !imageSrc || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          key="avatar-crop-backdrop"
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
          onClick={onClose}
          {...motionContract.backdrop}
        />

        {/* Modal Panel */}
        <motion.div
          key="avatar-crop-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="avatar-crop-title"
          className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-2xl outline-none space-y-4"
          {...motionContract.panel}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-line pb-3.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                <Crop className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 id="avatar-crop-title" className="text-base font-black text-content">
                  {language === 'en' ? 'Crop Profile Picture' : 'Cắt ảnh đại diện'}
                </h2>
                <p className="truncate text-xs font-semibold text-content-muted">
                  {language === 'en' ? 'Drag to position and zoom' : 'Kéo để căn chỉnh và điều chỉnh kích thước'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-content-muted hover:bg-surface-elevated hover:text-content transition-colors"
              title={language === 'en' ? 'Close' : 'Đóng'}
              aria-label={language === 'en' ? 'Close' : 'Đóng'}
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Interactive Cropper Viewport */}
          <div className="relative h-64 sm:h-72 w-full overflow-hidden rounded-2xl bg-slate-950/90 border border-line select-none">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onCropComplete={handleCropComplete}
            />
          </div>

          {/* Controls: Zoom slider & Rotate */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.max(1, prev - 0.2))}
                className="rounded-lg p-1.5 text-content-muted hover:bg-surface-elevated hover:text-content transition"
                title={language === 'en' ? 'Zoom out' : 'Thu nhỏ'}
              >
                <ZoomOut className="size-4" />
              </button>

              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.02}
                aria-label={language === 'en' ? 'Zoom' : 'Phóng to thu nhỏ'}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-line accent-brand"
              />

              <button
                type="button"
                onClick={() => setZoom((prev) => Math.min(3, prev + 0.2))}
                className="rounded-lg p-1.5 text-content-muted hover:bg-surface-elevated hover:text-content transition"
                title={language === 'en' ? 'Zoom in' : 'Phóng to'}
              >
                <ZoomIn className="size-4" />
              </button>

              <div className="h-4 w-px bg-line" />

              <button
                type="button"
                onClick={handleRotate}
                className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-bold text-content hover:bg-surface-elevated transition shrink-0"
                title={language === 'en' ? 'Rotate 90 degrees' : 'Xoay 90 độ'}
              >
                <RotateCw className="size-3.5" />
                <span>90°</span>
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-line pt-3.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="rounded-xl border border-line px-4 py-2 text-sm font-bold text-content-muted hover:bg-surface-elevated hover:text-content transition disabled:opacity-50"
            >
              {language === 'en' ? 'Cancel' : 'Hủy'}
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2 text-sm font-black text-brand-ink hover:bg-brand-400 transition shadow-sm disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-brand-ink/30 border-t-brand-ink" />
                  <span>{language === 'en' ? 'Applying...' : 'Đang xử lý...'}</span>
                </>
              ) : (
                <span>{language === 'en' ? 'Apply' : 'Áp dụng'}</span>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
};
