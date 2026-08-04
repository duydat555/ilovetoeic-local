import React, {
  useCallback,
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeViewTransition {
  finished: Promise<void>;
}

type ThemeDocument = Document & {
  startViewTransition?: (update: () => void) => ThemeViewTransition;
};

const getInitialDarkMode = () => {
  if (typeof window === 'undefined') return false;
  let savedTheme: string | null = null;
  try {
    savedTheme = localStorage.getItem('toeic_master_theme');
  } catch {
    // Storage can be disabled by strict privacy settings.
  }
  const isDark = savedTheme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  return isDark;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(getInitialDarkMode);
  const isSwitching = useRef(false);

  const applyTheme = useCallback((darkMode: boolean) => {
    const root = document.documentElement;
    root.classList.toggle('dark', darkMode);
    try {
      localStorage.setItem('toeic_master_theme', darkMode ? 'dark' : 'light');
    } catch {
      // Theme still works for the current session without localStorage.
    }
    flushSync(() => setIsDarkMode(darkMode));
  }, []);

  const toggleTheme = useCallback(() => {
    if (isSwitching.current) return;

    const root = document.documentElement;
    const nextDarkMode = !isDarkMode;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const themeDocument = document as ThemeDocument;

    isSwitching.current = true;
    root.classList.add('theme-switching');

    if (!reduceMotion && themeDocument.startViewTransition) {
      try {
        const transition = themeDocument.startViewTransition(
          () => applyTheme(nextDarkMode),
        );
        void transition.finished.finally(() => {
          root.classList.remove('theme-switching');
          isSwitching.current = false;
        });
        return;
      } catch {
        // Fall through to the instant, low-cost update.
      }
    }

    applyTheme(nextDarkMode);
    window.requestAnimationFrame(() => {
      root.classList.remove('theme-switching');
      isSwitching.current = false;
    });
  }, [applyTheme, isDarkMode]);

  const value = useMemo(
    () => ({ isDarkMode, toggleTheme }),
    [isDarkMode, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
