// ============================================================
// FILE: src/i18n/config.ts
// FUNGSI: Konfigurasi utama sistem terjemahan (i18n)
//
// CARA KERJA:
// 1. Import semua file terjemahan (id, en, jv, slg)
// 2. Tentukan bahasa awal (dari localStorage / browser / default)
// 3. Inisialisasi i18next dengan semua pengaturan
// 4. Export instance i18n untuk dipakai di seluruh aplikasi
//
// JIKA ADA ERROR:
// - Cek import path './locales/...' sudah benar
// - Cek file locale (id.ts, en.ts, dll) ada di src/i18n/locales/
// - Cek semua namespace di ALL_NAMESPACES ada di setiap file locale
// ============================================================

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// ── Import File Terjemahan ──────────────────────────────────
// ✅ PENTING: Path harus './locales/' bukan '../locales/'
// Karena file ini (config.ts) ada di dalam folder src/i18n/
// dan folder locales/ ada di dalam src/i18n/locales/
// Struktur folder:
//   src/
//     i18n/
//       config.ts        ← FILE INI
//       locales/
//         id.ts          ← Bahasa Indonesia
//         en.ts          ← Bahasa Inggris
//         jv.ts          ← Bahasa Jawa
//         slg.ts         ← Bahasa Gaul
import id  from './locales/id';
import en  from './locales/en';
import jv  from './locales/jv';
import slg from './locales/slg';

// ── Daftar Bahasa yang Didukung ─────────────────────────────
// Jika ingin TAMBAH bahasa baru:
// 1. Buat file baru di src/i18n/locales/ (misal: ar.ts)
// 2. Tambah kode bahasa di sini (misal: 'ar')
// 3. Import file di atas (misal: import ar from './locales/ar')
// 4. Tambah ke resources di i18n.init (misal: resources: { id, en, jv, slg, ar })
// 5. Tambah ke availableLanguages di src/i18n/types.ts
const SUPPORTED_LANGS = ['id', 'en', 'jv', 'slg'] as const;
type SupportedLang = typeof SUPPORTED_LANGS[number];

// ── Daftar Namespace ────────────────────────────────────────
// Namespace = kelompok terjemahan berdasarkan fitur/halaman
// Setiap namespace harus ADA di semua file locale (id.ts, en.ts, dll)
//
// Jika ingin TAMBAH namespace baru:
// 1. Tambah nama namespace di sini
// 2. Tambah object dengan nama yang sama di SEMUA file locale
// 3. Gunakan di komponen: t('namaNamespace.key')
//
// Contoh penggunaan di komponen:
//   t('common.button.save')     → "Simpan"
//   t('auth.login.title')       → "Masuk dengan ID Anggota"
//   t('dashboard.welcome')      → "Selamat Datang..."
export const ALL_NAMESPACES = [
  'common',       // Terjemahan umum (tombol, status, navigasi, dll)
  'auth',         // Halaman login & autentikasi
  'profile',      // Halaman profil pengguna
  'settings',     // Halaman pengaturan
  'finance',      // Halaman keuangan
  'attendance',   // Halaman absensi
  'gallery',      // Halaman galeri
  'announcement', // Halaman pengumuman
  'aspiration',   // Halaman aspirasi
  'member',       // Halaman anggota
  'dashboard',    // Halaman beranda/dashboard
  'anggota',      // Komponen anggota (berbeda dari 'member')
  'agenda',       // Halaman agenda kegiatan
  'kas',          // Halaman kas & keuangan detail
  'aspirasi',     // Komponen aspirasi (berbeda dari 'aspiration')
  'pengumuman',   // Komponen pengumuman (berbeda dari 'announcement')
  'galeri',       // Komponen galeri (berbeda dari 'gallery')
  'profil',       // Komponen profil (berbeda dari 'profile')
  'superAdmin',   // Halaman super admin
  'iuran',        // Halaman iuran/pembayaran
] as const;

// ── Fungsi Deteksi Bahasa Awal ──────────────────────────────
// Urutan prioritas:
// 1. Bahasa yang disimpan user di localStorage (pilihan terakhir user)
// 2. Bahasa browser/HP user (deteksi otomatis)
// 3. Bahasa default: 'id' (Indonesia)
//
// Jika user ganti bahasa → tersimpan di localStorage 'app-language'
// Jika user buka aplikasi lagi → bahasa langsung sesuai pilihan terakhir
const getInitialLanguage = (): SupportedLang => {
  // Langkah 1: Cek localStorage
  // typeof window check → mencegah error di server-side rendering (SSR)
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('app-language');
      // Validasi: pastikan nilai yang tersimpan adalah kode bahasa yang valid
      if (saved && (SUPPORTED_LANGS as readonly string[]).includes(saved)) {
        return saved as SupportedLang;
      }
    } catch {
      // localStorage bisa error di mode private/incognito atau iframe
      // Jika error, lanjut ke langkah berikutnya
    }
  }

  // Langkah 2: Cek bahasa browser
  // navigator.language contoh: 'id-ID', 'en-US', 'jv'
  // split('-')[0] → ambil hanya 'id', 'en', 'jv' (tanpa region)
  if (typeof navigator !== 'undefined') {
    const lang = navigator.language?.split('-')[0];
    if (lang && (SUPPORTED_LANGS as readonly string[]).includes(lang)) {
      return lang as SupportedLang;
    }
  }

  // Langkah 3: Default fallback ke Bahasa Indonesia
  return 'id';
};

// ── Inisialisasi i18next ─────────────────────────────────────
// i18nInitPromise = Promise yang resolve ketika i18n sudah siap
// Dipakai di main.tsx untuk menunggu sebelum render App
// Tujuan: agar terjemahan sudah tersedia saat komponen pertama render
//
// JIKA BAHASA TIDAK BERUBAH → Cek bagian ini:
// - resources: pastikan semua bahasa ter-import
// - fallbackLng: bahasa cadangan jika key tidak ditemukan
// - ns: pastikan sama dengan ALL_NAMESPACES
export const i18nInitPromise = i18n
  .use(initReactI18next) // Plugin untuk integrasi dengan React
  .init({

    // Semua data terjemahan
    // Format: { kode_bahasa: { namespace: { key: 'terjemahan' } } }
    resources: { id, en, jv, slg },

    // Bahasa yang aktif saat aplikasi pertama dibuka
    lng: getInitialLanguage(),

    // Bahasa cadangan jika key tidak ditemukan di bahasa aktif
    // Contoh: jika bahasa 'jv' tidak punya key 'x', pakai terjemahan 'id'
    fallbackLng: 'id',

    // Namespace default jika tidak disebutkan di t()
    // t('button.save') → sama dengan t('common:button.save')
    defaultNS: 'common',

    // Daftarkan semua namespace yang akan dipakai
    ns: [...ALL_NAMESPACES],

    interpolation: {
      // escapeValue: false → aman untuk React (React sudah handle XSS)
      // Jika true, karakter <, >, & akan di-escape (tidak perlu di React)
      escapeValue: false,
    },

    react: {
      // useSuspense: false → komponen tidak perlu Suspense wrapper
      // Jika true, komponen akan "suspend" sampai terjemahan siap
      useSuspense: false,

      // Event yang memicu re-render komponen
      // 'languageChanged' → saat bahasa diganti
      // 'loaded'          → saat resource bahasa selesai dimuat
      bindI18n: 'languageChanged loaded',

      // Event dari store yang memicu update
      // 'added'   → saat resource baru ditambahkan
      // 'removed' → saat resource dihapus
      bindI18nStore: 'added removed',
    },

    // Aktifkan log debug hanya di mode development
    // Di production (build), debug otomatis mati
    debug: typeof import.meta !== 'undefined'
      ? (import.meta.env?.DEV ?? false)
      : false,

    // 'languageOnly' → pakai 'id' bukan 'id-ID'
    // Mencegah masalah jika resource hanya punya 'id' tapi i18n minta 'id-ID'
    load: 'languageOnly',

    // returnNull: false → jika key tidak ada, jangan return null
    returnNull: false,

    // returnEmptyString: false → jika value kosong '', pakai fallback
    returnEmptyString: false,

    // saveMissing: true di dev → log warning jika ada key yang hilang
    // Berguna untuk debugging terjemahan yang belum ditambahkan
    saveMissing: typeof import.meta !== 'undefined'
      ? (import.meta.env?.DEV ?? false)
      : false,

    // Handler ketika ada key yang tidak ditemukan
    // Akan muncul di console saat development
    // Contoh log: [i18n] Missing key: "voting" — ns: "common" — lang: jv
    missingKeyHandler: (
      langs: readonly string[], // Bahasa yang dicoba
      ns   : string,            // Namespace yang dicari
      key  : string,            // Key yang tidak ditemukan
      _fallbackValue: string    // Nilai fallback (tidak dipakai di sini)
    ) => {
      if (
        typeof import.meta !== 'undefined' &&
        import.meta.env?.DEV
      ) {
        console.warn(
          `[i18n] Missing key: "${key}" — ns: "${ns}" — lang: ${langs.join(', ')}`
        );
      }
    },
  });

// Export instance i18n untuk dipakai langsung jika perlu
// Contoh: import i18n from '../i18n/config'; i18n.changeLanguage('en');
export default i18n;

// Export tipe SupportedLang untuk TypeScript
// Contoh penggunaan: const lang: SupportedLang = 'id';
export type { SupportedLang };
