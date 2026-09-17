import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  GraduationCap,
  HeartHandshake,
  HelpCircle,
  ImagePlus,
  Lightbulb,
  Loader2,
  MessageSquare,
  MessageSquarePlus,
  SendHorizontal,
  X,
  XCircle,
  ZoomIn,
} from 'lucide-react';
import {
  FeedbackItem,
  FeedbackType,
  feedbackService,
} from '../../services/feedback';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getModalMotion } from '../../components/common/modalMotion';
import { ModalPortal } from '../../components/common/ModalPortal';
import { FeedbackPageSkeleton } from './components/FeedbackPageSkeleton';

export const FeedbackPage: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
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
  const [historyFilter, setHistoryFilter] = useState<'all' | 'pending' | 'resolved'>('all');

  useEffect(() => {
    loadMyFeedback();
  }, []);

  useEffect(() => {
    if (!previewImageUrl) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewImageUrl(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewImageUrl]);

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
      reader.onerror = () => reject(new Error(t('feedback.errImageRead')));
      reader.onload = (event) => {
        const img = new Image();
        img.onerror = () => reject(new Error(t('feedback.errImageInvalid')));
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
        setErrorMsg(t('feedback.errImageSize'));
        continue;
      }

      try {
        const compressedBase64 = await compressImageToFullHD(file);
        setImages((prev) => [...prev, compressedBase64].slice(0, 4));
      } catch (err) {
        console.warn('Lỗi nén ảnh:', err);
        setErrorMsg(t('feedback.errImageCompress'));
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
      setErrorMsg(t('feedback.errTitleRequired'));
      return;
    }
    if (!description.trim()) {
      setErrorMsg(t('feedback.errDescRequired'));
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

      setSuccessMsg(t('feedback.successMsg'));
      setTitle('');
      setDescription('');
      setImages([]);
      setMyFeedback((prev) => [created, ...prev]);
    } catch (err: any) {
      setErrorMsg(err?.message || t('feedback.errGeneric'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: FeedbackItem['status']) => {
    switch (status) {
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" />
            {t('feedback.statusResolved')}
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-0.5 text-xs font-bold text-sky-600 dark:text-sky-400">
            <Clock className="size-3.5" />
            {t('feedback.statusInProgress')}
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/25 bg-rose-500/10 px-2.5 py-0.5 text-xs font-bold text-rose-600 dark:text-rose-400">
            <XCircle className="size-3.5" />
            {t('feedback.statusRejected')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
            <Clock className="size-3.5" />
            {t('feedback.statusPending')}
          </span>
        );
    }
  };

  const filteredHistory = useMemo(() => {
    if (historyFilter === 'resolved') {
      return myFeedback.filter((item) => item.status === 'resolved');
    }
    if (historyFilter === 'pending') {
      return myFeedback.filter((item) => item.status === 'pending' || item.status === 'in_progress');
    }
    return myFeedback;
  }, [myFeedback, historyFilter]);

  const resolvedCount = useMemo(
    () => myFeedback.filter((item) => item.status === 'resolved').length,
    [myFeedback]
  );
  const inProgressCount = useMemo(
    () => myFeedback.filter((item) => item.status === 'pending' || item.status === 'in_progress').length,
    [myFeedback]
  );

  if (isLoadingHistory) {
    return <FeedbackPageSkeleton />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16 px-4 sm:px-6">
      {/* Header Banner */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1 text-xs font-bold text-accent-strong">
          <HeartHandshake className="size-3.5 text-accent-strong" />
          <span>{t('feedback.partnerBadge')}</span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-content sm:text-3xl">
              {t('feedback.title')}
            </h1>
            <p className="mt-1.5 max-w-2xl text-xs sm:text-sm font-normal leading-relaxed text-content-muted">
              {t('feedback.subtitle')}
            </p>
          </div>

          {/* Quick Stats Pills */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-content">
              <span className="text-content-muted">{t('feedback.totalSent')}</span>
              <strong className="font-bold">{myFeedback.length}</strong>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-3.5" />
              <span>{t('feedback.respondedCount', { count: resolvedCount })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Feedback Form (7 cols) */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="lg:col-span-7 rounded-3xl border border-line/80 bg-surface p-6 sm:p-8 shadow-xs"
        >
          <div className="mb-6">
            <h2 className="text-lg font-black text-content">{t('feedback.formTitle')}</h2>
            <p className="mt-1 text-xs text-content-muted">
              {t('feedback.formSubtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category Cards Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-content-muted">
                {t('feedback.typeLabel')}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('feature_request')}
                  className={`flex flex-col items-start p-4 rounded-2xl border text-left transition-all active:scale-[0.99] ${
                    activeTab === 'feature_request'
                      ? 'border-accent bg-accent/5 ring-2 ring-accent/20 shadow-xs'
                      : 'border-line/80 bg-surface-elevated/50 hover:bg-surface-hover hover:border-line text-content-muted'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`grid size-8 place-items-center rounded-xl transition-colors ${
                        activeTab === 'feature_request'
                          ? 'bg-accent text-accent-contrast'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      <Lightbulb className="size-4" />
                    </span>
                    <span className="text-sm font-extrabold text-content">{t('feedback.typeFeatureRequest')}</span>
                  </div>
                  <span className="mt-2 text-xs font-normal text-content-muted leading-relaxed">
                    {t('feedback.typeFeatureRequestDesc')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('suggestion')}
                  className={`flex flex-col items-start p-4 rounded-2xl border text-left transition-all active:scale-[0.99] ${
                    activeTab === 'suggestion'
                      ? 'border-accent bg-accent/5 ring-2 ring-accent/20 shadow-xs'
                      : 'border-line/80 bg-surface-elevated/50 hover:bg-surface-hover hover:border-line text-content-muted'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`grid size-8 place-items-center rounded-xl transition-colors ${
                        activeTab === 'suggestion'
                          ? 'bg-accent text-accent-contrast'
                          : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                      }`}
                    >
                      <MessageSquare className="size-4" />
                    </span>
                    <span className="text-sm font-extrabold text-content">{t('feedback.typeSuggestion')}</span>
                  </div>
                  <span className="mt-2 text-xs font-normal text-content-muted leading-relaxed">
                    {t('feedback.typeSuggestionDesc')}
                  </span>
                </button>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-content-muted">
                  <label htmlFor="feedback-title" className="uppercase tracking-wider">
                    {t('feedback.titleLabel')} <span className="text-rose-500">*</span>
                  </label>
                  <span>{title.length}/100</span>
                </div>
                <input
                  id="feedback-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('feedback.titlePlaceholder')}
                  className="mt-1.5 w-full rounded-2xl border border-line/80 bg-surface px-4 py-3 text-sm font-medium text-content outline-none transition placeholder:text-content-muted/60 focus:border-accent focus:ring-4 focus:ring-accent/15"
                  maxLength={100}
                  required
                />
              </div>

              <div>
                <label htmlFor="feedback-desc" className="block text-xs font-bold uppercase tracking-wider text-content-muted">
                  {t('feedback.descLabel')} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="feedback-desc"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('feedback.descPlaceholder')}
                  className="mt-1.5 w-full rounded-2xl border border-line/80 bg-surface px-4 py-3 text-sm font-medium text-content outline-none transition placeholder:text-content-muted/60 focus:border-accent focus:ring-4 focus:ring-accent/15 leading-relaxed"
                  required
                />
              </div>

              {/* Image Attachment Upload */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-content-muted">
                  <span className="uppercase tracking-wider">
                    {t('feedback.imagesLabel')} <span className="font-normal">{t('feedback.optional')}</span>
                  </span>
                  <span>{t('feedback.imagesCount', { count: images.length })}</span>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-3">
                  {images.map((imgSrc, idx) => (
                    <div
                      key={idx}
                      className="group relative size-20 overflow-hidden rounded-2xl border border-line bg-surface-elevated shadow-xs"
                    >
                      <img
                        src={imgSrc}
                        alt={language === 'en' ? `Attached image ${idx + 1}` : `Ảnh đính kèm ${idx + 1}`}
                        className="size-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/40 opacity-0 transition group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => setPreviewImageUrl(imgSrc)}
                          aria-label={t('feedback.zoomImage')}
                          className="grid size-7 place-items-center rounded-full bg-surface text-content hover:text-accent shadow-sm"
                        >
                          <ZoomIn className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          aria-label={t('feedback.removeImage')}
                          className="grid size-7 place-items-center rounded-full bg-surface text-rose-600 hover:bg-rose-500 hover:text-white shadow-sm"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {images.length < 4 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="group flex size-20 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-line hover:border-accent/60 bg-surface-elevated/40 hover:bg-accent/5 text-content-muted hover:text-accent-strong transition active:scale-95"
                    >
                      <ImagePlus className="size-5 transition-transform group-hover:scale-110" />
                      <span className="text-[11px] font-bold">{t('feedback.addImage')}</span>
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
              <div className="flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
                <AlertCircle className="size-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={isSubmitting || !title.trim() || !description.trim()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-accent px-6 text-sm font-extrabold text-accent-contrast shadow-md shadow-accent/20 transition hover:bg-accent/90 active:scale-98 disabled:opacity-50 disabled:shadow-none"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin text-current" />
                    <span>{t('feedback.submitting')}</span>
                  </>
                ) : (
                  <>
                    <SendHorizontal className="size-4 stroke-[2.2]" />
                    <span>{t('feedback.submitBtn')}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>

        {/* Right Column: History & Responses Feed (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-content">{t('feedback.historyTitle')}</h2>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
              <button
                type="button"
                onClick={() => setHistoryFilter('all')}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  historyFilter === 'all'
                    ? 'bg-accent text-accent-contrast shadow-xs'
                    : 'text-content-muted hover:text-content'
                }`}
              >
                {t('feedback.filterAll', { count: myFeedback.length })}
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter('pending')}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  historyFilter === 'pending'
                    ? 'bg-accent text-accent-contrast shadow-xs'
                    : 'text-content-muted hover:text-content'
                }`}
              >
                {t('feedback.filterPending', { count: inProgressCount })}
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter('resolved')}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  historyFilter === 'resolved'
                    ? 'bg-accent text-accent-contrast shadow-xs'
                    : 'text-content-muted hover:text-content'
                }`}
              >
                {t('feedback.filterResolved', { count: resolvedCount })}
              </button>
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center rounded-3xl border border-line/80 bg-surface p-8 text-center shadow-xs">
                <span className="grid size-12 place-items-center rounded-2xl bg-accent/10 text-accent-strong mb-3">
                  <MessageSquarePlus className="size-6 stroke-[1.8]" />
                </span>
                <h3 className="text-sm font-extrabold text-content">{t('feedback.emptyTitle')}</h3>
                <p className="mt-1 text-xs text-content-muted max-w-xs leading-relaxed">
                  {historyFilter === 'all'
                    ? t('feedback.emptyAll')
                    : t('feedback.emptyFilter')}
                </p>
              </div>

              {/* Helpful Tips Card */}
              <div className="rounded-3xl border border-line/80 bg-surface-elevated/40 p-5 space-y-3 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-extrabold text-content">
                  <HelpCircle className="size-4 text-accent-strong" />
                  <span>{t('feedback.tipsTitle')}</span>
                </div>
                <ul className="space-y-2 text-xs text-content-muted leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-accent-strong font-bold">•</span>
                    <span>{t('feedback.tip1')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent-strong font-bold">•</span>
                    <span>{t('feedback.tip2')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent-strong font-bold">•</span>
                    <span>{t('feedback.tip3')}</span>
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHistory.map((item) => (
                <motion.div
                  key={item.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="overflow-hidden rounded-3xl border border-line/80 bg-surface p-5 shadow-xs transition hover:border-accent/40 sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-[11px] font-bold text-accent-strong">
                        {item.type === 'feature_request' ? (
                          <>
                            <Lightbulb className="size-3" />
                            <span>{t('feedback.badgeFeature')}</span>
                          </>
                        ) : (
                          <>
                            <MessageSquare className="size-3" />
                            <span>{t('feedback.badgeSuggestion')}</span>
                          </>
                        )}
                      </span>
                      <span className="text-[11px] font-medium text-content-muted">
                        {new Date(item.createdAt).toLocaleDateString(language === 'en' ? 'en-US' : 'vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div>{getStatusBadge(item.status)}</div>
                  </div>

                  <h3 className="mt-2.5 text-sm sm:text-base font-extrabold text-content">
                    {item.title}
                  </h3>
                  <p className="mt-1 whitespace-pre-wrap text-xs font-normal leading-relaxed text-content-muted">
                    {item.description}
                  </p>

                  {item.images && item.images.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.images.map((imgUrl, imgIdx) => (
                        <button
                          key={imgIdx}
                          type="button"
                          onClick={() => setPreviewImageUrl(imgUrl)}
                          className="group relative size-14 overflow-hidden rounded-xl border border-line bg-surface-elevated"
                        >
                          <img
                            src={imgUrl}
                            alt={language === 'en' ? `Attached image ${imgIdx + 1}` : `Ảnh đính kèm ${imgIdx + 1}`}
                            className="size-full object-cover transition duration-200 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 grid place-items-center bg-black/30 opacity-0 group-hover:opacity-100 transition">
                            <ZoomIn className="size-3.5 text-white" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Lecturer / Admin response box */}
                  {item.adminResponse && (
                    <div className="mt-3.5 rounded-2xl border border-accent/25 bg-accent/5 p-3.5">
                      <div className="flex items-center justify-between text-xs font-extrabold text-accent-strong">
                        <div className="flex items-center gap-1.5">
                          <GraduationCap className="size-3.5" />
                          <span>{t('feedback.adminResponseHeader')}</span>
                        </div>
                        {item.respondedAt && (
                          <span className="text-[10px] font-medium text-content-muted">
                            {new Date(item.respondedAt).toLocaleDateString(language === 'en' ? 'en-US' : 'vi-VN', {
                              day: '2-digit',
                              month: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 whitespace-pre-wrap text-xs font-normal leading-relaxed text-content">
                        {item.adminResponse}
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Image Lightbox Modal using ModalMotion contract */}
      <AnimatePresence>
        {previewImageUrl && (
          <ModalPortal>
            <motion.div
              {...modalMotion.backdrop}
              onClick={() => setPreviewImageUrl(null)}
              className="fixed inset-0 z-[100] grid h-[100dvh] w-screen place-items-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm"
            >
              <motion.div
                {...modalMotion.panel}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                className="relative max-h-[88vh] max-w-[92vw] overflow-hidden rounded-3xl border border-line bg-surface p-2.5 shadow-2xl"
              >
                <img
                  src={previewImageUrl}
                  alt={language === 'en' ? 'Enlarged attached image' : 'Phóng to ảnh đính kèm'}
                  className="max-h-[82vh] max-w-full rounded-2xl object-contain"
                />
                <button
                  type="button"
                  onClick={() => setPreviewImageUrl(null)}
                  className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-slate-950/80 text-white transition hover:bg-rose-600 focus:outline-none"
                  aria-label={t('feedback.closePreview')}
                >
                  <X className="size-4" />
                </button>
              </motion.div>
            </motion.div>
          </ModalPortal>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FeedbackPage;

