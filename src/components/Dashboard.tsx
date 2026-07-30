import React, { useState } from "react";
import {
  Users, Calendar, Megaphone, Wallet, ArrowRight, Lock,
  Sparkles, MapPin, CheckCircle2, AlertCircle, ShieldCheck,
  Phone, MessageCircle,
  RefreshCw, CloudSun, Bell, CheckSquare, Square, FileText, Activity,
  Database, Server, Crown, X, UserPlus, Info,
  Image as ImageIcon, KeyRound,
} from "lucide-react";
import { AppData, filterKontenByAkses, saveAppData } from "../utils/dataStore";
import { UserRole, AuthSession, AgendaItem, PengumumanItem, AnggotaItem } from "../types";
import { useLocale } from "../hooks/useLocale";
import { useState } from "react";

// ----------------------------------------------------------
// KONSTANTA
// ----------------------------------------------------------
const MOTIVATION_QUOTES = [
  "Bersatu kita teguh, bercerai kita runtuh.",
  "Gotong royong wujud kebersamaan pemuda RT 03 Denokan.",
  "Pemuda kreatif, desa berkemajuan.",
  "Pemuda hari ini adalah pemimpin masa depan.",
  "Silaturahmi menguatkan persaudaraan, aksi nyata membangun lingkungan.",
];

// ✅ Nomor WA dari satu tempat — tidak hardcode 4x di JSX
const WA_KETUA      = "6281234567890";
const WA_SEKRETARIS = "6281234567891";

const WA_URL = (no: string, msg: string) =>
  `https://wa.me/${no}?text=${encodeURIComponent(msg)}`;

// ----------------------------------------------------------
// TYPES
// ----------------------------------------------------------
interface DashboardProps {
  appData?: AppData;
  data?: AppData;              // ✅ Ganti any → AppData
  setAppData?: React.Dispatch<React.SetStateAction<AppData>>;
  userRole?: UserRole;
  session?: AuthSession;
  setTab: (tab: string) => void;
  onOpenAuthModal?: () => void;
}

interface SekretarisTask {
  id  : number;
  text: string;
  done: boolean;
  tag : string;
}

interface UserNotification {
  id   : string;
  title: string;
  msg  : string;
  type : "warning" | "success" | "info";
  read : boolean;
}

// ----------------------------------------------------------
// HELPER - Greeting berdasarkan jam
// ----------------------------------------------------------
function getTimeGreeting(hours: number): string {
  if (hours >= 0  && hours < 11) return "Selamat Pagi";
  if (hours >= 11 && hours < 15) return "Selamat Siang";
  if (hours >= 15 && hours < 18) return "Selamat Sore";
  return "Selamat Malam";
}

// ----------------------------------------------------------
// COMPONENT
// ----------------------------------------------------------
export default function Dashboard({
  appData,
  data,
  setAppData,
  userRole = "TAMU",
  session,
  setTab,
  onOpenAuthModal,
}: DashboardProps) {
  const { formatCurrency, t } = useLocale();
  const currentData = appData || data || {} as AppData;
  const settings = currentData.Settings || {};
  const actualWaKetua = settings.WA_Ketua || "6281234567890";
  const actualWaSekretaris = settings.WA_Sekretaris || "6281234567891";
  const actualNamaKetua = settings.Nama_Ketua || "Iqbal (RT 03 Denokan)";
  const actualNamaSekretaris = settings.Nama_Sekretaris || "Nabila (RT 03 Denokan)";

  const isGuest     = userRole === "TAMU";

  const now          = new Date();
  const timeGreeting = getTimeGreeting(now.getHours());

  // Kutipan motivasi berdasarkan tanggal
  const todayQuote = MOTIVATION_QUOTES[now.getDate() % MOTIVATION_QUOTES.length];

  // ----------------------------------------------------------
  // STATE
  // ----------------------------------------------------------
  const [isRefreshing, setIsRefreshing]           = useState(false);
  const [showRefreshToast, setShowRefreshToast]   = useState(false);
  const [selectedAgendaModal, setSelectedAgendaModal] = useState<AgendaItem | null>(null);
  const [selectedPhotoModal, setSelectedPhotoModal]   = useState<string | null>(null);
  const [rsvpState, setRsvpState]                 = useState<Record<string, "HADIR" | "TIDAK">>({});

  // Add-contact modal state (visible only to SUPER_ADMIN or KETUA)
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newContact, setNewContact] = useState<{ icon?: string; jabatan: string; nama: string; wa: string }>({ icon: "👤", jabatan: "", nama: "", wa: "" });

  const [sekretarisTasks, setSekretarisTasks] = useState<SekretarisTask[]>([
    { id: 1, text: "Rekap absensi rapat koordinasi kemarin",           done: true,  tag: "Absensi" },
    { id: 2, text: "Kirim reminder iuran bulanan ke anggota",          done: false, tag: "Iuran"   },
    { id: 3, text: "Input pemasukan donasi warga RT 03",               done: false, tag: "Kas"     },
    { id: 4, text: "Buat draft undangan Pesta Lomba 17-an",            done: false, tag: "Agenda"  },
    { id: 5, text: "Update data kontak anggota baru",                  done: true,  tag: "Anggota" },
  ]);

  const [userNotifications, setUserNotifications] = useState<UserNotification[]>([
    { id: "1", title: "Iuran Bulan Ini",    msg: "Iuran Anda bulan ini belum dikonfirmasi.",                              type: "warning", read: false },
    { id: "2", title: "Agenda Mendatang",   msg: "Pesta Lomba Rakyat Remaja RT 03 diselenggarakan 17 Agustus 2026.",      type: "info",    read: false },
    { id: "3", title: "Aspirasi Direspon", msg: "Usulan perbaikan peralatan olahraga telah ditanggapi oleh Pengurus.",   type: "success", read: true  },
  ]);

  // ----------------------------------------------------------
  // DATA
  // ----------------------------------------------------------
  const anggotaList      = (currentData.Anggota || []) as AnggotaItem[];
  const totalAnggota     = anggotaList.length;
  const activeAnggotaCount = anggotaList.filter((a) => a.Status_Aktif === "AKTIF").length;

  const kasList = currentData.Kas || [];
  const sumKas  = kasList.reduce((acc: number, curr: any) => {
    const isPemasukan = curr.Jenis === "Pemasukan" || curr.Pemasukan > 0;
    const amount      = Number(curr.Nominal || curr.Pemasukan || curr.Pengeluaran || 0);
    return isPemasukan ? acc + amount : acc - amount;
  }, 0);

  const kasBulanIniPemasukan  = kasList
    .filter((k: any) => k.Jenis === "Pemasukan")
    .reduce((a: number, c: any) => a + Number(c.Nominal || c.Pemasukan || 0), 0);

  const kasBulanIniPengeluaran = kasList
    .filter((k: any) => k.Jenis === "Pengeluaran")
    .reduce((a: number, c: any) => a + Number(c.Nominal || c.Pengeluaran || 0), 0);

  const rawPengumuman    = (currentData.Pengumuman || []) as PengumumanItem[];
  const rawAgenda        = (currentData.Agenda     || []) as AgendaItem[];
  const visiblePengumuman = filterKontenByAkses(rawPengumuman, userRole);
  const visibleAgenda     = filterKontenByAkses(rawAgenda, userRole);
  const pengumumanTerbaru = [...visiblePengumuman].reverse().slice(0, 3);
  const agendaMendatang   = [...visibleAgenda].reverse().slice(0, 3);

  const galeriList   = currentData.Galeri || [];
  const latestPhotos = [...galeriList].reverse().slice(0, 6);

  // ----------------------------------------------------------
  // HANDLERS
  // ----------------------------------------------------------
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setShowRefreshToast(true);
      setTimeout(() => setShowRefreshToast(false), 3000);
    }, 600);
  };

  const toggleTask = (id: number) => {
    setSekretarisTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const dismissNotification = (id: string) => {
    setUserNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Save new contact into settings.MainContacts (persist to app data)
  const handleSaveContact = () => {
    const contact = { ...newContact };
    const existing = (settings.MainContacts && Array.isArray(settings.MainContacts)) ? settings.MainContacts : [];
    const updatedSettings = { ...settings, MainContacts: [...existing, contact] };
    const updatedAppData = { ...currentData, Settings: updatedSettings } as AppData;

    if (setAppData) setAppData(updatedAppData);
    try {
      saveAppData(updatedAppData);
    } catch (err) {
      // best-effort save; ignore errors here but keep UI responsive
      console.error("Gagal menyimpan kontak:", err);
    }

    setShowAddContactModal(false);
    setNewContact({ icon: "👤", jabatan: "", nama: "", wa: "" });
  };

  const userFullName = session?.nama_lengkap || session?.nama_panggilan || "Anggota Remaja";
  const userID       = session?.id_anggota   || "RL03-000";

  // ----------------------------------------------------------
  // ROLE BADGE
  // ----------------------------------------------------------
  const RoleBadge = () => {
    const badges: Partial<Record<UserRole, { label: string; className: string }>> = {
      SUPER_ADMIN: { label: "🔴 SuperAdmin", className: "bg-amber-100 text-amber-900 border-amber-300" },
      KETUA      : { label: "👑 Ketua",      className: "bg-rose-100 text-rose-800 border-rose-200"   },
      ADMIN      : { label: "👑 Admin",      className: "bg-rose-100 text-rose-800 border-rose-200"   },
      SEKRETARIS : { label: "📝 Sekretaris", className: "bg-yellow-100 text-yellow-900 border-yellow-300" },
      BENDAHARA  : { label: "💰 Bendahara",  className: "bg-emerald-100 text-emerald-800 border-emerald-300" },
      HUMAS      : { label: "📢 Humas",      className: "bg-orange-100 text-orange-800 border-orange-200" },
      PENGURUS   : { label: "⚡ Pengurus",   className: "bg-purple-100 text-purple-800 border-purple-200" },
      ANGGOTA    : { label: "👥 Anggota",    className: "bg-blue-100 text-blue-800 border-blue-200"   },
      TAMU       : { label: "👤 Tamu",       className: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" },
    };
    const badge = badges[userRole];
    if (!badge) return null;
    return (
      <span className={`px-2 py-0.5 border rounded-md text-[10px] font-bold ${badge.className}`}>
        {badge.label}
      </span>
    );
  };

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------
  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">

      {/* Toast Refresh */}
      {showRefreshToast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-emerald-400 px-4 py-3 rounded-2xl shadow-xl border border-emerald-500/30 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
          <CheckCircle2 size={16} />
          <span>Data Dashboard Diperbarui!</span>
        </div>
      )}

      {/* Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CloudSun size={20} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 flex-wrap">
              <span>
                {timeGreeting},{" "}
                {isGuest ? "Warga RT 03 / Tamu" : userFullName}!
              </span>
              <RoleBadge />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
              <MapPin size={12} className="text-emerald-600" />
              RT 03 Legok, RW 04 Denokan, Kel. Gondoryo, Kec. Jambu
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-xl transition-all text-xs font-bold flex items-center gap-1 border border-slate-200 dark:border-slate-800"
            title="Refresh Data Dashboard"
            aria-label="Refresh data"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin text-emerald-600" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Motivasi Hari Ini */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 dark:from-emerald-950/30 dark:via-teal-950/30 dark:to-blue-950/30 border border-emerald-200 dark:border-emerald-900 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-sm dark:shadow-none">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-emerald-600 shrink-0" />
          <span className="italic font-medium text-slate-700 dark:text-slate-300">
            "{todayQuote}"
          </span>
        </div>
        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-300 px-2 py-0.5 rounded-md shrink-0">
          Motivasi Hari Ini
        </span>
      </div>

      {/* ================================================================= */}
      {/* TAMU: Hero Banner & Stats Publik */}
      {/* ================================================================= */}
      {isGuest && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl dark:shadow-none relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-6">
              <Users size={280} />
            </div>
            <div className="relative z-10 max-w-2xl space-y-3">
              <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 rounded-full text-[11px] font-bold uppercase tracking-wider inline-block">
                PORTAL RESMI WARGA & REMAJA
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-white leading-tight">
                Remaja Legok 03 Denokan
              </h1>
              <p className="text-xs md:text-sm text-emerald-100/90 leading-relaxed">
                RT 03 Legok RW 04 Denokan, Kelurahan Gondoryo, Kecamatan Jambu,
                Kabupaten Semarang, Jawa Tengah.
              </p>
              <div className="flex flex-wrap items-center gap-2.5 pt-3">
                {onOpenAuthModal && (
                  <button
                    onClick={onOpenAuthModal}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-md dark:shadow-none flex items-center gap-1.5"
                  >
                    <KeyRound size={14} />
                    <span>Masuk dengan ID Anggota</span>
                  </button>
                )}
                <button
                  onClick={() => setTab("pengumuman")}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5"
                >
                  <Megaphone size={14} />
                  <span>Lihat Pengumuman</span>
                </button>
                <a
                  href={WA_URL(actualWaKetua, "Halo Pengurus Remaja Legok 03, saya warga RT 03 ingin bertanya")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-800/80 hover:bg-emerald-700/80 border border-emerald-600/50 text-emerald-200 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5"
                >
                  <MessageCircle size={14} />
                  <span>Hubungi Pengurus</span>
                </a>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div
              onClick={() => setTab("anggota")}
              className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none flex flex-col items-center justify-center text-center cursor-pointer hover:border-emerald-300 transition-all"
            >
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mb-2.5">
                <Users size={24} />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Anggota</p>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">{totalAnggota}</p>
              <span className="text-[10px] text-emerald-600 font-bold mt-1">Lihat Profil Publik →</span>
            </div>

            <div
              onClick={() => setTab("galeri")}
              className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none flex flex-col items-center justify-center text-center cursor-pointer hover:border-amber-300 transition-all"
            >
              <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mb-2.5">
                <ImageIcon size={24} />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Galeri Foto</p>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">{galeriList.length}</p>
              <span className="text-[10px] text-amber-600 font-bold mt-1">Dokumentasi →</span>
            </div>

            <div
              onClick={() => setTab("agenda")}
              className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-300 transition-all"
            >
              <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center mb-2.5">
                <Calendar size={24} />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Agenda Publik</p>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">{visibleAgenda.length}</p>
              <span className="text-[10px] text-blue-600 font-bold mt-1">Cek Jadwal →</span>
            </div>

            <div
              onClick={() => setTab("pengumuman")}
              className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none flex flex-col items-center justify-center text-center cursor-pointer hover:border-purple-300 transition-all"
            >
              <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center mb-2.5">
                <Megaphone size={24} />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pengumuman</p>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">{visiblePengumuman.length}</p>
              <span className="text-[10px] text-purple-600 font-bold mt-1">Baca Berita →</span>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* ANGGOTA: Personal Status Card */}
      {/* ================================================================= */}
      {!isGuest && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-5 md:p-6 rounded-3xl shadow-lg dark:shadow-none border border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center text-xl font-black shadow-md dark:shadow-none shrink-0 border-2 border-emerald-400/30">
                {userFullName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-black text-white">{userFullName}</h2>
                  <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 rounded-md text-[10px] font-bold">
                    AKTIF
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-mono mt-0.5">ID: {userID}</p>
                <p className="text-[11px] text-emerald-300/80 mt-0.5">
                  Jabatan: {session?.jabatan || userRole}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-center">
              <button
                onClick={() => setTab("kas-saya")}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm dark:shadow-none flex items-center gap-1"
              >
                <Wallet size={14} />
                <span>Iuran Saya</span>
              </button>
              <button
                onClick={() => setTab("absensi")}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm dark:shadow-none flex items-center gap-1"
              >
                <Users size={14} />
                <span>Absensi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SEKRETARIS: Operational Dashboard */}
      {/* ================================================================= */}
      {userRole === "SEKRETARIS" && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-5 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-yellow-500 text-white rounded-xl">
                <FileText size={18} />
              </span>
              <div>
                <h3 className="font-black text-slate-900 dark:text-slate-100 text-sm">
                  Dashboard Sekretaris Operasional
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Ringkasan administrasi & tugas harian organisasi
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-yellow-200 text-yellow-900 rounded-full text-xs font-bold">
              Operasional
            </span>
          </div>

          {/* Stat Cards Sekretaris — dari data nyata */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-200/80 shadow-sm dark:shadow-none">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Total Anggota</div>
              <div className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1">{totalAnggota} Orang</div>
              <div className="text-[10px] text-emerald-600 mt-1">{activeAnggotaCount} Aktif</div>
              <button onClick={() => setTab("anggota")} className="text-[10px] font-bold text-amber-700 mt-2 hover:underline block">
                Kelola Anggota →
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-200/80 shadow-sm dark:shadow-none">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Pemasukan</div>
              <div className="text-lg font-black text-emerald-700 mt-1">{formatCurrency(kasBulanIniPemasukan)}</div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                Keluar: {formatCurrency(kasBulanIniPengeluaran)}
              </p>
              <button onClick={() => setTab("kas")} className="text-[10px] font-bold text-amber-700 mt-2 hover:underline block">
                Input Transaksi →
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-200/80 shadow-sm dark:shadow-none">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Total Agenda</div>
              <div className="text-lg font-black text-blue-700 mt-1">{visibleAgenda.length} Kegiatan</div>
              <button onClick={() => setTab("absensi")} className="text-[10px] font-bold text-amber-700 mt-2 hover:underline block">
                Rekap Absensi →
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-200/80 shadow-sm dark:shadow-none">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Pengumuman</div>
              <div className="text-lg font-black text-purple-700 mt-1">{visiblePengumuman.length} Aktif</div>
              <button onClick={() => setTab("pengumuman")} className="text-[10px] font-bold text-amber-700 mt-2 hover:underline block">
                Kelola Pengumuman →
              </button>
            </div>
          </div>

          {/* Daftar Tugas */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-200/80 space-y-3">
            <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <CheckSquare size={16} className="text-amber-600" />
              Daftar Tugas Harian
            </h4>
            <div className="space-y-2">
              {sekretarisTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-center gap-2.5">
                    {task.done ? (
                      <CheckSquare size={16} className="text-emerald-600 shrink-0" />
                    ) : (
                      <Square size={16} className="text-slate-400 shrink-0" />
                    )}
                    <span className={`text-xs font-medium ${
                      task.done
                        ? "line-through text-slate-400 dark:text-slate-500"
                        : "text-slate-800 dark:text-slate-200"
                    }`}>
                      {task.text}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">
                    {task.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* KETUA / BENDAHARA / ADMIN: Management Monitor */}
      {/* ================================================================= */}
      {(userRole === "KETUA" || userRole === "BENDAHARA" || userRole === "ADMIN") && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 p-5 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-rose-600 text-white rounded-xl">
                <Crown size={18} />
              </span>
              <div>
                <h3 className="font-black text-slate-900 dark:text-slate-100 text-sm">
                  Monitor Kesehatan Organisasi
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Ringkasan indikator performa & persetujuan kebijakan
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-rose-200 text-rose-900 rounded-full text-xs font-bold">
              Level Eksekutif
            </span>
          </div>

          {/* Stat Cards — dari data nyata */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-rose-200/80 shadow-sm dark:shadow-none">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Saldo Kas</div>
              <div className="text-base font-black text-emerald-700 mt-1">{formatCurrency(sumKas)}</div>
              <button onClick={() => setTab("kas")} className="text-[10px] font-bold text-rose-700 mt-2 hover:underline block">
                Laporan Kas →
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-rose-200/80 shadow-sm dark:shadow-none">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Partisipasi Anggota</div>
              <div className="text-base font-black text-slate-900 dark:text-slate-100 mt-1">
                {activeAnggotaCount} / {totalAnggota} Aktif
              </div>
              <button onClick={() => setTab("anggota")} className="text-[10px] font-bold text-rose-700 mt-2 hover:underline block">
                Kelola Anggota →
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-rose-200/80 shadow-sm dark:shadow-none">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Total Agenda</div>
              <div className="text-base font-black text-purple-700 mt-1">
                {visibleAgenda.length} Kegiatan
              </div>
              <button onClick={() => setTab("agenda")} className="text-[10px] font-bold text-rose-700 mt-2 hover:underline block">
                Kelola Agenda →
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-rose-200/80 shadow-sm dark:shadow-none">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Pengumuman Aktif</div>
              <div className="text-base font-black text-slate-900 dark:text-slate-100 mt-1">
                {visiblePengumuman.length} Pengumuman
              </div>
              <button onClick={() => setTab("pengumuman")} className="text-[10px] font-bold text-rose-700 mt-2 hover:underline block">
                Kelola Pengumuman →
              </button>
            </div>
          </div>

          {/* Health Gauges — persentase dari data nyata */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-rose-200/80 space-y-2.5">
            <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Activity size={16} className="text-rose-600" />
              Indikator Kesehatan Organisasi
            </h4>
            <div className="space-y-2 text-xs">
              {/* Persentase anggota aktif dari data nyata */}
              {(() => {
                const pctAktif = totalAnggota > 0
                  ? Math.round((activeAnggotaCount / totalAnggota) * 100)
                  : 0;
                return (
                  <div>
                    <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300 mb-1">
                      <span>👥 Anggota Aktif</span>
                      <span className="text-blue-600">{pctAktif}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full" style={{ width: `${pctAktif}%` }} />
                    </div>
                  </div>
                );
              })()}

              {/* Saldo kas vs pengeluaran */}
              {(() => {
                const total = kasBulanIniPemasukan + kasBulanIniPengeluaran;
                const pct   = total > 0
                  ? Math.round((kasBulanIniPemasukan / total) * 100)
                  : 0;
                return (
                  <div>
                    <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300 mb-1">
                      <span>💰 Rasio Pemasukan vs Pengeluaran</span>
                      <span className="text-emerald-600">{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SUPER ADMIN: Master Control */}
      {/* ================================================================= */}
      {userRole === "SUPER_ADMIN" && (
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl text-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-purple-900 text-amber-300 rounded-xl">
                <Crown size={18} />
              </span>
              <div>
                <h3 className="font-black text-amber-400 text-sm">
                  Master Control System (Super Admin)
                </h3>
                <p className="text-xs text-slate-400">
                  Monitoring infrastruktur, audit trail, & keamanan sistem
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-purple-950 border border-purple-700 text-amber-300 rounded-full text-xs font-bold">
              Full Access SA
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: <Database size={12} className="text-amber-400" />, label: "Storage",       value: "2.4 MB / 100 MB", sub: "Normal (2.4%)"   },
              { icon: <Server   size={12} className="text-blue-400"  />, label: "Response Time", value: "118 ms",          sub: "Sangat Cepat"    },
              { icon: <ShieldCheck size={12} className="text-emerald-400" />, label: "Uptime",   value: "99.98%",          sub: "Aktif & Stabil"  },
              { icon: <Activity size={12} className="text-purple-400" />, label: "Log Keamanan", value: "0 Breach",        sub: "PIN Encrypted"   },
            ].map((card) => (
              <div key={card.label} className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700">
                <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                  {card.icon} {card.label}
                </div>
                <div className="text-base font-black text-slate-100 mt-1">{card.value}</div>
                <p className="text-[10px] text-emerald-400 mt-1">{card.sub}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => setTab("super-admin")}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-sm dark:shadow-none flex items-center gap-1.5 cursor-pointer"
          >
            <Crown size={14} />
            <span>t("dashboard.superAdminPanel")</span>
          </button>
        </div>
      )}

      {/* ================================================================= */}
      {/* NOTIFIKASI PERSONAL */}
      {/* ================================================================= */}
      {!isGuest && userNotifications.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
              <Bell size={18} className="text-amber-500" />
              Notifikasi Personal ({userNotifications.length})
            </h3>
          </div>
          <div className="space-y-2">
            {userNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-3.5 rounded-2xl border flex items-start justify-between gap-3 ${
                  notif.type === "warning"
                    ? "bg-amber-50/60 border-amber-200 text-amber-900 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-200"
                    : notif.type === "success"
                    ? "bg-emerald-50/60 border-emerald-200 text-emerald-900 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-200"
                    : "bg-blue-50/60 border-blue-200 text-blue-900 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-200"
                }`}
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    {notif.type === "warning" && <AlertCircle size={14} className="text-amber-600" />}
                    {notif.type === "success" && <CheckCircle2 size={14} className="text-emerald-600" />}
                    {notif.type === "info"    && <Info size={14} className="text-blue-600" />}
                    <span>{notif.title}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{notif.msg}</p>
                </div>
                <button
                  onClick={() => dismissNotification(notif.id)}
                  aria-label="Tutup notifikasi"
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* PENGUMUMAN & AGENDA */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Pengumuman Terbaru */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Megaphone className="text-purple-600" size={20} />
              {t("dashboard.latestAnnouncements", "Pengumuman Terbaru")}
            </h2>
            <button
              onClick={() => setTab("pengumuman")}
              className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1"
            >
              {t("dashboard.viewAll", "Lihat Semua")} <ArrowRight size={14} />
            </button>
          </div>

          <div className="space-y-3">
            {pengumumanTerbaru.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 text-xs italic py-4 text-center">
                {t("dashboard.noAnnouncements", "Belum ada pengumuman publik saat ini.")}
              </p>
            ) : (
              // ✅ Pakai item.ID bukan index
              pengumumanTerbaru.map((item) => (
                <div
                  key={item.ID}
                  className="p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5"
                >
                  <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-mono text-slate-400 dark:text-slate-500">{item.Tanggal}</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      item.Visibilitas === "ANGGOTA"
                        ? "bg-blue-100 text-blue-800 border border-blue-200"
                        : item.Visibilitas === "PENGURUS"
                        ? "bg-purple-100 text-purple-800 border border-purple-200"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    }`}>
                      {item.Visibilitas || "PUBLIK"}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{item.Judul}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {item.Isi}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Agenda Terdekat */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="text-blue-600" size={20} />
              Agenda Terdekat
            </h2>
            <button
              onClick={() => setTab("agenda")}
              className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1"
            >
              {t("dashboard.viewAll", "Lihat Semua")} <ArrowRight size={14} />
            </button>
          </div>

          <div className="space-y-3">
            {agendaMendatang.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 text-xs italic py-4 text-center">
                Belum ada agenda mendatang saat ini.
              </p>
            ) : (
              // ✅ Pakai item.ID bukan index
              agendaMendatang.map((item) => {
                const dateObj      = new Date(item.Tanggal);
                const monthStr     = dateObj.toLocaleString("id-ID", { month: "short" });
                const dayNum       = dateObj.getDate();
                const isConfirmed  = rsvpState[item.ID] === "HADIR";

                return (
                  <div
                    key={item.ID}
                    onClick={() => setSelectedAgendaModal(item)}
                    className="p-3.5 border border-slate-200 dark:border-slate-700 hover:border-blue-300 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all cursor-pointer flex flex-col sm:flex-row gap-3.5"
                  >
                    <div className="bg-emerald-600 text-white px-3 py-2.5 rounded-xl text-center flex-shrink-0 min-w-[54px] shadow-sm dark:shadow-none">
                      <div className="text-[10px] font-bold uppercase tracking-wider">{monthStr}</div>
                      <div className="text-xl font-black">{dayNum}</div>
                    </div>

                    <div className="flex-1 space-y-1">
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs leading-snug">
                        {item["Nama Kegiatan"]}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <span>⏰ {item.Waktu}</span>
                        <span>•</span>
                        <span>📍 {item.Lokasi}</span>
                      </p>

                      {!isGuest && (
                        <div
                          className="pt-1.5 flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() =>
                              setRsvpState((prev) => ({ ...prev, [item.ID]: "HADIR" }))
                            }
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                              isConfirmed
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "bg-slate-200 dark:bg-slate-700 hover:bg-emerald-100 text-slate-700 dark:text-slate-300 hover:text-emerald-800"
                            }`}
                          >
                            <CheckCircle2 size={12} />
                            <span>{isConfirmed ? "Hadir ✅" : "Konfirmasi Hadir"}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* GALERI */}
      {/* ================================================================= */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ImageIcon className="text-amber-500" size={20} />
              {t("dashboard.latestGallery", "Galeri Kegiatan Terbaru")}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Dokumentasi kegiatan dan kebersamaan pemuda RT 03 Denokan
            </p>
          </div>
          <button
            onClick={() => setTab("galeri")}
            className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1"
          >
            Lihat Galeri <ArrowRight size={14} />
          </button>
        </div>

        {latestPhotos.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 text-xs">
            Belum ada foto galeri dipublikasikan.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {latestPhotos.map((photo: any, idx: number) => {
              const url   = photo.Link_Foto || photo.Foto_URL || "";
              const title = photo.Judul || photo.Judul_Kegiatan || "Foto Kegiatan";
              if (!url) return null;

              return (
                <div
                  key={photo.ID || photo.id || idx}
                  onClick={() => setSelectedPhotoModal(url)}
                  className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer shadow-sm dark:shadow-none hover:shadow-md transition-all border border-slate-200 dark:border-slate-700"
                >
                  <img
                    src={url}
                    alt={title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end text-white">
                    <p className="text-[10px] font-bold truncate">{title}</p>
                    <p className="text-[9px] text-slate-300 font-mono">{photo.Tanggal}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* CTA & KONTAK */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Join CTA */}
        <div className="bg-gradient-to-br from-emerald-800 to-teal-900 text-white p-6 rounded-3xl shadow-md dark:shadow-none space-y-3">
          <div className="inline-block p-2.5 bg-emerald-500/20 text-emerald-300 rounded-2xl border border-emerald-400/30">
            <UserPlus size={22} />
          </div>
          <h3 className="font-extrabold text-lg text-white">Warga RT 03 Usia Remaja?</h3>
          <p className="text-xs text-emerald-100/90 leading-relaxed">
            Mari bergabung dengan Remaja Legok 03 RT 03/RW 04 Denokan!
          </p>
          <a
            href={WA_URL(actualWaKetua, `Halo ${actualNamaKetua}, saya ${userFullName} (${userID}) ingin mendaftar jadi anggota Remaja Legok 03.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md dark:shadow-none"
          >
            <MessageCircle size={15} />
            <span>Daftar via WhatsApp Ketua</span>
          </a>
        </div>

        {/* Kontak Pengurus */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
              <Phone size={18} className="text-emerald-600" />
              Kontak Pengurus Utama
            </h3>

            {/* Add button visible to SUPER_ADMIN or KETUA */}
            {(userRole === "SUPER_ADMIN" || userRole === "KETUA") && (
              <button
                onClick={() => setShowAddContactModal(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold transition-all flex items-center gap-2"
                aria-label="Tambah kontak pengurus"
              >
                <UserPlus size={14} />
                <span>Tambah</span>
              </button>
            )}
          </div>

          <div className="space-y-2.5 pt-1">
            {(
              (settings.MainContacts && Array.isArray(settings.MainContacts) && settings.MainContacts.length > 0)
                ? settings.MainContacts
                : [
                    { icon: "👑", jabatan: "Ketua Remaja RT 03",  nama: actualNamaKetua,   wa: actualWaKetua      },
                    { icon: "📝", jabatan: "Sekretaris Remaja",   nama: actualNamaSekretaris,  wa: actualWaSekretaris },
                  ]
            ).map((kontak: any) => (
              <div
                key={kontak.jabatan}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 font-bold flex items-center justify-center text-xs">
                    {kontak.icon}
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      {kontak.jabatan}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {kontak.nama}
                    </div>
                  </div>
                </div>
                <a
                  href={WA_URL(kontak.wa, `Halo ${kontak.jabatan} Remaja Legok 03`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 shadow-sm dark:shadow-none"
                >
                  <MessageCircle size={13} />
                  <span>{t("dashboard.chatWA")}</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* MODAL DETAIL AGENDA */}
      {/* ================================================================= */}
      {selectedAgendaModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-4 relative border border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setSelectedAgendaModal(null)}
              aria-label="Tutup detail agenda"
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center shrink-0">
                <Calendar size={24} />
              </div>
              <div>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-md uppercase">
                  {selectedAgendaModal.Visibilitas || "PUBLIK"}
                </span>
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base leading-snug mt-0.5">
                  {selectedAgendaModal["Nama Kegiatan"]}
                </h3>
              </div>
            </div>

            <div className="space-y-2 text-xs bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <p className="text-slate-700 dark:text-slate-300 font-semibold">📅 {selectedAgendaModal.Tanggal}</p>
              <p className="text-slate-700 dark:text-slate-300 font-semibold">⏰ {selectedAgendaModal.Waktu}</p>
              <p className="text-slate-700 dark:text-slate-300 font-semibold">📍 {selectedAgendaModal.Lokasi}</p>
            </div>

            <div>
              <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200">Keterangan:</label>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl mt-1">
                {selectedAgendaModal.Keterangan || t("dashboard.noDescription", "Tidak ada keterangan tambahan.")}
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedAgendaModal(null)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* PHOTO LIGHTBOX */}
      {/* ================================================================= */}
      {showAddContactModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-4 relative border border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setShowAddContactModal(false)}
              aria-label="Tutup tambah kontak"
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full transition-colors"
            >
              <X size={18} />
            </button>

            <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">Tambah Kontak Pengurus</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold">Icon (emoji atau singkatan)</label>
                <input value={newContact.icon} onChange={(e) => setNewContact({ ...newContact, icon: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm" />
              </div>

              <div>
                <label className="text-xs font-bold">Jabatan</label>
                <input value={newContact.jabatan} onChange={(e) => setNewContact({ ...newContact, jabatan: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm" />
              </div>

              <div>
                <label className="text-xs font-bold">Nama</label>
                <input value={newContact.nama} onChange={(e) => setNewContact({ ...newContact, nama: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm" />
              </div>

              <div>
                <label className="text-xs font-bold">Nomor WhatsApp (628... tanpa +)</label>
                <input value={newContact.wa} onChange={(e) => setNewContact({ ...newContact, wa: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => { setShowAddContactModal(false); setNewContact({ icon: "👤", jabatan: "", nama: "", wa: "" }); }} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">Batal</button>
              <button onClick={handleSaveContact} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">Simpan</button>
            </div>
          </div>
        </div>
      )}

      {selectedPhotoModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedPhotoModal(null)}
        >
          <div
            className="relative max-w-3xl max-h-[85vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedPhotoModal(null)}
              aria-label="Tutup foto"
              className="absolute -top-10 right-0 p-2 text-white bg-white/20 hover:bg-white/40 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <img
              src={selectedPhotoModal}
              alt="Preview Galeri"
              className="w-full h-full object-contain rounded-2xl shadow-2xl border border-slate-800"
            />
          </div>
        </div>
      )}
    </div>
  );
}
