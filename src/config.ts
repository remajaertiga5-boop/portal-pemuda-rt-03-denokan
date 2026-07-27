// src/config.ts
// Konfigurasi aplikasi - SEMUA secret harus di env server-side

function requireEnv(key: string, fallback?: string): string {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      const val = import.meta.env[key];
      if (val) return val;
    }
  } catch {}
  return fallback || '';
}

// ── App Configuration ───────────────────────────────────────
export const APP_CONFIG = {
  NAME: 'Remaja Legok 03',
  VERSION: '2.0.0',
  DESCRIPTION: 'Sistem Manajemen Remaja Masjid Legok 03',
  
  API_BASE_URL: requireEnv('VITE_API_BASE_URL', '/api'),
  SHEETS_PROXY_URL: requireEnv('VITE_SHEETS_PROXY_URL', '/api/sheets-proxy'),
  AUTH_VERIFY_URL: requireEnv('VITE_AUTH_VERIFY_URL', '/api/auth-verify'),
  UPLOAD_URL: requireEnv('VITE_UPLOAD_URL', '/api/upload-r2'),
  
  FEATURES: {
    DARK_MODE: true,
    MULTILANG: true,
    PWA: true,
    OFFLINE_MODE: true,
    BACKUP: true,
  },
  
  REQUEST_TIMEOUT_MS: 15000,
  AUTH_TIMEOUT_MS: 10000,
  CACHE_TTL_MS: 5 * 60 * 1000, // 5 menit
  TOAST_DURATION_MS: 3500,
  ANIMATION_DURATION_MS: 300,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

export const VALIDATION = {
  PIN_MIN_LENGTH: 4,
  PIN_MAX_LENGTH: 16,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  ID_MAX_LENGTH: 50,
  FILE_MAX_SIZE_MB: 5,
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
} as const;

export const LOCALES = {
  DEFAULT: 'id',
  AVAILABLE: ['id', 'en', 'jv', 'slg'] as const,
  STORAGE_KEY: 'remaja-legok-locale',
} as const;

export const THEME_CONFIG = {
  DEFAULT_THEME: 'light' as const,
  DEFAULT_ACCENT: 'emerald' as const,
  DEFAULT_FONT_SIZE: 'normal' as const,
  STORAGE_KEYS: {
    THEME: 'remaja-legok-theme',
    ACCENT: 'remaja-legok-accent',
    FONT_SIZE: 'remaja-legok-font-size',
  },
  ACCENT_COLORS: {
    emerald: {
      primary: '#10b981',
      primaryDark: '#059669',
      light: '#d1fae5',
    },
    blue: {
      primary: '#3b82f6',
      primaryDark: '#2563eb',
      light: '#dbeafe',
    },
    purple: {
      primary: '#8b5cf6',
      primaryDark: '#7c3aed',
      light: '#ede9fe',
    },
    rose: {
      primary: '#f43f5e',
      primaryDark: '#e11d48',
      light: '#ffe4e6',
    },
    amber: {
      primary: '#f59e0b',
      primaryDark: '#d97706',
      light: '#fef3c7',
    },
    teal: {
      primary: '#14b8a6',
      primaryDark: '#0d9488',
      light: '#ccfbf1',
    },
  },
  FONT_SIZES: {
    small: '14px',
    normal: '16px',
    large: '18px',
    xlarge: '20px',
  },
} as const;

export const STORAGE_KEYS = {
  USER: 'remaja-legok-user',
  AUTH_TOKEN: 'remaja-legok-auth',
  SETTINGS: 'remaja-legok-settings',
  OFFLINE_DATA: 'remaja-legok-offline',
  LAST_SYNC: 'remaja-legok-last-sync',
} as const;

export type AccentColor = keyof typeof THEME_CONFIG.ACCENT_COLORS;
export type FontSize = keyof typeof THEME_CONFIG.FONT_SIZES;
export type ThemeMode = 'light' | 'dark' | 'system';
export type AvailableLocale = typeof LOCALES.AVAILABLE[number];

export interface UserData {
  id: string;
  nama: string;
  jabatan: string;
  email?: string;
  status: 'Aktif' | 'Non-Aktif' | 'Alumni' | string;
  bergabung?: string;
  foto?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  code?: string;
  timestamp?: string;
}
