import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { GraduationCap, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { getModalMotion } from '../common/modalMotion';

const NAME_PATTERN = /^[^\s_]+_K[1-9]\d{0,2}$/i;

interface StudentIdentityModalProps {
  open: boolean;
}

export const StudentIdentityModal: React.FC<StudentIdentityModalProps> = ({ open }) => {
  const { user, updateRankingIdentity } = useAuth();
  const reduceMotion = useReducedMotion();
  const modalMotion = useMemo(() => getModalMotion(reduceMotion), [reduceMotion]);
  const panelRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState(user?.hasValidRankingName ? user.name : '');
  const [familyMiddleName, setFamilyMiddleName] = useState(user?.familyMiddleName || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>('input, button:not([disabled])'),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedName = name.trim();
    if (!NAME_PATTERN.test(normalizedName)) {
      setError('Tên phải đúng cú pháp Tên_Ksốkhóa, ví dụ: Đạt_K38.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateRankingIdentity(normalizedName, familyMiddleName.trim());
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Không thể lưu tên. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="student-ranking-identity"
          {...modalMotion.backdrop}
          className="fixed inset-0 z-[200] grid h-[100dvh] w-screen place-items-center overflow-y-auto bg-slate-950/65 p-4 backdrop-blur-md"
        >
          <motion.div
            ref={panelRef}
            {...modalMotion.panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-identity-title"
            className="w-full max-w-lg rounded-3xl border border-line bg-surface p-6 shadow-2xl sm:p-8"
          >
            <div className="mb-5 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <GraduationCap className="size-6" />
            </div>
            <h2 id="student-identity-title" className="text-2xl font-black text-content">
              Hoàn thiện tên Học sinh
            </h2>
            <p className="mt-2 text-sm leading-6 text-content-muted">
              Tên này dùng để xác định khóa và hiển thị trên Bảng xếp hạng. Bạn cần hoàn tất trước khi tiếp tục sử dụng website.
            </p>

            <form className="mt-6 space-y-4" onSubmit={submit}>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-content">Tên và khóa</span>
                <input
                  autoFocus
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Đạt_K38"
                  maxLength={100}
                  className="w-full rounded-xl border border-line bg-canvas px-4 py-3 text-content outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
                <span className="mt-1.5 block text-xs text-content-muted">Cú pháp bắt buộc: Tên_Ksốkhóa, không có khoảng trắng.</span>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-content">Họ và tên đệm (không bắt buộc)</span>
                <input
                  value={familyMiddleName}
                  onChange={(event) => setFamilyMiddleName(event.target.value)}
                  placeholder="Nguyễn Văn"
                  maxLength={100}
                  className="w-full rounded-xl border border-line bg-canvas px-4 py-3 text-content outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </label>

              {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 font-extrabold text-brand-ink shadow-md shadow-brand-600/20 transition hover:bg-brand-hover active:scale-[.99] disabled:cursor-wait disabled:opacity-70"
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                {saving ? 'Đang lưu...' : 'Lưu và tiếp tục'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
