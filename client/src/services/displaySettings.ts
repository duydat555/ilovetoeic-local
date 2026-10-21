/**
 * Display & Typography Settings Service
 * Handles font size scaling, body font family (presets + custom Google Fonts),
 * and font weight with per-device localStorage persistence and zero-flash pre-mount execution.
 */

export interface DisplaySettings {
  fontSizeScale: number; // 90, 100, 110, 125 (%)
  fontFamily: string; // e.g. 'Inter', 'Be Vietnam Pro', 'Roboto', or custom Google Font
  isCustomFont?: boolean;
  fontWeight: number; // 300, 400, 600
}

export interface FontPreset {
  id: string;
  name: string;
  fontFamily: string;
  category: 'sans-serif' | 'serif';
  description: string;
  googleFontName?: string;
  isPreloaded?: boolean;
}

export const FONT_SCALE_ACTUAL_MAP: Record<number, number> = {
  90: 0.80,   // Displayed as 90%, actual scale 80% (12.8px base) - compact & allows much more content
  100: 1.00,  // Displayed as 100%, actual scale 100% (16.0px base) - standard baseline
  110: 1.15,  // Displayed as 110%, actual scale 115% (18.4px base) - comfortably enlarged
  125: 1.30,  // Displayed as 125%, actual scale 130% (20.8px base) - maximum accessibility
};

export const getActualFontScale = (scaleValue: number): number => {
  if (FONT_SCALE_ACTUAL_MAP[scaleValue] !== undefined) {
    return FONT_SCALE_ACTUAL_MAP[scaleValue];
  }
  // Only the four supported presets may affect the entire app. Corrupt cached
  // values can otherwise make every rem-based element effectively invisible.
  return 1;
};

export const FONT_SIZE_PRESETS = [
  { value: 90, label: 'Nhỏ', description: '90% - Nhỏ gọn thực tế, hiển thị tối đa nội dung' },
  { value: 100, label: 'Chuẩn', description: '100% - Cỡ chữ mặc định tiêu chuẩn' },
  { value: 110, label: 'Lớn', description: '110% - Dễ đọc, giảm mỏi mắt khi học lâu' },
  { value: 125, label: 'Rất lớn', description: '125% - Phóng to rõ nét vượt trội' },
];

export const FONT_WEIGHT_PRESETS = [
  { value: 300, label: 'Mảnh', weightName: 'Light (300)', description: 'Nét chữ thanh thoát, tinh tế' },
  { value: 400, label: 'Thường', weightName: 'Regular (400)', description: 'Độ đậm tiêu chuẩn cân bằng' },
  { value: 600, label: 'Đậm', weightName: 'Medium / Semi-bold (600)', description: 'Nét đậm rõ ràng, độ tương phản cao' },
];

export const FONT_FAMILY_PRESETS: FontPreset[] = [
  {
    id: 'inter',
    name: 'Inter',
    fontFamily: 'Inter',
    category: 'sans-serif',
    description: 'Phông chữ tiêu chuẩn của hệ thống, độ sắc nét cao',
    isPreloaded: true,
  },
  {
    id: 'be-vietnam-pro',
    name: 'Be Vietnam Pro',
    fontFamily: 'Be Vietnam Pro',
    category: 'sans-serif',
    description: 'Thiết kế riêng tối ưu dấu thanh và hiển thị Tiếng Việt',
    isPreloaded: true,
  },
  {
    id: 'roboto',
    name: 'Roboto',
    fontFamily: 'Roboto',
    category: 'sans-serif',
    description: 'Hiện đại, thanh thoát, phổ biến trên thiết bị số',
    googleFontName: 'Roboto',
  },
  {
    id: 'open-sans',
    name: 'Open Sans',
    fontFamily: 'Open Sans',
    category: 'sans-serif',
    description: 'Thân thiện, độ thoáng dòng tuyệt vời cho bài đọc dài',
    googleFontName: 'Open Sans',
  },
  {
    id: 'nunito',
    name: 'Nunito',
    fontFamily: 'Nunito',
    category: 'sans-serif',
    description: 'Đầu nét bo tròn dịu mắt, phong cách hiện đại thư giãn',
    googleFontName: 'Nunito',
  },
  {
    id: 'lora',
    name: 'Lora (Serif)',
    fontFamily: 'Lora',
    category: 'serif',
    description: 'Phông có chân thanh lịch, chuẩn mực bài đọc báo chí & TOEIC Part 7',
    googleFontName: 'Lora',
  },
];

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  fontSizeScale: 100,
  fontFamily: 'Inter',
  isCustomFont: false,
  fontWeight: 400,
};

export const DISPLAY_SETTINGS_STORAGE_KEY = 'display_settings';
export const DISPLAY_SETTINGS_CHANGED_EVENT = 'display_settings_changed';

/**
 * Get current stored display settings or defaults
 */
export const getStoredDisplaySettings = (): DisplaySettings => {
  try {
    const raw = localStorage.getItem(DISPLAY_SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_DISPLAY_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      fontSizeScale: FONT_SIZE_PRESETS.some(preset => preset.value === Number(parsed.fontSizeScale)) ? Number(parsed.fontSizeScale) : DEFAULT_DISPLAY_SETTINGS.fontSizeScale,
      fontFamily: typeof parsed.fontFamily === 'string' && parsed.fontFamily.trim() ? parsed.fontFamily.trim() : DEFAULT_DISPLAY_SETTINGS.fontFamily,
      isCustomFont: Boolean(parsed.isCustomFont),
      fontWeight: Number(parsed.fontWeight) || DEFAULT_DISPLAY_SETTINGS.fontWeight,
    };
  } catch {
    return { ...DEFAULT_DISPLAY_SETTINGS };
  }
};

/**
 * Canonical Google Fonts alias map for developer and popular fonts
 * Handles case sensitivity and common variations.
 */
export const GOOGLE_FONT_CANONICAL_ALIASES: Record<string, string> = {
  'jetbrains mono': 'JetBrains Mono',
  'jetbrainsmono': 'JetBrains Mono',
  'jetbrains-mono': 'JetBrains Mono',
  'fira code': 'Fira Code',
  'firacode': 'Fira Code',
  'fira-code': 'Fira Code',
  'fira sans': 'Fira Sans',
  'source code pro': 'Source Code Pro',
  'sourcecodepro': 'Source Code Pro',
  'source sans pro': 'Source Sans Pro',
  'source sans 3': 'Source Sans 3',
  'source serif pro': 'Source Serif Pro',
  'ibm plex sans': 'IBM Plex Sans',
  'ibm plex mono': 'IBM Plex Mono',
  'ibm plex serif': 'IBM Plex Serif',
  'space mono': 'Space Mono',
  'spacemono': 'Space Mono',
  'roboto mono': 'Roboto Mono',
  'roboto slab': 'Roboto Slab',
  'plus jakarta sans': 'Plus Jakarta Sans',
  'pt sans': 'PT Sans',
  'pt serif': 'PT Serif',
  'noto sans': 'Noto Sans',
  'noto serif': 'Noto Serif',
  'be vietnam pro': 'Be Vietnam Pro',
  'be vietnam': 'Be Vietnam Pro',
  'open sans': 'Open Sans',
  'press start 2p': 'Press Start 2P',
  'vt323': 'VT323',
};

export const normalizeGoogleFontName = (rawName: string): string => {
  const trimmed = rawName.trim().replace(/\s+/g, ' ');
  const lower = trimmed.toLowerCase();
  if (GOOGLE_FONT_CANONICAL_ALIASES[lower]) {
    return GOOGLE_FONT_CANONICAL_ALIASES[lower];
  }
  // Title Case fallback for lowercase inputs (e.g. "montserrat" -> "Montserrat")
  if (/^[a-z0-9\s-]+$/.test(trimmed)) {
    return trimmed
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  return trimmed;
};

/**
 * Dynamically inject or ensure a Google Font is loaded in document.head.
 * Returns the resolved canonical font name if successful, or null on failure.
 */
export const loadGoogleFont = async (fontName: string): Promise<string | null> => {
  const cleanName = fontName.trim().replace(/\s+/g, ' ');
  if (!cleanName) return null;

  const normalizedName = normalizeGoogleFontName(cleanName);
  const fontId = `google-font-${normalizedName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  if (typeof document === 'undefined') return normalizedName;

  // Already loaded
  if (document.getElementById(fontId)) {
    return normalizedName;
  }

  // Candidate names to attempt
  const candidateNames = Array.from(
    new Set([normalizedName, cleanName, cleanName.replace(/\b\w/g, (c) => c.toUpperCase())])
  );

  for (const candidate of candidateNames) {
    // Crucial fix: encodeURIComponent directly on the font name so spaces become %20.
    // Replacing spaces with '+' inside encodeURIComponent resulted in '%2B', which Google Fonts rejects with 400.
    const encodedFamily = encodeURIComponent(candidate);
    const candidateUrls = [
      `https://fonts.googleapis.com/css2?family=${encodedFamily}:wght@300;400;500;600;700&display=swap`,
      `https://fonts.googleapis.com/css2?family=${encodedFamily}&display=swap`,
    ];

    for (const fontUrl of candidateUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(fontUrl, { method: 'GET', signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) {
          continue;
        }

        const cssText = await res.text();
        // Google Fonts returns error comments in body if family not found
        if (cssText.includes('/* Error:') || cssText.includes('not found') || cssText.includes('Missing font family')) {
          continue;
        }

        // Inject stylesheet
        const link = document.createElement('link');
        link.id = fontId;
        link.rel = 'stylesheet';
        link.media = 'print';
        link.onload = () => { link.media = 'all'; };
        link.href = fontUrl;
        document.head.appendChild(link);

        // Optional: wait for fonts to load if FontFace API is available
        if ('fonts' in document) {
          try {
            await Promise.race([
              document.fonts.load(`400 16px "${candidate}"`),
              new Promise((resolve) => setTimeout(resolve, 1500)),
            ]);
          } catch {
            // Non-blocking fallback
          }
        }

        return candidate;
      } catch {
        // Try next candidate URL
      }
    }
  }

  return null;
};

/**
 * Apply the display settings to DOM elements (root CSS variables & scale)
 */
export const applyDisplaySettings = (settings: DisplaySettings) => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // 1. Font size scale
  const scale = getActualFontScale(settings.fontSizeScale || 100);
  root.style.setProperty('--app-font-scale', String(scale));
  root.style.fontSize = `calc(100% * var(--app-font-scale, 1))`;

  // 2. Font family (applied to body / content variables, headings remain protected by CSS)
  const font = settings.fontFamily || DEFAULT_DISPLAY_SETTINGS.fontFamily;
  const fallbackStack = `'Inter', 'Be Vietnam Pro', system-ui, -apple-system, sans-serif`;
  root.style.setProperty('--app-font-family', `"${font}", ${fallbackStack}`);

  // 3. Font weight
  const weight = settings.fontWeight || 400;
  root.style.setProperty('--app-font-weight', String(weight));

  // If font needs Google Font loading (preset or custom), trigger load in background
  const preset = FONT_FAMILY_PRESETS.find((p) => p.fontFamily.toLowerCase() === font.toLowerCase());
  if (preset?.googleFontName) {
    void loadGoogleFont(preset.googleFontName);
  } else if (settings.isCustomFont && font) {
    void loadGoogleFont(font);
  }
};

/**
 * Save settings to localStorage, apply to DOM, and broadcast change event
 */
export const saveDisplaySettings = (settings: Partial<DisplaySettings>): DisplaySettings => {
  const current = getStoredDisplaySettings();
  const next: DisplaySettings = {
    fontSizeScale: settings.fontSizeScale !== undefined ? settings.fontSizeScale : current.fontSizeScale,
    fontFamily: settings.fontFamily !== undefined ? settings.fontFamily.trim() : current.fontFamily,
    isCustomFont: settings.isCustomFont !== undefined ? settings.isCustomFont : current.isCustomFont,
    fontWeight: settings.fontWeight !== undefined ? settings.fontWeight : current.fontWeight,
  };

  try {
    localStorage.setItem(DISPLAY_SETTINGS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage quota or privacy mode exception handling
  }

  applyDisplaySettings(next);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DISPLAY_SETTINGS_CHANGED_EVENT, { detail: next }));
  }

  return next;
};

/**
 * Reset all typography settings to system defaults and remove storage key
 */
export const resetDisplaySettings = (): DisplaySettings => {
  try {
    localStorage.removeItem(DISPLAY_SETTINGS_STORAGE_KEY);
  } catch {
    // ignore
  }

  applyDisplaySettings(DEFAULT_DISPLAY_SETTINGS);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DISPLAY_SETTINGS_CHANGED_EVENT, { detail: DEFAULT_DISPLAY_SETTINGS }));
  }

  return DEFAULT_DISPLAY_SETTINGS;
};
