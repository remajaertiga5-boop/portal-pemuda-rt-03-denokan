import React, { createContext, useContext, useState, useEffect } from 'react';

// ============================================================
// TYPES
// ============================================================

export type AppTheme    = 'light' | 'dark' | 'system';
export type FontSize    = 'Kecil' | 'Normal' | 'Besar' | 'Sangat Besar';
export type AccentColor = 'green' | 'blue' | 'rose' | 'amber' | 'purple';

interface ThemeContextType {
  theme          : AppTheme;
  resolvedTheme  : 'light' | 'dark';
  isDark         : boolean;
  isLight        : boolean;
  setTheme       : (theme: AppTheme) => void;
  toggleTheme    : () => void;
  fontSize       : FontSize;
  setFontSize    : (size: FontSize) => void;
  reduceMotion   : boolean;
  setReduceMotion: (enabled: boolean) => void;
  highContrast   : boolean;
  setHighContrast: (enabled: boolean) => void;
  accentColor    : AccentColor;
  setAccentColor : (color: AccentColor) => void;
}

// ============================================================
// HELPERS
// ============================================================

// ✅ Fix Bug 2: SSR-safe localStorage helper
const getStorage = (key: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback;
  return localStorage.getItem(key) ?? fallback;
};

const setStorage = (key: string, value: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, value);
  }
};

// ✅ Fix Bug 3: Inisialisasi resolvedTheme langsung dari preference
const getInitialResolvedTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem('app-theme') as AppTheme;
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

// ============================================================
// CONTEXT
// ============================================================

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ============================================================
// PROVIDER
// ============================================================

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {

  // ----------------------------------------------------------
  // STATE
  // ----------------------------------------------------------

  const [theme, setThemeState] = useState<AppTheme>(
    // ✅ Fix Bug 2: SSR-safe
    () => getStorage('app-theme', 'system') as AppTheme
  );

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(
    // ✅ Fix Bug 3: Tidak selalu mulai dari 'light'
    getInitialResolvedTheme
  );

  const [fontSize, setFontSizeState] = useState<FontSize>(
    () => getStorage('app-font-size', 'Normal') as FontSize
  );

  const [reduceMotion, setReduceMotionState] = useState<boolean>(
    () => getStorage('app-reduce-motion', 'false') === 'true'
  );

  const [highContrast, setHighContrastState] = useState<boolean>(
    () => getStorage('app-high-contrast', 'false') === 'true'
  );

  const [accentColor, setAccentColorState] = useState<AccentColor>(
    () => getStorage('app-accent-color', 'green') as AccentColor
  );

  // ----------------------------------------------------------
  // SETTERS
  // ----------------------------------------------------------

  const setTheme = (newTheme: AppTheme): void => {
    setThemeState(newTheme);
    setStorage('app-theme', newTheme);
  };

  const toggleTheme = (): void => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const setFontSize = (size: FontSize): void => {
    setFontSizeState(size);
    setStorage('app-font-size', size);
  };

  const setReduceMotion = (enabled: boolean): void => {
    setReduceMotionState(enabled);
    setStorage('app-reduce-motion', String(enabled));
  };

  const setHighContrast = (enabled: boolean): void => {
    setHighContrastState(enabled);
    setStorage('app-high-contrast', String(enabled));
  };

  const setAccentColor = (color: AccentColor): void => {
    setAccentColorState(color);
    setStorage('app-accent-color', color);
  };

  // ----------------------------------------------------------
  // EFFECTS
  // ----------------------------------------------------------

  // ✅ Fix Bug 4: Tambah handleChange() saat mount agar
  //    resolvedTheme langsung terupdate tanpa menunggu perubahan
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (): void => {
      if (theme === 'system') {
        setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');
      }
    };

    handleChange(); // ← Jalankan langsung saat mount
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Apply tema ke <html> element
  useEffect(() => {
    const activeTheme: 'light' | 'dark' =
      theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme;

    setResolvedTheme(activeTheme);

    const root = document.documentElement;
    root.classList.toggle('dark', activeTheme === 'dark');
    root.style.colorScheme = activeTheme;
  }, [theme]);

  // Apply font size ke <html> element
  useEffect(() => {
    const fontSizeMap: Record<FontSize, string> = {
      'Kecil'       : '14px',
      'Normal'      : '16px',
      'Besar'       : '18px',
      'Sangat Besar': '20px',
    };
    // ✅ Gunakan ?? bukan || agar tidak falsy-trap
    document.documentElement.style.fontSize = fontSizeMap[fontSize] ?? '16px';
  }, [fontSize]);

  // ✅ Fix Bug: Gabungkan highContrast & reduceMotion jadi 1 useEffect
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('high-contrast', highContrast);
    root.classList.toggle('reduce-motion', reduceMotion);
  }, [highContrast, reduceMotion]);

  // ✅ Fix Bug 5: accentColor sekarang diapply ke DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accentColor);
  }, [accentColor]);

  // ----------------------------------------------------------
  // DERIVED VALUES
  // ----------------------------------------------------------

  const isDark  = resolvedTheme === 'dark';
  const isLight = resolvedTheme === 'light';

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        isDark,
        isLight,
        setTheme,
        toggleTheme,
        fontSize,
        setFontSize,
        reduceMotion,
        setReduceMotion,
        highContrast,
        setHighContrast,
        accentColor,
        setAccentColor,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// ============================================================
// CUSTOM HOOK
// ============================================================

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme harus digunakan di dalam <ThemeProvider>');
  }
  return context;
};