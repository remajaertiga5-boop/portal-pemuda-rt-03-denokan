import React, { useState } from "react";
import { 
  Plug, Key, CheckCircle2, XCircle, Eye, EyeOff, Save, 
  Trash2, RefreshCw, ExternalLink, Info, Shield, AlertTriangle
} from "lucide-react";
import { AppData, saveAppData, addLogAkses } from "../utils/dataStore";
import { KonfigurasiAPIItem } from "../types";

// ============================================================
// DEFINISI API YANG DIDUKUNG
// ============================================================
interface ApiDefinition {
  id: string;
  nama: string;
  kategori: string;
  icon: string;
  deskripsi: string;
  fiturTerkait: string[];
  fields: { key: string; label: string; placeholder: string; type: "text" | "password"; hint: string }[];
  docsUrl?: string;
}

const API_DEFINITIONS: ApiDefinition[] = [
  {
    id: "gemini-ai",
    nama: "Gemini AI",
    kategori: "Layanan AI",
    icon: "🤖",
    deskripsi: "Kunci API Google Gemini untuk mengaktifkan Asisten Pemuda AI (Chatbot). Tanpa ini, chatbot hanya berjalan dalam mode lokal terbatas.",
    fiturTerkait: ["Chatbot AI", "Asisten Pemuda"],
    fields: [
      { key: "API_KEY", label: "Gemini API Key", placeholder: "AIzaSy...", type: "password", hint: "Dapatkan dari https://aistudio.google.com/apikey" }
    ],
    docsUrl: "https://aistudio.google.com/apikey"
  },
  {
    id: "google-sheets",
    nama: "Google Sheets",
    kategori: "Database",
    icon: "📊",
    deskripsi: "Integrasi dengan Google Sheets untuk sinkronisasi data Keuangan, Anggota, dan Iuran. Data disimpan otomatis ke spreadsheet.",
    fiturTerkait: ["Keuangan Kas", "Iuran Anggota", "Data Anggota"],
    fields: [
      { key: "SCRIPT_URL", label: "Apps Script URL", placeholder: "https://script.google.com/macros/s/.../exec", type: "text", hint: "Deploy Google Apps Script sebagai Web App, lalu copy URL-nya" },
      { key: "SHEETS_ID", label: "Spreadsheet ID", placeholder: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms", type: "text", hint: "ID dari URL spreadsheet: docs.google.com/spreadsheets/d/[ID ini]/edit" }
    ],
    docsUrl: "https://developers.google.com/apps-script"
  },
  {
    id: "telegram-bot",
    nama: "Telegram Bot",
    kategori: "Notifikasi & Telegram",
    icon: "📸",
    deskripsi: "Bot Telegram untuk menyimpan foto & video Galeri secara otomatis. Juga untuk notifikasi ke channel/group.",
    fiturTerkait: ["Galeri Foto/Video", "Notifikasi"],
    fields: [
      { key: "BOT_TOKEN", label: "Bot Token", placeholder: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11", type: "password", hint: "Dapatkan dari @BotFather di Telegram. Format: 123456:ABC-DEF..." },
      { key: "CHAT_ID", label: "Chat ID / Channel ID", placeholder: "-1001234567890", type: "text", hint: "ID channel/group Telegram. Bisa dicek lewat @userinfobot" }
    ],
    docsUrl: "https://core.telegram.org/bots"
  },
  {
    id: "google-drive",
    nama: "Google Drive",
    kategori: "Penyimpanan",
    icon: "👤",
    deskripsi: "Folder Google Drive untuk menyimpan foto profil anggota. Foto diupload ke folder khusus dan bisa diakses via link.",
    fiturTerkait: ["Foto Profil Anggota"],
    fields: [
      { key: "FOLDER_ID", label: "Folder ID", placeholder: "1abc123...", type: "text", hint: "ID folder Google Drive untuk foto profil. URL: drive.google.com/drive/folders/[ID ini]" }
    ],
    docsUrl: "https://drive.google.com"
  }
];

// ============================================================
// PROPS
// ============================================================
interface ApiConfigPanelProps {
  appData: AppData;
  setAppData: React.Dispatch<React.SetStateAction<AppData>>;
  showToast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
}

// ============================================================
// HELPER: Ambil/simpan konfigurasi API
// ============================================================
function getApiConfig(appData: AppData, namaAPI: string): KonfigurasiAPIItem | undefined {
  return (appData.KonfigurasiAPI || []).find(c => c.NamaAPI === namaAPI);
}

function getApiFieldValue(appData: AppData, namaAPI: string, fieldKey: string): string {
  const config = getApiConfig(appData, namaAPI);
  if (!config) return "";
  if (config.KeyField1 === fieldKey) return config.ValueField1 || "";
  if (config.KeyField2 === fieldKey) return config.ValueField2 || "";
  if (config.KeyField3 === fieldKey) return config.ValueField3 || "";
  return "";
}

function isApiConfigured(appData: AppData, namaAPI: string): boolean {
  const config = getApiConfig(appData, namaAPI);
  if (!config || config.Status !== "Aktif") return false;
  const def = API_DEFINITIONS.find(d => d.nama === namaAPI);
  if (!def) return false;
  // Cek field pertama harus diisi
  const firstField = def.fields[0];
  return !!getApiFieldValue(appData, namaAPI, firstField.key);
}

// ============================================================
// COMPONENT
// ============================================================
export default function ApiConfigPanel({ appData, setAppData, showToast }: ApiConfigPanelProps) {
  const [editingApi, setEditingApi] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [savingApi, setSavingApi] = useState<string | null>(null);
  
  // Temporary form values
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const togglePassword = (key: string) => {
    setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const startEdit = (def: ApiDefinition) => {
    setEditingApi(def.nama);
    // Load current values
    const vals: Record<string, string> = {};
    def.fields.forEach(f => {
      vals[f.key] = getApiFieldValue(appData, def.nama, f.key);
    });
    setFormValues(vals);
  };

  const cancelEdit = () => {
    setEditingApi(null);
    setFormValues({});
  };

  const handleSaveApi = (def: ApiDefinition) => {
    setSavingApi(def.nama);

    // Validate first field
    const firstField = def.fields[0];
    if (!formValues[firstField.key]?.trim()) {
      showToast(`⚠️ ${firstField.label} wajib diisi!`, "warning");
      setSavingApi(null);
      return;
    }

    // Build KonfigurasiAPIItem
    const existing = getApiConfig(appData, def.nama);
    const newConfig: KonfigurasiAPIItem = {
      ID: existing?.ID || `API-${Date.now()}`,
      NamaAPI: def.nama,
      Kategori: def.kategori,
      Status: "Aktif",
      Keterangan: `Digunakan oleh: ${def.fiturTerkait.join(", ")}`,
      KeyField1: def.fields[0]?.key || "",
      ValueField1: formValues[def.fields[0]?.key || ""] || "",
      KeyField2: def.fields[1]?.key || "",
      ValueField2: def.fields[1] ? (formValues[def.fields[1].key] || "") : "",
      KeyField3: def.fields[2]?.key || "",
      ValueField3: def.fields[2] ? (formValues[def.fields[2].key] || "") : "",
    };

    // (R2 extras handling removed)

    // Save to appData
    const updatedKonfigurasi = (appData.KonfigurasiAPI || []).filter(
      c => c.NamaAPI !== def.nama
    );
    updatedKonfigurasi.push(newConfig);

    const updated = {
      ...appData,
      KonfigurasiAPI: updatedKonfigurasi
    };

    const logged = addLogAkses(
      updated,
      "Super Admin",
      "SUPER_ADMIN",
      "KONFIGURASI_API",
      `Menyimpan konfigurasi API: ${def.nama}`
    );

    setAppData(logged);
    saveAppData(logged);

    setTimeout(() => {
      setSavingApi(null);
      setEditingApi(null);
      setFormValues({});
      showToast(`✅ Konfigurasi ${def.nama} berhasil disimpan!`, "success");
    }, 400);
  };

  const handleDeleteApi = (def: ApiDefinition) => {
    const updatedKonfigurasi = (appData.KonfigurasiAPI || []).filter(
      c => c.NamaAPI !== def.nama
    );

    const updated = {
      ...appData,
      KonfigurasiAPI: updatedKonfigurasi
    };

    const logged = addLogAkses(
      updated,
      "Super Admin",
      "SUPER_ADMIN",
      "HAPUS_API_CONFIG",
      `Menghapus konfigurasi API: ${def.nama}`
    );

    setAppData(logged);
    saveAppData(logged);
    showToast(`🗑️ Konfigurasi ${def.nama} dihapus`, "info");
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-900 via-cyan-900 to-slate-900 text-white p-5 rounded-2xl">
        <div className="flex items-center gap-2 mb-1">
          <Plug size={18} className="text-teal-300" />
          <span className="text-xs font-bold uppercase tracking-wider text-teal-300">Integrasi Sistem</span>
        </div>
        <h2 className="text-xl font-black">🔌 Konfigurasi API & Layanan</h2>
        <p className="text-teal-200/80 text-xs mt-1">
          Sambungkan layanan eksternal untuk mengaktifkan fitur AI, penyimpanan cloud, dan sinkronisasi data.
        </p>
      </div>

      {/* Info box */}
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-4 rounded-2xl flex gap-3">
        <Shield size={20} className="text-amber-600 mt-0.5 shrink-0" />
        <div className="text-xs text-amber-800 dark:text-amber-400">
          <p className="font-bold mb-1">🔒 Kunci API disimpan aman di browser (localStorage)</p>
          <p>Hanya Super Admin yang dapat melihat dan mengubah konfigurasi ini. Kunci API tidak dikirim ke server pihak ketiga tanpa izin Anda.</p>
        </div>
      </div>

      {/* API Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {API_DEFINITIONS.map(def => {
          const configured = isApiConfigured(appData, def.nama);
          const isEditing = editingApi === def.nama;
          const isSaving = savingApi === def.nama;

          return (
            <div 
              key={def.id}
              className={`bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden transition-all ${
                configured 
                  ? "border-emerald-200 dark:border-emerald-900/40" 
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              {/* Card Header */}
              <div className={`p-4 flex items-center justify-between ${
                configured ? "bg-emerald-50/50 dark:bg-emerald-950/10" : "bg-slate-50 dark:bg-slate-800/30"
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{def.icon}</span>
                  <div>
                    <h3 className="font-black text-sm text-slate-800 dark:text-slate-200">{def.nama}</h3>
                    <p className="text-[10px] text-slate-500">{def.kategori}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {configured ? (
                    <span className="flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-full">
                      <CheckCircle2 size={12} /> Terhubung
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-bold rounded-full">
                      <XCircle size={12} /> Belum
                    </span>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                  {def.deskripsi}
                </p>

                {isEditing ? (
                  /* EDIT MODE */
                  <div className="space-y-3">
                    {def.fields.map((field, idx) => {
                      const fieldValue = formValues[field.key] || "";
                      
                      return (
                        <div key={field.key}>
                          <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                            {field.label} {idx === 0 && <span className="text-rose-500">*</span>}
                          </label>
                          <div className="relative">
                            <input
                              type={field.type === "password" && !showPasswords[`${def.id}-${field.key}`] ? "password" : "text"}
                              value={fieldValue}
                              onChange={e => setFormValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                              placeholder={field.placeholder}
                              className="w-full p-2.5 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:ring-2 focus:ring-teal-500 outline-none dark:text-slate-200"
                            />
                            {field.type === "password" && (
                              <button
                                type="button"
                                onClick={() => togglePassword(`${def.id}-${field.key}`)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              >
                                {showPasswords[`${def.id}-${field.key}`] ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                            )}
                          </div>
                          <p className="text-[9px] text-slate-400 mt-0.5">{field.hint}</p>
                        </div>
                      );
                    })}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleSaveApi(def)}
                        disabled={isSaving}
                        className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                      >
                        {isSaving ? (
                          <><RefreshCw size={14} className="animate-spin" /> Menyimpan...</>
                        ) : (
                          <><Save size={14} /> Simpan Konfigurasi</>
                        )}
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={isSaving}
                        className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold transition-all"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  /* VIEW MODE */
                  <div>
                    {configured ? (
                      <div className="space-y-2 mb-3">
                        {def.fields.map(field => {
                          const val = getApiFieldValue(appData, def.nama, field.key);
                          if (!val) return null;
                          const display = field.type === "password" 
                            ? (showPasswords[`${def.id}-${field.key}`] ? val : "••••••••••••")
                            : val;
                          return (
                            <div key={field.key} className="flex items-center justify-between text-[10px] bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                              <span className="font-bold text-slate-500">{field.label}</span>
                              <span className="font-mono text-slate-600 dark:text-slate-400 truncate max-w-[180px]">{display}</span>
                              {field.type === "password" && (
                                <button onClick={() => togglePassword(`${def.id}-${field.key}`)} className="text-slate-400">
                                  {showPasswords[`${def.id}-${field.key}`] ? <EyeOff size={12} /> : <Eye size={12} />}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/20 rounded-xl mb-3">
                        <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                        <p className="text-[10px] text-amber-700 dark:text-amber-400">
                          Belum dikonfigurasi. Fitur <strong>{def.fiturTerkait.join(", ")}</strong> tidak akan aktif.
                        </p>
                      </div>
                    )}

                    {/* View Mode Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(def)}
                        className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Key size={12} /> {configured ? "Edit Kunci API" : "Masukkan Kunci API"}
                      </button>
                      {configured && (
                        <button
                          onClick={() => handleDeleteApi(def)}
                          className="px-3 py-2 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition-all"
                          title="Hapus konfigurasi"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="px-4 pb-3 flex flex-wrap gap-1">
                {def.fiturTerkait.map(fitur => (
                  <span key={fitur} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[9px] font-medium text-slate-500 dark:text-slate-400 rounded-full">
                    {fitur}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Restart Info */}
      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl text-center">
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          💡 Setelah menyimpan konfigurasi API, fitur terkait akan otomatis aktif. 
          Tidak perlu restart aplikasi.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// EXPORT HELPER — digunakan oleh App.tsx untuk feature gating
// ============================================================
export { isApiConfigured, API_DEFINITIONS };
export type { ApiDefinition };
