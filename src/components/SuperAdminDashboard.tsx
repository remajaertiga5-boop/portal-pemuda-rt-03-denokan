import React, { useState, useEffect, lazy, Suspense } from "react";
import {
  Crown, Users, Shield, Key, FileText, Database, Archive,
  Lock, Image, Printer, Plug, Loader2, Cloud, CloudOff, RefreshCw
} from "lucide-react";
import { AppData, addLogAkses } from "../utils/dataStore";
import { saveToSheets, onSyncChange, getSyncStatus } from "../utils/dataStoreSheets";
import type { SyncStatus } from "../utils/dataStoreSheets";
import { verifikasiPINDinamis } from "../utils/auth";
import PINField from "./PINField";
import MatriksHakAksesModal from "./MatriksHakAksesModal";
import ApiConfigPanel from "./ApiConfigPanel";
import ErrorBoundaryTab from "./ErrorBoundaryTab";
import KelolaPinTab from "./KelolaPinTab";
import ArsipTab from "./ArsipTab";
import LogTab from "./LogTab";
import { useSuperAdminState } from "../hooks/useSuperAdminState";

// Lazy load komponen berat
const ManajemenAnggotaSA = lazy(() => import("./ManajemenAnggotaSA"));
const GaleriSuperAdmin   = lazy(() => import("./GaleriSuperAdmin"));

// ── Props ────────────────────────────────────────────────
interface SuperAdminDashboardProps {
  appData   : AppData;
  setAppData: React.Dispatch<React.SetStateAction<AppData>>;
  showToast : (msg: string, type: "success" | "error" | "info" | "warning") => void;
}

// ── Helpers ──────────────────────────────────────────────
function LoadingSpinner({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
      <Loader2 size={24} className="animate-spin" />
      <span className="text-xs font-bold">Memuat {label}...</span>
    </div>
  );
}

function TabContent({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div key={id} className="animate-in fade-in slide-in-from-bottom-1 duration-200">
      {children}
    </div>
  );
}

// ── Component ────────────────────────────────────────────
export default function SuperAdminDashboard({ appData, setAppData, showToast }: SuperAdminDashboardProps) {

  const { state, dispatch } = useSuperAdminState();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncMsg, setSyncMsg] = useState("");

  // Realtime clock
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setSyncStatus(getSyncStatus());
    return onSyncChange((s, m) => { setSyncStatus(s); if (m) setSyncMsg(m); });
  }, []);

  // ── Derived ────────────────────────────────────────────
  const archivedCount = appData.Anggota.filter(a => a.Status_Tampil === "ARSIP").length;
  const logCount       = (appData.LogAkses || []).length;

  // ── Handlers ───────────────────────────────────────────
  const handleBackupData = () => {
    const json = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData, null, 2));
    const a = document.createElement("a");
    a.href = json;
    a.download = `backup_remaja_legok_03_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    showToast("Backup data JSON berhasil diunduh!", "success");
  };

  const handleCetakDaftar = () => window.print();

  const handleSyncToSheets = async () => {
    await saveToSheets(appData);
  };

  // ── Tab Config ─────────────────────────────────────────
  const tabs = [
    { id: "manajemen_anggota" as const, icon: Users,     label: "👥 Manajemen Anggota" },
    { id: "galeri_sa"        as const, icon: Image,      label: "🖼️ Galeri Kegiatan" },
    { id: "pin"              as const, icon: Key,        label: "🔑 Kelola PIN" },
    { id: "log"              as const, icon: FileText,   label: `📋 Log (${logCount})` },
    { id: "arsip"            as const, icon: Archive,    label: `🗃️ Arsip (${archivedCount})` },
    { id: "api_config"       as const, icon: Plug,       label: "🔌 API & Integrasi" },
    { id: "akses"            as const, icon: Shield,     label: "🛡️ Akses & Settings" },
  ];

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl dark:shadow-none flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <Crown size={14} /> Panel Utama Super Admin
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Dashboard Super Admin</h1>
          <p className="text-purple-200 text-xs sm:text-sm mt-1">Pendaftaran massal, manajemen ketua, kelola PIN, log aktivitas & arsip.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={handleBackupData}
            className="flex-1 md:flex-none px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-white/20 backdrop-blur-sm transition-all">
            <Database size={16} /> 💾 Backup Data
          </button>
          <button onClick={handleSyncToSheets}
            disabled={syncStatus === "syncing"}
            className={"flex-1 md:flex-none px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all " +
              (syncStatus === "syncing" ? "bg-blue-500/30 text-blue-200 animate-pulse cursor-wait" :
               syncStatus === "error" ? "bg-rose-500/30 text-rose-200 hover:bg-rose-500/50" :
               syncStatus === "offline" ? "bg-amber-500/30 text-amber-200" :
               "bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/40")}
            title={syncMsg || "Sync data ke Google Sheets"}>
            {syncStatus === "syncing" ? <RefreshCw size={16} className="animate-spin" /> :
             syncStatus === "error" || syncStatus === "offline" ? <CloudOff size={16} /> :
             <Cloud size={16} />}
            {syncStatus === "syncing" ? "Syncing..." :
             syncStatus === "idle" ? "☁️ Sync Sheets" :
             syncStatus === "error" ? "⚠️ Retry Sync" : "📡 Offline"}
          </button>
          <button onClick={handleCetakDaftar}
            className="flex-1 md:flex-none px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-purple-950 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md">
            <Printer size={16} /> 🖨️ Cetak List
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 bg-slate-900 p-2 rounded-2xl border border-slate-800 shadow-lg dark:shadow-none scrollbar-none">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => dispatch({ type: "SET_TAB", tab: tab.id })}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
              state.activeTab === tab.id ? "bg-amber-400 text-slate-950 shadow-md" : "text-slate-400 hover:bg-slate-800"
            }`}>
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          TAB 1: MANAJEMEN ANGGOTA
          ═══════════════════════════════════════════════════════════ */}
      {state.activeTab === "manajemen_anggota" && (
        <TabContent id="manajemen_anggota">
          <ErrorBoundaryTab tabName="Manajemen Anggota">
            <Suspense fallback={<LoadingSpinner label="Manajemen Anggota" />}>
              <ManajemenAnggotaSA appData={appData} setAppData={setAppData} showToast={showToast} />
            </Suspense>
          </ErrorBoundaryTab>
        </TabContent>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB 2: GALERI KEGIATAN
          ═══════════════════════════════════════════════════════════ */}
      {state.activeTab === "galeri_sa" && (
        <TabContent id="galeri_sa">
          <ErrorBoundaryTab tabName="Galeri Kegiatan">
            <Suspense fallback={<LoadingSpinner label="Galeri Kegiatan" />}>
              <GaleriSuperAdmin appData={appData} setAppData={setAppData} showToast={showToast} />
            </Suspense>
          </ErrorBoundaryTab>
        </TabContent>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB 3: KELOLA PIN
          ═══════════════════════════════════════════════════════════ */}
      {state.activeTab === "pin" && (
        <TabContent id="pin">
          <ErrorBoundaryTab tabName="Kelola PIN">
            <KelolaPinTab
              appData={appData} setAppData={setAppData} showToast={showToast}
              currentTime={currentTime}
              showPinDynamic={state.showPinDynamic}
              onTogglePin={() => dispatch({ type: "TOGGLE_PIN_DYNAMIC" })}
              pinSaVerifikasiKetua={state.pinSaVerifikasiKetua}
              onSetSaVerifKetua={v => dispatch({ type: "SET_PIN_KETUA_VERIF", value: v })}
              pinKetuaBaru={state.pinKetuaBaru}
              onSetKetuaBaru={v => dispatch({ type: "SET_PIN_KETUA_BARU", value: v })}
              pinKetuaBaruKonf={state.pinKetuaBaruKonf}
              onSetKetuaKonf={v => dispatch({ type: "SET_PIN_KETUA_KONF", value: v })}
              onResetPinKetua={() => dispatch({ type: "RESET_PIN_KETUA" })}
              pinSaVerifikasiPengurus={state.pinSaVerifikasiPengurus}
              onSetSaVerifPengurus={v => dispatch({ type: "SET_PIN_PENGURUS_VERIF", value: v })}
              pinPengurusBaru={state.pinPengurusBaru}
              onSetPengurusBaru={v => dispatch({ type: "SET_PIN_PENGURUS_BARU", value: v })}
              pinPengurusBaruKonf={state.pinPengurusBaruKonf}
              onSetPengurusKonf={v => dispatch({ type: "SET_PIN_PENGURUS_KONF", value: v })}
              onResetPinPengurus={() => dispatch({ type: "RESET_PIN_PENGURUS" })}
            />
          </ErrorBoundaryTab>
        </TabContent>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB 4: LOG AKTIVITAS
          ═══════════════════════════════════════════════════════════ */}
      {state.activeTab === "log" && (
        <TabContent id="log">
          <ErrorBoundaryTab tabName="Log Aktivitas">
            <LogTab
              appData={appData}
              search={state.logSearch}
              onSearchChange={v => dispatch({ type: "SET_LOG_SEARCH", value: v })}
            />
          </ErrorBoundaryTab>
        </TabContent>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB 5: ARSIP ANGGOTA
          ═══════════════════════════════════════════════════════════ */}
      {state.activeTab === "arsip" && (
        <TabContent id="arsip">
          <ErrorBoundaryTab tabName="Arsip Anggota">
            <ArsipTab
              appData={appData} setAppData={setAppData} showToast={showToast}
              search={state.arsipSearch}
              onSearchChange={v => dispatch({ type: "SET_ARSIP_SEARCH", value: v })}
              pinKonfirmasi={state.pinArsipKonf}
              onPinChange={v => dispatch({ type: "SET_PIN_ARSIP_KONF", value: v })}
              onPinReset={() => dispatch({ type: "RESET_ARSIP_PIN" })}
            />
          </ErrorBoundaryTab>
        </TabContent>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB 6: API & INTEGRASI
          ═══════════════════════════════════════════════════════════ */}
      {state.activeTab === "api_config" && (
        <TabContent id="api_config">
          <ErrorBoundaryTab tabName="API & Integrasi">
            <ApiConfigPanel appData={appData} setAppData={setAppData} showToast={showToast} />
          </ErrorBoundaryTab>
        </TabContent>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB 7: AKSES & SETTINGS
          ═══════════════════════════════════════════════════════════ */}
      {state.activeTab === "akses" && (
        <TabContent id="akses">
          <ErrorBoundaryTab tabName="Akses & Settings">
            {!state.isAksesSettingsUnlocked ? (
              <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-purple-200 shadow-md dark:shadow-none text-center max-w-md mx-auto space-y-4 my-8">
                <div className="w-16 h-16 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold">🔒</div>
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">Pengaturan Terkunci</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Masukkan PIN Super Admin untuk mengakses pengaturan sistem.</p>
                <form onSubmit={e => {
                  e.preventDefault();
                  if (verifikasiPINDinamis(state.pinAksesSettingsKonf)) {
                    dispatch({ type: "UNLOCK_AKSES" });
                    showToast("Pengaturan sistem berhasil dibuka! 🔓", "success");
                  } else {
                    showToast("PIN Super Admin salah atau sudah kedaluwarsa!", "error");
                  }
                }} className="space-y-3">
                  <PINField id="pin-akses-konf" label="PIN Super Admin (10 digit)" value={state.pinAksesSettingsKonf}
                    onChange={v => {
                      dispatch({ type: "SET_PIN_AKSES_KONF", value: v });
                      if (verifikasiPINDinamis(v)) { dispatch({ type: "UNLOCK_AKSES" }); showToast("Pengaturan dibuka! 🔓", "success"); }
                    }}
                    maxLength={10} placeholder="••••••••••" inputClassName="focus:ring-purple-600" />
                  <button type="submit" className="w-full bg-purple-700 hover:bg-purple-800 text-amber-300 font-bold py-3 rounded-xl shadow-md transition-all text-xs">🔓 BUKA PENGATURAN</button>
                </form>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center bg-purple-50 p-4 rounded-2xl border border-purple-200">
                  <span className="text-xs font-bold text-purple-800">🔓 Pengaturan Sistem Terbuka</span>
                  <button onClick={() => dispatch({ type: "LOCK_AKSES" })} className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all">🔒 Kunci Kembali</button>
                </div>

                {/* Visibilitas Modul */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm mt-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                    <div>
                      <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2"><Lock className="text-purple-600" size={20} /> Visibilitas Modul</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Atur visibilitas data keuangan & persetujuan foto.</p>
                    </div>
                    <button onClick={() => dispatch({ type: "OPEN_MATRIKS_MODAL" })}
                      className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs rounded-2xl shadow-md transition-all flex items-center gap-1.5 shrink-0">
                      <Shield size={16} /> Matriks Hak Akses
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SettingsSelect label="Visibilitas Saldo Kas" value={appData.Settings.KasAccess?.kasSaldoVisibilitas || "SEMUA_ANGGOTA"}
                      onChange={v => {
                        const u = { ...appData, Settings: { ...appData.Settings, KasAccess: { ...appData.Settings.KasAccess, kasSaldoVisibilitas: v as any } } };
                        setAppData(addLogAkses(u, "Super Admin", "SUPER_ADMIN", "UBAH_VISIBILITAS", "Saldo umum"));
                        showToast("Visibilitas saldo diperbarui!", "success");
                      }}
                      options={[
                        { value: "SEMUA_ANGGOTA", label: "👥 Semua Anggota & Pengurus" },
                        { value: "PENGURUS_SAJA", label: "🔵 Khusus Pengurus" },
                        { value: "KETUA_BENDAHARA_SAJA", label: "👑 Khusus Ketua & Bendahara" },
                      ]} />
                    <SettingsSelect label="Persetujuan Foto Galeri" value={appData.Settings.ContentAccess?.fotoPerluApproval ? "YA" : "TIDAK"}
                      onChange={v => {
                        const u = { ...appData, Settings: { ...appData.Settings, ContentAccess: { ...appData.Settings.ContentAccess, fotoPerluApproval: v === "YA" } } };
                        setAppData(addLogAkses(u, "Super Admin", "SUPER_ADMIN", "UBAH_FOTO_APPROVAL", v));
                        showToast("Persetujuan foto diperbarui!", "success");
                      }}
                      options={[
                        { value: "YA", label: "⏳ Perlu Persetujuan Pengurus" },
                        { value: "TIDAK", label: "✅ Langsung Diterbitkan Publik" },
                      ]} />
                  </div>
                </div>

                {/* Matriks Wewenang */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm mt-6 space-y-4">
                  <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2"><Shield className="text-purple-600" size={20} /> Wewenang Keuangan per Jabatan</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 uppercase font-bold text-[10px]">
                        <tr><th className="p-3">Jabatan</th><th className="p-3 text-center">Input Kas Masuk</th><th className="p-3 text-center">Input Kas Keluar</th><th className="p-3 text-center">Detail</th><th className="p-3 text-center">Iuran</th><th className="p-3 text-center">Batas Maks</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(appData.Settings.KasAccess?.jabatanPermissions || []).map(perm => {
                          const up = (k: string, v: any) => {
                            const perms = (appData.Settings.KasAccess?.jabatanPermissions || []).map(p => p.jabatan === perm.jabatan ? { ...p, [k]: v } : p);
                            setAppData(addLogAkses({ ...appData, Settings: { ...appData.Settings, KasAccess: { ...appData.Settings.KasAccess, jabatanPermissions: perms } } }, "Super Admin", "SUPER_ADMIN", "UBAH_WEwenang", perm.jabatan));
                          };
                          return (
                            <tr key={perm.jabatan} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="p-3 font-bold">{perm.jabatan}</td>
                              {(["bisaInputMasuk","bisaInputKeluar","bisaLihatDetail","bisaLihatIuran"] as const).map(k => (
                                <td key={k} className="p-3 text-center"><input type="checkbox" checked={perm[k]} onChange={e => up(k, e.target.checked)} className="w-4 h-4 text-purple-600 rounded" /></td>
                              ))}
                              <td className="p-3 text-center"><input type="number" step={500000} value={perm.maxNominalInput} onChange={e => up("maxNominalInput", Number(e.target.value))} className="w-24 p-1.5 bg-slate-50 dark:bg-slate-800/50 border rounded-lg text-xs text-center font-mono outline-none focus:ring-1 focus:ring-purple-600" /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </ErrorBoundaryTab>
        </TabContent>
      )}

      {/* Modal Matriks */}
      {state.showMatriksModal && (
        <MatriksHakAksesModal onClose={() => dispatch({ type: "CLOSE_MATRIKS_MODAL" })} currentUserRole="SUPER_ADMIN" />
      )}
    </div>
  );
}

// ── Mini helper for settings selects ──────────────────────
function SettingsSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
      <label className="block text-xs font-bold">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-600">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
