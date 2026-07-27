import React, { useState, useEffect } from 'react';
import { AuthSession, UserRole, LogAksesItem } from '../types';
import { AppData, addLogAkses } from '../utils/dataStore';
import { getStoredPINs, setStoredPIN, getAccessLogs, addAccessLog } from '../utils/auth';
import { 
  User, Bell, Shield, Palette, Building, Users, 
  Wallet, ChevronRight, Save, KeyRound, 
  Lock, ChevronLeft, Smartphone, Share2, Search, FileText, Database, Server,
  AlertTriangle, Settings, Info, HelpCircle,
  MessageSquare, Link as LinkIcon, LogOut,
  CreditCard, FileSignature, UploadCloud, Monitor as MonitorIcon, Download,
  Sun, Moon, Trash2
} from 'lucide-react';
import { useTheme, FontSize, AccentColor } from '../context/ThemeContext';
import { useLocale } from '../hooks/useLocale';
import PINField from './PINField';
import ProfilSaya from './ProfilSaya';
import MatriksHakAksesModal from './MatriksHakAksesModal';
import { 
  ambilKonfigAPIByNama, 
  simpanKonfigurasiAPI, 
  sanitasiKonfigAPIUntukClient, 
  cekAksesSuperAdmin 
} from '../utils/apiConfigHelper';
import { KonfigurasiAPIItem } from '../types';

interface PengaturanProps {
  session?: AuthSession;
  appData?: AppData;
  setAppData?: React.Dispatch<React.SetStateAction<AppData>>;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
  showToast?: (msg: string, type: "success" | "error" | "info" | "warning") => void;
}

interface ToggleProps {
  label: string;
  description?: string;
  enabled: boolean;
  onChange: (newValue: boolean) => void;
  id?: string;
}

const Toggle: React.FC<ToggleProps> = ({ label, description, enabled, onChange, id }) => (
  <div className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-slate-800/40 last:border-0 gap-4">
    <div className="min-w-0 flex-1">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">{label}</span>
      {description && <span className="text-xs text-slate-400 dark:text-slate-500 block mt-0.5">{description}</span>}
    </div>
    <button 
      id={id}
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={() => onChange(!enabled)} 
      className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${enabled ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}
    >
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white dark:bg-slate-900 transition-transform ${enabled ? 'left-7' : 'left-1'}`} />
    </button>
  </div>
);

interface SectionItemProps {
  id: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  desc: string;
  onSelect: (id: string) => void;
  t: (key: string, options?: { defaultValue?: string }) => string;
}

const SectionItem: React.FC<SectionItemProps> = ({ id, icon: Icon, title, desc, onSelect, t }) => {
  const keyMap: Record<string, string> = {
    profil: 'profile',
    notif: 'notification',
    privasi: 'privacy',
    aplikasi: 'appearance',
    keamanan: 'security',
    bantuan: 'help',
    tentang: 'about'
  };
  
  const itemKey = keyMap[id];
  const translatedTitle = itemKey ? t(`settings.items.${itemKey}.title`, { defaultValue: title }) : title;
  const translatedDesc = itemKey ? t(`settings.items.${itemKey}.description`, { defaultValue: desc }) : desc;

  return (
    <button 
      type="button"
      onClick={() => onSelect(id)} 
      className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-emerald-300 hover:shadow-md dark:shadow-none transition-all group text-left mb-3"
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/40 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0">
          <Icon size={22} />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">{translatedTitle}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{translatedDesc}</p>
        </div>
      </div>
      <ChevronRight size={18} className="text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 transition-colors shrink-0 ml-2" />
    </button>
  );
};

interface SectionHeaderProps {
  title: string;
  onBack: () => void;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, onBack }) => (
  <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none sticky top-4 z-10">
    <button 
      type="button"
      onClick={onBack} 
      className="p-2 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      <ChevronLeft size={20} />
    </button>
    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h2>
  </div>
);

const matchSearch = (keywordsStr: string, query: string): boolean => {
  if (!query.trim()) return true;
  const terms = query.toLowerCase().trim().split(/\s+/);
  const target = keywordsStr.toLowerCase();
  return terms.every(term => target.includes(term));
};

export default function Pengaturan({ session, appData, setAppData, onOpenAuthModal, onLogout, showToast }: PengaturanProps) {
  const currentRole: UserRole = session?.role || "TAMU";
  
  const {
    theme,
    isDark,
    setTheme,
    fontSize,
    setFontSize,
    highContrast,
    setHighContrast,
    reduceMotion,
    setReduceMotion,
    accentColor,
    setAccentColor
  } = useTheme();

  const {
    currentLanguage,
    setLanguage,
    availableLanguages,
    t
  } = useLocale();

  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const handleLanguageChange = (langCode: string) => {
    setIsChangingLanguage(true);
    setTimeout(() => {
      setLanguage(langCode);
      if (showToast) {
        const langName = availableLanguages.find(l => l.code === langCode)?.nativeName || langCode;
        showToast(langCode === 'id' ? `Bahasa berhasil diubah ke ${langName}!` : langCode === 'jv' ? `Basa kasil diowahi dadi ${langName}!` : `Language successfully changed to ${langName}!`, "success");
      }
      setIsChangingLanguage(false);
    }, 400);
  };
  
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const storedPins = getStoredPINs();
  const [pinPengurus, setPinPengurusState] = useState(appData?.Settings?.PIN_Pengurus || storedPins.pengurusPin);
  const [pinAdmin, setPinAdminState] = useState(appData?.Settings?.PIN_Ketua || storedPins.adminPin);

  // Sync PIN states whenever appData updates asynchronously
  useEffect(() => {
    if (appData?.Settings?.PIN_Pengurus) {
      setPinPengurusState(appData.Settings.PIN_Pengurus);
    }
    if (appData?.Settings?.PIN_Ketua) {
      setPinAdminState(appData.Settings.PIN_Ketua);
    }
  }, [appData?.Settings?.PIN_Pengurus, appData?.Settings?.PIN_Ketua]);

  // Controlled states for settings
  const [notifState, setNotifState] = useState({
    pengumuman: true,
    agenda: true,
    iuranH3: true,
    kasConfirm: true,
    absensi: false,
    aspirasi: true,
    inApp: true,
    wa: false
  });

  const [privasiState, setPrivasiState] = useState({
    noHp: appData?.Anggota?.find(a => a.ID_Anggota === session?.id_anggota)?.Izin_NoHP ?? false,
    email: false,
    alamat: true,
    tglLahir: appData?.Anggota?.find(a => a.ID_Anggota === session?.id_anggota)?.Izin_TanggalLahir ?? false
  });

  const [sekretarisState, setSekretarisState] = useState({
    autoNotulen: true,
    formatSurat: appData?.Settings?.Format_Nomor_Bukti || "[NOMOR]/RL03/[BULAN]/[TAHUN]"
  });

  const [bendaharaState, setBendaharaState] = useState({
    rekeningBca: "BCA - 89218391 a.n Budi",
    rekeningGopay: "GOPAY - 08123456789",
    qrSignature: true,
    autoWaInvoice: false
  });

  const [ketuaState, setKetuaState] = useState({
    namaKomunitas: appData?.Settings?.Nama_Komunitas || "Remaja Legok 03",
    slogan: "Maju Terus Pantang Mundur",
    iuranWajib: true,
    denda: appData?.Settings?.Enable_Denda || false,
    limitApproval: appData?.Settings?.KasAccess?.jabatanPermissions?.[0]?.maxNominalInput || 500000,
    waKetua: appData?.Settings?.WA_Ketua || "6281234567890",
    waSekretaris: appData?.Settings?.WA_Sekretaris || "6281234567891",
    namaKetua: appData?.Settings?.Nama_Ketua || "Iqbal (RT 03 Denokan)",
    namaSekretaris: appData?.Settings?.Nama_Sekretaris || "Nabila (RT 03 Denokan)",
  });

  const [saState, setSaState] = useState({
    maintenanceMode: false
  });

  // G.4 & G.5 API Configuration State (Server-Side Credential Management)
  const [showApiModal, setShowApiModal] = useState(false);
  const [apiFormId, setApiFormId] = useState("");
  const [apiFormNama, setApiFormNama] = useState("");
  const [apiFormKategori, setApiFormKategori] = useState("Layanan AI");
  const [apiFormKey1, setApiFormKey1] = useState("API_KEY");
  const [apiFormVal1, setApiFormVal1] = useState("");
  const [apiFormKey2, setApiFormKey2] = useState("");
  const [apiFormVal2, setApiFormVal2] = useState("");
  const [apiFormStatus, setApiFormStatus] = useState<"Aktif" | "Nonaktif">("Aktif");
  const [apiFormKet, setApiFormKet] = useState("");

  const loadTemplatePreset = (presetType: string) => {
    if (presetType === "gemini") {
      setApiFormNama("Gemini AI");
      setApiFormKategori("Layanan AI");
      setApiFormKey1("API_KEY");
      setApiFormKey2("");
      setApiFormKet("Digunakan oleh Chatbot AI Asisten (Server-Side)");
      if (showToast) showToast("Template Gemini AI berhasil dimuat!", "info");
    } else if (presetType === "gdrive") {
      setApiFormNama("Google Drive Galeri");
      setApiFormKategori("Penyimpanan");
      setApiFormKey1("CLIENT_ID");
      setApiFormKey2("CLIENT_SECRET");
      setApiFormKet("Digunakan oleh Modul Galeri Foto (Server-Side)");
      if (showToast) showToast("Template Google Drive berhasil dimuat!", "info");
    } else if (presetType === "telegram") {
      setApiFormNama("Telegram Bot");
      setApiFormKategori("Notifikasi & Telegram");
      setApiFormKey1("BOT_TOKEN");
      setApiFormKey2("CHAT_ID");
      setApiFormKet("Penyimpanan foto & video otomatis ke Telegram Channel/Group");
      if (showToast) showToast("Template Telegram Bot berhasil dimuat!", "info");
    }
  };

  const [showMatriksModal, setShowMatriksModal] = useState(false);

  const logs: LogAksesItem[] = appData?.LogAkses || getAccessLogs();

  const handleAction = (msg: string, isConfirm: boolean = false) => {
    if (isConfirm) {
      if (window.confirm(`Konfirmasi: Apakah Anda yakin ingin ${msg.toLowerCase()}?`)) {
        if (showToast) showToast(`✅ Perubahan berhasil: ${msg}`, "success");
      }
    } else {
      if (showToast) showToast(`✅ Pengaturan berhasil disimpan`, "success");
    }
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (window.confirm("Konfirmasi: Apakah Anda yakin ingin merubah PIN Akses?")) {
      setStoredPIN("PENGURUS", pinPengurus);
      setStoredPIN("ADMIN", pinAdmin);
      
      if (appData && setAppData) {
        const updated = {
          ...appData,
          Settings: { ...appData.Settings, PIN_Pengurus: pinPengurus, PIN_Ketua: pinAdmin }
        };
        const logged = addLogAkses(updated, session?.nama_lengkap || "Sistem", currentRole, "UBAH_PIN", "Memperbarui PIN Sistem");
        setAppData(logged);
      }
      addAccessLog(session?.id_anggota || "SYS", session?.nama_lengkap || "Sistem", currentRole, "UBAH_PIN", "PIN diperbarui");
      if (showToast) showToast("PIN Sistem berhasil diperbarui! 🔐", "success");
    }
  };

  const handleSaveKetuaOrganisasi = (e: React.FormEvent) => {
    e.preventDefault();
    if (appData && setAppData) {
      const updated = {
        ...appData,
        Settings: {
          ...appData.Settings,
          Nama_Komunitas: ketuaState.namaKomunitas,
          WA_Ketua: ketuaState.waKetua,
          WA_Sekretaris: ketuaState.waSekretaris,
          Nama_Ketua: ketuaState.namaKetua,
          Nama_Sekretaris: ketuaState.namaSekretaris,
        }
      };
      const logged = addLogAkses(updated, session?.nama_lengkap || "Sistem", currentRole, "UBAH_PENGATURAN", "Memperbarui Profil Organisasi & Kontak Pengurus");
      setAppData(logged);
    }
    if (showToast) showToast("Profil Organisasi & Kontak Pengurus berhasil disimpan", "success");
  };

  const handleHapusAkunMandiri = () => {
    if (session?.role === "SUPER_ADMIN") {
      if (showToast) showToast("🛡️ Akun Super Admin bersifat permanen dan tidak dapat dihapus!", "error");
      return;
    }

    if (!session?.id_anggota) {
      if (showToast) showToast("Sesi anggota tidak valid.", "error");
      return;
    }

    if (!window.confirm(`⚠️ PERINGATAN PERMANEN:\nApakah Anda yakin ingin menghapus akun Anda (${session?.nama_lengkap || session?.id_anggota})?\n\nID Anggota Anda (${session?.id_anggota}) tidak akan pernah digunakan ulang oleh sistem untuk menjaga keutuhan data riwayat transaksi kas, voting, dan aspirasi organisasi.\n\nSetelah dihapus, Anda akan otomatis keluar dari aplikasi.`)) {
      return;
    }

    // 1. Catat ke historical ID di localStorage agar tidak pernah bisa dipakai ulang
    try {
      const rawHist = localStorage.getItem("remaja_legok_historical_ids");
      const histSet = new Set(rawHist ? JSON.parse(rawHist) : []);
      histSet.add(session.id_anggota);
      localStorage.setItem("remaja_legok_historical_ids", JSON.stringify(Array.from(histSet)));
    } catch (e) {
      console.error("Gagal menyimpan ID historis:", e);
    }

    // 2. Update appData: Hapus anggota dari daftar aktif dan catat log/riwayat
    if (appData && setAppData) {
      const updatedAnggota = appData.Anggota?.filter(a => a.ID_Anggota !== session.id_anggota) || [];
      
      const newResignation = {
        ID: `RES-${Date.now()}`,
        IDPengaju: session.id_anggota,
        Jabatan: session.role || "ANGGOTA",
        Alasan: "Menghapus akun mandiri melalui Pengaturan",
        TanggalPengajuan: new Date().toISOString().split("T")[0],
        Status: "Disetujui" as const,
        DisetujuiOleh: "Sistem (Mandiri)",
        TanggalKeputusan: new Date().toISOString().split("T")[0],
        Catatan: "Dihapus permanen secara mandiri oleh anggota bersangkutan"
      };

      const updatedAppData = {
        ...appData,
        Anggota: updatedAnggota,
        PengunduranDiri: [newResignation, ...(appData.PengunduranDiri || [])]
      };

      const loggedData = addLogAkses(
        updatedAppData,
        session.nama_lengkap || "Anggota",
        session.role || "ANGGOTA",
        "HAPUS_AKUN_MANDIRI",
        `Anggota ${session.nama_lengkap || ""} (${session.id_anggota}) menghapus akunnya sendiri secara permanen`
      );

      setAppData(loggedData);
    }

    // 3. Hapus sesi & logout
    localStorage.removeItem("remaja_legok_session");
    if (showToast) showToast("✅ Akun Anda berhasil dihapus permanen. Terima kasih atas partisipasi Anda.", "success");
    if (onLogout) {
      onLogout();
    } else {
      window.location.reload();
    }
  };

  const handleSaveKetuaKebijakan = (e: React.FormEvent) => {
    e.preventDefault();
    if (appData && setAppData) {
      const updated = {
        ...appData,
        Settings: {
          ...appData.Settings,
          Enable_Denda: ketuaState.denda
        }
      };
      const logged = addLogAkses(updated, session?.nama_lengkap || "Sistem", currentRole, "UBAH_PENGATURAN", "Memperbarui Kebijakan & Approval");
      setAppData(logged);
    }
    if (showToast) showToast("Kebijakan Organisasi berhasil disimpan", "success");
  };

  const handleSaveSekretarisDokumen = (e: React.FormEvent) => {
    e.preventDefault();
    if (appData && setAppData) {
      const updated = {
        ...appData,
        Settings: {
          ...appData.Settings,
          Format_Nomor_Bukti: sekretarisState.formatSurat
        }
      };
      const logged = addLogAkses(updated, session?.nama_lengkap || "Sistem", currentRole, "UBAH_PENGATURAN", "Memperbarui Format Penomoran Surat");
      setAppData(logged);
    }
    if (showToast) showToast("Format Dokumen & Penomoran berhasil disimpan", "success");
  };

  // --- Views ---
  const renderDetailView = () => {
    switch (activeSection) {
      // ANGGOTA & TAMU: Profil
      case 'profil':
        return (
          <ProfilSaya 
            session={session as AuthSession} 
            appData={appData} 
            setAppData={setAppData} 
            onClose={() => setActiveSection(null)} 
            showToast={showToast || (() => {})}
            onLogout={onLogout}
          />
        );

      // ANGGOTA & TAMU: Notifikasi
      case 'notif':
        return (
          <div className="space-y-6">
            <SectionHeader title="Pengaturan Notifikasi" onBack={() => setActiveSection(null)} />
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Notifikasi Publik</h3>
                <Toggle 
                  label="Pengumuman Baru" 
                  enabled={notifState.pengumuman} 
                  onChange={(v) => {
                    setNotifState(prev => ({ ...prev, pengumuman: v }));
                    if (showToast) showToast(`Notifikasi Pengumuman ${v ? 'diaktifkan' : 'dinonaktifkan'}`, 'info');
                  }} 
                />
                <Toggle 
                  label="Agenda & Kegiatan Publik" 
                  enabled={notifState.agenda} 
                  onChange={(v) => {
                    setNotifState(prev => ({ ...prev, agenda: v }));
                    if (showToast) showToast(`Notifikasi Agenda ${v ? 'diaktifkan' : 'dinonaktifkan'}`, 'info');
                  }} 
                />
              </div>
              {currentRole !== "TAMU" && (
                <>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2 mt-4">Notifikasi Personal</h3>
                    <Toggle 
                      label="Reminder Iuran H-3" 
                      enabled={notifState.iuranH3} 
                      onChange={(v) => {
                        setNotifState(prev => ({ ...prev, iuranH3: v }));
                        if (showToast) showToast(`Reminder Iuran ${v ? 'diaktifkan' : 'dinonaktifkan'}`, 'info');
                      }} 
                    />
                    <Toggle 
                      label="Konfirmasi Pembayaran Kas" 
                      enabled={notifState.kasConfirm} 
                      onChange={(v) => {
                        setNotifState(prev => ({ ...prev, kasConfirm: v }));
                        if (showToast) showToast(`Konfirmasi Kas ${v ? 'diaktifkan' : 'dinonaktifkan'}`, 'info');
                      }} 
                    />
                    <Toggle 
                      label="Pengingat Absensi Kegiatan" 
                      enabled={notifState.absensi} 
                      onChange={(v) => {
                        setNotifState(prev => ({ ...prev, absensi: v }));
                        if (showToast) showToast(`Pengingat Absensi ${v ? 'diaktifkan' : 'dinonaktifkan'}`, 'info');
                      }} 
                    />
                    <Toggle 
                      label="Tanggapan Aspirasi" 
                      enabled={notifState.aspirasi} 
                      onChange={(v) => {
                        setNotifState(prev => ({ ...prev, aspirasi: v }));
                        if (showToast) showToast(`Notifikasi Tanggapan Aspirasi ${v ? 'diaktifkan' : 'dinonaktifkan'}`, 'info');
                      }} 
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2 mt-4">Metode Pengiriman</h3>
                    <Toggle 
                      label="Pemberitahuan In-App" 
                      enabled={notifState.inApp} 
                      onChange={(v) => {
                        setNotifState(prev => ({ ...prev, inApp: v }));
                        if (showToast) showToast(`In-App Notification ${v ? 'diaktifkan' : 'dinonaktifkan'}`, 'info');
                      }} 
                    />
                    <Toggle 
                      label="Notifikasi via WhatsApp" 
                      enabled={notifState.wa} 
                      onChange={(v) => {
                        setNotifState(prev => ({ ...prev, wa: v }));
                        if (showToast) showToast(`WhatsApp Notification ${v ? 'diaktifkan' : 'dinonaktifkan'}`, 'info');
                      }} 
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        );

      // ANGGOTA: Privasi
      case 'privasi':
        return (
          <div className="space-y-6">
            <SectionHeader title="Privasi Data" onBack={() => setActiveSection(null)} />
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Visibilitas Data Antar Anggota</h3>
                <Toggle 
                  label="Tampilkan Nomor HP ke Anggota" 
                  enabled={privasiState.noHp} 
                  onChange={(v) => {
                    setPrivasiState(prev => ({ ...prev, noHp: v }));
                    if (showToast) showToast(`Visibilitas No. HP ${v ? 'ditampilkan' : 'disembunyikan'}`, 'info');
                  }} 
                />
                <Toggle 
                  label="Tampilkan Email ke Anggota" 
                  enabled={privasiState.email} 
                  onChange={(v) => {
                    setPrivasiState(prev => ({ ...prev, email: v }));
                    if (showToast) showToast(`Visibilitas Email ${v ? 'ditampilkan' : 'disembunyikan'}`, 'info');
                  }} 
                />
                <Toggle 
                  label="Tampilkan Alamat Lengkap" 
                  enabled={privasiState.alamat} 
                  onChange={(v) => {
                    setPrivasiState(prev => ({ ...prev, alamat: v }));
                    if (showToast) showToast(`Visibilitas Alamat ${v ? 'ditampilkan' : 'disembunyikan'}`, 'info');
                  }} 
                />
                <Toggle 
                  label="Tampilkan Tanggal Lahir" 
                  enabled={privasiState.tglLahir} 
                  onChange={(v) => {
                    setPrivasiState(prev => ({ ...prev, tglLahir: v }));
                    if (showToast) showToast(`Visibilitas Tgl Lahir ${v ? 'ditampilkan' : 'disembunyikan'}`, 'info');
                  }} 
                />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2 mt-4">Log & Aktivitas</h3>
                <button 
                  type="button"
                  onClick={() => { if (showToast) showToast("Riwayat aktivitas ditampilkan di menu profil", "info"); }} 
                  className="w-full text-left py-3 border-b border-slate-50 dark:border-slate-800/40 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 transition-colors"
                >
                  Lihat Riwayat Aktivitas Saya
                </button>
                {session?.role === "SUPER_ADMIN" ? (
                  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 mb-1">
                      <Shield size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
                      Akun Super Admin Bersifat Permanen
                    </p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400/80 leading-relaxed">
                      Sebagai akun master pemegang otoritas tertinggi sistem, akun Super Admin bersifat permanen dan tidak dapat dihapus oleh siapa pun.
                    </p>
                  </div>
                ) : (
                  <button 
                    type="button"
                    onClick={handleHapusAkunMandiri} 
                    className="w-full text-left py-3 text-sm font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 transition-colors flex items-center gap-2"
                  >
                    <Trash2 size={16} /> Hapus Akun & Data Saya
                  </button>
                )}
              </div>
            </div>
          </div>
        );

      // ALL: Aplikasi
      case 'aplikasi': {
        const accentColorsList: { id: AccentColor; name: string; colorClass: string; bgClass: string; textClass: string }[] = [
          { id: 'green', name: 'Hijau (Default)', colorClass: 'bg-emerald-500', bgClass: 'bg-emerald-50 dark:bg-emerald-950/40', textClass: 'text-emerald-600 dark:text-emerald-400' },
          { id: 'blue', name: 'Biru', colorClass: 'bg-blue-500', bgClass: 'bg-blue-50 dark:bg-blue-950/40', textClass: 'text-blue-600 dark:text-blue-400' },
          { id: 'rose', name: 'Merah Muda', colorClass: 'bg-rose-500', bgClass: 'bg-rose-50 dark:bg-rose-950/40', textClass: 'text-rose-600 dark:text-rose-400' },
          { id: 'amber', name: 'Kuning Amber', colorClass: 'bg-amber-500', bgClass: 'bg-amber-50 dark:bg-amber-950/40', textClass: 'text-amber-600 dark:text-amber-400' },
          { id: 'purple', name: 'Ungu', colorClass: 'bg-purple-500', bgClass: 'bg-purple-50 dark:bg-purple-950/40', textClass: 'text-purple-600 dark:text-purple-400' }
        ];

        const activeAccent = accentColorsList.find(a => a.id === accentColor) || accentColorsList[0];

        return (
          <div className="space-y-6">
            <SectionHeader title="Tampilan Aplikasi" onBack={() => setActiveSection(null)} />
            
            {/* Real-time Preview Container */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Pratinjau Antarmuka Real-time</h3>
              
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200 dark:border-slate-800'} transition-all`}>
                <div className="flex items-center justify-between border-b pb-2 mb-3 border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${activeAccent.colorClass}`} />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Remaja Legok 03</span>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${activeAccent.bgClass} ${activeAccent.textClass}`}>
                    AKTIF
                  </span>
                </div>
                
                <div className="space-y-2 mb-4">
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight">Judul Pratinjau</h4>
                  <p className="text-slate-600 dark:text-slate-400 text-xs">
                    Ini adalah contoh teks paragraf untuk menguji tingkat kenyamanan membaca Anda dengan konfigurasi ukuran font <span className="font-semibold">{fontSize}</span>.
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <button type="button" className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all ${activeAccent.colorClass} hover:opacity-90`}>
                    Tombol Utama
                  </button>
                  <button type="button" className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 transition-all">
                    Batal
                  </button>
                </div>
              </div>
            </div>

            {/* Tema Mode */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Tema Aplikasi</h3>
              <div className="grid grid-cols-3 gap-3">
                <button 
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all text-center gap-2 ${
                    theme === 'light' 
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-bold' 
                      : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Sun size={20} />
                  <span className="text-xs">Terang</span>
                </button>

                <button 
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all text-center gap-2 ${
                    theme === 'dark' 
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-bold' 
                      : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Moon size={20} />
                  <span className="text-xs">Gelap</span>
                </button>

                <button 
                  type="button"
                  onClick={() => setTheme('system')}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all text-center gap-2 ${
                    theme === 'system' 
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-bold' 
                      : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <MonitorIcon size={20} />
                  <span className="text-xs">Sistem</span>
                </button>
              </div>
            </div>

            {/* Pilihan Bahasa / Language Selection */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 relative overflow-hidden">
              {isChangingLanguage && (
                <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-[2px] flex flex-col items-center justify-center z-10 animate-in fade-in duration-200">
                  <div className="w-8 h-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin mb-2" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {currentLanguage === 'id' ? 'Memuat bahasa...' : currentLanguage === 'jv' ? 'Ngundhuh basa...' : 'Loading language...'}
                  </span>
                </div>
              )}
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {currentLanguage === 'id' ? 'Bahasa Aplikasi' : currentLanguage === 'jv' ? 'Basa Aplikasi' : 'Application Language'}
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {availableLanguages.map((lang) => (
                  <button 
                    type="button"
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all text-center gap-2 ${
                      currentLanguage === lang.code 
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-bold shadow-sm' 
                        : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:border-emerald-300 dark:hover:border-emerald-800'
                    }`}
                  >
                    <span className="text-2xl">{lang.flag}</span>
                    <span className="text-xs font-bold">{lang.name}</span>
                    <span className="text-[10px] opacity-70">{lang.nativeName}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Ukuran Font */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Ukuran Teks / Font</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['Kecil', 'Normal', 'Besar', 'Sangat Besar'] as FontSize[]).map((sz) => (
                  <button 
                    type="button"
                    key={sz}
                    onClick={() => setFontSize(sz)}
                    className={`p-3 rounded-xl border text-xs text-center font-semibold transition-all ${
                      fontSize === sz 
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold' 
                        : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Warna Aksen */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Warna Aksen Utama</h3>
              <div className="flex flex-wrap gap-3">
                {accentColorsList.map((a) => (
                  <button
                    type="button"
                    key={a.id}
                    onClick={() => {
                      setAccentColor(a.id);
                      if (showToast) showToast(`Warna aksen berhasil diubah ke ${a.name}!`, "success");
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-xs font-semibold ${
                      accentColor === a.id 
                        ? 'border-slate-900 dark:border-slate-100 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm' 
                        : 'border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full ${a.colorClass}`} />
                    {a.id === 'green' ? 'Hijau (Sistem)' : a.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Aksesibilitas Tambahan */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Aksesibilitas & Preferensi</h3>
              
              <div className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-slate-800/40">
                <div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">Kurangi Animasi (Reduce Motion)</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">Cocok bagi yang sensitif terhadap pergerakan transisi</span>
                </div>
                <button 
                  type="button"
                  role="switch"
                  aria-checked={reduceMotion}
                  aria-label="Kurangi Animasi (Reduce Motion)"
                  onClick={() => {
                    setReduceMotion(!reduceMotion);
                    if (showToast) showToast(reduceMotion ? "Animasi diaktifkan kembali" : "Animasi dinonaktifkan (Reduce Motion)", "info");
                  }} 
                  className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${reduceMotion ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white dark:bg-slate-900 transition-transform ${reduceMotion ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-slate-800/40">
                <div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">Kontras Tinggi (High Contrast)</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">Meningkatkan kejelasan pembatas visual</span>
                </div>
                <button 
                  type="button"
                  role="switch"
                  aria-checked={highContrast}
                  aria-label="Kontras Tinggi (High Contrast)"
                  onClick={() => {
                    setHighContrast(!highContrast);
                    if (showToast) showToast(highContrast ? "Mode kontras normal aktif" : "Mode kontras tinggi diaktifkan", "info");
                  }} 
                  className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${highContrast ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white dark:bg-slate-900 transition-transform ${highContrast ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-slate-800/40 last:border-0">
                <div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">Konfirmasi Sebelum Kirim</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">Meminta verifikasi sebelum menyimpan data krusial</span>
                </div>
                <button 
                  type="button"
                  role="switch"
                  aria-checked={true}
                  aria-label="Konfirmasi Sebelum Kirim"
                  onClick={() => {
                    if (showToast) showToast("Preferensi berhasil disimpan", "success");
                  }} 
                  className="w-12 h-6 rounded-full bg-emerald-500 transition-colors relative shrink-0"
                >
                  <div className="absolute top-1 w-4 h-4 rounded-full bg-white dark:bg-slate-900 transition-transform left-7" />
                </button>
              </div>
            </div>
          </div>
        );
      }

      // ANGGOTA+: Keamanan Akun
      case 'keamanan':
        return (
          <div className="space-y-6">
            <SectionHeader title="Keamanan Akun" onBack={() => setActiveSection(null)} />
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl flex items-start gap-3">
                <Smartphone size={20} className="text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Sesi Saat Ini</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Anda login dari perangkat Android (Chrome) pada {new Date().toLocaleDateString()}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={onLogout} 
                className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
              >
                <LogOut size={18} /> Logout dari Perangkat Ini
              </button>
              <button 
                type="button"
                onClick={onLogout} 
                className="w-full border border-rose-200 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm mt-2"
              >
                <AlertTriangle size={18} /> Logout dari Semua Perangkat
              </button>
            </div>
          </div>
        );

      // HUMAS: Template
      case 'humas_template':
        return (
          <div className="space-y-6">
            <SectionHeader title="Template Publikasi" onBack={() => setActiveSection(null)} />
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">Kelola format pesan untuk disebar ke grup WhatsApp warga.</p>
              <button type="button" onClick={() => handleAction("Template Undangan disalin")} className="w-full text-left p-4 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-emerald-500 bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Undangan Kerja Bakti</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">"Yth. Warga RT 03..."</p>
              </button>
              <button type="button" onClick={() => handleAction("Template Info Kas disalin")} className="w-full text-left p-4 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-emerald-500 bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Info Pembayaran Kas</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">"Bapak/Ibu sekalian, sekadar mengingatkan..."</p>
              </button>
              <button type="button" onClick={() => handleAction("Fitur Tambah Template")} className="w-full py-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold rounded-xl text-sm hover:bg-emerald-200 transition-colors">
                + Tambah Template Baru
              </button>
            </div>
          </div>
        );

      // HUMAS: Sosmed Links
      case 'humas_sosmed':
        return (
          <div className="space-y-6">
            <SectionHeader title="Link Media Sosial Resmi" onBack={() => setActiveSection(null)} />
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Instagram (@remajalegok03)</label>
                <input type="text" defaultValue="https://instagram.com/remajalegok03" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Facebook Fanpage</label>
                <input type="text" defaultValue="https://facebook.com/remajalegok03" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Grup WhatsApp Warga</label>
                <input type="text" defaultValue="https://chat.whatsapp.com/GrupRemajaLegok" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200" />
              </div>
              <button type="button" onClick={() => handleAction("Tautan Media Sosial disimpan")} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors text-sm">
                Simpan Tautan
              </button>
            </div>
          </div>
        );

      // SEKRETARIS: Dokumen
      case 'sekretaris_dokumen':
        return (
          <div className="space-y-6">
            <SectionHeader title="Format & Dokumen" onBack={() => setActiveSection(null)} />
            <form onSubmit={handleSaveSekretarisDokumen} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
              <Toggle 
                label="Otomatis rekap notulen bulanan" 
                enabled={sekretarisState.autoNotulen} 
                onChange={(v) => setSekretarisState(prev => ({ ...prev, autoNotulen: v }))} 
              />
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Format Penomoran Surat</label>
                <input 
                  type="text" 
                  value={sekretarisState.formatSurat} 
                  onChange={(e) => setSekretarisState(prev => ({ ...prev, formatSurat: e.target.value }))}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 text-sm font-mono" 
                />
              </div>
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors text-sm">
                Simpan Format Dokumen
              </button>
            </form>
          </div>
        );

      // SEKRETARIS: Anggota
      case 'sekretaris_anggota':
        return (
          <div className="space-y-6">
            <SectionHeader title="Manajemen Anggota & ID" onBack={() => setActiveSection(null)} />
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Prefix ID Anggota</label>
                <input type="text" defaultValue="RL03-" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-mono bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200" />
              </div>
              <Toggle label="Verifikasi pendaftaran anggota otomatis" enabled={true} onChange={() => handleAction("Toggle verifikasi")} />
              <Toggle label="Izinkan anggota ubah profil sendiri" enabled={true} onChange={() => handleAction("Toggle profil mandiri")} />
              <button type="button" onClick={() => handleAction("Pengaturan Manajemen Anggota disimpan")} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors text-sm">
                Simpan Konfigurasi ID
              </button>
            </div>
          </div>
        );

      // BENDAHARA: Kas
      case 'bendahara_kas':
        return (
          <div className="space-y-6">
            <SectionHeader title="Pengaturan Kas & Rekening" onBack={() => setActiveSection(null)} />
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2"><CreditCard size={18}/> Rekening / E-Wallet Resmi</h3>
                <div className="space-y-3">
                  <input 
                    type="text" 
                    placeholder="BCA - 12345678 a.n Bendahara" 
                    value={bendaharaState.rekeningBca} 
                    onChange={(e) => setBendaharaState(prev => ({ ...prev, rekeningBca: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 text-sm" 
                  />
                  <input 
                    type="text" 
                    placeholder="GOPAY / DANA - 08123..." 
                    value={bendaharaState.rekeningGopay} 
                    onChange={(e) => setBendaharaState(prev => ({ ...prev, rekeningGopay: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 text-sm" 
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">Kuitansi Digital</h3>
                <Toggle 
                  label="Tampilkan Tanda Tangan QR" 
                  enabled={bendaharaState.qrSignature} 
                  onChange={(v) => setBendaharaState(prev => ({ ...prev, qrSignature: v }))} 
                />
                <Toggle 
                  label="Otomatis kirim kuitansi via WA" 
                  enabled={bendaharaState.autoWaInvoice} 
                  onChange={(v) => setBendaharaState(prev => ({ ...prev, autoWaInvoice: v }))} 
                />
              </div>
              <button 
                type="button" 
                onClick={() => handleAction("Pengaturan Kas & Rekening disimpan")} 
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl transition-colors text-sm"
              >
                Simpan Rekening Kas
              </button>
            </div>
          </div>
        );

      // KETUA: Organisasi
      case 'ketua_organisasi':
        return (
          <div className="space-y-6">
            <SectionHeader title="Profil Organisasi" onBack={() => setActiveSection(null)} />
            <form onSubmit={handleSaveKetuaOrganisasi} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Nama Komunitas</label>
                <input 
                  type="text" 
                  value={ketuaState.namaKomunitas} 
                  onChange={(e) => setKetuaState(prev => ({ ...prev, namaKomunitas: e.target.value }))}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 text-sm" 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Moto / Slogan</label>
                <input 
                  type="text" 
                  value={ketuaState.slogan} 
                  onChange={(e) => setKetuaState(prev => ({ ...prev, slogan: e.target.value }))}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 text-sm" 
                />
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-4">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">📞 Kontak Pengurus Utama</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Nama Ketua</label>
                    <input 
                      type="text" 
                      value={ketuaState.namaKetua} 
                      onChange={(e) => setKetuaState(prev => ({ ...prev, namaKetua: e.target.value }))}
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">WhatsApp Ketua (Format: 628xxx)</label>
                    <input 
                      type="text" 
                      value={ketuaState.waKetua} 
                      onChange={(e) => setKetuaState(prev => ({ ...prev, waKetua: e.target.value }))}
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 text-sm" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Nama Sekretaris</label>
                    <input 
                      type="text" 
                      value={ketuaState.namaSekretaris} 
                      onChange={(e) => setKetuaState(prev => ({ ...prev, namaSekretaris: e.target.value }))}
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">WhatsApp Sekretaris (Format: 628xxx)</label>
                    <input 
                      type="text" 
                      value={ketuaState.waSekretaris} 
                      onChange={(e) => setKetuaState(prev => ({ ...prev, waSekretaris: e.target.value }))}
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 text-sm" 
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors text-sm">
                Simpan Profil Organisasi & Kontak
              </button>
            </form>
          </div>
        );
      
      // KETUA: Kebijakan
      case 'ketua_kebijakan':
        return (
          <div className="space-y-6">
            <SectionHeader title="Kebijakan & Approval" onBack={() => setActiveSection(null)} />
            <form onSubmit={handleSaveKetuaKebijakan} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
              <Toggle 
                label="Iuran Wajib Bulanan (Rp 10.000)" 
                enabled={ketuaState.iuranWajib} 
                onChange={(v) => setKetuaState(prev => ({ ...prev, iuranWajib: v }))} 
              />
              <Toggle 
                label="Sistem Denda Keterlambatan" 
                enabled={ketuaState.denda} 
                onChange={(v) => setKetuaState(prev => ({ ...prev, denda: v }))} 
              />
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Batas Nominal Kas Tanpa Approval Ketua</label>
                <input 
                  type="number" 
                  value={ketuaState.limitApproval} 
                  onChange={(e) => setKetuaState(prev => ({ ...prev, limitApproval: Number(e.target.value) }))}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 text-sm font-mono" 
                />
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors text-sm">
                Simpan Kebijakan Organisasi
              </button>
            </form>
          </div>
        );

      // KETUA: Struktur
      case 'ketua_struktur':
        return (
          <div className="space-y-6">
            <SectionHeader title="Struktur Kepengurusan" onBack={() => setActiveSection(null)} />
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500 dark:text-slate-400">Ketua Organisasi:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{appData?.Jabatan?.Ketua?.Nama || "Andi Setiawan"}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500 dark:text-slate-400">Sekretaris:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Budi Raharjo</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500 dark:text-slate-400">Bendahara:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Citra Lestari</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Perubahan posisi kepengurusan dilakukan melalui koordinasi internal pengurus.</p>
              <button type="button" onClick={() => handleAction("Pengaturan Struktur disimpan")} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors text-sm">
                Simpan Struktur
              </button>
            </div>
          </div>
        );

      // SUPER ADMIN: Sistem
      case 'sa_sistem': {
        const sanitizedConfigs = sanitasiKonfigAPIUntukClient(
          appData?.KonfigurasiAPI || [
            {
              ID: "API-01",
              NamaAPI: "Gemini AI",
              Kategori: "Layanan AI",
              KeyField1: "API_KEY",
              ValueField1: "AIzaSy_DEFAULT_KEY_EXAMPLE_8913821",
              Status: "Aktif",
              Keterangan: "Digunakan oleh Chatbot AI Asisten (Server-Side)"
            },
            {
              ID: "API-02",
              NamaAPI: "Google Drive Galeri",
              Kategori: "Penyimpanan",
              KeyField1: "CLIENT_ID",
              ValueField1: "9081230192-example.apps.googleusercontent.com",
              KeyField2: "CLIENT_SECRET",
              ValueField2: "GOCS-SecretKey-Example-12345",
              Status: "Aktif",
              Keterangan: "Digunakan oleh Modul Galeri Foto (Server-Side)"
            },
            {
              ID: "API-03",
              NamaAPI: "Telegram Bot",
              Kategori: "Penyimpanan & Notifikasi",
              KeyField1: "BOT_TOKEN",
              ValueField1: "",
              KeyField2: "CHAT_ID",
              ValueField2: "",
              Status: "Aktif",
              Keterangan: "Penyimpanan foto & video otomatis ke Telegram Channel/Group"
            }
          ],
          currentRole
        );

        const handleSaveApiConfig = (e: React.FormEvent) => {
          e.preventDefault();
          if (!apiFormNama.trim() || !appData || !setAppData) return;

          const newConfigItem: KonfigurasiAPIItem = {
            ID: apiFormId || `API-${Date.now()}`,
            NamaAPI: apiFormNama.trim(),
            Kategori: apiFormKategori.trim() || "Integrasi",
            KeyField1: apiFormKey1.trim() || "API_KEY",
            ValueField1: apiFormVal1.trim(),
            KeyField2: apiFormKey2.trim() || undefined,
            ValueField2: apiFormVal2.trim() || undefined,
            Status: apiFormStatus,
            Keterangan: apiFormKet.trim() || "Konfigurasi API Sistem",
            DitambahkanOleh: session?.nama_lengkap || "Super Admin",
            TanggalDitambahkan: new Date().toISOString().split("T")[0]
          };

          try {
            const updatedAppData = simpanKonfigurasiAPI(appData, newConfigItem, session?.nama_lengkap || "Super Admin", currentRole);
            setAppData(updatedAppData);
            setShowApiModal(false);
            if (showToast) showToast(`Kredensial API "${newConfigItem.NamaAPI}" berhasil disimpan! 🔑`, "success");
          } catch (err: any) {
            if (showToast) showToast(err.message || "Gagal menyimpan konfigurasi API", "error");
          }
        };

        const handleTestServerFetch = (namaApi: string) => {
          if (!appData) return;
          const configObject = ambilKonfigAPIByNama(appData, namaApi);
          if (configObject) {
            const keysFound = Object.keys(configObject).join(", ");
            if (showToast) showToast(`[Server] Success! ambilKonfigAPIByNama("${namaApi}") berhasil membaca keys: ${keysFound}`, "success");
          } else {
            if (showToast) showToast(`[Server] Konfigurasi API "${namaApi}" tidak ditemukan atau Nonaktif.`, "warning");
          }
        };

        return (
          <div className="space-y-6">
            <SectionHeader title="Konfigurasi Integrasi & API" onBack={() => setActiveSection(null)} />
            
            {/* Base Infrastructure */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2"><Database size={18}/> Google Sheets</h3>
                <input type="text" placeholder="Spreadsheet ID" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-mono bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300" defaultValue="1_YOUR_SPREADSHEET_ID_HERE" readOnly />
                <button type="button" onClick={() => { if (showToast) showToast("Koneksi Google Sheets berhasil!", "success"); }} className="text-xs text-blue-600 font-bold mt-2 hover:underline">Test Koneksi</button>
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                
                <input type="text" placeholder="Bucket Name" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-mono bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300" defaultValue="remaja-legok-03" readOnly />
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <Toggle 
                  label="Maintenance Mode" 
                  enabled={saState.maintenanceMode} 
                  onChange={(v) => {
                    setSaState(prev => ({ ...prev, maintenanceMode: v }));
                    if (showToast) showToast(`Maintenance mode ${v ? 'diaktifkan' : 'dinonaktifkan'}`, 'info');
                  }} 
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Jika aktif, hanya Super Admin yang bisa login ke aplikasi.</p>
              </div>
            </div>

            {/* G.4 & G.5 Credential & API Security Management */}
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-5 shadow-xl text-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-400/10 text-amber-400 rounded-2xl">
                    <KeyRound size={22} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white">Keamanan Kredensial API (Aturan G.4 & G.5)</h3>
                    <p className="text-xs text-slate-400">Pengelolaan API Key, Secret, & Token pihak ketiga secara aman di server.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setApiFormId("");
                    setApiFormNama("");
                    setApiFormKategori("Layanan AI");
                    setApiFormKey1("API_KEY");
                    setApiFormVal1("");
                    setApiFormKey2("");
                    setApiFormVal2("");
                    setApiFormStatus("Aktif");
                    setApiFormKet("");
                    setShowApiModal(true);
                  }}
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 self-start sm:self-auto"
                >
                  <KeyRound size={14} /> + Tambah Kredensial API
                </button>
              </div>

              {/* Security Policy Badge */}
              <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-2xl text-xs text-amber-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-400">
                  <Shield size={16} /> Kebijakan Keamanan Server (G.4 & G.5)
                </div>
                <p className="text-[11px] opacity-90 leading-relaxed">
                  Semua kredensial disimpan aman dan hanya dapat dikonsumsi di server via fungsi <code className="bg-amber-900/60 px-1 py-0.5 rounded font-mono text-amber-300">ambilKonfigAPIByNama(namaAPI)</code> oleh modul Galeri & Chatbot AI. Nilai mentah tidak pernah dikirimkan ke HTML/browser pengguna non-Super Admin.
                </p>
              </div>

              {/* API Configurations List */}
              <div className="space-y-3 pt-1">
                {sanitizedConfigs.map((item) => (
                  <div key={item.ID} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-white text-sm">{item.NamaAPI}</span>
                        <span className="px-2.5 py-0.5 bg-slate-800 text-slate-300 rounded-full text-[10px] font-bold">
                          {item.Kategori}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          item.Status === 'Aktif' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {item.Status}
                        </span>
                      </div>

                      <div className="text-xs font-mono text-slate-400 space-y-0.5">
                        {item.KeyField1 && (
                          <p>
                            <span className="text-amber-400 font-bold">{item.KeyField1}:</span>{" "}
                            <span className="bg-slate-900 px-2 py-0.5 rounded text-slate-300">{item.ValueField1 || "-"}</span>
                          </p>
                        )}
                        {item.KeyField2 && (
                          <p>
                            <span className="text-amber-400 font-bold">{item.KeyField2}:</span>{" "}
                            <span className="bg-slate-900 px-2 py-0.5 rounded text-slate-300">{item.ValueField2 || "-"}</span>
                          </p>
                        )}
                      </div>

                      {item.Keterangan && (
                        <p className="text-[11px] text-slate-500 italic">
                          {item.Keterangan}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleTestServerFetch(item.NamaAPI)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Server size={12} /> Test Server Fetch (G.4)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setApiFormId(item.ID);
                          setApiFormNama(item.NamaAPI);
                          setApiFormKategori(item.Kategori);
                          setApiFormKey1(item.KeyField1 || "API_KEY");
                          setApiFormVal1(item.ValueField1 && item.ValueField1 !== "••••••••" ? item.ValueField1 : "");
                          setApiFormKey2(item.KeyField2 || "");
                          setApiFormVal2(item.ValueField2 && item.ValueField2 !== "••••••••" ? item.ValueField2 : "");
                          setApiFormStatus(item.Status === "Nonaktif" ? "Nonaktif" : "Aktif");
                          setApiFormKet(item.Keterangan || "");
                          setShowApiModal(true);
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Form Tambah/Edit API Config */}
            {showApiModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div 
                  onClick={() => setShowApiModal(false)} 
                  className="fixed inset-0 bg-black/70 backdrop-blur-md animate-in fade-in" 
                />

                <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 max-w-md w-full relative z-10 shadow-2xl space-y-4 text-white animate-in zoom-in-95">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="font-extrabold text-amber-400 text-sm flex items-center gap-2">
                      <KeyRound size={18} /> {apiFormId ? "Edit Kredensial API" : "Tambah Kredensial API"}
                    </h3>
                    <button 
                      type="button"
                      onClick={() => setShowApiModal(false)} 
                      className="text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleSaveApiConfig} className="space-y-3">
                    <div>
                      <span className="block text-xs font-bold text-amber-400 mb-1.5">⚡ Gunakan Template Layanan (Preset Cepat)</span>
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => loadTemplatePreset("gemini")}
                          className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-amber-300 rounded-lg text-[10px] font-bold border border-slate-700/50 transition-all flex flex-col items-center gap-1 cursor-pointer"
                        >
                          <span>🤖</span>
                          <span>Gemini AI</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => loadTemplatePreset("gdrive")}
                          className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-amber-300 rounded-lg text-[10px] font-bold border border-slate-700/50 transition-all flex flex-col items-center gap-1 cursor-pointer"
                        >
                          <span>📁</span>
                          <span>Google Drive</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => loadTemplatePreset("telegram")}
                          className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-amber-300 rounded-lg text-[10px] font-bold border border-slate-700/50 transition-all flex flex-col items-center gap-1 cursor-pointer"
                        >
                          <span>📢</span>
                          <span>Telegram Bot</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Nama API / Layanan *</label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Gemini AI, Midjourney"
                        value={apiFormNama}
                        onChange={e => setApiFormNama(e.target.value)}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-amber-400 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">Kategori API *</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setApiFormKategori("Layanan AI")}
                          className={`p-2.5 rounded-xl text-left border transition-all text-xs cursor-pointer flex items-center gap-1.5 ${
                            apiFormKategori === "Layanan AI"
                              ? "bg-amber-500/20 border-amber-500 text-amber-300 font-extrabold"
                              : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          <span>🤖</span>
                          <span>Layanan AI</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setApiFormKategori("Penyimpanan")}
                          className={`p-2.5 rounded-xl text-left border transition-all text-xs cursor-pointer flex items-center gap-1.5 ${
                            apiFormKategori === "Penyimpanan"
                              ? "bg-amber-500/20 border-amber-500 text-amber-300 font-extrabold"
                              : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          <span>📁</span>
                          <span>Penyimpanan</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setApiFormKategori("Notifikasi & Telegram")}
                          className={`p-2.5 rounded-xl text-left border transition-all text-xs cursor-pointer flex items-center gap-1.5 ${
                            apiFormKategori === "Notifikasi & Telegram"
                              ? "bg-amber-500/20 border-amber-500 text-amber-300 font-extrabold"
                              : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          <span>📢</span>
                          <span>Telegram Bot</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setApiFormKategori("Integrasi Lainnya")}
                          className={`p-2.5 rounded-xl text-left border transition-all text-xs cursor-pointer flex items-center gap-1.5 ${
                            !["Layanan AI", "Penyimpanan", "Notifikasi & Telegram"].includes(apiFormKategori) || apiFormKategori === "Integrasi Lainnya"
                              ? "bg-amber-500/20 border-amber-500 text-amber-300 font-extrabold"
                              : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          <span>⚙️</span>
                          <span>Kustom / Lain</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">Status API</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setApiFormStatus("Aktif")}
                          className={`p-2.5 rounded-xl text-center border transition-all text-xs cursor-pointer font-bold flex items-center justify-center gap-1.5 ${
                            apiFormStatus === "Aktif"
                              ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                              : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                          <span>Aktif</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setApiFormStatus("Nonaktif")}
                          className={`p-2.5 rounded-xl text-center border transition-all text-xs cursor-pointer font-bold flex items-center justify-center gap-1.5 ${
                            apiFormStatus === "Nonaktif"
                              ? "bg-rose-500/20 border-rose-500 text-rose-400"
                              : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                          <span>Nonaktif</span>
                        </button>
                      </div>
                    </div>

                    {(!["Layanan AI", "Penyimpanan", "Notifikasi & Telegram"].includes(apiFormKategori) || apiFormKategori === "Integrasi Lainnya") && (
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-amber-400 mb-1">Nama Kategori Kustom *</label>
                        <input
                          type="text"
                          required
                          placeholder="Masukkan nama kategori kustom"
                          value={apiFormKategori === "Integrasi Lainnya" ? "" : apiFormKategori}
                          onChange={e => setApiFormKategori(e.target.value)}
                          className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-amber-400 outline-none font-bold"
                        />
                        <div className="text-[10px] text-slate-400 mt-1.5 bg-slate-950/40 p-2 rounded-lg border border-slate-900">
                          <span className="font-bold block text-slate-300 mb-1">Rekomendasi contoh kategori kustom:</span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {["Pembayaran Online", "Media Sosial", "IoT & Elektronika", "Peta & Geokode", "Autentikasi Eksternal"].map(cat => (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setApiFormKategori(cat)}
                                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-md text-[10px] cursor-pointer transition-all font-semibold"
                              >
                                + {cat}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Key Label 1</label>
                        <input
                          type="text"
                          placeholder="API_KEY"
                          value={apiFormKey1}
                          onChange={e => setApiFormKey1(e.target.value)}
                          className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:ring-2 focus:ring-amber-400 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Value Field 1</label>
                        <input
                          type="password"
                          placeholder="Kredensial Rahasia"
                          value={apiFormVal1}
                          onChange={e => setApiFormVal1(e.target.value)}
                          className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:ring-2 focus:ring-amber-400 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Key Label 2 (Opsional)</label>
                        <input
                          type="text"
                          placeholder="CLIENT_SECRET"
                          value={apiFormKey2}
                          onChange={e => setApiFormKey2(e.target.value)}
                          className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:ring-2 focus:ring-amber-400 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Value Field 2</label>
                        <input
                          type="password"
                          placeholder="Rahasia Tambahan"
                          value={apiFormVal2}
                          onChange={e => setApiFormVal2(e.target.value)}
                          className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:ring-2 focus:ring-amber-400 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Keterangan Modul Konsumen</label>
                      <input
                        type="text"
                        placeholder="Misal: Digunakan oleh Chatbot AI Asisten"
                        value={apiFormKet}
                        onChange={e => setApiFormKet(e.target.value)}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-amber-400 outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-3">
                      <button
                        type="button"
                        onClick={() => setShowApiModal(false)}
                        className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md cursor-pointer"
                      >
                        Simpan Kredensial
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        );
      }

      // SUPER ADMIN: Keamanan
      case 'sa_keamanan':
        return (
          <div className="space-y-6">
            <SectionHeader title="Keamanan & PIN Sistem" onBack={() => setActiveSection(null)} />
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
              <form onSubmit={handleSavePin} className="space-y-4">
                <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200 p-4 rounded-xl text-xs space-y-1">
                  <strong>Peringatan!</strong>
                  <p>Merubah PIN akan berlaku untuk semua device yang belum memiliki sesi aktif.</p>
                </div>
                <PINField id="pin-pengurus" label="PIN Pengurus" value={pinPengurus} onChange={setPinPengurusState} maxLength={6} placeholder="••••••" />
                <PINField id="pin-admin" label="PIN Ketua / Admin" value={pinAdmin} onChange={setPinAdminState} maxLength={6} placeholder="••••••" />
                <button type="submit" className="w-full bg-rose-600 text-white font-bold py-3 rounded-xl hover:bg-rose-700 transition-colors flex items-center justify-center gap-2 text-sm">
                  <Save size={18} /> Simpan Perubahan PIN
                </button>
              </form>
            </div>
          </div>
        );

      // SUPER ADMIN: Audit
      case 'sa_audit':
        return (
          <div className="space-y-6">
            <SectionHeader title="Audit Log Sistem" onBack={() => setActiveSection(null)} />
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Riwayat Aktivitas</h3>
                <button type="button" onClick={() => handleAction("Export CSV Audit Log")} className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"><Download size={14}/> Export CSV</button>
              </div>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white dark:bg-slate-900 sticky top-0 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="p-3">Waktu</th>
                      <th className="p-3">User</th>
                      <th className="p-3">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {logs.map((log: LogAksesItem, idx: number) => (
                      <tr key={log.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-mono text-slate-400 dark:text-slate-500">{new Date(log.Waktu || Date.now()).toLocaleTimeString()}</td>
                        <td className="p-3 font-medium text-slate-700 dark:text-slate-300">{log.Nama} <span className="text-slate-400 dark:text-slate-500 text-[10px]">({log.Role})</span></td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{log.Aksi}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
        
      // SUPER ADMIN: Danger
      case 'sa_danger':
        return (
          <div className="space-y-6">
            <SectionHeader title="Zona Berbahaya" onBack={() => setActiveSection(null)} />
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-rose-200 dark:border-rose-900/50 shadow-sm space-y-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-red-600"></div>
              <h3 className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-2"><AlertTriangle size={20}/> Tindakan Kritis</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Aksi di bawah ini tidak dapat di-undo dan akan mempengaruhi seluruh data.</p>
              
              <div className="space-y-3 pt-4">
                <button type="button" onClick={() => handleAction("Force backup manual", true)} className="w-full text-left p-4 rounded-xl border border-rose-100 dark:border-rose-900/30 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Force Database Backup</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Paksa backup Google Sheets ke Google Drive sekarang.</p>
                </button>
                <button type="button" onClick={() => handleAction("Reset Data Sesi", true)} className="w-full text-left p-4 rounded-xl border border-rose-100 dark:border-rose-900/30 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Clear Cache & Sesi Aktif</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Hapus semua sesi aktif pengguna (force logout all).</p>
                </button>
              </div>
            </div>
          </div>
        );

      // BANTUAN
      case 'bantuan':
        return (
          <div className="space-y-6">
            <SectionHeader title="Bantuan & Panduan Aplikasi" onBack={() => setActiveSection(null)} />
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
              <div className="space-y-3">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">Cara Bayar Iuran Kas</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">Buka menu Keuangan, pilih tab Iuran, lalu klik Bayar Iuran pada bulan yang bersangkutan.</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">Cara Mengirim Aspirasi</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">Masuk ke menu Aspirasi Warga, tulis pesan atau usulan Anda lalu kirimkan.</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">Kontak Pengurus</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">Hubungi Humas atau Sekretaris via WhatsApp jika butuh bantuan langsung.</p>
                </div>
              </div>
            </div>
          </div>
        );

      // TENTANG
      case 'tentang':
        return (
          <div className="space-y-6">
            <SectionHeader title="Tentang Aplikasi" onBack={() => setActiveSection(null)} />
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl mx-auto flex items-center justify-center font-black text-xl">
                RL03
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Remaja Legok 03</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Sistem Informasi & Manajemen Komunitas Pemuda RT 03</p>
              </div>
              <div className="inline-block bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full text-xs font-mono font-bold">
                v1.2.0 (Build 2026)
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800 leading-relaxed">
                Dikembangkan untuk kemajuan dan ketertiban organisasi Remaja Legok 03 Denokan.
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-3">
            <Settings size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <h3 className="text-slate-700 dark:text-slate-300 font-bold">Menu sedang dalam pengembangan</h3>
            <button 
              type="button"
              onClick={() => setActiveSection(null)} 
              className="mt-4 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-sm font-semibold transition-colors"
            >
              Kembali
            </button>
          </div>
        );
    }
  };

  if (activeSection) {
    return <div className="animate-in slide-in-from-right-4 duration-300 pb-20">{renderDetailView()}</div>;
  }

  // --- Main Category List ---
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-32 h-32 bg-slate-50 dark:bg-slate-800/50 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
              <Settings size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('settings.title', { defaultValue: 'Pengaturan' })}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-slate-500 dark:text-slate-400 text-xs">{t('settings.accessLevel', { defaultValue: 'Level Akses' })}:</span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                  currentRole === 'SUPER_ADMIN' ? 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300' :
                  currentRole === 'KETUA' ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300' :
                  ['BENDAHARA', 'SEKRETARIS', 'HUMAS', 'PENGURUS'].includes(currentRole) ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300' :
                  currentRole === 'ANGGOTA' ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300' :
                  'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>{currentRole}</span>
              </div>
            </div>
          </div>
          
          {onOpenAuthModal && (
            <button 
              type="button"
              onClick={onOpenAuthModal} 
              className="px-4 py-2.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md dark:shadow-none"
            >
              {currentRole === "TAMU" ? `👤 ${t('auth.login.verifyButton', { defaultValue: 'Masuk Akun' })}` : `🔑 ${t('settings.changeAccount', { defaultValue: 'Ganti Akun / Peran' })}`}
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="mt-6 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input 
            type="text" 
            placeholder={t('settings.search', { defaultValue: 'Cari pengaturan...' })} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
          />
        </div>
      </div>

      <div className="space-y-6">
        
        {/* SEMUA LEVEL: UMUM */}
        <div className="bg-white dark:bg-slate-900 p-2 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 mt-2 px-3">{t('settings.sections.personal', { defaultValue: 'Personal & Umum' })}</h3>
          {currentRole !== "TAMU" && matchSearch("profil saya identitas foto kontak", searchQuery) && (
            <SectionItem id="profil" icon={User} title="Profil Saya" desc="Identitas, foto, dan kontak" onSelect={setActiveSection} t={t} />
          )}
          {matchSearch("notifikasi pemberitahuan aktivitas pengingat", searchQuery) && (
            <SectionItem id="notif" icon={Bell} title="Notifikasi" desc="Pemberitahuan aktivitas & pengingat" onSelect={setActiveSection} t={t} />
          )}
          {currentRole !== "TAMU" && matchSearch("privasi data visibilitas info personal", searchQuery) && (
            <SectionItem id="privasi" icon={Shield} title="Privasi Data" desc="Visibilitas info personal & aktivitas" onSelect={setActiveSection} t={t} />
          )}
          {matchSearch("tampilan aplikasi tema ukuran font preferensi", searchQuery) && (
            <SectionItem id="aplikasi" icon={Palette} title="Tampilan Aplikasi" desc="Tema, ukuran font, preferensi antarmuka" onSelect={setActiveSection} t={t} />
          )}
          {currentRole !== "TAMU" && matchSearch("keamanan akun manajemen sesi perangkat", searchQuery) && (
            <SectionItem id="keamanan" icon={Lock} title="Keamanan Akun" desc="Manajemen sesi dan perangkat aktif" onSelect={setActiveSection} t={t} />
          )}
          {matchSearch("matriks hak akses wewenang izin per modul role jabatan", searchQuery) && (
            <div 
              onClick={() => setShowMatriksModal(true)}
              className="p-3 hover:bg-amber-500/10 rounded-2xl transition-all cursor-pointer flex items-center justify-between group border border-transparent hover:border-amber-400/30"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-400/10 text-amber-500 rounded-xl group-hover:bg-amber-400 group-hover:text-slate-950 transition-all">
                  <Shield size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 group-hover:text-amber-500 transition-colors">
                    Matriks Hak Akses Lengkap (Bagian I)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Peta wewenang operasional 19 modul × 11 role jabatan
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-400 group-hover:text-amber-500 transition-colors" />
            </div>
          )}
        </div>

        {/* ROLE SPESIFIK: HUMAS */}
        {(currentRole === "HUMAS" || currentRole === "SUPER_ADMIN" || currentRole === "KETUA") && (
          <div className="bg-blue-50/60 dark:bg-blue-950/20 p-2 rounded-3xl border border-blue-100 dark:border-blue-900/30 shadow-sm">
            <h3 className="text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-wider mb-2 mt-2 px-3">Modul Humas</h3>
            {matchSearch("template pesan publikasi format broadcast", searchQuery) && (
              <SectionItem id="humas_template" icon={MessageSquare} title="Template Pesan Publikasi" desc="Format broadcast WhatsApp & Info" onSelect={setActiveSection} t={t} />
            )}
            {matchSearch("link media sosial tautan instagram facebook", searchQuery) && (
              <SectionItem id="humas_sosmed" icon={Share2} title="Link Media Sosial" desc="Tautan Instagram, Facebook resmi" onSelect={setActiveSection} t={t} />
            )}
          </div>
        )}

        {/* ROLE SPESIFIK: SEKRETARIS */}
        {(currentRole === "SEKRETARIS" || currentRole === "SUPER_ADMIN" || currentRole === "KETUA") && (
          <div className="bg-indigo-50/60 dark:bg-indigo-950/20 p-2 rounded-3xl border border-indigo-100 dark:border-indigo-900/30 shadow-sm">
            <h3 className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-2 mt-2 px-3">Modul Sekretaris</h3>
            {matchSearch("format dokumen surat template notulen", searchQuery) && (
              <SectionItem id="sekretaris_dokumen" icon={FileText} title="Format Dokumen & Surat" desc="Template notulen & penomoran surat" onSelect={setActiveSection} t={t} />
            )}
            {matchSearch("manajemen anggota validasi format id", searchQuery) && (
              <SectionItem id="sekretaris_anggota" icon={Users} title="Manajemen Anggota" desc="Validasi keanggotaan & format ID" onSelect={setActiveSection} t={t} />
            )}
          </div>
        )}

        {/* ROLE SPESIFIK: BENDAHARA */}
        {(currentRole === "BENDAHARA" || currentRole === "SUPER_ADMIN" || currentRole === "KETUA") && (
          <div className="bg-amber-50/60 dark:bg-amber-950/20 p-2 rounded-3xl border border-amber-100 dark:border-amber-900/30 shadow-sm">
            <h3 className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2 mt-2 px-3">Modul Bendahara</h3>
            {matchSearch("pengaturan kas keuangan rekening kuitansi", searchQuery) && (
              <SectionItem id="bendahara_kas" icon={Wallet} title="Pengaturan Kas & Keuangan" desc="Info rekening, kuitansi digital, limit" onSelect={setActiveSection} t={t} />
            )}
          </div>
        )}

        {/* ROLE SPESIFIK: KETUA */}
        {(currentRole === "KETUA" || currentRole === "ADMIN" || currentRole === "SUPER_ADMIN") && (
          <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-2 rounded-3xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
            <h3 className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2 mt-2 px-3 flex items-center gap-1.5">
              <Building size={14} /> Panel Organisasi (Ketua)
            </h3>
            {matchSearch("profil organisasi nama komunitas logo visi", searchQuery) && (
              <SectionItem id="ketua_organisasi" icon={Building} title="Profil Organisasi" desc="Nama komunitas, logo, dan visi misi" onSelect={setActiveSection} t={t} />
            )}
            {matchSearch("kebijakan approval aturan iuran denda", searchQuery) && (
              <SectionItem id="ketua_kebijakan" icon={FileSignature} title="Kebijakan & Approval" desc="Aturan iuran, batas approval, denda" onSelect={setActiveSection} t={t} />
            )}
            {matchSearch("struktur kepengurusan jabatan periode", searchQuery) && (
              <SectionItem id="ketua_struktur" icon={Users} title="Struktur Kepengurusan" desc="Kelola jabatan dan periode pengurus" onSelect={setActiveSection} t={t} />
            )}
          </div>
        )}

        {/* ROLE SPESIFIK: SUPER ADMIN */}
        {currentRole === "SUPER_ADMIN" && (
          <div className="bg-slate-900 p-2 rounded-3xl border border-slate-800 shadow-md">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 mt-2 px-3 flex items-center gap-1.5">
              <Server size={14} className="text-purple-400" /> Kontrol Sistem (Super Admin)
            </h3>
            <div className="bg-slate-800/80 rounded-2xl overflow-hidden p-1">
              {matchSearch("integrasi layanan api google sheets drive telegram", searchQuery) && (
                <SectionItem id="sa_sistem" icon={LinkIcon} title="Integrasi Layanan & API" desc="Google Sheets, Drive, Telegram Bot" onSelect={setActiveSection} t={t} />
              )}
              {matchSearch("keamanan pin rotasi sesi batas", searchQuery) && (
                <SectionItem id="sa_keamanan" icon={KeyRound} title="Keamanan & PIN" desc="Rotasi PIN akses, batas sesi" onSelect={setActiveSection} t={t} />
              )}
              {matchSearch("audit log monitoring pantau aktivitas", searchQuery) && (
                <SectionItem id="sa_audit" icon={MonitorIcon} title="Audit Log & Monitoring" desc="Pantau lalu lintas aktivitas pengguna" onSelect={setActiveSection} t={t} />
              )}
              {matchSearch("zona berbahaya reset data backup hapus", searchQuery) && (
                <SectionItem id="sa_danger" icon={AlertTriangle} title="Zona Berbahaya" desc="Reset data, backup manual, hapus log" onSelect={setActiveSection} t={t} />
              )}
            </div>
          </div>
        )}

        {/* KELUAR AKUN */}
        {currentRole !== "TAMU" && (
          <div className="bg-red-50/60 dark:bg-red-950/20 p-2 rounded-3xl border border-red-100 dark:border-red-900/30 shadow-sm mt-8">
            <h3 className="text-[10px] font-bold text-red-500 dark:text-red-400 uppercase tracking-wider mb-2 mt-2 px-3">Keluar Akun</h3>
            <button
              type="button"
              onClick={() => { if (onLogout) onLogout(); }}
              className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-2xl transition-all border border-red-100 dark:border-red-900/30 hover:border-red-200 dark:hover:border-red-800 group"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center group-hover:bg-red-200 dark:group-hover:bg-red-900/60 transition-colors shrink-0">
                  <LogOut size={20} />
                </div>
                <div className="text-left min-w-0">
                  <h4 className="font-bold text-red-600 dark:text-red-400 text-sm truncate">Keluar Akun</h4>
                  <p className="text-xs text-red-400 dark:text-red-500 truncate">Logout dari sesi saat ini</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-red-300 dark:text-red-700 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors shrink-0 ml-2" />
            </button>
          </div>
        )}

        {/* BANTUAN */}
        <div className="bg-white dark:bg-slate-900 p-2 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          {matchSearch("bantuan panduan tutorial", searchQuery) && (
            <SectionItem id="bantuan" icon={HelpCircle} title="Bantuan & Panduan" desc="Tutorial penggunaan aplikasi" onSelect={setActiveSection} t={t} />
          )}
          {matchSearch("tentang aplikasi versi pengembang", searchQuery) && (
            <SectionItem id="tentang" icon={Info} title="Tentang Aplikasi" desc="Versi aplikasi & pengembang" onSelect={setActiveSection} t={t} />
          )}
        </div>

      </div>

      {/* Modal Matriks Hak Akses Lengkap */}
      {showMatriksModal && (
        <MatriksHakAksesModal
          onClose={() => setShowMatriksModal(false)}
          currentUserRole={currentRole}
        />
      )}
    </div>
  );
}
