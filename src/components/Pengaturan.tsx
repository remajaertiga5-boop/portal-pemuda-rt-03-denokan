{/* Pilihan Bahasa - Perbaikan Grid untuk 4 bahasa */}
<div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 relative overflow-hidden">
  {isChangingLanguage && (
    <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-[2px] flex flex-col items-center justify-center z-10">
      <div className="w-8 h-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin mb-2" />
    </div>
  )}
  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
    {t('settings.appearance.language.title', { defaultValue: 'Bahasa Aplikasi' })}
  </h3>
  
  {/* GRID FIX: Menggunakan grid-cols-2 agar tampil bagus di mobile (2 baris x 2 kolom) */}
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
    {availableLanguages.map((lang) => (
      <button 
        type="button"
        key={lang.code}
        onClick={() => handleLanguageChange(lang.code)}
        className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center gap-1 ${
          currentLanguage === lang.code 
            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-bold' 
            : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400'
        }`}
      >
        <span className="text-xl">{lang.flag}</span>
        <span className="text-[11px] font-bold">{lang.name}</span>
      </button>
    ))}
  </div>
</div>
