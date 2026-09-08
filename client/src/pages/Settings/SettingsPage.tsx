import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Settings, Bell, Moon, Sun, Volume2, Globe, LogOut, CheckCircle2, Cpu, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { aiPreferenceService } from '../../services/aiPreference';
import { ChromeAiAvailability, chromeAiService } from '../../services/chromeAi';
import { AiSourcePreference } from '../../types';
import { notificationPreferencesService } from '../../services/notificationPreferences';
import { backendService } from '../../services/backend';
import { useNotifications } from '../../context/NotificationContext';
import { TypographySettingsSection } from './components/TypographySettingsSection';

export const SettingsPage: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const { refreshNotifications } = useNotifications();
  const navigate = useNavigate();

  const initialNotificationPreferences = notificationPreferencesService.get();
  const [notifications, setNotifications] = useState(initialNotificationPreferences.studyReminders);
  const [reminderTime, setReminderTime] = useState(initialNotificationPreferences.reminderTime);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [aiPreference, setAiPreference] = useState<AiSourcePreference>(() => aiPreferenceService.get());
  const [localAiAvailability, setLocalAiAvailability] = useState<ChromeAiAvailability>('checking');

  const refreshLocalAiAvailability = async () => {
    setLocalAiAvailability('checking');
    setLocalAiAvailability(await chromeAiService.getAvailability(true));
  };

  useEffect(() => {
    void refreshLocalAiAvailability();
  }, []);

  useEffect(() => {
    let active = true;
    void backendService.getNotificationPreferences()
      .then((preferences) => {
        if (!active) return;
        setNotifications(preferences.studyReminders);
        setReminderTime(preferences.reminderTime);
        notificationPreferencesService.set(preferences);
      })
      .catch(() => {
        // Keep the local per-device preference when the API is temporarily unavailable.
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSaveSettings = () => {
    setSettingsError('');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleAiPreference = () => {
    const nextPreference = aiPreference === 'local' ? 'gemini' : 'local';
    setAiPreference(nextPreference);
    aiPreferenceService.set(nextPreference);
    if (nextPreference === 'local') void refreshLocalAiAvailability();
    handleSaveSettings();
  };

  const saveNotificationPreferences = async (studyReminders: boolean, time: string) => {
    notificationPreferencesService.set({ studyReminders, reminderTime: time });
    try {
      await backendService.updateNotificationPreferences({ studyReminders, reminderTime: time });
      handleSaveSettings();
      await refreshNotifications();
    } catch {
      setSavedSuccess(false);
      setSettingsError('Đã lưu trên thiết bị nhưng chưa thể đồng bộ với máy chủ.');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-content flex items-center gap-3">
            <Settings className="w-8 h-8 text-brand-600" />
            <span>Cài đặt hệ thống</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Tùy chỉnh thông báo, giao diện, âm thanh và nguồn AI từ điển.</p>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Đã lưu cài đặt
        </div>
      )}

      {settingsError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200" role="alert">
          {settingsError}
        </div>
      )}

      {/* Settings List */}
      <div className="bg-white dark:bg-surface-elevated rounded-3xl border border-slate-200 dark:border-line shadow-sm divide-y divide-slate-100 dark:divide-line overflow-hidden">
        {/* Dark Mode Toggle */}
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </div>
            <div>
              <div className="font-bold text-sm text-slate-800 dark:text-content">Giao diện Tối / Sáng (Dark Mode)</div>
              <div className="text-xs text-slate-500">Bật/tắt chế độ tối dịu mắt khi học ban đêm</div>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className={`w-12 h-6 rounded-full transition-colors relative p-1 ${isDarkMode ? 'bg-brand' : 'bg-slate-300'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* Typography & Display Settings Section */}
        <TypographySettingsSection />

        {/* Study Reminder Notifications */}
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-600 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-800 dark:text-content">Nhắc nhở học tập hàng ngày</div>
              <div className="text-xs text-slate-500">Nhận thông báo nhắc học để duy trì chuỗi ngày liên tục</div>
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-3">
            <input
              type="time"
              value={reminderTime}
              onChange={(event) => {
                setReminderTime(event.target.value);
                void saveNotificationPreferences(notifications, event.target.value);
              }}
              disabled={!notifications}
              aria-label="Giờ nhắc học hàng ngày"
              className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-line dark:bg-surface-hover dark:text-content"
            />
            <button
              type="button"
              onClick={() => {
                const nextValue = !notifications;
                setNotifications(nextValue);
                void saveNotificationPreferences(nextValue, reminderTime);
              }}
              role="switch"
              aria-checked={notifications}
              aria-label="Bật nhắc nhở học tập hàng ngày"
              className={`relative h-6 w-12 rounded-full p-1 transition-colors focus:outline-none focus:ring-4 focus:ring-brand-500/15 ${notifications ? 'bg-brand' : 'bg-slate-300 dark:bg-surface-hover'}`}
            >
              <span className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${notifications ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        {/* Audio Effects */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-600 flex items-center justify-center">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-800 dark:text-content">Âm thanh hiệu ứng bài học</div>
              <div className="text-xs text-slate-500">Phát âm thanh phản hồi khi trả lời đúng / sai</div>
            </div>
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`w-12 h-6 rounded-full transition-colors relative p-1 ${soundEnabled ? 'bg-brand' : 'bg-slate-300'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${soundEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* AI Dictionary Source */}
        <div className="p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 shrink-0 rounded-2xl bg-brand-500/10 text-brand-600 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-800 dark:text-content">Ưu tiên AI Local cho từ điển</div>
              <div className="mt-0.5 max-w-xl text-xs leading-relaxed text-slate-500">
                Dùng Gemini Nano trên Chrome khi khả dụng. Nếu thiết bị không hỗ trợ hoặc model gặp lỗi,
                ứng dụng sẽ tự động chuyển sang Gemini API.
              </div>
              <div className={`mt-2 text-[11px] font-semibold ${
                localAiAvailability === 'available'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : localAiAvailability === 'downloadable' || localAiAvailability === 'downloading'
                    ? 'text-amber-600 dark:text-amber-400'
                    : localAiAvailability === 'insecure-context'
                      ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-400'
              }`}>
                {localAiAvailability === 'checking' && 'Đang kiểm tra Chrome AI...'}
                {localAiAvailability === 'available' && 'Chrome AI đã sẵn sàng trên thiết bị này'}
                {localAiAvailability === 'downloadable' && 'Chrome AI khả dụng; model sẽ được tải khi bạn tra từ lần đầu'}
                {localAiAvailability === 'downloading' && 'Chrome đang tải Gemini Nano; vui lòng giữ trình duyệt mở'}
                {localAiAvailability === 'insecure-context' && 'Chrome AI bị chặn vì trang đang mở qua HTTP/IP LAN. Hãy dùng localhost hoặc HTTPS.'}
                {localAiAvailability === 'unavailable' && 'Chrome chưa cung cấp Prompt API cho trang này; Gemini API sẽ được sử dụng'}
              </div>
              <button
                type="button"
                onClick={() => void refreshLocalAiAvailability()}
                disabled={localAiAvailability === 'checking'}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold text-brand-700 transition-colors hover:bg-brand-50 disabled:cursor-wait disabled:opacity-60 dark:text-brand-200 dark:hover:bg-brand-500/10"
              >
                <RefreshCw className={`size-3 ${localAiAvailability === 'checking' ? 'animate-spin' : ''}`} />
                Kiểm tra lại AI Local
              </button>
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
            <span className="text-xs font-bold text-slate-600 dark:text-content-muted">
              {aiPreference === 'local' ? 'AI Local' : 'Gemini API'}
            </span>
            <button
              type="button"
              onClick={toggleAiPreference}
              role="switch"
              aria-checked={aiPreference === 'local'}
              aria-label="Ưu tiên AI Local cho từ điển"
              className={`relative h-6 w-12 rounded-full p-1 transition-colors ${aiPreference === 'local' ? 'bg-brand' : 'bg-slate-300 dark:bg-surface-hover'}`}
            >
              <span className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${aiPreference === 'local' ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        {/* Language Selection */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-800 dark:text-content">Ngôn ngữ hiển thị</div>
              <div className="text-xs text-slate-500">Chọn ngôn ngữ ứng dụng</div>
            </div>
          </div>
          <select className="px-3 py-1.5 text-xs bg-slate-100 dark:bg-surface-hover border-none rounded-xl font-bold">
            <option value="vi">Tiếng Việt (Việt Nam)</option>
            <option value="en">English (US)</option>
          </select>
        </div>

        {/* Logout */}
        <div className="p-6 flex items-center justify-between bg-red-50/50 dark:bg-red-950/20">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-red-600 dark:text-red-400">Đăng xuất khỏi thiết bị này</div>
              <div className="text-xs text-slate-500">Xóa phiên làm việc hiện tại</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md shadow-red-600/20"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
};
