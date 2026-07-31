import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

/**
 * PENTING: Jalur '../locales/' diasumsikan folder locales berada 
 * sejajar dengan folder i18n di dalam folder src.
 */
import id  from '../locales/id';
import en  from '../locales/en';
import jv  from '../locales/jv';
import slg from '../locales/slg';

const SUPPORTED_LANGS = ['id', 'en', 'jv', 'slg'] as const;
type SupportedLang = typeof SUPPORTED_LANGS[number];

export const ALL_NAMESPACES = [
  'common', 'auth', 'profile', 'settings', 'finance', 'attendance', 
  'gallery', 'announcement', 'aspiration', 'member', 'dashboard', 
  'anggota', 'agenda', 'kas', 'aspirasi', 'pengumuman', 'galeri', 
  'profil', 'superAdmin', 'iuran'
] as const;

/**
 * Mengambil bahasa awal dari localStorage atau browser
 */
const getInitialLanguage = (): SupportedLang => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('app-language');
      if (saved && (SUPPORTED_LANGS as readonly string[]).includes(saved)) {
        return saved as SupportedLang;
      }
    } catch {}
  }
  
  if (typeof navigator !== 'undefined') {
    const lang = navigator.language?.split('-')[0];
    if (lang && (SUPPORTED_LANGS as readonly string[]).includes(lang)) {
      return lang as SupportedLang;
    }
  }
  return 'id';
};

export const i18nInitPromise = i18n
  .use(initReactI18next)
  .init({
    resources: { id, en, jv, slg },
    lng: getInitialLanguage(),
    fallbackLng: 'id',
    defaultNS: 'common',
    ns: [...ALL_NAMESPACES],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    // Matikan debug di production agar console bersih
    debug: false,
    load: 'languageOnly'
  });

export default i18n;
