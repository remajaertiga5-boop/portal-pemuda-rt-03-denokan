import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import i18n from '../i18n/config';
import { availableLanguages, LanguageMetadata } from '../i18n/types';

interface LanguageContextValue {
  language: string;
  languageMeta: LanguageMetadata;
  setLanguage: (lang: string) => void;
  version: number;
  availableLanguages: Readonly<LanguageMetadata[]>;
}

const DEFAULT_LANG = 'id';

function getInitialLang(): string {
  if (typeof window === 'undefined') return DEFAULT_LANG;
  try {
    const stored = localStorage.getItem('app-language');
    if (stored && availableLanguages.some(l => l.code === stored)) return stored;
  } catch {}
  return DEFAULT_LANG;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: DEFAULT_LANG,
  languageMeta: availableLanguages[0],
  setLanguage: () => {},
  version: 0,
  availableLanguages,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<string>(getInitialLang);
  const [version, setVersion] = useState(0);

  const setLanguage = useCallback((langCode: string) => {
    const isValid = availableLanguages.some(l => l.code === langCode);
    if (!isValid) return;

    // Sinkronisasi ke i18next engine
    i18n.changeLanguage(langCode);

    // Simpan permanen
    try { localStorage.setItem('app-language', langCode); } catch {}

    // Update state dan paksa re-render semua komponen
    setLanguageState(langCode);
    setVersion(v => v + 1);

    // Update atribut HTML untuk aksesibilitas
    if (typeof document !== 'undefined') {
      document.documentElement.lang = langCode;
    }
  }, []);

  // Pastikan i18n sinkron saat pertama kali aplikasi dibuka
  useEffect(() => {
    const startLang = getInitialLang();
    i18n.changeLanguage(startLang);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = startLang;
    }
  }, []);

  const meta = availableLanguages.find(l => l.code === language) || availableLanguages[0];

  return (
    <LanguageContext.Provider value={{ language, languageMeta: meta, setLanguage, version, availableLanguages }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguageContext() {
  return useContext(LanguageContext);
}

// Perbaikan ekspor default yang sebelumnya terputus
export default LanguageContext;
