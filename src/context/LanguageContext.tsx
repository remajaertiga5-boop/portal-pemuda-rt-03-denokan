import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import i18n from '../i18n/config';
import { availableLanguages, LanguageMetadata } from '../i18n/types';

interface LanguageContextValue {
  language          : string;
  languageMeta      : LanguageMetadata;
  setLanguage       : (lang: string) => void;
  version           : number;
  availableLanguages: Readonly<LanguageMetadata[]>;
}

const DEFAULT_LANG = 'id';

function getInitialLang(): string {
  if (typeof window === 'undefined') return DEFAULT_LANG;
  try {
    const stored = localStorage.getItem('app-language');
    if (stored && availableLanguages.some(l => l.code === stored)) {
      return stored;
    }
  } catch {}
  return DEFAULT_LANG;
}

const LanguageContext = createContext<LanguageContextValue>({
  language          : DEFAULT_LANG,
  languageMeta      : availableLanguages[0],
  setLanguage       : () => {},
  version           : 0,
  availableLanguages,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<string>(getInitialLang);
  const [version,  setVersion]       = useState(0);

  const setLanguage = useCallback((langCode: string) => {
    const isValid = availableLanguages.some(l => l.code === langCode);
    if (!isValid) {
      console.warn(`[LanguageContext] Kode bahasa tidak valid: "${langCode}"`);
      return;
    }

    // 1. Sync ke i18next — paling penting!
    i18n.changeLanguage(langCode);

    // 2. Simpan ke localStorage
    try {
      localStorage.setItem('app-language', langCode);
    } catch {}

    // 3. Update React state
    setLanguageState(langCode);

    // 4. Increment version (functional update agar tidak stale)
    setVersion(v => {
      const next = v + 1;
      console.log(`[LanguageContext] Switched to: ${langCode} (v${next})`);
      return next;
    });

    // 5. Update atribut lang di HTML
    if (typeof document !== 'undefined') {
      document.documentElement.lang = langCode;
    }
  }, []);

  // Sync bahasa saat pertama mount
  useEffect(() => {
    const savedLang = getInitialLang();
    const i18nLang  = i18n.language?.split('-')[0];

    if (i18nLang !== savedLang) {
      i18n.changeLanguage(savedLang);
      setLanguageState(savedLang);
    }

    if (typeof document !== 'undefined') {
      document.documentElement.lang = savedLang;
    }
  }, []);

  const meta =
    availableLanguages.find(l => l.code === language) ?? availableLanguages[0];

  return (
    <LanguageContext.Provider
      value={{
        language,
        languageMeta      : meta,
        setLanguage,
        version,
        availableLanguages,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguageContext() {
  return useContext(LanguageContext);
}

export default LanguageContext;
