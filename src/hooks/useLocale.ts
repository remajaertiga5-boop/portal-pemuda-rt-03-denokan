import { useTranslation } from 'react-i18next';
import i18n from '../i18n/config';
import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================
// TYPES
// ============================================================

export interface LanguageMetadata {
  code      : string;
  name      : string;
  nativeName: string;
  flag      : string;
  dir       : 'ltr' | 'rtl'; // ✅ FIX #9: RTL support
}

// ============================================================
// CONSTANTS
// ============================================================

// ✅ FIX #10: Object.freeze agar tidak bisa di-mutate dari luar
export const availableLanguages: Readonly<LanguageMetadata[]> = Object.freeze([
  { 
    code      : 'id', 
    name      : 'Indonesia', 
    nativeName: 'Bahasa Indonesia', 
    flag      : '🇮🇩',
    dir       : 'ltr',
  },
  { 
    code      : 'en', 
    name      : 'English',   
    nativeName: 'English',          
    flag      : '🇬🇧',
    dir       : 'ltr',
  },
  { 
    code      : 'jv', 
    name      : 'Jawa',      
    nativeName: 'Basa Jawa',        
    flag      : '🌱',
    dir       : 'ltr',
  },
  { 
    code      : 'slg', 
    name      : 'Gaul',      
    nativeName: 'Bahasa Gaul 🔥',        
    flag      : '💬',
    dir       : 'ltr',
  },
]);

const LOCALE_MAP: Readonly<Record<string, string>> = Object.freeze({
  id: 'id-ID',
  en: 'en-US',
  jv: 'id-ID', // Jawa fallback ke id-ID (browser support terbatas)
  slg: 'id-ID', // Gaul fallback ke id-ID
});

const DEFAULT_LOCALE    = 'id-ID';
const DEFAULT_LANG      = 'id';
const STORAGE_KEY_LANG  = 'app-language';

// ============================================================
// HELPERS
// ============================================================

// ✅ FIX #6: Tambah try-catch di getStorage & setStorage
const getStorage = (key: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback;
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};

const setStorage = (key: string, value: string): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    // QuotaExceededError atau storage diblokir
    console.warn(`[useLocale] Gagal menyimpan ke localStorage[${key}]:`, e);
  }
};

const getLocale = (langCode: string): string => {
  return LOCALE_MAP[langCode] ?? DEFAULT_LOCALE;
};

// ✅ FIX #9: Helper cek apakah bahasa RTL
const isRTLLanguage = (langCode: string): boolean => {
  const lang = availableLanguages.find(l => l.code === langCode);
  return lang?.dir === 'rtl';
};

// ✅ FIX #4: Helper parse date yang timezone-safe
const parseDate = (date: Date | string | number): Date => {
  if (date instanceof Date) return date;
  // Jika string format YYYY-MM-DD (tanpa waktu), tambah T00:00:00
  // agar tidak diparse sebagai UTC midnight
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Date(`${date}T00:00:00`);
  }
  return new Date(date);
};

// ✅ FIX #8: Helper hitung relative time otomatis
const getRelativeTimeArgs = (
  date: Date | string | number
): { value: number; unit: Intl.RelativeTimeFormatUnit } => {
  const d      = parseDate(date);
  const now    = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffS  = Math.round(diffMs / 1000);
  const diffM  = Math.round(diffS  / 60);
  const diffH  = Math.round(diffM  / 60);
  const diffD  = Math.round(diffH  / 24);
  const diffW  = Math.round(diffD  / 7);
  const diffMo = Math.round(diffD  / 30);
  const diffY  = Math.round(diffD  / 365);

  if (Math.abs(diffS)  < 60)  return { value: diffS,  unit: 'second' };
  if (Math.abs(diffM)  < 60)  return { value: diffM,  unit: 'minute' };
  if (Math.abs(diffH)  < 24)  return { value: diffH,  unit: 'hour'   };
  if (Math.abs(diffD)  < 7)   return { value: diffD,  unit: 'day'    };
  if (Math.abs(diffW)  < 5)   return { value: diffW,  unit: 'week'   };
  if (Math.abs(diffMo) < 12)  return { value: diffMo, unit: 'month'  };
  return                               { value: diffY,  unit: 'year'   };
};

// ============================================================
// HOOK
// ============================================================

export function useLocale() {
  const { t, i18n: i18nInstance } = useTranslation();



  // ✅ FIX #3: Inisialisasi dengan prioritas localStorage → i18n → default
  const [currentLanguage, setCurrentLanguageState] = useState<string>(() => {
    const stored = getStorage(STORAGE_KEY_LANG, '');
    const isStoredValid = availableLanguages.some(l => l.code === stored);
    if (isStoredValid) return stored;

    const i18nLang = i18n.language?.split('-')[0]; // 'en-US' → 'en'
    const isI18nValid = availableLanguages.some(l => l.code === i18nLang);
    if (isI18nValid) return i18nLang;

    return DEFAULT_LANG;
  });

  const setLanguage = useCallback((langCode: string): void => {
    const isValid = availableLanguages.some(l => l.code === langCode);
    if (!isValid) {
      console.warn(`[useLocale] Language '${langCode}' tidak tersedia.`);
      return;
    }

    // Gunakan i18n singleton langsung — paling reliable
    i18n.changeLanguage(langCode).then(() => {
      console.log(`[useLocale] Language changed to: ${langCode}, i18n.language: ${i18n.language}`);
    });
    setStorage(STORAGE_KEY_LANG, langCode);
    setCurrentLanguageState(langCode);

    if (typeof document !== 'undefined') {
      document.documentElement.lang = langCode;
      document.documentElement.dir = isRTLLanguage(langCode) ? 'rtl' : 'ltr';
    }
  }, []);

  // ✅ FIX #1: Effect sync i18n → state, tidak ada loop
  // Hanya jalan saat i18n.language berubah dari LUAR hook
  useEffect(() => {
    const i18nLang = i18nInstance.language?.split('-')[0];
    if (!i18nLang) return;

    const isValid = availableLanguages.some(l => l.code === i18nLang);
    if (!isValid) return;

    // Hanya update jika benar-benar berbeda
    // Tidak tambah currentLanguage di deps → tidak ada loop
    setCurrentLanguageState(prev => {
      if (prev !== i18nLang) return i18nLang;
      return prev; // return sama → tidak trigger re-render
    });
  }, [i18nInstance.language]); // ← hanya i18nInstance.language, bukan currentLanguage

  // Sync lang & dir attribute saat mount & bahasa berubah
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = currentLanguage;
    document.documentElement.dir  = isRTLLanguage(currentLanguage) 
      ? 'rtl' 
      : 'ltr';
  }, [currentLanguage]);

  // Sync i18n saat pertama mount
  useEffect(() => {
    const i18nLang = i18nInstance.language?.split('-')[0];
    if (i18nLang !== currentLanguage && currentLanguage) {
      i18n.changeLanguage(currentLanguage);
    }
  }, []); // hanya sekali saat mount

  // ============================================================
  // FORMATTERS
  // ============================================================

  // ✅ FIX #4: formatDate dengan timezone-safe parsing
  const formatDate = useCallback((
    date   : Date | string | number,
    options?: Intl.DateTimeFormatOptions
  ): string => {
    const d = parseDate(date); // ← pakai parseDate bukan new Date langsung
    if (isNaN(d.getTime())) return '-';

    const defaultOptions: Intl.DateTimeFormatOptions = options ?? {
      day  : 'numeric',
      month: 'long',
      year : 'numeric',
    };

    try {
      return new Intl.DateTimeFormat(
        getLocale(currentLanguage),
        defaultOptions
      ).format(d);
    } catch {
      return new Intl.DateTimeFormat(DEFAULT_LOCALE, defaultOptions).format(d);
    }
  }, [currentLanguage]);

  // ✅ FIX #7: formatDateTime — tanggal + waktu sekaligus
  const formatDateTime = useCallback((
    date   : Date | string | number,
    options?: Intl.DateTimeFormatOptions
  ): string => {
    const d = parseDate(date);
    if (isNaN(d.getTime())) return '-';

    const defaultOptions: Intl.DateTimeFormatOptions = options ?? {
      day   : 'numeric',
      month : 'long',
      year  : 'numeric',
      hour  : '2-digit',
      minute: '2-digit',
    };

    try {
      return new Intl.DateTimeFormat(
        getLocale(currentLanguage),
        defaultOptions
      ).format(d);
    } catch {
      return new Intl.DateTimeFormat(DEFAULT_LOCALE, defaultOptions).format(d);
    }
  }, [currentLanguage]);

  // ✅ FIX #7: formatTime — hanya waktu (jam:menit)
  const formatTime = useCallback((
    date   : Date | string | number,
    options?: Intl.DateTimeFormatOptions
  ): string => {
    const d = parseDate(date);
    if (isNaN(d.getTime())) return '-';

    const defaultOptions: Intl.DateTimeFormatOptions = options ?? {
      hour  : '2-digit',
      minute: '2-digit',
    };

    try {
      return new Intl.DateTimeFormat(
        getLocale(currentLanguage),
        defaultOptions
      ).format(d);
    } catch {
      return new Intl.DateTimeFormat(DEFAULT_LOCALE, defaultOptions).format(d);
    }
  }, [currentLanguage]);

  // ✅ FIX #5: formatCurrency dengan guard NaN & Infinity
  const formatCurrency = useCallback((amount: number): string => {
    // Guard nilai tidak valid
    if (!isFinite(amount) || isNaN(amount)) return 'Rp -';

    try {
      return new Intl.NumberFormat(getLocale(currentLanguage), {
        style               : 'currency',
        currency            : 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `Rp ${amount.toLocaleString('id-ID')}`;
    }
  }, [currentLanguage]);

  // Format: Angka
  const formatNumber = useCallback((num: number): string => {
    // ✅ Guard nilai tidak valid
    if (!isFinite(num) || isNaN(num)) return '-';
    try {
      return new Intl.NumberFormat(getLocale(currentLanguage)).format(num);
    } catch {
      return String(num);
    }
  }, [currentLanguage]);

  // Format: Waktu Relatif (manual — value + unit)
  const formatRelativeTime = useCallback((
    value: number,
    unit : Intl.RelativeTimeFormatUnit
  ): string => {
    try {
      return new Intl.RelativeTimeFormat(
        getLocale(currentLanguage),
        { numeric: 'auto' }
      ).format(value, unit);
    } catch {
      return `${Math.abs(value)} ${unit}${value < 0 ? ' lalu' : ' lagi'}`;
    }
  }, [currentLanguage]);

  // ✅ FIX #8: formatTimeAgo — otomatis hitung unit dari tanggal
  const formatTimeAgo = useCallback((
    date: Date | string | number
  ): string => {
    const d = parseDate(date);
    if (isNaN(d.getTime())) return '-';

    const { value, unit } = getRelativeTimeArgs(d);
    try {
      return new Intl.RelativeTimeFormat(
        getLocale(currentLanguage),
        { numeric: 'auto' }
      ).format(value, unit);
    } catch {
      return `${Math.abs(value)} ${unit} lalu`;
    }
  }, [currentLanguage]);

  // ============================================================
  // DERIVED VALUES
  // ============================================================

  // ✅ FIX #9: isRTL bisa dipakai komponen untuk flip layout
  const isRTL = isRTLLanguage(currentLanguage);

  const currentLanguageMeta = availableLanguages.find(
    l => l.code === currentLanguage
  ) ?? availableLanguages[0];

  // ============================================================
  // RETURN
  // ============================================================

  return {
    // State
    currentLanguage,
    currentLanguageMeta,  // ✅ Bonus: meta lengkap bahasa aktif
    isRTL,                // ✅ FIX #9
    setLanguage,
    availableLanguages,
    
    // i18n
    t,
    i18n,

    // Formatters
    formatDate,
    formatDateTime,       // ✅ FIX #7
    formatTime,           // ✅ FIX #7
    formatCurrency,
    formatNumber,
    formatRelativeTime,
    formatTimeAgo,        // ✅ FIX #8
  };
}