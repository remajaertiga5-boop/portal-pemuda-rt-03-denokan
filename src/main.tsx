import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// ✅ FIXED: Import i18n duluan sebelum App
// agar terjemahan sudah siap saat komponen pertama render
import './i18n/config';
import { i18nInitPromise } from './i18n/config';

// ✅ FIXED: Import CSS sebelum komponen
// agar style sudah ter-apply saat hydration
import './index.css';

import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';

// ✅ ADDED: Guard jika root element tidak ditemukan
// Mencegah crash tanpa pesan error yang jelas
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error(
    '[main.tsx] Element #root tidak ditemukan di index.html.\n' +
    'Pastikan file index.html memiliki <div id="root"></div>.'
  );
}

// ✅ ADDED: Inject tema awal sebelum React mount
// Mencegah Flash of Wrong Theme (FOWT)
// Sinkron dengan themeInitScript dari ThemeContext.tsx
(function applyInitialTheme() {
  try {
    const theme  = localStorage.getItem('app-theme') || 'system';
    const isDark =
      theme === 'dark' ||
      (theme === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      document.documentElement.classList.add('dark');
    }
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';

    // Apply accent color
    const accent = localStorage.getItem('app-accent-color') || 'green';
    document.documentElement.setAttribute('data-accent', accent);

    // Apply font size
    const fontSizeMap: Record<string, string> = {
      'Kecil'       : '14px',
      'Normal'      : '16px',
      'Besar'       : '18px',
      'Sangat Besar': '20px',
    };
    const fontSize = localStorage.getItem('app-font-size') || 'Normal';
    document.documentElement.style.fontSize = fontSizeMap[fontSize] || '16px';

    // Apply reduce motion & high contrast
    if (localStorage.getItem('app-reduce-motion') === 'true') {
      document.documentElement.classList.add('reduce-motion');
    }
    if (localStorage.getItem('app-high-contrast') === 'true') {
      document.documentElement.classList.add('high-contrast');
    }
  } catch {
    // localStorage tidak tersedia (private mode, iframe, dll)
    // Biarkan default — tidak perlu crash
  }
})();

// ✅ ADDED: Error boundary sederhana untuk development
if (import.meta.env.DEV) {
  console.info(
    '%c🚀 Remaja Legok 03 — Dev Mode',
    'color: #10b981; font-weight: bold; font-size: 14px;'
  );
}

// ✅ FIX: Tunggu i18n init selesai sebelum render
// agar useTranslation() langsung punya resources lengkap
i18nInitPromise.then(() => {
  if (import.meta.env.DEV) {
    console.info('[main] i18n ready, rendering App');
  }
  createRoot(rootElement).render(
  <StrictMode>
    {/*
      ThemeProvider harus paling luar
      agar semua komponen bisa akses useTheme()
    */}
    <ThemeProvider>
      <AuthProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
  );
}).catch((err: Error) => {
  console.error('[main] i18n init failed, rendering anyway:', err);
  createRoot(rootElement).render(
    <StrictMode>
      <ThemeProvider>
        <AuthProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </AuthProvider>
      </ThemeProvider>
    </StrictMode>,
  );
});
