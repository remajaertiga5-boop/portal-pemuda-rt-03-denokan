import React, { useState, useMemo } from "react";
import {
  DollarSign, Plus, CheckCircle2, XCircle, Send, Trash2, AlertCircle,
  Calendar, Users, FileText, Settings, Download,
  Copy, Edit2, Check, Lock, RefreshCw, Search,
  PieChart, Eye, User, ShieldCheck,
  QrCode, ArrowLeft, Clock, AlertTriangle, Layers, Share2,
  Loader2, Image, Upload, X
} from "lucide-react";
import { AppData, addLogAkses } from "../utils/dataStore";
import { useLocale } from "../hooks/useLocale";
import { IuranItem, UserRole, AuthSession, AnggotaItem } from "../types";
import { compressImage, validateFile } from "../utils/imageUtils";
import { uploadToDrive } from "../utils/driveClient";
import { generatePINDinamis } from "../utils/auth";

// ----------------------------------------------------------
// TYPES
// ----------------------------------------------------------
type SortBy      = "NAMA" | "ID" | "STATUS";
type MainTab     = "MANAJEMEN" | "LAPORAN" | "PENGATURAN" | "LOG";
type FormStatus  = "LUNAS" | "CICIL" | "DIBEBASKAN";
type FormMetode  = "Tunai" | "Transfer" | "QRIS";
type IuranStatus = "LUNAS" | "CICIL" | "DIBEBASKAN" | "BELUM_BAYAR";

interface IuranProps {
  appData: AppData;
  setAppData: React.Dispatch<React.SetStateAction<AppData>>;
  userRole: UserRole;
  session?: AuthSession;
  currentUserName?: string;
  showToast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
  onOpenAuthModal?: () => void;
  onNavigateHome?: () => void;
}

// ----------------------------------------------------------
// KONSTANTA
// ----------------------------------------------------------
const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
] as const;

// ----------------------------------------------------------
// COMPONENT
// ----------------------------------------------------------
export default function Iuran({
  appData,
  setAppData,
  userRole,
  session,
  currentUserName,
  showToast,
  onOpenAuthModal,
  onNavigateHome,
}: IuranProps) {

  // Navigation
  const [activeMainTab, setActiveMainTab] = useState<MainTab>("MANAJEMEN");

  // Filters
  const [selectedTahun, setSelectedTahun]           = useState<string>("2026");
  const [selectedBulanIndex, setSelectedBulanIndex] = useState<number>(6);
  const [statusFilter, setStatusFilter]             = useState<string>("SEMUA");
  const [searchKeyword, setSearchKeyword]           = useState<string>("");
  const [sortBy, setSortBy]                         = useState<SortBy>("NAMA");

  // Member view
  const currentMemberId = session?.id_anggota || "RL03-001";
  const [selectedMemberForView, setSelectedMemberForView] = useState<string>(currentMemberId);

  // Modals
  const [showCatatModal, setShowCatatModal]                   = useState(false);
  const [showReminderMassalModal, setShowReminderMassalModal] = useState(false);
  const [showBuktiModal, setShowBuktiModal]                   = useState(false);
  const [activeReceiptItem, setActiveReceiptItem]             = useState<IuranItem | null>(null);
  const [showDeleteModal, setShowDeleteModal]                 = useState(false);
  const [itemToDelete, setItemToDelete] = useState<IuranItem | null>(null);
  const [saPinInput, setSaPinInput]                           = useState("");
  const [showEditModal, setShowEditModal]                     = useState(false);
  const [editingIuran, setEditingIuran]                       = useState<Partial<IuranItem> | null>(null);

  // Form State
  const [formAnggotaId, setFormAnggotaId]     = useState("");
  const [formBulanIndex, setFormBulanIndex]   = useState(6);
  const [formTahun, setFormTahun]             = useState("2026");
  const [formNominal, setFormNominal]         = useState(appData.Settings?.Nominal_Iuran || 10000);
  const [formTanggal, setFormTanggal]         = useState(new Date().toISOString().split("T")[0]);
  const [formMetode, setFormMetode]           = useState<FormMetode>("Tunai");
  const [formStatus, setFormStatus]           = useState<FormStatus>("LUNAS");
  const [formNominalCicil, setFormNominalCicil] = useState(5000);
  const [formAlasanBebas, setFormAlasanBebas] = useState("");

  // ── Upload bukti pembayaran ke Google Drive ──
  const handleUploadBukti = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file, 5, ["image/jpeg", "image/png", "image/webp", "application/pdf"]);
    if (!validation.valid) {
      showToast(validation.error || "File tidak valid!", "error");
      e.target.value = "";
      return;
    }

    // Preview dulu
    const reader = new FileReader();
    reader.onloadend = () => setBuktiPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Kompres & upload
    setBuktiUploading(true);
    showToast("Mengupload bukti ke Google Drive...", "info");
    
    try {
      let fileData: string;
      let fileName = file.name;
      let fileType = file.type;

      if (file.type.startsWith("image/")) {
        const compressed = await compressImage(file, { maxWidth: 1200, maxHeight: 1600, quality: 0.7, maxSizeMB: 1 });
        fileData = compressed.dataUrl;
        fileName = file.name.replace(/\.[^.]+$/, ".jpg");
        fileType = "image/jpeg";
      } else {
        fileData = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = () => reject(new Error("Gagal membaca file"));
          r.readAsDataURL(file);
        });
      }

      const result = await uploadToDrive(
        fileData,
        fileName,
        fileType,
        selectedMemberForView || session?.id_anggota || ""
      );

      if (result?.downloadUrl) {
        setFormBuktiUrl(result.downloadUrl);
        showToast("✅ Bukti tersimpan di Google Drive!", "success");
      } else if (result?.url) {
        setFormBuktiUrl(result.url);
        showToast("✅ Bukti tersimpan di Google Drive!", "success");
      } else {
        // Fallback: simpan base64
        setFormBuktiUrl(fileData);
        showToast("⚠️ Drive tidak tersedia — bukti disimpan lokal", "warning");
      }
    } catch {
      setFormBuktiUrl(buktiPreview);
      showToast("⚠️ Upload gagal — bukti disimpan lokal", "warning");
    } finally {
      setBuktiUploading(false);
    }
  };

  const handleRemoveBukti = () => {
    setFormBuktiUrl("");
    setBuktiPreview("");
  };
  const [formCatatan, setFormCatatan]         = useState("");
  const [formBuktiUrl, setFormBuktiUrl]       = useState("");
  const [buktiUploading, setBuktiUploading] = useState(false);
  const [buktiPreview, setBuktiPreview]     = useState(""); // preview lokal

  // Reminder
  const [reminderTemplate, setReminderTemplate] = useState(
    "Halo [Nama]! Pengingat iuran [Bulan] [Tahun] Remaja Legok 03. Nominal: Rp [Jumlah]. Segera bayar ke Sekretaris/Bendahara. Terima kasih 🙏"
  );

  // ----------------------------------------------------------
  // DATA
  // ----------------------------------------------------------
  const iuranList    = appData.Iuran   || [];
  const anggotaList  = (appData.Anggota || []).filter(
    (a) => a.Status_Tampil !== "ARSIP" && a.Status_Aktif === "AKTIF"
  );
  const selectedBulanNama = MONTHS[selectedBulanIndex];
  const defaultNominal    = appData.Settings?.Nominal_Iuran    || 10000;
  const defaultJatuhTempo = appData.Settings?.Jatuh_Tempo_Iuran || 10;

  // Role checks
  const isManagement =
    userRole === "SEKRETARIS" ||
    userRole === "KETUA"      ||
    userRole === "SUPER_ADMIN";

  const isKetua =
    userRole === "KETUA" ||
    userRole === "SUPER_ADMIN";

  // Active anggota obj
  const activeAnggotaObj = useMemo(
    () => anggotaList.find((a) => a.ID_Anggota === selectedMemberForView) || anggotaList[0],
    [anggotaList, selectedMemberForView]
  );

  // ----------------------------------------------------------
  // HELPER - Status bulan
  // ----------------------------------------------------------
  const getMemberMonthStatus = (
    memberId: string,
    bulanNama: string,
    tahun: string
  ) => {
    const found = iuranList.find(
      (i) =>
        i.ID_Anggota === memberId &&
        i.Bulan.toLowerCase() === bulanNama.toLowerCase() &&
        String(i.Tahun) === String(tahun)
    );

    if (found) {
      return {
        status    : found.Status,
        item      : found,
        nominalPaid: found.Nominal || found.Jumlah || 0,
      };
    }

    const monthIdx    = MONTHS.findIndex((m) => m.toLowerCase() === bulanNama.toLowerCase());
    const currentYear = new Date().getFullYear();
    const currentMonthIdx = new Date().getMonth();

    if (
      parseInt(tahun, 10) > currentYear ||
      (parseInt(tahun, 10) === currentYear && monthIdx > currentMonthIdx)
    ) {
      return { status: "BELUM_WAKTUNYA", item: null, nominalPaid: 0 };
    }

    return { status: "BELUM_BAYAR", item: null, nominalPaid: 0 };
  };

  // ----------------------------------------------------------
  // HELPER - Ringkasan tahunan anggota
  // ----------------------------------------------------------
  const getMemberYearSummary = (memberId: string, tahun: string) => {
    let lunasCount     = 0;
    let belumBayarCount = 0;
    let totalPaid      = 0;
    let totalUnpaid    = 0;

    MONTHS.forEach((m) => {
      const { status, nominalPaid } = getMemberMonthStatus(memberId, m, tahun);
      if (status === "LUNAS" || status === "DIBEBASKAN") {
        lunasCount++;
        totalPaid += nominalPaid;
      } else if (status === "CICIL") {
        totalPaid   += nominalPaid;
        totalUnpaid += Math.max(0, defaultNominal - nominalPaid);
      } else if (status === "BELUM_BAYAR") {
        belumBayarCount++;
        totalUnpaid += defaultNominal;
      }
    });

    return {
      lunasCount,
      belumBayarCount,
      totalPaid,
      totalUnpaid,
      progressPercent: Math.round((lunasCount / 12) * 100),
    };
  };

  // ----------------------------------------------------------
  // MEMO - Rekap bulan
  // ----------------------------------------------------------
  const monthRekapStats = useMemo(() => {
    let countLunas  = 0;
    let countBelum  = 0;
    let countCicil  = 0;
    let countBebas  = 0;
    let countMenunggu = 0;
    let totalIncome = 0;

    anggotaList.forEach((m) => {
      const { status, nominalPaid } = getMemberMonthStatus(m.ID_Anggota, selectedBulanNama, selectedTahun);
      if (status === "LUNAS")              { countLunas++;   totalIncome += nominalPaid || defaultNominal; }
      else if (status === "BELUM_BAYAR")   { countBelum++;   }
      else if (status === "CICIL")         { countCicil++;   totalIncome += nominalPaid; }
      else if (status === "DIBEBASKAN")    { countBebas++;   }
      else if (status === "MENUNGGU_KONFIRMASI") { countMenunggu++; }
    });

    const totalMembers     = anggotaList.length || 1;
    const lunasPercentage  = Math.round(((countLunas + countBebas) / totalMembers) * 100);

    return { totalMembers, countLunas, countBelum, countCicil, countBebas, countMenunggu, totalIncomeThisMonth: totalIncome, lunasPercentage };
  }, [anggotaList, iuranList, selectedBulanNama, selectedTahun, defaultNominal]);

  // ----------------------------------------------------------
  // MEMO - Daftar belum bayar
  // ----------------------------------------------------------
  const unpaidMembersList = useMemo(
    () =>
      anggotaList.filter((m) => {
        const { status } = getMemberMonthStatus(m.ID_Anggota, selectedBulanNama, selectedTahun);
        return status === "BELUM_BAYAR" || status === "CICIL";
      }),
    [anggotaList, iuranList, selectedBulanNama, selectedTahun]
  );

  // ----------------------------------------------------------
  // HANDLER - Catat pembayaran
  // ----------------------------------------------------------
  const handleCatatPembayaran = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formAnggotaId) {
      showToast("Pilih anggota yang membayar iuran!", "error");
      return;
    }

    const member = anggotaList.find((a) => a.ID_Anggota === formAnggotaId);
    if (!member) return;

    const bulanName = MONTHS[formBulanIndex];
    const receiptNum = `IUR-${formTahun}-${Date.now().toString().slice(-6)}`;

    const nominalFinal =
      formStatus === "DIBEBASKAN" ? 0 :
      formStatus === "CICIL"      ? formNominalCicil :
                                    formNominal;

    const newIuran: IuranItem = {
      id             : `IUR-${Date.now()}`,
      ID             : `IUR-${Date.now()}`,
      ID_Anggota     : member.ID_Anggota,
      Nama_Anggota   : member.Nama_Lengkap,
      Bulan          : bulanName,
      Tahun          : formTahun,
      Jumlah         : nominalFinal,
      Nominal        : nominalFinal,
      Status         : formStatus,
      Tanggal_Bayar  : formTanggal,
      Penerima       : currentUserName || "Sekretaris / Pengurus",
      Metode_Bayar   : formMetode,
      Nomor_Bukti    : receiptNum,
      Catatan        : formCatatan,
      Bukti_Transfer : formBuktiUrl,
      Alasan_Bebas   : formStatus === "DIBEBASKAN" ? formAlasanBebas : undefined,
      Nominal_Cicil  : formStatus === "CICIL"      ? formNominalCicil : undefined,
    };

    const existingIndex = appData.Iuran.findIndex(
      (i) =>
        i.ID_Anggota === member.ID_Anggota &&
        i.Bulan.toLowerCase() === bulanName.toLowerCase() &&
        String(i.Tahun) === String(formTahun)
    );

    const updatedList = [...appData.Iuran];
    if (existingIndex >= 0) {
      updatedList[existingIndex] = { ...updatedList[existingIndex], ...newIuran };
    } else {
      updatedList.unshift(newIuran);
    }

    const updatedData = { ...appData, Iuran: updatedList };
    const loggedData  = addLogAkses(
      updatedData,
      currentUserName || "Pengurus",
      userRole,
      "CATAT_IURAN",
      `Mencatat iuran ${member.Nama_Lengkap} (${bulanName} ${formTahun}) - Status: ${formStatus}`
    );

    setAppData(loggedData);
    showToast(`Pencatatan iuran ${member.Nama_Lengkap} berhasil disimpan!`, "success");
    setActiveReceiptItem(newIuran);
    setShowBuktiModal(true);
    setShowCatatModal(false);
  };

  const openCatatModalForMember = (memberId: string) => {
    setFormAnggotaId(memberId);
    setFormBulanIndex(selectedBulanIndex);
    setFormTahun(selectedTahun);
    setFormNominal(defaultNominal);
    setFormTanggal(new Date().toISOString().split("T")[0]);
    setFormMetode("Tunai");
    setFormStatus("LUNAS");
    setFormCatatan("");
    setShowCatatModal(true);
  };

  // ----------------------------------------------------------
  // HANDLER - Edit iuran
  // ----------------------------------------------------------
  const handleSaveEditIuran = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIuran) return;

    const targetId   = editingIuran.id || editingIuran.ID;
    const updatedList = appData.Iuran.map((item) =>
      (item.id || item.ID) === targetId ? { ...item, ...editingIuran } as IuranItem : item
    );

    const updatedData = { ...appData, Iuran: updatedList };
    const loggedData  = addLogAkses(
      updatedData,
      currentUserName || "Ketua",
      userRole,
      "EDIT_IURAN",
      `Memperbarui iuran ${editingIuran.Nama_Anggota} (${editingIuran.Bulan} ${editingIuran.Tahun})`
    );

    setAppData(loggedData);
    showToast(`Data iuran ${editingIuran.Nama_Anggota} berhasil diperbarui!`, "success");
    setShowEditModal(false);
    setEditingIuran(null);
  };

  // ----------------------------------------------------------
  // HANDLER - Hapus iuran
  // ----------------------------------------------------------
  const handleDeleteIuranConfirm = () => {
    try {
    if (!itemToDelete) return;

    if (userRole === "SUPER_ADMIN") {
      const validPin     = generatePINDinamis(0);
      const validPinPrev = generatePINDinamis(-1);
      if (
        saPinInput !== validPin &&
        saPinInput !== validPinPrev &&
        saPinInput !== (appData.Settings?.PIN_SuperAdmin || "")
      ) {
        showToast("Kode Otorisasi tidak valid!", "error");
        return;
      }
    }

    const targetId    = itemToDelete.id || itemToDelete.ID;
    const updatedList = appData.Iuran.filter((i) => (i.id || i.ID) !== targetId);
    const updatedData = { ...appData, Iuran: updatedList };
    const loggedData  = addLogAkses(
      updatedData,
      currentUserName || "Pengurus",
      userRole,
      "HAPUS_IURAN",
      `Menghapus iuran ${itemToDelete.Nama_Anggota} (${itemToDelete.Bulan} ${itemToDelete.Tahun})`
    );

    setAppData(loggedData);
    showToast(`Data iuran ${itemToDelete.Nama_Anggota} berhasil dihapus!`, "success");
    setShowDeleteModal(false);
    setItemToDelete(null);
    setSaPinInput("");
    } catch (err: any) {
      console.error("[Iuran] Delete gagal:", err);
      showToast(`Gagal menghapus iuran: ${err.message || "Error"}`, "error");
    }
  };

  // ----------------------------------------------------------
  // HELPER - Generate WA link
  // ----------------------------------------------------------
  const generateWaLink = (
    phone: string,
    name: string,
    bulan: string,
    tahun: string,
    amount: number
  ): string => {
    const formattedPhone = phone.replace(/^0/, "62").replace(/[^0-9]/g, "");
    const msg = reminderTemplate
      .replace(/\[Nama\]/g,   name)
      .replace(/\[Bulan\]/g,  bulan)
      .replace(/\[Tahun\]/g,  tahun)
      .replace(/\[Jumlah\]/g, amount.toLocaleString("id-ID"));
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
  };

  // ----------------------------------------------------------
  // HANDLER - Copy nomor HP nunggak
  // ----------------------------------------------------------
  const handleCopyUnpaidNumbers = () => {
    const numbers = unpaidMembersList
      .map((m) => m.No_HP)
      .filter((p) => p && p !== "Disembunyikan")
      .join("\n");

    if (!numbers) {
      showToast("Tidak ada nomor HP yang tersedia", "warning");
      return;
    }
    navigator.clipboard.writeText(numbers);
    showToast("Daftar nomor HP berhasil disalin!", "success");
  };

  // ----------------------------------------------------------
  // HANDLER - Simpan pengaturan
  // ----------------------------------------------------------
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setAppData({
      ...appData,
      Settings: {
        ...appData.Settings,
        Nominal_Iuran    : defaultNominal,
        Jatuh_Tempo_Iuran: defaultJatuhTempo,
      },
    });
    showToast("Pengaturan iuran berhasil disimpan!", "success");
  };

  // ----------------------------------------------------------
  // RENDER: TAMU - Akses Ditolak
  // ----------------------------------------------------------
  if (userRole === "TAMU") {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl dark:shadow-none animate-in fade-in">
        <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/30 rounded-full flex items-center justify-center text-rose-400 mb-6">
          <Lock size={36} />
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 mb-3">
          Akses Terbatas
        </span>
        <h2 className="text-2xl font-black text-white mb-2">Halaman Ini Khusus Anggota Remaja</h2>
        <p className="text-slate-400 max-w-md text-sm leading-relaxed mb-8">
          Menu Iuran Anggota bersifat internal. Silakan masuk menggunakan ID Anggota Anda.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          <button
            onClick={() => onOpenAuthModal?.()}
            className="flex-1 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <User size={16} /> Masuk ID Anggota
          </button>
          <button
            onClick={() => onNavigateHome?.()}
            className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-2xl border border-slate-700 flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} /> Beranda
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------
  // RENDER: MAIN
  // ----------------------------------------------------------
  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* HEADER */}
      <div className="bg-slate-900 border border-slate-800 p-5 md:p-6 rounded-3xl shadow-xl dark:shadow-none text-white relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
            💰 Halaman Iuran Anggota
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Status dan rekapitulasi iuran bulanan pemuda RT 03 Legok RW 04 Denokan
          </p>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Main Navigation Tabs */}
          {isManagement && (
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800 overflow-x-auto">
              {([
                { key: "MANAJEMEN",   label: "Manajemen Status", icon: <Users size={14} /> },
                ...(isKetua ? [
                  { key: "LAPORAN",     label: "Laporan Iuran",    icon: <PieChart size={14} /> },
                  { key: "PENGATURAN",  label: "Pengaturan",       icon: <Settings size={14} /> },
                ] : []),
                ...(userRole === "SUPER_ADMIN" ? [
                  { key: "LOG", label: "Log Aktivitas", icon: <Clock size={14} /> },
                ] : []),
              ] as { key: MainTab; label: string; icon: React.ReactNode }[]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveMainTab(tab.key)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    activeMainTab === tab.key
                      ? tab.key === "LOG"
                        ? "bg-purple-600 text-white font-extrabold shadow-md"
                        : "bg-amber-500 text-slate-950 font-extrabold shadow-md"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedTahun}
              onChange={(e) => setSelectedTahun(e.target.value)}
              className="bg-slate-950 text-slate-200 border border-slate-800 text-xs font-bold rounded-2xl px-3 py-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="2026">Tahun 2026</option>
              <option value="2025">Tahun 2025</option>
              <option value="2024">Tahun 2024</option>
            </select>

            {isManagement && (
              <button
                onClick={() => {
                  setFormAnggotaId(anggotaList[0]?.ID_Anggota || "");
                  setFormBulanIndex(selectedBulanIndex);
                  setFormTahun(selectedTahun);
                  setFormNominal(defaultNominal);
                  setFormTanggal(new Date().toISOString().split("T")[0]);
                  setFormMetode("Tunai");
                  setFormStatus("LUNAS");
                  setShowCatatModal(true);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-3.5 py-2 rounded-2xl shadow-lg transition-all flex items-center gap-1.5"
              >
                <Plus size={16} /> + Catat Pembayaran
              </button>
            )}

            {isKetua && (
              <button
                onClick={() => {
                  const csvHeader = "ID_Iuran,ID_Anggota,Nama,Bulan,Tahun,Nominal,Status,Tanggal_Bayar,Metode,Penerima\n";
                  const csvRows   = iuranList.map((i) =>
                    `"${i.id || i.ID}","${i.ID_Anggota}","${i.Nama_Anggota}","${i.Bulan}",${i.Tahun},${i.Nominal || i.Jumlah || 0},"${i.Status}","${i.Tanggal_Bayar || "-"}","${i.Metode_Bayar || "-"}","${i.Penerima || "-"}"`
                  ).join("\n");

                  const blob = new Blob([csvHeader + csvRows], { type: "text/csv;charset=utf-8;" });
                  const url  = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href  = url;
                  link.setAttribute("download", `Data_Iuran_Remaja_Legok_03_${selectedTahun}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                  showToast("Data iuran berhasil diunduh sebagai file CSV!", "success");
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs px-3 py-2 rounded-2xl transition-all flex items-center gap-1"
                title="Export Data ke File CSV"
              >
                <Download size={15} />
                <span className="hidden sm:inline">Export</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* VIEW 1: ANGGOTA BIASA */}
      {/* ================================================================= */}
      {userRole === "ANGGOTA" && (
        <div className="space-y-6">

          {/* Member Selector */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <User size={16} className="text-amber-400" />
              <span className="text-xs text-slate-400 font-bold">Pilih Profil:</span>
            </div>
            <select
              value={selectedMemberForView}
              onChange={(e) => setSelectedMemberForView(e.target.value)}
              className="bg-slate-950 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-800 outline-none focus:border-amber-500"
            >
              {anggotaList.map((a) => (
                <option key={a.ID_Anggota} value={a.ID_Anggota}>
                  {a.Nama_Lengkap} ({a.ID_Anggota})
                </option>
              ))}
            </select>
          </div>

          {/* Kartu Profil Iuran */}
          {activeAnggotaObj && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl dark:shadow-none">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <img
                    src={activeAnggotaObj.Foto_Profil || ""}
                    alt={activeAnggotaObj.Nama_Lengkap}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-500/40 shadow-lg bg-slate-800"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-white">{activeAnggotaObj.Nama_Lengkap}</h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Aktif
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      ID: <span className="text-amber-400 font-bold">{activeAnggotaObj.ID_Anggota}</span>
                    </p>
                  </div>
                </div>

                {/* Ringkasan Tahunan */}
                {(() => {
                  const summary = getMemberYearSummary(activeAnggotaObj.ID_Anggota, selectedTahun);
                  return (
                    <div className="w-full md:w-auto bg-slate-950 p-4 rounded-2xl border border-slate-800 flex-1 max-w-lg space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-bold">Ringkasan {selectedTahun}</span>
                        <span className="text-amber-400 font-extrabold">{summary.lunasCount} / 12 Lunas</span>
                      </div>
                      <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${summary.progressPercent}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                        {[
                          { label: "Sudah Lunas",    value: `${summary.lunasCount} Bulan`,                            color: "text-emerald-400" },
                          { label: "Belum Bayar",    value: `${summary.belumBayarCount} Bulan`, color: "text-rose-400" },
                          { label: "Total Terbayar", value: `Rp ${summary.totalPaid.toLocaleString("id-ID")}`,        color: "text-white"       },
                          { label: "Tunggakan",      value: `Rp ${summary.totalUnpaid.toLocaleString("id-ID")}`,      color: "text-amber-400"   },
                        ].map((s) => (
                          <div key={s.label} className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                            <span className="text-[10px] text-slate-400 block">{s.label}</span>
                            <span className={`text-xs font-black ${s.color}`}>{s.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Kalender 12 Bulan */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl dark:shadow-none space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Calendar size={18} className="text-amber-400" />
              Kalender Status Iuran Saya ({selectedTahun})
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {MONTHS.map((bulan) => {
                const { status, item, nominalPaid } = getMemberMonthStatus(
                  activeAnggotaObj?.ID_Anggota || "",
                  bulan,
                  selectedTahun
                );

                const styleMap: Record<string, { bg: string; badge: string; badgeText: string }> = {
                  LUNAS             : { bg: "bg-emerald-950/40 border-emerald-500/40 text-emerald-300", badge: "bg-emerald-500 text-slate-950 font-black", badgeText: "Lunas" },
                  BELUM_BAYAR       : { bg: "bg-rose-950/40 border-rose-500/40 text-rose-300",           badge: "bg-rose-500 text-white font-bold",          badgeText: "Belum Bayar" },
                  CICIL             : { bg: "bg-amber-950/40 border-amber-500/40 text-amber-300",        badge: "bg-amber-500 text-slate-950 font-black",    badgeText: "Cicil" },
                  DIBEBASKAN        : { bg: "bg-slate-800/60 border-slate-700 text-slate-300",           badge: "bg-slate-700 text-slate-200 font-bold",     badgeText: "Dibebaskan" },
                  MENUNGGU_KONFIRMASI: { bg: "bg-blue-950/40 border-blue-500/40 text-blue-300",          badge: "bg-blue-500 text-white font-bold",          badgeText: "Menunggu" },
                  BELUM_WAKTUNYA    : { bg: "bg-slate-950 border-slate-800 text-slate-400",              badge: "bg-slate-800 text-slate-400",               badgeText: "Belum Waktunya" },
                };

                const style = styleMap[status] || styleMap["BELUM_WAKTUNYA"];

                return (
                  <button
                    key={bulan}
                    onClick={() => {
                      if (item) { setActiveReceiptItem(item); setShowBuktiModal(true); }
                      else showToast(`Status ${bulan} ${selectedTahun}: ${style.badgeText}`, "info");
                    }}
                    className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between h-28 shadow-sm ${style.bg}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-black uppercase tracking-wider">{bulan.slice(0, 3)}</span>
                      {status === "LUNAS"       && <CheckCircle2 size={16} className="text-emerald-400" />}
                      {status === "BELUM_BAYAR" && <XCircle      size={16} className="text-rose-400" />}
                      {status === "CICIL"       && <Clock         size={16} className="text-amber-400" />}
                    </div>
                    <div className="mt-2">
                      <span className="text-[10px] text-slate-400 block font-mono">
                        Rp {(status === "LUNAS" ? nominalPaid : defaultNominal).toLocaleString("id-ID")}
                      </span>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] ${style.badge}`}>
                        {style.badgeText}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Riwayat Transaksi */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl dark:shadow-none space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <FileText size={18} className="text-amber-400" />
              Riwayat Transaksi Iuran Saya ({selectedTahun})
            </h3>

            {(() => {
              const myLogs = iuranList.filter(
                (i) => i.ID_Anggota === activeAnggotaObj?.ID_Anggota && String(i.Tahun) === selectedTahun
              );

              if (myLogs.length === 0) {
                return (
                  <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                    Belum ada riwayat pembayaran untuk tahun {selectedTahun}.
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto rounded-2xl border border-slate-800">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Bulan / No Bukti</th>
                        <th className="p-3">Tanggal Bayar</th>
                        <th className="p-3">Nominal</th>
                        <th className="p-3">Metode</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {myLogs.map((log) => (
                        <tr key={log.id || log.ID} className="hover:bg-slate-850">
                          <td className="p-3 font-bold text-white">
                            <div>{log.Bulan} {log.Tahun}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{log.Nomor_Bukti || log.id}</div>
                          </td>
                          <td className="p-3 font-mono">{log.Tanggal_Bayar || "-"}</td>
                          <td className="p-3 font-bold text-emerald-400">
                            Rp {(log.Nominal || log.Jumlah || 0).toLocaleString("id-ID")}
                          </td>
                          <td className="p-3">{log.Metode_Bayar || "Tunai"}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              log.Status === "LUNAS"      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                              log.Status === "CICIL"      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                              log.Status === "DIBEBASKAN" ? "bg-slate-700 text-slate-300" :
                              "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            }`}>
                              {log.Status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => { setActiveReceiptItem(log); setShowBuktiModal(true); }}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl text-[10px] font-bold border border-slate-700 inline-flex items-center gap-1"
                            >
                              <Eye size={12} /> Bukti Bayar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>

          {/* Info Pembayaran */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl dark:shadow-none space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <QrCode size={18} className="text-amber-400" /> Petunjuk Pembayaran Iuran
            </h3>
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400">Nominal Iuran:</span>
                <span className="text-amber-400 font-extrabold text-sm">Rp {defaultNominal.toLocaleString("id-ID")} / bulan</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400">Jatuh Tempo:</span>
                <span className="text-slate-200 font-bold">Tanggal {defaultJatuhTempo} Setiap Bulan</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <a
                href={`https://wa.me/6285712341234?text=${encodeURIComponent("Halo Sekretaris, saya mau bayar iuran pemuda Remaja Legok 03.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-3 rounded-2xl flex items-center justify-center gap-1.5 shadow-md"
              >
                <Send size={14} /> Hubungi Sekretaris via WA
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* VIEW 2: MANAJEMEN (SEKRETARIS / KETUA / SA) */}
      {/* ================================================================= */}
      {isManagement && activeMainTab === "MANAJEMEN" && (
        <div className="space-y-6">

          {/* Rekap Kartu */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl text-white">
              <span className="text-[10px] text-slate-400 font-medium block">Total Anggota</span>
              <span className="text-lg font-black text-white mt-0.5 block">{monthRekapStats.totalMembers} Orang</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl text-white">
              <span className="text-[10px] text-slate-400 font-medium block">Sudah Bayar ({selectedBulanNama})</span>
              <span className="text-lg font-black text-emerald-400 mt-0.5 block">{monthRekapStats.countLunas + monthRekapStats.countBebas} Orang</span>
              <span className="text-[10px] text-emerald-500 font-bold">{monthRekapStats.lunasPercentage}% Kepatuhan</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl text-white">
              <span className="text-[10px] text-slate-400 font-medium block">Belum Bayar ({selectedBulanNama})</span>
              <span className="text-lg font-black text-rose-400 mt-0.5 block">{monthRekapStats.countBelum + monthRekapStats.countCicil} Orang</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl text-white col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-400 font-medium block">Pemasukan Bulan Ini</span>
              <span className="text-lg font-black text-amber-400 mt-0.5 block">
                Rp {monthRekapStats.totalIncomeThisMonth.toLocaleString("id-ID")}
              </span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl text-white col-span-2 sm:col-span-2 lg:col-span-1 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-medium block">Aksi Massal WA</span>
                <span className="text-xs font-bold text-emerald-400 mt-0.5 block">{unpaidMembersList.length} Nunggak</span>
              </div>
              <button
                onClick={() => setShowReminderMassalModal(true)}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center gap-1 shadow-md"
              >
                <Send size={14} /> Kirim WA
              </button>
            </div>
          </div>

          {/* Navigasi Bulan */}
          <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-3xl overflow-x-auto shadow-lg">
            <div className="flex items-center gap-1.5 min-w-max">
              {MONTHS.map((bulan, index) => {
                const isActive       = index === selectedBulanIndex;
                const isCurrentMonth = index === new Date().getMonth();
                return (
                  <button
                    key={bulan}
                    onClick={() => setSelectedBulanIndex(index)}
                    className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isActive
                        ? "bg-amber-500 text-slate-950 font-black shadow-md scale-105"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    <span>{bulan}</span>
                    {isCurrentMonth && (
                      <span className={`w-2 h-2 rounded-full ${isActive ? "bg-slate-950" : "bg-amber-400 animate-pulse"}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Cari nama atau ID anggota..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full bg-slate-950 text-white text-xs pl-10 pr-4 py-2.5 rounded-2xl border border-slate-800 outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 text-slate-300 text-xs font-bold px-3 py-2 rounded-2xl border border-slate-800 outline-none focus:border-amber-500"
              >
                <option value="SEMUA">Semua Status</option>
                <option value="LUNAS">🟢 Sudah Lunas</option>
                <option value="BELUM_BAYAR">🔴 Belum Bayar</option>
                <option value="CICIL">🟡 Cicil</option>
                <option value="DIBEBASKAN">⚪ Dibebaskan</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="bg-slate-950 text-slate-300 text-xs font-bold px-3 py-2 rounded-2xl border border-slate-800 outline-none focus:border-amber-500"
              >
                <option value="NAMA">Urut Nama A-Z</option>
                <option value="ID">Urut ID Anggota</option>
                <option value="STATUS">Urut Status</option>
              </select>
            </div>
          </div>

          {/* Tabel Status Iuran */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider">
                Daftar Status Iuran: {selectedBulanNama} {selectedTahun}
              </h3>
            </div>

            {(() => {
              let filtered = anggotaList.filter((m) => {
                const matchKeyword =
                  m.Nama_Lengkap.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                  m.ID_Anggota.toLowerCase().includes(searchKeyword.toLowerCase());
                if (!matchKeyword) return false;
                if (statusFilter === "SEMUA") return true;
                const { status } = getMemberMonthStatus(m.ID_Anggota, selectedBulanNama, selectedTahun);
                return status === statusFilter;
              });

              filtered.sort((a, b) => {
                if (sortBy === "NAMA")   return a.Nama_Lengkap.localeCompare(b.Nama_Lengkap);
                if (sortBy === "ID")     return a.ID_Anggota.localeCompare(b.ID_Anggota);
                if (sortBy === "STATUS") {
                  const statA = getMemberMonthStatus(a.ID_Anggota, selectedBulanNama, selectedTahun).status;
                  const statB = getMemberMonthStatus(b.ID_Anggota, selectedBulanNama, selectedTahun).status;
                  return statA.localeCompare(statB);
                }
                return 0;
              });

              if (filtered.length === 0) {
                return (
                  <div className="p-12 text-center text-slate-400 text-xs">
                    Tidak ada data anggota yang sesuai filter.
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-3.5">ID & Nama Anggota</th>
                        <th className="p-3.5">Bulan</th>
                        <th className="p-3.5">Status Payment</th>
                        <th className="p-3.5">Nominal / Tgl Bayar</th>
                        <th className="p-3.5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filtered.map((member) => {
                        const { status, item, nominalPaid } = getMemberMonthStatus(
                          member.ID_Anggota,
                          selectedBulanNama,
                          selectedTahun
                        );

                        return (
                          <tr key={member.ID_Anggota} className="hover:bg-slate-850/80 transition-colors">
                            <td className="p-3.5">
                              <div className="flex items-center gap-3">
                                <img
                                  src={member.Foto_Profil || ""}
                                  alt={member.Nama_Lengkap}
                                  className="w-9 h-9 rounded-xl object-cover border border-slate-700 bg-slate-800"
                                />
                                <div>
                                  <div className="font-extrabold text-white text-xs">{member.Nama_Lengkap}</div>
                                  <div className="text-[10px] text-amber-400 font-mono">{member.ID_Anggota}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5 text-slate-300">{selectedBulanNama} {selectedTahun}</td>
                            <td className="p-3.5">
                              {status === "LUNAS" && (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-max">
                                  <CheckCircle2 size={12} /> LUNAS
                                </span>
                              )}
                              {status === "BELUM_BAYAR" && (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1 w-max">
                                  <XCircle size={12} /> BELUM BAYAR
                                </span>
                              )}
                              {status === "CICIL" && (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1 w-max">
                                  <Clock size={12} /> CICIL (Rp {nominalPaid.toLocaleString("id-ID")})
                                </span>
                              )}
                              {status === "DIBEBASKAN" && (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-700 text-slate-300 border border-slate-600 flex items-center gap-1 w-max">
                                  <ShieldCheck size={12} /> DIBEBASKAN
                                </span>
                              )}
                              {status === "BELUM_WAKTUNYA" && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400">
                                  Belum Waktunya
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 font-mono text-xs">
                              {item?.Tanggal_Bayar ? (
                                <div>
                                  <div className="text-emerald-400 font-bold">Rp {(item.Nominal || item.Jumlah || 0).toLocaleString("id-ID")}</div>
                                  <div className="text-[10px] text-slate-500">{item.Tanggal_Bayar}</div>
                                </div>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                            </td>
                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {(status === "BELUM_BAYAR" || status === "CICIL") && (
                                  <>
                                    {member.No_HP && (
                                      <a
                                        href={generateWaLink(member.No_HP, member.Nama_Lengkap, selectedBulanNama, selectedTahun, defaultNominal)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/40 rounded-xl text-[10px] font-bold flex items-center gap-1"
                                      >
                                        <Send size={12} /> WA Remind
                                      </a>
                                    )}
                                    <button
                                      onClick={() => openCatatModalForMember(member.ID_Anggota)}
                                      className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-[10px] font-black flex items-center gap-1 shadow-sm"
                                    >
                                      <Check size={12} /> Catat Bayar
                                    </button>
                                  </>
                                )}

                                {item && (
                                  <button
                                    onClick={() => { setActiveReceiptItem(item); setShowBuktiModal(true); }}
                                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-bold border border-slate-700 flex items-center gap-1"
                                  >
                                    <Eye size={12} /> Bukti
                                  </button>
                                )}

                                {isKetua && item && (
                                  <button
                                    onClick={() => { setEditingIuran(item); setShowEditModal(true); }}
                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700"
                                    aria-label="Edit data iuran"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                )}

                                {isKetua && item && (
                                  <button
                                    onClick={() => { setItemToDelete(item); setShowDeleteModal(true); }}
                                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30"
                                    aria-label="Hapus data iuran"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* VIEW 3: LAPORAN */}
      {/* ================================================================= */}
      {isKetua && activeMainTab === "LAPORAN" && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <PieChart size={18} className="text-amber-400" />
              Laporan Tahunan Iuran ({selectedTahun})
            </h3>

            {/* Bar Chart */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
              <span className="text-xs text-slate-400 font-bold block">Grafik Realisasi per Bulan (Rp)</span>
              <div className="h-44 flex items-end justify-between gap-1 sm:gap-2 pt-6 pb-2 px-2 border-b border-slate-800">
                {MONTHS.map((m) => {
                  const totalBulan = iuranList
                    .filter((i) => i.Bulan.toLowerCase() === m.toLowerCase() && String(i.Tahun) === selectedTahun)
                    .reduce((acc, i) => acc + (i.Nominal || i.Jumlah || 0), 0);

                  const maxVal       = (anggotaList.length || 10) * defaultNominal;
                  const heightPercent = Math.min(100, Math.round((totalBulan / (maxVal || 1)) * 100));

                  return (
                    <div key={m} className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end">
                      <div className="absolute -top-8 bg-slate-900 text-[9px] text-amber-400 font-mono px-2 py-0.5 rounded border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        Rp {totalBulan.toLocaleString("id-ID")}
                      </div>
                      <div
                        className="w-full bg-gradient-to-t from-amber-600 to-amber-400 rounded-t-md transition-all duration-300 min-h-[4px]"
                        style={{ height: `${Math.max(4, heightPercent)}%` }}
                      />
                      <span className="text-[9px] text-slate-500 font-mono uppercase">{m.slice(0, 3)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Matriks Per Anggota */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Layers size={18} className="text-amber-400" />
              Matriks Rekapitulasi Per Anggota ({selectedTahun})
            </h3>

            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[9px]">
                  <tr>
                    <th className="p-3">Anggota</th>
                    {MONTHS.map((m) => (
                      <th key={m} className="p-2 text-center">{m.slice(0, 3)}</th>
                    ))}
                    <th className="p-3 text-right">% Lunas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {anggotaList.map((m) => {
                    const summary = getMemberYearSummary(m.ID_Anggota, selectedTahun);
                    return (
                      <tr key={m.ID_Anggota} className="hover:bg-slate-850">
                        <td className="p-3 font-bold text-white whitespace-nowrap">
                          <div>{m.Nama_Lengkap}</div>
                          <div className="text-[10px] text-amber-400 font-mono">{m.ID_Anggota}</div>
                        </td>
                        {MONTHS.map((bln) => {
                          const { status } = getMemberMonthStatus(m.ID_Anggota, bln, selectedTahun);
                          return (
                            <td key={bln} className="p-2 text-center">
                              {status === "LUNAS"          && <span className="inline-block w-3 h-3 rounded-full bg-emerald-500" title={`${bln}: Lunas`} />}
                              {status === "BELUM_BAYAR"    && <span className="inline-block w-3 h-3 rounded-full bg-rose-500"    title={`${bln}: Belum Bayar`} />}
                              {status === "CICIL"          && <span className="inline-block w-3 h-3 rounded-full bg-amber-500"   title={`${bln}: Cicil`} />}
                              {status === "DIBEBASKAN"     && <span className="inline-block w-3 h-3 rounded-full bg-slate-600"   title={`${bln}: Dibebaskan`} />}
                              {status === "BELUM_WAKTUNYA" && <span className="inline-block w-3 h-3 rounded-full bg-slate-800"   title={`${bln}: Belum Waktunya`} />}
                            </td>
                          );
                        })}
                        <td className="p-3 text-right font-black text-amber-400">{summary.progressPercent}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Anggota Nunggak > 3 Bulan */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl space-y-4">
            <h3 className="text-base font-black text-rose-400 flex items-center gap-2">
              <AlertTriangle size={18} /> Daftar Tunggakan Lebih dari 3 Bulan
            </h3>
            {(() => {
              const problemMembers = anggotaList.filter((m) => {
                const summary = getMemberYearSummary(m.ID_Anggota, selectedTahun);
                return summary.belumBayarCount >= 3;
              });

              if (problemMembers.length === 0) {
                return (
                  <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 text-center text-xs text-emerald-400 font-bold">
                    🎉 Tidak ada anggota dengan tunggakan lebih dari 3 bulan!
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {problemMembers.map((m) => {
                    const summary = getMemberYearSummary(m.ID_Anggota, selectedTahun);
                    return (
                      <div key={m.ID_Anggota} className="bg-slate-950 p-4 rounded-2xl border border-rose-500/30 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={m.Foto_Profil || ""}
                            alt={m.Nama_Lengkap}
                            className="w-10 h-10 rounded-xl object-cover border border-rose-500/40 bg-slate-800"
                          />
                          <div>
                            <div className="font-bold text-white text-xs">{m.Nama_Lengkap} ({m.ID_Anggota})</div>
                            <div className="text-[10px] text-rose-400 font-bold mt-0.5">
                              Nunggak {summary.belumBayarCount} Bulan • Rp {summary.totalUnpaid.toLocaleString("id-ID")}
                            </div>
                          </div>
                        </div>
                        {m.No_HP && (
                          <a
                            href={generateWaLink(m.No_HP, m.Nama_Lengkap, "Beberapa Bulan", selectedTahun, summary.totalUnpaid)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-md"
                          >
                            <Send size={12} /> Kirim Peringatan WA
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* VIEW 4: PENGATURAN */}
      {/* ================================================================= */}
      {isKetua && activeMainTab === "PENGATURAN" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl space-y-6 max-w-3xl mx-auto">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <Settings size={22} className="text-amber-400" />
            <div>
              <h3 className="text-lg font-black text-white">Pengaturan Sistem Iuran</h3>
              <p className="text-xs text-slate-400">Atur nominal rutin dan tanggal jatuh tempo</p>
            </div>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Nominal Iuran (Rp/Bulan)</label>
                <input
                  type="number"
                  value={defaultNominal}
                  onChange={(e) => setAppData({
                    ...appData,
                    Settings: { ...appData.Settings, Nominal_Iuran: parseInt(e.target.value, 10) || 10000 }
                  })}
                  className="w-full bg-slate-950 text-white font-mono p-3 rounded-2xl border border-slate-800 outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Tanggal Jatuh Tempo (Tiap Bulan)</label>
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={defaultJatuhTempo}
                  onChange={(e) => setAppData({
                    ...appData,
                    Settings: { ...appData.Settings, Jatuh_Tempo_Iuran: parseInt(e.target.value, 10) || 10 }
                  })}
                  className="w-full bg-slate-950 text-white font-mono p-3 rounded-2xl border border-slate-800 outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-2xl shadow-lg transition-all"
            >
              Simpan Pengaturan Iuran
            </button>
          </form>
        </div>
      )}

      {/* ================================================================= */}
      {/* VIEW 5: LOG (SUPER ADMIN) */}
      {/* ================================================================= */}
      {userRole === "SUPER_ADMIN" && activeMainTab === "LOG" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl space-y-4">
          <h3 className="text-base font-black text-purple-400 flex items-center gap-2">
            <Clock size={18} /> Audit Log Aktivitas Iuran
          </h3>
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Waktu</th>
                  <th className="p-3">Pelaku</th>
                  <th className="p-3">Aksi</th>
                  <th className="p-3">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {(appData.LogAkses || [])
                  .filter((l) => l.Aksi?.includes("IURAN"))
                  .slice(0, 30)
                  .map((log) => (
                    <tr key={log.id} className="hover:bg-slate-850">
                      <td className="p-3 text-slate-500 text-[10px]">{log.Waktu}</td>
                      <td className="p-3 font-bold text-amber-400">{log.Nama} ({log.Role})</td>
                      <td className="p-3 text-emerald-400">{log.Aksi}</td>
                      <td className="p-3 text-slate-300">{log.Detail}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 1: CATAT PEMBAYARAN */}
      {/* ================================================================= */}
      {showCatatModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white max-w-md w-full shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-black text-amber-400 flex items-center gap-2">
                <Plus size={18} /> Form Catat Pembayaran Iuran
              </h3>
              <button
                onClick={() => setShowCatatModal(false)}
                aria-label="Tutup modal"
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCatatPembayaran} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Pilih Anggota</label>
                <select
                  required
                  value={formAnggotaId}
                  onChange={(e) => setFormAnggotaId(e.target.value)}
                  className="w-full bg-slate-950 text-white font-bold p-3 rounded-2xl border border-slate-800 outline-none focus:border-amber-500"
                >
                  <option value="">-- Pilih Anggota --</option>
                  {anggotaList.map((a) => (
                    <option key={a.ID_Anggota} value={a.ID_Anggota}>
                      {a.Nama_Lengkap} ({a.ID_Anggota})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Bulan Iuran</label>
                  <select
                    value={formBulanIndex}
                    onChange={(e) => setFormBulanIndex(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 text-white p-3 rounded-2xl border border-slate-800 outline-none focus:border-amber-500"
                  >
                    {MONTHS.map((m, idx) => (
                      <option key={m} value={idx}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Tahun</label>
                  <select
                    value={formTahun}
                    onChange={(e) => setFormTahun(e.target.value)}
                    className="w-full bg-slate-950 text-white p-3 rounded-2xl border border-slate-800 outline-none focus:border-amber-500"
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Status Pembayaran</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as FormStatus)}
                  className="w-full bg-slate-950 text-white font-bold p-3 rounded-2xl border border-slate-800 outline-none focus:border-amber-500"
                >
                  <option value="LUNAS">🟢 LUNAS (Bayar Penuh)</option>
                  <option value="CICIL">🟡 CICIL (Bayar Sebagian)</option>
                  <option value="DIBEBASKAN">⚪ DIBEBASKAN</option>
                </select>
              </div>

              {formStatus === "CICIL" && (
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Nominal Dicicil (Rp)</label>
                  <input
                    type="number"
                    value={formNominalCicil}
                    onChange={(e) => setFormNominalCicil(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-950 text-amber-400 font-mono p-3 rounded-2xl border border-slate-800 outline-none focus:border-amber-500"
                  />
                </div>
              )}

              {formStatus === "DIBEBASKAN" && (
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Alasan Pembebasan *</label>
                  <input
                    required
                    type="text"
                    placeholder="Tugas luar kota / Sakit / Anggota Baru"
                    value={formAlasanBebas}
                    onChange={(e) => setFormAlasanBebas(e.target.value)}
                    className="w-full bg-slate-950 text-white p-3 rounded-2xl border border-slate-800 outline-none focus:border-amber-500"
                  />
                </div>
              )}

              {formStatus !== "DIBEBASKAN" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Nominal (Rp)</label>
                    <input
                      type="number"
                      value={formNominal}
                      onChange={(e) => setFormNominal(parseInt(e.target.value, 10) || 10000)}
                      className="w-full bg-slate-950 text-emerald-400 font-mono font-bold p-3 rounded-2xl border border-slate-800 outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Metode</label>
                    <select
                      value={formMetode}
                      onChange={(e) => setFormMetode(e.target.value as FormMetode)}
                      className="w-full bg-slate-950 text-white p-3 rounded-2xl border border-slate-800 outline-none focus:border-amber-500"
                    >
                      <option value="Tunai">Tunai</option>
                      <option value="Transfer">Transfer Bank</option>
                      <option value="QRIS">QRIS</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-400 font-bold mb-1">Tanggal Bayar</label>
                <input
                  type="date"
                  value={formTanggal}
                  onChange={(e) => setFormTanggal(e.target.value)}
                  className="w-full bg-slate-950 text-white p-3 rounded-2xl border border-slate-800 outline-none focus:border-amber-500"
                />
              </div>

              {/* Upload Bukti Transfer */}
              <div>
                <label className="block text-slate-400 font-bold mb-1">📎 Bukti Transfer (Opsional)</label>
                {buktiPreview || formBuktiUrl ? (
                  <div className="relative">
                    {(buktiPreview || formBuktiUrl).startsWith("data:") || (buktiPreview || formBuktiUrl).includes("drive.google.com") ? (
                      <img src={buktiPreview || formBuktiUrl} alt="Bukti Transfer"
                        className="w-full max-h-40 object-contain rounded-xl border border-slate-700 bg-slate-950" />
                    ) : (
                      <div className="p-4 bg-slate-950 rounded-xl border border-slate-700 text-xs text-slate-400">
                        📄 File tersimpan: {formBuktiUrl ? "✅" : "⏳"}
                      </div>
                    )}
                    <button type="button" onClick={handleRemoveBukti}
                      className="absolute top-2 right-2 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-amber-500/40 transition-all bg-slate-900/50">
                    {buktiUploading ? (
                      <div className="flex items-center gap-2 text-amber-400">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-xs">Mengupload ke Drive...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Upload size={16} />
                        <span className="text-xs">Upload Bukti (JPG/PNG/PDF, max 5MB)</span>
                      </div>
                    )}
                    <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={handleUploadBukti} disabled={buktiUploading} className="hidden" />
                  </label>
                )}
                {formBuktiUrl && formBuktiUrl.includes("drive.google.com") && (
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1">
                    <Image size={10} /> Tersimpan di Google Drive ☁️
                  </p>
                )}
                {formBuktiUrl && formBuktiUrl.startsWith("data:") && (
                  <p className="text-[10px] text-amber-400 mt-1">⚠️ Tersimpan lokal (Drive tidak tersedia)</p>
                )}
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Catatan Tambahan (Opsional)</label>
                <input
                  type="text"
                  placeholder="Catatan dari pengurus..."
                  value={formCatatan}
                  onChange={(e) => setFormCatatan(e.target.value)}
                  className="w-full bg-slate-950 text-white p-3 rounded-2xl border border-slate-800 outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCatatModal(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-2xl shadow-lg"
                >
                  Simpan Pembayaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 2: BUKTI PEMBAYARAN DIGITAL */}
      {/* ================================================================= */}
      {showBuktiModal && activeReceiptItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white max-w-sm w-full shadow-2xl space-y-4 relative my-8">
            <button
              onClick={() => setShowBuktiModal(false)}
              aria-label="Tutup bukti"
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              ✕
            </button>

            <div className="bg-gradient-to-b from-slate-950 to-slate-900 border-2 border-amber-500/40 p-5 rounded-2xl text-center space-y-4 shadow-xl">
              <div className="border-b border-dashed border-slate-800 pb-3">
                <h4 className="text-sm font-black text-amber-400">Remaja Legok 03</h4>
                <p className="text-[10px] text-slate-400">RT 03 Legok RW 04 Denokan, Semarang</p>
                <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[9px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  BUKTI PEMBAYARAN RESMI
                </span>
              </div>

              <div className="text-left text-xs space-y-2 font-mono">
                {[
                  { label: "No. Bukti",    value: activeReceiptItem.Nomor_Bukti || activeReceiptItem.id,               color: "text-amber-400 font-bold" },
                  { label: "Anggota",      value: activeReceiptItem.Nama_Anggota,                                      color: "text-white font-bold" },
                  { label: "ID Anggota",   value: activeReceiptItem.ID_Anggota,                                        color: "text-slate-300" },
                  { label: "Bulan Iuran",  value: `${activeReceiptItem.Bulan} ${activeReceiptItem.Tahun}`,             color: "text-white font-bold" },
                  { label: "Nominal",      value: `Rp ${(activeReceiptItem.Nominal || activeReceiptItem.Jumlah || 0).toLocaleString("id-ID")}`, color: "text-emerald-400 font-black text-sm" },
                  { label: "Metode",       value: activeReceiptItem.Metode_Bayar || "Tunai",                           color: "text-slate-300" },
                  { label: "Tgl Bayar",    value: activeReceiptItem.Tanggal_Bayar || "-",                              color: "text-slate-300" },
                  { label: "Dicatat Oleh", value: activeReceiptItem.Penerima || "Sekretaris",                          color: "text-slate-300" },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between">
                    <span className="text-slate-500">{row.label}:</span>
                    <span className={row.color}>{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Tampilkan gambar bukti transfer */}
              {activeReceiptItem.Bukti_Transfer && (
                <div className="pt-2 border-t border-dashed border-slate-800">
                  <p className="text-[10px] text-slate-500 mb-1 text-center">📎 Bukti Transfer</p>
                  <img
                    src={activeReceiptItem.Bukti_Transfer}
                    alt="Bukti Transfer"
                    className="w-full max-h-48 object-contain rounded-xl border border-slate-700"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}

              <div className="pt-2 border-t border-dashed border-slate-800 flex items-center justify-center gap-2 text-[9px] text-slate-500">
                <QrCode size={24} className="text-slate-400" />
                <span>Terverifikasi Sistem Digital Remaja Legok 03</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `*BUKTI PEMBAYARAN IURAN REMAJA LEGOK 03*\nNo: ${activeReceiptItem.Nomor_Bukti || activeReceiptItem.id}\nNama: ${activeReceiptItem.Nama_Anggota}\nBulan: ${activeReceiptItem.Bulan} ${activeReceiptItem.Tahun}\nNominal: Rp ${(activeReceiptItem.Nominal || activeReceiptItem.Jumlah || 0).toLocaleString("id-ID")}\nStatus: ${activeReceiptItem.Status}\nTerima kasih! 🙏`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-md"
              >
                <Share2 size={14} /> Bagikan ke WA Anggota
              </a>
              <button
                onClick={() => {
                  const text = `BUKTI IURAN REMAJA LEGOK 03\nNo: ${activeReceiptItem.Nomor_Bukti || activeReceiptItem.id}\nNama: ${activeReceiptItem.Nama_Anggota}\nBulan: ${activeReceiptItem.Bulan} ${activeReceiptItem.Tahun}\nNominal: Rp ${(activeReceiptItem.Nominal || activeReceiptItem.Jumlah || 0).toLocaleString("id-ID")}\nStatus: ${activeReceiptItem.Status}`;
                  navigator.clipboard.writeText(text);
                  showToast("Teks bukti disalin ke clipboard!", "success");
                }}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 border border-slate-700"
              >
                <Copy size={14} /> Salin Teks Bukti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 3: REMINDER MASSAL */}
      {/* ================================================================= */}
      {showReminderMassalModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white max-w-lg w-full shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-black text-emerald-400 flex items-center gap-2">
                <Send size={18} /> Pengingat Massal WA ({selectedBulanNama} {selectedTahun})
              </h3>
              <button
                onClick={() => setShowReminderMassalModal(false)}
                aria-label="Tutup modal"
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Template Pesan</label>
                <textarea
                  rows={3}
                  value={reminderTemplate}
                  onChange={(e) => setReminderTemplate(e.target.value)}
                  className="w-full bg-slate-950 text-white p-3 rounded-2xl border border-slate-800 outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-500">Placeholder: [Nama], [Bulan], [Tahun], [Jumlah]</span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="font-bold text-white">Nunggak ({unpaidMembersList.length})</span>
                <button
                  onClick={handleCopyUnpaidNumbers}
                  className="text-[10px] bg-slate-800 hover:bg-slate-700 text-amber-400 px-2.5 py-1 rounded-xl font-bold border border-slate-700"
                >
                  📋 Salin Semua Nomor HP
                </button>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                {unpaidMembersList.map((m) => (
                  <div key={m.ID_Anggota} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">{m.Nama_Lengkap}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{m.No_HP || "Tidak ada HP"}</div>
                    </div>
                    {m.No_HP && (
                      <a
                        href={generateWaLink(m.No_HP, m.Nama_Lengkap, selectedBulanNama, selectedTahun, defaultNominal)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-lg flex items-center gap-1"
                      >
                        <Send size={10} /> Kirim WA
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 4: HAPUS KONFIRMASI */}
      {/* ================================================================= */}
      {showDeleteModal && itemToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-rose-400 flex items-center gap-2">
              <Trash2 size={18} /> Konfirmasi Hapus Data Iuran
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Yakin hapus catatan iuran{" "}
              <strong className="text-white">{itemToDelete.Nama_Anggota}</strong>{" "}
              ({itemToDelete.Bulan} {itemToDelete.Tahun})?
            </p>

            {userRole === "SUPER_ADMIN" && (
              <div>
                <label className="block text-slate-400 text-xs font-bold mb-1">Kode Otorisasi SA</label>
                <input
                  type="password"
                  placeholder="Masukkan Kode Otorisasi"
                  value={saPinInput}
                  onChange={(e) => setSaPinInput(e.target.value)}
                  className="w-full bg-slate-950 text-white font-mono text-center text-sm p-3 rounded-2xl border border-slate-800 outline-none focus:border-rose-500"
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { setShowDeleteModal(false); setSaPinInput(""); }}
                className="flex-1 py-2.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-2xl"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteIuranConfirm}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-2xl shadow-lg"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 5: EDIT IURAN */}
      {/* ================================================================= */}
      {showEditModal && editingIuran && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-amber-400 flex items-center gap-2">
              <Edit2 size={18} /> Edit Data Iuran
            </h3>

            <form onSubmit={handleSaveEditIuran} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Anggota</label>
                <input
                  type="text"
                  value={editingIuran.Nama_Anggota || ""}
                  disabled
                  className="w-full bg-slate-950 text-slate-400 p-2.5 rounded-2xl border border-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Status</label>
                <select
                  value={editingIuran.Status || "LUNAS"}
                  onChange={(e) => setEditingIuran({ ...editingIuran, Status: e.target.value as IuranStatus })}
                  className="w-full bg-slate-950 text-white font-bold p-2.5 rounded-2xl border border-slate-800 outline-none"
                >
                  <option value="LUNAS">🟢 LUNAS</option>
                  <option value="BELUM_BAYAR">🔴 BELUM BAYAR</option>
                  <option value="CICIL">🟡 CICIL</option>
                  <option value="DIBEBASKAN">⚪ DIBEBASKAN</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  value={editingIuran.Nominal || editingIuran.Jumlah || 0}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 0;
                    setEditingIuran({ ...editingIuran, Nominal: val, Jumlah: val });
                  }}
                  className="w-full bg-slate-950 text-emerald-400 font-mono font-bold p-2.5 rounded-2xl border border-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">t("kas.metodeBayar")</label>
                <input
                  type="text"
                  value={editingIuran.Metode_Bayar || "Tunai"}
                  onChange={(e) => setEditingIuran({ ...editingIuran, Metode_Bayar: e.target.value })}
                  className="w-full bg-slate-950 text-white p-2.5 rounded-2xl border border-slate-800 outline-none"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-2xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-2xl"
                >
                  Simpan Edit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
