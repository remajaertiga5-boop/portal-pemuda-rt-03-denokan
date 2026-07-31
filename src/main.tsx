// ============================================================
// FILE: src/main.tsx
// FUNGSI: Entry point utama aplikasi React
//
// CARA KERJA:
// 1. Siapkan tema awal (cegah flash tema salah)
// 2. Tunggu i18n selesai inisialisasi
// 3. Render komponen Root ke DOM
//
// URUTAN PROVIDER (dari luar ke dalam):
// StrictMode        → Deteksi masalah di development
//   ThemeProvider   → Kelola tema (light/dark/system)
//     AuthProvider  → Kelola autentikasi & sesi user
//       LanguageProvider → Kelola bahasa aktif ✅ (HARUS di luar ErrorBoundary)
//         ErrorBoundary  → Tangkap error React yang tidak tertangani
//           App          → Komponen utama aplikasi
//
// JIKA APLIKASI TIDAK MUNCUL → Cek elemen #root di index.html
// JIKA BAHASA TIDAK BEKERJA  → Cek posisi LanguageProvider di sini
// JIKA TEMA FLASH             → Cek fungsi applyInitialTheme di bawah
// ============================================================

// ── Import i18n Pertama Kali ────────────────────────────────
// PENTING: i18n harus diimport SEBELUM komponen apapun
// Agar terjemahan sudah siap saat komponen pertama render
// ✅ FIX: Hanya perlu SATU import dari './i18n/config'
//        (sebelumnya ada 2 baris import dari file yang sama)
import { i18nInitPromise } from './i18n/config';

// ── Import CSS Global ───────────────────────────────────────
// Import CSS sebelum komponen agar styling sudah aktif saat render
// Jika urutan terbalik, bisa terjadi FOUC (Flash of Unstyled Content)
import './index.css';

import { StrictMode } from 'react';
import { createRoot }  from 'react-dom/client';

// Komponen utama
import App from './App';

// Provider-provider global (urutan penting!)
import { ThemeProvider }    from './context/ThemeContext';
import { AuthProvider }     from './context/AuthContext';
import { ErrorBoundary }    from './components/ErrorBoundary';
import { LanguageProvider } from './context/LanguageContext';

// ── Guard: Cari Root Element ────────────────────────────────
// Pastikan elemen <div id="root"> ada di index.html
// Jika tidak ada → lempar error yang jelas (tidak crash diam-diam)
const rootElement = document.getElementById('root');

if (!rootElement) {
  // Jika ini muncul → buka index.html dan pastikan ada <div id="root"></div>
  throw new Error(
    '[main.tsx] Element #root tidak ditemukan di index.html.\n' +
    'Pastikan file index.html memiliki <div id="root"></div>.'
  );
}

// ── Apply Tema Awal (Sebelum React Mount) ───────────────────
// Fungsi ini dijalankan SEBELUM React render pertama kali
// Tujuan: mencegah "Flash of Wrong Theme" (FOWT)
// Yaitu saat tema gelap tapi sebentar tampil terang dulu
//
// Cara kerja:
// 1. Baca pengaturan dari localStorage
// 2. Langsung apply ke <html> element
// 3. React akan render dengan tema yang sudah benar
//
// JIKA TEMA SALAH SAAT PERTAMA BUKA → Cek localStorage 'app-theme'
// JIKA FONT SIZE SALAH → Cek localStorage 'app-font-size'
(function applyInitialTheme() {
  try {
    // ── Tema Gelap/Terang ─────────────────────────────────
    // Ambil pilihan tema user ('light', 'dark', atau 'system')
    const theme = localStorage.getItem('app-theme') || 'system';

    // Tentukan apakah harus pakai mode gelap
    const isDark =
      theme === 'dark' || // User pilih manual: gelap
      (theme === 'system' && // User pilih: ikuti sistem
        window.matchMedia('(prefers-color-scheme: dark)').matches); // Dan sistem gelap

    // Apply class 'dark' ke <html> untuk Tailwind dark mode
    // Tailwind CSS akan aktifkan semua style dengan prefix 'dark:'
    if (isDark) document.documentElement.classList.add('dark');

    // colorScheme → memberitahu browser untuk sesuaikan scrollbar,
    // input, dll dengan tema yang aktif
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';

    // ── Warna Aksen ──────────────────────────────────────
    // Warna aksen = warna utama UI (tombol, highlight, dll)
    // Nilai: 'green', 'blue', 'rose', 'amber', 'purple'
    // Dipakai oleh CSS variable via data-accent attribute
    const accent = localStorage.getItem('app-accent-color') || 'green';
    document.documentElement.setAttribute('data-accent', accent);

    // ── Ukuran Font ──────────────────────────────────────
    // Map nama ukuran → nilai pixel
    // Jika ingin TAMBAH ukuran baru:
    // 1. Tambah entry di fontSizeMap
    // 2. Tambah pilihan di Pengaturan.tsx
    // 3. Tambah terjemahan di locale files (settings.appearance.fontSize)
    const fontSizeMap: Record<string, string> = {
      'Kecil'       : '14px',
      'Normal'      : '16px',
      'Besar'       : '18px',
      'Sangat Besar': '20px',
    };
    const fontSize = localStorage.getItem('app-font-size') || 'Normal';
    // Set font-size di <html> → semua 'rem' unit mengikuti ini
    document.documentElement.style.fontSize = fontSizeMap[fontSize] || '16px';

    // ── Aksesibilitas: Kurangi Animasi ───────────────────
    // Untuk user yang sensitif terhadap gerakan/animasi
    // CSS akan disable/kurangi animasi jika class ini ada
    if (localStorage.getItem('app-reduce-motion') === 'true') {
      document.documentElement.classList.add('reduce-motion');
    }

    // ── Aksesibilitas: Kontras Tinggi ─────────────────────
    // Untuk user yang butuh kontras lebih tinggi untuk membaca
    // CSS akan tingkatkan kontras warna jika class ini ada
    if (localStorage.getItem('app-high-contrast') === 'true') {
      document.documentElement.classList.add('high-contrast');
    }

  } catch {
    // localStorage tidak tersedia (private mode, iframe, dll)
    // Biarkan default — jangan crash aplikasi hanya karena ini
  }
})(); // () di akhir → langsung jalankan fungsi (IIFE)

// ── Development Mode Info ───────────────────────────────────
// Hanya tampil di console saat mode development (npm run dev)
// Tidak akan muncul saat production build (npm run build)
if (import.meta.env.DEV) {
  console.info(
    '%c🚀 Remaja Legok 03 — Dev Mode',
    'color: #10b981; font-weight: bold; font-size: 14px;'
  );
}

// ── Komponen Root ────────────────────────────────────────────
// Dipisah menjadi komponen sendiri agar bisa dipakai
// di dua tempat: i18n berhasil & i18n gagal (error fallback)
//
// URUTAN PROVIDER SANGAT PENTING:
// - Provider di luar bisa diakses oleh Provider di dalam
// - Provider di dalam TIDAK BISA diakses oleh Provider di luar
//
// ✅ FIX: LanguageProvider HARUS di LUAR ErrorBoundary
// Alasan: ErrorBoundary perlu akses bahasa untuk tampilkan
//         pesan error dalam bahasa yang benar
function Root() {
  return (
    <StrictMode>
      {/*
        StrictMode:
        - Hanya aktif di development
        - Deteksi masalah potensial (deprecated API, side effects, dll)
        - Render komponen DUA KALI di dev untuk deteksi efek samping
        - Tidak berpengaruh di production
      */}

      <ThemeProvider>
        {/*
          ThemeProvider:
          - Kelola state tema: light / dark / system
          - Sediakan: isDark, toggleTheme, setTheme, fontSize, accentColor
          - Pakai dengan: const { isDark } = useTheme();
          - HARUS paling luar karena semua komponen butuh tema
        */}

        <AuthProvider>
          {/*
            AuthProvider:
            - Kelola state autentikasi global (jika ada)
            - Sediakan: user, login, logout, isAuthenticated
            - Pakai dengan: const { user } = useAuth();
          */}

          <LanguageProvider>
            {/*
              LanguageProvider: ✅ DI LUAR ErrorBoundary
              - Kelola state bahasa aktif
              - Sediakan: language, setLanguage, availableLanguages
              - Pakai dengan: const { language } = useLanguageContext();
              - Atau lebih mudah: const { t } = useLocale();
              
              MENGAPA DI LUAR ErrorBoundary?
              ErrorBoundary menampilkan pesan error.
              Agar pesan error bisa diterjemahkan,
              ErrorBoundary harus ada di DALAM LanguageProvider.
            */}

            <ErrorBoundary>
              {/*
                ErrorBoundary:
                - Tangkap error React yang tidak tertangani
                - Tampilkan UI error yang ramah user (bukan layar putih)
                - Mencegah seluruh aplikasi crash hanya karena 1 komponen error
                
                JIKA LAYAR PUTIH MUNCUL → Biasanya ada error yang
                tertangkap ErrorBoundary. Cek console untuk detail.
              */}

              <App />
              {/*
                App:
                - Komponen utama yang berisi semua halaman
                - Routing, navigasi, dan konten ada di sini
              */}

            </ErrorBoundary>
          </LanguageProvider>
        </AuthProvider>
      </ThemeProvider>
    </StrictMode>
  );
}

// ── Render ke DOM ────────────────────────────────────────────
// Tunggu i18n selesai init SEBELUM render
// Tujuan: pastikan terjemahan sudah ada saat komponen pertama render
// Tanpa ini, komponen render dulu dengan key mentah, baru terjemahan muncul
//
// JIKA APLIKASI LAMBAT PERTAMA BUKA → i18nInitPromise mungkin lambat
// Solusi: pastikan file locale tidak terlalu besar
i18nInitPromise
  .then(() => {
    // i18n berhasil inisialisasi → render normal
    if (import.meta.env.DEV) {
      console.info('[main] i18n ready ✅ — rendering App');
    }
    createRoot(rootElement).render(<Root />);
  })
  .catch((err: Error) => {
    // i18n gagal inisialisasi (sangat jarang terjadi)
    // Tetap render aplikasi agar user tidak melihat layar kosong
    // Bahasa akan fallback ke 'id' (Indonesia)
    console.error('[main] i18n init gagal, render tetap jalan:', err);
    createRoot(rootElement).render(<Root />);
  });
