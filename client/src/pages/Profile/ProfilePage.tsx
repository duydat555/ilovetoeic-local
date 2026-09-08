import React, { useEffect, useRef, useState } from 'react';
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
  Shuffle,
  Target,
  Upload,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DICEBEAR_STYLES, getDiceBearAvatar, getRandomSeed } from '../../utils/avatar';
import { compressImageToFullHD } from '../../utils/imageCompressor';

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

const DiceBearAvatarSelector: React.FC<{
  currentAvatar: string;
  userName: string;
  onSelectAvatar: (url: string) => void;
}> = ({ currentAvatar, userName, onSelectAvatar }) => {
  const [selectedStyle, setSelectedStyle] = useState('avataaars');
  const [seed, setSeed] = useState(userName || 'student');

  const handleSelectStyle = (styleId: string) => {
    setSelectedStyle(styleId);
    onSelectAvatar(getDiceBearAvatar(seed, styleId));
  };

  const handleRandomize = () => {
    const newSeed = getRandomSeed();
    setSeed(newSeed);
    onSelectAvatar(getDiceBearAvatar(newSeed, selectedStyle));
  };

  const presetSeeds = [
    'toeic-ace', 'star-learner', 'hero-500', 'pro-master',
    'sunny-day', 'sky-high', 'spark-750', 'crown-900',
  ];

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-line dark:bg-surface/50">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <span className="text-xs font-bold text-slate-700 dark:text-content">
          Hoặc chọn Avatar mẫu từ DiceBear
        </span>
        <button
          type="button"
          onClick={handleRandomize}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-600 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-300 transition"
        >
          <Shuffle className="size-3.5" /> Tạo ngẫu nhiên
        </button>
      </div>

      <div className="flex max-w-full overflow-x-auto gap-1.5 pb-2.5 [scrollbar-width:none]">
        {DICEBEAR_STYLES.map((style) => (
          <button
            key={style.id}
            type="button"
            onClick={() => handleSelectStyle(style.id)}
            className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
              selectedStyle === style.id
                ? 'bg-brand text-brand-ink shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-surface-elevated dark:text-content-muted'
            }`}
          >
            {style.name}
          </button>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-8">
        {presetSeeds.map((presetSeed) => {
          const avatarUrl = getDiceBearAvatar(presetSeed, selectedStyle);
          const isSelected = currentAvatar === avatarUrl;
          return (
            <button
              key={presetSeed}
              type="button"
              onClick={() => onSelectAvatar(avatarUrl)}
              className={`group relative grid size-12 place-items-center rounded-xl border p-1 transition ${
                isSelected
                  ? 'border-brand bg-brand-50 ring-2 ring-brand-500/30 dark:bg-brand-500/10'
                  : 'border-slate-200 bg-white hover:border-brand-300 dark:border-line dark:bg-surface-elevated'
              }`}
              title={`Chọn avatar ${presetSeed}`}
            >
              <img src={avatarUrl} alt="" className="size-full rounded-lg object-cover" />
              {isSelected && (
                <span className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-brand text-[9px] font-black text-brand-ink shadow-sm">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const ProfilePage: React.FC = () => {
  const { user, updateProfile, updatePassword } = useAuth();
  const [name, setName] = useState('');
  const [familyMiddleName, setFamilyMiddleName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [targetScore, setTargetScore] = useState(750);
  const [examDate, setExamDate] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<Message>(null);

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<Message>(null);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setFamilyMiddleName(user.familyMiddleName || '');
    setEmail(user.email);
    setAvatar(user.avatar);
    setTargetScore(user.targetScore);
    setExamDate(user.examDate);
  }, [user]);

  if (!user) return null;

  const handleAvatarFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setProfileMessage(null);

    try {
      // Compress image file to max FullHD (1920x1080) under the hood
      const result = await compressImageToFullHD(file, 1920, 0.85);
      setAvatar(result.dataUrl);
    } catch (err) {
      console.error('[!] Avatar upload error:', err);
      const errMsg = err instanceof Error ? err.message : 'Không thể tải ảnh lên.';
      setProfileMessage({ type: 'error', text: errMsg });
    } finally {
      setUploading(false);
      if (event.target) event.target.value = '';
    }
  };

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
        familyMiddleName,
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

  return (
    <div className="mx-auto max-w-4xl space-y-7 animate-in fade-in duration-300">
      {/* Hidden File Input for Avatar */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleAvatarFileSelect}
        className="hidden"
      />

      {/* Header Profile Section */}
      <section className="flex flex-col items-center gap-6 rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:flex-row sm:p-8 sm:text-left dark:border-line dark:bg-surface-elevated">
        <div
          className="relative group cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
          title="Bấm để thay đổi ảnh đại diện"
        >
          <img
            src={avatar || user.avatar || getDiceBearAvatar(user.name)}
            alt={user.name}
            className="size-24 rounded-full object-cover shadow-md ring-4 ring-brand/15 transition group-hover:opacity-85"
          />
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-950/40 opacity-0 group-hover:opacity-100 transition">
            <Camera className="size-6 text-white" />
          </div>
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-950/70 text-white">
              <Loader2 className="size-7 animate-spin text-brand" />
            </div>
          )}
        </div>

        <div className="space-y-1 flex-1">
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

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2.5 text-xs font-extrabold text-brand-ink shadow-md transition hover:bg-brand-hover active:scale-95 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {uploading ? 'Đang tải ảnh...' : 'Chọn ảnh mới'}
        </button>
      </section>

      {/* Main Profile Info Section */}
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-1">
            <label>
              <span className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-content-muted">
                {user.role === 'admin' ? 'Họ và tên' : 'Tên và khóa'}
              </span>
              <div className="relative">
                <UserRound className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  maxLength={80}
                  autoComplete="name"
                  placeholder={user.role === 'admin' ? 'Họ và tên' : 'Đạt_K38'}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 dark:border-line dark:bg-surface-hover/50 dark:text-content dark:focus:border-brand dark:focus:bg-slate-800 dark:focus:ring-brand-500/10"
                />
              </div>
            </label>
            {user.role !== 'admin' && (
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-content-muted">Họ và tên đệm</span>
                <div className="relative">
                  <UserRound className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={familyMiddleName}
                    onChange={(event) => setFamilyMiddleName(event.target.value)}
                    maxLength={100}
                    placeholder="Nguyễn Văn"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 dark:border-line dark:bg-surface-hover/50 dark:text-content dark:focus:border-brand dark:focus:bg-slate-800 dark:focus:ring-brand-500/10"
                  />
                </div>
              </label>
            )}
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

          <DiceBearAvatarSelector
            currentAvatar={avatar}
            userName={name || user.name}
            onSelectAvatar={(selectedUrl) => setAvatar(selectedUrl)}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
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
            disabled={profileSaving || uploading}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-xs font-bold text-brand-ink shadow-md shadow-brand-600/20 transition hover:bg-brand-hover active:scale-[.99] disabled:cursor-wait disabled:opacity-70"
          >
            {profileSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {profileSaving ? 'Đang lưu...' : 'Lưu thông tin'}
          </button>
        </form>
      </section>

      {/* Password Section */}
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
          <label className="block">
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
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 dark:border-line dark:bg-slate-800 dark:focus:ring-brand-500/10"
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
