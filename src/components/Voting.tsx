import React, { useState } from "react";
import { 
  Vote, Plus, Trash2, CheckCircle2, Clock, Lock, Unlock, Users, 
  Calendar, AlertCircle, X, ChevronRight, BarChart3, Info
} from "lucide-react";
import { AppData, addLogAkses, filterKontenByAkses } from "../utils/dataStore";
import { VotingItem, VotingOption, UserRole, ContentVisibility } from "../types";
import { useLocale } from "../hooks/useLocale";

interface VotingProps {
  appData: AppData;
  setAppData: React.Dispatch<React.SetStateAction<AppData>>;
  userRole: UserRole;
  currentUserId?: string;
  currentUserName?: string;
  showToast: (
    msg: string,
    type: "success" | "error" | "info" | "warning"
  ) => void;
}

// ============================================================
// TRANS-LITERATION DICTIONARY FOR VOTING (ID, EN, JV)
// ============================================================
const VOTE_I18N: Record<string, Record<string, string>> = {
  id: {
    title: "Pemilihan Suara (Voting)",
    subtitle: "Suara Anda menentukan masa depan komunitas. Berpartisipasi secara aktif, rahasia, dan transparan.",
    btn_create: "Buat Voting Baru",
    no_votes: "Belum ada agenda voting yang tersedia untuk tingkat akses Anda.",
    status_active: "Sedang Berlangsung",
    status_ended: "Sudah Berakhir",
    ends_on: "Berakhir pada",
    created_by: "Dibuat oleh",
    total_votes: "Total Suara",
    voted_badge: "Pilihan Anda",
    btn_cast: "Kirim Suara",
    guest_alert: "Mode Tamu Terbatas",
    guest_desc: "Tamu hanya dapat melihat persentase hasil sementara. Silakan masuk sebagai Anggota menggunakan ID dan PIN Anda untuk dapat memberikan suara.",
    need_login: "Harap Masuk Sesi untuk Memilih",
    btn_login_prompt: "Masuk Sesi Aman",
    form_title: "Buat Agenda Voting Baru",
    label_title: "Judul Pemilihan",
    label_desc: "Deskripsi / Pertanyaan",
    label_end_date: "Tanggal Berakhir",
    label_visibility: "Tingkat Akses (Visibilitas)",
    label_options: "Pilihan Jawaban / Opsi",
    placeholder_option: "Masukkan nama pilihan...",
    btn_add_option: "Tambah Opsi",
    btn_save: "Terbitkan Pemilihan",
    btn_cancel: "Batal",
    error_empty_title: "Judul voting tidak boleh kosong!",
    error_empty_desc: "Deskripsi voting tidak boleh kosong!",
    error_min_options: "Harap masukkan minimal 2 pilihan opsi jawaban!",
    error_empty_option: "Nama opsi pilihan tidak boleh kosong!",
    error_past_date: "Tanggal berakhir harus di masa depan!",
    success_create: "Agenda voting baru berhasil diterbitkan! 🗳️",
    success_vote: "Suara Anda berhasil dicatat! Terima kasih atas partisipasi Anda. 🌟",
    success_delete: "Agenda voting berhasil dihapus.",
    success_end: "Pemilihan suara diselesaikan secara manual.",
    confirm_delete: "Apakah Anda yakin ingin menghapus agenda voting ini secara permanen?",
    confirm_end: "Apakah Anda yakin ingin menyelesaikan voting ini sekarang? Hasil saat ini akan dikunci sebagai hasil akhir.",
    btn_end_manual: "Selesaikan Sekarang",
    btn_delete: "Hapus",
    access_public: "Publik (Semua Orang)",
    access_member: "Anggota (Hanya Anggota Terdaftar)",
    access_board: "Pengurus (Hanya Pengurus)"
  },
  en: {
    title: "Community Polling & Voting",
    subtitle: "Your voice shapes the future of our community. Participate actively, securely, and transparently.",
    btn_create: "Create New Poll",
    no_votes: "No voting agendas are currently available for your access level.",
    status_active: "Active / Ongoing",
    status_ended: "Closed / Ended",
    ends_on: "Ends on",
    created_by: "Created by",
    total_votes: "Total Votes",
    voted_badge: "Your Vote",
    btn_cast: "Submit Vote",
    guest_alert: "Guest Mode Restricted",
    guest_desc: "Guests can only view dynamic percentages. Please login as a registered member with your ID and PIN to cast your vote.",
    need_login: "Login to Cast Vote",
    btn_login_prompt: "Secure Login",
    form_title: "Create New Polling Agenda",
    label_title: "Poll Title",
    label_desc: "Description / Question",
    label_end_date: "End Date",
    label_visibility: "Visibility Access",
    label_options: "Answer Choices / Options",
    placeholder_option: "Enter option text...",
    btn_add_option: "Add Option",
    btn_save: "Publish Poll",
    btn_cancel: "Cancel",
    error_empty_title: "Poll title cannot be empty!",
    error_empty_desc: "Poll description cannot be empty!",
    error_min_options: "Please provide at least 2 choice options!",
    error_empty_option: "Choice option name cannot be empty!",
    error_past_date: "End date must be in the future!",
    success_create: "New voting agenda successfully published! 🗳️",
    success_vote: "Your vote has been successfully cast! Thank you for participating. 🌟",
    success_delete: "Voting agenda successfully deleted.",
    success_end: "Voting ended manually.",
    confirm_delete: "Are you sure you want to permanently delete this voting agenda?",
    confirm_end: "Are you sure you want to close this poll now? Current results will be locked as the final outcome.",
    btn_end_manual: "Close Poll Now",
    btn_delete: "Delete",
    access_public: "Public (Everyone)",
    access_member: "Members (Registered Only)",
    access_board: "Board (Board Members Only)"
  },
  jv: {
    title: "Pemilihan Suara (Voting)",
    subtitle: "Suara panjenengan nemtokake masa depan komunitas. Monggo berpartisipasi kanthi aktif, rahasia, lan transparan.",
    btn_create: "Damel Voting Enggal",
    no_votes: "Dereng wonten agenda voting ingkang kasedhiya kagem tingkat akses panjenengan.",
    status_active: "Saweg Lumaku",
    status_ended: "Sampun Rampung",
    ends_on: "Rampung ing tanggal",
    created_by: "Dipundamel dening",
    total_votes: "Gunggung Suara",
    voted_badge: "Pilihan Sampeyan",
    btn_cast: "Kirim Suara",
    guest_alert: "Mode Tamu Diwatesi",
    guest_desc: "Tamu namung saget mirsani persentase asil sawetara. Monggo mlebet rumiyin ngginakaken ID lan PIN kagem nyoblos.",
    need_login: "Monggo Mlebet Sesi kagem Nyoblos",
    btn_login_prompt: "Mlebet Sesi Aman",
    form_title: "Damel Agenda Voting Enggal",
    label_title: "Irah-irahan Voting",
    label_desc: "Katrangan / Pitakonan",
    label_end_date: "Tanggal Rampung",
    label_visibility: "Tingkat Akses (Visibilitas)",
    label_options: "Pilihan Wangsulan / Opsi",
    placeholder_option: "Lebetaken nama pilihan...",
    btn_add_option: "Tambah Opsi",
    btn_save: "Terbitaken Voting",
    btn_cancel: "Batal",
    error_empty_title: "Irah-irahan voting mboten pareng kosong!",
    error_empty_desc: "Katrangan voting mboten pareng kosong!",
    error_min_options: "Monggo lebetaken minimal 2 pilihan opsi wangsulan!",
    error_empty_option: "Nama opsi pilihan mboten pareng kosong!",
    error_past_date: "Tanggal rampung kedah ing dinten mbenjang!",
    success_create: "Agenda voting enggal kasil diterbitaken! 🗳️",
    success_vote: "Suara panjenengan sampun kacathet! Matur nuwun partisipasine. 🌟",
    success_delete: "Agenda voting kasil dipun-hapus.",
    success_end: "Pemilihan suara dipun-rampungaken sacara manual.",
    confirm_delete: "Nopo panjenengan yakin badhe mbusak agenda voting niki sacara permanen?",
    confirm_end: "Nopo panjenengan yakin badhe ngrampungi voting niki sakniki? Asil sakniki badhe dipunkunci.",
    btn_end_manual: "Rampungaken Sakniki",
    btn_delete: "Hapus",
    access_public: "Publik (Sinten Kemawon)",
    access_member: "Anggota (Khusus Anggota Mlebet)",
    access_board: "Pengurus (Khusus Pengurus)"
  }
};

export default function Voting({
  appData,
  setAppData,
  userRole,
  currentUserId,
  currentUserName,
  showToast
}: VotingProps) {
  const { currentLanguage } = useLocale();
  const lang = VOTE_I18N[currentLanguage] || VOTE_I18N.id;

  // State Management
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({}); // ID_Voting -> ID_Option
  const [filterStatus, setFilterStatus] = useState<"SEMUA" | "AKTIF" | "SELESAI">("SEMUA");

  // Form Fields State
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newJenis, setNewJenis] = useState<"VotingKetua" | "Umum">("Umum");
  const [newEndDate, setNewEndDate] = useState("");
  const [newVisibility, setNewVisibility] = useState<ContentVisibility>("ANGGOTA");
  const [newOptions, setNewOptions] = useState<string[]>(["", ""]);

  // Tie-breaker modal state for Super Admin election resolution
  const [tieModal, setTieModal] = useState<{
    votingId: string;
    votingTitle: string;
    tiedCandidates: VotingOption[];
    maxVotes: number;
  } | null>(null);

  // Permissions helpers
  const isTamu = userRole === "TAMU";
  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const isPengurus = [
    "SUPER_ADMIN", "ADMIN", "KETUA", "PENGURUS", "SEKRETARIS", "BENDAHARA", "WAKIL_KETUA", "SEKRETARIS", "WAKIL_SEKRETARIS"
  ].includes(userRole);

  const isAdmin = ["SUPER_ADMIN", "ADMIN", "KETUA"].includes(userRole);

  // Retrieve & filter voting list based on access levels
  const rawVotingList = appData.Voting || [];
  const accessibleVotingList = filterKontenByAkses(rawVotingList, userRole);

  // Apply status filters (also evaluate ended date dynamically)
  const todayStr = new Date().toISOString().split("T")[0];

  const processedVotingList = accessibleVotingList.map(vote => {
    const isPastEnd = vote.Tanggal_Berakhir < todayStr;
    const currentStatus = (vote.Status === "SELESAI" || isPastEnd) ? "SELESAI" : "AKTIF";
    return { ...vote, Status: currentStatus };
  });

  const filteredVotingList = processedVotingList.filter(vote => {
    if (filterStatus === "SEMUA") return true;
    return vote.Status === filterStatus;
  });

  // Action: Add dynamic option input field
  const handleAddOptionField = () => {
    setNewOptions([...newOptions, ""]);
  };

  // Action: Remove dynamic option input field
  const handleRemoveOptionField = (index: number) => {
    if (newOptions.length <= 2) return;
    const updated = [...newOptions];
    updated.splice(index, 1);
    setNewOptions(updated);
  };

  // Action: Handle option input change
  const handleOptionInputChange = (index: number, val: string) => {
    const updated = [...newOptions];
    updated[index] = val;
    setNewOptions(updated);
  };

  // Action: Publish a new Poll
  const handleCreateVoting = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTitle.trim()) {
      showToast(lang.error_empty_title, "error");
      return;
    }
    if (!newDesc.trim()) {
      showToast(lang.error_empty_desc, "error");
      return;
    }
    if (!newEndDate) {
      showToast(lang.error_past_date, "error");
      return;
    }
    if (newEndDate < todayStr) {
      showToast(lang.error_past_date, "error");
      return;
    }

    const filteredOptions = newOptions.map(o => o.trim()).filter(Boolean);
    if (filteredOptions.length < 2) {
      showToast(lang.error_min_options, "error");
      return;
    }

    const compiledOptions: VotingOption[] = filteredOptions.map((opt, i) => ({
      ID_Option: `OPT-${i + 1}`,
      Nama_Pilihan: opt,
      Jumlah_Suara: 0
    }));

    const newVotingItem: VotingItem = {
      ID_Voting: `VOTE-${Date.now()}`,
      Judul: newTitle.trim(),
      Deskripsi: newDesc.trim(),
      Jenis: newJenis,
      Tanggal_Dibuat: todayStr,
      Tanggal_Berakhir: newEndDate,
      Status: "AKTIF",
      Pilihan: compiledOptions,
      Pemilih: [],
      Kategori_Akses: newVisibility,
      Dibuat_Oleh: currentUserName || "Pengurus"
    };

    const updatedData = {
      ...appData,
      Voting: [newVotingItem, ...rawVotingList]
    };

    const loggedData = addLogAkses(
      updatedData,
      currentUserName || "Pengurus",
      userRole,
      "VOTE_CREATE",
      `Membuat agenda voting baru (${newJenis}): ${newVotingItem.Judul}`,
      currentUserId || "-"
    );

    setAppData(loggedData);
    showToast(lang.success_create, "success");

    // Reset Form & Close Modal
    setShowCreateModal(false);
    setNewTitle("");
    setNewDesc("");
    setNewJenis("Umum");
    setNewEndDate("");
    setNewVisibility("ANGGOTA");
    setNewOptions(["", ""]);
  };

  // Action: Cast a Vote
  const handleCastVote = (votingId: string) => {
    if (isTamu) return;

    const selectedOptId = selectedOptions[votingId];
    if (!selectedOptId) {
      showToast("Pilih salah satu opsi terlebih dahulu!", "warning");
      return;
    }

    const updatedVotingList = rawVotingList.map(vote => {
      if (vote.ID_Voting === votingId) {
        // Prevent double voting
        if (vote.Pemilih.includes(currentUserId || "")) {
          return vote;
        }

        const updatedPilihan = vote.Pilihan.map(opt => {
          if (opt.ID_Option === selectedOptId) {
            return { ...opt, Jumlah_Suara: opt.Jumlah_Suara + 1 };
          }
          return opt;
        });

        return {
          ...vote,
          Pilihan: updatedPilihan,
          Pemilih: [...vote.Pemilih, currentUserId || ""]
        };
      }
      return vote;
    });

    const targetVote = rawVotingList.find(v => v.ID_Voting === votingId);
    const targetOption = targetVote?.Pilihan.find(o => o.ID_Option === selectedOptId);

    const updatedData = {
      ...appData,
      Voting: updatedVotingList
    };

    const loggedData = addLogAkses(
      updatedData,
      currentUserName || "Anggota",
      userRole,
      "VOTE_CAST",
      `Mencoblos pilihan "${targetOption?.Nama_Pilihan}" pada voting "${targetVote?.Judul}"`,
      currentUserId || "-"
    );

    setAppData(loggedData);
    showToast(lang.success_vote, "success");
  };

  // Helper: Execute Winner Logic for Chairman Election (State Machine F.1)
  const executeElectionWinner = (winnerCandidateName: string, votingTitle: string, votingId: string) => {
    // 1. Update Chairman & Demote Old Cabinet
    const cabinetRolesToReset = [
      "WAKIL_KETUA", "SEKRETARIS", "WAKIL_SEKRETARIS",
      "BENDAHARA", "WAKIL_BENDAHARA", "KEPALA_HUMAS", "HUMAS"
    ];

    let winnerFound = false;

    const updatedAnggota = appData.Anggota.map(member => {
      const isWinner = member.Nama_Lengkap?.toLowerCase().trim() === winnerCandidateName.toLowerCase().trim() ||
                       member.Nama_Panggilan?.toLowerCase().trim() === winnerCandidateName.toLowerCase().trim();
      
      const isOldChairman = member.Role === "KETUA" || member.Jabatan?.toLowerCase() === "ketua";
      const isCabinetMember = cabinetRolesToReset.includes(member.Role || "");

      if (isWinner) {
        winnerFound = true;
        return {
          ...member,
          Role: "KETUA" as UserRole,
          Jabatan: "Ketua",
          Status_Jabatan: "Aktif",
          StatusJabatan: "Aktif",
          Tanggal_Menjabat: todayStr
        };
      }

      if (isOldChairman || isCabinetMember) {
        return {
          ...member,
          Role: "ANGGOTA" as UserRole,
          Jabatan: "Anggota",
          Status_Jabatan: "Nonaktif",
          StatusJabatan: "Nonaktif"
        };
      }

      return member;
    });

    // 2. Insert 7 new rows into JabatanKosong for the new Chairman to fill
    const cabinetPositions = [
      "Wakil Ketua", "Sekretaris", "Wakil Sekretaris",
      "Bendahara", "Wakil Bendahara", "Kepala Humas", "Humas"
    ];

    const existingJabatanKosong = appData.JabatanKosong || [];
    const newKosongEntries = cabinetPositions.map((pos, idx) => ({
      ID: `JK-${Date.now()}-${idx}`,
      Jabatan: pos,
      Tanggal: todayStr,
      Status: "BelumTerisi"
    }));

    // 3. Post Automatic Announcement
    const newPengumuman = {
      id: `PENG-${Date.now()}`,
      ID: `PENG-${Date.now()}`,
      Judul: `🎉 Ketua Baru Terpilih: ${winnerCandidateName}`,
      Isi: `Proses pemilihan ketua "${votingTitle}" telah selesai secara resmi. Selamat kepada ${winnerCandidateName} yang terpilih sebagai Ketua Baru! Sesuai aturan organisasi, struktur kabinet lama telah dinonaktifkan dan 7 posisi kepengurusan telah dibuka di menu Jabatan Kosong untuk diisi.`,
      Tanggal: todayStr,
      Penulis: "Sistem Pemilihan",
      Pembuat: "SUPER_ADMIN",
      Kategori: "Penting",
      isPenting: true,
      Visibilitas: "PUBLIK" as ContentVisibility
    };

    // 4. Update Voting Status to SELESAI
    const updatedVotingList = rawVotingList.map(vote => {
      if (vote.ID_Voting === votingId) {
        return { ...vote, Status: "SELESAI" as const };
      }
      return vote;
    });

    const updatedData = {
      ...appData,
      Anggota: updatedAnggota,
      JabatanKosong: [...newKosongEntries, ...existingJabatanKosong],
      Pengumuman: [newPengumuman, ...(appData.Pengumuman || [])],
      Voting: updatedVotingList
    };

    const loggedData = addLogAkses(
      updatedData,
      currentUserName || "Super Admin",
      userRole,
      "ELECTION_EXECUTE",
      `Eksekusi hasil pemilihan ketua "${votingTitle}". Pemenang: ${winnerCandidateName}. Structure reset applied.`,
      currentUserId || "-"
    );

    setAppData(loggedData);
    setTieModal(null);
    showToast(`Pemenang ${winnerCandidateName} berhasil disahkan! Kabinet baru dibuka di Jabatan Kosong. 🎉`, "success");
  };

  // Action: End Vote manually (with Election State Machine support)
  const handleEndVoteManually = (votingId: string) => {
    if (!isPengurus) return;

    const targetVote = rawVotingList.find(v => v.ID_Voting === votingId);
    if (!targetVote) return;

    if (!window.confirm(lang.confirm_end)) {
      return;
    }

    const isElection = targetVote.Jenis === "VotingKetua" || targetVote.Judul.toLowerCase().includes("ketua");

    if (isElection && targetVote.Pilihan && targetVote.Pilihan.length > 0) {
      // Find candidate(s) with highest votes
      const maxVotes = Math.max(...targetVote.Pilihan.map(o => o.Jumlah_Suara));
      const tiedCandidates = targetVote.Pilihan.filter(o => o.Jumlah_Suara === maxVotes);

      if (tiedCandidates.length > 1 && maxVotes > 0) {
        // Trigger Tie resolution modal for Super Admin / Admin
        setTieModal({
          votingId,
          votingTitle: targetVote.Judul,
          tiedCandidates,
          maxVotes
        });
        return;
      } else if (tiedCandidates.length === 1 && maxVotes > 0) {
        // Single clear winner
        executeElectionWinner(tiedCandidates[0].Nama_Pilihan, targetVote.Judul, votingId);
        return;
      }
    }

    // Standard Non-Election Close
    const updatedVotingList = rawVotingList.map(vote => {
      if (vote.ID_Voting === votingId) {
        return { ...vote, Status: "SELESAI" as const };
      }
      return vote;
    });

    const updatedData = {
      ...appData,
      Voting: updatedVotingList
    };

    const loggedData = addLogAkses(
      updatedData,
      currentUserName || "Pengurus",
      userRole,
      "VOTE_END",
      `Mengakhiri voting secara manual: ${targetVote?.Judul}`,
      currentUserId || "-"
    );

    setAppData(loggedData);
    showToast(lang.success_end, "success");
  };

  // Action: Delete Poll
  const handleDeleteVote = (votingId: string) => {
    if (!isAdmin) return;

    if (!window.confirm(lang.confirm_delete)) {
      return;
    }

    const targetVote = rawVotingList.find(v => v.ID_Voting === votingId);
    const updatedVotingList = rawVotingList.filter(vote => vote.ID_Voting !== votingId);

    const updatedData = {
      ...appData,
      Voting: updatedVotingList
    };

    const loggedData = addLogAkses(
      updatedData,
      currentUserName || "Pengurus",
      userRole,
      "VOTE_DELETE",
      `Menghapus agenda voting: ${targetVote?.Judul}`,
      currentUserId || "-"
    );

    setAppData(loggedData);
    showToast(lang.success_delete, "success");
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      
      {/* ── SECTION HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 dark:bg-slate-900/40 p-5 rounded-3xl border border-slate-100 dark:border-slate-850 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-xl shadow-inner">
              <Vote size={20} />
            </div>
            <h2 className="text-xl font-black text-slate-950 dark:text-slate-50 tracking-tight">
              {lang.title}
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            {lang.subtitle}
          </p>
        </div>

        {/* Create Button (Only Authorized) */}
        {isPengurus && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
          >
            <Plus size={16} />
            <span>{lang.btn_create}</span>
          </button>
        )}
      </div>

      {/* ── FILTER & CONTROL BAR ── */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl border border-slate-100 dark:border-slate-850 shadow-xs flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          {(["SEMUA", "AKTIF", "SELESAI"] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterStatus === status
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-950 dark:text-white"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              {status === "SEMUA" ? "Semua" : status === "AKTIF" ? lang.status_active : lang.status_ended}
            </button>
          ))}
        </div>

        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
          {filteredVotingList.length} Agenda
        </div>
      </div>

      {/* ── VOTING GRID / LIST ── */}
      {filteredVotingList.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-3xl p-12 text-center max-w-md mx-auto space-y-4 shadow-xs">
          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <BarChart3 size={28} />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
              {lang.no_votes}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs mx-auto leading-normal">
              Silakan cek kembali nanti atau hubungi pengurus jika ada pengambilan keputusan penting yang belum diterbitkan.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredVotingList.map(vote => {
            const totalSuara = vote.Pilihan.reduce((acc, opt) => acc + opt.Jumlah_Suara, 0);
            const userHasVoted = vote.Pemilih.includes(currentUserId || "");
            const isVoteActive = vote.Status === "AKTIF";
            const canUserVote = !isTamu && !userHasVoted && isVoteActive;

            return (
              <div 
                key={vote.ID_Voting}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between gap-5 relative group"
              >
                {/* Accent Status Bar */}
                <div className={`absolute top-0 left-6 right-6 h-1 rounded-b-full ${
                  isVoteActive 
                    ? "bg-emerald-500" 
                    : "bg-slate-400 dark:bg-slate-600"
                }`} />

                {/* Card Top: Status badge & Title */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      {/* Active Status Badge */}
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                        isVoteActive 
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/25 dark:text-emerald-400 border border-emerald-100/45" 
                          : "bg-slate-50 text-slate-500 dark:bg-slate-800/40 dark:text-slate-400 border border-slate-200/40"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isVoteActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                        {isVoteActive ? lang.status_active : lang.status_ended}
                      </span>

                      {/* Access Category Badge */}
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 uppercase">
                        {vote.Kategori_Akses}
                      </span>
                    </div>

                    {/* Admin Actions */}
                    <div className="flex items-center gap-1">
                      {isVoteActive && isPengurus && (
                        <button
                          onClick={() => handleEndVoteManually(vote.ID_Voting)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                          title={lang.btn_end_manual}
                        >
                          <Clock size={15} />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteVote(vote.ID_Voting)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                          title="Hapus Agenda"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-base font-extrabold text-slate-950 dark:text-slate-50 leading-snug">
                      {vote.Judul}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                      {vote.Deskripsi}
                    </p>
                  </div>
                </div>

                {/* Card Middle: Options List */}
                <div className="space-y-3.5">
                  {vote.Pilihan.map(opt => {
                    const voteCount = opt.Jumlah_Suara;
                    const votePct = totalSuara > 0 ? Math.round((voteCount / totalSuara) * 100) : 0;
                    const isSelectedByThisUser = userHasVoted && vote.Pemilih.includes(currentUserId || "") && selectedOptions[`voted_${vote.ID_Voting}`] === opt.ID_Option; // We can use matching logic
                    
                    // Since dynamic database tracks who voted but not exactly which option they chose (for perfect anonymity), we show percentages.
                    // But if they just cast a vote, or we want to simulate, we can let them know results are safe.
                    
                    return (
                      <div key={opt.ID_Option} className="space-y-1.5">
                        {canUserVote ? (
                          // Interactive Radio Option Selection
                          <label className={`flex items-center justify-between p-3 rounded-2xl border text-xs font-extrabold cursor-pointer transition-all ${
                            selectedOptions[vote.ID_Voting] === opt.ID_Option
                              ? "bg-emerald-50/50 border-emerald-500 text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300"
                              : "bg-slate-50 border-slate-200 hover:border-slate-300 dark:bg-slate-800/40 dark:border-slate-800 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"
                          }`}>
                            <div className="flex items-center gap-2.5">
                              <input
                                type="radio"
                                name={`vote_${vote.ID_Voting}`}
                                checked={selectedOptions[vote.ID_Voting] === opt.ID_Option}
                                onChange={() => setSelectedOptions({ ...selectedOptions, [vote.ID_Voting]: opt.ID_Option })}
                                className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
                              />
                              <span>{opt.Nama_Pilihan}</span>
                            </div>
                          </label>
                        ) : (
                          // Render Visual Progress Bar (Results View)
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs font-bold">
                              <span className="text-slate-700 dark:text-slate-300 font-medium">
                                {opt.Nama_Pilihan}
                              </span>
                              <span className="text-slate-900 dark:text-white font-mono font-extrabold">
                                {voteCount} suara ({votePct}%)
                              </span>
                            </div>
                            
                            {/* Bar Visual Track */}
                            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-1000 ${
                                  isVoteActive 
                                    ? "bg-gradient-to-r from-emerald-500 to-teal-400" 
                                    : "bg-slate-400 dark:bg-slate-500"
                                }`}
                                style={{ width: `${votePct}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Card Bottom: Summary Stats / Action Button */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 flex-wrap gap-3">
                  
                  {/* Info Column */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 font-semibold">
                      <Users size={12} />
                      <span>{lang.total_votes}: <strong>{totalSuara}</strong></span>
                    </div>
                    <div className="flex items-center gap-1 font-semibold">
                      <Calendar size={12} />
                      <span>{lang.ends_on}: <strong className="font-mono">{vote.Tanggal_Berakhir}</strong></span>
                    </div>
                  </div>

                  {/* Submission Logic */}
                  <div>
                    {isTamu ? (
                      <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/40 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800 text-[10px]">
                        <Info size={12} className="text-blue-500" />
                        <span>{lang.need_login}</span>
                      </div>
                    ) : userHasVoted ? (
                      <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100/40 px-3 py-1.5 rounded-xl font-black uppercase text-[10px] tracking-wider shadow-inner">
                        <CheckCircle2 size={13} />
                        <span>Sudah Memilih</span>
                      </div>
                    ) : isVoteActive ? (
                      <button
                        onClick={() => handleCastVote(vote.ID_Voting)}
                        disabled={!selectedOptions[vote.ID_Voting]}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 rounded-xl font-bold tracking-wide shadow-sm hover:shadow active:scale-98 transition-all cursor-pointer min-h-[38px] flex items-center gap-1"
                      >
                        <Vote size={14} />
                        <span>{lang.btn_cast}</span>
                      </button>
                    ) : (
                      <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl font-bold uppercase text-[10px] tracking-wider">
                        Ditutup
                      </span>
                    )}
                  </div>
                </div>

                {/* Guest user visual guide inside active votings */}
                {isTamu && isVoteActive && (
                  <div className="absolute inset-x-0 bottom-0 top-0 bg-slate-950/5 backdrop-blur-[0.5px] rounded-3xl pointer-events-none flex items-end p-4 group-hover:opacity-100 opacity-0 transition-opacity duration-300">
                    <div className="w-full bg-white dark:bg-slate-900 border border-slate-150 p-3 rounded-2xl shadow-lg flex items-start gap-2.5">
                      <AlertCircle size={16} className="text-blue-500 shrink-0 mt-0.5" />
                      <div className="space-y-0.5 text-left leading-normal">
                        <p className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200">{lang.guest_alert}</p>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400">{lang.guest_desc}</p>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE VOTING MODAL DIALOG ── */}
      {showCreateModal && isPengurus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            onClick={() => setShowCreateModal(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in" 
          />

          {/* Modal Container */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 relative z-10 animate-in zoom-in-95 duration-200 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Vote className="text-emerald-600" />
                <h3 className="text-base font-black text-slate-900 dark:text-slate-50">
                  {lang.form_title}
                </h3>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateVoting} className="space-y-4">
              
              {/* Input: Title */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {lang.label_title}
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Contoh: Pemilihan Lokasi Gathering"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Input: Jenis Voting */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Kategori / Jenis Agenda
                </label>
                <select
                  value={newJenis}
                  onChange={(e) => setNewJenis(e.target.value as "VotingKetua" | "Umum")}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                >
                  <option value="Umum">Voting Umum (Keputusan / Kebijakan Komunitas)</option>
                  <option value="VotingKetua">Voting Pemilihan Ketua (Reset Struktur Cabinet Otomatis)</option>
                </select>
              </div>

              {/* Input: Desc */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {lang.label_desc}
                </label>
                <textarea
                  required
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Masukkan rincian penjelasan pemilihan ini atau pertanyaan yang diajukan..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              {/* End Date & Visibility Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* End Date */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {lang.label_end_date}
                  </label>
                  <input
                    type="date"
                    required
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    min={todayStr}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Visibility */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {lang.label_visibility}
                  </label>
                  <select
                    value={newVisibility}
                    onChange={(e) => setNewVisibility(e.target.value as ContentVisibility)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  >
                    <option value="PUBLIK">{lang.access_public}</option>
                    <option value="ANGGOTA">{lang.access_member}</option>
                    <option value="PENGURUS">{lang.access_board}</option>
                  </select>
                </div>

              </div>

              {/* Dynamic Answer Options */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {lang.label_options}
                  </label>
                  <button
                    type="button"
                    onClick={handleAddOptionField}
                    className="text-emerald-600 hover:text-emerald-700 font-black text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>{lang.btn_add_option}</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {newOptions.map((option, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 font-mono w-4 shrink-0">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        required
                        value={option}
                        onChange={(e) => handleOptionInputChange(idx, e.target.value)}
                        placeholder={`${lang.placeholder_option} ${idx + 1}`}
                        className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      />
                      {newOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOptionField(idx)}
                          className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                          title="Hapus Opsi"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[42px]"
                >
                  {lang.btn_cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer min-h-[42px]"
                >
                  {lang.btn_save}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ── TIE RESOLUTION MODAL DIALOG (State Machine F.1) ── */}
      {tieModal && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            onClick={() => setTieModal(null)}
            className="fixed inset-0 bg-black/70 backdrop-blur-md animate-in fade-in" 
          />

          {/* Modal Content */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-500/30 relative z-10 animate-in zoom-in-95 space-y-5">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="p-2.5 bg-amber-100 dark:bg-amber-950/50 rounded-2xl">
                <AlertCircle size={22} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-50 leading-tight">
                  Hasil Seri (Tie) Pemilihan
                </h3>
                <p className="text-xs text-slate-500 font-semibold">
                  {tieModal.votingTitle}
                </p>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 p-4 rounded-2xl text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-bold">
                ⚠️ Terdapat {tieModal.tiedCandidates.length} kandidat dengan perolehan suara terbanyak yang sama ({tieModal.maxVotes} suara).
              </p>
              <p className="text-[11px] opacity-90">
                Sesuai aturan F.1, Super Admin dapat menentukan pemenang secara langsung atau membuka voting ulang otomatis khusus kandidat yang seri.
              </p>
            </div>

            {/* Option A: Manual Winner Selection */}
            <div className="space-y-2">
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider">
                Opsi 1: Tentukan Pemenang Secara Manual
              </label>
              <div className="space-y-2">
                {tieModal.tiedCandidates.map((candidate) => (
                  <button
                    key={candidate.ID_Option}
                    onClick={() => executeElectionWinner(candidate.Nama_Pilihan, tieModal.votingTitle, tieModal.votingId)}
                    className="w-full p-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-black flex items-center justify-between transition-all cursor-pointer"
                  >
                    <span>Sahkan "{candidate.Nama_Pilihan}" Sebagai Ketua</span>
                    <ChevronRight size={16} />
                  </button>
                ))}
              </div>
            </div>

            {/* Option B: Auto Tie-breaker Voting */}
            <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider">
                Opsi 2: Voting Ulang Otomatis
              </label>
              <button
                onClick={() => {
                  const tieBreakerOptions: VotingOption[] = tieModal.tiedCandidates.map((c, i) => ({
                    ID_Option: `OPT-TB-${i + 1}`,
                    Nama_Pilihan: c.Nama_Pilihan,
                    Jumlah_Suara: 0
                  }));

                  const tieBreakerVote: VotingItem = {
                    ID_Voting: `VOTE-TB-${Date.now()}`,
                    Judul: `Voting Ulang (Tie-Breaker): ${tieModal.votingTitle}`,
                    Deskripsi: `Voting penentu khusus antara kandidat yang memperoleh suara seri (${tieModal.maxVotes} suara).`,
                    Jenis: "VotingKetua",
                    Tanggal_Dibuat: todayStr,
                    Tanggal_Berakhir: todayStr,
                    Status: "AKTIF",
                    Pilihan: tieBreakerOptions,
                    Pemilih: [],
                    Kategori_Akses: "ANGGOTA",
                    Dibuat_Oleh: "Super Admin (Sistem Tie-Breaker)"
                  };

                  // Close original voting & add tie-breaker voting
                  const updatedVotingList = rawVotingList.map(v => v.ID_Voting === tieModal.votingId ? { ...v, Status: "SELESAI" as const } : v);

                  setAppData({
                    ...appData,
                    Voting: [tieBreakerVote, ...updatedVotingList]
                  });

                  setTieModal(null);
                  showToast("Agenda voting ulang tie-breaker berhasil diterbitkan otomatis! 🗳️", "success");
                }}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-md"
              >
                Terbitkan Voting Ulang Khusus Kandidat Seri
              </button>
            </div>

            <button
              onClick={() => setTieModal(null)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
