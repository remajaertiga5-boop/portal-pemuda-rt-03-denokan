// ============================================================
// FILE: src/context/LanguageContext.tsx
// FUNGSI: Menyimpan & menyebarkan state bahasa ke seluruh aplikasi
//
// CARA KERJA:
// 1. LanguageProvider → Komponen pembungkus yang menyimpan state bahasa
// 2. setLanguage()    → Fungsi untuk ganti bahasa (dipanggil dari tombol)
// 3. useLanguageContext() → Hook untuk mengambil state bahasa di komponen
//
// ALUR GANTI BAHASA:
// User klik tombol bahasa
//   → setLanguage('en') dipanggil
//   → i18n.changeLanguage('en') → react-i18next tau bahasa berubah
//   → localStorage.setItem('app-language', 'en') → tersimpan permanen
//   → setLanguageState('en') → React state update → semua consumer re-render
//   → setVersion(v+1) → paksa re-render komponen yang pakai 'version'
//   → document.documentElement.lang = 'en' → update atribut HTML
//
// JIKA BAHASA TIDAK BERUBAH DI HALAMAN LAIN:
// - Pastikan komponen pakai useLocale() atau useLanguageContext()
// - Pastikan LanguageProvider ada di main.tsx membungkus <App />
// - Pastikan i18n.changeLanguage() dipanggil (ada di setLanguage)
// ============================================================

import React, {
  createContext,    // Untuk membuat context baru
  useContext,       // Untuk mengambil nilai dari context
  useState,         // Untuk menyimpan state lokal
  useCallback,      // Untuk membuat fungsi yang tidak berubah referensinya
  useEffect,        // Untuk side effect saat komponen mount
} from 'react';

import i18n from '../i18n/config';
import { availableLanguages, LanguageMetadata } from '../i18n/types';

// ── TypeScript Interface ────────────────────────────────────
// Interface = kontrak/blueprint nilai yang ada di context
// Jika ingin TAMBAH nilai baru ke context, tambahkan di sini dulu
interface LanguageContextValue {
  language          : string;                    // Kode bahasa aktif ('id', 'en', dll)
  languageMeta      : LanguageMetadata;          // Info lengkap bahasa (nama, flag, dll)
  setLanguage       : (lang: string) => void;    // Fungsi untuk ganti bahasa
  version           : number;                    // Counter yang naik tiap ganti bahasa
  availableLanguages: Readonly<LanguageMetadata[]>; // Daftar semua bahasa tersedia
}

// ── Konstanta Default ───────────────────────────────────────
// Bahasa default jika tidak ada yang tersimpan di localStorage
const DEFAULT_LANG = 'id';

// ── Fungsi Deteksi Bahasa Awal ──────────────────────────────
// Dipanggil SEKALI saat LanguageProvider pertama kali render
// Mencegah "flash" bahasa yang salah saat halaman pertama dimuat
//
// Jika ingin ganti bahasa default:
// → Ubah DEFAULT_LANG di atas menjadi kode bahasa yang diinginkan
function getInitialLang(): string {
  // Server-Side Rendering (SSR) guard
  // typeof window check → di server tidak ada 'window', jadi return default
  if (typeof window === 'undefined') return DEFAULT_LANG;

  try {
    const stored = localStorage.getItem('app-language');
    // Validasi: pastikan kode bahasa ada di daftar availableLanguages
    if (stored && availableLanguages.some(l => l.code === stored)) {
      return stored;
    }
  } catch {
    // Error bisa terjadi di private mode, iframe, atau browser lama
    // Jika error, gunakan DEFAULT_LANG
  }

  return DEFAULT_LANG;
}

// ── Buat Context ────────────────────────────────────────────
// createContext(defaultValue) → nilai default ini hanya dipakai
// jika komponen tidak ada di dalam LanguageProvider
// Biasanya tidak terjadi jika main.tsx sudah benar
const LanguageContext = createContext<LanguageContextValue>({
  language          : DEFAULT_LANG,
  languageMeta      : availableLanguages[0],  // Bahasa Indonesia (index 0)
  setLanguage       : () => {},               // Fungsi kosong sebagai placeholder
  version           : 0,
  availableLanguages,
});

// ── LanguageProvider Component ──────────────────────────────
// Komponen ini WAJIB membungkus <App /> di main.tsx
// Semua komponen di dalam Provider bisa akses bahasa via useLanguageContext()
//
// Struktur yang benar di main.tsx:
// <LanguageProvider>
//   <App />
// </LanguageProvider>
export function LanguageProvider({ children }: { children: React.ReactNode }) {

  // State bahasa aktif
  // getInitialLang sebagai fungsi inisialisasi → hanya dipanggil sekali
  const [language, setLanguageState] = useState<string>(getInitialLang);

  // Counter untuk memaksa re-render
  // Dipakai jika ada komponen yang perlu "tahu" bahasa berubah
  // tapi tidak pakai useTranslation() atau t()
  const [version, setVersion] = useState(0);

  // ── Fungsi Ganti Bahasa ───────────────────────────────────
  // useCallback → referensi fungsi tidak berubah tiap render
  // Penting untuk performa: komponen child tidak re-render
  // hanya karena LanguageProvider re-render
  //
  // Cara pakai di komponen:
  // const { setLanguage } = useLanguageContext();
  // setLanguage('en'); // Ganti ke bahasa Inggris
  //
  // JIKA BAHASA TIDAK BERUBAH → Cek apakah i18n.changeLanguage() dipanggil
  const setLanguage = useCallback((langCode: string) => {

    // Validasi kode bahasa
    // Mencegah set bahasa yang tidak didukung (misal: 'fr', 'ar', dll)
    const isValid = availableLanguages.some(l => l.code === langCode);
    if (!isValid) {
      console.warn(`[LanguageContext] Kode bahasa tidak valid: "${langCode}"`);
      return; // Hentikan jika tidak valid
    }

    // ✅ LANGKAH 1: Sync ke i18next
    // PALING PENTING! Ini yang memberitahu react-i18next bahwa bahasa berubah
    // Tanpa ini, t() tidak akan return terjemahan baru
    // Ini yang memicu 'languageChanged' event di semua komponen yang pakai useTranslation()
    i18n.changeLanguage(langCode);

    // ✅ LANGKAH 2: Simpan ke localStorage
    // Agar pilihan bahasa tetap tersimpan saat user tutup & buka kembali aplikasi
    try {
      localStorage.setItem('app-language', langCode);
    } catch {
      // Abaikan error (private mode, storage penuh, dll)
    }

    // ✅ LANGKAH 3: Update React state
    // Memicu re-render LanguageProvider dan semua consumer-nya
    setLanguageState(langCode);

    // ✅ LANGKAH 4: Increment version counter
    // Pakai functional update (v => v + 1) bukan (version + 1)
    // Alasan: 'version' dari closure bisa stale (nilai lama)
    // Functional update selalu dapat nilai terbaru
    setVersion(v => {
      const next = v + 1;
      // Log untuk debugging di development
      console.log(`[LanguageContext] Switched to: ${langCode} (v${next})`);
      return next;
    });

    // ✅ LANGKAH 5: Update atribut lang di HTML
    // Berguna untuk aksesibilitas & SEO
    // Screen reader akan tau bahasa yang dipakai
    // Contoh hasil: <html lang="en">
    if (typeof document !== 'undefined') {
      document.documentElement.lang = langCode;
    }

  }, []); // [] → tidak ada dependency karena pakai functional update

  // ── Effect: Sync Bahasa Saat Pertama Mount ────────────────
  // Dipanggil SEKALI saat LanguageProvider pertama kali ditampilkan
  // Memastikan i18n sinkron dengan localStorage
  //
  // Kasus yang ditangani:
  // User simpan bahasa 'en' di localStorage
  // Tapi i18n entah kenapa inisialisasi dengan 'id'
  // → useEffect ini akan paksa i18n ganti ke 'en'
  //
  // JIKA BAHASA AWAL SALAH → Cek bagian ini
  useEffect(() => {
    // Ambil bahasa yang tersimpan di localStorage
    const savedLang = getInitialLang();

    // Ambil bahasa aktif di i18n
    // split('-')[0] → ambil 'id' dari 'id-ID' (jika ada region code)
    const i18nLang = i18n.language?.split('-')[0];

    // Jika tidak sinkron → paksa sync
    if (i18nLang !== savedLang) {
      i18n.changeLanguage(savedLang);
      setLanguageState(savedLang);
    }

    // Set atribut lang di HTML saat pertama mount
    if (typeof document !== 'undefined') {
      document.documentElement.lang = savedLang;
    }
  }, []); // [] → hanya jalan sekali saat mount, tidak perlu dependency

  // ── Cari Metadata Bahasa ──────────────────────────────────
  // Cari objek lengkap bahasa berdasarkan kode yang aktif
  // Contoh: language='jv' → meta = { code:'jv', name:'Jawa', flag:'🌱', ... }
  // ?? → jika tidak ditemukan (tidak mungkin), pakai bahasa pertama (id)
  const meta =
    availableLanguages.find(l => l.code === language) ?? availableLanguages[0];

  // ── Render Provider ───────────────────────────────────────
  // Semua komponen di dalam children bisa akses nilai di 'value'
  // menggunakan useLanguageContext() atau useContext(LanguageContext)
  return (
    <LanguageContext.Provider
      value={{
        language,                // Kode bahasa aktif: 'id', 'en', 'jv', 'slg'
        languageMeta      : meta, // Info lengkap bahasa aktif
        setLanguage,              // Fungsi untuk ganti bahasa
        version,                  // Counter re-render
        availableLanguages,       // Daftar semua bahasa yang bisa dipilih
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

// ── Hook useLanguageContext ───────────────────────────────────
// Hook ini dipakai di komponen untuk mengakses context bahasa
//
// Cara pakai:
// import { useLanguageContext } from '../context/LanguageContext';
// const { language, setLanguage, availableLanguages } = useLanguageContext();
//
// Atau lebih lengkap, pakai useLocale() dari hooks/useLocale.ts
// karena sudah include fungsi format tanggal, angka, dll
export function useLanguageContext() {
  return useContext(LanguageContext);
}

// ✅ Export default (sebelumnya terpotong: 'export default LanguageCont')
// Dipakai jika ada komponen yang import context langsung
// Contoh: import LanguageContext from '../context/LanguageContext';
export default LanguageContext;
