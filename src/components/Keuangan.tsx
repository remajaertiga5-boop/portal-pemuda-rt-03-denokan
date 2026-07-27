import React, { useState, useMemo } from "react";
import { 
  Wallet, DollarSign, Plus, CheckCircle2, XCircle, Send, Trash2, AlertCircle, 
  Calendar, Users, FileText, Settings, ShieldAlert, Share2, Download, 
  Copy, Edit2, Check, Lock, RefreshCw, FileSpreadsheet, Search, Filter, 
  ArrowUpRight, ArrowDownRight, PieChart, Bell, Eye, ChevronRight, User, ShieldCheck, 
  Crown, KeyRound, Sparkles, HelpCircle, PhoneCall, QrCode, ArrowLeft,
  Clock, AlertTriangle, Layers, Building2, Printer, CheckSquare, X, Info, MessageCircle, Sliders
} from "lucide-react";
import { AppData, addLogAkses } from "../utils/dataStore";
import { KasItem, IuranItem, UserRole, AuthSession, AnggotaItem } from "../types";
import { verifikasiPINDinamis } from "../utils/auth";
import PINField from "./PINField";

interface KeuanganProps {
  appData: AppData;
  setAppData: React.Dispatch<React.SetStateAction<AppData>>;
  userRole: UserRole;
  session?: AuthSession;
  currentUserName?: string;
  showToast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
  onOpenAuthModal?: () => void;
  initialSubTab?: "kas-umum" | "kas-saya" | "rekap" | "approval" | "kelola";
}

// ==========================================
// KONSTANTA GLOBAL
// ==========================================
const KATEGORI_PEMASUKAN_PRESET = [
  "Iuran Anggota",
  "Donasi Warga",
  "Sumbangan Sponsor",
  "Hasil Kegiatan",
  "Sisa Kas Bulan Lalu",
  "Lain-lain Pemasukan",
];

const KATEGORI_PENGELUARAN_PRESET = [
  "Konsumsi Rapat",
  "Perlengkapan Kegiatan",
  "Transportasi & Kurir",
  "Hadiah Lomba",
  "Kas Sosial & Besuk",
  "Pemeliharaan Alat & Infastruktur",
  "Administrasi & Percetakan",
  "Lain-lain Pengeluaran",
];

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const KONTAK_BENDAHARA_WA = "6281234567890";
const NO_REKENING_BRI = "1234-01-005678-50-3";
const QRIS_EWALLET_NOMOR = "0812-3456-7890";
const MIN_NOMINAL_KAS = 500;

// ==========================================
// HELPER: Terbilang Rupiah
// ==========================================
function terbilangRupiah(nominal: number): string {
  if (nominal <= 0) return "Nol Rupiah";
  const satuan = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  function terbilang(n: number): string {
    if (n < 12) return satuan[n];
    if (n < 20) return terbilang(n - 10) + " Belas";
    if (n < 100) return terbilang(Math.floor(n / 10)) + " Puluh " + terbilang(n % 10);
    if (n < 200) return "Seratus " + terbilang(n - 100);
    if (n < 1000) return terbilang(Math.floor(n / 100)) + " Ratus " + terbilang(n % 100);
    if (n < 2000) return "Seribu " + terbilang(n - 1000);
    if (n < 1000000) return terbilang(Math.floor(n / 1000)) + " Ribu " + terbilang(n % 1000);
    if (n < 1000000000) return terbilang(Math.floor(n / 1000000)) + " Juta " + terbilang(n % 1000000);
    return n.toLocaleString("id-ID");
  }
  return terbilang(nominal).trim().replace(/\s+/g, " ") + " Rupiah";
}

// ==========================================
// HELPER: Ambil nilai nominal Kas
// ==========================================
function getKasNominal(item: Partial<KasItem>): number {
  if (item.Nominal !== undefined && item.Nominal !== null) return Number(item.Nominal);
  if (item.Pemasukan !== undefined && item.Pemasukan !== null && Number(item.Pemasukan) > 0) return Number(item.Pemasukan);
  if (item.Pengeluaran !== undefined && item.Pengeluaran !== null && Number(item.Pengeluaran) > 0) return Number(item.Pengeluaran);
  return 0;
}

// ==========================================
// HELPER: Generate ID unik untuk transaksi Kas
// ==========================================
function generateKasId(prefix: string = "KAS"): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${year}-${Date.now()}-${rand}`;
}

export default function Keuangan({
  appData,
  setAppData,
  userRole,
  session,
  currentUserName,
  showToast,
  onOpenAuthModal,
  initialSubTab
}: KeuanganProps) {
  const isGuest = userRole === "TAMU";
  const isAnggotaOrAbove = !isGuest;
  const isPengurusOrAbove = ["SEKRETARIS", "BENDAHARA", "PENGURUS", "KETUA", "ADMIN", "SUPER_ADMIN"].includes(userRole);
  const isKetuaOrAbove = ["KETUA", "ADMIN", "SUPER_ADMIN"].includes(userRole);
  const isSuperAdmin = userRole === "SUPER_ADMIN";

  // Available tabs
  const availableTabs = useMemo(() => {
    const tabs: { id: string; label: string; icon: React.ReactNode }[] = [
      { id: "kas-umum", label: "💵 Kas Umum", icon: <Wallet size={16} /> }
    ];
    if (isAnggotaOrAbove) {
      tabs.push({ id: "kas-saya", label: "💰 Kas Saya", icon: <User size={16} /> });
    }
    if (isPengurusOrAbove) {
      tabs.push({ id: "rekap", label: "📊 Rekap & Laporan", icon: <FileSpreadsheet size={16} /> });
    }
    if (isKetuaOrAbove) {
      tabs.push({ id: "approval", label: "✅ Approval", icon: <CheckSquare size={16} /> });
    }
    if (isSuperAdmin) {
      tabs.push({ id: "kelola", label: "⚙️ Kelola System", icon: <Settings size={16} /> });
    }
    return tabs;
  }, [isAnggotaOrAbove, isPengurusOrAbove, isKetuaOrAbove, isSuperAdmin]);

  // Active Tab State
  const defaultTab = initialSubTab && availableTabs.some(t => t.id === initialSubTab) 
    ? initialSubTab 
    : availableTabs[0].id;
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  // Raw Data
  const kasList = appData.Kas || [];
  const iuranList = appData.Iuran || [];
  const anggotaList = (appData.Anggota || []).filter(a => a.Status_Tampil !== "ARSIP" && a.Status_Aktif === "AKTIF");
  const logList = appData.LogAkses || [];

  // Member Identification for Kas Saya
  const hasValidSession = !!session?.id_anggota;
  const currentMemberId = session?.id_anggota || "RL03-001";
  const currentMemberObj = anggotaList.find(a => a.ID_Anggota === currentMemberId) || {
    ID_Anggota: currentMemberId,
    Nama_Lengkap: session?.nama_lengkap || "Anggota Remaja",
    Nama_Panggilan: session?.nama_panggilan || "Anggota",
    Jabatan: session?.jabatan || "ANGGOTA",
    Status_Aktif: "AKTIF"
  };

  // ==========================================
  // TAB 1: KAS UMUM STATES
  // ==========================================
  const [selectedKasJenis, setSelectedKasJenis] = useState<"SEMUA" | "PEMASUKAN" | "PENGELUARAN">("SEMUA");
  const [kasSearch, setKasSearch] = useState<string>("");
  const [showInputKasModal, setShowInputKasModal] = useState<boolean>(false);
  const [showDetailKasModal, setShowDetailKasModal] = useState<boolean>(false);
  const [activeKasDetail, setActiveKasDetail] = useState<KasItem | null>(null);

  // Delete Kas Modal State
  const [showDeleteKasModal, setShowDeleteKasModal] = useState<boolean>(false);
  const [kasToDelete, setKasToDelete] = useState<KasItem | null>(null);

  // Delete Iuran Modal State
  const [showDeleteIuranModal, setShowDeleteIuranModal] = useState<boolean>(false);
  const [iuranToDelete, setIuranToDelete] = useState<{
    memberName: string;
    memberId: string;
    month: string;
    year: string;
    iuranId?: string;
  } | null>(null);

  // Form Input Kas
  const [kasFormJenis, setKasFormJenis] = useState<"Pemasukan" | "Pengeluaran">("Pemasukan");
  const [kasFormKategori, setKasFormKategori] = useState<string>(KATEGORI_PEMASUKAN_PRESET[0]);
  const [kasFormNominal, setKasFormNominal] = useState<number>(50000);
  const [kasFormKeterangan, setKasFormKeterangan] = useState<string>("");
  const [kasFormTanggal, setKasFormTanggal] = useState<string>(new Date().toISOString().split("T")[0]);
  const [kasFormPetugas, setKasFormPetugas] = useState<string>(currentUserName || "Sekretaris");

  // Kas Calculations
  const totalKasPemasukan = kasList.reduce((acc, c) => acc + (c.Jenis === "Pemasukan" ? getKasNominal(c) : 0), 0);
  const totalKasPengeluaran = kasList.reduce((acc, c) => acc + (c.Jenis === "Pengeluaran" ? getKasNominal(c) : 0), 0);
  const saldoKas = totalKasPemasukan - totalKasPengeluaran;

  const filteredKas = useMemo(() => {
    return kasList.filter(item => {
      const matchJenis = selectedKasJenis === "SEMUA" || (item.Jenis || "").toUpperCase() === selectedKasJenis;
      const matchSearch = kasSearch === "" || 
        (item.Keterangan || "").toLowerCase().includes(kasSearch.toLowerCase()) || 
        (item.Kategori || "").toLowerCase().includes(kasSearch.toLowerCase()) ||
        (item.ID || "").toLowerCase().includes(kasSearch.toLowerCase());
      return matchJenis && matchSearch;
    }).reverse();
  }, [kasList, selectedKasJenis, kasSearch]);

  const resetKasForm = () => {
    setKasFormJenis("Pemasukan");
    setKasFormKategori(KATEGORI_PEMASUKAN_PRESET[0]);
    setKasFormNominal(50000);
    setKasFormKeterangan("");
    setKasFormTanggal(new Date().toISOString().split("T")[0]);
  };

  const handleSaveKas = (e: React.FormEvent) => {
    e.preventDefault();

    if (!kasFormNominal || kasFormNominal < MIN_NOMINAL_KAS) {
      showToast(`Nominal minimal Rp ${MIN_NOMINAL_KAS.toLocaleString("id-ID")}`, "warning");
      return;
    }
    if (!kasFormKeterangan.trim()) {
      showToast("Keterangan wajib diisi", "warning");
      return;
    }

    setAppData(prev => {
      const prevKasList = prev.Kas || [];
      const prevSaldo = prevKasList.reduce((acc, c) => {
        const nominal = getKasNominal(c);
        return acc + (c.Jenis === "Pemasukan" ? nominal : -nominal);
      }, 0);

      const newId = generateKasId("KAS");
      const newItem: KasItem = {
        ID: newId,
        Tanggal: kasFormTanggal,
        Jenis: kasFormJenis,
        Kategori: kasFormKategori,
        Keterangan: kasFormKeterangan,
        Nominal: kasFormNominal,
        Pemasukan: kasFormJenis === "Pemasukan" ? kasFormNominal : 0,
        Pengeluaran: kasFormJenis === "Pengeluaran" ? kasFormNominal : 0,
        Saldo: prevSaldo + (kasFormJenis === "Pemasukan" ? kasFormNominal : -kasFormNominal),
        Petugas: kasFormPetugas,
        Status: "DISETUJUI"
      };

      return addLogAkses(
        { ...prev, Kas: [...prevKasList, newItem] },
        currentUserName || "Pengurus",
        userRole,
        "INPUT_KAS",
        `Input ${kasFormJenis} Rp ${kasFormNominal.toLocaleString("id-ID")}`
      );
    });

    setShowInputKasModal(false);
    resetKasForm();
    showToast(`Berhasil mencatat ${kasFormJenis} Rp ${kasFormNominal.toLocaleString("id-ID")}`, "success");
  };

  // ==========================================
  // HANDLERS HAPUS TRANSAKSI (KHUSUS PENGURUS)
  // ==========================================
  const handleDeleteKas = (targetItem: KasItem) => {
    if (!targetItem) return;

    setAppData(prev => {
      const prevKasList = prev.Kas || [];
      const updatedKasList = prevKasList.filter(k => k.ID !== targetItem.ID);
      const nominalValue = getKasNominal(targetItem);

      return addLogAkses(
        { ...prev, Kas: updatedKasList },
        currentUserName || "Pengurus",
        userRole,
        "HAPUS_KAS",
        `Hapus transaksi kas (${targetItem.ID}) ${targetItem.Jenis} ${targetItem.Kategori}: Rp ${nominalValue.toLocaleString("id-ID")}`
      );
    });

    setShowDeleteKasModal(false);
    setShowDetailKasModal(false);
    setKasToDelete(null);
    setActiveKasDetail(null);
    showToast(`Transaksi ${targetItem.ID} berhasil dihapus.`, "success");
  };

  const handleDeleteIuran = (memberId: string, month: string, year: string) => {
    setAppData(prev => {
      const prevIuranList = prev.Iuran || [];
      const updatedIuranList = prevIuranList.filter(i => 
        !(i.ID_Anggota === memberId && i.Bulan === month && String(i.Tahun) === String(year))
      );

      return addLogAkses(
        { ...prev, Iuran: updatedIuranList },
        currentUserName || "Pengurus",
        userRole,
        "HAPUS_IURAN",
        `Batalkan / hapus catatan iuran anggota ${memberId} bulan ${month} ${year}`
      );
    });

    setShowDeleteIuranModal(false);
    setIuranToDelete(null);
    showToast(`Catatan iuran bulan ${month} ${year} berhasil dibatalkan.`, "success");
  };

  // ==========================================
  // TAB 2: KAS SAYA STATES
  // ==========================================
  const nowDate = new Date();
  const currentYearActual = nowDate.getFullYear().toString();
  const currentMonthIdx = nowDate.getMonth();
  const currentMonthName = MONTHS[currentMonthIdx];

  const [selectedSayaTahun, setSelectedSayaTahun] = useState<string>(currentYearActual);
  const [selectedMonthModal, setSelectedMonthModal] = useState<number | null>(null);

  const myIuranList = useMemo(() => {
    return iuranList.filter(i => i.ID_Anggota === currentMemberId && String(i.Tahun) === selectedSayaTahun);
  }, [iuranList, currentMemberId, selectedSayaTahun]);

  const myTotalPaidYear = myIuranList
    .filter(i => i.Status === "LUNAS")
    .reduce((a, c) => a + Number(c.Jumlah || 10000), 0);

  const myTotalTunggakanYear = myIuranList
    .filter(i => i.Status === "BELUM_BAYAR")
    .reduce((a, c) => a + Number(c.Jumlah || 10000), 0);

  const currentMonthIuranObj = myIuranList.find(i => i.Bulan === currentMonthName && selectedSayaTahun === currentYearActual);

  const getMonthStatus = (monthName: string) => {
    const found = myIuranList.find(i => i.Bulan === monthName);
    if (found) return found.Status;

    const selectedYearNum = parseInt(selectedSayaTahun, 10);
    const actualYearNum = nowDate.getFullYear();

    if (selectedYearNum < actualYearNum) {
      return "BELUM_BAYAR";
    }
    if (selectedYearNum > actualYearNum) {
      return "BELUM_WAKTUNYA";
    }

    const monthIdx = MONTHS.indexOf(monthName);
    if (monthIdx <= currentMonthIdx) return "BELUM_BAYAR";
    return "BELUM_WAKTUNYA";
  };

  // ==========================================
  // TAB 3: REKAP STATES
  // ==========================================
  const [selectedRekapTahun, setSelectedRekapTahun] = useState<string>(currentYearActual);
  const [selectedRekapBulanIdx, setSelectedRekapBulanIdx] = useState<number>(currentMonthIdx);
  const [rekapSearch, setRekapSearch] = useState<string>("");
  const [rekapStatusFilter, setRekapStatusFilter] = useState<string>("SEMUA");

  const selectedRekapBulanName = MONTHS[selectedRekapBulanIdx];

  // Modals
  const [showCatatIuranModal, setShowCatatIuranModal] = useState<boolean>(false);
  const [showReminderMassalModal, setShowReminderMassalModal] = useState<boolean>(false);

  // Catat Iuran Form
  const [catatMemberId, setCatatMemberId] = useState<string>("");
  const [catatBulanIdx, setCatatBulanIdx] = useState<number>(selectedRekapBulanIdx);
  const [catatTahun, setCatatTahun] = useState<string>(currentYearActual);
  const [catatNominal, setCatatNominal] = useState<number>(appData.Settings?.Nominal_Iuran || 10000);
  const [catatTanggal, setCatatTanggal] = useState<string>(new Date().toISOString().split("T")[0]);
  const [catatMetode, setCatatMetode] = useState<"Tunai" | "Transfer" | "QRIS">("Tunai");
  const [catatStatus, setCatatStatus] = useState<"LUNAS" | "CICIL" | "DIBEBASKAN">("LUNAS");
  const [catatNotes, setCatatNotes] = useState<string>("");

  // Mass Reminder Template
  const [reminderTemplate, setReminderTemplate] = useState<string>(
    "Halo [Nama]! Pengingat iuran [Bulan] [Tahun] Remaja Legok 03. Nominal: Rp [Jumlah]. Mohon segera dibayar ke Sekretaris/Bendahara. Terima kasih 🙏"
  );

  const memberMonthStatusList = useMemo(() => {
    return anggotaList.map(a => {
      const iuranObj = iuranList.find(i => i.ID_Anggota === a.ID_Anggota && i.Bulan === selectedRekapBulanName && String(i.Tahun) === selectedRekapTahun);
      const defaultIuran: IuranItem = {
        ID: `IUR-PENDING-${a.ID_Anggota}`,
        ID_Anggota: a.ID_Anggota,
        Nama_Anggota: a.Nama_Lengkap,
        Bulan: selectedRekapBulanName,
        Tahun: selectedRekapTahun,
        Jumlah: appData.Settings?.Nominal_Iuran || 10000,
        Status: "BELUM_BAYAR"
      };
      return {
        member: a,
        iuran: iuranObj || defaultIuran
      };
    });
  }, [anggotaList, iuranList, selectedRekapBulanName, selectedRekapTahun, appData.Settings]);

  const filteredRekapList = useMemo(() => {
    return memberMonthStatusList.filter(item => {
      const matchStatus = rekapStatusFilter === "SEMUA" || item.iuran.Status === rekapStatusFilter;
      const matchSearch = rekapSearch === "" || 
        item.member.Nama_Lengkap.toLowerCase().includes(rekapSearch.toLowerCase()) ||
        item.member.ID_Anggota.toLowerCase().includes(rekapSearch.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [memberMonthStatusList, rekapStatusFilter, rekapSearch]);

  const totalMembersCount = anggotaList.length;
  const lunasCount = memberMonthStatusList.filter(m => m.iuran.Status === "LUNAS").length;
  const belumBayarCount = memberMonthStatusList.filter(m => m.iuran.Status === "BELUM_BAYAR").length;
  const complianceRate = totalMembersCount > 0 ? Math.round((lunasCount / totalMembersCount) * 100) : 0;
  const totalCollectedMonth = memberMonthStatusList
    .filter(m => m.iuran.Status === "LUNAS")
    .reduce((a, c) => a + Number(c.iuran.Jumlah || 10000), 0);

  const resetCatatIuranForm = () => {
    setCatatMemberId("");
    setCatatBulanIdx(selectedRekapBulanIdx);
    setCatatTahun(currentYearActual);
    setCatatNominal(appData.Settings?.Nominal_Iuran || 10000);
    setCatatTanggal(new Date().toISOString().split("T")[0]);
    setCatatMetode("Tunai");
    setCatatStatus("LUNAS");
    setCatatNotes("");
  };

  const handleSaveIuranPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catatMemberId) {
      showToast("Pilih anggota terlebih dahulu", "warning");
      return;
    }
    if (catatStatus !== "DIBEBASKAN" && (!catatNominal || catatNominal <= 0)) {
      showToast("Nominal iuran tidak valid", "warning");
      return;
    }

    const targetMember = anggotaList.find(a => a.ID_Anggota === catatMemberId);
    const targetBulanName = MONTHS[catatBulanIdx];
    const newIuranId = `IUR-${catatTahun}-${String(catatBulanIdx + 1).padStart(2, "0")}-${catatMemberId}`;

    setAppData(prev => {
      const prevIuranList = prev.Iuran || [];
      const prevKasList = prev.Kas || [];

      const cleanList = prevIuranList.filter(i => !(i.ID_Anggota === catatMemberId && i.Bulan === targetBulanName && String(i.Tahun) === catatTahun));

      const newIuranItem: IuranItem = {
        ID: newIuranId,
        ID_Anggota: catatMemberId,
        Nama_Anggota: targetMember?.Nama_Lengkap || "Anggota",
        Bulan: targetBulanName,
        Tahun: catatTahun,
        Jumlah: catatNominal,
        Tanggal_Bayar: catatTanggal,
        Metode_Bayar: catatMetode,
        Status: catatStatus,
        Penerima: currentUserName || "Sekretaris",
        Catatan: catatNotes || undefined
      };

      const shouldAddToKas = catatStatus === "LUNAS" || catatStatus === "CICIL";
      let updatedKasList = prevKasList;

      if (shouldAddToKas) {
        const prevSaldo = prevKasList.reduce((acc, c) => {
          const nominal = getKasNominal(c);
          return acc + (c.Jenis === "Pemasukan" ? nominal : -nominal);
        }, 0);

        const newKasItem: KasItem = {
          ID: generateKasId("KAS-IURAN"),
          Tanggal: catatTanggal,
          Jenis: "Pemasukan",
          Kategori: "Iuran Anggota",
          Keterangan: `Iuran ${targetBulanName} ${catatTahun} - ${targetMember?.Nama_Lengkap}`,
          Nominal: catatNominal,
          Pemasukan: catatNominal,
          Pengeluaran: 0,
          Saldo: prevSaldo + catatNominal,
          Petugas: currentUserName || "Sekretaris",
          Status: "DISETUJUI"
        };
        updatedKasList = [...prevKasList, newKasItem];
      }

      return addLogAkses(
        {
          ...prev,
          Iuran: [...cleanList, newIuranItem],
          Kas: updatedKasList
        },
        currentUserName || "Pengurus",
        userRole,
        "CATAT_IURAN",
        `Catat iuran ${targetMember?.Nama_Lengkap} (${targetBulanName}) - Status: ${catatStatus} Rp ${catatNominal.toLocaleString("id-ID")}`
      );
    });

    setShowCatatIuranModal(false);
    resetCatatIuranForm();
    showToast(`Berhasil mencatat iuran ${targetMember?.Nama_Lengkap}!`, "success");
  };

  // ==========================================
  // TAB 4: APPROVAL STATES
  // ==========================================
  const pendingApprovals = useMemo(() => {
    return [
      {
        id: "APP-001",
        jenis: "Pengeluaran Kas Besar",
        pengaju: "Sekretaris (Budi)",
        nominal: 750000,
        keterangan: "Sewa sound system Pesta Lomba 17-an",
        tanggal: "2026-07-20",
        status: "MENUNGGU" as "MENUNGGU" | "DISETUJUI" | "DITOLAK"
      },
      {
        id: "APP-002",
        jenis: "Pembebasan Iuran",
        pengaju: "Seksi Sosial",
        nominal: 10000,
        keterangan: "Bebas iuran anggota studi lanjut luar kota (RL03-012)",
        tanggal: "2026-07-18",
        status: "MENUNGGU" as "MENUNGGU" | "DISETUJUI" | "DITOLAK"
      }
    ];
  }, []);

  const [approvalList, setApprovalList] = useState(pendingApprovals);

  const handleApprove = (id: string, isAccept: boolean) => {
    const target = approvalList.find(a => a.id === id);
    setApprovalList(prev => prev.map(a => a.id === id ? { ...a, status: isAccept ? "DISETUJUI" : "DITOLAK" } : a));

    if (target) {
      setAppData(prev => addLogAkses(
        prev,
        currentUserName || "Ketua",
        userRole,
        isAccept ? "APPROVE_TRANSAKSI" : "REJECT_TRANSAKSI",
        `${isAccept ? "Menyetujui" : "Menolak"} ${target.jenis} - ${target.keterangan} (Rp ${target.nominal.toLocaleString("id-ID")})`
      ));
    }

    showToast(isAccept ? "Pengajuan berhasil disetujui!" : "Pengajuan ditolak.", isAccept ? "success" : "info");
  };

  // ==========================================
  // TAB 5: KELOLA SYSTEM (SUPER ADMIN)
  // ==========================================
  const [sysNominal, setSysNominal] = useState<number>(appData.Settings?.Nominal_Iuran || 10000);
  const [sysJatuhTempo, setSysJatuhTempo] = useState<number>(appData.Settings?.Jatuh_Tempo_Iuran || 10);
  const [sysApprovalLimit, setSysApprovalLimit] = useState<number>(500000);

  // SA PIN Deletion Modal
  const [showSaPinModal, setShowSaPinModal] = useState<boolean>(false);
  const [saPinInput, setSaPinInput] = useState<string>("");
  const [pendingSaAction, setPendingSaAction] = useState<(() => void) | null>(null);
  const [saPinError, setSaPinError] = useState<string>("");

  const handleSaveSysSettings = (e: React.FormEvent) => {
    e.preventDefault();

    if (sysNominal <= 0) {
      showToast("Nominal iuran harus lebih dari 0", "warning");
      return;
    }
    if (sysJatuhTempo < 1 || sysJatuhTempo > 28) {
      showToast("Tanggal jatuh tempo harus antara 1-28", "warning");
      return;
    }

    setPendingSaAction(() => () => {
      setAppData(prev => addLogAkses(
        {
          ...prev,
          Settings: {
            ...prev.Settings,
            Nominal_Iuran: sysNominal,
            Jatuh_Tempo_Iuran: sysJatuhTempo
          }
        },
        currentUserName || "Super Admin",
        userRole,
        "UPDATE_SETTINGS_KEUANGAN",
        `Update nominal iuran Rp ${sysNominal.toLocaleString("id-ID")}, jatuh tempo tgl ${sysJatuhTempo}`
      ));
    });
    setShowSaPinModal(true);
  };

  const executeSaAction = () => {
    if (verifikasiPINDinamis(saPinInput)) {
      if (pendingSaAction) pendingSaAction();
      setShowSaPinModal(false);
      setSaPinInput("");
      setSaPinError("");
      setPendingSaAction(null);
      showToast("Tindakan Super Admin berhasil dijalankan", "success");
    } else {
      setSaPinError("PIN Super Admin tidak valid!");
      showToast("PIN Super Admin tidak valid!", "error");
    }
  };

  const closeSaPinModal = () => {
    setShowSaPinModal(false);
    setSaPinInput("");
    setSaPinError("");
    setPendingSaAction(null);
  };

  // Month Detail Data Modal
  const monthDetailData = useMemo(() => {
    if (selectedMonthModal === null) return null;
    const mName = MONTHS[selectedMonthModal];
    const found = myIuranList.find(i => i.Bulan === mName);
    const status = getMonthStatus(mName);
    return { monthName: mName, iuran: found, status };
  }, [selectedMonthModal, myIuranList, selectedSayaTahun]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      
      {/* Header Halaman Keuangan Terpadu */}
      <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-none flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Wallet className="text-emerald-600" size={26} />
              Keuangan Remaja Legok 03
            </h1>
            {userRole === "SUPER_ADMIN" && <span className="px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-[10px] font-black">🔴 SuperAdmin</span>}
            {(userRole === "KETUA" || userRole === "ADMIN") && <span className="px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-200 rounded-full text-[10px] font-bold">👑 Ketua</span>}
            {userRole === "SEKRETARIS" && <span className="px-2.5 py-1 bg-yellow-100 text-yellow-900 border border-yellow-300 rounded-full text-[10px] font-bold">📝 Sekretaris</span>}
            {userRole === "BENDAHARA" && <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-[10px] font-bold">💰 Bendahara</span>}
            {userRole === "PENGURUS" && <span className="px-2.5 py-1 bg-purple-100 text-purple-800 border border-purple-200 rounded-full text-[10px] font-bold">⚡ Pengurus</span>}
            {userRole === "ANGGOTA" && <span className="px-2.5 py-1 bg-blue-100 text-blue-800 border border-blue-200 rounded-full text-[10px] font-bold">👥 Anggota</span>}
            {userRole === "TAMU" && <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-full text-[10px] font-bold">👤 Tamu</span>}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isGuest && "Transparansi Pemasukan & Pengeluaran Kas Umum Remaja RT 03 Denokan"}
            {userRole === "ANGGOTA" && "Kelola Kas Umum & Catatan Iuran Pribadi Anda"}
            {isPengurusOrAbove && !isKetuaOrAbove && !isSuperAdmin && "Kelola Kas Organisasi & Rekap Pembayaran Iuran Anggota"}
            {isKetuaOrAbove && !isSuperAdmin && "Monitor Performa Keuangan & Persetujuan Transaksi Organisasi"}
            {isSuperAdmin && "Pusat Kontrol Sistem Keuangan, Audit Trail & Konfigurasi Master"}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          {isGuest && onOpenAuthModal && (
            <button
              onClick={onOpenAuthModal}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm dark:shadow-none flex items-center gap-1.5"
            >
              <KeyRound size={14} />
              <span>Masuk dengan ID</span>
            </button>
          )}

          {isPengurusOrAbove && (
            <button
              onClick={() => setShowInputKasModal(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm dark:shadow-none flex items-center gap-1.5"
            >
              <Plus size={15} />
              <span>+ Input Transaksi</span>
            </button>
          )}

          {isPengurusOrAbove && (
            <button
              onClick={() => setShowCatatIuranModal(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm dark:shadow-none flex items-center gap-1.5"
            >
              <DollarSign size={15} />
              <span>Catat Iuran</span>
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Tab Navigation Bar */}
      <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl flex overflow-x-auto hide-scrollbar gap-1 border border-slate-200 dark:border-slate-800/70">
        {availableTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all flex-1 ${
                isActive 
                  ? "bg-white dark:bg-slate-900 text-emerald-700 shadow-sm dark:shadow-none border border-slate-200 dark:border-slate-800" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700/50"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: KAS UMUM */}
      {/* ========================================================================= */}
      {activeTab === "kas-umum" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 rounded-3xl shadow-md dark:shadow-none relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-10 text-white pointer-events-none">
                <Wallet size={120} />
              </div>
              <p className="text-xs font-bold text-emerald-100 uppercase tracking-wider">Saldo Kas Organisasi</p>
              <h2 className="text-2xl md:text-3xl font-black mt-1">Rp {saldoKas.toLocaleString("id-ID")}</h2>
              <p className="text-[11px] text-emerald-200/90 mt-2 flex items-center gap-1">
                <CheckCircle2 size={13} /> Update Realtime Kas Remaja
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-none">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Total Pemasukan</span>
                <span className="p-2 bg-emerald-100 text-emerald-700 rounded-xl"><ArrowUpRight size={18} /></span>
              </div>
              <h3 className="text-xl font-black text-emerald-700 mt-2">Rp {totalKasPemasukan.toLocaleString("id-ID")}</h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Akumulasi iuran & donasi</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-none">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Total Pengeluaran</span>
                <span className="p-2 bg-rose-100 text-rose-700 rounded-xl"><ArrowDownRight size={18} /></span>
              </div>
              <h3 className="text-xl font-black text-rose-700 mt-2">Rp {totalKasPengeluaran.toLocaleString("id-ID")}</h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Penggunaan operasional kegiatan</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-none flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <button
                onClick={() => setSelectedKasJenis("SEMUA")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedKasJenis === "SEMUA" ? "bg-slate-900 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setSelectedKasJenis("PEMASUKAN")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedKasJenis === "PEMASUKAN" ? "bg-emerald-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Pemasukan
              </button>
              <button
                onClick={() => setSelectedKasJenis("PENGELUARAN")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedKasJenis === "PENGELUARAN" ? "bg-rose-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Pengeluaran
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={kasSearch}
                onChange={(e) => setKasSearch(e.target.value)}
                placeholder="Cari transaksi kas..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-none overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">Riwayat Transaksi Kas Umum</h3>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">{filteredKas.length} Transaksi</span>
            </div>

            {filteredKas.length === 0 ? (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                Tidak ada transaksi kas sesuai filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800/70 uppercase">
                      <th className="p-3.5 pl-4">ID / Tanggal</th>
                      <th className="p-3.5">Kategori & Keterangan</th>
                      <th className="p-3.5">Jenis</th>
                      <th className="p-3.5 text-right">Nominal</th>
                      <th className="p-3.5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {filteredKas.map((item, index) => {
                      const isPemasukan = item.Jenis === "Pemasukan";
                      const nominalValue = getKasNominal(item);
                      return (
                        <tr key={item.ID || `kas-idx-${index}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5 pl-4">
                            <div className="font-bold font-mono text-slate-800 dark:text-slate-200">{item.ID}</div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500">{item.Tanggal}</div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900 dark:text-slate-100">{item.Kategori}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{item.Keterangan}</div>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              isPemasukan 
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                                : "bg-rose-100 text-rose-800 border border-rose-200"
                            }`}>
                              {item.Jenis}
                            </span>
                          </td>
                          <td className={`p-3.5 text-right font-black ${isPemasukan ? "text-emerald-700" : "text-rose-700"}`}>
                            {isPemasukan ? "+" : "-"} Rp {nominalValue.toLocaleString("id-ID")}
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => { setActiveKasDetail(item); setShowDetailKasModal(true); }}
                                className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-all"
                                title="Detail Kuitansi"
                              >
                                <Eye size={14} />
                              </button>
                              {isPengurusOrAbove && (
                                <button
                                  onClick={() => { setKasToDelete(item); setShowDeleteKasModal(true); }}
                                  className="p-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 rounded-lg text-xs font-bold transition-all"
                                  title="Hapus Transaksi Kas"
                                >
                                  <Trash2 size={14} />
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
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: KAS SAYA */}
      {/* ========================================================================= */}
      {activeTab === "kas-saya" && (
        <div className="space-y-6 animate-in fade-in duration-200">

          {!hasValidSession && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2 text-amber-900 text-xs">
              <AlertTriangle size={16} className="shrink-0" />
              <span>Sesi login tidak terdeteksi. Menampilkan data contoh (demo). Silakan login untuk melihat data iuran pribadi Anda yang sebenarnya.</span>
            </div>
          )}
          
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-6 rounded-3xl shadow-lg dark:shadow-none border border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center text-xl font-black shadow-md dark:shadow-none shrink-0">
                  {currentMemberObj.Nama_Lengkap.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-white">{currentMemberObj.Nama_Lengkap}</h2>
                    <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 rounded-md text-[10px] font-bold">
                      {currentMemberObj.Status_Aktif}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono mt-0.5">ID Anggota: {currentMemberObj.ID_Anggota}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-white/5 p-3.5 rounded-2xl border border-white/10">
                <div className="text-center px-4 border-r border-white/10">
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Total Dibayar {selectedSayaTahun}</div>
                  <div className="text-sm font-black text-emerald-400 mt-0.5">Rp {myTotalPaidYear.toLocaleString("id-ID")}</div>
                </div>
                <div className="text-center px-4">
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Tunggakan {selectedSayaTahun}</div>
                  <div className="text-sm font-black text-rose-400 mt-0.5">Rp {myTotalTunggakanYear.toLocaleString("id-ID")}</div>
                </div>
              </div>

            </div>
          </div>

          <div className={`p-5 rounded-3xl border shadow-sm dark:shadow-none ${
            currentMonthIuranObj?.Status === "LUNAS" 
              ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
              : "bg-amber-50 border-amber-200 text-amber-900"
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {currentMonthIuranObj?.Status === "LUNAS" ? (
                    <CheckCircle2 size={18} className="text-emerald-600" />
                  ) : (
                    <AlertCircle size={18} className="text-amber-600" />
                  )}
                  <h3 className="font-extrabold text-sm">
                    Status Iuran Bulan {currentMonthName} {currentYearActual}: {currentMonthIuranObj?.Status === "LUNAS" ? "✅ SUDAH LUNAS" : "⏳ BELUM DIBAYAR"}
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {currentMonthIuranObj?.Status === "LUNAS" 
                    ? `Diterima pada ${currentMonthIuranObj.Tanggal_Bayar || "-"} (Metode: ${currentMonthIuranObj.Metode_Bayar || "Tunai"})`
                    : `Jatuh tempo setiap tanggal ${appData.Settings?.Jatuh_Tempo_Iuran || 10}. Nominal wajib Rp ${appData.Settings?.Nominal_Iuran?.toLocaleString("id-ID") || "10.000"}/bulan.`
                  }
                </p>
              </div>

              <a 
                href={`https://wa.me/${KONTAK_BENDAHARA_WA}?text=Halo%20Bendahara%20Remaja,%20saya%20ingin%20membayar%20iuran`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm dark:shadow-none flex items-center justify-center gap-1.5 self-start sm:self-center"
              >
                <MessageCircle size={14} />
                <span>Bayar via WhatsApp Bendahara</span>
              </a>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-none space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">Matriks Iuran 12 Bulan ({selectedSayaTahun})</h3>
              <select
                value={selectedSayaTahun}
                onChange={(e) => setSelectedSayaTahun(e.target.value)}
                className="px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold"
              >
                <option value={currentYearActual}>Tahun {currentYearActual}</option>
                <option value={(parseInt(currentYearActual) - 1).toString()}>Tahun {parseInt(currentYearActual) - 1}</option>
              </select>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {MONTHS.map((mName, idx) => {
                const st = getMonthStatus(mName);
                return (
                  <div
                    key={mName}
                    onClick={() => setSelectedMonthModal(idx)}
                    className={`p-3.5 rounded-2xl border text-center cursor-pointer transition-all hover:scale-[1.02] shadow-sm dark:shadow-none ${
                      st === "LUNAS" ? "bg-emerald-50 border-emerald-200 text-emerald-900" :
                      st === "BELUM_BAYAR" ? "bg-rose-50 border-rose-200 text-rose-900" :
                      st === "CICIL" ? "bg-amber-50 border-amber-200 text-amber-900" :
                      "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    <div className="text-[11px] font-extrabold uppercase">{mName.substring(0, 3)}</div>
                    <div className="my-1 text-center flex justify-center">
                      {st === "LUNAS" && <CheckCircle2 size={18} className="text-emerald-600" />}
                      {st === "BELUM_BAYAR" && <XCircle size={18} className="text-rose-600" />}
                      {st === "CICIL" && <Clock size={18} className="text-amber-600" />}
                      {st === "BELUM_WAKTUNYA" && <Clock size={18} className="text-slate-300" />}
                    </div>
                    <div className="text-[10px] font-bold">
                      {st === "LUNAS" ? "LUNAS" : st === "BELUM_BAYAR" ? "BELUM" : st === "CICIL" ? "CICIL" : "NANTI"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-none space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
              <QrCode size={18} className="text-emerald-600" />
              Info & Cara Pembayaran Iuran
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800/70 space-y-1">
                <div className="font-bold text-slate-800 dark:text-slate-200">💵 Tunai Langsung</div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">Bayar tunai ke Sekretaris atau Bendahara saat rapat rutin.</p>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800/70 space-y-1">
                <div className="font-bold text-slate-800 dark:text-slate-200">🏦 Transfer Bank BRI</div>
                <p className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">No. Rek: {NO_REKENING_BRI} a.n. Remaja Legok 03</p>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800/70 space-y-1">
                <div className="font-bold text-slate-800 dark:text-slate-200">📱 QRIS / E-Wallet</div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">Scan QRIS di posko remaja atau via GoPay/DANA {QRIS_EWALLET_NOMOR}.</p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: REKAP & LAPORAN */}
      {/* ========================================================================= */}
      {activeTab === "rekap" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-none">
              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Anggota Aktif</div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{totalMembersCount}</div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Terdaftar sistem</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-none">
              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Sudah Lunas ({selectedRekapBulanName})</div>
              <div className="text-2xl font-black text-emerald-700 mt-1">{lunasCount} Orang</div>
              <p className="text-[10px] text-emerald-600 font-bold mt-0.5">{complianceRate}% Kepatuhan</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-none">
              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Belum Bayar</div>
              <div className="text-2xl font-black text-rose-700 mt-1">{belumBayarCount} Orang</div>
              <p className="text-[10px] text-rose-600 font-bold mt-0.5">Perlu diajukan reminder</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-none">
              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Terkumpul Bulan Ini</div>
              <div className="text-2xl font-black text-blue-700 mt-1">Rp {totalCollectedMonth.toLocaleString("id-ID")}</div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Masuk ke Kas</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-none space-y-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">Pilih Bulan & Tahun Rekap:</span>
              <select
                value={selectedRekapTahun}
                onChange={(e) => setSelectedRekapTahun(e.target.value)}
                className="px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold"
              >
                <option value={currentYearActual}>{currentYearActual}</option>
                <option value={(parseInt(currentYearActual) - 1).toString()}>{parseInt(currentYearActual) - 1}</option>
              </select>
            </div>

            <div className="flex overflow-x-auto hide-scrollbar gap-1.5 pb-1">
              {MONTHS.map((m, idx) => (
                <button
                  key={m}
                  onClick={() => setSelectedRekapBulanIdx(idx)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    selectedRekapBulanIdx === idx 
                      ? "bg-amber-400 text-slate-950 shadow-sm dark:shadow-none" 
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {m.substring(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-none flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <button
                onClick={() => setRekapStatusFilter("SEMUA")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  rekapStatusFilter === "SEMUA" ? "bg-slate-900 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Semua ({filteredRekapList.length})
              </button>
              <button
                onClick={() => setRekapStatusFilter("LUNAS")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  rekapStatusFilter === "LUNAS" ? "bg-emerald-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Lunas ({lunasCount})
              </button>
              <button
                onClick={() => setRekapStatusFilter("BELUM_BAYAR")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  rekapStatusFilter === "BELUM_BAYAR" ? "bg-rose-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Belum Bayar ({belumBayarCount})
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={rekapSearch}
                onChange={(e) => setRekapSearch(e.target.value)}
                placeholder="Cari nama anggota..."
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-emerald-500 w-full sm:w-48"
              />
              <button
                onClick={() => setShowReminderMassalModal(true)}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-all shrink-0 flex items-center gap-1"
              >
                <Bell size={13} />
                <span>Reminder WA</span>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-none overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                Rekap Pembayaran Iuran Bulan {selectedRekapBulanName} {selectedRekapTahun}
              </h3>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">Total {filteredRekapList.length} Anggota</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800/70 uppercase">
                    <th className="p-3.5 pl-4">ID & Nama Anggota</th>
                    <th className="p-3.5">Bulan</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Tgl Bayar</th>
                    <th className="p-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredRekapList.map(({ member, iuran }) => {
                    const isLunas = iuran.Status === "LUNAS";
                    return (
                      <tr key={member.ID_Anggota} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 pl-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{member.Nama_Lengkap}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{member.ID_Anggota}</div>
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-400 font-medium">
                          {selectedRekapBulanName} {selectedRekapTahun}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            isLunas 
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                              : "bg-rose-100 text-rose-800 border border-rose-200"
                          }`}>
                            {isLunas ? "LUNAS" : "BELUM BAYAR"}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                          {iuran.Tanggal_Bayar || "-"}
                        </td>
                        <td className="p-3.5 text-center flex items-center justify-center gap-1.5">
                          {!isLunas ? (
                            <>
                              <button
                                onClick={() => {
                                  setCatatMemberId(member.ID_Anggota);
                                  setCatatBulanIdx(selectedRekapBulanIdx);
                                  setCatatTahun(selectedRekapTahun);
                                  setShowCatatIuranModal(true);
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition-all shadow-sm dark:shadow-none"
                              >
                                Catat Bayar
                              </button>
                              <a
                                href={`https://wa.me/?text=${encodeURIComponent(`Halo ${member.Nama_Lengkap}, pengingat iuran ${selectedRekapBulanName} ${selectedRekapTahun} sebesar Rp ${(appData.Settings?.Nominal_Iuran || 10000).toLocaleString("id-ID")}.`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-xs font-bold transition-all"
                                title="Kirim Reminder WA"
                              >
                                <MessageCircle size={13} />
                              </a>
                            </>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Terverifikasi ✅</span>
                              {isPengurusOrAbove && (
                                <button
                                  onClick={() => {
                                    setIuranToDelete({
                                      memberName: member.Nama_Lengkap,
                                      memberId: member.ID_Anggota,
                                      month: selectedRekapBulanName,
                                      year: selectedRekapTahun,
                                      iuranId: iuran.ID
                                    });
                                    setShowDeleteIuranModal(true);
                                  }}
                                  className="p-1 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 rounded-lg text-xs font-bold transition-all"
                                  title="Batalkan / Hapus Pembayaran"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: APPROVAL */}
      {/* ========================================================================= */}
      {activeTab === "approval" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-rose-50 border border-rose-200 p-5 rounded-3xl space-y-2">
            <h3 className="font-black text-rose-900 text-sm flex items-center gap-2">
              <CheckSquare size={18} className="text-rose-600" />
              Persetujuan Transaksi & Kebijakan Keuangan (Ketua)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Setiap transaksi kas pengeluaran di atas Rp {sysApprovalLimit.toLocaleString("id-ID")} atau pembebasan iuran memerlukan verifikasi persetujuan Ketua Remaja.
            </p>
          </div>

          <div className="space-y-3">
            {approvalList.map(item => (
              <div key={item.id} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-none flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-extrabold text-slate-400 dark:text-slate-500">{item.id}</span>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-bold rounded-md">{item.jenis}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{item.keterangan}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Diajukan oleh: <span className="font-bold text-slate-700 dark:text-slate-300">{item.pengaju}</span> • Tanggal: {item.tanggal}
                  </p>
                  <p className="text-sm font-black text-rose-700">Nominal: Rp {item.nominal.toLocaleString("id-ID")}</p>
                </div>

                <div className="flex items-center gap-2 self-start md:self-center">
                  {item.status === "MENUNGGU" ? (
                    <>
                      <button
                        onClick={() => handleApprove(item.id, true)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm dark:shadow-none flex items-center gap-1"
                      >
                        <Check size={14} /> Setujui
                      </button>
                      <button
                        onClick={() => handleApprove(item.id, false)}
                        className="px-4 py-2 bg-slate-200 hover:bg-rose-100 text-slate-700 dark:text-slate-300 hover:text-rose-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1"
                      >
                        <X size={14} /> Tolak
                      </button>
                    </>
                  ) : (
                    <span className={`px-3 py-1 rounded-xl text-xs font-extrabold ${
                      item.status === "DISETUJUI" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                    }`}>
                      {item.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: KELOLA SYSTEM */}
      {/* ========================================================================= */}
      {activeTab === "kelola" && isSuperAdmin && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 space-y-4 shadow-lg dark:shadow-none">
            <h3 className="font-black text-amber-400 text-base flex items-center gap-2">
              <Settings size={20} />
              Konfigurasi Parameter Keuangan System
            </h3>

            <form onSubmit={handleSaveSysSettings} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Nominal Iuran Standard (Rp)</label>
                  <input
                    type="number"
                    value={sysNominal}
                    onChange={(e) => setSysNominal(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Tanggal Jatuh Tempo (Tiap Bulan)</label>
                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={sysJatuhTempo}
                    onChange={(e) => setSysJatuhTempo(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Batas Approval Transaksi (Rp)</label>
                  <input
                    type="number"
                    value={sysApprovalLimit}
                    onChange={(e) => setSysApprovalLimit(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-xl transition-all shadow-md dark:shadow-none flex items-center gap-1.5"
              >
                <Lock size={14} />
                Simpan Konfigurasi SA (Perlu PIN)
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-none space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">Audit Trail Aktivitas Keuangan</h3>
            <div className="space-y-2 text-xs">
              {logList.filter(l => l.Aksi.includes("KAS") || l.Aksi.includes("IURAN") || l.Aksi.includes("SETTINGS") || l.Aksi.includes("TRANSAKSI")).slice(-5).reverse().map((l, idx) => (
                <div key={`log-${idx}-${l.Waktu}`} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800/70 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{l.Detail}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">{l.Waktu} • Pelaku: {l.Nama}</div>
                  </div>
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-bold rounded">AUDIT</span>
                </div>
              ))}
              {logList.filter(l => l.Aksi.includes("KAS") || l.Aksi.includes("IURAN") || l.Aksi.includes("SETTINGS") || l.Aksi.includes("TRANSAKSI")).length === 0 && (
                <div className="text-center text-slate-400 dark:text-slate-500 py-4">Belum ada aktivitas tercatat.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: INPUT KAS MODAL */}
      {/* ========================================================================= */}
      {showInputKasModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 max-w-lg w-full rounded-3xl p-6 space-y-4 shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                <Plus size={18} className="text-emerald-600" />
                Input Transaksi Kas Umum Baru
              </h3>
              <button onClick={() => { setShowInputKasModal(false); resetKasForm(); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 dark:text-slate-500">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveKas} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Jenis Transaksi</label>
                  <select
                    value={kasFormJenis}
                    onChange={(e) => {
                      const j = e.target.value as "Pemasukan" | "Pengeluaran";
                      setKasFormJenis(j);
                      setKasFormKategori(j === "Pemasukan" ? KATEGORI_PEMASUKAN_PRESET[0] : KATEGORI_PENGELUARAN_PRESET[0]);
                    }}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                  >
                    <option value="Pemasukan">Pemasukan (+)</option>
                    <option value="Pengeluaran">Pengeluaran (-)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={kasFormTanggal}
                    onChange={(e) => setKasFormTanggal(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Kategori</label>
                <select
                  value={kasFormKategori}
                  onChange={(e) => setKasFormKategori(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                >
                  {(kasFormJenis === "Pemasukan" ? KATEGORI_PEMASUKAN_PRESET : KATEGORI_PENGELUARAN_PRESET).map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nominal (Rp) — min. Rp {MIN_NOMINAL_KAS.toLocaleString("id-ID")}</label>
                <input
                  type="number"
                  min={MIN_NOMINAL_KAS}
                  value={kasFormNominal}
                  onChange={(e) => setKasFormNominal(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-emerald-700"
                  required
                />
                {kasFormJenis === "Pengeluaran" && kasFormNominal > sysApprovalLimit && (
                  <p className="text-[10px] text-amber-600 font-bold mt-1 flex items-center gap-1">
                    <AlertTriangle size={12} /> Nominal ini melebihi batas approval (Rp {sysApprovalLimit.toLocaleString("id-ID")}), pertimbangkan ajukan lewat tab Approval.
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Keterangan Tambahan</label>
                <textarea
                  value={kasFormKeterangan}
                  onChange={(e) => setKasFormKeterangan(e.target.value)}
                  placeholder="Catatan detail transaksi..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl h-20"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowInputKasModal(false); resetKasForm(); }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md dark:shadow-none"
                >
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CATAT IURAN MODAL */}
      {/* ========================================================================= */}
      {showCatatIuranModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 max-w-lg w-full rounded-3xl p-6 space-y-4 shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                <DollarSign size={18} className="text-blue-600" />
                Catat Pembayaran Iuran Anggota
              </h3>
              <button onClick={() => { setShowCatatIuranModal(false); resetCatatIuranForm(); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 dark:text-slate-500">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveIuranPayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Pilih Anggota</label>
                <select
                  value={catatMemberId}
                  onChange={(e) => setCatatMemberId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                  required
                >
                  <option value="">-- Pilih Anggota --</option>
                  {anggotaList.map(a => (
                    <option key={a.ID_Anggota} value={a.ID_Anggota}>
                      {a.Nama_Lengkap} ({a.ID_Anggota})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Bulan</label>
                  <select
                    value={catatBulanIdx}
                    onChange={(e) => setCatatBulanIdx(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                  >
                    {MONTHS.map((m, idx) => (
                      <option key={m} value={idx}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tahun</label>
                  <select
                    value={catatTahun}
                    onChange={(e) => setCatatTahun(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                  >
                    <option value={currentYearActual}>{currentYearActual}</option>
                    <option value={(parseInt(currentYearActual) - 1).toString()}>{parseInt(currentYearActual) - 1}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status Pembayaran</label>
                <select
                  value={catatStatus}
                  onChange={(e) => setCatatStatus(e.target.value as "LUNAS" | "CICIL" | "DIBEBASKAN")}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                >
                  <option value="LUNAS">LUNAS (masuk Kas)</option>
                  <option value="CICIL">CICIL (masuk Kas sebagian)</option>
                  <option value="DIBEBASKAN">DIBEBASKAN (tidak masuk Kas)</option>
                </select>
                {catatStatus === "DIBEBASKAN" && (
                  <p className="text-[10px] text-amber-600 font-bold mt-1 flex items-center gap-1">
                    <Info size={12} /> Status ini tidak akan menambah saldo Kas Umum.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nominal (Rp)</label>
                  <input
                    type="number"
                    value={catatNominal}
                    onChange={(e) => setCatatNominal(Number(e.target.value))}
                    disabled={catatStatus === "DIBEBASKAN"}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-blue-700 disabled:opacity-50"
                    required={catatStatus !== "DIBEBASKAN"}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Metode Bayar</label>
                  <select
                    value={catatMetode}
                    onChange={(e) => setCatatMetode(e.target.value as any)}
                    disabled={catatStatus === "DIBEBASKAN"}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl font-bold disabled:opacity-50"
                  >
                    <option value="Tunai">Tunai</option>
                    <option value="Transfer">Transfer Bank</option>
                    <option value="QRIS">QRIS / E-Wallet</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Catatan (Opsional)</label>
                <input
                  type="text"
                  value={catatNotes}
                  onChange={(e) => setCatatNotes(e.target.value)}
                  placeholder="Misal: alasan pembebasan iuran..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowCatatIuranModal(false); resetCatatIuranForm(); }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-md dark:shadow-none"
                >
                  Simpan Iuran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: KUITANSI DETAIL KAS MODAL */}
      {/* ========================================================================= */}
      {showDetailKasModal && activeKasDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-3xl p-6 space-y-4 shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">Detail Kuitansi Transaksi</h3>
              <button onClick={() => setShowDetailKasModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 dark:text-slate-500">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800/70 space-y-2">
                <div className="flex justify-between font-mono text-[10px] text-slate-400 dark:text-slate-500">
                  <span>NO: {activeKasDetail.ID}</span>
                  <span>{activeKasDetail.Tanggal}</span>
                </div>
                <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{activeKasDetail.Kategori}</div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{activeKasDetail.Keterangan}</p>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex justify-between items-center">
                  <span className="font-bold text-slate-500 dark:text-slate-400">Nominal:</span>
                  <span className="font-black text-base text-emerald-700">Rp {getKasNominal(activeKasDetail).toLocaleString("id-ID")}</span>
                </div>
                <div className="text-[10px] italic text-slate-500 dark:text-slate-400">{terbilangRupiah(getKasNominal(activeKasDetail))}</div>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-between">
                <span>Pencatat: {activeKasDetail.Petugas}</span>
                <span>Status: {activeKasDetail.Status || "DISETUJUI"}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center gap-2">
              {isPengurusOrAbove && (
                <button
                  onClick={() => {
                    setKasToDelete(activeKasDetail);
                    setShowDeleteKasModal(true);
                  }}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Trash2 size={14} />
                  <span>Hapus Transaksi</span>
                </button>
              )}
              <button
                onClick={() => setShowDetailKasModal(false)}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs rounded-xl ml-auto"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: MASS REMINDER WA MODAL */}
      {/* ========================================================================= */}
      {showReminderMassalModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 max-w-lg w-full rounded-3xl p-6 space-y-4 shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                <Bell size={18} className="text-amber-500" />
                Kirim Pengingat Iuran Massal via WhatsApp
              </h3>
              <button onClick={() => setShowReminderMassalModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 dark:text-slate-500">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Draft Template Pesan WA</label>
                <textarea
                  value={reminderTemplate}
                  onChange={(e) => setReminderTemplate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl h-24"
                />
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Placeholder: [Nama], [Bulan], [Tahun], [Jumlah]</p>
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900">
                <p className="font-bold">Total Anggota Belum Bayar Bulan Ini: {belumBayarCount} Orang</p>
                <p className="text-[11px] text-amber-800/80 mt-0.5">Pesan akan dikirim langsung via WhatsApp ke nomor anggota.</p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowReminderMassalModal(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs"
              >
                Tutup
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  reminderTemplate
                    .replace("[Bulan]", selectedRekapBulanName)
                    .replace("[Tahun]", selectedRekapTahun)
                    .replace("[Jumlah]", (appData.Settings?.Nominal_Iuran || 10000).toLocaleString("id-ID"))
                    .replace("[Nama]", "Anggota")
                )}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs shadow-md dark:shadow-none flex items-center gap-1.5"
              >
                <Send size={14} />
                <span>Buka WhatsApp Web / App</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: SUPER ADMIN PIN VERIFICATION MODAL */}
      {/* ========================================================================= */}
      {showSaPinModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 max-w-sm w-full rounded-3xl p-6 space-y-4 shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                <Lock size={18} className="text-amber-500" />
                Verifikasi PIN Super Admin
              </h3>
              <button onClick={closeSaPinModal} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 dark:text-slate-500">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tindakan ini bersifat sensitif dan memerlukan konfirmasi PIN Super Admin sebelum diterapkan ke sistem.
            </p>

            <PINField
              id="sa-pin-verification"
              value={saPinInput}
              onChange={(val: string) => { setSaPinInput(val); setSaPinError(""); }}
              maxLength={10}
            />

            {saPinError && (
              <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1">
                <AlertCircle size={12} /> {saPinError}
              </p>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeSaPinModal}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeSaAction}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs shadow-md dark:shadow-none"
              >
                Verifikasi & Jalankan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: DETAIL BULAN — KAS SAYA */}
      {/* ========================================================================= */}
      {selectedMonthModal !== null && monthDetailData && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 max-w-sm w-full rounded-3xl p-6 space-y-4 shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                <Calendar size={18} className="text-emerald-600" />
                Detail Iuran {monthDetailData.monthName} {selectedSayaTahun}
              </h3>
              <button onClick={() => setSelectedMonthModal(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 dark:text-slate-500">
                <X size={18} />
              </button>
            </div>

            <div className={`p-4 rounded-2xl border space-y-2 text-xs ${
              monthDetailData.status === "LUNAS" ? "bg-emerald-50 border-emerald-200 text-emerald-900" :
              monthDetailData.status === "CICIL" ? "bg-amber-50 border-amber-200 text-amber-900" :
              monthDetailData.status === "BELUM_BAYAR" ? "bg-rose-50 border-rose-200 text-rose-900" :
              "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400"
            }`}>
              <div className="flex items-center gap-2 font-extrabold">
                {monthDetailData.status === "LUNAS" && <CheckCircle2 size={16} />}
                {monthDetailData.status === "BELUM_BAYAR" && <XCircle size={16} />}
                {monthDetailData.status === "CICIL" && <Clock size={16} />}
                {monthDetailData.status === "BELUM_WAKTUNYA" && <Clock size={16} />}
                <span>
                  {monthDetailData.status === "LUNAS" ? "Sudah Lunas" :
                   monthDetailData.status === "CICIL" ? "Dicicil Sebagian" :
                   monthDetailData.status === "BELUM_BAYAR" ? "Belum Dibayar" : "Belum Waktunya"}
                </span>
              </div>

              {monthDetailData.iuran ? (
                <div className="space-y-1 pt-1 border-t border-black/5">
                  <p>Jumlah: <span className="font-bold">Rp {Number(monthDetailData.iuran.Jumlah || 0).toLocaleString("id-ID")}</span></p>
                  <p>Tanggal Bayar: <span className="font-bold">{monthDetailData.iuran.Tanggal_Bayar || "-"}</span></p>
                  <p>Metode: <span className="font-bold">{monthDetailData.iuran.Metode_Bayar || "-"}</span></p>
                  {monthDetailData.iuran.Catatan && <p>Catatan: <span className="font-bold">{monthDetailData.iuran.Catatan}</span></p>}
                </div>
              ) : (
                <p className="pt-1 border-t border-black/5">Belum ada catatan pembayaran untuk bulan ini.</p>
              )}
            </div>

            <div className="pt-1 flex justify-end gap-2">
              {isPengurusOrAbove && monthDetailData.status !== "LUNAS" && monthDetailData.status !== "BELUM_WAKTUNYA" && (
                <button
                  onClick={() => {
                    setCatatMemberId(currentMemberId);
                    setCatatBulanIdx(selectedMonthModal);
                    setCatatTahun(selectedSayaTahun);
                    setSelectedMonthModal(null);
                    setShowCatatIuranModal(true);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
                >
                  Catat Pembayaran
                </button>
              )}
              <button
                onClick={() => setSelectedMonthModal(null)}
                className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: KONFIRMASI HAPUS TRANSAKSI KAS */}
      {/* ========================================================================= */}
      {showDeleteKasModal && kasToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-3xl p-6 space-y-4 shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                <AlertTriangle size={20} className="text-rose-500" />
                Konfirmasi Hapus Transaksi Kas
              </h3>
              <button onClick={() => { setShowDeleteKasModal(false); setKasToDelete(null); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 dark:text-slate-500">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-100 dark:border-rose-900/30 space-y-2 text-xs">
              <p className="font-bold text-rose-900 dark:text-rose-300">
                Apakah Anda yakin ingin menghapus transaksi ini?
              </p>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="flex justify-between font-mono text-[10px] text-slate-400">
                  <span>ID: {kasToDelete.ID}</span>
                  <span>{kasToDelete.Tanggal}</span>
                </div>
                <div className="font-bold text-slate-900 dark:text-slate-100">{kasToDelete.Kategori} - {kasToDelete.Jenis}</div>
                <div className="text-slate-600 dark:text-slate-400">{kasToDelete.Keterangan}</div>
                <div className="font-black text-rose-600 text-sm pt-1">
                  Rp {getKasNominal(kasToDelete).toLocaleString("id-ID")}
                </div>
              </div>
              <p className="text-[11px] text-rose-700 dark:text-rose-400">
                Tindakan ini akan memperbarui saldo kas organisasi dan dicatat pada log aktivitas sistem.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowDeleteKasModal(false); setKasToDelete(null); }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDeleteKas(kasToDelete)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs shadow-md dark:shadow-none flex items-center gap-1.5 transition-all"
              >
                <Trash2 size={14} />
                <span>Ya, Hapus Transaksi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 8: KONFIRMASI BATAL / HAPUS PEMBAYARAN IURAN */}
      {/* ========================================================================= */}
      {showDeleteIuranModal && iuranToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-3xl p-6 space-y-4 shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                <AlertTriangle size={20} className="text-rose-500" />
                Batalkan Pembayaran Iuran
              </h3>
              <button onClick={() => { setShowDeleteIuranModal(false); setIuranToDelete(null); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 dark:text-slate-500">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-100 dark:border-rose-900/30 space-y-2 text-xs">
              <p className="font-bold text-rose-900 dark:text-rose-300">
                Batalkan status lunas untuk pembayaran berikut?
              </p>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="font-bold text-slate-900 dark:text-slate-100">{iuranToDelete.memberName}</div>
                <div className="text-slate-500 text-[11px]">ID Anggota: {iuranToDelete.memberId}</div>
                <div className="font-bold text-amber-600 text-xs">
                  Periode: {iuranToDelete.month} {iuranToDelete.year}
                </div>
              </div>
              <p className="text-[11px] text-rose-700 dark:text-rose-400">
                Status iuran anggota ini akan dikembalikan menjadi BELUM BAYAR.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowDeleteIuranModal(false); setIuranToDelete(null); }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDeleteIuran(iuranToDelete.memberId, iuranToDelete.month, iuranToDelete.year)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs shadow-md dark:shadow-none flex items-center gap-1.5 transition-all"
              >
                <Trash2 size={14} />
                <span>Batalkan Pembayaran</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
