import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  Lightbulb,
  MessageSquare,
  Search,
  Send,
  Sparkles,
  Trash2,
  User,
  X,
  XCircle,
} from 'lucide-react';
import {
  FeedbackItem,
  FeedbackStatus,
  FeedbackType,
  feedbackService,
} from '../../services/feedback';
import { getModalMotion } from '../../components/common/modalMotion';

export const AdminFeedbackPage: React.FC = () => {
  const reduceMotion = useReducedMotion();
  const modalMotion = getModalMotion(reduceMotion);

  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Active item for modal editing
  const [activeEditingItem, setActiveEditingItem] = useState<FeedbackItem | null>(null);
  const [replyStatus, setReplyStatus] = useState<FeedbackStatus>('pending');
  const [replyText, setReplyText] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Preview image modal
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminFeedbackList();
  }, [selectedStatus, selectedType]);

  const fetchAdminFeedbackList = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const params: any = {};
      if (selectedStatus !== 'all') params.status = selectedStatus;
      if (selectedType !== 'all') params.type = selectedType;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const data = await feedbackService.getAdminFeedbackList(params);
      setFeedbackList(data);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Không thể tải danh sách góp ý.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAdminFeedbackList();
  };

  const openReplyModal = (item: FeedbackItem) => {
    setActiveEditingItem(item);
    setReplyStatus(item.status);
    setReplyText(item.adminResponse || '');
  };

  const closeReplyModal = () => {
    if (!isSaving) {
      setActiveEditingItem(null);
    }
  };

  const handleSaveReply = async () => {
    if (!activeEditingItem) return;

    try {
      setIsSaving(true);
      const updated = await feedbackService.updateAdminFeedback(activeEditingItem.id, {
        status: replyStatus,
        admin_response: replyText.trim(),
      });

      setFeedbackList((prev) =>
        prev.map((f) => (f.id === updated.id ? updated : f)),
      );
      closeReplyModal();
    } catch (err: any) {
      alert(err?.message || 'Cập nhật phản hồi thất bại.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (id: string, title: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xoá góp ý "${title}"?`)) return;

    try {
      await feedbackService.deleteAdminFeedback(id);
      setFeedbackList((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      alert(err?.message || 'Xoá góp ý thất bại.');
    }
  };

  const getStatusBadge = (status: FeedbackStatus) => {
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
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-400/20 via-teal-500/15 to-emerald-600/10 shadow-md shadow-emerald-500/10 dark:border-emerald-500/30 dark:from-emerald-950/60 dark:to-teal-900/40">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/30">
              <MessageSquare className="size-5 stroke-[2.2]" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-content sm:text-3xl">
              Quản lý Góp ý & Yêu cầu học viên
            </h1>
            <p className="mt-1 text-sm font-medium text-content-muted">
              Xem danh sách đóng góp, cập nhật tiến độ xử lý và gửi phản hồi trực tiếp đến học viên.
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-content-muted" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-xl border border-line bg-surface-hover px-3 py-2 text-xs font-extrabold text-content outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chờ xử lý</option>
              <option value="in_progress">Đang thực hiện</option>
              <option value="resolved">Đã giải quyết</option>
              <option value="rejected">Từ chối</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="rounded-xl border border-line bg-surface-hover px-3 py-2 text-xs font-extrabold text-content outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="all">Tất cả danh mục</option>
              <option value="feature_request">💡 Yêu cầu tính năng</option>
              <option value="suggestion">💬 Góp ý</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tiêu đề, tên, email..."
            className="w-full rounded-xl border border-line bg-surface-hover py-2 pl-9 pr-4 text-xs font-medium text-content outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
          />
          <Search className="absolute left-3 top-2.5 size-4 text-content-muted" />
        </form>
      </div>

      {/* Main List */}
      {isLoading ? (
        <div className="flex items-center justify-center rounded-3xl border border-line bg-surface p-12 text-center text-sm font-medium text-content-muted">
          <Sparkles className="size-5 animate-spin text-emerald-500" />
          <span className="ml-2">Đang tải danh sách góp ý...</span>
        </div>
      ) : errorMsg ? (
        <div className="flex items-center gap-2 rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm font-semibold text-rose-600 dark:text-rose-400">
          <AlertCircle className="size-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      ) : feedbackList.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-line bg-surface/60 p-6 text-center text-sm font-semibold text-content-muted">
          <MessageSquare className="size-8 text-content-muted/40" />
          <span className="mt-2">Chưa có góp ý nào phù hợp với bộ lọc.</span>
        </div>
      ) : (
        <div className="space-y-4">
          {feedbackList.map((item) => (
            <motion.div
              key={item.id}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-sm transition hover:shadow-md sm:p-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                {/* User info */}
                <div className="flex items-center gap-3">
                  {item.userAvatar ? (
                    <img
                      src={item.userAvatar}
                      alt={item.userName}
                      className="size-11 rounded-2xl border border-line object-cover"
                    />
                  ) : (
                    <div className="flex size-11 items-center justify-center rounded-2xl border border-line bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
                      <User className="size-5" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-extrabold text-content">
                        {item.userName || 'Học viên'}
                      </h4>
                      <span className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                        {item.type === 'feature_request' ? '💡 Yêu cầu tính năng' : '💬 Góp ý'}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-content-muted">
                      {item.userEmail} •{' '}
                      {new Date(item.createdAt).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                {/* Status & Actions */}
                <div className="flex items-center gap-3">
                  <div>{getStatusBadge(item.status)}</div>
                  <button
                    type="button"
                    onClick={() => openReplyModal(item)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-500/20 dark:text-emerald-300"
                  >
                    <Send className="size-3.5" />
                    Phản hồi
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id, item.title)}
                    title="Xoá góp ý"
                    className="grid size-8 place-items-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 transition hover:bg-rose-500/20 dark:text-rose-400"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="mt-4">
                <h3 className="text-base font-extrabold text-content sm:text-lg">
                  {item.title}
                </h3>
                <p className="mt-1.5 whitespace-pre-wrap text-sm font-medium leading-relaxed text-content-muted">
                  {item.description}
                </p>
              </div>

              {/* Images */}
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

              {/* Response Display if present */}
              {item.adminResponse && (
                <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-50/50 p-4 dark:bg-emerald-950/30">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
                    <Sparkles className="size-4" />
                    <span>Phản hồi từ Giảng viên</span>
                    {item.respondedAt && (
                      <span className="text-[11px] font-medium text-content-muted">
                        (
                        {new Date(item.respondedAt).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        )
                      </span>
                    )}
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

      {/* Response Modal using ModalMotion contract */}
      <AnimatePresence>
        {activeEditingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              {...modalMotion.backdrop}
              onClick={closeReplyModal}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            />
            <motion.div
              {...modalMotion.panel}
              className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-2xl sm:p-8"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-content sm:text-xl">
                  Phản hồi góp ý
                </h3>
                <button
                  type="button"
                  onClick={closeReplyModal}
                  className="grid size-8 place-items-center rounded-full bg-surface-hover text-content-muted transition hover:text-content"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-line bg-surface-hover/60 p-3.5">
                <p className="text-xs font-extrabold text-content">{activeEditingItem.title}</p>
                <p className="mt-1 text-xs font-medium text-content-muted line-clamp-2">
                  {activeEditingItem.description}
                </p>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-content">
                    Trạng thái xử lý
                  </label>
                  <select
                    value={replyStatus}
                    onChange={(e) => setReplyStatus(e.target.value as FeedbackStatus)}
                    className="mt-1.5 w-full rounded-2xl border border-line bg-surface px-4 py-2.5 text-xs font-extrabold text-content outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="pending">⏳ Chờ xử lý</option>
                    <option value="in_progress">⚙️ Đang thực hiện</option>
                    <option value="resolved">✅ Đã giải quyết</option>
                    <option value="rejected">❌ Từ chối</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-content">
                    Nội dung phản hồi cho học viên
                  </label>
                  <textarea
                    rows={4}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Nhập câu trả lời hoặc tiến độ xử lý..."
                    className="mt-1.5 w-full rounded-2xl border border-line bg-surface px-4 py-3 text-xs font-medium text-content outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeReplyModal}
                  disabled={isSaving}
                  className="rounded-full border border-line px-5 py-2 text-xs font-extrabold text-content-muted transition hover:bg-surface-hover"
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  onClick={handleSaveReply}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-2 text-xs font-extrabold text-white shadow-md transition hover:bg-emerald-600 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Sparkles className="size-4 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Send className="size-4" />
                      <span>Lưu & Gửi thông báo</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

export default AdminFeedbackPage;
