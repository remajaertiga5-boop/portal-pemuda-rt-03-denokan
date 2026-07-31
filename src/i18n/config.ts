import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// ✅ BENAR: '../locales/' karena locales ada di src/locales/
// bukan di src/i18n/locales/
import id  from '../locales/id';
import en  from '../locales/en';
import jv  from '../locales/jv';
import slg from '../locales/slg';

const SUPPORTED_LANGS = ['id', 'en', 'jv', 'slg'] as const;
type SupportedLang = typeof SUPPORTED_LANGS[number];

export const ALL_NAMESPACES = [
  'common', 'auth', 'profile', 'settings', 'finance',
  'attendance', 'gallery', 'announcement', 'aspiration',
  'member', 'dashboard', 'anggota', 'agenda', 'kas',
  'aspirasi', 'pengumuman', 'galeri', 'profil',
  'superAdmin', 'iuran',
] as const;

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
    resources        : { id, en, jv, slg },
    lng              : getInitialLanguage(),
    fallbackLng      : 'id',
    defaultNS        : 'common',
    ns               : [...ALL_NAMESPACES],
    interpolation    : { escapeValue: false },
    react: {
      useSuspense  : false,
      bindI18n     : 'languageChanged loaded',
      bindI18nStore: 'added removed',
    },
    debug            : typeof import.meta !== 'undefined'
                        ? (import.meta.env?.DEV ?? false) : false,
    load             : 'languageOnly',
    returnNull       : false,
    returnEmptyString: false,
    saveMissing      : typeof import.meta !== 'undefined'
                        ? (import.meta.env?.DEV ?? false) : false,
    missingKeyHandler: (
      langs: readonly string[],
      ns   : string,
      key  : string,
      _fallbackValue: string
    ) => {
      if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
        console.warn(
          `[i18n] Missing key: "${key}" — ns: "${ns}" — lang: ${langs.join(', ')}`
        );
      }
    },
  });

export default i18n;
export type { SupportedLang };
