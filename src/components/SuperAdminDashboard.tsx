import React, { useState, useEffect, lazy, Suspense } from "react";
import { 
  Crown, UserPlus, Users, Copy, Share2, Printer, Shield, Key, History, FileText, 
  Database, Archive, RefreshCw, CheckCircle2, Search, Trash2, Edit3, Lock, Eye, EyeOff, AlertTriangle, Image, Plug, Loader2
} from "lucide-react";
import { AppData, saveAppData, addLogAkses, generateIdAnggotaUnik } from "../utils/dataStore";
import { setStoredPIN, getStoredPINs, verifikasiPINDinamis, generatePINDinamis, getInfoWaktuSekarang } from "../utils/auth";
import PINField from "./PINField";
import MatriksHakAksesModal from "./MatriksHakAksesModal";
import ApiConfigPanel from "./ApiConfigPanel";
import ErrorBoundaryTab from "./ErrorBoundaryTab";

// Lazy load komponen berat — hanya dimuat saat tab dibuka
const ManajemenAnggotaSA = lazy(() => import("./ManajemenAnggotaSA"));
const GaleriSuperAdmin   = lazy(() => import("./GaleriSuperAdmin"));

interface SuperAdminDashboardProps {
  appData: AppData;
  setAppData: React.Dispatch<React.SetStateAction<AppData>>;
  showToast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
}

export default function SuperAdminDashboard({ appData, setAppData, showToast }: SuperAdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"manajemen_anggota" | "galeri_sa" | "pin" | "log" | "akses" | "arsip" | "api_config">("manajemen_anggota");

  // Realtime clock for dynamic Super Admin PIN info
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // State for Daftar Cepat
  const [quickName, setQuickName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [createdMembers, setCreatedMembers] = useState<any[]>([]);

  // State for Daftar Massal
  const [massNamesText, setMassNamesText] = useState("");

  // State for Tunjuk Ketua
  const [selectedKetuaId, setSelectedKetuaId] = useState("");
  const [ketuaStartDate, setKetuaStartDate] = useState(new Date().toISOString().split("T")[0]);

  // State for PINs
  const [pinKetuaBaru, setPinKetuaBaru] = useState("");
  const [pinPengurusBaru, setPinPengurusBaru] = useState("");
  
  // Verification & Confirmation States for PINs
  const [pinSaVerifikasiKetua, setPinSaVerifikasiKetua] = useState("");
  const [pinKetuaBaruKonf, setPinKetuaBaruKonf] = useState("");
  const [pinSaVerifikasiPengurus, setPinSaVerifikasiPengurus] = useState("");
  const [pinPengurusBaruKonf, setPinPengurusBaruKonf] = useState("");
  const [pinTunjukKetuaKonf, setPinTunjukKetuaKonf] = useState("");
  const [pinAksesSettingsKonf, setPinAksesSettingsKonf] = useState("");
  const [pinArsipKonf, setPinArsipKonf] = useState("");
  const [isAksesSettingsUnlocked, setIsAksesSettingsUnlocked] = useState(false);

  // Filters
  const [logSearch, setLogSearch] = useState("");
  const [arsipSearch, setArsipSearch] = useState("");
  const [showMatriksModal, setShowMatriksModal] = useState(false);
  const [showPinDynamic, setShowPinDynamic] = useState(false); // 🔒 Default sembunyi — keamanan

  // 59. Tombol [➕ Daftar Cepat]
  const handleDaftarCepat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) {
      showToast("Nama panggilan wajib diisi!", "error");
      return;
    }

    const newId = generateIdAnggotaUnik(appData.Anggota, appData);
    const newMember = {
      ID_Anggota: newId,
      Nama_Lengkap: quickName.trim(),
      Nama_Panggilan: quickName.trim().split(" ")[0],
      Alamat: appData.Settings.Alamat_Komunitas,
      No_HP: quickPhone.trim() || "081234567890",
      Jenis_Kelamin: "Laki-laki",
      Tanggal_Lahir: "2005-01-01",
      Tanggal_Daftar: new Date().toISOString().split("T")[0],
      Status_Aktif: "AKTIF" as const,
      Status_Tampil: "TAMPIL" as const,
      Izin_NoHP: true,
      Izin_TanggalLahir: true,
      Izin_Minat: true,
    };

    const updated = {
      ...appData,
      Anggota: [newMember, ...appData.Anggota],
    };

    const loggedData = addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "DAFTAR_CEPAT", `Mendaftarkan ${quickName} (${newId})`);
    setAppData(loggedData);
    setCreatedMembers([newMember, ...createdMembers]);
    showToast(`Berhasil mendaftarkan ${quickName}! ID: ${newId}`, "success");
    setQuickName("");
    setQuickPhone("");
  };

  // 60. Tombol [➕ Daftar Massal]
  const handleDaftarMassal = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = massNamesText.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      showToast("Masukkan setidaknya satu nama!", "error");
      return;
    }

    const newMembersList: any[] = [];
    let currentList = [...appData.Anggota];

    lines.forEach((name) => {
      const newId = generateIdAnggotaUnik(currentList, appData);
      const memberItem = {
        ID_Anggota: newId,
        Nama_Lengkap: name,
        Nama_Panggilan: name.split(" ")[0],
        Alamat: appData.Settings.Alamat_Komunitas,
        No_HP: "081234567890",
        Jenis_Kelamin: "Laki-laki",
        Tanggal_Lahir: "2005-01-01",
        Tanggal_Daftar: new Date().toISOString().split("T")[0],
        Status_Aktif: "AKTIF" as const,
        Status_Tampil: "TAMPIL" as const,
        Izin_NoHP: true,
        Izin_TanggalLahir: true,
        Izin_Minat: true,
      };
      newMembersList.push(memberItem);
      currentList = [memberItem, ...currentList];
    });

    const updated = {
      ...appData,
      Anggota: [...newMembersList, ...appData.Anggota],
    };

    const loggedData = addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "DAFTAR_MASSAL", `Mendaftarkan ${newMembersList.length} anggota baru`);
    setAppData(loggedData);
    setCreatedMembers([...newMembersList, ...createdMembers]);
    showToast(`Berhasil mendaftarkan ${newMembersList.length} anggota baru!`, "success");
    setMassNamesText("");
  };

  // 61. Tombol [📋 Salin ID]
  const handleSalinId = (id: string) => {
    navigator.clipboard.writeText(id);
    showToast(`ID ${id} berhasil disalin ke clipboard!`, "success");
  };

  // 62. Tombol [📱 Bagikan via WA]
  const handleBagikanWa = (member: any) => {
    const text = `Selamat datang di Remaja Legok 03 (RT 03 Legok RW 04 Denokan)!%0A%0ANama: ${member.Nama_Lengkap}%0AID Anggota Anda: *${member.ID_Anggota}*%0A%0ASilakan gunakan ID ini untuk login di aplikasi kami.`;
    const url = `https://wa.me/${member.No_HP.replace(/^0/, "62")}?text=${text}`;
    window.open(url, "_blank");
  };

  // 63. Tombol [📱 Bagikan Semua via WA]
  const handleBagikanSemuaWa = () => {
    if (createdMembers.length === 0) {
      showToast("Belum ada ID baru yang dibuat!", "warning");
      return;
    }
    let msg = `*DAFTAR ID ANGGOTA BARU REMAJA LEGOK 03*%0A%0A`;
    createdMembers.forEach((m, idx) => {
      msg += `${idx + 1}. ${m.Nama_Lengkap} -> *${m.ID_Anggota}*%0A`;
    });
    msg += `%0AGunakan ID di atas untuk masuk ke portal aplikasi Remaja Legok 03.`;
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  // 64. Tombol [🖨️ Cetak Daftar ID]
  const handleCetakDaftar = () => {
    window.print();
  };

  // 65. Tombol [👑 Tunjuk Ketua Baru]
  const handleTunjukKetua = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifikasiPINDinamis(pinTunjukKetuaKonf)) {
      showToast("Konfirmasi PIN Super Admin salah atau sudah kedaluwarsa!", "error");
      return;
    }
    if (!selectedKetuaId) {
      showToast("Pilih anggota yang akan ditunjuk sebagai Ketua!", "error");
      return;
    }

    const member = appData.Anggota.find(a => a.ID_Anggota === selectedKetuaId);
    if (!member) return;

    const newHistory = {
      id: `JBT-${Date.now()}`,
      Tanggal: ketuaStartDate,
      Nama_Ketua: member.Nama_Lengkap,
      ID_Ketua: member.ID_Anggota,
      Ditunjuk_Oleh: "Super Admin",
      Status: "AKTIF" as ("AKTIF" | "DEMISIONER"),
    };

    // Set old ketua to demisioner
    const updatedHistory: Array<{
      id: string;
      Tanggal: string;
      Nama_Ketua: string;
      ID_Ketua: string;
      Ditunjuk_Oleh: string;
      Status: "AKTIF" | "DEMISIONER";
    }> = (appData.RiwayatJabatan || []).map(j => ({ ...j, Status: "DEMISIONER" as const }));
    updatedHistory.unshift(newHistory);

    const updated = {
      ...appData,
      RiwayatJabatan: updatedHistory,
    };

    const loggedData = addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "TUNJUK_KETUA", `Menunjuk ${member.Nama_Lengkap} sebagai Ketua baru`);
    setAppData(loggedData);
    showToast(`Berhasil menunjuk ${member.Nama_Lengkap} sebagai Ketua Baru!`, "success");
    setSelectedKetuaId("");
    setPinTunjukKetuaKonf("");
  };

  const getPINStrengthScore = (pin: string) => {
    if (pin.length < 8) return 1;
    const sequentialAsc = "1234567890123456789";
    const sequentialDesc = "9876543210987654321";
    if (/^(\d)\1+$/.test(pin) || sequentialAsc.includes(pin) || sequentialDesc.includes(pin)) return 1;
    const uniqueChars = new Set(pin).size;
    if (uniqueChars <= 2) return 2;
    if (uniqueChars <= 4) return 3;
    if (uniqueChars <= 6) return 4;
    return 5;
  };

  // 68. Ubah PIN Ketua
  const handleUbahPinKetua = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifikasiPINDinamis(pinSaVerifikasiKetua)) {
      showToast("PIN Super Admin verifikasi salah atau sudah kedaluwarsa!", "error");
      return;
    }
    if (pinKetuaBaru.length !== 6) {
      showToast("PIN Ketua Baru harus 6 digit angka!", "error");
      return;
    }
    if (pinKetuaBaru !== pinKetuaBaruKonf) {
      showToast("Konfirmasi PIN Ketua Baru tidak cocok!", "error");
      return;
    }
    if (pinKetuaBaru === appData.Settings.PIN_Pengurus) {
      showToast("PIN Ketua tidak boleh sama dengan PIN Pengurus!", "error");
      return;
    }
    setStoredPIN("ADMIN", pinKetuaBaru);
    const updated = {
      ...appData,
      Settings: { ...appData.Settings, PIN_Ketua: pinKetuaBaru },
    };
    const loggedData = addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "UBAH_PIN_KETUA", "Mengubah PIN Ketua");
    setAppData(loggedData);
    showToast("PIN Ketua berhasil diperbarui! 🔐", "success");
    setPinKetuaBaru("");
    setPinKetuaBaruKonf("");
    setPinSaVerifikasiKetua("");
  };

  // 69. Ubah PIN Pengurus
  const handleUbahPinPengurus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifikasiPINDinamis(pinSaVerifikasiPengurus)) {
      showToast("PIN Super Admin verifikasi salah atau sudah kedaluwarsa!", "error");
      return;
    }
    if (pinPengurusBaru.length !== 6) {
      showToast("PIN Pengurus Baru harus 6 digit angka!", "error");
      return;
    }
    if (pinPengurusBaru === "000000" || pinPengurusBaru === "123456") {
      showToast("PIN Pengurus tidak boleh terlalu mudah (000000/123456)!", "error");
      return;
    }
    if (pinPengurusBaru !== pinPengurusBaruKonf) {
      showToast("Konfirmasi PIN Pengurus Baru tidak cocok!", "error");
      return;
    }
    setStoredPIN("PENGURUS", pinPengurusBaru);
    const updated = {
      ...appData,
      Settings: { ...appData.Settings, PIN_Pengurus: pinPengurusBaru },
    };
    const loggedData = addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "UBAH_PIN_PENGURUS", "Mengubah PIN Pengurus");
    setAppData(loggedData);
    showToast("PIN Pengurus berhasil diperbarui! 🔐", "success");
    setPinPengurusBaru("");
    setPinPengurusBaruKonf("");
    setPinSaVerifikasiPengurus("");
  };

  // 72. Backup Data
  const handleBackupData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `backup_remaja_legok_03_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("Backup data JSON berhasil diunduh!", "success");
  };

  // 74. Kembalikan dari Arsip
  const handleRestoreAnggota = (id: string) => {
    if (!verifikasiPINDinamis(pinArsipKonf)) {
      showToast("Otorisasi PIN Super Admin salah atau sudah kedaluwarsa! Silakan masukkan PIN yang benar di kolom otorisasi.", "error");
      return;
    }
    const updatedAnggota = appData.Anggota.map(a => {
      if (a.ID_Anggota === id) {
        return { ...a, Status_Tampil: "TAMPIL" as const, Diarsip_Oleh: undefined, Tanggal_Arsip: undefined };
      }
      return a;
    });

    const updated = { ...appData, Anggota: updatedAnggota };
    const loggedData = addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "KEMBALIKAN_ARSIP", `Mengembalikan anggota ${id} dari arsip`);
    setAppData(loggedData);
    showToast(`Anggota ${id} berhasil dikembalikan dari arsip!`, "success");
    setPinArsipKonf("");
  };

  const archivedMembers = appData.Anggota.filter(a => a.Status_Tampil === "ARSIP");
  const filteredArchivedMembers = archivedMembers.filter(a =>
    (a.Nama_Lengkap || "").toLowerCase().includes((arsipSearch || "").toLowerCase()) ||
    (a.ID_Anggota || "").toLowerCase().includes((arsipSearch || "").toLowerCase())
  );
  const filteredLogs = (appData.LogAkses || []).filter(l => 
    (l.Nama || "").toLowerCase().includes((logSearch || "").toLowerCase()) || 
    (l.Aksi || "").toLowerCase().includes((logSearch || "").toLowerCase()) ||
    (l.Detail || "").toLowerCase().includes((logSearch || "").toLowerCase())
  );

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
          <button 
            onClick={handleBackupData}
            className="flex-1 md:flex-none px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-white/20 backdrop-blur-sm transition-all"
          >
            <Database size={16} /> 💾 Backup Data
          </button>
          <button 
            onClick={handleCetakDaftar}
            className="flex-1 md:flex-none px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-purple-950 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md dark:shadow-none"
          >
            <Printer size={16} /> 🖨️ Cetak List
          </button>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 bg-slate-900 p-2 rounded-2xl border border-slate-800 shadow-lg dark:shadow-none scrollbar-none">
        <button
          onClick={() => setActiveTab("manajemen_anggota")}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
            activeTab === "manajemen_anggota" ? "bg-amber-400 text-slate-950 shadow-md dark:shadow-none font-black" : "text-slate-400 dark:text-slate-500 hover:bg-slate-800"
          }`}
        >
          <Users size={16} /> 👥 Manajemen Anggota SA
        </button>
        <button
          onClick={() => setActiveTab("galeri_sa")}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
            activeTab === "galeri_sa" ? "bg-amber-400 text-slate-950 shadow-md dark:shadow-none font-black" : "text-slate-400 dark:text-slate-500 hover:bg-slate-800"
          }`}
        >
          <Image size={16} /> 🖼️ Galeri Kegiatan SA
        </button>
        <button
          onClick={() => setActiveTab("pin")}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
            activeTab === "pin" ? "bg-amber-400 text-slate-950 shadow-md dark:shadow-none font-black" : "text-slate-400 dark:text-slate-500 hover:bg-slate-800"
          }`}
        >
          <Key size={16} /> 🔑 Kelola PIN Sistem
        </button>
        <button
          onClick={() => setActiveTab("log")}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
            activeTab === "log" ? "bg-amber-400 text-slate-950 shadow-md dark:shadow-none font-black" : "text-slate-400 dark:text-slate-500 hover:bg-slate-800"
          }`}
        >
          <FileText size={16} /> 📋 Log Aktivitas ({appData.LogAkses?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("arsip")}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
            activeTab === "arsip" ? "bg-amber-400 text-slate-950 shadow-md dark:shadow-none font-black" : "text-slate-400 dark:text-slate-500 hover:bg-slate-800"
          }`}
        >
          <Archive size={16} /> 🗃️ Arsip Anggota ({archivedMembers.length})
        </button>
        <button
          onClick={() => setActiveTab("akses")}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
            activeTab === "akses" ? "bg-amber-400 text-slate-950 shadow-md dark:shadow-none font-black" : "text-slate-400 dark:text-slate-500 hover:bg-slate-800"
          }`}
        >
          <Shield size={16} /> 🛡️ Akses & Settings
        </button>
      </div>

      {/* TAB 1: MANAJEMEN ANGGOTA SUPER ADMIN */}
      {activeTab === "manajemen_anggota" && (
        <ErrorBoundaryTab tabName="Manajemen Anggota">
          <Suspense fallback={
            <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
              <Loader2 size={24} className="animate-spin" />
              <span className="text-xs font-bold">Memuat Manajemen Anggota...</span>
            </div>
          }>
            <ManajemenAnggotaSA
              appData={appData}
              setAppData={setAppData}
              showToast={showToast}
            />
          </Suspense>
        </ErrorBoundaryTab>
      )}

      {/* TAB 2: GALERI KEGIATAN SUPER ADMIN */}
      {activeTab === "galeri_sa" && (
        <ErrorBoundaryTab tabName="Galeri Kegiatan">
          <Suspense fallback={
            <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
              <Loader2 size={24} className="animate-spin" />
              <span className="text-xs font-bold">Memuat Galeri Kegiatan...</span>
            </div>
          }>
            <GaleriSuperAdmin
              appData={appData}
              setAppData={setAppData}
              showToast={showToast}
            />
          </Suspense>
        </ErrorBoundaryTab>
      )}

      {/* TAB 3: KELOLA PIN SISTEM */}
      {activeTab === "pin" && (
        <ErrorBoundaryTab tabName="Kelola PIN">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 68. Ubah PIN Ketua */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-100 text-rose-700 rounded-xl flex items-center justify-center font-bold">
                🔑
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">68. Ubah PIN Ketua</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Ubah PIN akses Ketua umum.</p>
              </div>
            </div>

            <form onSubmit={handleUbahPinKetua} className="space-y-4">
              <PINField
                id="pin-sa-verif-ketua"
                label="PIN Super Admin (Verifikasi)"
                value={pinSaVerifikasiKetua}
                onChange={setPinSaVerifikasiKetua}
                maxLength={8}
                placeholder="••••••••"
                inputClassName="focus:ring-rose-500"
              />

              <PINField
                id="pin-ketua-baru"
                label="PIN Ketua Baru (6 digit)"
                value={pinKetuaBaru}
                onChange={setPinKetuaBaru}
                maxLength={6}
                placeholder="••••••"
                inputClassName="focus:ring-rose-500"
              />

              <PINField
                id="pin-ketua-baru-konf"
                label="Konfirmasi PIN Ketua Baru"
                value={pinKetuaBaruKonf}
                onChange={setPinKetuaBaruKonf}
                maxLength={6}
                placeholder="••••••"
                inputClassName="focus:ring-rose-500"
              />

              <button 
                type="submit"
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl shadow-md dark:shadow-none transition-all text-xs"
              >
                💾 Simpan PIN Ketua Baru
              </button>
            </form>
          </div>

          {/* 69. Ubah PIN Pengurus */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center font-bold">
                🔑
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">69. Ubah PIN Pengurus</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Ubah PIN akses Pengurus harian.</p>
              </div>
            </div>

            <form onSubmit={handleUbahPinPengurus} className="space-y-4">
              <PINField
                id="pin-sa-verif-pengurus"
                label="PIN Super Admin (Verifikasi)"
                value={pinSaVerifikasiPengurus}
                onChange={setPinSaVerifikasiPengurus}
                maxLength={8}
                placeholder="••••••••"
                inputClassName="focus:ring-blue-500"
              />

              <PINField
                id="pin-pengurus-baru"
                label="PIN Pengurus Baru (6 digit)"
                value={pinPengurusBaru}
                onChange={setPinPengurusBaru}
                maxLength={6}
                placeholder="••••••"
                inputClassName="focus:ring-blue-500"
              />

              <PINField
                id="pin-pengurus-baru-konf"
                label="Konfirmasi PIN Pengurus Baru"
                value={pinPengurusBaruKonf}
                onChange={setPinPengurusBaruKonf}
                maxLength={6}
                placeholder="••••••"
                inputClassName="focus:ring-blue-500"
              />

              <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl shadow-md dark:shadow-none transition-all text-xs"
              >
                💾 Simpan PIN Pengurus Baru
              </button>
            </form>
          </div>

          {/* 70. Ubah PIN SA (Sekarang Info PIN Dinamis) */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-purple-200 shadow-sm dark:shadow-none space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 text-purple-800 rounded-xl flex items-center justify-center font-bold">
                👑
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">70. Info PIN Super Admin Dinamis</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">PIN Super Admin berubah otomatis setiap jam berdasarkan waktu.</p>
              </div>
            </div>

            <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800/60 pb-3">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Waktu Perangkat:</span>
                <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                  {currentTime.toLocaleDateString("id-ID", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                  })} - {currentTime.toLocaleTimeString("id-ID")}
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800/60 pb-3">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">PIN Jam Ini (0):</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-mono font-extrabold px-2.5 py-1 rounded-lg border transition-all ${
                    showPinDynamic 
                      ? "bg-purple-100 text-purple-700 border-purple-200" 
                      : "bg-slate-200 dark:bg-slate-700 text-transparent border-slate-300 dark:border-slate-600 select-none"
                  }`}>
                    {showPinDynamic ? generatePINDinamis(0) : "••••••••"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPinDynamic(!showPinDynamic)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    title={showPinDynamic ? "Sembunyikan PIN" : "Tampilkan PIN"}
                  >
                    {showPinDynamic ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>⏱️ PIN akan berubah dalam:</span>
                  <span className="font-bold text-purple-700">
                    {Math.floor((3600 - ((currentTime.getMinutes() * 60) + currentTime.getSeconds())) / 60)}m{" "}
                    {(3600 - ((currentTime.getMinutes() * 60) + currentTime.getSeconds())) % 60}s
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 transition-all duration-1000"
                    style={{ width: `${Math.floor((((currentTime.getMinutes() * 60) + currentTime.getSeconds()) / 3600) * 100)}%` }}
                  />
                </div>
              </div>

              {showPinDynamic && (
                <div className="pt-2 text-[11px] text-slate-500 dark:text-slate-400 space-y-1.5 leading-relaxed animate-in fade-in duration-200">
                  <p className="font-bold text-purple-800 flex items-center gap-1">
                    <span>💡</span> Daftar PIN yang sedang aktif (Toleransi ±1 jam):
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5 font-mono">
                    <li>Sebelumnya (-1 jam): <span className="font-bold text-slate-700 dark:text-slate-300">{generatePINDinamis(-1)}</span></li>
                    <li>Sekarang (Jam ini): <span className="font-bold text-purple-700">{generatePINDinamis(0)}</span></li>
                    <li>Berikutnya (+1 jam): <span className="font-bold text-slate-700 dark:text-slate-300">{generatePINDinamis(1)}</span></li>
                  </ul>
                  <p className="text-[10px] text-amber-600 italic mt-2">
                    *Sistem memverifikasi input PIN dengan toleransi ±1 jam untuk mengatasi ketidakcocokan waktu perangkat.
                  </p>
                </div>
              )}
              {!showPinDynamic && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setShowPinDynamic(true)}
                    className="text-[11px] text-purple-600 hover:text-purple-700 font-bold underline underline-offset-2 flex items-center gap-1 mx-auto"
                  >
                    <Eye size={12} /> Klik untuk melihat PIN & daftar toleransi
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        </ErrorBoundaryTab>
      )}

      {/* TAB 4: LOG AKTIVITAS */}
      {activeTab === "log" && (
        <ErrorBoundaryTab tabName="Log Aktivitas">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
              <FileText className="text-purple-600" size={20} /> 71. Log Aktivitas Sistem
            </h3>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" size={16} />
              <input 
                type="text" 
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
                placeholder="Cari log..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 uppercase font-bold text-[10px] sticky top-0">
                <tr>
                  <th className="p-3">Waktu</th>
                  <th className="p-3">Pengguna</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Aksi</th>
                  <th className="p-3">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400 dark:text-slate-500">Belum ada log aktivitas.</td>
                  </tr>
                ) : (
                  filteredLogs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 dark:bg-slate-800/50">
                      <td className="p-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">{l.Waktu}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-slate-100">{l.Nama} ({l.ID_Anggota})</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-[10px]">
                          {l.Role}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{l.Aksi}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">{l.Detail}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        </ErrorBoundaryTab>
      )}

      {/* TAB 5: ARSIP ANGGOTA */}
      {activeTab === "arsip" && (
        <ErrorBoundaryTab tabName="Arsip Anggota">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
              <Archive className="text-purple-600" size={20} /> Arsip Anggota
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 rounded-full text-[11px] font-bold">
                {archivedMembers.length}
              </span>
            </h3>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" size={16} />
              <input
                type="text"
                value={arsipSearch}
                onChange={e => setArsipSearch(e.target.value)}
                placeholder="Cari anggota diarsip..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">Otorisasi PIN Super Admin</h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Masukkan PIN Super Admin Anda untuk mengizinkan tindakan pengembalian arsip.</p>
            </div>
            <PINField
              id="pin-arsip-konf"
              placeholder="••••••••"
              maxLength={8}
              value={pinArsipKonf}
              onChange={setPinArsipKonf}
              className="w-full sm:w-48"
              inputClassName="focus:ring-purple-600 py-2 text-sm"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-3">ID Anggota</th>
                  <th className="p-3">Nama Lengkap</th>
                  <th className="p-3">Diarsip Oleh</th>
                  <th className="p-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredArchivedMembers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-400 dark:text-slate-500">
                      {arsipSearch 
                        ? `Tidak ada hasil untuk "${arsipSearch}"` 
                        : "Tidak ada anggota yang diarsip."
                      }
                    </td>
                  </tr>
                ) : (
                  filteredArchivedMembers.map((a) => (
                    <tr key={a.ID_Anggota} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">{a.ID_Anggota}</td>
                      <td className="p-3 font-semibold">{a.Nama_Lengkap}</td>
                      <td className="p-3 text-slate-500 dark:text-slate-400">{a.Diarsip_Oleh || "Admin"}</td>
                      <td className="p-3">
                        <button 
                          onClick={() => handleRestoreAnggota(a.ID_Anggota)}
                          disabled={!pinArsipKonf}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm dark:shadow-none transition-all"
                        >
                          <RefreshCw size={12} /> Kembalikan
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        </ErrorBoundaryTab>
      )}

      {/* TAB 6: PENGATURAN AKSES & MATRIKS JABATAN */}
      {activeTab === "api_config" && (
        <ErrorBoundaryTab tabName="API & Integrasi">
          <ApiConfigPanel appData={appData} setAppData={setAppData} showToast={showToast} />
        </ErrorBoundaryTab>
      )}

      {activeTab === "akses" && (
        <ErrorBoundaryTab tabName="Akses & Settings">
        <div className="space-y-6">
          {!isAksesSettingsUnlocked ? (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-purple-200 shadow-md dark:shadow-none text-center max-w-md mx-auto space-y-4 my-8">
              <div className="w-16 h-16 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold">
                🔒
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">11. Pengaturan Terkunci</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Masukkan PIN Super Admin untuk mengakses pengaturan visibilitas modul & matriks hak akses jabatan.
                </p>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (verifikasiPINDinamis(pinAksesSettingsKonf)) {
                  setIsAksesSettingsUnlocked(true);
                  showToast("Pengaturan sistem berhasil dibuka! 🔓", "success");
                } else {
                  showToast("PIN Super Admin salah atau sudah kedaluwarsa!", "error");
                }
              }} className="space-y-3">
                <PINField
                  id="pin-akses-settings-konf"
                  label="PIN Super Admin (10 digit)"
                  value={pinAksesSettingsKonf}
                  onChange={pin => {
                    setPinAksesSettingsKonf(pin);
                    if (verifikasiPINDinamis(pin)) {
                      setIsAksesSettingsUnlocked(true);
                      showToast("Pengaturan sistem berhasil dibuka! 🔓", "success");
                    }
                  }}
                  maxLength={10}
                  placeholder="••••••••••"
                  inputClassName="focus:ring-purple-600"
                />
                <button
                  type="submit"
                  className="w-full bg-purple-700 hover:bg-purple-800 text-amber-300 font-bold py-3 rounded-xl shadow-md dark:shadow-none transition-all text-xs"
                >
                  🔓 BUKA PENGATURAN
                </button>
              </form>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center bg-purple-50 p-4 rounded-2xl border border-purple-200">
                <div className="text-xs font-bold text-purple-800 flex items-center gap-1.5 font-sans">
                  🔓 Pengaturan Sistem Terbuka
                </div>
                <button
                  onClick={() => {
                    setIsAksesSettingsUnlocked(false);
                    setPinAksesSettingsKonf("");
                    showToast("Pengaturan sistem dikunci kembali.", "info");
                  }}
                  className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all"
                >
                  🔒 Kunci Kembali
                </button>
              </div>
              {/* Konfigurasi Visibilitas Keuangan & Konten */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                  <Lock className="text-purple-600" size={20} /> Visibilitas Modul & Persetujuan
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Atur visibilitas data keuangan, persetujuan foto, dan wewenang pengurus.</p>
              </div>

              <button
                type="button"
                onClick={() => setShowMatriksModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs rounded-2xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto shrink-0"
              >
                <Shield size={16} /> Lihat Matriks Hak Akses (Bagian I)
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">Visibilitas Saldo Kas Umum</label>
                <select
                  value={appData.Settings.KasAccess?.kasSaldoVisibilitas || "SEMUA_ANGGOTA"}
                  onChange={(e) => {
                    const updated = {
                      ...appData,
                      Settings: {
                        ...appData.Settings,
                        KasAccess: {
                          ...appData.Settings.KasAccess,
                          kasSaldoVisibilitas: e.target.value as any,
                        },
                      },
                    };
                    setAppData(addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "UBAH_PENGATURAN_AKSES", "Mengubah visibilitas saldo umum"));
                    showToast("Visibilitas saldo kas berhasil diperbarui!", "success");
                  }}
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-600"
                >
                  <option value="SEMUA_ANGGOTA">👥 Semua Anggota & Pengurus (Default)</option>
                  <option value="PENGURUS_SAJA">🔵 Khusus Pengurus</option>
                  <option value="KETUA_BENDAHARA_SAJA">👑 Khusus Ketua & Bendahara</option>
                </select>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Catatan: Warga/Tamu publik tetap tidak pernah bisa melihat saldo kas.</p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">Persetujuan Upload Foto Galeri</label>
                <select
                  value={appData.Settings.ContentAccess?.fotoPerluApproval ? "YA" : "TIDAK"}
                  onChange={(e) => {
                    const needsApproval = e.target.value === "YA";
                    const updated = {
                      ...appData,
                      Settings: {
                        ...appData.Settings,
                        ContentAccess: {
                          ...appData.Settings.ContentAccess,
                          fotoPerluApproval: needsApproval,
                        },
                      },
                    };
                    setAppData(addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "UBAH_PENGATURAN_AKSES", `Set foto approval: ${e.target.value}`));
                    showToast("Pengaturan persetujuan foto berhasil diperbarui!", "success");
                  }}
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-600"
                >
                  <option value="YA">⏳ Perlu Persetujuan Pengurus (Anggota upload status Menunggu)</option>
                  <option value="TIDAK">✅ Langsung Diterbitkan Publik</option>
                </select>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Jika diaktifkan, foto yang diupload anggota harus disetujui pengurus terlebih dahulu.</p>
              </div>
            </div>
          </div>

          {/* Matriks Wewenang Jabatan Keuangan */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                <Shield className="text-purple-600" size={20} /> Matriks Hak Akses & Wewenang Keuangan per Jabatan
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Atur wewenang input transaksi, hapus, & ekspor iuran untuk tiap struktur jabatan pengurus.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-3">Jabatan Pengurus</th>
                    <th className="p-3 text-center">Input Kas Masuk</th>
                    <th className="p-3 text-center">Input Kas Keluar</th>
                    <th className="p-3 text-center">Detail Transaksi</th>
                    <th className="p-3 text-center">Data Iuran</th>
                    <th className="p-3 text-center">Batas Maks Input</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {(appData.Settings.KasAccess?.jabatanPermissions || []).map((perm) => {
                    const updatePerm = (key: string, val: any) => {
                      const updatedPerms = (appData.Settings.KasAccess?.jabatanPermissions || []).map((p) =>
                        p.jabatan === perm.jabatan ? { ...p, [key]: val } : p
                      );
                      const updated = {
                        ...appData,
                        Settings: {
                          ...appData.Settings,
                          KasAccess: {
                            ...appData.Settings.KasAccess,
                            jabatanPermissions: updatedPerms,
                          },
                        },
                      };
                      setAppData(addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "UBAH_HAK_AKSES_JABATAN", `Mengubah wewenang jabatan ${perm.jabatan}`));
                    };

                    return (
                      <tr key={perm.jabatan} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 dark:bg-slate-800/50">
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100">{perm.jabatan}</td>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={perm.bisaInputMasuk}
                            onChange={(e) => updatePerm("bisaInputMasuk", e.target.checked)}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={perm.bisaInputKeluar}
                            onChange={(e) => updatePerm("bisaInputKeluar", e.target.checked)}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={perm.bisaLihatDetail}
                            onChange={(e) => updatePerm("bisaLihatDetail", e.target.checked)}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={perm.bisaLihatIuran}
                            onChange={(e) => updatePerm("bisaLihatIuran", e.target.checked)}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            step={500000}
                            value={perm.maxNominalInput}
                            onChange={(e) => updatePerm("maxNominalInput", Number(e.target.value))}
                            className="w-28 p-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-center font-mono outline-none focus:ring-1 focus:ring-purple-600"
                          />
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
        </div>
        </ErrorBoundaryTab>
      )}

      {/* Modal Matriks Hak Akses Lengkap */}
      {showMatriksModal && (
        <MatriksHakAksesModal
          onClose={() => setShowMatriksModal(false)}
          currentUserRole="SUPER_ADMIN"
        />
      )}
    </div>
  );
}
