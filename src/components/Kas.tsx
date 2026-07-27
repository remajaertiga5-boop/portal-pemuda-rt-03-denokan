import React, { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Wallet, Plus, ArrowUpRight, ArrowDownRight, Trash2, Eye, X,
  AlertCircle, CheckCircle2, Share2, Search, Edit3, Shield,
  Crown, FileText, BarChart3, Copy, MessageSquare, Users,
  Settings, Check, Slash, AlertTriangle, Building2, Layers,
} from "lucide-react";
import { AppData, addLogAkses } from "../utils/dataStore";
import { useLocale } from "../hooks/useLocale";
import { compressImage } from "../utils/imageUtils";
import { uploadToR2 } from "../utils/apiClient";
import { KasItem, UserRole } from "../types";
import { getStoredPINs, verifikasiPINDinamis } from "../utils/auth";
import PINField from "./PINField";

// ----------------------------------------------------------
// TYPES
// ----------------------------------------------------------
type SortBy      = "TERBARU" | "TERLAMA" | "NOMINAL_BESAR" | "NOMINAL_KECIL";
type JenisFilter = "SEMUA" | "PEMASUKAN" | "PENGELUARAN";
type DatePreset  = "SEMUA" | "HARI_INI" | "MINGGU_INI" | "BULAN_INI" | "BULAN_LALU" | "TAHUN_INI";
type FormMetode  = "Tunai" | "Transfer" | "QRIS";
type ActiveTab   = "TRANSAKSI" | "ANALYTICS" | "PENGATURAN" | "LOGS";
type FormJenis   = "Pemasukan" | "Pengeluaran";

interface KasProps {
  appData: AppData;
  setAppData: React.Dispatch<React.SetStateAction<AppData>>;
  userRole: UserRole;
  currentUserName?: string;
  showToast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
}

// ----------------------------------------------------------
// KONSTANTA
// ----------------------------------------------------------
const KATEGORI_PEMASUKAN_PRESET = [
  "Iuran Anggota", "Donasi Warga", "Sumbangan Sponsor",
  "Hasil Kegiatan", "Sisa Kas Bulan Lalu", "Lain-lain Pemasukan",
];

const KATEGORI_PENGELUARAN_PRESET = [
  "Konsumsi Rapat", "Perlengkapan Kegiatan", "Transportasi & Kurir",
  "Hadiah Lomba", "Kas Sosial & Besuk", "Pemeliharaan Alat & Infastruktur",
  "Administrasi & Percetakan", "Lain-lain Pengeluaran",
];

// ----------------------------------------------------------
// HELPER - Terbilang Rupiah
// ----------------------------------------------------------
function terbilangRupiah(nominal: number): string {
  if (nominal <= 0) return "Nol Rupiah";

  const satuan = [
    "", "Satu", "Dua", "Tiga", "Empat", "Lima",
    "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas",
  ];

  function terbilang(n: number): string {
    if (n < 12)        return satuan[n];
    if (n < 20)        return terbilang(n - 10) + " Belas";
    if (n < 100)       return terbilang(Math.floor(n / 10)) + " Puluh " + terbilang(n % 10);
    if (n < 200)       return "Seratus " + terbilang(n - 100);
    if (n < 1000)      return terbilang(Math.floor(n / 100)) + " Ratus " + terbilang(n % 100);
    if (n < 2000)      return "Seribu " + terbilang(n - 1000);
    if (n < 1000000)   return terbilang(Math.floor(n / 1000)) + " Ribu " + terbilang(n % 1000);
    if (n < 1000000000) return terbilang(Math.floor(n / 1000000)) + " Juta " + terbilang(n % 1000000);
    return n.toLocaleString("id-ID");
  }

  return terbilang(nominal).trim().replace(/\s+/g, " ") + " Rupiah";
}

// ----------------------------------------------------------
// COMPONENT
// ----------------------------------------------------------
export default function Kas({
  appData,
  setAppData,
  userRole,
  currentUserName,
  showToast,
}: KasProps) {

  // Navigation
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState<ActiveTab>("TRANSAKSI");

  // Filters
  const [selectedJenis, setSelectedJenis]           = useState<JenisFilter>("SEMUA");
  const [selectedPresetDate, setSelectedPresetDate] = useState<DatePreset>("SEMUA");
  const [selectedBulan, setSelectedBulan]           = useState<string>("SEMUA");
  const [selectedTahun, setSelectedTahun]           = useState<string>("2026");
  const [searchQuery, setSearchQuery]               = useState("");
  const [sortBy, setSortBy]                         = useState<SortBy>("TERBARU");

  // Modals
  const [showInputForm, setShowInputForm]             = useState(false);
  const [selectedTx, setSelectedTx]                   = useState<KasItem | null>(null);
  const [editTx, setEditTx]                           = useState<KasItem | null>(null);
  const [digitalReceiptTx, setDigitalReceiptTx]       = useState<KasItem | null>(null);
  const [deleteConfirmTx, setDeleteConfirmTx]         = useState<KasItem | null>(null);
  const [permanentDeleteTx, setPermanentDeleteTx]     = useState<KasItem | null>(null);
  const [showShareWAModal, setShowShareWAModal]       = useState(false);

  // Form State
  const [formJenis, setFormJenis]               = useState<FormJenis>("Pemasukan");
  const [formNominal, setFormNominal]           = useState("");
  const [formKategori, setFormKategori]         = useState("Iuran Anggota");
  const [formSubKategori, setFormSubKategori]   = useState("");
  const [formKeterangan, setFormKeterangan]     = useState("");
  const [formTanggal, setFormTanggal]           = useState(new Date().toISOString().split("T")[0]);
  const [formMetode, setFormMetode]             = useState<FormMetode>("Tunai");
  const [formPetugas, setFormPetugas]           = useState(currentUserName || "Petugas Kas");
  const [formBuktiNota, setFormBuktiNota]       = useState("");
  const [formPin, setFormPin]                   = useState("");

  // Delete / Edit State
  const [permDeleteBuktiConfirm, setPermDeleteBuktiConfirm] = useState("");
  const [permDeletePin, setPermDeletePin]                   = useState("");
  const [editKategori, setEditKategori]                     = useState("");
  const [editKeterangan, setEditKeterangan]                 = useState("");
  const [editNominal, setEditNominal]                       = useState("");
  const [editPin, setEditPin]                               = useState("");
  const [deleteReason, setDeleteReason]                     = useState("");

  // Settings
  const [approvalLimit, setApprovalLimit] = useState(
    appData.Settings?.KasAccess?.jabatanPermissions?.[0]?.maxNominalInput || 500000
  );
  const [receiptPrefix, setReceiptPrefix] = useState("KAS-2026");

  // ----------------------------------------------------------
  // DATA
  // ----------------------------------------------------------
  const kasList      = appData.Kas || [];
  const activeKasList = kasList.filter((k) => k.Status !== "DIHAPUS");

  const totalMasuk  = activeKasList.reduce((acc, k) => acc + getItemMasuk(k), 0);
  const totalKeluar = activeKasList.reduce((acc, k) => acc + getItemKeluar(k), 0);
  const saldoAkhir  = totalMasuk - totalKeluar;

  const pendingApprovals = kasList.filter((k) => k.Status === "MENUNGGU_APPROVAL");

  // Role checks
  const isManagement =
    userRole === "SEKRETARIS" ||
    userRole === "KETUA"      ||
    userRole === "PENGURUS"   ||
    userRole === "ADMIN"      ||
    userRole === "SUPER_ADMIN";

  const isKetua =
    userRole === "KETUA" ||
    userRole === "ADMIN" ||
    userRole === "SUPER_ADMIN";

  const isHumas =
    userRole === "HUMAS"      ||
    userRole === "SEKRETARIS" ||
    userRole === "KETUA"      ||
    userRole === "ADMIN"      ||
    userRole === "SUPER_ADMIN";

  // ----------------------------------------------------------
  // HELPERS
  // ----------------------------------------------------------
  function getItemMasuk(k: KasItem): number { return k.Pemasukan  || (k.Jenis === "Pemasukan"  ? (k.Nominal || 0) : 0); }
  function getItemKeluar(k: KasItem): number { return k.Pengeluaran || (k.Jenis === "Pengeluaran" ? (k.Nominal || 0) : 0); }
  function getItemId(k: KasItem): string { return k.id || k.ID || k.Nomor_Bukti || ""; }
  function getItemNomorBukti(k: KasItem): string { return k.Nomor_Bukti || k.id || k.ID || ""; }

  // ----------------------------------------------------------
  // FILTER & SORT
  // ----------------------------------------------------------
  const filteredKas = kasList.filter((k) => {
    const masuk  = getItemMasuk(k);
    const keluar = getItemKeluar(k);

    if (k.Status === "DIHAPUS" && !isKetua) return false;
    if (selectedJenis === "PEMASUKAN"   && masuk  === 0) return false;
    if (selectedJenis === "PENGELUARAN" && keluar === 0) return false;

    if (selectedPresetDate !== "SEMUA") {
      const txDate = new Date(k.Tanggal);
      const today  = new Date();

      if (selectedPresetDate === "HARI_INI") {
        if (k.Tanggal !== today.toISOString().split("T")[0]) return false;
      } else if (selectedPresetDate === "MINGGU_INI") {
        const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (txDate < oneWeekAgo) return false;
      } else if (selectedPresetDate === "BULAN_INI") {
        if (txDate.getMonth() !== today.getMonth() || txDate.getFullYear() !== today.getFullYear()) return false;
      } else if (selectedPresetDate === "BULAN_LALU") {
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        if (txDate.getMonth() !== lastMonth.getMonth() || txDate.getFullYear() !== lastMonth.getFullYear()) return false;
      } else if (selectedPresetDate === "TAHUN_INI") {
        if (txDate.getFullYear() !== today.getFullYear()) return false;
      }
    }

    if (selectedBulan !== "SEMUA") {
      if (k.Tanggal?.split("-")[1] !== selectedBulan) return false;
    }
    if (selectedTahun !== "SEMUA") {
      if (k.Tanggal?.split("-")[0] !== selectedTahun) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matches =
        (k.Kategori     || "").toLowerCase().includes(q) ||
        (k.Sub_Kategori || "").toLowerCase().includes(q) ||
        (k.Keterangan   || "").toLowerCase().includes(q) ||
        (k.Petugas      || "").toLowerCase().includes(q) ||
        (k.Nomor_Bukti  || k.id || "").toLowerCase().includes(q) ||
        String(getItemMasuk(k) || getItemKeluar(k)).includes(q);
      if (!matches) return false;
    }

    return true;
  }).sort((a, b) => {
    const valA = getItemMasuk(a) || getItemKeluar(a);
    const valB = getItemMasuk(b) || getItemKeluar(b);

    switch (sortBy) {
      case "TERBARU"       : return new Date(b.Tanggal).getTime() - new Date(a.Tanggal).getTime();
      case "TERLAMA"       : return new Date(a.Tanggal).getTime() - new Date(b.Tanggal).getTime();
      case "NOMINAL_BESAR" : return valB - valA;
      case "NOMINAL_KECIL" : return valA - valB;
      default              : return 0;
    }
  });

  // ----------------------------------------------------------
  // ROLE BADGE
  // ----------------------------------------------------------
  const getRoleBadge = (role: string) => {
    const map: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      TAMU       : { label: "Umum / Warga",          color: "bg-sky-50 text-sky-700 border-sky-200",          icon: <Users         size={12} /> },
      ANGGOTA    : { label: "Anggota Biasa",          color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2  size={12} /> },
      HUMAS      : { label: "Humas Pemuda",           color: "bg-amber-50 text-amber-700 border-amber-200",    icon: <Share2        size={12} /> },
      SEKRETARIS : { label: "Sekretaris / Pengurus",  color: "bg-yellow-50 text-yellow-800 border-yellow-200", icon: <FileText      size={12} /> },
      PENGURUS   : { label: "Sekretaris / Pengurus",  color: "bg-yellow-50 text-yellow-800 border-yellow-200", icon: <FileText      size={12} /> },
      KETUA      : { label: "Ketua Pemuda",           color: "bg-rose-50 text-rose-700 border-rose-200",       icon: <Crown         size={12} /> },
      ADMIN      : { label: "Ketua Pemuda",           color: "bg-rose-50 text-rose-700 border-rose-200",       icon: <Crown         size={12} /> },
      SUPER_ADMIN: { label: "Super Admin",            color: "bg-purple-50 text-purple-700 border-purple-200", icon: <Shield        size={12} /> },
    };
    return map[role] || { label: role, color: "bg-slate-100 text-slate-700 border-slate-200", icon: <Users size={12} /> };
  };

  const badgeInfo = getRoleBadge(userRole);

  // ----------------------------------------------------------
  // HANDLER - Upload bukti nota
  // ----------------------------------------------------------
  const handleUploadBukti = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("Ukuran file maksimal 5MB!", "error");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormBuktiNota(reader.result as string);
      showToast("Bukti nota berhasil diunggah!", "success");
    };
    reader.readAsDataURL(file);
  };

  // ----------------------------------------------------------
  // HANDLER - Submit input transaksi
  // ----------------------------------------------------------
  const handleSubmitKas = (e: React.FormEvent) => {
    e.preventDefault();
    try {

    const nominal = parseInt(formNominal, 10);
    if (isNaN(nominal) || nominal <= 0) {
      showToast("Nominal transaksi harus lebih dari 0!", "error");
      return;
    }

    if (userRole === "SUPER_ADMIN") {
      if (!verifikasiPINDinamis(formPin)) {
        showToast("PIN Super Admin salah / expired!", "error");
        return;
      }
    } else {
      const stored     = getStoredPINs();
      const correctPin =
        userRole === "ADMIN" || userRole === "KETUA"
          ? (appData.Settings?.PIN_Ketua    || stored.adminPin)
          : (appData.Settings?.PIN_Pengurus || stored.pengurusPin);

      if (formPin !== correctPin) {
        showToast("PIN Konfirmasi pengurus salah!", "error");
        return;
      }
    }

    const isOverLimit    = formJenis === "Pengeluaran" && nominal > approvalLimit;
    const initialStatus: "DISETUJUI" | "MENUNGGU_APPROVAL" = isOverLimit ? "MENUNGGU_APPROVAL" : "DISETUJUI";

    const autoId = `${receiptPrefix}-${Date.now().toString().slice(-6)}`;

    const newTx: KasItem = {
      id          : autoId,
      ID          : autoId,
      Nomor_Bukti : autoId,
      Tanggal     : formTanggal,
      Jenis       : formJenis,
      Nominal     : nominal,
      Pemasukan   : formJenis === "Pemasukan"   ? nominal : 0,
      Pengeluaran : formJenis === "Pengeluaran" ? nominal : 0,
      Saldo       : saldoAkhir + (formJenis === "Pemasukan" ? nominal : -nominal),
      Kategori    : formKategori,
      Sub_Kategori: formSubKategori || (formJenis === "Pemasukan" ? "Penerimaan Kas" : "Pengeluaran Operasional"),
      Keterangan  : formKeterangan,
      Petugas     : formPetugas || currentUserName || "Sekretaris Kas",
      ID_Petugas  : "RL03-SECRETARY",
      Metode_Bayar: formMetode,
      Bukti_Nota  : formBuktiNota || undefined,
      Status      : initialStatus,
      Catatan     : isOverLimit
        ? `Nominal melebihi batas Rp ${approvalLimit.toLocaleString("id-ID")}, butuh persetujuan Ketua`
        : undefined,
      Waktu_Input : new Date().toLocaleString("id-ID"),
    };

    const updatedData = { ...appData, Kas: [newTx, ...appData.Kas] };
    const loggedData  = addLogAkses(
      updatedData,
      currentUserName || "Sekretaris",
      userRole,
      "INPUT_KAS",
      `Mencatat ${formJenis} ${autoId} Rp ${nominal.toLocaleString("id-ID")}`
    );

    setAppData(loggedData);

    if (isOverLimit) {
      showToast(`Transaksi ${autoId} diajukan! Menunggu Persetujuan Ketua ⏳`, "warning");
    } else {
      showToast(`Transaksi ${autoId} berhasil dicatat! 🧾`, "success");
      setDigitalReceiptTx(newTx);
    }

    // Reset form
    setShowInputForm(false);
    setFormNominal("");
    setFormKeterangan("");
    setFormSubKategori("");
    setFormBuktiNota("");
    setFormPin("");
    } catch (err: any) {
      console.error("[Kas] Submit gagal:", err);
      showToast(`Gagal mencatat transaksi: ${err.message || "Error"}`, "error");
    }
  };

  // ----------------------------------------------------------
  // HANDLER - Approve transaksi
  // ----------------------------------------------------------
  const handleApproveTx = (tx: KasItem) => {
    try {
    const targetId   = getItemId(tx);
    const updated    = appData.Kas.map((k) =>
      getItemId(k) === targetId
        ? { ...k, Status: "DISETUJUI" as const, Approval_By: currentUserName || "Ketua Pemuda" }
        : k
    );
    const updatedData = { ...appData, Kas: updated };
    const loggedData  = addLogAkses(updatedData, currentUserName || "Ketua", userRole, "APPROVAL_KAS", `Menyetujui transaksi ${targetId}`);
    setAppData(loggedData);
    showToast(`Transaksi ${targetId} berhasil DISETUJUI!`, "success");
    } catch (err: any) {
      console.error("[Kas] Approve gagal:", err);
      showToast(`Gagal menyetujui: ${err.message}`, "error");
    }
  };

  // ----------------------------------------------------------
  // HANDLER - Reject transaksi
  // ----------------------------------------------------------
  const handleRejectTx = (tx: KasItem) => {
    try {
    const targetId   = getItemId(tx);
    const updated    = appData.Kas.map((k) =>
      getItemId(k) === targetId
        ? { ...k, Status: "DITOLAK" as const, Alasan_Tolak: "Ditolak dalam evaluasi Ketua" }
        : k
    );
    const updatedData = { ...appData, Kas: updated };
    const loggedData  = addLogAkses(updatedData, currentUserName || "Ketua", userRole, "REJECT_KAS", `Menolak transaksi ${targetId}`);
    setAppData(loggedData);
    showToast(`Transaksi ${targetId} DITOLAK!`, "info");
    } catch (err: any) {
      console.error("[Kas] Reject gagal:", err);
      showToast(`Gagal menolak: ${err.message}`, "error");
    }
  };

  // ----------------------------------------------------------
  // HANDLER - Soft delete
  // ----------------------------------------------------------
  const handleSoftDelete = () => {
    try {
    if (!deleteConfirmTx) return;
    const targetId   = getItemId(deleteConfirmTx);
    const updated    = appData.Kas.map((k) =>
      getItemId(k) === targetId
        ? { ...k, Status: "DIHAPUS" as const, Alasan_Hapus: deleteReason || "Dibatalkan oleh Ketua Pemuda" }
        : k
    );
    const updatedData = { ...appData, Kas: updated };
    const loggedData  = addLogAkses(updatedData, currentUserName || "Ketua", userRole, "HAPUS_KAS", `Soft delete ${targetId}: ${deleteReason || "Tanpa alasan"}`);
    setAppData(loggedData);
    showToast(`Transaksi ${targetId} berhasil diarsip.`, "success");
    setDeleteConfirmTx(null);
    setDeleteReason("");
    } catch (err: any) {
      console.error("[Kas] Soft delete gagal:", err);
      showToast(`Gagal menghapus: ${err.message}`, "error");
    }
  };

  // ----------------------------------------------------------
  // HANDLER - Permanent delete
  // ----------------------------------------------------------
  const handlePermanentDelete = () => {
    try {
    if (!permanentDeleteTx) return;
    const targetId = getItemId(permanentDeleteTx);

    if (permDeleteBuktiConfirm.trim().toUpperCase() !== targetId.toUpperCase()) {
      showToast("Nomor bukti konfirmasi tidak cocok!", "error");
      return;
    }
    if (!verifikasiPINDinamis(permDeletePin)) {
      showToast("PIN Super Admin tidak valid atau kedaluwarsa!", "error");
      return;
    }

    const updatedKas  = appData.Kas.filter((k) => getItemId(k) !== targetId);
    const updatedData = { ...appData, Kas: updatedKas };
    const loggedData  = addLogAkses(updatedData, currentUserName || "SuperAdmin", "SUPER_ADMIN", "HAPUS_PERMANEN_KAS", `PERMANENT DELETE transaksi ${targetId}`);
    setAppData(loggedData);
    showToast(`Transaksi ${targetId} PERMANEN DIHAPUS!`, "success");
    setPermanentDeleteTx(null);
    setPermDeleteBuktiConfirm("");
    setPermDeletePin("");
    } catch (err: any) {
      console.error("[Kas] Permanent delete gagal:", err);
      showToast(`Gagal: ${err.message}`, "error");
    }
  };

  // ----------------------------------------------------------
  // HANDLER - Save edit
  // ----------------------------------------------------------
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
    if (!editTx) return;

    if (userRole !== "SUPER_ADMIN") {
      const stored     = getStoredPINs();
      const correctPin = appData.Settings?.PIN_Ketua || stored.adminPin;
      if (editPin !== correctPin) {
        showToast("PIN Ketua salah!", "error");
        return;
      }
    }

    const newNom   = parseInt(editNominal, 10);
    const targetId = getItemId(editTx);

    const updated    = appData.Kas.map((k) =>
      getItemId(k) === targetId
        ? {
            ...k,
            Kategori   : editKategori,
            Keterangan : editKeterangan,
            Nominal    : newNom,
            Pemasukan  : k.Jenis === "Pemasukan"   ? newNom : 0,
            Pengeluaran: k.Jenis === "Pengeluaran" ? newNom : 0,
            Waktu_Edit : new Date().toLocaleString("id-ID"),
          }
        : k
    );
    const updatedData = { ...appData, Kas: updated };
    const loggedData  = addLogAkses(updatedData, currentUserName || "Ketua", userRole, "EDIT_KAS", `Mengubah data transaksi ${targetId}`);
    setAppData(loggedData);
    showToast(`Data transaksi ${targetId} berhasil diperbarui!`, "success");
    setEditTx(null);
    setEditPin("");
    } catch (err: any) {
      console.error("[Kas] Edit gagal:", err);
      showToast('Gagal menyimpan: ' + (err.message || 'Error'), 'error');
    }
  };

  // ----------------------------------------------------------
  // HELPER - WA Summary
  // ----------------------------------------------------------
  const generateWASummaryText = (): string => {
    const todayStr = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    return (
      `📢 *LAPORAN REKAPITULASI KAS UMUM*\n` +
      `*PORTAL PEMUDA REMAJA LEGOK 03*\n` +
      `_Denokan RT 03 / RW 04, Kel. Gondoryo, Kec. Jambu_\n` +
      `Per Tanggal: ${todayStr}\n\n` +
      `----------------------------------------\n` +
      `🟢 *TOTAL PEMASUKAN:* Rp ${totalMasuk.toLocaleString("id-ID")}\n` +
      `🔴 *TOTAL PENGELUARAN:* Rp ${totalKeluar.toLocaleString("id-ID")}\n` +
      `💰 *SALDO KAS SAAT INI:* Rp ${saldoAkhir.toLocaleString("id-ID")}\n` +
      `----------------------------------------\n\n` +
      `📌 *Rincian Transaksi Terbaru:*\n` +
      kasList.slice(0, 5).map((k) =>
        `• [${k.Tanggal}] ${k.Kategori} - ${k.Jenis === "Pemasukan" ? "+" : "-"}Rp ${(getItemMasuk(k) || getItemKeluar(k)).toLocaleString("id-ID")} (${k.Keterangan})`
      ).join("\n") +
      `\n\nTertanda,\n*Bendahara & Humas Remaja Legok 03*`
    );
  };

  // EXPORT FUNCTIONS
  const exportCSV = () => {
    const headers = ["Tanggal", "Jenis", "Nominal", "Kategori", "Keterangan", "Petugas"];
    const rows = filteredKas.map(k => [
      k.Tanggal,
      k.Jenis,
      getItemMasuk(k) || getItemKeluar(k),
      k.Kategori,
      k.Keterangan,
      k.Petugas
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Laporan_Kas_${selectedTahun}_${selectedBulan || "Semua"}.csv`;
    link.click();
    showToast("CSV berhasil diunduh", "success");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Laporan Kas ${selectedTahun} - ${selectedBulan || "Semua"}`, 14, 15);
    autoTable(doc, {
      head: [["Tanggal", "Jenis", "Nominal", "Kategori", "Keterangan"]],
      body: filteredKas.map(k => [
        k.Tanggal || "-",
        k.Jenis || "-",
        (getItemMasuk(k) || getItemKeluar(k) || 0).toLocaleString("id-ID"),
        k.Kategori || "-",
        k.Keterangan || "-"
      ]),
      startY: 20
    });
    doc.save(`Laporan_Kas_${selectedTahun}_${selectedBulan || "Semua"}.pdf`);
    showToast("PDF berhasil diunduh", "success");
  };

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------
  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">

      {/* HEADER */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-lg dark:shadow-none relative overflow-hidden">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 top-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[11px] font-bold flex items-center gap-1.5">
                <Wallet size={12} /> Transparansi Keuangan RT 03 Legok
              </span>
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${badgeInfo.color}`}>
                {badgeInfo.icon} {badgeInfo.label}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Kas Umum Remaja Legok 03
            </h2>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-xl">
              Laporan resmi penerimaan & pengeluaran kas pemuda RT 03 Legok RW 04 Denokan.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto shrink-0">
            <a
              href="https://wa.me/6281234567890?text=Halo%20Pengurus%20Remaja%20Legok%2003,%20saya%20ingin%20bertanya%20mengenai%20laporan%20Kas%20Umum"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
            >
              <MessageSquare size={14} /> Hubungi Bendahara
            </a>

            {userRole !== "TAMU" && (
              <div className="flex gap-2">
                <button
                  onClick={exportCSV}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2"
                >
                  <FileText size={14} /> CSV
                </button>
                <button
                  onClick={exportPDF}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2"
                >
                  <FileText size={14} /> PDF
                </button>
              </div>
            )}
            
            {userRole !== "TAMU" && (
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <FileText size={14} /> Cetak Laporan
              </button>
            )}

            {isHumas && (
              <button
                onClick={() => setShowShareWAModal(true)}
                className="px-3.5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
              >
                <Share2 size={14} /> Bagikan WA
              </button>
            )}

            {isManagement && (
              <button
                onClick={() => setShowInputForm(!showInputForm)}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-md"
              >
                {showInputForm ? <X size={14} /> : <Plus size={14} />}
                {showInputForm ? "Tutup Form" : "+ Input Transaksi"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs (Ketua / SA) */}
      {isKetua && (
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto scrollbar-none">
          {([
            { key: "TRANSAKSI",   label: "Daftar Transaksi",       icon: <Layers    size={14} />, activeClass: "bg-slate-900 text-white" },
            { key: "ANALYTICS",   label: "Audit & Grafik",          icon: <BarChart3 size={14} />, activeClass: "bg-indigo-600 text-white" },
            ...(userRole === "SUPER_ADMIN" ? [
              { key: "PENGATURAN", label: "Pengaturan Kas",         icon: <Settings  size={14} />, activeClass: "bg-purple-600 text-white" },
              { key: "LOGS",       label: "Log Aktivitas",           icon: <FileText  size={14} />, activeClass: "bg-slate-800 text-white" },
            ] : []),
          ] as { key: ActiveTab; label: string; icon: React.ReactNode; activeClass: string }[]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === tab.key
                  ? `${tab.activeClass} shadow-sm`
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}

          {pendingApprovals.length > 0 && (
            <button
              onClick={() => setActiveTab("TRANSAKSI")}
              className="px-3 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 animate-pulse"
            >
              <AlertTriangle size={14} /> {pendingApprovals.length} Approval Menunggu
            </button>
          )}
        </div>
      )}

      {/* Summary Cards — tampil untuk semua level */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label : "Total Pemasukan",
            value : totalMasuk,
            count : activeKasList.filter((k) => getItemMasuk(k) > 0).length,
            sub   : "Transaksi Pemasukan",
            color : "emerald",
            icon  : <ArrowUpRight size={22} />,
          },
          {
            label : "Total Pengeluaran",
            value : totalKeluar,
            count : activeKasList.filter((k) => getItemKeluar(k) > 0).length,
            sub   : "Transaksi Pengeluaran",
            color : "rose",
            icon  : <ArrowDownRight size={22} />,
          },
          {
            label : "Saldo Kas Saat Ini",
            value : saldoAkhir,
            count : null,
            sub   : "Saldo Bersih Terverifikasi",
            color : "indigo",
            icon  : <Wallet size={22} />,
          },
        ].map((card) => (
          <div
            key={card.label}
            className={`p-5 bg-gradient-to-br from-${card.color}-50 to-${card.color}-50/50 rounded-3xl border border-${card.color}-100 shadow-sm relative overflow-hidden group`}
          >
            <div className="flex justify-between items-start">
              <div>
                <span className={`text-[10px] font-bold text-${card.color}-700 uppercase tracking-wider block mb-1`}>
                  {card.label}
                </span>
                <div className={`text-2xl font-black text-${card.color}-950 font-mono tracking-tight`}>
                  Rp {card.value.toLocaleString("id-ID")}
                </div>
                <p className={`text-[11px] text-${card.color}-600 mt-1 font-medium`}>
                  {card.count !== null ? `${card.count} ${card.sub}` : card.sub}
                </p>
              </div>
              <div className={`w-12 h-12 bg-${card.color}-500 text-white rounded-2xl flex items-center justify-center shadow-md shadow-${card.color}-200 group-hover:scale-110 transition-transform`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* TAMU VIEW */}
      {userRole === "TAMU" && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Transparansi Laporan Kas Warga</h3>
          <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
            Informasi ringkasan saldo kas terbuka untuk transparansi warga. Rincian detail hanya untuk Anggota Terdaftar dan Pengurus.
          </p>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 max-w-md mx-auto space-y-2 text-left">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-emerald-700">
                Pemasukan ({Math.round((totalMasuk / (totalMasuk + totalKeluar || 1)) * 100)}%)
              </span>
              <span className="text-rose-700">
                Pengeluaran ({Math.round((totalKeluar / (totalMasuk + totalKeluar || 1)) * 100)}%)
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden flex">
              <div className="bg-emerald-500 h-full" style={{ width: `${(totalMasuk / (totalMasuk + totalKeluar || 1)) * 100}%` }} />
              <div className="bg-rose-500 h-full"    style={{ width: `${(totalKeluar / (totalMasuk + totalKeluar || 1)) * 100}%` }} />
            </div>
          </div>

          <a
            href="https://wa.me/6281234567890?text=Halo%20Pengurus%20Remaja%20Legok%2003,%20saya%20warga%20RT%2003%20ingin%20bertanya%20mengenai%20laporan%20keuangan"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all"
          >
            <MessageSquare size={16} /> Hubungi Bendahara via WhatsApp
          </a>
        </div>
      )}

      {/* ANGGOTA+ VIEW - TAB TRANSAKSI */}
      {userRole !== "TAMU" && activeTab === "TRANSAKSI" && (
        <div className="space-y-4">

          {/* Approval Banner */}
          {isKetua && pendingApprovals.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-200 text-amber-800 rounded-xl flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-900">
                    {pendingApprovals.length} Transaksi Menunggu Persetujuan Ketua
                  </h4>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Pengeluaran melebihi batas Rp {approvalLimit.toLocaleString("id-ID")}.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Form Input Transaksi */}
          {showInputForm && (
            <form onSubmit={handleSubmitKas} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-emerald-300 shadow-xl space-y-4 animate-in slide-in-from-top-4 duration-200">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                  <FileText className="text-emerald-600" size={18} /> Form Pencatatan Transaksi Kas
                </h3>
                <button type="button" onClick={() => setShowInputForm(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              {/* Jenis Toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Jenis Transaksi *</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["Pemasukan", "Pengeluaran"] as FormJenis[]).map((j) => (
                    <button
                      key={j}
                      type="button"
                      onClick={() => {
                        setFormJenis(j);
                        setFormKategori(j === "Pemasukan" ? "Iuran Anggota" : "Konsumsi Rapat");
                      }}
                      className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                        formJenis === j
                          ? j === "Pemasukan"
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                            : "bg-rose-600 text-white border-rose-600 shadow-md"
                          : "bg-slate-50 dark:bg-slate-800/50 text-slate-600 border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                      }`}
                    >
                      {j === "Pemasukan" ? "🟢 PEMASUKAN (+)" : "🔴 PENGELUARAN (-)"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Nominal */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nominal (Rp) *</label>
                  <input
                    required
                    type="number"
                    value={formNominal}
                    onChange={(e) => setFormNominal(e.target.value)}
                    placeholder="Contoh: 150000"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {formNominal && parseInt(formNominal, 10) > 0 && (
                    <span className="text-[11px] text-emerald-700 italic block mt-1">
                      {terbilangRupiah(parseInt(formNominal, 10))}
                    </span>
                  )}
                </div>

                {/* Kategori */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Kategori *</label>
                  <select
                    value={formKategori}
                    onChange={(e) => setFormKategori(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {(formJenis === "Pemasukan" ? KATEGORI_PEMASUKAN_PRESET : KATEGORI_PENGELUARAN_PRESET).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Sub Kategori */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Sub-Kategori</label>
                  <input
                    type="text"
                    value={formSubKategori}
                    onChange={(e) => setFormSubKategori(e.target.value)}
                    placeholder="Contoh: Pembelian Cat Gapura"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Tanggal */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tanggal *</label>
                  <input
                    type="date"
                    value={formTanggal}
                    onChange={(e) => setFormTanggal(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Metode */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Metode Pembayaran</label>
                  <select
                    value={formMetode}
                    onChange={(e) => setFormMetode(e.target.value as FormMetode)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Tunai">💵 Tunai (Cash)</option>
                    <option value="Transfer">🏦 Transfer Bank</option>
                    <option value="QRIS">📱 QRIS / E-Wallet</option>
                  </select>
                </div>

                {/* Petugas */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Petugas Pencatat</label>
                  <input
                    type="text"
                    value={formPetugas}
                    onChange={(e) => setFormPetugas(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Keterangan</label>
                <textarea
                  rows={2}
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  placeholder="Penjelasan lengkap keperluan atau sumber dana..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Upload Bukti */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Lampiran Bukti Nota (Maks. 5MB)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadBukti}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
                {formBuktiNota && (
                  <div className="mt-2 p-2 border border-slate-200 dark:border-slate-800 rounded-xl inline-block relative">
                    <img src={formBuktiNota} alt="Preview Nota" className="h-20 object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => setFormBuktiNota("")}
                      className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>

              {/* PIN Konfirmasi */}
              <PINField
                id="pin-konfirmasi-input-kas"
                label={`PIN Konfirmasi (${userRole === "SUPER_ADMIN" ? "10-Digit Super Admin" : "6-Digit Pengurus/Ketua"})`}
                value={formPin}
                onChange={setFormPin}
                maxLength={userRole === "SUPER_ADMIN" ? 10 : 6}
                placeholder={userRole === "SUPER_ADMIN" ? "••••••••••" : "••••••"}
                inputClassName="focus:ring-emerald-500"
              />

              <button
                type="submit"
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all text-sm flex items-center justify-center gap-2"
              >
                💾 Simpan Transaksi & Terbit Kuitansi Digital
              </button>
            </form>
          )}

          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              {/* Jenis Pills */}
              <div className="flex gap-1 overflow-x-auto scrollbar-none w-full md:w-auto">
                {(["SEMUA", "PEMASUKAN", "PENGELUARAN"] as JenisFilter[]).map((j) => (
                  <button
                    key={j}
                    onClick={() => setSelectedJenis(j)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      selectedJenis === j
                        ? j === "PEMASUKAN"   ? "bg-emerald-600 text-white shadow-sm"
                        : j === "PENGELUARAN" ? "bg-rose-600 text-white shadow-sm"
                        :                       "bg-slate-900 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                    }`}
                  >
                    {j === "SEMUA" ? "Semua Transaksi" : j === "PEMASUKAN" ? "🟢 Pemasukan" : "🔴 Pengeluaran"}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative w-full md:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari kategori, keterangan, bukti..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              {/* Date Presets */}
              <div className="flex items-center gap-1 overflow-x-auto py-1">
                <span className="text-slate-400 font-medium shrink-0 mr-1">Preset:</span>
                {([
                  { id: "SEMUA",     label: "Semua"     },
                  { id: "HARI_INI",  label: "Hari Ini"  },
                  { id: "BULAN_INI", label: "Bulan Ini" },
                  { id: "BULAN_LALU",label: "Bulan Lalu"},
                  { id: "TAHUN_INI", label: "Tahun 2026"},
                ] as { id: DatePreset; label: string }[]).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPresetDate(p.id);
                      if (p.id === "TAHUN_INI") setSelectedTahun("2026");
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${
                      selectedPresetDate === p.id
                        ? "bg-slate-800 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Dropdowns */}
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <select
                  value={selectedBulan}
                  onChange={(e) => setSelectedBulan(e.target.value)}
                  className="p-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] font-semibold outline-none"
                >
                  <option value="SEMUA">Semua Bulan</option>
                  {[
                    ["01","Januari"],["02","Februari"],["03","Maret"],["04","April"],
                    ["05","Mei"],["06","Juni"],["07","Juli"],["08","Agustus"],
                    ["09","September"],["10","Oktober"],["11","November"],["12","Desember"],
                  ].map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>

                <select
                  value={selectedTahun}
                  onChange={(e) => setSelectedTahun(e.target.value)}
                  className="p-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] font-semibold outline-none"
                >
                  <option value="SEMUA">Semua Tahun</option>
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="p-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] font-semibold outline-none"
                >
                  <option value="TERBARU">Sort: Terbaru</option>
                  <option value="TERLAMA">Sort: Terlama</option>
                  <option value="NOMINAL_BESAR">Sort: Terbesar</option>
                  <option value="NOMINAL_KECIL">Sort: Terkecil</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tabel Transaksi */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">No. Bukti & Tgl</th>
                    <th className="p-3.5">Kategori & Rincian</th>
                    <th className="p-3.5">Masuk (+)</th>
                    <th className="p-3.5">Keluar (-)</th>
                    <th className="p-3.5">Petugas</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredKas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400">
                        <Wallet size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="font-bold text-slate-600 dark:text-slate-400">Tidak ada data transaksi yang sesuai.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredKas.map((item) => {
                      const masuk     = getItemMasuk(item);
                      const keluar    = getItemKeluar(item);
                      const id        = getItemId(item);
                      const isDeleted = item.Status === "DIHAPUS";
                      const isPending = item.Status === "MENUNGGU_APPROVAL";

                      return (
                        <tr
                          key={id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${isDeleted ? "opacity-60 bg-slate-50" : ""}`}
                        >
                          <td className="p-3.5">
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 block">{getItemNomorBukti(item)}</span>
                            <span className="text-[11px] text-slate-500 font-mono">{item.Tanggal}</span>
                          </td>

                          <td className="p-3.5 max-w-xs">
                            <div className="font-bold text-slate-900 dark:text-slate-100">{item.Kategori || "Umum"}</div>
                            <div className="text-[11px] text-slate-500 line-clamp-1">{item.Keterangan}</div>
                            {item.Sub_Kategori && (
                              <span className="inline-block text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 px-1.5 py-0.5 rounded mt-0.5">
                                {item.Sub_Kategori}
                              </span>
                            )}
                          </td>

                          <td className="p-3.5 font-mono font-bold text-emerald-600">
                            {masuk > 0 ? `+Rp ${masuk.toLocaleString("id-ID")}` : "-"}
                          </td>

                          <td className="p-3.5 font-mono font-bold text-rose-600">
                            {keluar > 0 ? `-Rp ${keluar.toLocaleString("id-ID")}` : "-"}
                          </td>

                          <td className="p-3.5 text-slate-500 text-[11px]">
                            {item.Petugas || "Sekretaris"}
                            {item.Metode_Bayar && (
                              <span className="block text-[10px] text-slate-400">Via {item.Metode_Bayar}</span>
                            )}
                          </td>

                          <td className="p-3.5">
                            {isDeleted ? (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-bold border border-slate-200">DIHAPUS</span>
                            ) : isPending ? (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold border border-amber-200 animate-pulse">MENUNGGU</span>
                            ) : item.Status === "DITOLAK" ? (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full text-[10px] font-bold border border-rose-200">DITOLAK</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold border border-emerald-200 flex items-center gap-1 w-fit">
                                <Check size={10} /> DISETUJUI
                              </span>
                            )}
                          </td>

                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setSelectedTx(item)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                                title="Detail"
                                aria-label="Lihat detail transaksi"
                              >
                                <Eye size={14} />
                              </button>

                              <button
                                onClick={() => setDigitalReceiptTx(item)}
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg"
                                title="Kuitansi"
                                aria-label="Kuitansi digital"
                              >
                                <FileText size={14} />
                              </button>

                              {isPending && isKetua && (
                                <>
                                  <button
                                    onClick={() => handleApproveTx(item)}
                                    className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                                    title="Setujui"
                                    aria-label="Setujui transaksi"
                                  >
                                    <CheckCircle2 size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleRejectTx(item)}
                                    className="p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700"
                                    title="Tolak"
                                    aria-label="Tolak transaksi"
                                  >
                                    <X size={14} />
                                  </button>
                                </>
                              )}

                              {isKetua && !isDeleted && (
                                <button
                                  onClick={() => {
                                    setEditTx(item);
                                    setEditKategori(item.Kategori || "");
                                    setEditKeterangan(item.Keterangan || "");
                                    setEditNominal(String(masuk || keluar));
                                  }}
                                  className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg"
                                  title="Edit"
                                  aria-label="Edit transaksi"
                                >
                                  <Edit3 size={14} />
                                </button>
                              )}

                              {(userRole === "KETUA" || userRole === "ADMIN") && !isDeleted && (
                                <button
                                  onClick={() => setDeleteConfirmTx(item)}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg"
                                  title="Soft Delete"
                                  aria-label="Hapus transaksi"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}

                              {userRole === "SUPER_ADMIN" && (
                                <button
                                  onClick={() => { setPermanentDeleteTx(item); setPermDeleteBuktiConfirm(""); setPermDeletePin(""); }}
                                  className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm"
                                  title="Permanent Delete"
                                  aria-label="Hapus permanen"
                                >
                                  <Slash size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB ANALYTICS */}
      {activeTab === "ANALYTICS" && isKetua && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BarChart3 className="text-indigo-600" /> Analisis Grafis & Audit Keuangan
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              {/* Pemasukan */}
              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-3">
                <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <ArrowUpRight size={16} /> Sumber Pemasukan Utama
                </h4>
                {KATEGORI_PEMASUKAN_PRESET.map((cat) => {
                  const catTotal = kasList
                    .filter((k) => k.Kategori === cat && k.Status !== "DIHAPUS")
                    .reduce((acc, k) => acc + getItemMasuk(k), 0);
                  const pct = totalMasuk > 0 ? Math.round((catTotal / totalMasuk) * 100) : 0;
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-700">{cat}</span>
                        <span className="font-mono font-bold text-emerald-700">Rp {catTotal.toLocaleString("id-ID")} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pengeluaran */}
              <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100 space-y-3">
                <h4 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                  <ArrowDownRight size={16} /> Pos Pengeluaran Utama
                </h4>
                {KATEGORI_PENGELUARAN_PRESET.map((cat) => {
                  const catTotal = kasList
                    .filter((k) => k.Kategori === cat && k.Status !== "DIHAPUS")
                    .reduce((acc, k) => acc + getItemKeluar(k), 0);
                  const pct = totalKeluar > 0 ? Math.round((catTotal / totalKeluar) * 100) : 0;
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-700">{cat}</span>
                        <span className="font-mono font-bold text-rose-700">Rp {catTotal.toLocaleString("id-ID")} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div className="bg-rose-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB PENGATURAN (Super Admin) */}
      {activeTab === "PENGATURAN" && userRole === "SUPER_ADMIN" && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Settings className="text-purple-600" />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Pengaturan Sistem Kas Umum</h3>
              <p className="text-xs text-slate-500">Konfigurasi batas approval dan format nomor bukti.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Batas Nominal Approval Ketua (Rp)</label>
              <input
                type="number"
                value={approvalLimit}
                onChange={(e) => setApprovalLimit(parseInt(e.target.value, 10) || 0)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Prefix Nomor Bukti Kuitansi</label>
              <input
                type="text"
                value={receiptPrefix}
                onChange={(e) => setReceiptPrefix(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono font-bold"
              />
            </div>
          </div>

          <button
            onClick={() => showToast("Pengaturan sistem kas berhasil disimpan!", "success")}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-md transition-all"
          >
            💾 Simpan Pengaturan Kas
          </button>
        </div>
      )}

      {/* TAB LOG (Super Admin) */}
      {activeTab === "LOGS" && userRole === "SUPER_ADMIN" && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
              <FileText className="text-slate-700" /> Log Audit & Akses Kas
            </h3>
            <span className="text-xs bg-purple-100 text-purple-800 font-bold px-2.5 py-1 rounded-full">SuperAdmin</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-3">Waktu</th>
                  <th className="p-3">Aktor</th>
                  <th className="p-3">Aksi</th>
                  <th className="p-3">Rincian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {(appData.LogAkses || []).slice(0, 15).map((log, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3 text-slate-500">{log.Waktu}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-slate-100">{log.Nama} ({log.Role})</td>
                    <td className="p-3 text-emerald-700 font-bold">{log.Aksi}</td>
                    <td className="p-3 text-slate-600">{log.Detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL DETAIL TRANSAKSI */}
      {/* ================================================================= */}
      {selectedTx && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedTx(null)}
              aria-label="Tutup detail"
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2">
              <div className={`p-2.5 rounded-2xl ${getItemMasuk(selectedTx) > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                {getItemMasuk(selectedTx) > 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
              </div>
              <div>
                <h3 className="font-black text-slate-900 dark:text-slate-100 text-base">t("kas.detailTransaksi")</h3>
                <p className="text-[11px] text-slate-500 font-mono">No. Bukti: {getItemNomorBukti(selectedTx)}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              {[
                { label: "Tanggal",          value: selectedTx.Tanggal, mono: true },
                { label: "Jenis Transaksi",  value: getItemMasuk(selectedTx) > 0 ? "PEMASUKAN (+)" : "PENGELUARAN (-)", color: getItemMasuk(selectedTx) > 0 ? "text-emerald-600" : "text-rose-600" },
                { label: "Kategori",         value: selectedTx.Kategori || "Umum" },
                { label: "Keterangan",       value: selectedTx.Keterangan },
                { label: "Nominal",          value: `Rp ${(getItemMasuk(selectedTx) || getItemKeluar(selectedTx)).toLocaleString("id-ID")}`, mono: true },
                { label: "Metode",           value: selectedTx.Metode_Bayar || "Tunai" },
                { label: "Petugas",          value: selectedTx.Petugas || "Sekretaris Kas" },
              ].map((row) => (
                <div key={row.label} className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800/60 last:border-0">
                  <span className="text-slate-500">{row.label}:</span>
                  <span className={`font-bold ${row.color || ""} ${row.mono ? "font-mono" : ""}`}>{row.value}</span>
                </div>
              ))}
            </div>

            {selectedTx.Bukti_Nota ? (
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-700 block">Lampiran Bukti Nota:</span>
                <a href={selectedTx.Bukti_Nota} target="_blank" rel="noopener noreferrer">
                  <img src={selectedTx.Bukti_Nota} alt="Bukti Nota" className="w-full max-h-48 object-cover rounded-2xl border border-slate-200" />
                </a>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                Tidak ada dokumen bukti nota dilampirkan.
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { setDigitalReceiptTx(selectedTx); setSelectedTx(null); }}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md"
              >
                <FileText size={14} /> Kuitansi Digital
              </button>
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL KUITANSI DIGITAL */}
      {/* ================================================================= */}
      {digitalReceiptTx && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4 animate-in zoom-in-95 duration-200 border-4 border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setDigitalReceiptTx(null)}
              aria-label="Tutup kuitansi"
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 print:hidden"
            >
              <X size={20} />
            </button>

            <div className="space-y-4 border-2 border-slate-200 dark:border-slate-800 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              {/* Header */}
              <div className="text-center pb-3 border-b-2 border-dashed border-slate-300 dark:border-slate-700">
                <div className="flex justify-center items-center gap-2 mb-1">
                  <Building2 size={20} className="text-emerald-700" />
                  <span className="font-black text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wide">REMAJA LEGOK 03</span>
                </div>
                <p className="text-[10px] font-medium text-slate-500">RT 03 Legok RW 04 Denokan, Kel. Gondoryo, Kec. Jambu</p>
                <p className="text-[11px] font-black text-emerald-800 uppercase tracking-widest mt-2 bg-emerald-100 py-1 rounded-lg">
                  BUKTI KUITANSI KAS RESMI
                </p>
              </div>

              {/* Detail */}
              <div className="space-y-1.5 text-xs text-slate-800 dark:text-slate-200">
                {[
                  { label: "No. Bukti", value: getItemNomorBukti(digitalReceiptTx) },
                  { label: "Tanggal",   value: digitalReceiptTx.Tanggal },
                  { label: "Kategori",  value: digitalReceiptTx.Kategori || "Umum" },
                  { label: "Ket.",      value: digitalReceiptTx.Keterangan },
                  { label: "Petugas",   value: digitalReceiptTx.Petugas || "Sekretaris Kas" },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between font-mono">
                    <span className="text-slate-500">{row.label}:</span>
                    <span className="font-bold max-w-[200px] text-right">{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Amount */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-1">
                <span className="text-[10px] uppercase font-bold text-emerald-700 block">Jumlah Nominal</span>
                <span className="text-2xl font-black font-mono text-emerald-950 block">
                  Rp {(getItemMasuk(digitalReceiptTx) || getItemKeluar(digitalReceiptTx)).toLocaleString("id-ID")}
                </span>
                <span className="text-[11px] font-medium italic text-emerald-800 block">
                  ({terbilangRupiah(getItemMasuk(digitalReceiptTx) || getItemKeluar(digitalReceiptTx))})
                </span>
              </div>

              {/* Stamp */}
              <div className="flex justify-between items-end pt-2">
                <div className="border border-emerald-600/40 text-emerald-800 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase rotate-[-4deg] bg-emerald-50 text-center">
                  <span>✓ TERVERIFIKASI</span>
                  <span className="block text-[8px] font-normal">KAS REMAJA LEGOK 03</span>
                </div>
                <div className="text-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=KAS_REMAJA_LEGOK_03_${getItemNomorBukti(digitalReceiptTx)}`}
                    alt="QR Validation"
                    className="w-14 h-14 mx-auto border p-0.5 bg-white rounded"
                  />
                  <span className="text-[8px] text-slate-400 block mt-0.5">Validasi Digital</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 print:hidden pt-2">
              <button
                onClick={() => {
                  const txt = `🧾 *KUITANSI KAS REMAJA LEGOK 03*\nNo: ${getItemNomorBukti(digitalReceiptTx)}\nTgl: ${digitalReceiptTx.Tanggal}\nKat: ${digitalReceiptTx.Kategori}\nNominal: Rp ${(getItemMasuk(digitalReceiptTx) || getItemKeluar(digitalReceiptTx)).toLocaleString("id-ID")}\nKet: ${digitalReceiptTx.Keterangan}`;
                  navigator.clipboard.writeText(txt);
                  showToast("Teks kuitansi disalin!", "success");
                }}
                className="py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                <Copy size={14} /> Salin Teks
              </button>
              <button
                onClick={() => window.print()}
                className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm"
              >
                <FileText size={14} /> Cetak
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL EDIT TRANSAKSI */}
      {/* ================================================================= */}
      {editTx && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveEdit} className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <h3 className="font-black text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
              <Edit3 className="text-indigo-600" size={18} /> Edit Transaksi {getItemNomorBukti(editTx)}
            </h3>

            {[
              { label: "Kategori",  value: editKategori,    setter: setEditKategori },
              { label: "Keterangan",value: editKeterangan,  setter: setEditKeterangan },
            ].map((f) => (
              <div key={f.label}>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{f.label}</label>
                <input
                  type="text"
                  value={f.value}
                  onChange={(e) => f.setter(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none"
                />
              </div>
            ))}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nominal (Rp)</label>
              <input
                type="number"
                value={editNominal}
                onChange={(e) => setEditNominal(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold font-mono outline-none"
              />
            </div>

            {userRole !== "SUPER_ADMIN" && (
              <PINField
                id="pin-edit-kas"
                label="PIN Ketua Verification"
                value={editPin}
                onChange={setEditPin}
                maxLength={6}
                placeholder="••••••"
              />
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditTx(null)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL SOFT DELETE */}
      {/* ================================================================= */}
      {deleteConfirmTx && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle size={28} />
            </div>
            <h3 className="font-black text-slate-900 dark:text-slate-100 text-base">Arsip / Hapus Transaksi Ini?</h3>
            <p className="text-xs text-slate-500">
              Transaksi {getItemNomorBukti(deleteConfirmTx)} sebesar{" "}
              Rp {(getItemMasuk(deleteConfirmTx) || getItemKeluar(deleteConfirmTx)).toLocaleString("id-ID")}{" "}
              akan ditandai DIHAPUS.
            </p>

            <textarea
              rows={2}
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Alasan pembatalan / penghapusan..."
              className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none text-left"
            />

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmTx(null)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
              >
                Batal
              </button>
              <button
                onClick={handleSoftDelete}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md"
              >
                Ya, Hapus Kas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL PERMANENT DELETE (SA 3-Step) */}
      {/* ================================================================= */}
      {permanentDeleteTx && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border-2 border-rose-300 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-700 bg-rose-50 p-3 rounded-2xl border border-rose-200">
              <Slash size={24} className="shrink-0" />
              <div>
                <h3 className="font-black text-sm">3-Step Verification Permanent Delete</h3>
                <p className="text-[11px] text-rose-600">Tindakan ini tidak dapat dikembalikan!</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-mono text-slate-800 dark:text-slate-200">
                Target: <strong>{getItemNomorBukti(permanentDeleteTx)}</strong> — Rp{" "}
                {(getItemMasuk(permanentDeleteTx) || getItemKeluar(permanentDeleteTx)).toLocaleString("id-ID")}
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Step 2: Ketik Ulang No. Bukti ({getItemNomorBukti(permanentDeleteTx)})
                </label>
                <input
                  type="text"
                  value={permDeleteBuktiConfirm}
                  onChange={(e) => setPermDeleteBuktiConfirm(e.target.value)}
                  placeholder={`Ketik ${getItemNomorBukti(permanentDeleteTx)}...`}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold outline-none"
                />
              </div>

              <PINField
                id="pin-permanent-delete-kas"
                label="Step 3: PIN Super Admin 10-Digit"
                value={permDeletePin}
                onChange={setPermDeletePin}
                maxLength={10}
                placeholder="••••••••••"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setPermanentDeleteTx(null)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
              >
                Batal
              </button>
              <button
                onClick={handlePermanentDelete}
                className="flex-1 py-3 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-black text-xs shadow-lg"
              >
                🚨 PERMANENT DELETE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL SHARE WA */}
      {/* ================================================================= */}
      {showShareWAModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowShareWAModal(false)}
              aria-label="Tutup modal share"
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>

            <h3 className="font-black text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
              <Share2 className="text-amber-600" size={18} /> Format Siaran Laporan Kas WA
            </h3>

            <textarea
              readOnly
              rows={10}
              value={generateWASummaryText()}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-mono outline-none"
            />

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generateWASummaryText());
                  showToast("Format teks WA berhasil disalin!", "success");
                }}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Copy size={14} /> Salin Teks
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(generateWASummaryText())}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md"
              >
                <MessageSquare size={14} /> Kirim ke WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
