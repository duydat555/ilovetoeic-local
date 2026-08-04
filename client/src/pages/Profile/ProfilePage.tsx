import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  Flame,
  KeyRound,
  Loader2,
  Mail,
  Save,
  ShieldCheck,
  Target,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type Message = {
  type: 'success' | 'error';
  text: string;
} | null;

const getErrorMessage = (reason: unknown) => {
  const message = reason instanceof Error ? reason.message : 'Đã xảy ra lỗi. Vui lòng thử lại.';
  const normalized = message.toLocaleLowerCase('en');
  if (normalized.includes('email address') && normalized.includes('invalid')) {
    return 'Địa chỉ email không hợp lệ.';
  }
  if (normalized.includes('already registered') || normalized.includes('already been registered')) {
    return 'Email này đã được sử dụng bởi tài khoản khác.';
  }
  if (normalized.includes('password should be')) {
    return 'Mật khẩu mới chưa đáp ứng yêu cầu bảo mật.';
  }
  if (normalized.includes('new password should be different')) {
    return 'Mật khẩu mới phải khác mật khẩu hiện tại.';
  }
  return message;
};

export const ProfilePage: React.FC = () => {
  const { user, updateProfile, updatePassword } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [targetScore, setTargetScore] = useState(750);
  const [examDate, setExamDate] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<Message>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<Message>(null);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email);
    setAvatar(user.avatar);
    setTargetScore(user.targetScore);
    setExamDate(user.examDate);
  }, [user]);

  if (!user) return null;

  const handleProfileSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileMessage(null);
    setProfileSaving(true);
    try {
      const result = await updateProfile({
        name,
        email,
        avatar,
        targetScore,
        examDate,
      });
      setProfileMessage({
        type: 'success',
        text: result.emailConfirmationRequired
          ? 'Thông tin đã cập nhật. Hãy kiểm tra hộp thư mới để xác nhận thay đổi email.'
          : 'Thông tin cá nhân đã được cập nhật thành công.',
      });
    } catch (reason) {
      setProfileMessage({ type: 'error', text: getErrorMessage(reason) });
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordMessage(null);

    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 8 ký tự.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp.' });
      return;
    }
    if (currentPassword && currentPassword === newPassword) {
      setPasswordMessage({ type: 'error', text: 'Mật khẩu mới phải khác mật khẩu hiện tại.' });
      return;
    }

    setPasswordSaving(true);
    try {
      await updatePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage({ type: 'success', text: 'Mật khẩu đã được cập nhật thành công.' });
    } catch (reason) {
      setPasswordMessage({ type: 'error', text: getErrorMessage(reason) });
    } finally {
      setPasswordSaving(false);
    }
  };

  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toLocaleUpperCase('vi');

  return (
    <div className="mx-auto max-w-4xl space-y-7 animate-in fade-in duration-300">
      <section className="flex flex-col items-center gap-6 rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:flex-row sm:p-8 sm:text-left dark:border-line dark:bg-surface-elevated">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className="size-24 rounded-full object-cover shadow-md ring-4 ring-brand/15"
          />
        ) : (
          <div className="grid size-24 place-items-center rounded-full bg-brand-50 text-2xl font-extrabold text-brand-600 shadow-md ring-4 ring-brand/15 dark:bg-brand-500/10 dark:text-brand-300">
            {initials || 'HV'}
          </div>
        )}
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-content">{user.name}</h1>
          <p className="flex items-center justify-center gap-1 text-xs text-slate-500 sm:justify-start">
            <Mail className="size-4" /> {user.email}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 sm:justify-start">
            <span className="rounded-full bg-brand-500/10 px-3 py-1 text-xs font-bold text-brand-600 dark:text-brand-300">
              Điểm hiện tại: {user.currentScore}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
              <Flame className="size-3.5 fill-amber-500" /> {user.streakDays} ngày liên tiếp
            </span>
          </div>
        </div>
      </section>

      <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-line dark:bg-surface-elevated">
        <div className="flex items-start gap-3 border-b border-slate-100 pb-4 dark:border-line">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
            <UserRound className="size-[18px]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-content">Thông tin cá nhân</h2>
            <p className="mt-0.5 text-xs text-slate-500">Thông tin này được đồng bộ với tài khoản của bạn.</p>
          </div>
        </div>

        {profileMessage && (
          <div className={`flex items-start gap-2 rounded-xl border p-3 text-xs font-semibold ${
            profileMessage.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400'
          }`}>
            {profileMessage.type === 'success'
              ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              : <AlertCircle className="mt-0.5 size-4 shrink-0" />}
            {profileMessage.text}
          </div>
        )}

        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-content-muted">Họ và tên</span>
              <div className="relative">
                <UserRound className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  maxLength={80}
                  autoComplete="name"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 dark:border-line dark:bg-surface-hover/50 dark:text-content dark:focus:border-brand dark:focus:bg-slate-800 dark:focus:ring-brand-500/10"
                />
              </div>
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-content-muted">Email</span>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 dark:border-line dark:bg-surface-hover/50 dark:text-content dark:focus:border-brand dark:focus:bg-slate-800 dark:focus:ring-brand-500/10"
                />
              </div>
            </label>
          </div>

          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-content-muted">URL ảnh đại diện</span>
            <div className="relative">
              <Camera className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="url"
                value={avatar}
                onChange={(event) => setAvatar(event.target.value)}
                placeholder="https://..."
                autoComplete="photo"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 dark:border-line dark:bg-surface-hover/50 dark:text-content dark:focus:border-brand dark:focus:bg-slate-800 dark:focus:ring-brand-500/10"
              />
            </div>
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-content-muted">Mục tiêu điểm TOEIC</span>
              <div className="relative">
                <Target className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={targetScore}
                  onChange={(event) => setTargetScore(Number(event.target.value))}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 dark:border-line dark:bg-surface-hover/50 dark:text-content dark:focus:border-brand dark:focus:bg-slate-800 dark:focus:ring-brand-500/10"
                >
                  {[450, 500, 600, 650, 750, 850, 900].map((score) => (
                    <option key={score} value={score}>{score}+ TOEIC</option>
                  ))}
                </select>
              </div>
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-content-muted">Ngày thi dự kiến</span>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={examDate}
                  onChange={(event) => setExamDate(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 dark:border-line dark:bg-surface-hover/50 dark:text-content dark:focus:border-brand dark:focus:bg-slate-800 dark:focus:ring-brand-500/10"
                />
              </div>
            </label>
          </div>

          <button
            type="submit"
            disabled={profileSaving}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-xs font-bold text-brand-ink shadow-md shadow-brand-600/20 transition hover:bg-brand-hover active:scale-[.99] disabled:cursor-wait disabled:opacity-70"
          >
            {profileSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {profileSaving ? 'Đang lưu...' : 'Lưu thông tin'}
          </button>
        </form>
      </section>

      <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-line dark:bg-surface-elevated">
        <div className="flex items-start gap-3 border-b border-slate-100 pb-4 dark:border-line">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
            <ShieldCheck className="size-[18px]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-content">Mật khẩu & bảo mật</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              Tài khoản email cần nhập mật khẩu hiện tại. Nếu bạn chỉ đăng nhập bằng Google và chưa có mật khẩu,
              có thể để trống ô này để đặt mật khẩu lần đầu.
            </p>
          </div>
        </div>

        {passwordMessage && (
          <div className={`flex items-start gap-2 rounded-xl border p-3 text-xs font-semibold ${
            passwordMessage.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400'
          }`}>
            {passwordMessage.type === 'success'
              ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              : <AlertCircle className="mt-0.5 size-4 shrink-0" />}
            {passwordMessage.text}
          </div>
        )}

        <form onSubmit={handlePasswordSave} className="space-y-4">
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-content-muted">Mật khẩu hiện tại</span>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showPasswords ? 'text' : 'password'}
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="Bỏ trống nếu tài khoản chỉ đăng nhập Google"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-11 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 dark:border-line dark:bg-surface-hover/50 dark:text-content dark:focus:border-brand dark:focus:bg-slate-800 dark:focus:ring-brand-500/10"
              />
              <button
                type="button"
                onClick={() => setShowPasswords((current) => !current)}
                aria-label={showPasswords ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="absolute right-2.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-surface-hover dark:hover:text-white"
              >
                {showPasswords ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-content-muted">Mật khẩu mới</span>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Tối thiểu 8 ký tự"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 dark:border-line dark:bg-surface-hover/50 dark:text-content dark:focus:border-brand dark:focus:bg-slate-800 dark:focus:ring-brand-500/10"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-content-muted">Xác nhận mật khẩu mới</span>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Nhập lại mật khẩu mới"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 dark:border-line dark:bg-surface-hover/50 dark:text-content dark:focus:border-brand dark:focus:bg-slate-800 dark:focus:ring-brand-500/10"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={passwordSaving}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-xs font-bold text-white shadow-md transition hover:bg-slate-800 active:scale-[.99] disabled:cursor-wait disabled:opacity-70 dark:bg-brand dark:text-brand-ink dark:hover:bg-brand-hover"
          >
            {passwordSaving ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            {passwordSaving ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
          </button>
        </form>
      </section>
    </div>
  );
};
