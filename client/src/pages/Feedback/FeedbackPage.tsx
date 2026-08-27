import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ImagePlus,
  Lightbulb,
  MessageSquare,
  MessageSquarePlus,
  SendHorizontal,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import {
  FeedbackItem,
  FeedbackType,
  feedbackService,
} from '../../services/feedback';
import { useAuth } from '../../context/AuthContext';
import { getModalMotion } from '../../components/common/modalMotion';

export const FeedbackPage: React.FC = () => {
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();
  const modalMotion = getModalMotion(reduceMotion);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<FeedbackType>('feature_request');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [myFeedback, setMyFeedback] = useState<FeedbackItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  useEffect(() => {
    loadMyFeedback();
  }, []);

  const loadMyFeedback = async () => {
    try {
      setIsLoadingHistory(true);
      const data = await feedbackService.getMyFeedback();
      setMyFeedback(data);
    } catch (err) {
      console.warn('Failed to load feedback history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const compressImageToFullHD = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Không thể đọc file ảnh.'));
      reader.onload = (event) => {
        const img = new Image();
        img.onerror = () => reject(new Error('File ảnh không hợp lệ.'));
        img.onload = () => {
          const MAX_WIDTH = 1920;
          const MAX_HEIGHT = 1080;
          let width = img.width;
          let height = img.height;

          // Scale down to FullHD preserving aspect ratio
          if (width > MAX_WIDTH || height > MAX_HEIGHT) {
            const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve(event.target?.result as string);
          }

          // Render onto canvas and compress to JPEG (82% quality)
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);
          resolve(compressedBase64);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 4 - images.length;
    if (remainingSlots <= 0) return;

    const selectedFiles = Array.from(files).slice(0, remainingSlots);
    for (const file of selectedFiles) {
      if (file.size > 15 * 1024 * 1024) {
        setErrorMsg('Mỗi ảnh đính kèm không vượt quá 15MB.');
        continue;
      }

      try {
        const compressedBase64 = await compressImageToFullHD(file);
        setImages((prev) => [...prev, compressedBase64].slice(0, 4));
      } catch (err) {
        console.warn('Lỗi nén ảnh:', err);
        setErrorMsg('Có lỗi xảy ra khi nén ảnh đính kèm.');
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!title.trim()) {
      setErrorMsg('Vui lòng nhập tiêu đề góp ý.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Vui lòng nhập mô tả chi tiết.');
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await feedbackService.submitFeedback({
        type: activeTab,
        title: title.trim(),
        description: description.trim(),
        images,
      });

      setSuccessMsg('Gửi góp ý thành công! Đội ngũ giảng viên đã nhận được tin nhắn của bạn.');
      setTitle('');
      setDescription('');
      setImages([]);
      setMyFeedback((prev) => [created, ...prev]);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi gửi góp ý. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: FeedbackItem['status']) => {
    switch (status) {
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" />
            Đã giải quyết
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-bold text-sky-600 dark:text-sky-400">
            <Clock className="size-3.5" />
            Đang thực hiện
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-600 dark:text-rose-400">
            <XCircle className="size-3.5" />
            Từ chối
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
            <Clock className="size-3.5" />
            Chờ xử lý
          </span>
        );
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-400/20 via-teal-500/15 to-emerald-600/10 shadow-md shadow-emerald-500/10 dark:border-emerald-500/30 dark:from-emerald-950/60 dark:to-teal-900/40">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/30">
            <MessageSquarePlus className="size-5 stroke-[2.2]" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-content sm:text-3xl">
            Góp ý & Yêu cầu chức năng
          </h1>
          <p className="mt-1 text-sm font-medium text-content-muted">
            Bạn muốn cải thiện điều gì hoặc cần thêm tính năng mới? Gửi cho chúng tôi — đội ngũ sẽ xem và phản hồi.
          </p>
        </div>
      </div>

      {/* Main Feedback Form Card */}
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-3xl border border-amber-500/20 bg-surface p-5 shadow-[0_12px_40px_-20px_rgba(245,158,11,0.15)] sm:p-8"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('feature_request')}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-extrabold transition-all sm:text-sm ${
                activeTab === 'feature_request'
                  ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm dark:bg-amber-950/50 dark:text-amber-300'
                  : 'border-line bg-surface-elevated text-content-muted hover:border-amber-300 hover:text-content'
              }`}
            >
              <Lightbulb className="size-4 text-amber-500" />
              Yêu cầu chức năng
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('suggestion')}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-extrabold transition-all sm:text-sm ${
                activeTab === 'suggestion'
                  ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm dark:bg-amber-950/50 dark:text-amber-300'
                  : 'border-line bg-surface-elevated text-content-muted hover:border-amber-300 hover:text-content'
              }`}
            >
              <MessageSquare className="size-4 text-amber-500" />
              Góp ý
            </button>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label htmlFor="feedback-title" className="block text-xs font-bold uppercase tracking-wider text-content">
                Tiêu đề
              </label>
              <input
                id="feedback-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tóm tắt ngắn gọn..."
                className="mt-1.5 w-full rounded-2xl border border-line bg-surface-hover/70 px-4 py-3 text-sm font-medium text-content outline-none transition-all placeholder:text-content-muted/60 focus:border-amber-500 focus:bg-surface focus:ring-2 focus:ring-amber-500/20"
                maxLength={255}
                required
              />
            </div>

            <div>
              <label htmlFor="feedback-desc" className="block text-xs font-bold uppercase tracking-wider text-content">
                Mô tả chi tiết
              </label>
              <textarea
                id="feedback-desc"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả cụ thể góp ý hoặc tính năng bạn mong muốn..."
                className="mt-1.5 w-full rounded-2xl border border-line bg-surface-hover/70 px-4 py-3 text-sm font-medium text-content outline-none transition-all placeholder:text-content-muted/60 focus:border-amber-500 focus:bg-surface focus:ring-2 focus:ring-amber-500/20"
                required
              />
            </div>

            {/* Image Attachment Upload */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-content">
                <span>Ảnh đính kèm <span className="font-normal text-content-muted">(tuỳ chọn, tối đa 4 ảnh)</span></span>
                <span>{images.length}/4</span>
              </div>

              <div className="mt-2.5 flex flex-wrap gap-3">
                {images.map((imgSrc, idx) => (
                  <div
                    key={idx}
                    className="group relative size-20 overflow-hidden rounded-2xl border border-line bg-slate-100 dark:bg-slate-800"
                  >
                    <img
                      src={imgSrc}
                      alt={`Đính kèm ${idx + 1}`}
                      className="size-full object-cover transition duration-200 group-hover:scale-105"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      aria-label="Xoá ảnh này"
                      className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-slate-900/80 text-white opacity-0 transition group-hover:opacity-100 hover:bg-rose-600"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}

                {images.length < 4 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex size-20 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-amber-300/80 bg-amber-50/40 text-amber-600 transition hover:border-amber-500 hover:bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/20 dark:text-amber-400 dark:hover:border-amber-500"
                  >
                    <ImagePlus className="size-5" />
                    <span className="text-[10px] font-bold">Thêm ảnh</span>
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Feedback status notifications */}
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !description.trim()}
              className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 px-7 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/25 transition-all hover:from-amber-600 hover:to-yellow-600 hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
            >
              {isSubmitting ? (
                <>
                  <Sparkles className="size-4 animate-spin text-slate-950" />
                  <span>Đang gửi...</span>
                </>
              ) : (
                <>
                  <SendHorizontal className="size-4 stroke-[2.5] text-slate-950" />
                  <span>Gửi góp ý</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>

      {/* History Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-extrabold tracking-tight text-content sm:text-xl">
          Góp ý của bạn
        </h2>

        {isLoadingHistory ? (
          <div className="flex items-center justify-center rounded-3xl border border-line bg-surface p-12 text-center text-sm font-medium text-content-muted">
            <Sparkles className="size-5 animate-spin text-amber-500" />
            <span className="ml-2">Đang tải lịch sử góp ý...</span>
          </div>
        ) : myFeedback.length === 0 ? (
          /* Exact empty state matching design screenshot */
          <div className="flex h-32 items-center justify-center rounded-3xl border-2 border-dashed border-amber-200 bg-surface/60 p-6 text-center text-sm font-semibold text-content-muted dark:border-amber-900/40">
            <span>Bạn chưa gửi góp ý nào.</span>
          </div>
        ) : (
          <div className="space-y-4">
            {myFeedback.map((item) => (
              <motion.div
                key={item.id}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-sm transition hover:shadow-md sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
                      {item.type === 'feature_request' ? '💡 Yêu cầu tính năng' : '💬 Góp ý'}
                    </span>
                    <span className="text-xs font-semibold text-content-muted">
                      {new Date(item.createdAt).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div>{getStatusBadge(item.status)}</div>
                </div>

                <h3 className="mt-3 text-base font-extrabold text-content sm:text-lg">
                  {item.title}
                </h3>
                <p className="mt-1.5 whitespace-pre-wrap text-sm font-medium leading-relaxed text-content-muted">
                  {item.description}
                </p>

                {item.images && item.images.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2.5">
                    {item.images.map((imgUrl, imgIdx) => (
                      <button
                        key={imgIdx}
                        type="button"
                        onClick={() => setPreviewImageUrl(imgUrl)}
                        className="group relative size-16 overflow-hidden rounded-xl border border-line bg-slate-100 dark:bg-slate-800"
                      >
                        <img
                          src={imgUrl}
                          alt="Đính kèm"
                          className="size-full object-cover transition duration-200 group-hover:scale-105"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {/* Lecturer / Admin response box */}
                {item.adminResponse && (
                  <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-50/50 p-4 dark:bg-amber-950/30">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-amber-700 dark:text-amber-400">
                      <Sparkles className="size-4" />
                      <span>Phản hồi từ Giảng viên</span>
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap text-xs font-semibold leading-relaxed text-content">
                      {item.adminResponse}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Image Lightbox Modal using ModalMotion contract */}
      <AnimatePresence>
        {previewImageUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              {...modalMotion.backdrop}
              onClick={() => setPreviewImageUrl(null)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            />
            <motion.div
              {...modalMotion.panel}
              className="relative z-10 max-h-[85vh] max-w-[90vw] overflow-hidden rounded-3xl border border-line bg-surface p-2 shadow-2xl"
            >
              <img
                src={previewImageUrl}
                alt="Phóng to ảnh"
                className="max-h-[80vh] max-w-full rounded-2xl object-contain"
              />
              <button
                type="button"
                onClick={() => setPreviewImageUrl(null)}
                className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-slate-950/80 text-white transition hover:bg-rose-600"
              >
                <X className="size-5" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FeedbackPage;
