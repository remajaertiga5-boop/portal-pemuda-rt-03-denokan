import { i18nInitPromise } from './i18n/config';
import './index.css';

import { StrictMode } from 'react';
import { createRoot }  from 'react-dom/client';

import App                       from './App';
import { ThemeProvider }         from './context/ThemeContext';
import { AuthProvider }          from './context/AuthContext';
import { ErrorBoundary }         from './components/ErrorBoundary';
import { LanguageProvider }      from './context/LanguageContext';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error(
    '[main.tsx] Element #root tidak ditemukan di index.html.\n' +
    'Pastikan file index.html memiliki <div id="root"></div>.'
  );
}

(function applyInitialTheme() {
  try {
    const theme  = localStorage.getItem('app-theme') || 'system';
    const isDark =
      theme === 'dark' ||
      (theme === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';

    const accent = localStorage.getItem('app-accent-color') || 'green';
    document.documentElement.setAttribute('data-accent', accent);

    const fontSizeMap: Record<string, string> = {
      'Kecil'       : '14px',
      'Normal'      : '16px',
      'Besar'       : '18px',
      'Sangat Besar': '20px',
    };
    const fontSize = localStorage.getItem('app-font-size') || 'Normal';
    document.documentElement.style.fontSize = fontSizeMap[fontSize] || '16px';

    if (localStorage.getItem('app-reduce-motion') === 'true') {
      document.documentElement.classList.add('reduce-motion');
    }
    if (localStorage.getItem('app-high-contrast') === 'true') {
      document.documentElement.classList.add('high-contrast');
    }
  } catch {}
})();

if (import.meta.env.DEV) {
  console.info(
    '%c🚀 Remaja Legok 03 — Dev Mode',
    'color: #10b981; font-weight: bold; font-size: 14px;'
  );
}

function Root() {
  return (
    <StrictMode>
      <ThemeProvider>
        <AuthProvider>
          <LanguageProvider>
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
          </LanguageProvider>
        </AuthProvider>
      </ThemeProvider>
    </StrictMode>
  );
}

i18nInitPromise
  .then(() => {
    if (import.meta.env.DEV) {
      console.info('[main] i18n ready ✅ — rendering App');
    }
    createRoot(rootElement).render(<Root />);
  })
  .catch((err: Error) => {
    console.error('[main] i18n init gagal, render tetap jalan:', err);
    createRoot(rootElement).render(<Root />);
  });
