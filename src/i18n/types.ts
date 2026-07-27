// ============================================================
// Shared i18n types & constants — NO circular deps
// ============================================================

export interface LanguageMetadata {
  code      : string;
  name      : string;
  nativeName: string;
  flag      : string;
  dir       : 'ltr' | 'rtl';
}

export const availableLanguages: Readonly<LanguageMetadata[]> = Object.freeze([
  { code: 'id',  name: 'Indonesia',  nativeName: 'Bahasa Indonesia', flag: '🇮🇩', dir: 'ltr' },
  { code: 'en',  name: 'English',    nativeName: 'English',          flag: '🇬🇧', dir: 'ltr' },
  { code: 'jv',  name: 'Jawa',       nativeName: 'Basa Jawa',        flag: '🌱', dir: 'ltr' },
  { code: 'slg', name: 'Gaul',       nativeName: 'Bahasa Gaul 🔥',   flag: '💬', dir: 'ltr' },
]);
