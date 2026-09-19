import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Edit2,
  ExternalLink,
  Info,
  Loader2,
  Megaphone,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { getModalMotion } from '../../components/common/modalMotion';
import {
  announcementService,
  SystemAnnouncement,
  CreateAnnouncementPayload,
  UpdateAnnouncementPayload,
} from '../../services/backend';
import { BoneyardSkeleton } from '../../components/common/BoneyardSkeleton';

// ─── Type config ──────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  info: {
    Icon: Info,
    iconBg: 'bg-blue-50 dark:bg-blue-950/40',
    iconColor: 'text-blue-500',
    badgeClass:
      'border-blue-200/80 bg-blue-50 text-blue-600 dark:border-blue-500/20 dark:bg-blue-950/40 dark:text-blue-400',
    label: 'Thông tin',
  },
  warning: {
    Icon: AlertTriangle,
    iconBg: 'bg-amber-50 dark:bg-amber-950/40',
    iconColor: 'text-amber-500',
    badgeClass:
      'border-amber-200/80 bg-amber-50 text-amber-600 dark:border-amber-500/20 dark:bg-amber-950/40 dark:text-amber-400',
    label: 'Chú ý',
  },
  success: {
    Icon: CheckCircle2,
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    iconColor: 'text-emerald-500',
    badgeClass:
      'border-emerald-200/80 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-400',
    label: 'Tin vui',
  },
  event: {
    Icon: Megaphone,
    iconBg: 'bg-orange-50 dark:bg-orange-950/40',
    iconColor: 'text-orange-500',
    badgeClass:
      'border-orange-200/80 bg-orange-50 text-orange-600 dark:border-orange-500/20 dark:bg-orange-950/40 dark:text-orange-400',
    label: 'Sự kiện',
  },
} as const;

type AnnouncementType = keyof typeof TYPE_CONFIG;

// ─── Toggle component ─────────────────────────────────────────────────────────

const Toggle: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}> = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className="flex items-center gap-2.5 group text-left"
  >
    {checked ? (
      <ToggleRight className="size-6 shrink-0 text-accent" />
    ) : (
      <ToggleLeft className="size-6 shrink-0 text-content-muted" />
    )}
    <span className="text-sm text-content select-none">{label}</span>
  </button>
);

// ─── Field label ──────────────────────────────────────────────────────────────

const FieldLabel: React.FC<{ children: React.ReactNode; optional?: boolean }> = ({
  children,
  optional,
}) => (
  <label className="text-xs font-semibold text-content-muted uppercase tracking-wide">
    {children}
    {optional && (
      <span className="ml-1 font-normal normal-case text-content-muted/60">(tuỳ chọn)</span>
    )}
  </label>
);

const inputClass =
  'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-content placeholder:text-content-muted/50 outline-none transition focus:border-accent/40 focus:ring-2 focus:ring-accent/15';

// ─── Main page ────────────────────────────────────────────────────────────────

export const AdminAnnouncementsPage: React.FC = () => {
  const reduceMotion = useReducedMotion();
  const modalMotion = useMemo(() => getModalMotion(reduceMotion), [reduceMotion]);
  const panelRef = useRef<HTMLDivElement>(null);

  // List state
  const [list, setList] = useState<SystemAnnouncement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [activeItem, setActiveItem] = useState<null | SystemAnnouncement | 'new'>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formType, setFormType] = useState<AnnouncementType>('info');
  const [formActionUrl, setFormActionUrl] = useState('');
  const [formActionLabel, setFormActionLabel] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formShowPopup, setFormShowPopup] = useState(true);
  const [formSendInApp, setFormSendInApp] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchList = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await announcementService.listAdmin();
      setList(data);
    } catch {
      setError('Không thể tải danh sách thông báo. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  // ── Scroll lock while modal open ───────────────────────────────────────────

  useEffect(() => {
    const open = activeItem !== null;
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [activeItem]);

  // ── Modal helpers ──────────────────────────────────────────────────────────

  const handleOpenNew = () => {
    setFormTitle('');
    setFormContent('');
    setFormType('info');
    setFormActionUrl('');
    setFormActionLabel('');
    setFormIsActive(true);
    setFormShowPopup(true);
    setFormSendInApp(false);
    setActiveItem('new');
  };

  const handleOpenEdit = (item: SystemAnnouncement) => {
    setFormTitle(item.title);
    setFormContent(item.content);
    setFormType(item.type as AnnouncementType);
    setFormActionUrl(item.actionUrl ?? '');
    setFormActionLabel(item.actionLabel ?? '');
    setFormIsActive(item.isActive);
    setFormShowPopup(item.showPopup);
    setFormSendInApp(false);
    setActiveItem(item);
  };

  const handleCloseModal = () => {
    if (isSaving) return;
    setActiveItem(null);
  };

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!formTitle.trim() || !formContent.trim()) return;
    setIsSaving(true);
    try {
      if (activeItem === 'new') {
        const payload: CreateAnnouncementPayload = {
          title: formTitle.trim(),
          content: formContent.trim(),
          type: formType,
          actionUrl: formActionUrl.trim() || null,
          actionLabel: formActionLabel.trim() || null,
          isActive: formIsActive,
          showPopup: formShowPopup,
          sendInAppNotification: formSendInApp,
        };
        const { data } = await announcementService.create(payload);
        setList((prev) => [data, ...prev]);
      } else if (activeItem && typeof activeItem === 'object') {
        const payload: UpdateAnnouncementPayload = {
          title: formTitle.trim(),
          content: formContent.trim(),
          type: formType,
          actionUrl: formActionUrl.trim() || null,
          actionLabel: formActionLabel.trim() || null,
          isActive: formIsActive,
          showPopup: formShowPopup,
        };
        const { data } = await announcementService.update(activeItem.id, payload);
        setList((prev) => prev.map((a) => (a.id === data.id ? data : a)));
      }
      setActiveItem(null);
    } catch {
      /* Keep modal open so user can retry */
    } finally {
      setIsSaving(false);
    }
  };

  // ── Toggle / Delete ────────────────────────────────────────────────────────

  const handleToggle = async (item: SystemAnnouncement) => {
    try {
      const { isActive } = await announcementService.toggleStatus(item.id);
      setList((prev) => prev.map((a) => (a.id === item.id ? { ...a, isActive } : a)));
    } catch {}
  };

  const handleDelete = async (item: SystemAnnouncement) => {
    if (!window.confirm(`Xóa thông báo "${item.title}"?`)) return;
    try {
      await announcementService.delete(item.id);
      setList((prev) => prev.filter((a) => a.id !== item.id));
    } catch {}
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const isCreating = activeItem === 'new';
  const isEditing = activeItem !== null && activeItem !== 'new';
  const modalOpen = activeItem !== null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-950/30 shadow-sm">
            <Bell className="size-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-content sm:text-3xl">
              Quản lý thông báo
            </h1>
            <p className="mt-1 text-sm font-medium text-content-muted">
              Soạn và quản lý thông báo hệ thống hiển thị cho học viên.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenNew}
          className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-brand px-4 py-2.5 text-sm font-extrabold text-brand-ink shadow-sm transition-colors hover:bg-brand-hover active:scale-[.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
        >
          <Plus className="size-4" />
          Soạn thông báo mới
        </button>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          <BoneyardSkeleton name="ann-loading" variant="row" count={5} />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-line bg-surface p-10 text-center">
          <AlertCircle className="size-9 text-negative" />
          <p className="text-sm font-medium text-content-muted">{error}</p>
          <button
            onClick={fetchList}
            className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-content transition-colors hover:bg-surface-elevated"
          >
            Thử lại
          </button>
        </div>
      ) : list.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-line bg-surface/60 p-8 text-center">
          <Megaphone className="size-10 text-content-muted/30 mb-3" />
          <p className="text-sm font-semibold text-content-muted">Chưa có thông báo nào.</p>
          <p className="mt-1 text-xs text-content-muted/60">
            Nhấn "Soạn thông báo mới" để bắt đầu.
          </p>
        </div>
      ) : (
        <div className="rounded-3xl border border-line bg-surface overflow-hidden shadow-sm">
          <ul className="divide-y divide-line">
            {list.map((item) => {
              const cfg = TYPE_CONFIG[item.type as AnnouncementType] ?? TYPE_CONFIG.info;
              const { Icon } = cfg;
              return (
                <li
                  key={item.id}
                  className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-surface-elevated/60"
                >
                  {/* Type icon */}
                  <div
                    className={`mt-0.5 shrink-0 flex size-9 items-center justify-center rounded-xl ${cfg.iconBg}`}
                  >
                    <Icon className={`size-4 ${cfg.iconColor}`} />
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Type badge */}
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cfg.badgeClass}`}
                      >
                        {cfg.label}
                      </span>

                      {/* Active / Inactive */}
                      {item.isActive ? (
                        <span className="rounded-full border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-400">
                          Hiển thị
                        </span>
                      ) : (
                        <span className="rounded-full border border-line bg-surface-elevated px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-content-muted">
                          Tắt
                        </span>
                      )}

                      {/* Pop-up badge */}
                      {item.showPopup && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:border-amber-500/20 dark:bg-amber-950/40 dark:text-amber-400">
                          <Bell className="size-2.5" />
                          Pop-up
                        </span>
                      )}

                      {/* Read count */}
                      <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-elevated px-2 py-0.5 text-[10px] font-medium text-content-muted">
                        <Users className="size-2.5" />
                        {item.readCount} đã đọc
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-content leading-snug">
                      {item.title}
                    </p>
                    <p className="text-xs text-content-muted line-clamp-1">
                      {item.content}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex items-center gap-0.5">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      title="Chỉnh sửa"
                      className="rounded-xl p-2 text-content-muted transition-colors hover:bg-surface-elevated hover:text-content focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    >
                      <Edit2 className="size-4" />
                    </button>
                    <button
                      onClick={() => handleToggle(item)}
                      title={item.isActive ? 'Tắt thông báo' : 'Bật thông báo'}
                      className="rounded-xl p-2 text-content-muted transition-colors hover:bg-surface-elevated hover:text-content focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    >
                      {item.isActive ? (
                        <ToggleRight className="size-4 text-accent" />
                      ) : (
                        <ToggleLeft className="size-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      title="Xóa"
                      className="rounded-xl p-2 text-content-muted transition-colors hover:bg-red-50 hover:text-negative dark:hover:bg-negative/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-negative/40"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* ── Compose / Edit modal (via portal) ───────────────────────────── */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {modalOpen && (
              <>
                {/* Backdrop */}
                <motion.div
                  key="ann-admin-backdrop"
                  className="fixed inset-0 z-[200] bg-slate-950/50 backdrop-blur-sm"
                  onClick={handleCloseModal}
                  {...modalMotion.backdrop}
                />

                {/* Panel */}
                <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none overflow-y-auto">
                  <motion.div
                    ref={panelRef}
                    key="ann-admin-panel"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="ann-modal-title"
                    className="pointer-events-auto w-full max-w-lg rounded-3xl border border-line bg-surface shadow-2xl my-auto"
                    {...modalMotion.panel}
                  >
                    {/* Modal header */}
                    <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-4 border-b border-line">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40">
                          <Bell className="size-4 text-amber-500" />
                        </div>
                        <h2 id="ann-modal-title" className="text-base font-black text-content">
                          {isCreating ? 'Soạn thông báo mới' : 'Chỉnh sửa thông báo'}
                        </h2>
                      </div>
                      <button
                        onClick={handleCloseModal}
                        disabled={isSaving}
                        className="rounded-xl p-2 text-content-muted transition-colors hover:bg-surface-elevated hover:text-content focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-40"
                        aria-label="Đóng"
                      >
                        <X className="size-4" />
                      </button>
                    </div>

                    {/* Modal body */}
                    <div className="px-6 py-5 space-y-4">

                      {/* Tiêu đề */}
                      <div className="space-y-1.5">
                        <FieldLabel>
                          Tiêu đề <span className="text-negative ml-0.5">*</span>
                        </FieldLabel>
                        <input
                          type="text"
                          value={formTitle}
                          onChange={(e) => setFormTitle(e.target.value)}
                          placeholder="Nhập tiêu đề thông báo..."
                          className={inputClass}
                        />
                      </div>

                      {/* Nội dung */}
                      <div className="space-y-1.5">
                        <FieldLabel>
                          Nội dung <span className="text-negative ml-0.5">*</span>
                        </FieldLabel>
                        <textarea
                          rows={5}
                          value={formContent}
                          onChange={(e) => setFormContent(e.target.value)}
                          placeholder="Nhập nội dung thông báo..."
                          className={`${inputClass} resize-none`}
                        />
                      </div>

                      {/* Loại thông báo */}
                      <div className="space-y-1.5">
                        <FieldLabel>Loại thông báo</FieldLabel>
                        <select
                          value={formType}
                          onChange={(e) => setFormType(e.target.value as AnnouncementType)}
                          className={inputClass}
                        >
                          <option value="info">Thông tin</option>
                          <option value="warning">Chú ý</option>
                          <option value="success">Tin vui</option>
                          <option value="event">Sự kiện</option>
                        </select>
                      </div>

                      {/* Đường dẫn hành động */}
                      <div className="space-y-1.5">
                        <FieldLabel optional>Đường dẫn khi nhấn nút hành động</FieldLabel>
                        <div className="relative">
                          <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-content-muted pointer-events-none" />
                          <input
                            type="url"
                            value={formActionUrl}
                            onChange={(e) => setFormActionUrl(e.target.value)}
                            placeholder="https://..."
                            className={`${inputClass} pl-9`}
                          />
                        </div>
                      </div>

                      {/* Tên nút hành động — chỉ hiện khi có URL */}
                      {formActionUrl.trim() && (
                        <div className="space-y-1.5">
                          <FieldLabel optional>Tên nút hành động</FieldLabel>
                          <input
                            type="text"
                            value={formActionLabel}
                            onChange={(e) => setFormActionLabel(e.target.value)}
                            placeholder="Ví dụ: Xem chi tiết"
                            className={inputClass}
                          />
                        </div>
                      )}

                      {/* Toggles */}
                      <div className="space-y-3 pt-3 border-t border-line">
                        <Toggle
                          checked={formShowPopup}
                          onChange={setFormShowPopup}
                          label="Hiển thị cửa sổ nhắc nhở khi học viên vào trang"
                        />
                        {isCreating && (
                          <Toggle
                            checked={formSendInApp}
                            onChange={setFormSendInApp}
                            label="Gửi vào danh sách thông báo cá nhân của học viên"
                          />
                        )}
                        <Toggle
                          checked={formIsActive}
                          onChange={setFormIsActive}
                          label="Kích hoạt ngay sau khi lưu"
                        />
                      </div>
                    </div>

                    {/* Modal footer */}
                    <div className="flex items-center justify-end gap-2.5 border-t border-line px-6 py-4">
                      <button
                        onClick={handleCloseModal}
                        disabled={isSaving}
                        className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-content-muted transition-colors hover:bg-surface-elevated hover:text-content disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={isSaving || !formTitle.trim() || !formContent.trim()}
                        className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-extrabold text-brand-ink shadow-sm transition-colors hover:bg-brand-hover active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                      >
                        {isSaving && <Loader2 className="size-4 animate-spin" />}
                        {isEditing ? 'Lưu thay đổi' : 'Đăng thông báo'}
                      </button>
                    </div>
                  </motion.div>
                </div>
              </>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
};
