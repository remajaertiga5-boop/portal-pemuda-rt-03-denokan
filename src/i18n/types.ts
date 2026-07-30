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
  { code: 'id',  name: 'Bahasa Indonesia',  nativeName: 'Bahasa Indonesia', flag: '🇮🇩', dir: 'ltr' },
  { code: 'en',  name: 'Inggris',          nativeName: 'English',          flag: '🇬🇧', dir: 'ltr' },
  { code: 'jv',  name: 'Jawa',              nativeName: 'Basa Jawa',        flag: '🌱', dir: 'ltr' },
  { code: 'slg', name: 'Bahasa Indonesia Gaul', nativeName: 'Bahasa Gaul 🔥', flag: '💬', dir: 'ltr' },
]);
