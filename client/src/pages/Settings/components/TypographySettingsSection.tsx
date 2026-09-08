import React, { useState, useEffect } from 'react';
import {
  Type,
  Check,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Search,
  Loader2,
  Sliders,
  HelpCircle,
} from 'lucide-react';
import {
  DisplaySettings,
  FONT_SIZE_PRESETS,
  FONT_WEIGHT_PRESETS,
  FONT_FAMILY_PRESETS,
  DEFAULT_DISPLAY_SETTINGS,
  getStoredDisplaySettings,
  saveDisplaySettings,
  resetDisplaySettings,
  loadGoogleFont,
  DISPLAY_SETTINGS_CHANGED_EVENT,
} from '../../../services/displaySettings';

export const TypographySettingsSection: React.FC = () => {
  const [settings, setSettings] = useState<DisplaySettings>(() => getStoredDisplaySettings());
  const [customFontInput, setCustomFontInput] = useState('');
  const [isVerifyingFont, setIsVerifyingFont] = useState(false);
  const [fontError, setFontError] = useState<string | null>(null);
  const [fontSuccess, setFontSuccess] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Sync settings when external changes happen
  useEffect(() => {
    const handleSettingsChanged = (e: Event) => {
      const customEvent = e as CustomEvent<DisplaySettings>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
      }
    };

    window.addEventListener(DISPLAY_SETTINGS_CHANGED_EVENT, handleSettingsChanged);
    return () => window.removeEventListener(DISPLAY_SETTINGS_CHANGED_EVENT, handleSettingsChanged);
  }, []);

  // Update Font Size Scale
  const handleScaleChange = (scaleValue: number) => {
    setFontError(null);
    const updated = saveDisplaySettings({ fontSizeScale: scaleValue });
    setSettings(updated);
  };

  // Update Font Weight
  const handleWeightChange = (weightValue: number) => {
    setFontError(null);
    const updated = saveDisplaySettings({ fontWeight: weightValue });
    setSettings(updated);
  };

  // Select a preset font
  const handleSelectPresetFont = (fontFamily: string) => {
    setFontError(null);
    setFontSuccess(null);
    const updated = saveDisplaySettings({ fontFamily, isCustomFont: false });
    setSettings(updated);
  };

  // Apply a custom Google Font
  const handleApplyCustomFont = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanFontName = customFontInput.trim();
    setFontError(null);
    setFontSuccess(null);

    if (!cleanFontName) {
      setFontError('Vui lòng nhập tên phông chữ từ thư viện Google Fonts.');
      return;
    }

    // Validation for special characters (Google Font families only use alphanumeric, spaces, dashes)
    if (!/^[a-zA-Z0-9\s+_-]+$/.test(cleanFontName)) {
      setFontError('Tên phông chữ chứa ký tự không hợp lệ. Vui lòng chỉ dùng chữ cái và dấu gạch ngang.');
      return;
    }

    setIsVerifyingFont(true);
    try {
      const resolvedFont = await loadGoogleFont(cleanFontName);
      if (!resolvedFont) {
        setFontError(`Không tìm thấy phông chữ "${cleanFontName}" trên Google Fonts hoặc lỗi kết nối. Vui lòng kiểm tra lại chính tả tên tiếng Anh.`);
      } else {
        const updated = saveDisplaySettings({ fontFamily: resolvedFont, isCustomFont: true });
        setSettings(updated);
        setFontSuccess(`Đã áp dụng thành công phông chữ "${resolvedFont}" từ Google Fonts!`);
        setTimeout(() => setFontSuccess(null), 4000);
      }
    } catch {
      setFontError('Có lỗi xảy ra khi tải phông chữ. Vui lòng thử lại sau.');
    } finally {
      setIsVerifyingFont(false);
    }
  };

  // Reset to default
  const handleReset = () => {
    setFontError(null);
    setFontSuccess(null);
    setCustomFontInput('');
    const def = resetDisplaySettings();
    setSettings(def);
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 3000);
  };

  const isCurrentPreset = (family: string) =>
    !settings.isCustomFont && settings.fontFamily.toLowerCase() === family.toLowerCase();

  return (
    <div className="p-6 sm:p-8 space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-6">
        <div className="flex items-start gap-4">
          <div className="size-11 shrink-0 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 grid place-items-center shadow-sm">
            <Type className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-content">
                Tùy chỉnh hiển thị chữ & Phông chữ
              </h2>
              <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                Toàn trang
              </span>
            </div>
            <p className="mt-1 text-xs text-content-muted leading-relaxed">
              Tùy chỉnh cỡ chữ, phông chữ và độ đậm áp dụng tức thì trên toàn bộ trang web (bao gồm cả giao diện làm bài thi TOEIC).
            </p>
          </div>
        </div>

        {/* Reset button */}
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-line bg-surface-elevated px-3 py-2 text-xs font-bold text-content-muted transition hover:bg-surface-hover hover:text-content active:scale-95"
          title="Khôi phục toàn bộ cài đặt cỡ chữ và phông chữ về mặc định"
        >
          <RotateCcw className="size-3.5" />
          <span>Đặt lại mặc định</span>
        </button>
      </div>

      {resetSuccess && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>Đã khôi phục toàn bộ tùy chỉnh hiển thị về trạng thái gốc của hệ thống.</span>
        </div>
      )}

      {/* Live Interactive Preview Card */}
      <div className="rounded-2xl border border-line bg-surface-elevated p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-line/60 pb-2.5">
          <div className="flex items-center gap-2">
            <Sliders className="size-3.5 text-amber-500" />
            <span className="text-xs font-black uppercase tracking-wider text-content">
              Xem trước trực tiếp (Live Preview)
            </span>
          </div>
          <span className="text-[11px] font-bold text-content-muted">
            Scale: {settings.fontSizeScale}% • Weight: {settings.fontWeight} • Phông: {settings.fontFamily}
          </span>
        </div>

        <div className="rounded-xl border border-line/80 bg-surface p-4 space-y-3 shadow-inner">
          {/* Heading in brand font (Protected from custom font family changes) */}
          <h3 className="text-sm sm:text-base font-black text-content flex items-center justify-between">
            <span>Question 101: Incomplete Sentences (Part 5)</span>
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 rounded-lg bg-amber-500/10 px-2 py-0.5 border border-amber-500/20">
              Tiêu đề giữ phông thương hiệu
            </span>
          </h3>

          {/* Body Text in user-selected font, scale, and weight */}
          <p className="text-sm leading-relaxed text-content">
            Ms. Henderson requested that the revised budget proposal be submitted to the finance committee before Friday afternoon for final review and approval.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-2.5 text-amber-900 dark:text-amber-200 font-bold">
              <span className="grid size-5 place-items-center rounded-full bg-amber-500 text-amber-950 font-black text-[11px]">A</span>
              <span>timely (adjective)</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-elevated p-2.5 text-content">
              <span className="grid size-5 place-items-center rounded-full bg-line text-content-muted font-black text-[11px]">B</span>
              <span>time (noun)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Cỡ chữ (Font Size Scale) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black uppercase tracking-wider text-content">
            1. Cỡ chữ hiển thị (Scale %)
          </label>
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
            Hiện tại: {settings.fontSizeScale}%
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {FONT_SIZE_PRESETS.map((preset) => {
            const isSelected = settings.fontSizeScale === preset.value;
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => handleScaleChange(preset.value)}
                className={`group relative flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all active:scale-98 ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20 shadow-sm'
                    : 'border-line bg-surface hover:border-amber-400/50 hover:bg-surface-hover'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-black text-content">{preset.label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-black ${isSelected ? 'text-amber-600 dark:text-amber-400' : 'text-content-muted'}`}>
                      {preset.value}%
                    </span>
                    <div
                      className={`grid size-4 shrink-0 place-items-center rounded-full transition-all ${
                        isSelected
                          ? 'bg-amber-500 text-amber-950 shadow-xs ring-2 ring-amber-500/20'
                          : 'border border-line/80 bg-surface-elevated text-transparent'
                      }`}
                    >
                      <Check className={`size-2.5 stroke-[3] transition-transform ${isSelected ? 'scale-100' : 'scale-0'}`} />
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-content-muted leading-snug">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Độ đậm chữ (Font Weight) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black uppercase tracking-wider text-content">
            2. Độ đậm chữ thân trang (Font Weight)
          </label>
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
            Hiện tại: {settings.fontWeight}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {FONT_WEIGHT_PRESETS.map((weightPreset) => {
            const isSelected = settings.fontWeight === weightPreset.value;
            return (
              <button
                key={weightPreset.value}
                type="button"
                onClick={() => handleWeightChange(weightPreset.value)}
                className={`group relative flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all active:scale-98 ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20 shadow-sm'
                    : 'border-line bg-surface hover:border-amber-400/50 hover:bg-surface-hover'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-sm font-black text-content">{weightPreset.label}</span>
                    <div className="mt-0.5 text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400">
                      {weightPreset.weightName}
                    </div>
                  </div>
                  <div
                    className={`grid size-4 shrink-0 place-items-center rounded-full transition-all mt-0.5 ${
                      isSelected
                        ? 'bg-amber-500 text-amber-950 shadow-xs ring-2 ring-amber-500/20'
                        : 'border border-line/80 bg-surface-elevated text-transparent'
                    }`}
                  >
                    <Check className={`size-2.5 stroke-[3] transition-transform ${isSelected ? 'scale-100' : 'scale-0'}`} />
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-content-muted leading-tight">
                  {weightPreset.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Phông chữ (Font Family) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black uppercase tracking-wider text-content">
            3. Phông chữ thân trang (Font Family)
          </label>
          <span className="text-[11px] font-bold text-content-muted">
            {settings.isCustomFont ? 'Google Font tùy chỉnh' : 'Phông có sẵn'}
          </span>
        </div>

        {/* Preset Fonts Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {FONT_FAMILY_PRESETS.map((preset) => {
            const isSelected = isCurrentPreset(preset.fontFamily);
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPresetFont(preset.fontFamily)}
                className={`group relative flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all active:scale-98 ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20 shadow-sm'
                    : 'border-line bg-surface hover:border-amber-400/50 hover:bg-surface-hover'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-black text-content">{preset.name}</span>
                    <div className="flex items-center gap-1.5">
                      {preset.isPreloaded && (
                        <span className="rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[9px] font-black uppercase">
                          Sẵn có
                        </span>
                      )}
                      <div
                        className={`grid size-4 shrink-0 place-items-center rounded-full transition-all ${
                          isSelected
                            ? 'bg-amber-500 text-amber-950 shadow-xs ring-2 ring-amber-500/20'
                            : 'border border-line/80 bg-surface-elevated text-transparent'
                        }`}
                      >
                        <Check className={`size-2.5 stroke-[3] transition-transform ${isSelected ? 'scale-100' : 'scale-0'}`} />
                      </div>
                    </div>
                  </div>
                  {/* Sample specimen rendered in that font */}
                  <div
                    style={{ fontFamily: `"${preset.fontFamily}", sans-serif` }}
                    className="mt-2 text-sm text-content truncate border-t border-line/60 pt-1.5"
                  >
                    Học từ vựng TOEIC AaBb
                  </div>
                </div>

                <p className="mt-2 text-[10px] text-content-muted leading-tight">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Custom Google Font Input */}
        <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5 space-y-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Search className="size-4 text-amber-500" />
            <h4 className="text-xs font-black uppercase tracking-wider text-content">
              Nhập phông chữ Google Font bất kỳ
            </h4>
          </div>

          <p className="text-xs text-content-muted leading-relaxed">
            Bạn có thể nhập tên bất kỳ phông nào trên Google Fonts (ví dụ: <code className="rounded bg-surface-elevated px-1.5 py-0.5 font-bold text-amber-700 dark:text-amber-300">Montserrat</code>, <code className="rounded bg-surface-elevated px-1.5 py-0.5 font-bold text-amber-700 dark:text-amber-300">Poppins</code>, <code className="rounded bg-surface-elevated px-1.5 py-0.5 font-bold text-amber-700 dark:text-amber-300">Lexend</code>, <code className="rounded bg-surface-elevated px-1.5 py-0.5 font-bold text-amber-700 dark:text-amber-300">Quicksand</code>). Hệ thống sẽ kiểm tra và tải phông tự động.
          </p>

          <form onSubmit={handleApplyCustomFont} className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <div className="relative flex-1">
              <input
                type="text"
                value={customFontInput}
                onChange={(e) => {
                  setCustomFontInput(e.target.value);
                  setFontError(null);
                }}
                placeholder="Nhập tên Google Font (ví dụ: Montserrat, Lexend...)"
                className="w-full rounded-xl border border-line bg-surface-elevated px-4 py-2.5 text-xs font-bold text-content outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
              />
            </div>

            <button
              type="submit"
              disabled={isVerifyingFont || !customFontInput.trim()}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 px-5 text-xs font-black text-amber-950 shadow-md shadow-amber-500/20 transition hover:brightness-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isVerifyingFont ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Đang kiểm tra phông...</span>
                </>
              ) : (
                <>
                  <Check className="size-3.5 stroke-[2.5]" />
                  <span>Áp dụng phông</span>
                </>
              )}
            </button>
          </form>

          {/* Active Custom Font Status */}
          {settings.isCustomFont && (
            <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-bold text-amber-900 dark:text-amber-200">
              <span>Đang áp dụng Google Font: <strong className="font-black text-amber-700 dark:text-amber-300">{settings.fontFamily}</strong></span>
              <button
                type="button"
                onClick={() => handleSelectPresetFont('Inter')}
                className="text-[11px] font-bold text-amber-700 dark:text-amber-400 underline hover:no-underline"
              >
                Về mặc định
              </button>
            </div>
          )}

          {/* Error message */}
          {fontError && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-bold text-rose-600 dark:text-rose-400" role="alert">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{fontError}</span>
            </div>
          )}

          {/* Success message */}
          {fontSuccess && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>{fontSuccess}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
