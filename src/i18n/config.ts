import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import id from '../locales/id';
import en from '../locales/en';
import jv from '../locales/jv';
import slg from '../locales/slg';

// ============================================================
// CONSTANTS
// ============================================================

const SUPPORTED_LANGS = ['id', 'en', 'jv', 'slg'] as const;
type SupportedLang = typeof SUPPORTED_LANGS[number];

// ✅ ALL 20 NAMESPACES — must match top-level keys in locale files
//    Namespace yang TIDAK terdaftar = terjemahan tidak pernah dimuat
//    → komponen jatuh ke defaultValue (teks Indonesia hardcoded)
const ALL_NAMESPACES = [
  'common',        // App name, buttons, nav, time, greeting, labels, errors, confirm
  'auth',          // Login, logout, session, errors
  'profile',       // Profil Saya
  'settings',      // Pengaturan
  'finance',       // Laporan Keuangan
  'attendance',    // Absensi Kegiatan (was: 'absensi' — typo fixed)
  'gallery',       // Galeri Kegiatan
  'announcement',  // Pengumuman
  'aspiration',    // Kotak Aspirasi
  'member',        // Daftar Anggota
  'dashboard',     // Dashboard
  'anggota',       // Halaman Anggota (legacy namespace)
  'agenda',        // Agenda Kegiatan (legacy namespace)
  'kas',           // Kas Remaja (legacy namespace)
  'aspirasi',      // Aspirasi & Usulan (legacy namespace)
  'pengumuman',    // Halaman Pengumuman (legacy namespace)
  'galeri',        // Halaman Galeri Kegiatan (legacy namespace)
  'profil',        // Profil Saya (legacy namespace)
  'superAdmin',    // Super Admin Dashboard
  'iuran',         // Pembayaran Iuran
] as const;

// ============================================================
// HELPER
// ============================================================

// ✅ FIXED: Tambah try-catch agar tidak crash di private mode / storage blocked
const getSavedLanguage = (): SupportedLang => {
  if (typeof window === 'undefined') return 'id';
  try {
    const raw = localStorage.getItem('app-language');
    if (raw && (SUPPORTED_LANGS as readonly string[]).includes(raw)) {
      return raw as SupportedLang;
    }
  } catch {
    // localStorage diblokir (private mode, iframe sandbox, dll)
  }
  return 'id';
};

// ✅ FIXED: Deteksi bahasa browser sebagai fallback ke-2
//    Urutan prioritas: localStorage → browser lang → 'id'
const getInitialLanguage = (): SupportedLang => {
  const saved = getSavedLanguage();
  if (saved !== 'id') return saved; // sudah ada di localStorage

  if (typeof window !== 'undefined') {
    // navigator.language bisa 'id-ID', 'en-US', dll → ambil bagian depan saja
    const browserLang = navigator.language?.split('-')[0] as SupportedLang;
    if (browserLang && (SUPPORTED_LANGS as readonly string[]).includes(browserLang)) {
      return browserLang;
    }
  }
  return 'id';
};

// ============================================================
// INIT
// ============================================================

// ✅ FIXED: Simpan promise init agar bisa di-await dari luar jika perlu
//    Contoh: await i18nInitPromise sebelum render App
export const i18nInitPromise = i18n
  .use(initReactI18next)
  .init({
    resources: { id, en, jv, slg },

    // ✅ FIXED: Pakai getInitialLanguage() bukan getSavedLanguage()
    //    agar browser language ikut dipertimbangkan
    lng: getInitialLanguage(),

    fallbackLng: 'id',
    defaultNS: 'common',

    // ✅ FIXED: Daftarkan SEMUA 20 namespace
    //    Sebelumnya hanya 8 namespace → 12 namespace lain tidak termuat
    //    → semua komponen yg pakai namespace tersebut JATUH ke defaultValue
    ns: [...ALL_NAMESPACES],

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: false,
      // ✅ ADDED: Bind i18n ke React lebih ketat
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
    },

    // ✅ FIXED: debug hanya aktif saat DEV, tidak bocor ke production
    debug: typeof import.meta !== 'undefined'
      ? (import.meta.env?.DEV ?? false)
      : false,

    load: 'languageOnly',
    returnNull: false,
    returnEmptyString: false,

    // ✅ ADDED: Jika key tidak ditemukan, tampilkan key-nya
    saveMissing: typeof import.meta !== 'undefined'
      ? (import.meta.env?.DEV ?? false)
      : false,

    // ✅ ADDED: Handler key yang hilang — log di console saat DEV
    missingKeyHandler: (
      langs: readonly string[],
      ns: string,
      key: string,
      _fallbackValue: string
    ) => {
      if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
        console.warn(
          `[i18n] Missing key: "${key}" — namespace: "${ns}" — lang: ${langs.join(', ')}`
        );
      }
    },
  });

export default i18n;
export type { SupportedLang };
