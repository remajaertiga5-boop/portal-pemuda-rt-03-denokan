
// ============================================================
// AUTO-RESTORE KonfigurasiAPI dari Environment Variables
// Dijalankan setiap startup — merge, tidak overwrite
// ============================================================
export function autoRestoreKonfigurasiAPI(existingConfigs: any[]): any[] {
  const configs = [...existingConfigs];
  
  // Gemini AI — from Vercel env (support both VITE_ prefix dan tanpa)
  const geminiKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY)
    || (typeof import.meta !== 'undefined' && (import.meta as any).env?.GEMINI_API_KEY)
    || (typeof process !== 'undefined' && (process as any).env?.VITE_GEMINI_API_KEY)
    || (typeof process !== 'undefined' && (process as any).env?.GEMINI_API_KEY)
    || '';
  
  // Gemini AI — always mark as configured
  // Server (api/chat.js) falls back to process.env.GEMINI_API_KEY
  const existingGemini = configs.find((c: any) => c.NamaAPI === 'Gemini AI');
  if (!existingGemini || existingGemini.Status !== 'Aktif' || !existingGemini.ValueField1) {
    const idx = configs.findIndex((c: any) => c.NamaAPI === 'Gemini AI');
    if (idx >= 0) configs.splice(idx, 1);
    configs.push({
      NamaAPI: 'Gemini AI',
      Status: 'Aktif',
      KeyField1: 'API_KEY',
      ValueField1: geminiKey || 'SERVER_ENV',  // fallback: server reads directly from env
      KeyField2: '',
      ValueField2: '',
      KeyField3: '',
      ValueField3: '',
      KeyField4: '',
      ValueField4: '',
      KeyField5: '',
      ValueField5: '',
    });
    console.log('[autoRestore] ✅ Gemini AI auto-configured (via env or server fallback)');
  }
  
  // Google Sheets — from env
  const sheetsUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SHEETS_SCRIPT_URL)
    || (typeof import.meta !== 'undefined' && (import.meta as any).env?.SHEETS_SCRIPT_URL)
    || (typeof process !== 'undefined' && (process as any).env?.VITE_SHEETS_SCRIPT_URL)
    || (typeof process !== 'undefined' && (process as any).env?.SHEETS_SCRIPT_URL)
    || '';
  const sheetsId = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SHEETS_ID)
    || (typeof import.meta !== 'undefined' && (import.meta as any).env?.SHEETS_ID)
    || (typeof process !== 'undefined' && (process as any).env?.VITE_SHEETS_ID)
    || (typeof process !== 'undefined' && (process as any).env?.SHEETS_ID)
    || '1bwb4dIlyLQiq0hMjzC5HGCQPd5cQZVB7ndQ51FaC8R8';
  
  if (sheetsId) {
    const existing = configs.find((c: any) => c.NamaAPI === 'Google Sheets');
    if (!existing || existing.Status !== 'Aktif' || !existing.ValueField1) {
      const idx = configs.findIndex((c: any) => c.NamaAPI === 'Google Sheets');
      if (idx >= 0) configs.splice(idx, 1);
      configs.push({
        NamaAPI: 'Google Sheets',
        Status: 'Aktif',
        KeyField1: 'SCRIPT_URL',
        ValueField1: sheetsUrl || 'https://script.google.com/macros/s/AKfycbx0iBGbgvU_2es_ibVKxbu979oelO21sfZNCySUCE3InykXyP8MOMzt-46yshRq8T-93w/exec',
        KeyField2: 'SHEETS_ID',
        ValueField2: sheetsId,
        KeyField3: '', ValueField3: '',
        KeyField4: '', ValueField4: '',
        KeyField5: '', ValueField5: '',
      });
      console.log('[autoRestore] ✅ Google Sheets auto-configured');
    }
  }

  // Google Drive — inject kedua folder
  const driveFolderBukti = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_DRIVE_FOLDER_BUKTI)
    || (typeof process !== 'undefined' && (process as any).env?.VITE_DRIVE_FOLDER_BUKTI)
    || '18ZbevjsEm8ElZnrLiVB50GBlUtwoYRV7';
  const driveFolderProfil = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_DRIVE_FOLDER_PROFIL)
    || (typeof process !== 'undefined' && (process as any).env?.VITE_DRIVE_FOLDER_PROFIL)
    || '1Kz8foBDUWew090EnGDfuu4T8Yw8FJSzh';

  if (driveFolderBukti || driveFolderProfil) {
    const existing = configs.find((c: any) => c.NamaAPI === 'Google Drive');
    if (!existing || existing.Status !== 'Aktif') {
      const idx = configs.findIndex((c: any) => c.NamaAPI === 'Google Drive');
      if (idx >= 0) configs.splice(idx, 1);
      configs.push({
        NamaAPI: 'Google Drive',
        Status: 'Aktif',
        KeyField1: 'FOLDER_BUKTI',
        ValueField1: driveFolderBukti,
        KeyField2: 'FOLDER_PROFIL',
        ValueField2: driveFolderProfil,
        KeyField3: '', ValueField3: '',
        KeyField4: '', ValueField4: '',
        KeyField5: '', ValueField5: '',
      });
      console.log('[autoRestore] ✅ Google Drive auto-configured');
    }
  }
  
  // Telegram Bot — from env + hardcoded fallback
  const telegramToken = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_TELEGRAM_BOT_TOKEN)
    || (typeof import.meta !== 'undefined' && (import.meta as any).env?.TELEGRAM_BOT_TOKEN)
    || (typeof process !== 'undefined' && (process as any).env?.VITE_TELEGRAM_BOT_TOKEN)
    || (typeof process !== 'undefined' && (process as any).env?.TELEGRAM_BOT_TOKEN)
    || '8805899577:AAHKGy-z3oO2oIkIO1FUDhXLtZwQGdVIzsg';
  const telegramChatId = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_TELEGRAM_CHAT_ID)
    || (typeof import.meta !== 'undefined' && (import.meta as any).env?.TELEGRAM_CHAT_ID)
    || (typeof process !== 'undefined' && (process as any).env?.VITE_TELEGRAM_CHAT_ID)
    || (typeof process !== 'undefined' && (process as any).env?.TELEGRAM_CHAT_ID)
    || '-1004474501263';
  
  if (telegramToken && telegramChatId) {
    const existing = configs.find((c: any) => c.NamaAPI === 'Telegram Bot');
    if (!existing || existing.Status !== "Aktif" || !existing.ValueField1) {
      const idx = configs.findIndex((c: any) => c.NamaAPI === 'Telegram Bot');
      if (idx >= 0) configs.splice(idx, 1);
      configs.push({
        NamaAPI: 'Telegram Bot',
        Status: 'Aktif',
        KeyField1: 'BOT_TOKEN',
        ValueField1: telegramToken,
        KeyField2: 'CHAT_ID',
        ValueField2: telegramChatId,
        KeyField3: '', ValueField3: '',
        KeyField4: '', ValueField4: '',
        KeyField5: '', ValueField5: '',
      });
      console.log('[autoRestore] ✅ Telegram Bot auto-configured from env');
    }
  }
  
  return configs;
}
