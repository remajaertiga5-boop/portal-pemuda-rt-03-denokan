import React, { useState, useEffect, useMemo } from "react";
import { 
  Users, UserPlus, Archive, Crown, BarChart3, Search, Filter, Copy, Share2, 
  Printer, Edit3, Eye, RotateCcw, ShieldCheck, CheckCircle2, AlertTriangle, 
  X, Check, Lock, ArrowUpDown, ChevronRight, Phone, Calendar, Download, 
  QrCode, Sparkles, MessageSquare, Award, Clock, FileSpreadsheet, RefreshCw
} from "lucide-react";
import { AppData, addLogAkses, generateIdAnggotaUnik } from "../utils/dataStore";
import { AnggotaItem, UserRole, JabatanHistoryItem, JabatanKasPermission, JabatanKosongItem } from "../types";
import { verifikasiPINDinamis, generatePINDinamis } from "../utils/auth";
import PINField from "./PINField";
import { processVacatedPosition, canApproveResignation, getApprovalRoleForResignation } from "../utils/resignationHelper";
import KartuAnggotaModal from "./KartuAnggotaModal";
import ManajemenPembayaran from "./ManajemenPembayaran";

interface ManajemenAnggotaSAProps {
  appData: AppData;
  setAppData: React.Dispatch<React.SetStateAction<AppData>>;
  showToast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
  onNavigateToTab?: (tab: string) => void;
}

export default function ManajemenAnggotaSA({
  appData,
  setAppData,
  showToast,
  onNavigateToTab
}: ManajemenAnggotaSAProps) {
  // Main Navigation Tab
  const [activeSubTab, setActiveSubTab] = useState<"daftar" | "tambah" | "arsip" | "jabatan" | "statistik" | "pembayaran">("daftar");

  // Realtime clock for SA PIN dynamic calculation
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // -------------------------------------------------------------
  // TAB 1: DAFTAR ANGGOTA STATES
  // -------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGender, setFilterGender] = useState<string>("SEMUA");
  const [filterStatus, setFilterStatus] = useState<string>("SEMUA");
  const [filterJabatan, setFilterJabatan] = useState<string>("SEMUA");
  const [filterMonth, setFilterMonth] = useState<string>("SEMUA");
  const [filterYear, setFilterYear] = useState<string>("SEMUA");
  const [sortBy, setSortBy] = useState<"TERBARU" | "TERLAMA" | "AZ" | "ZA">("TERBARU");
  const [viewMode, setViewMode] = useState<"GRID" | "LIST">("GRID");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  // Modals inside Tab 1
  const [selectedMemberDetail, setSelectedMemberDetail] = useState<AnggotaItem | null>(null);
  const [editingMember, setEditingMember] = useState<AnggotaItem | null>(null);
  const [idCardMember, setIdCardMember] = useState<AnggotaItem | null>(null);
  const [archiveTargetMember, setArchiveTargetMember] = useState<AnggotaItem | null>(null);
  const [archivePinInput, setArchivePinInput] = useState("");
  const [archiveReason, setArchiveReason] = useState("");
  const [memberHistoryTarget, setMemberHistoryTarget] = useState<AnggotaItem | null>(null);
  const [newJabatanName, setNewJabatanName] = useState("");

  // -------------------------------------------------------------
  // TAB 2: TAMBAH ANGGOTA STATES
  // -------------------------------------------------------------
  const [tambahMode, setTambahMode] = useState<"CEPAT" | "LENGKAP" | "MASSAL">("CEPAT");
  
  // Cara 1: Cepat
  const [quickNamaPanggilan, setQuickNamaPanggilan] = useState("");
  const [quickNoHp, setQuickNoHp] = useState("");

  // Cara 2: Lengkap
  const [fullNamaLengkap, setFullNamaLengkap] = useState("");
  const [fullNamaPanggilan, setFullNamaPanggilan] = useState("");
  const [fullNoHp, setFullNoHp] = useState("");
  const [fullJenisKelamin, setFullJenisKelamin] = useState<"Laki-laki" | "Perempuan">("Laki-laki");
  const [fullTanggalLahir, setFullTanggalLahir] = useState("2005-01-01");
  const [fullAlamat, setFullAlamat] = useState(appData.Settings?.Alamat_Komunitas || "RT 03 Legok RW 04 Denokan");
  const [fullMinat, setFullMinat] = useState("");
  const [fullFotoUrl, setFullFotoUrl] = useState("");

  // Cara 3: Massal
  const [massNamesInput, setMassNamesInput] = useState("");
  const [massResultMembers, setMassResultMembers] = useState<AnggotaItem[] | null>(null);

  // Popup Modal Created Account
  const [accountCreatedSuccess, setAccountCreatedSuccess] = useState<AnggotaItem | null>(null);
  const [isCopiedId, setIsCopiedId] = useState(false);

  // -------------------------------------------------------------
  // TAB 3: ARSIP ANGGOTA STATES
  // -------------------------------------------------------------
  const [arsipSearchQuery, setArsipSearchQuery] = useState("");
  const [restoreTargetMember, setRestoreTargetMember] = useState<AnggotaItem | null>(null);
  const [restorePinInput, setRestorePinInput] = useState("");

  // -------------------------------------------------------------
  // TAB 4: KELOLA JABATAN STATES
  // -------------------------------------------------------------
  const [selectedKetuaTargetId, setSelectedKetuaTargetId] = useState("");
  const [ketuaStartDateInput, setKetuaStartDateInput] = useState(new Date().toISOString().split("T")[0]);
  const [ketuaNotesInput, setKetuaNotesInput] = useState("");
  const [ketuaPinInput, setKetuaPinInput] = useState("");

  // Vacant Position Filling Modal State (F.1 / F.2 / F.3)
  const [fillVacantModal, setFillVacantModal] = useState<JabatanKosongItem | null>(null);
  const [fillMemberTargetId, setFillMemberTargetId] = useState("");

  // Akses Kas Matrix State
  const [kasPermissionsState, setKasPermissionsState] = useState<JabatanKasPermission[]>(
    appData.Settings?.KasAccess?.jabatanPermissions || [
      { jabatan: "Ketua", bisaInputMasuk: true, bisaInputKeluar: true, bisaLihatDetail: true, bisaLihatIuran: true, bisaHapus: true, bisaExport: true, maxNominalInput: 10000000 },
      { jabatan: "Bendahara Umum", bisaInputMasuk: true, bisaInputKeluar: true, bisaLihatDetail: true, bisaLihatIuran: true, bisaHapus: true, bisaExport: true, maxNominalInput: 5000000 },
      { jabatan: "Sekretaris", bisaInputMasuk: true, bisaInputKeluar: false, bisaLihatDetail: true, bisaLihatIuran: true, bisaHapus: false, bisaExport: true, maxNominalInput: 1000000 },
      { jabatan: "Pengurus Harian", bisaInputMasuk: true, bisaInputKeluar: false, bisaLihatDetail: true, bisaLihatIuran: true, bisaHapus: false, bisaExport: false, maxNominalInput: 500000 }
    ]
  );

  // -------------------------------------------------------------
  // MASS REMINDER WA MODAL STATE
  // -------------------------------------------------------------
  const [showMassWaModal, setShowMassWaModal] = useState(false);
  const [massWaTemplate, setMassWaTemplate] = useState<"IURAN" | "KEGIATAN" | "PENGUMUMAN" | "CUSTOM">("IURAN");
  const [massWaCustomMessage, setMassWaCustomMessage] = useState("");

  // -------------------------------------------------------------
  // HELPER DATA CALCULATIONS
  // -------------------------------------------------------------
  const allMembers = useMemo(() => appData.Anggota || [], [appData.Anggota]);

  const activeMembers = useMemo(() => {
    return allMembers.filter(a => a.Status_Tampil !== "ARSIP");
  }, [allMembers]);

  const archivedMembers = useMemo(() => {
    return allMembers.filter(a => a.Status_Tampil === "ARSIP");
  }, [allMembers]);

  const totalRegisteredCount = allMembers.length;
  const activeCount = activeMembers.filter(a => a.Status_Aktif === "AKTIF").length;
  const inactiveCount = activeMembers.filter(a => a.Status_Aktif === "NONAKTIF").length;
  const archivedCount = archivedMembers.length;

  // Filtered Active Members
  const filteredActiveMembers = useMemo(() => {
    return activeMembers.filter(a => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q || (
        a.Nama_Lengkap?.toLowerCase().includes(q) ||
        a.Nama_Panggilan?.toLowerCase().includes(q) ||
        a.ID_Anggota?.toLowerCase().includes(q) ||
        a.No_HP?.includes(q)
      );

      const matchGender = filterGender === "SEMUA" || a.Jenis_Kelamin === filterGender;
      const matchStatus = filterStatus === "SEMUA" || a.Status_Aktif === filterStatus;
      
      const isKetua = a.ID_Anggota === appData.Jabatan?.Ketua?.ID_Anggota;
      const isPengurus = appData.Jabatan?.Pengurus?.some(p => p.ID_Anggota === a.ID_Anggota);
      const matchJabatan = filterJabatan === "SEMUA" ? true :
        filterJabatan === "KETUA" ? isKetua :
        filterJabatan === "PENGURUS" ? isPengurus :
        (!isKetua && !isPengurus);

      let matchMonth = true;
      let matchYear = true;
      if (a.Tanggal_Daftar) {
        const d = new Date(a.Tanggal_Daftar);
        if (filterMonth !== "SEMUA") matchMonth = (d.getMonth() + 1).toString() === filterMonth;
        if (filterYear !== "SEMUA") matchYear = d.getFullYear().toString() === filterYear;
      }

      return matchQuery && matchGender && matchStatus && matchJabatan && matchMonth && matchYear;
    }).sort((a, b) => {
      if (sortBy === "TERBARU") return (b.Tanggal_Daftar || "").localeCompare(a.Tanggal_Daftar || "");
      if (sortBy === "TERLAMA") return (a.Tanggal_Daftar || "").localeCompare(b.Tanggal_Daftar || "");
      if (sortBy === "AZ") return (a.Nama_Lengkap || "").localeCompare(b.Nama_Lengkap || "");
      if (sortBy === "ZA") return (b.Nama_Lengkap || "").localeCompare(a.Nama_Lengkap || "");
      return 0;
    });
  }, [activeMembers, searchQuery, filterGender, filterStatus, filterJabatan, filterMonth, filterYear, sortBy, appData.Jabatan]);

  // Generate Next ID (10 Digit Unik)
  const generateNextId = () => {
    return generateIdAnggotaUnik(appData.Anggota);
  };

  // -------------------------------------------------------------
  // HANDLERS FOR TAB 1: DAFTAR ANGGOTA
  // -------------------------------------------------------------
  const handleToggleSelectAll = () => {
    if (selectedMemberIds.length === filteredActiveMembers.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(filteredActiveMembers.map(a => a.ID_Anggota));
    }
  };

  const handleToggleSelectMember = (id: string) => {
    setSelectedMemberIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkStatusChange = (newStatus: "AKTIF" | "NONAKTIF") => {
    if (selectedMemberIds.length === 0) return;
    const updated = {
      ...appData,
      Anggota: appData.Anggota.map(a => 
        selectedMemberIds.includes(a.ID_Anggota) ? { ...a, Status_Aktif: newStatus } : a
      )
    };
    const logged = addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "UBAH_STATUS_MASSAL", `Mengubah status ${selectedMemberIds.length} anggota menjadi ${newStatus}`);
    setAppData(logged);
    showToast(`Berhasil mengubah ${selectedMemberIds.length} anggota menjadi ${newStatus}!`, "success");
    setSelectedMemberIds([]);
  };

  const handleBulkArchive = () => {
    if (selectedMemberIds.length === 0) return;
    const today = new Date().toISOString().split("T")[0];
    const updated = {
      ...appData,
      Anggota: appData.Anggota.map(a => 
        selectedMemberIds.includes(a.ID_Anggota) ? { 
          ...a, 
          Status_Tampil: "ARSIP" as const,
          Diarsip_Oleh: "Super Admin",
          Tanggal_Arsip: today
        } : a
      )
    };
    const logged = addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "ARSIP_MASSAL", `Mengarsipkan ${selectedMemberIds.length} anggota`);
    setAppData(logged);
    showToast(`Berhasil mengarsipkan ${selectedMemberIds.length} anggota!`, "success");
    setSelectedMemberIds([]);
  };

  const handleSingleArchiveConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!archiveTargetMember) return;
    if (!verifikasiPINDinamis(archivePinInput)) {
      showToast("PIN Super Admin verifikasi salah atau sudah kedaluwarsa!", "error");
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const updated = {
      ...appData,
      Anggota: appData.Anggota.map(a => 
        a.ID_Anggota === archiveTargetMember.ID_Anggota ? {
          ...a,
          Status_Tampil: "ARSIP" as const,
          Diarsip_Oleh: "Super Admin",
          Tanggal_Arsip: today
        } : a
      )
    };

    const logged = addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "ARSIP_ANGGOTA", `Mengarsipkan anggota ${archiveTargetMember.Nama_Lengkap} (${archiveTargetMember.ID_Anggota}). Alasan: ${archiveReason || "-"}`);
    setAppData(logged);
    showToast(`Anggota ${archiveTargetMember.Nama_Lengkap} berhasil diarsipkan! 🗄️`, "success");
    setArchiveTargetMember(null);
    setArchivePinInput("");
    setArchiveReason("");
  };

  const handleSaveEditMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    const updated = {
      ...appData,
      Anggota: appData.Anggota.map(a => a.ID_Anggota === editingMember.ID_Anggota ? editingMember : a)
    };
    const logged = addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "EDIT_ANGGOTA", `Memperbarui data anggota ${editingMember.Nama_Lengkap} (${editingMember.ID_Anggota})`);
    setAppData(logged);
    showToast(`Data anggota ${editingMember.Nama_Lengkap} berhasil disimpan!`, "success");
    setEditingMember(null);
  };

  // -------------------------------------------------------------
  // HANDLERS FOR TAB 2: TAMBAH ANGGOTA
  // -------------------------------------------------------------
  const handleDaftarCepatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNamaPanggilan.trim()) {
      showToast("Nama panggilan wajib diisi!", "error");
      return;
    }

    const newId = generateNextId();
    const newMember: AnggotaItem = {
      ID_Anggota: newId,
      Nama_Lengkap: quickNamaPanggilan.trim(),
      Nama_Panggilan: quickNamaPanggilan.trim().split(" ")[0],
      Alamat: appData.Settings?.Alamat_Komunitas || "RT 03 Legok RW 04 Denokan",
      No_HP: quickNoHp.trim() || "081234567890",
      Jenis_Kelamin: "Laki-laki",
      Tanggal_Lahir: "2005-01-01",
      Tanggal_Daftar: new Date().toISOString().split("T")[0],
      Status_Aktif: "AKTIF",
      Status_Tampil: "TAMPIL",
      Izin_NoHP: true,
      Izin_TanggalLahir: true,
      Izin_Minat: true,
    };

    const updated = {
      ...appData,
      Anggota: [newMember, ...appData.Anggota]
    };
    const logged = addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "DAFTAR_CEPAT_SA", `Mendaftarkan ${newMember.Nama_Lengkap} (${newId})`);
    setAppData(logged);
    setAccountCreatedSuccess(newMember);
    setQuickNamaPanggilan("");
    setQuickNoHp("");
  };

  const handleDaftarLengkapSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullNamaPanggilan.trim()) {
      showToast("Nama panggilan wajib diisi!", "error");
      return;
    }

    const newId = generateNextId();
    const newMember: AnggotaItem = {
      ID_Anggota: newId,
      Nama_Lengkap: fullNamaLengkap.trim() || fullNamaPanggilan.trim(),
      Nama_Panggilan: fullNamaPanggilan.trim(),
      Alamat: fullAlamat.trim(),
      No_HP: fullNoHp.trim() || "081234567890",
      Jenis_Kelamin: fullJenisKelamin,
      Tanggal_Lahir: fullTanggalLahir,
      Minat_Bakat: fullMinat.trim(),
      Foto_Profil: fullFotoUrl.trim(),
      Tanggal_Daftar: new Date().toISOString().split("T")[0],
      Status_Aktif: "AKTIF",
      Status_Tampil: "TAMPIL",
      Izin_NoHP: true,
      Izin_TanggalLahir: true,
      Izin_Minat: true,
    };

    const updated = {
      ...appData,
      Anggota: [newMember, ...appData.Anggota]
    };
    const logged = addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "DAFTAR_LENGKAP_SA", `Mendaftarkan ${newMember.Nama_Lengkap} (${newId})`);
    setAppData(logged);
    setAccountCreatedSuccess(newMember);
    
    // Reset form
    setFullNamaLengkap("");
    setFullNamaPanggilan("");
    setFullNoHp("");
    setFullMinat("");
    setFullFotoUrl("");
  };

  const handleDaftarMassalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = massNamesInput.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      showToast("Masukkan minimal satu nama!", "error");
      return;
    }

    const newMembersList: AnggotaItem[] = [];
    const currentList = [...appData.Anggota];

    lines.forEach(name => {
      const newId = generateIdAnggotaUnik(currentList);
      const memberItem: AnggotaItem = {
        ID_Anggota: newId,
        Nama_Lengkap: name,
        Nama_Panggilan: name.split(" ")[0],
        Alamat: appData.Settings?.Alamat_Komunitas || "RT 03 Legok RW 04 Denokan",
        No_HP: "081234567890",
        Jenis_Kelamin: "Laki-laki",
        Tanggal_Lahir: "2005-01-01",
        Tanggal_Daftar: new Date().toISOString().split("T")[0],
        Status_Aktif: "AKTIF",
        Status_Tampil: "TAMPIL",
        StatusPassword: "BelumDiatur",
        Izin_NoHP: true,
        Izin_TanggalLahir: true,
        Izin_Minat: true,
      };
      newMembersList.push(memberItem);
      currentList.push(memberItem);
    });

    const updated = {
      ...appData,
      Anggota: [...newMembersList, ...appData.Anggota]
    };

    const logged = addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "DAFTAR_MASSAL_SA", `Mendaftarkan ${newMembersList.length} anggota baru massal`);
    setAppData(logged);
    setMassResultMembers(newMembersList);
    setMassNamesInput("");
    showToast(`Berhasil mendaftarkan ${newMembersList.length} anggota secara massal! 🎉`, "success");
  };

  // -------------------------------------------------------------
  // HANDLERS FOR TAB 3: ARSIP ANGGOTA
  // -------------------------------------------------------------
  const handleRestoreMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreTargetMember) return;
    if (!verifikasiPINDinamis(restorePinInput)) {
      showToast("PIN Super Admin verifikasi salah atau sudah kedaluwarsa!", "error");
      return;
    }

    const updated = {
      ...appData,
      Anggota: appData.Anggota.map(a => 
        a.ID_Anggota === restoreTargetMember.ID_Anggota ? {
          ...a,
          Status_Tampil: "TAMPIL" as const,
          Diarsip_Oleh: undefined,
          Tanggal_Arsip: undefined
        } : a
      )
    };

    const logged = addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "KEMBALIKAN_ARSIP", `Mengembalikan anggota ${restoreTargetMember.Nama_Lengkap} (${restoreTargetMember.ID_Anggota}) dari arsip`);
    setAppData(logged);
    showToast(`Anggota ${restoreTargetMember.Nama_Lengkap} berhasil dikembalikan ke daftar aktif! 🔄`, "success");
    setRestoreTargetMember(null);
    setRestorePinInput("");
  };

  // -------------------------------------------------------------
  // HANDLERS FOR TAB 4: KELOLA JABATAN
  // -------------------------------------------------------------
  const handleTunjukKetuaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKetuaTargetId) {
      showToast("Pilih calon Ketua Remaja baru!", "error");
      return;
    }
    if (!verifikasiPINDinamis(ketuaPinInput)) {
      showToast("PIN Super Admin verifikasi salah atau sudah kedaluwarsa!", "error");
      return;
    }

    const memberCandidate = appData.Anggota.find(a => a.ID_Anggota === selectedKetuaTargetId);
    if (!memberCandidate) return;

    // Record Jabatan History
    const newHistoryItem: JabatanHistoryItem = {
      id: Date.now().toString(),
      Tanggal: ketuaStartDateInput,
      Nama_Ketua: memberCandidate.Nama_Lengkap,
      ID_Ketua: memberCandidate.ID_Anggota,
      Ditunjuk_Oleh: "Super Admin",
      Status: "AKTIF"
    };

    const prevHistory = (appData.JabatanHistory || []).map(h => ({ ...h, Status: "DEMISIONER" as const }));

    const updated = {
      ...appData,
      Jabatan: {
        ...appData.Jabatan,
        Ketua: {
          ID_Anggota: memberCandidate.ID_Anggota,
          Nama: memberCandidate.Nama_Lengkap,
          Tanggal_Mulai: ketuaStartDateInput
        }
      },
      JabatanHistory: [newHistoryItem, ...prevHistory]
    };

    const logged = addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "TUNJUK_KETUA_BARU", `Menunjuk ${memberCandidate.Nama_Lengkap} (${memberCandidate.ID_Anggota}) sebagai Ketua Remaja Baru`);
    setAppData(logged);
    showToast(`Selamat! ${memberCandidate.Nama_Lengkap} resmi ditunjuk sebagai Ketua Remaja! 👑`, "success");
    setSelectedKetuaTargetId("");
    setKetuaNotesInput("");
    setKetuaPinInput("");
  };

  const handleSaveKasPermissions = () => {
    const updated = {
      ...appData,
      Settings: {
        ...appData.Settings,
        KasAccess: {
          ...(appData.Settings?.KasAccess || {
            kasSaldoVisibilitas: "SEMUA_ANGGOTA",
            kasDetailVisibilitas: "SEMUA_ANGGOTA",
            kasIuranVisibilitas: "SEMUA_ANGGOTA",
            notifJatuhTempo: true,
            notifIuranLunas: true,
            notifPengeluaran: true,
            notifSaldoMenipis: true
          }),
          jabatanPermissions: kasPermissionsState
        }
      }
    };
    const logged = addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "UPDATE_KAS_PERMISSIONS", "Memperbarui matriks izin kas per jabatan");
    setAppData(logged);
    showToast("Matriks izin kas per jabatan berhasil diperbarui! 💾", "success");
  };

  // Handler for F.4 Approval of Pengunduran Diri (triggers F.2 & F.3 cascading)
  const handleApproveResignation = (reqId: string, applicantId: string, jabatan: string, reason: string) => {
    const todayStr = new Date().toISOString().split("T")[0];

    // 1. First run cascading vacancy processing
    const cascadedAppData = processVacatedPosition(
      appData,
      applicantId,
      jabatan,
      "Super Admin",
      "SUPER_ADMIN",
      reason
    );

    // 2. Mark resignation request status as Disetujui
    const updatedResignList = (cascadedAppData.PengunduranDiri || []).map(r => {
      if (r.ID === reqId) {
        return {
          ...r,
          Status: "Disetujui" as const,
          DisetujuiOleh: "Super Admin",
          TanggalKeputusan: todayStr,
          Catatan: "Disetujui oleh atasan berwenang sesuai matriks F.4"
        };
      }
      return r;
    });

    const finalData = {
      ...cascadedAppData,
      PengunduranDiri: updatedResignList
    };

    setAppData(finalData);
    showToast(`Pengunduran diri ${jabatan} berhasil disetujui! Struktur & posisi telah disesuaikan secara otomatis. 🔄`, "success");
  };

  const handleRejectResignation = (reqId: string, jabatan: string) => {
    const todayStr = new Date().toISOString().split("T")[0];

    const updatedResignList = (appData.PengunduranDiri || []).map(r => {
      if (r.ID === reqId) {
        return {
          ...r,
          Status: "Ditolak" as const,
          DisetujuiOleh: "Super Admin",
          TanggalKeputusan: todayStr,
          Catatan: "Ditolak oleh atasan berwenang"
        };
      }
      return r;
    });

    const updated = {
      ...appData,
      PengunduranDiri: updatedResignList
    };

    const logged = addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "RESIGN_REJECT", `Menolak pengajuan pengunduran diri jabatan ${jabatan}`);
    setAppData(logged);
    showToast(`Pengajuan pengunduran diri ${jabatan} telah ditolak.`, "info");
  };

  // Handler for filling a vacant position (F.1 / F.2 / F.3)
  const handleFillVacantPosition = () => {
    if (!fillVacantModal || !fillMemberTargetId) {
      showToast("Pilih anggota yang akan mengisi posisi ini!", "error");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const targetMember = appData.Anggota.find(a => a.ID_Anggota === fillMemberTargetId);
    if (!targetMember) return;

    const posName = fillVacantModal.Jabatan;
    const norm = posName.toLowerCase().trim();

    // Map role
    let newRole: UserRole = "PENGURUS";
    if (norm.includes("wakil ketua")) newRole = "WAKIL_KETUA";
    else if (norm.includes("ketua")) newRole = "KETUA";
    else if (norm.includes("wakil sekretaris")) newRole = "WAKIL_SEKRETARIS";
    else if (norm.includes("sekretaris")) newRole = "SEKRETARIS";
    else if (norm.includes("wakil bendahara")) newRole = "WAKIL_BENDAHARA";
    else if (norm.includes("bendahara")) newRole = "BENDAHARA";
    else if (norm.includes("kepala humas")) newRole = "KEPALA_HUMAS";
    else if (norm.includes("humas")) newRole = "HUMAS";

    // 1. Update member's role and position
    const updatedAnggota = appData.Anggota.map(a => {
      if (a.ID_Anggota === fillMemberTargetId) {
        return {
          ...a,
          Role: newRole,
          Jabatan: posName,
          Status_Jabatan: "Aktif",
          StatusJabatan: "Aktif",
          Tanggal_Menjabat: todayStr
        };
      }
      return a;
    });

    // 2. Mark JabatanKosong entry as Terisi
    const updatedKosong = (appData.JabatanKosong || []).map(jk => {
      if (jk.ID === fillVacantModal.ID) {
        return { ...jk, Status: "Terisi" as const };
      }
      return jk;
    });

    const updatedData = {
      ...appData,
      Anggota: updatedAnggota,
      JabatanKosong: updatedKosong
    };

    const logged = addLogAkses(
      updatedData,
      "Super Admin",
      "SUPER_ADMIN",
      "FILL_POSITION",
      `Menunjuk ${targetMember.Nama_Lengkap} (${targetMember.ID_Anggota}) untuk mengisi posisi ${posName}`
    );

    setAppData(logged);
    setFillVacantModal(null);
    setFillMemberTargetId("");
    showToast(`Selamat! ${targetMember.Nama_Lengkap} resmi mengisi posisi ${posName}! 🎉`, "success");
  };

  // WhatsApp Helper
  const sendWaMessage = (phone: string, text: string) => {
    const cleanPhone = phone.replace(/^0/, "62").replace(/\D/g, "");
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, "_blank");
  };

  return (
    <div className="space-y-6 text-slate-100">
      
      {/* HEADER BANNER - DARK TONE SUPER ADMIN */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 p-6 md:p-8 rounded-3xl border border-purple-800/40 shadow-xl dark:shadow-none relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-black uppercase tracking-widest">
              👑 Ditegakkan Oleh Super Admin
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Manajemen Anggota Remaja
            </h1>
            <p className="text-xs md:text-sm text-purple-200 font-medium">
              Kelola data anggota, hak jabatan, arsip permanen, dan statistik organisasi Remaja Legok 03.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button
              onClick={() => {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData.Anggota, null, 2));
                const downloadAnchor = document.createElement("a");
                downloadAnchor.setAttribute("href", dataStr);
                downloadAnchor.setAttribute("download", `Anggota_RL03_${new Date().toISOString().split("T")[0]}.json`);
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
                showToast("Data Anggota berhasil diexport JSON!", "success");
              }}
              className="px-4 py-2.5 bg-purple-900/80 hover:bg-purple-800 text-purple-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-purple-700/50 transition-all shadow-md dark:shadow-none flex-1 md:flex-none"
            >
              <Download size={14} /> Export JSON
            </button>
            <button
              onClick={() => setShowMassWaModal(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md dark:shadow-none flex-1 md:flex-none"
            >
              <MessageSquare size={14} /> Reminder WA Massal
            </button>
          </div>
        </div>
      </div>

      {/* TOP NAVIGATION SUB TABS */}
      <div className="flex overflow-x-auto gap-2 bg-slate-900/90 p-2 rounded-2xl border border-slate-800 shadow-lg dark:shadow-none scrollbar-none">
        <button
          onClick={() => setActiveSubTab("daftar")}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
            activeSubTab === "daftar"
              ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md dark:shadow-none shadow-amber-500/20"
              : "text-slate-400 dark:text-slate-500 hover:bg-slate-800 hover:text-slate-200"
          }`}
        >
          <Users size={16} /> 📋 DAFTAR ANGGOTA ({activeCount})
        </button>

        <button
          onClick={() => setActiveSubTab("tambah")}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
            activeSubTab === "tambah"
              ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md dark:shadow-none shadow-amber-500/20"
              : "text-slate-400 dark:text-slate-500 hover:bg-slate-800 hover:text-slate-200"
          }`}
        >
          <UserPlus size={16} /> ➕ TAMBAH ANGGOTA
        </button>

        <button
          onClick={() => setActiveSubTab("arsip")}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
            activeSubTab === "arsip"
              ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md dark:shadow-none shadow-amber-500/20"
              : "text-slate-400 dark:text-slate-500 hover:bg-slate-800 hover:text-slate-200"
          }`}
        >
          <Archive size={16} /> 🗄️ ARSIP ANGGOTA ({archivedCount})
        </button>

        <button
          onClick={() => setActiveSubTab("jabatan")}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
            activeSubTab === "jabatan"
              ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md dark:shadow-none shadow-amber-500/20"
              : "text-slate-400 dark:text-slate-500 hover:bg-slate-800 hover:text-slate-200"
          }`}
        >
          <Crown size={16} /> 🏅 KELOLA JABATAN
        </button>

        <button
          onClick={() => setActiveSubTab("statistik")}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
            activeSubTab === "statistik"
              ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md dark:shadow-none shadow-amber-500/20"
              : "text-slate-400 dark:text-slate-500 hover:bg-slate-800 hover:text-slate-200"
          }`}
        >
          <BarChart3 size={16} /> 📊 STATISTIK ANGGOTA
        </button>

        <button
          onClick={() => setActiveSubTab("pembayaran")}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
            activeSubTab === "pembayaran"
              ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md dark:shadow-none shadow-amber-500/20"
              : "text-slate-400 dark:text-slate-500 hover:bg-slate-800 hover:text-slate-200"
          }`}
        >
          <CheckCircle2 size={16} /> 💳 PEMBAYARAN
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DAFTAR ANGGOTA */}
      {/* ========================================================================= */}
      {activeSubTab === "daftar" && (
        <div className="space-y-6">
          
          {/* STATS OVERVIEW CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Terdaftar</p>
                <h3 className="text-2xl font-black text-white">{totalRegisteredCount}</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Seluruh riwayat ID</p>
              </div>
              <div className="w-10 h-10 bg-purple-900/50 text-purple-300 rounded-xl flex items-center justify-center font-bold">
                <Users size={20} />
              </div>
            </div>

            <div className="bg-slate-900/90 p-4 rounded-2xl border border-emerald-900/30 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Anggota Aktif</p>
                <h3 className="text-2xl font-black text-emerald-400">{activeCount}</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Dapat akses sistem</p>
              </div>
              <div className="w-10 h-10 bg-emerald-950 text-emerald-400 rounded-xl flex items-center justify-center font-bold">
                <CheckCircle2 size={20} />
              </div>
            </div>

            <div className="bg-slate-900/90 p-4 rounded-2xl border border-rose-900/30 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Nonaktif</p>
                <h3 className="text-2xl font-black text-rose-400">{inactiveCount}</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Perlu ditinjau</p>
              </div>
              <div className="w-10 h-10 bg-rose-950 text-rose-400 rounded-xl flex items-center justify-center font-bold">
                <AlertTriangle size={20} />
              </div>
            </div>

            <div className="bg-slate-900/90 p-4 rounded-2xl border border-amber-900/30 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Diarsip</p>
                <h3 className="text-2xl font-black text-amber-300">{archivedCount}</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Tersimpan permanen</p>
              </div>
              <div className="w-10 h-10 bg-amber-950 text-amber-400 rounded-xl flex items-center justify-center font-bold">
                <Archive size={20} />
              </div>
            </div>
          </div>

          {/* FILTER & SEARCH PANEL */}
          <div className="bg-slate-900/90 p-4 md:p-6 rounded-3xl border border-slate-800 space-y-4 shadow-lg dark:shadow-none">
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cari nama, panggilan, ID (RL03-...), atau No HP..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs md:text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-400 outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode(viewMode === "GRID" ? "LIST" : "GRID")}
                  className="p-2.5 bg-slate-950 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                  title="Ganti Mode Tampilan"
                >
                  {viewMode === "GRID" ? "📋 Tampilan List" : "🔲 Tampilan Grid"}
                </button>
              </div>
            </div>

            {/* DETAILED FILTERS */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1">Jenis Kelamin</label>
                <select 
                  value={filterGender}
                  onChange={e => setFilterGender(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none"
                >
                  <option value="SEMUA">Semua Gender</option>
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1">Status</label>
                <select 
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none"
                >
                  <option value="SEMUA">Semua Status</option>
                  <option value="AKTIF">Aktif</option>
                  <option value="NONAKTIF">Nonaktif</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1">Jabatan</label>
                <select 
                  value={filterJabatan}
                  onChange={e => setFilterJabatan(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none"
                >
                  <option value="SEMUA">Semua Jabatan</option>
                  <option value="KETUA">Ketua Remaja</option>
                  <option value="PENGURUS">Pengurus</option>
                  <option value="ANGGOTA">Anggota Biasa</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1">Bulan Daftar</label>
                <select 
                  value={filterMonth}
                  onChange={e => setFilterMonth(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none"
                >
                  <option value="SEMUA">Semua Bulan</option>
                  {[...Array(12)].map((_, i) => (
                    <option key={i+1} value={(i+1).toString()}>
                      {new Date(2000, i, 1).toLocaleString('id-ID', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1">Tahun Daftar</label>
                <select 
                  value={filterYear}
                  onChange={e => setFilterYear(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none"
                >
                  <option value="SEMUA">Semua Tahun</option>
                  {Array.from(new Set(allMembers.map(a => a.Tanggal_Daftar ? new Date(a.Tanggal_Daftar).getFullYear().toString() : "2025"))).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1">Urutan</label>
                <select 
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none"
                >
                  <option value="TERBARU">Terbaru</option>
                  <option value="TERLAMA">Terlama</option>
                  <option value="AZ">Nama A-Z</option>
                  <option value="ZA">Nama Z-A</option>
                </select>
              </div>
            </div>

            {/* BULK ACTIONS BAR */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  checked={selectedMemberIds.length > 0 && selectedMemberIds.length === filteredActiveMembers.length}
                  onChange={handleToggleSelectAll}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-400 focus:ring-amber-400 cursor-pointer"
                />
                <span className="text-xs text-slate-300 font-bold">
                  {selectedMemberIds.length > 0 ? `${selectedMemberIds.length} Terpilih` : "Pilih Semua"}
                </span>
              </div>

              {selectedMemberIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    onClick={() => handleBulkStatusChange("AKTIF")}
                    className="px-3 py-1.5 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded-lg text-xs font-bold hover:bg-emerald-900 transition-colors"
                  >
                    Set Aktif
                  </button>
                  <button 
                    onClick={() => handleBulkStatusChange("NONAKTIF")}
                    className="px-3 py-1.5 bg-rose-950 border border-rose-800 text-rose-300 rounded-lg text-xs font-bold hover:bg-rose-900 transition-colors"
                  >
                    Set Nonaktif
                  </button>
                  <button 
                    onClick={handleBulkArchive}
                    className="px-3 py-1.5 bg-amber-950 border border-amber-800 text-amber-300 rounded-lg text-xs font-bold hover:bg-amber-900 transition-colors"
                  >
                    Arsip Terpilih
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* MEMBER CARDS DISPLAY */}
          {filteredActiveMembers.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/60 rounded-3xl border border-slate-800">
              <Users size={40} className="mx-auto text-slate-600 dark:text-slate-400 mb-3" />
              <h4 className="font-bold text-slate-300 text-base">Tidak ada anggota ditemukan</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Coba sesuaikan kata kunci atau filter pencarian Anda.</p>
            </div>
          ) : viewMode === "GRID" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredActiveMembers.map(m => {
                const isKetua = m.ID_Anggota === appData.Jabatan?.Ketua?.ID_Anggota;
                const isPengurus = appData.Jabatan?.Pengurus?.some(p => p.ID_Anggota === m.ID_Anggota);

                return (
                  <div 
                    key={m.ID_Anggota}
                    className={`bg-slate-900 p-5 rounded-3xl border transition-all duration-200 hover:border-amber-400/50 relative flex flex-col justify-between ${
                      selectedMemberIds.includes(m.ID_Anggota) ? "border-amber-400 bg-slate-900/90 shadow-lg dark:shadow-none shadow-amber-400/5" : "border-slate-800"
                    }`}
                  >
                    <div className="space-y-3">
                      {/* TOP BADGE & CHECKBOX */}
                      <div className="flex justify-between items-start gap-2">
                        <input 
                          type="checkbox"
                          checked={selectedMemberIds.includes(m.ID_Anggota)}
                          onChange={() => handleToggleSelectMember(m.ID_Anggota)}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-400 focus:ring-amber-400 cursor-pointer mt-1"
                        />
                        <div className="flex flex-wrap gap-1 justify-end">
                          {isKetua && (
                            <span className="px-2.5 py-1 bg-amber-400/10 border border-amber-400/40 text-amber-300 rounded-full text-[10px] font-black uppercase flex items-center gap-1">
                              👑 KETUA REMAJA
                            </span>
                          )}
                          {isPengurus && !isKetua && (
                            <span className="px-2 py-0.5 bg-blue-900/40 border border-blue-700/40 text-blue-300 rounded-full text-[10px] font-bold">
                              PENGURUS
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            m.Status_Aktif === "AKTIF" ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50" : "bg-rose-950 text-rose-400 border border-rose-800/50"
                          }`}>
                            {m.Status_Aktif}
                          </span>
                        </div>
                      </div>

                      {/* AVATAR & NAME */}
                      <div className="flex items-center gap-3">
                        {m.Foto_Profil ? (
                          <img 
                            src={m.Foto_Profil} 
                            alt={m.Nama_Lengkap} 
                            className="w-12 h-12 rounded-2xl object-cover border border-slate-700 shrink-0" 
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-900 to-indigo-900 border border-purple-700/50 flex items-center justify-center font-black text-amber-300 text-lg shrink-0">
                            {m.Nama_Panggilan?.charAt(0) || m.Nama_Lengkap?.charAt(0)}
                          </div>
                        )}

                        <div className="overflow-hidden">
                          <h4 className="font-bold text-slate-100 text-sm truncate">{m.Nama_Lengkap}</h4>
                          <p className="text-xs text-slate-400 dark:text-slate-500">"{m.Nama_Panggilan}"</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-xs font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                              {m.ID_Anggota}
                            </span>
                            <span className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400 uppercase">PERMANEN</span>
                          </div>
                        </div>
                      </div>

                      {/* INFO DETAILS */}
                      <div className="space-y-1 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/60 text-xs">
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1"><Phone size={12} /> WhatsApp:</span>
                          <span className="font-mono font-semibold text-slate-200">{m.No_HP || "-"}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1"><Calendar size={12} /> Bergabung:</span>
                          <span className="font-mono text-slate-400 dark:text-slate-500">{m.Tanggal_Daftar || "-"}</span>
                        </div>
                      </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="pt-4 border-t border-slate-800/80 mt-4 grid grid-cols-3 gap-1.5">
                      <button 
                        onClick={() => setSelectedMemberDetail(m)}
                        className="py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                        title="Lihat Detail"
                      >
                        <Eye size={12} /> Detail
                      </button>
                      <button 
                        onClick={() => setEditingMember(m)}
                        className="py-1.5 bg-blue-950/80 border border-blue-800/50 hover:bg-blue-900 text-blue-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                        title="Edit Data"
                      >
                        <Edit3 size={12} /> Edit
                      </button>
                      <button 
                        onClick={() => setIdCardMember(m)}
                        className="py-1.5 bg-purple-950/80 border border-purple-800/50 hover:bg-purple-900 text-purple-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                        title="Cetak Kartu ID"
                      >
                        <QrCode size={12} /> Kartu ID
                      </button>
                      <button 
                        onClick={() => setEditingMember(m)}
                        className="py-1.5 bg-amber-950/80 border border-amber-800/50 hover:bg-amber-900 text-amber-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors col-span-2"
                      >
                        <Crown size={12} /> Atur Jabatan
                      </button>
                      <button 
                        onClick={() => setArchiveTargetMember(m)}
                        className="py-1.5 bg-rose-950/80 border border-rose-800/50 hover:bg-rose-900 text-rose-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                        title="Arsip Anggota"
                      >
                        <Archive size={12} /> Arsip
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* LIST VIEW MODE */
            <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-lg dark:shadow-none">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 dark:text-slate-500 uppercase font-extrabold text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-3 text-center">
                        <input 
                          type="checkbox"
                          checked={selectedMemberIds.length > 0 && selectedMemberIds.length === filteredActiveMembers.length}
                          onChange={handleToggleSelectAll}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-400 focus:ring-amber-400 cursor-pointer"
                        />
                      </th>
                      <th className="p-3">ID & Nama Anggota</th>
                      <th className="p-3">WhatsApp</th>
                      <th className="p-3">Gender</th>
                      <th className="p-3">Tanggal Daftar</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {filteredActiveMembers.map(m => (
                      <tr key={m.ID_Anggota} className="hover:bg-slate-800/50 transition-colors">
                        <td className="p-3 text-center">
                          <input 
                            type="checkbox"
                            checked={selectedMemberIds.includes(m.ID_Anggota)}
                            onChange={() => handleToggleSelectMember(m.ID_Anggota)}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-400 focus:ring-amber-400 cursor-pointer"
                          />
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-100">{m.Nama_Lengkap} ({m.Nama_Panggilan})</div>
                          <div className="font-mono text-amber-400 text-[11px] font-black">{m.ID_Anggota}</div>
                        </td>
                        <td className="p-3 font-mono">{m.No_HP || "-"}</td>
                        <td className="p-3">{m.Jenis_Kelamin}</td>
                        <td className="p-3 font-mono">{m.Tanggal_Daftar || "-"}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            m.Status_Aktif === "AKTIF" ? "bg-emerald-950 text-emerald-400" : "bg-rose-950 text-rose-400"
                          }`}>
                            {m.Status_Aktif}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button 
                              onClick={() => setSelectedMemberDetail(m)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg"
                              title="Detail"
                            >
                              <Eye size={14} />
                            </button>
                            <button 
                              onClick={() => setEditingMember(m)}
                              className="p-1.5 bg-blue-950 border border-blue-800 text-blue-300 rounded-lg"
                              title="Edit"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button 
                              onClick={() => setIdCardMember(m)}
                              className="p-1.5 bg-purple-950 border border-purple-800 text-purple-300 rounded-lg"
                              title="Kartu ID"
                            >
                              <QrCode size={14} />
                            </button>
                            <button 
                              onClick={() => setArchiveTargetMember(m)}
                              className="p-1.5 bg-rose-950 border border-rose-800 text-rose-300 rounded-lg"
                              title="Arsip"
                            >
                              <Archive size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TAMBAH ANGGOTA (3 CARA) */}
      {/* ========================================================================= */}
      {activeSubTab === "tambah" && (
        <div className="space-y-6">
          
          {/* METHOD SELECTOR TABS */}
          <div className="flex gap-2 bg-slate-900 p-2 rounded-2xl border border-slate-800">
            <button
              onClick={() => setTambahMode("CEPAT")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
                tambahMode === "CEPAT" ? "bg-purple-700 text-amber-300 shadow-md dark:shadow-none" : "text-slate-400 dark:text-slate-500 hover:bg-slate-800"
              }`}
            >
              ⚡ Cara 1: Daftar Cepat
            </button>
            <button
              onClick={() => setTambahMode("LENGKAP")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
                tambahMode === "LENGKAP" ? "bg-purple-700 text-amber-300 shadow-md dark:shadow-none" : "text-slate-400 dark:text-slate-500 hover:bg-slate-800"
              }`}
            >
              📝 Cara 2: Daftar Lengkap
            </button>
            <button
              onClick={() => setTambahMode("MASSAL")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
                tambahMode === "MASSAL" ? "bg-purple-700 text-amber-300 shadow-md dark:shadow-none" : "text-slate-400 dark:text-slate-500 hover:bg-slate-800"
              }`}
            >
              📋 Cara 3: Daftar Massal
            </button>
          </div>

          {/* CARA 1: DAFTAR CEPAT */}
          {tambahMode === "CEPAT" && (
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4 max-w-xl mx-auto shadow-xl dark:shadow-none">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <div className="w-12 h-12 bg-amber-400/10 text-amber-300 rounded-2xl border border-amber-400/20 flex items-center justify-center font-black text-xl">
                  ⚡
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Pendaftaran Cepat (Instan)</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Hanya butuh nama panggilan, ID otomatis di-generate oleh sistem.</p>
                </div>
              </div>

              <form onSubmit={handleDaftarCepatSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Nama Panggilan / Singkat <span className="text-rose-400">*</span>
                  </label>
                  <input 
                    type="text" 
                    required
                    value={quickNamaPanggilan}
                    onChange={e => setQuickNamaPanggilan(e.target.value)}
                    placeholder="Contoh: Rian, Dewi, Joko"
                    className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-white focus:ring-2 focus:ring-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Nomor WhatsApp (Opsional)
                  </label>
                  <input 
                    type="text"
                    value={quickNoHp}
                    onChange={e => setQuickNoHp(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-white focus:ring-2 focus:ring-amber-400 outline-none"
                  />
                </div>

                <div className="p-3.5 bg-purple-950/40 border border-purple-800/30 rounded-2xl text-xs text-purple-200">
                  <p className="font-bold flex items-center gap-1.5 text-amber-300">
                    <span>💡</span> ID Yang Akan Dibuat: <span className="font-mono text-sm font-black">{generateNextId()}</span>
                  </p>
                  <p className="text-[11px] text-purple-300/80 mt-1">
                    Anggota dapat melengkapi profil (nama lengkap, tanggal lahir, dll.) sendiri setelah mendapatkan ID ini.
                  </p>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black py-4 rounded-2xl shadow-lg dark:shadow-none transition-all text-sm tracking-wide"
                >
                  ➕ Buat Akun Anggota Cepat
                </button>
              </form>
            </div>
          )}

          {/* CARA 2: DAFTAR LENGKAP */}
          {tambahMode === "LENGKAP" && (
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4 max-w-2xl mx-auto shadow-xl dark:shadow-none">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <div className="w-12 h-12 bg-purple-900/50 text-purple-300 rounded-2xl border border-purple-700/50 flex items-center justify-center font-black text-xl">
                  📝
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Pendaftaran Lengkap</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Isi seluruh data anggota secara lengkap sekaligus.</p>
                </div>
              </div>

              <form onSubmit={handleDaftarLengkapSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Nama Panggilan <span className="text-rose-400">*</span>
                    </label>
                    <input 
                      type="text" 
                      required
                      value={fullNamaPanggilan}
                      onChange={e => setFullNamaPanggilan(e.target.value)}
                      placeholder="Contoh: Budi"
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:ring-2 focus:ring-amber-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Nama Lengkap
                    </label>
                    <input 
                      type="text" 
                      value={fullNamaLengkap}
                      onChange={e => setFullNamaLengkap(e.target.value)}
                      placeholder="Contoh: Budi Santoso"
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:ring-2 focus:ring-amber-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Nomor WhatsApp / HP
                    </label>
                    <input 
                      type="text" 
                      value={fullNoHp}
                      onChange={e => setFullNoHp(e.target.value)}
                      placeholder="Contoh: 081234567890"
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:ring-2 focus:ring-amber-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Jenis Kelamin
                    </label>
                    <select 
                      value={fullJenisKelamin}
                      onChange={e => setFullJenisKelamin(e.target.value as any)}
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white outline-none"
                    >
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Tanggal Lahir
                    </label>
                    <input 
                      type="date" 
                      value={fullTanggalLahir}
                      onChange={e => setFullTanggalLahir(e.target.value)}
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      URL Foto Profil (Opsional)
                    </label>
                    <input 
                      type="url" 
                      value={fullFotoUrl}
                      onChange={e => setFullFotoUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Alamat Lengkap
                  </label>
                  <input 
                    type="text" 
                    value={fullAlamat}
                    onChange={e => setFullAlamat(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Minat / Bakat (Opsional)
                  </label>
                  <input 
                    type="text" 
                    value={fullMinat}
                    onChange={e => setFullMinat(e.target.value)}
                    placeholder="Contoh: Olahraga Voli, Musik, Seni Rupa"
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white outline-none"
                  />
                </div>

                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-300 flex justify-between items-center">
                  <span>ID Anggota Otomatis:</span>
                  <span className="font-mono text-sm font-black text-amber-400">{generateNextId()}</span>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black py-4 rounded-2xl shadow-lg dark:shadow-none transition-all text-sm tracking-wide"
                >
                  📝 Simpan & Buat Akun Lengkap
                </button>
              </form>
            </div>
          )}

          {/* CARA 3: DAFTAR MASSAL */}
          {tambahMode === "MASSAL" && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl dark:shadow-none">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                  <div className="w-12 h-12 bg-indigo-900/50 text-indigo-300 rounded-2xl border border-indigo-700/50 flex items-center justify-center font-black text-xl">
                    📋
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-base">Pendaftaran Massal (Satu Nama Per Baris)</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Daftarkan puluhan anggota sekaligus dengan menempelkan daftar nama.</p>
                  </div>
                </div>

                <form onSubmit={handleDaftarMassalSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Daftar Nama Panggilan (1 Nama Per Baris)
                    </label>
                    <textarea 
                      rows={6}
                      required
                      value={massNamesInput}
                      onChange={e => setMassNamesInput(e.target.value)}
                      placeholder={"Budi Santoso\nSari Rahayu\nJoko Susilo\nDewi Lestari\nAhmad Fauzi"}
                      className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-sm font-mono text-white focus:ring-2 focus:ring-amber-400 outline-none leading-relaxed"
                    />
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-400 dark:text-slate-500 px-1">
                    <span>Estimasi Jumlah Terdeteksi: <strong className="text-amber-300">{massNamesInput.split("\n").filter(l => l.trim()).length}</strong> nama</span>
                    <span>Format ID Awal: <strong className="font-mono text-amber-300">{generateNextId()}</strong></span>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-amber-300 font-black py-4 rounded-2xl shadow-lg dark:shadow-none transition-all text-sm tracking-wide"
                  >
                    ⚡ Proses & Generate ID Massal
                  </button>
                </form>
              </div>

              {/* HASIL MASSAL TABLE */}
              {massResultMembers && massResultMembers.length > 0 && (
                <div className="bg-slate-900 p-6 rounded-3xl border border-emerald-900/40 space-y-4 shadow-xl dark:shadow-none">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
                    <div>
                      <h4 className="font-extrabold text-emerald-400 text-base flex items-center gap-2">
                        <CheckCircle2 size={20} /> Hasil Pendaftaran Massal ({massResultMembers.length} Akun)
                      </h4>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          const allText = massResultMembers.map(m => `${m.Nama_Lengkap}: ${m.ID_Anggota}`).join("\n");
                          navigator.clipboard.writeText(allText);
                          showToast("Daftar ID berhasil disalin ke clipboard!", "success");
                        }}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5"
                      >
                        <Copy size={14} /> Salin Semua
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-3">Nama Anggota</th>
                          <th className="p-3">ID Permanen</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Aksi WA</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {massResultMembers.map((m, idx) => (
                          <tr key={idx}>
                            <td className="p-3 font-bold text-white">{m.Nama_Lengkap}</td>
                            <td className="p-3 font-mono font-black text-amber-400">{m.ID_Anggota}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-full text-[10px] font-bold">
                                BERHASIL
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button 
                                onClick={() => sendWaMessage(m.No_HP || "", `Halo ${m.Nama_Lengkap}, akun aplikasi Remaja Legok 03 Anda telah aktif!\n\nID Anggota: *${m.ID_Anggota}* (Permanen)`)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1"
                              >
                                <Share2 size={12} /> Kirim WA
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ARSIP ANGGOTA */}
      {/* ========================================================================= */}
      {activeSubTab === "arsip" && (
        <div className="space-y-6">
          <div className="bg-amber-950/30 border border-amber-800/40 p-4 rounded-2xl text-xs text-amber-200 leading-relaxed flex items-start gap-3">
            <Archive size={24} className="shrink-0 text-amber-400 mt-0.5" />
            <div>
              <p className="font-extrabold text-amber-300 text-sm">💡 Ketentuan Arsip Anggota Permanen</p>
              <p className="mt-1 text-slate-300">
                Sesuai filosofi dasar aplikasi Remaja Legok 03, **data anggota tidak pernah dihapus secara permanen**. Member yang diarsip tidak akan muncul di daftar umum aktif, namun seluruh ID, riwayat iuran, absensi, dan transaksi kas tetap tersimpan utuh di database.
              </p>
            </div>
          </div>

          <div className="bg-slate-900 p-4 md:p-6 rounded-3xl border border-slate-800 space-y-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
              <input 
                type="text"
                value={arsipSearchQuery}
                onChange={e => setArsipSearchQuery(e.target.value)}
                placeholder="Cari dalam arsip (Nama, ID, No HP)..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs md:text-sm text-white placeholder-slate-500 outline-none"
              />
            </div>

            {archivedMembers.length === 0 ? (
              <div className="p-12 text-center">
                <Archive size={40} className="mx-auto text-slate-600 dark:text-slate-400 mb-2" />
                <p className="font-bold text-slate-400 dark:text-slate-500 text-sm">Belum ada anggota yang diarsip</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {archivedMembers
                  .filter(a => !arsipSearchQuery || a.Nama_Lengkap?.toLowerCase().includes(arsipSearchQuery.toLowerCase()) || a.ID_Anggota?.toLowerCase().includes(arsipSearchQuery.toLowerCase()))
                  .map(a => (
                    <div key={a.ID_Anggota} className="bg-slate-950/80 p-5 rounded-3xl border border-slate-800 grayscale hover:grayscale-0 transition-all flex flex-col justify-between space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-slate-800 text-slate-400 dark:text-slate-500 rounded-2xl flex items-center justify-center font-bold text-base">
                            {a.Nama_Panggilan?.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-200 text-sm">{a.Nama_Lengkap}</h4>
                            <div className="font-mono text-amber-400 text-xs font-black">{a.ID_Anggota}</div>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 bg-slate-800 text-slate-400 dark:text-slate-500 rounded-full text-[10px] font-bold">
                          DIARSIP
                        </span>
                      </div>

                      <div className="p-3 bg-slate-900 rounded-2xl text-xs text-slate-400 dark:text-slate-500 space-y-1 font-mono">
                        <div>Diarsip Oleh: <strong className="text-slate-200">{a.Diarsip_Oleh || "Super Admin"}</strong></div>
                        <div>Tanggal Arsip: <strong className="text-slate-200">{a.Tanggal_Arsip || "-"}</strong></div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-slate-800">
                        <button 
                          onClick={() => setMemberHistoryTarget(a)}
                          className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                        >
                          <Eye size={14} /> Lihat Riwayat
                        </button>
                        <button 
                          onClick={() => setRestoreTargetMember(a)}
                          className="flex-1 py-2 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                        >
                          <RotateCcw size={14} /> Kembalikan
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB PEMBAYARAN */}
      {/* ========================================================================= */}
      {activeSubTab === "pembayaran" && (
        <ManajemenPembayaran 
            appData={appData}
            setAppData={setAppData}
            showToast={showToast}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 4: KELOLA JABATAN */}
      {/* ========================================================================= */}
      {activeSubTab === "jabatan" && (
        <div className="space-y-6">
          
          {/* CURRENT STRUCTURE */}
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <Crown className="text-amber-400" size={24} />
              <div>
                <h3 className="font-black text-white text-base">Struktur Jabatan Organisasi Saat Ini</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">Pengurus aktif yang memegang amanah di RT 03 Legok RW 04 Denokan.</p>
              </div>
            </div>

            {/* KETUA REMI CARD */}
            <div className="p-5 bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 rounded-2xl border border-amber-400/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-amber-400 text-slate-950 rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg dark:shadow-none">
                  👑
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">KETUA REMAJA LEGOK 03</span>
                  <h4 className="text-lg font-black text-white">
                    {appData.Jabatan?.Ketua?.Nama || "Belum Ditunjuk"}
                  </h4>
                  <p className="text-xs font-mono text-purple-200">
                    ID: {appData.Jabatan?.Ketua?.ID_Anggota || "-"} | Menjabat sejak: {appData.Jabatan?.Ketua?.Tanggal_Mulai || "-"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-full text-xs font-bold">
                  AKSES FULL SA
                </span>
              </div>
            </div>
          </div>

          {/* FORM TUNJUK KETUA BARU */}
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl dark:shadow-none">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="w-10 h-10 bg-amber-400/10 text-amber-300 rounded-xl flex items-center justify-center font-bold">
                👑
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">Tunjuk Ketua Remaja Baru</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">Proses pergantian Ketua Remaja memerlukan konfirmasi PIN Super Admin.</p>
              </div>
            </div>

            <form onSubmit={handleTunjukKetuaSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Pilih Anggota Calon Ketua <span className="text-rose-400">*</span>
                </label>
                <select 
                  required
                  value={selectedKetuaTargetId}
                  onChange={e => setSelectedKetuaTargetId(e.target.value)}
                  className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-white focus:ring-2 focus:ring-amber-400 outline-none"
                >
                  <option value="">-- Pilih Anggota --</option>
                  {activeMembers.map(a => (
                    <option key={a.ID_Anggota} value={a.ID_Anggota}>
                      {a.Nama_Lengkap} ({a.ID_Anggota})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Tanggal Resmi Mulai Menjabat
                </label>
                <input 
                  type="date"
                  required
                  value={ketuaStartDateInput}
                  onChange={e => setKetuaStartDateInput(e.target.value)}
                  className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-white outline-none"
                />
              </div>

              <PINField
                id="pin-tunjuk-ketua-sa"
                label="🔑 PIN Super Admin Verifikasi (10 Digit Waktu)"
                value={ketuaPinInput}
                onChange={setKetuaPinInput}
                maxLength={10}
                placeholder="••••••••••"
                inputClassName="focus:ring-amber-400 font-mono text-center tracking-widest text-lg"
              />

              <button 
                type="submit"
                className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black py-4 rounded-2xl shadow-lg dark:shadow-none transition-all text-sm tracking-wide"
              >
                👑 Resmi Tunjuk Sebagai Ketua Baru
              </button>
            </form>
          </div>

          {/* MATRIKS IZIN KAS PER JABATAN */}
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl dark:shadow-none">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-black text-white text-base">Matriks Izin Modul Kas Per Jabatan</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">Atur batasan wewenang setiap jabatan terhadap modul keuangan.</p>
              </div>
              <button 
                onClick={handleSaveKasPermissions}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold text-xs rounded-xl transition-all shadow-md dark:shadow-none"
              >
                💾 Simpan Matriks
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Jabatan</th>
                    <th className="p-3 text-center">Input Masuk</th>
                    <th className="p-3 text-center">Input Keluar</th>
                    <th className="p-3 text-center">Lihat Detail</th>
                    <th className="p-3 text-center">Lihat Iuran</th>
                    <th className="p-3 text-center">Hapus Transaksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {kasPermissionsState.map((perm, idx) => (
                    <tr key={idx}>
                      <td className="p-3 font-bold text-white">{perm.jabatan}</td>
                      <td className="p-3 text-center">
                        <input 
                          type="checkbox"
                          checked={perm.bisaInputMasuk}
                          onChange={e => {
                            const updated = [...kasPermissionsState];
                            updated[idx].bisaInputMasuk = e.target.checked;
                            setKasPermissionsState(updated);
                          }}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-400"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <input 
                          type="checkbox"
                          checked={perm.bisaInputKeluar}
                          onChange={e => {
                            const updated = [...kasPermissionsState];
                            updated[idx].bisaInputKeluar = e.target.checked;
                            setKasPermissionsState(updated);
                          }}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-400"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <input 
                          type="checkbox"
                          checked={perm.bisaLihatDetail}
                          onChange={e => {
                            const updated = [...kasPermissionsState];
                            updated[idx].bisaLihatDetail = e.target.checked;
                            setKasPermissionsState(updated);
                          }}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-400"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <input 
                          type="checkbox"
                          checked={perm.bisaLihatIuran}
                          onChange={e => {
                            const updated = [...kasPermissionsState];
                            updated[idx].bisaLihatIuran = e.target.checked;
                            setKasPermissionsState(updated);
                          }}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-400"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <input 
                          type="checkbox"
                          checked={perm.bisaHapus}
                          onChange={e => {
                            const updated = [...kasPermissionsState];
                            updated[idx].bisaHapus = e.target.checked;
                            setKasPermissionsState(updated);
                          }}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-400"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ================================================================ */}
          {/* F.4 DAFTAR PENGAJUAN PENGUNDURAN DIRI JABATAN */}
          {/* ================================================================ */}
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl dark:shadow-none">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="p-2 bg-amber-400/10 text-amber-400 rounded-xl">
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">Persetujuan Pengunduran Diri (Matriks F.4)</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">Daftar pengajuan pengunduran diri jabatan yang memerlukan persetujuan hirarki kepengurusan.</p>
              </div>
            </div>

            {(!appData.PengunduranDiri || appData.PengunduranDiri.length === 0) ? (
              <p className="text-xs text-slate-500 italic p-4 text-center bg-slate-950/50 rounded-2xl border border-slate-800/50">
                Belum ada pengajuan pengunduran diri jabatan saat ini.
              </p>
            ) : (
              <div className="space-y-3">
                {appData.PengunduranDiri.map((req) => {
                  const applicantMember = appData.Anggota.find(a => a.ID_Anggota === req.IDPengaju);
                  const requiredApprovalRole = getApprovalRoleForResignation(req.Jabatan);

                  return (
                    <div key={req.ID} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white text-sm">
                            {applicantMember?.Nama_Lengkap || req.IDPengaju}
                          </span>
                          <span className="px-2.5 py-0.5 bg-purple-950 text-purple-300 border border-purple-800 rounded-full text-[10px] font-bold">
                            {req.Jabatan}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            req.Status === 'Pending' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                            req.Status === 'Disetujui' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                            'bg-rose-950 text-rose-400 border border-rose-800'
                          }`}>
                            {req.Status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          <span className="font-semibold text-slate-300">Alasan:</span> "{req.Alasan}"
                        </p>
                        <p className="text-[11px] font-mono text-slate-500">
                          Pengajuan: {req.TanggalPengajuan} | Wajib Disetujui Oleh: <span className="text-amber-400 font-bold">{requiredApprovalRole}</span>
                        </p>
                      </div>

                      {req.Status === "Pending" && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApproveResignation(req.ID, req.IDPengaju, req.Jabatan, req.Alasan)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                          >
                            <CheckCircle2 size={14} /> Setujui (Eksekusi F.2/F.3)
                          </button>
                          <button
                            onClick={() => handleRejectResignation(req.ID, req.Jabatan)}
                            className="px-3 py-2 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
                          >
                            Tolak
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ================================================================ */}
          {/* F.1 / F.2 / F.3 DAFTAR JABATAN KOSONG */}
          {/* ================================================================ */}
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl dark:shadow-none">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-400/10 text-amber-400 rounded-xl">
                  <Award size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Pengisian Jabatan Kosong (F.1 / F.2 / F.3)</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Posisi kepengurusan yang sedang terbuka untuk diisi oleh Ketua Baru / Super Admin.</p>
                </div>
              </div>
            </div>

            {(!appData.JabatanKosong || appData.JabatanKosong.filter(j => j.Status === "BelumTerisi").length === 0) ? (
              <p className="text-xs text-slate-500 italic p-4 text-center bg-slate-950/50 rounded-2xl border border-slate-800/50">
                Semua posisi kepengurusan saat ini sudah terisi dengan lengkap! 🎉
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {appData.JabatanKosong.filter(j => j.Status === "BelumTerisi").map((jk) => (
                  <div key={jk.ID} className="p-4 bg-slate-950 border border-amber-500/30 rounded-2xl space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center">
                        <h4 className="font-black text-amber-400 text-sm">{jk.Jabatan}</h4>
                        <span className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-800 rounded-full text-[10px] font-extrabold uppercase">
                          Kosong
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-500 mt-1">
                        Terbuka sejak: {jk.Tanggal}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setFillVacantModal(jk);
                        setFillMemberTargetId("");
                      }}
                      className="w-full py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <UserPlus size={14} /> Isi Posisi {jk.Jabatan}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: STATISTIK ANGGOTA */}
      {/* ========================================================================= */}
      {activeSubTab === "statistik" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* GENDER DISTRIBUTION */}
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4">
              <h4 className="font-extrabold text-white text-sm uppercase tracking-wider">Demografi Jenis Kelamin</h4>
              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-blue-400">Laki-laki</span>
                    <span className="text-slate-300">
                      {activeMembers.filter(a => a.Jenis_Kelamin === "Laki-laki").length} Anggota (
                      {Math.round((activeMembers.filter(a => a.Jenis_Kelamin === "Laki-laki").length / (activeCount || 1)) * 100)}%)
                    </span>
                  </div>
                  <div className="h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${Math.round((activeMembers.filter(a => a.Jenis_Kelamin === "Laki-laki").length / (activeCount || 1)) * 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-pink-400">Perempuan</span>
                    <span className="text-slate-300">
                      {activeMembers.filter(a => a.Jenis_Kelamin === "Perempuan").length} Anggota (
                      {Math.round((activeMembers.filter(a => a.Jenis_Kelamin === "Perempuan").length / (activeCount || 1)) * 100)}%)
                    </span>
                  </div>
                  <div className="h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className="h-full bg-pink-500 rounded-full transition-all"
                      style={{ width: `${Math.round((activeMembers.filter(a => a.Jenis_Kelamin === "Perempuan").length / (activeCount || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* AUDIT PROFIL BELUM LENGKAP */}
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4">
              <h4 className="font-extrabold text-white text-sm uppercase tracking-wider">Audit Kelengkapan Profil</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {activeMembers.filter(a => !a.Nama_Lengkap || !a.No_HP || !a.Tanggal_Lahir).map(m => (
                  <div key={m.ID_Anggota} className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white">{m.Nama_Panggilan} ({m.ID_Anggota})</div>
                      <div className="text-[10px] text-amber-400">
                        Belum lengkap: {!m.Nama_Lengkap ? "Nama Lengkap, " : ""}{!m.No_HP ? "No HP, " : ""}{!m.Tanggal_Lahir ? "Tanggal Lahir" : ""}
                      </div>
                    </div>
                    <button 
                      onClick={() => sendWaMessage(m.No_HP || "", `Halo ${m.Nama_Panggilan || m.Nama_Lengkap}, mohon lengkapi profil Anda di aplikasi Remaja Legok 03. ID Anda: ${m.ID_Anggota}`)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px]"
                    >
                      Ingatkan WA
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: POPUP AKUN BERHASIL DIBUAT */}
      {/* ========================================================================= */}
      {accountCreatedSuccess && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-400/50 p-6 rounded-3xl max-w-md w-full text-center space-y-5 shadow-2xl relative animate-in zoom-in-95">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/30 flex items-center justify-center mx-auto text-3xl font-black">
              ✓
            </div>

            <div>
              <span className="px-3 py-1 bg-amber-400/10 border border-amber-400/30 text-amber-300 rounded-full text-[10px] font-black uppercase">
                BERHASIL DIBUAT
              </span>
              <h3 className="text-xl font-black text-white mt-2">Akun Anggota Siap!</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">{accountCreatedSuccess.Nama_Lengkap}</p>
            </div>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">ID ANGGOTA PERMANEN</span>
              <div className="text-2xl font-mono font-black text-amber-400 tracking-wider">
                {accountCreatedSuccess.ID_Anggota}
              </div>
              <p className="text-[9px] text-amber-500 italic">*ID ini bersifat permanen seumur hidup</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(accountCreatedSuccess.ID_Anggota);
                  setIsCopiedId(true);
                  setTimeout(() => setIsCopiedId(false), 2000);
                }}
                className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Copy size={14} /> {isCopiedId ? "Tersalin! ✓" : "Salin ID"}
              </button>

              <button 
                onClick={() => sendWaMessage(accountCreatedSuccess.No_HP || "", `Selamat datang di Remaja Legok 03!\n\nNama: ${accountCreatedSuccess.Nama_Lengkap}\nID Anggota Anda: *${accountCreatedSuccess.ID_Anggota}*\n\nGunakan ID ini untuk login di aplikasi.`)}
                className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Share2 size={14} /> Bagikan WA
              </button>
            </div>

            <button 
              onClick={() => setAccountCreatedSuccess(null)}
              className="w-full py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black rounded-xl text-xs"
            >
              Tutup & Selesai
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ARSIP ANGGOTA VERIFIKASI SA PIN */}
      {/* ========================================================================= */}
      {archiveTargetMember && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-800/60 p-6 rounded-3xl max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h4 className="font-extrabold text-rose-400 text-base flex items-center gap-2">
                <Archive size={18} /> Konfirmasi Arsip Anggota
              </h4>
              <button onClick={() => setArchiveTargetMember(null)} className="text-slate-400 dark:text-slate-500 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Anda akan mengarsipkan <strong className="text-white">{archiveTargetMember.Nama_Lengkap}</strong> ({archiveTargetMember.ID_Anggota}). Data akan disembunyikan dari daftar aktif namun tersimpan permanen.
            </p>

            <form onSubmit={handleSingleArchiveConfirm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 mb-1">Alasan Diarsip (Opsional)</label>
                <input 
                  type="text" 
                  value={archiveReason}
                  onChange={e => setArchiveReason(e.target.value)}
                  placeholder="Contoh: Pindah domisili / Lulus"
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none"
                />
              </div>

              <PINField
                id="pin-arsip-sa"
                label="🔑 PIN Super Admin Verifikasi (10 Digit Waktu)"
                value={archivePinInput}
                onChange={setArchivePinInput}
                maxLength={10}
                placeholder="••••••••••"
                inputClassName="focus:ring-rose-500 font-mono text-center tracking-widest text-lg"
              />

              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setArchiveTargetMember(null)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-lg dark:shadow-none"
                >
                  🗄️ Ya, Arsipkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: KARTU ID DIGITAL */}
      {/* ========================================================================= */}
      {idCardMember && (
        <KartuAnggotaModal
          member={idCardMember}
          viewerRole="SUPER_ADMIN"
          onClose={() => setIdCardMember(null)}
          showToast={showToast}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT DATA ANGGOTA */}
      {/* ========================================================================= */}
      {editingMember && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h4 className="font-extrabold text-white text-base">Edit Data Anggota ({editingMember.ID_Anggota})</h4>
              <button onClick={() => setEditingMember(null)} className="text-slate-400 dark:text-slate-500 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditMember} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 mb-1">Nama Lengkap</label>
                <input 
                  type="text" 
                  value={editingMember.Nama_Lengkap}
                  onChange={e => setEditingMember({ ...editingMember, Nama_Lengkap: e.target.value })}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 mb-1">Nama Panggilan</label>
                <input 
                  type="text" 
                  value={editingMember.Nama_Panggilan}
                  onChange={e => setEditingMember({ ...editingMember, Nama_Panggilan: e.target.value })}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 mb-1">No WhatsApp</label>
                <input 
                  type="text" 
                  value={editingMember.No_HP}
                  onChange={e => setEditingMember({ ...editingMember, No_HP: e.target.value })}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 mb-1">Jabatan</label>
                <select 
                  value={editingMember.Jabatan || "Anggota Biasa"}
                  onChange={e => setEditingMember({ ...editingMember, Jabatan: e.target.value === "Anggota Biasa" ? "" : e.target.value })}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none"
                >
                  <option value="">Anggota Biasa</option>
                  {[
                    "Ketua", "Wakil Ketua", "Bendahara", "Wakil Bendahara",
                    "Sekretaris", "Wakil Sekretaris", "Ketua Humas", "Humas"
                  ].map(jabatan => {
                    const isTaken = appData.Anggota.some(a => 
                      a.Jabatan === jabatan && 
                      a.ID_Anggota !== editingMember.ID_Anggota &&
                      jabatan !== "Humas" // Humas doesn't have a limit
                    );
                    return (
                      <option key={jabatan} value={jabatan} disabled={isTaken}>
                        {jabatan} {isTaken ? "(Sudah terisi)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 mb-1">Status Akses</label>
                <select 
                  value={editingMember.Status_Aktif}
                  onChange={e => setEditingMember({ ...editingMember, Status_Aktif: e.target.value as any })}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none"
                >
                  <option value="AKTIF">AKTIF</option>
                  <option value="NONAKTIF">NONAKTIF</option>
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setEditingMember(null)}
                  className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md dark:shadow-none"
                >
                  💾 Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DETAIL DATA ANGGOTA & RESET PIN */}
      {/* ========================================================================= */}
      {selectedMemberDetail && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-md w-full space-y-5 relative animate-in zoom-in-95">
            <button 
              onClick={() => setSelectedMemberDetail(null)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-purple-500/10 text-purple-400 rounded-2xl flex items-center justify-center mx-auto text-2xl font-black border border-purple-500/20">
                {selectedMemberDetail.Nama_Panggilan?.charAt(0) || selectedMemberDetail.Nama_Lengkap?.charAt(0)}
              </div>
              <h3 className="text-lg font-black text-white">{selectedMemberDetail.Nama_Lengkap}</h3>
              <p className="text-xs text-slate-400">"{selectedMemberDetail.Nama_Panggilan}"</p>
              <div className="inline-block font-mono text-xs font-black text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
                {selectedMemberDetail.ID_Anggota}
              </div>
            </div>

            <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs text-slate-300">
              <div className="flex justify-between py-1.5 border-b border-slate-800/40">
                <span className="text-slate-400">Status Akses:</span>
                <span className="font-bold text-emerald-400">{selectedMemberDetail.Status_Aktif || "AKTIF"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/40">
                <span className="text-slate-400">No WhatsApp:</span>
                <span className="font-mono text-white">{selectedMemberDetail.No_HP || "-"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/40">
                <span className="text-slate-400">Jenis Kelamin:</span>
                <span className="text-white">{selectedMemberDetail.Jenis_Kelamin || "-"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/40">
                <span className="text-slate-400">Tanggal Daftar:</span>
                <span className="font-mono text-white">{selectedMemberDetail.Tanggal_Daftar || "-"}</span>
              </div>
              <div className="flex justify-between py-1.5 font-sans">
                <span className="text-slate-400">Alamat:</span>
                <span className="text-right text-white max-w-[200px] truncate" title={selectedMemberDetail.Alamat}>{selectedMemberDetail.Alamat || "-"}</span>
              </div>
            </div>

            {/* SECURE PIN ACTION PANEL FOR SUPER ADMIN */}
            <div className="p-4 bg-rose-950/20 border border-rose-800/30 rounded-2xl space-y-3">
              <div className="flex items-start gap-2">
                <Lock className="text-rose-400 shrink-0 mt-0.5" size={16} />
                <div>
                  <h4 className="text-xs font-black text-rose-300">Otoritas Keamanan: PIN Reset</h4>
                  <p className="text-[10px] text-rose-400/80 leading-relaxed">
                    Setiap anggota yang lupa PIN dapat mengajukan permohonan reset. Setelah disetujui, Anda dapat mereset PIN mereka di bawah ini.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Apakah Anda yakin ingin mereset PIN untuk ${selectedMemberDetail.Nama_Lengkap}? Anggota harus membuat PIN baru pada login berikutnya.`)) {
                    localStorage.removeItem(`remaja_legok_pin_${selectedMemberDetail.ID_Anggota}`);
                    showToast(`PIN untuk ${selectedMemberDetail.Nama_Panggilan} berhasil direset! 🔐`, "success");
                    setSelectedMemberDetail(null);
                  }
                }}
                className="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <RefreshCw size={12} /> Setel Ulang (Reset) PIN Anggota
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSelectedMemberDetail(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PENGISIAN JABATAN KOSONG */}
      {/* ========================================================================= */}
      {fillVacantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => setFillVacantModal(null)} 
            className="fixed inset-0 bg-black/70 backdrop-blur-md animate-in fade-in" 
          />

          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 max-w-md w-full relative z-10 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm">
                <Crown size={20} />
                <span>Pengisian Posisi: {fillVacantModal.Jabatan}</span>
              </div>
              <button 
                onClick={() => setFillVacantModal(null)}
                className="p-1 text-slate-400 hover:text-white rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Pilih anggota aktif yang akan ditunjuk untuk menduduki posisi <span className="font-bold text-amber-300">{fillVacantModal.Jabatan}</span>.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                Pilih Anggota Aktif <span className="text-rose-400">*</span>
              </label>
              <select
                value={fillMemberTargetId}
                onChange={e => setFillMemberTargetId(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:ring-2 focus:ring-amber-400 outline-none"
              >
                <option value="">-- Pilih Anggota --</option>
                {activeMembers.map(a => (
                  <option key={a.ID_Anggota} value={a.ID_Anggota}>
                    {a.Nama_Lengkap} ({a.ID_Anggota}) - {a.Jabatan || "Anggota"}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFillVacantModal(null)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-bold transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!fillMemberTargetId}
                onClick={handleFillVacantPosition}
                className="flex-1 py-3 bg-amber-400 hover:bg-amber-500 disabled:bg-slate-700 text-slate-950 font-black text-xs rounded-2xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 size={16} /> Resmi Tunjuk
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
