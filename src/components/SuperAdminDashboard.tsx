import React, { useState, useEffect, lazy, Suspense } from "react";
import {
  Crown, Users, Shield, Key, FileText, Database, Archive,
  RefreshCw, Search, Lock, EyeOff, Image, Printer, Plug, Loader2
} from "lucide-react";
import { AppData, addLogAkses } from "../utils/dataStore";
import { verifikasiPINDinamis } from "../utils/auth";
import PINField from "./PINField";
import MatriksHakAksesModal from "./MatriksHakAksesModal";
import ApiConfigPanel from "./ApiConfigPanel";
import ErrorBoundaryTab from "./ErrorBoundaryTab";
import KelolaPinTab from "./KelolaPinTab";
import { useSuperAdminState } from "../hooks/useSuperAdminState";

// Lazy load komponen berat — hanya dimuat saat tab dibuka
const ManajemenAnggotaSA = lazy(() => import("./ManajemenAnggotaSA"));
const GaleriSuperAdmin   = lazy(() => import("./GaleriSuperAdmin"));

// ── Props ────────────────────────────────────────────────
interface SuperAdminDashboardProps {
  appData   : AppData;
  setAppData: React.Dispatch<React.SetStateAction<AppData>>;
  showToast : (msg: string, type: "success" | "error" | "info" | "warning") => void;
}

// ── Component ────────────────────────────────────────────
export default function SuperAdminDashboard({ appData, setAppData, showToast }: SuperAdminDashboardProps) {

  // ✅ 1 useReducer menggantikan 16 useState
  const { state, dispatch } = useSuperAdminState();

  // Realtime clock untuk info PIN dinamis
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Derived ────────────────────────────────────────────
  const archivedMembers        = appData.Anggota.filter(a => a.Status_Tampil === "ARSIP");
  const filteredArchivedMembers = archivedMembers.filter(a =>
    (a.Nama_Lengkap || "").toLowerCase().includes(state.arsipSearch.toLowerCase()) ||
    (a.ID_Anggota   || "").toLowerCase().includes(state.arsipSearch.toLowerCase())
  );
  const filteredLogs = (appData.LogAkses || []).filter(l =>
    (l.Nama   || "").toLowerCase().includes(state.logSearch.toLowerCase()) ||
    (l.Aksi   || "").toLowerCase().includes(state.logSearch.toLowerCase()) ||
    (l.Detail || "").toLowerCase().includes(state.logSearch.toLowerCase())
  );

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

  const handleRestoreAnggota = (id: string) => {
    if (!verifikasiPINDinamis(state.pinArsipKonf)) {
      showToast("Otorisasi PIN Super Admin salah atau sudah kedaluwarsa!", "error");
      return;
    }
    const updated = {
      ...appData,
      Anggota: appData.Anggota.map(a =>
        a.ID_Anggota === id
          ? { ...a, Status_Tampil: "TAMPIL" as const, Diarsip_Oleh: undefined, Tanggal_Arsip: undefined }
          : a
      ),
    };
    const logged = addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "KEMBALIKAN_ARSIP", `Mengembalikan anggota ${id}`);
    setAppData(logged);
    showToast(`Anggota ${id} berhasil dikembalikan!`, "success");
    dispatch({ type: "RESET_ARSIP_PIN" });
  };

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
          <button onClick={handleCetakDaftar}
            className="flex-1 md:flex-none px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-purple-950 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md">
            <Printer size={16} /> 🖨️ Cetak List
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 bg-slate-900 p-2 rounded-2xl border border-slate-800 shadow-lg dark:shadow-none scrollbar-none">
        {[
          { id: "manajemen_anggota" as const, icon: Users,     label: "👥 Manajemen Anggota SA" },
          { id: "galeri_sa"        as const, icon: Image,      label: "🖼️ Galeri Kegiatan SA" },
          { id: "pin"              as const, icon: Key,        label: "🔑 Kelola PIN Sistem" },
          { id: "log"              as const, icon: FileText,   label: `📋 Log (${appData.LogAkses?.length || 0})` },
          { id: "arsip"            as const, icon: Archive,    label: `🗃️ Arsip (${archivedMembers.length})` },
          { id: "api_config"       as const, icon: Plug,       label: "🔌 API & Integrasi" },
          { id: "akses"            as const, icon: Shield,     label: "🛡️ Akses & Settings" },
        ].map(tab => (
          <button key={tab.id} onClick={() => dispatch({ type: "SET_TAB", tab: tab.id })}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
              state.activeTab === tab.id
                ? "bg-amber-400 text-slate-950 shadow-md font-black"
                : "text-slate-400 hover:bg-slate-800"
            }`}>
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* ================================================================
          TAB 1: MANAJEMEN ANGGOTA SUPER ADMIN
          ================================================================ */}
      {state.activeTab === "manajemen_anggota" && (
        <ErrorBoundaryTab tabName="Manajemen Anggota">
          <Suspense fallback={<LoadingSpinner label="Manajemen Anggota" />}>
            <ManajemenAnggotaSA appData={appData} setAppData={setAppData} showToast={showToast} />
          </Suspense>
        </ErrorBoundaryTab>
      )}

      {/* ================================================================
          TAB 2: GALERI KEGIATAN SUPER ADMIN
          ================================================================ */}
      {state.activeTab === "galeri_sa" && (
        <ErrorBoundaryTab tabName="Galeri Kegiatan">
          <Suspense fallback={<LoadingSpinner label="Galeri Kegiatan" />}>
            <GaleriSuperAdmin appData={appData} setAppData={setAppData} showToast={showToast} />
          </Suspense>
        </ErrorBoundaryTab>
      )}

      {/* ================================================================
          TAB 3: KELOLA PIN SISTEM (extracted → KelolaPinTab)
          ================================================================ */}
      {state.activeTab === "pin" && (
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
      )}

      {/* ================================================================
          TAB 4: LOG AKTIVITAS
          ================================================================ */}
      {state.activeTab === "log" && (
        <ErrorBoundaryTab tabName="Log Aktivitas">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                <FileText className="text-purple-600" size={20} /> 71. Log Aktivitas Sistem
              </h3>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input type="text" value={state.logSearch}
                  onChange={e => dispatch({ type: "SET_LOG_SEARCH", value: e.target.value })}
                  placeholder="Cari log..." className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-600" />
              </div>
            </div>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 uppercase font-bold text-[10px] sticky top-0">
                  <tr><th className="p-3">Waktu</th><th className="p-3">Pengguna</th><th className="p-3">Role</th><th className="p-3">Aksi</th><th className="p-3">Detail</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.length === 0 ? (
                    <tr><td colSpan={5} className="p-6 text-center text-slate-400">Belum ada log aktivitas.</td></tr>
                  ) : filteredLogs.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-mono text-[11px]">{l.Waktu}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-slate-100">{l.Nama} ({l.ID_Anggota})</td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-[10px]">{l.Role}</span></td>
                      <td className="p-3 font-semibold">{l.Aksi}</td>
                      <td className="p-3">{l.Detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </ErrorBoundaryTab>
      )}

      {/* ================================================================
          TAB 5: ARSIP ANGGOTA
          ================================================================ */}
      {state.activeTab === "arsip" && (
        <ErrorBoundaryTab tabName="Arsip Anggota">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                <Archive className="text-purple-600" size={20} /> Arsip Anggota
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 rounded-full text-[11px] font-bold">{archivedMembers.length}</span>
              </h3>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input type="text" value={state.arsipSearch}
                  onChange={e => dispatch({ type: "SET_ARSIP_SEARCH", value: e.target.value })}
                  placeholder="Cari anggota diarsip..." className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-600" />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">Otorisasi PIN Super Admin</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Masukkan PIN Super Admin untuk mengizinkan pengembalian arsip.</p>
              </div>
              <PINField id="pin-arsip-konf" placeholder="••••••••" maxLength={8}
                value={state.pinArsipKonf} onChange={v => dispatch({ type: "SET_PIN_ARSIP_KONF", value: v })}
                className="w-full sm:w-48" inputClassName="focus:ring-purple-600 py-2 text-sm" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 uppercase font-bold text-[10px]">
                  <tr><th className="p-3">ID Anggota</th><th className="p-3">Nama Lengkap</th><th className="p-3">Diarsip Oleh</th><th className="p-3">Aksi</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredArchivedMembers.length === 0 ? (
                    <tr><td colSpan={4} className="p-6 text-center text-slate-400">
                      {state.arsipSearch ? `Tidak ada hasil untuk "${state.arsipSearch}"` : "Tidak ada anggota yang diarsip."}
                    </td></tr>
                  ) : filteredArchivedMembers.map(a => (
                    <tr key={a.ID_Anggota} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-mono font-bold">{a.ID_Anggota}</td>
                      <td className="p-3 font-semibold">{a.Nama_Lengkap}</td>
                      <td className="p-3 text-slate-500">{a.Diarsip_Oleh || "Admin"}</td>
                      <td className="p-3">
                        <button onClick={() => handleRestoreAnggota(a.ID_Anggota)} disabled={!state.pinArsipKonf}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all">
                          <RefreshCw size={12} /> Kembalikan
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </ErrorBoundaryTab>
      )}

      {/* ================================================================
          TAB 6: API & INTEGRASI
          ================================================================ */}
      {state.activeTab === "api_config" && (
        <ErrorBoundaryTab tabName="API & Integrasi">
          <ApiConfigPanel appData={appData} setAppData={setAppData} showToast={showToast} />
        </ErrorBoundaryTab>
      )}

      {/* ================================================================
          TAB 7: AKSES & SETTINGS
          ================================================================ */}
      {state.activeTab === "akses" && (
        <ErrorBoundaryTab tabName="Akses & Settings">
          {!state.isAksesSettingsUnlocked ? (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-purple-200 shadow-md dark:shadow-none text-center max-w-md mx-auto space-y-4 my-8">
              <div className="w-16 h-16 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold">🔒</div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">Pengaturan Terkunci</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Masukkan PIN Super Admin untuk mengakses pengaturan visibilitas modul & matriks hak akses jabatan.</p>
              </div>
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
                    if (verifikasiPINDinamis(v)) { dispatch({ type: "UNLOCK_AKSES" }); showToast("Pengaturan sistem berhasil dibuka! 🔓", "success"); }
                  }}
                  maxLength={10} placeholder="••••••••••" inputClassName="focus:ring-purple-600" />
                <button type="submit" className="w-full bg-purple-700 hover:bg-purple-800 text-amber-300 font-bold py-3 rounded-xl shadow-md transition-all text-xs">🔓 BUKA PENGATURAN</button>
              </form>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center bg-purple-50 p-4 rounded-2xl border border-purple-200">
                <div className="text-xs font-bold text-purple-800 flex items-center gap-1.5">🔓 Pengaturan Sistem Terbuka</div>
                <button onClick={() => dispatch({ type: "LOCK_AKSES" })} className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all">🔒 Kunci Kembali</button>
              </div>

              {/* Visibilitas Modul */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4 mt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2"><Lock className="text-purple-600" size={20} /> Visibilitas Modul & Persetujuan</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Atur visibilitas data keuangan, persetujuan foto, dan wewenang pengurus.</p>
                  </div>
                  <button onClick={() => dispatch({ type: "OPEN_MATRIKS_MODAL" })}
                    className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs rounded-2xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                    <Shield size={16} /> Lihat Matriks Hak Akses
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <label className="block text-xs font-bold">Visibilitas Saldo Kas Umum</label>
                    <select value={appData.Settings.KasAccess?.kasSaldoVisibilitas || "SEMUA_ANGGOTA"}
                      onChange={e => {
                        const updated = { ...appData, Settings: { ...appData.Settings, KasAccess: { ...appData.Settings.KasAccess, kasSaldoVisibilitas: e.target.value as any } } };
                        setAppData(addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "UBAH_PENGATURAN_AKSES", "Mengubah visibilitas saldo umum"));
                        showToast("Visibilitas saldo kas berhasil diperbarui!", "success");
                      }}
                      className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-600">
                      <option value="SEMUA_ANGGOTA">👥 Semua Anggota & Pengurus</option>
                      <option value="PENGURUS_SAJA">🔵 Khusus Pengurus</option>
                      <option value="KETUA_BENDAHARA_SAJA">👑 Khusus Ketua & Bendahara</option>
                    </select>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <label className="block text-xs font-bold">Persetujuan Upload Foto Galeri</label>
                    <select value={appData.Settings.ContentAccess?.fotoPerluApproval ? "YA" : "TIDAK"}
                      onChange={e => {
                        const needsApproval = e.target.value === "YA";
                        const updated = { ...appData, Settings: { ...appData.Settings, ContentAccess: { ...appData.Settings.ContentAccess, fotoPerluApproval: needsApproval } } };
                        setAppData(addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "UBAH_PENGATURAN_AKSES", `Foto approval: ${e.target.value}`));
                        showToast("Pengaturan persetujuan foto berhasil diperbarui!", "success");
                      }}
                      className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-600">
                      <option value="YA">⏳ Perlu Persetujuan Pengurus</option>
                      <option value="TIDAK">✅ Langsung Diterbitkan Publik</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Matriks Wewenang Jabatan */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4 mt-6">
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2"><Shield className="text-purple-600" size={20} /> Matriks Wewenang Keuangan per Jabatan</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Atur wewenang input transaksi, hapus, & ekspor iuran untuk tiap struktur jabatan.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 uppercase font-bold text-[10px]">
                      <tr><th className="p-3">Jabatan</th><th className="p-3 text-center">Input Kas Masuk</th><th className="p-3 text-center">Input Kas Keluar</th><th className="p-3 text-center">Detail Transaksi</th><th className="p-3 text-center">Data Iuran</th><th className="p-3 text-center">Batas Maks Input</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {(appData.Settings.KasAccess?.jabatanPermissions || []).map(perm => {
                        const updatePerm = (key: string, val: any) => {
                          const updatedPerms = (appData.Settings.KasAccess?.jabatanPermissions || []).map(p => p.jabatan === perm.jabatan ? { ...p, [key]: val } : p);
                          const updated = { ...appData, Settings: { ...appData.Settings, KasAccess: { ...appData.Settings.KasAccess, jabatanPermissions: updatedPerms } } };
                          setAppData(addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "UBAH_HAK_AKSES_JABATAN", `Mengubah wewenang jabatan ${perm.jabatan}`));
                        };
                        return (
                          <tr key={perm.jabatan} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="p-3 font-bold">{perm.jabatan}</td>
                            {(["bisaInputMasuk", "bisaInputKeluar", "bisaLihatDetail", "bisaLihatIuran"] as const).map(k => (
                              <td key={k} className="p-3 text-center">
                                <input type="checkbox" checked={perm[k]} onChange={e => updatePerm(k, e.target.checked)} className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500" />
                              </td>
                            ))}
                            <td className="p-3 text-center">
                              <input type="number" step={500000} value={perm.maxNominalInput}
                                onChange={e => updatePerm("maxNominalInput", Number(e.target.value))}
                                className="w-28 p-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-center font-mono outline-none focus:ring-1 focus:ring-purple-600" />
                            </td>
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
      )}

      {/* Modal Matriks Hak Akses */}
      {state.showMatriksModal && (
        <MatriksHakAksesModal onClose={() => dispatch({ type: "CLOSE_MATRIKS_MODAL" })} currentUserRole="SUPER_ADMIN" />
      )}
    </div>
  );
}

// ── Helper Component ──────────────────────────────────────
function LoadingSpinner({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
      <Loader2 size={24} className="animate-spin" />
      <span className="text-xs font-bold">Memuat {label}...</span>
    </div>
  );
}
