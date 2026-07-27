import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  LayoutDashboard, User, Users, Calendar, Megaphone, Wallet,
  Lightbulb, Image as ImageIcon, Settings, KeyRound, LogOut,
  Crown, UserCheck, DollarSign, MessageSquare, Menu, X, Bell,
  Sun, Moon, Globe, Type, ChevronRight, Info, ArrowRight,
  CheckCircle2, Vote
} from "lucide-react";
import { useTheme } from "./context/ThemeContext";
import { useLocale } from "./hooks/useLocale";
import Dashboard from "./components/Dashboard";
import Chatbot from "./components/Chatbot";
import Anggota from "./components/Anggota";
import Agenda from "./components/Agenda";
import Pengumuman from "./components/Pengumuman";
import Keuangan from "./components/Keuangan";
import Absensi from "./components/Absensi";
import Aspirasi from "./components/Aspirasi";
import Galeri from "./components/Galeri";
import Pengaturan from "./components/Pengaturan";
import SuperAdminDashboard from "./components/SuperAdminDashboard";
import Voting from "./components/Voting";
import AuthModal from "./components/AuthModal";
import LogoutModal from "./components/LogoutModal";
import ToastContainer, { ToastMessage } from "./components/Toast";
import LoginPage from "./components/LoginPage";
import { AuthSession } from "./types";
import { getAuthSession, clearAuthSession, addAccessLog } from "./utils/auth";
import { initializeData } from "./utils/dataStoreSheets";
import { loadAppData, saveAppData, AppData } from "./utils/dataStore";
import { isApiConfigured } from "./components/ApiConfigPanel";
import PandawaLogo from "./components/PandawaLogo";
import { ErrorBoundary } from "./components/ErrorBoundary";

// ============================================================
// TYPES
// ============================================================

type TabId =
  | "dashboard" | "pengumuman" | "agenda" | "keuangan"
  | "kas" | "kas-saya" | "iuran" | "absensi" | "anggota"
  | "aspirasi" | "galeri" | "voting" | "chat" | "pengaturan" | "super-admin";

interface Notification {
  id   : number;
  title: string;
  body : string;
  time : string;
  read : boolean;
  type : "keuangan" | "agenda" | "pengumuman";
}

// ============================================================
// CONSTANTS
// ============================================================

// ✅ ADDED: Secret paths terpusat
const SECRET_PATHS  = ["/verifikasi-sistem", "/sys-x7k9"];
const SECRET_HASHES = ["#verifikasi-sistem", "#sys-x7k9"];

// ✅ ADDED: Logo tap count untuk buka Super Admin modal
const LOGO_TAP_THRESHOLD = 7;
const LOGO_TAP_RESET_MS  = 4000;

// ============================================================
// DEFAULT NOTIFICATIONS
// ============================================================

const DEFAULT_NOTIFICATIONS: Notification[] = [];

// ============================================================
// HELPER — Role Badge
// ============================================================

function RoleBadge({ role, size = "sm" }: { role: string; size?: "xs" | "sm" }) {
  const cls = size === "xs" 
    ? "px-1.5 py-0.5 text-[9px] font-black rounded-md uppercase tracking-wider"
    : "px-2 py-0.5 text-[10px] font-black rounded-md uppercase tracking-wider";

  const map: Record<string, string> = {
    SUPER_ADMIN: `${cls} bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-300`,
    KETUA      : `${cls} bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300`,
    ADMIN      : `${cls} bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300`,
    SEKRETARIS : `${cls} bg-yellow-100 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-300`,
    BENDAHARA  : `${cls} bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300`,
    HUMAS      : `${cls} bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300`,
    PENGURUS   : `${cls} bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300`,
    ANGGOTA    : `${cls} bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300`,
    TAMU       : `${cls} bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300`,
  };

  const labels: Record<string, string> = {
    SUPER_ADMIN: "🔴 SuperAdmin", KETUA: "👑 Ketua", ADMIN: "👑 Ketua",
    SEKRETARIS: "📝 Sekretaris", BENDAHARA: "💰 Bendahara",
    HUMAS: "📢 Humas", PENGURUS: "⚡ Pengurus",
    ANGGOTA: "👥 Anggota", TAMU: "👤 Tamu",
  };

  return (
    <span className={map[role] ?? map["TAMU"]}>
      {labels[role] ?? role}
    </span>
  );
}

// ============================================================
// HELPER — Avatar Color
// ============================================================

function getAvatarClass(role: string): string {
  const map: Record<string, string> = {
    SUPER_ADMIN: "bg-purple-900 text-amber-300",
    KETUA      : "bg-rose-600 text-white",
    ADMIN      : "bg-rose-600 text-white",
    SEKRETARIS : "bg-yellow-600 text-white",
    BENDAHARA  : "bg-emerald-600 text-white",
    HUMAS      : "bg-orange-600 text-white",
    PENGURUS   : "bg-purple-600 text-white",
    ANGGOTA    : "bg-blue-600 text-white",
    TAMU       : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  };
  return map[role] ?? map["TAMU"];
}

// ============================================================
// HELPER — Drawer Header Gradient
// ============================================================

function getDrawerGradient(role: string): string {
  const map: Record<string, string> = {
    SUPER_ADMIN: "bg-gradient-to-br from-purple-800 via-slate-900 to-amber-600",
    KETUA      : "bg-gradient-to-br from-rose-600 to-red-700",
    ADMIN      : "bg-gradient-to-br from-rose-600 to-red-700",
    SEKRETARIS : "bg-gradient-to-br from-yellow-500 to-amber-600",
    BENDAHARA  : "bg-gradient-to-br from-emerald-600 to-teal-700",
    HUMAS      : "bg-gradient-to-br from-orange-500 to-amber-600",
    PENGURUS   : "bg-gradient-to-br from-purple-600 to-indigo-700",
    ANGGOTA    : "bg-gradient-to-br from-blue-600 to-indigo-700",
    TAMU       : "bg-gradient-to-br from-slate-600 to-slate-800",
  };
  return map[role] ?? map["TAMU"];
}

// ============================================================
// APP COMPONENT
// ============================================================

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [appData, setAppData]     = useState<AppData>(loadAppData);

  // Drawer & Overlay State
  const [isDrawerOpen,       setIsDrawerOpen]       = useState(false);
  const [showNotifList,      setShowNotifList]       = useState(false);
  const [showAvatarDropdown, setShowAvatarDropdown] = useState(false);

  // Theme via Context
  const {
    isDark, toggleTheme, setTheme,
    fontSize, setFontSize,
    accentColor, setAccentColor,
  } = useTheme();

  const darkMode    = isDark;
  const setDarkMode = useCallback((val: boolean) => {
    setTheme(val ? "dark" : "light");
    showToast(val ? "Mode gelap aktif 🌙" : "Mode terang aktif ☀️", "success");
  }, [setTheme]);

  // Locale
  const { currentLanguage, setLanguage: changeLanguage, availableLanguages, t } = useLocale();
  const languageName = useMemo(
    () => availableLanguages.find(l => l.code === currentLanguage)?.nativeName || "Indonesia",
    [availableLanguages, currentLanguage]
  );

  // Notification State
  const [notifEnabled,   setNotifEnabled]   = useState(() => localStorage.getItem("app-sound-enabled") !== "false");
  const [notifications,  setNotifications]  = useState<Notification[]>(DEFAULT_NOTIFICATIONS);
  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  // Auth State
  const [session,          setSession]          = useState<AuthSession>({ role: "TAMU", timestamp: Date.now() });
  const [isAuthModalOpen,  setIsAuthModalOpen]  = useState(false);
  const [authModalMode,    setAuthModalMode]    = useState<"ID" | "SUPER_ADMIN">("ID");
  const [isLogoutModalOpen,setIsLogoutModalOpen]= useState(false);
  const [isLoggingOut,     setIsLoggingOut]     = useState(false);
  const [isGuestExploring, setIsGuestExploring] = useState(false);

  // API Configuration state — cek API mana yang sudah dikonfigurasi

  const apiStatus = useMemo(() => ({
    geminiAI: isApiConfigured(appData, "Gemini AI"),
    googleSheets: isApiConfigured(appData, "Google Sheets"),
    telegramBot: isApiConfigured(appData, "Telegram Bot"),
    googleDrive: isApiConfigured(appData, "Google Drive"),
  }), [appData]);

  // Toast State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // ✅ FIXED: showToast pakai useCallback agar referensi stabil
  const showToast = useCallback((
    message: string,
    type: "success" | "error" | "info" | "warning" = "info"
  ) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Logo tap counter untuk hidden Super Admin access
  const [logoClickCount, setLogoClickCount] = useState(0);

  // Touch gesture state untuk swipe drawer
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX,   setTouchEndX]   = useState(0);

  // ──────────────────────────────────────────────────────────
  // EFFECTS
  // ──────────────────────────────────────────────────────────

  // Pulihkan session + load data dari Google Sheets (fallback ke localStorage)
  useEffect(() => {
    const savedSession = getAuthSession();
    setSession(savedSession);

    // Coba load dari Google Sheets, fallback ke localStorage otomatis
    initializeData().then(data => {
      if (data) setAppData(data);
    });
  }, []);

  // Auto-save appData ke localStorage tiap ada perubahan
  useEffect(() => {
    saveAppData(appData);
  }, [appData]);

  // Cek secret URL untuk buka Super Admin modal
  useEffect(() => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    if (SECRET_PATHS.includes(path) || SECRET_HASHES.includes(hash)) {
      setAuthModalMode("SUPER_ADMIN");
      setIsAuthModalOpen(true);
    }
  }, []);

  // Guard tab keuangan untuk TAMU
  useEffect(() => {
    if (["keuangan", "kas", "kas-saya", "iuran"].includes(activeTab) && session.role === "TAMU") {
      setActiveTab("dashboard");
      showToast("Halaman Keuangan khusus untuk Anggota. Silakan masuk terlebih dahulu.", "warning");
    }
  }, [activeTab, session.role, showToast]);

  // ──────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────

  // ✅ FIXED: Logo click handler yang lebih bersih
  const handleLogoClick = useCallback(() => {
    setLogoClickCount(prev => {
      const next = prev + 1;
      if (next >= LOGO_TAP_THRESHOLD) {
        setAuthModalMode("SUPER_ADMIN");
        setIsAuthModalOpen(true);
        showToast("Sistem Verifikasi Terbuka", "info");
        return 0;
      }
      setTimeout(() => setLogoClickCount(0), LOGO_TAP_RESET_MS);
      return next;
    });
  }, [showToast]);

  const handleLogoutRequest = useCallback(() => {
    setIsLogoutModalOpen(true);
  }, []);

  const handleLogoutConfirm = useCallback(async () => {
    setIsLoggingOut(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    addAccessLog(
      session.id_anggota || "TAMU",
      session.nama_lengkap || "Tamu",
      session.role,
      "LOGOUT",
      "User logout dari sesi saat ini"
    );

    sessionStorage.clear();
    const freshSession = clearAuthSession();
    setSession(freshSession);
    setIsGuestExploring(false);
    setActiveTab("dashboard");
    setIsLogoutModalOpen(false);
    setIsLoggingOut(false);
    showToast("✅ Anda telah keluar dengan aman", "info");
  }, [session, showToast]);

  // ✅ FIXED: Tandai semua notif dibaca
  const handleMarkAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    showToast("Semua notifikasi ditandai telah dibaca", "success");
  }, [showToast]);

  // ✅ FIXED: Klik notifikasi → navigasi ke tab terkait
  const handleNotifClick = useCallback((n: Notification) => {
    setNotifications(prev =>
      prev.map(item => item.id === n.id ? { ...item, read: true } : item)
    );
    setActiveTab(n.type as TabId);
    setShowNotifList(false);
  }, []);

  // Sound notification toggle
  const handleToggleNotifSound = useCallback(() => {
    const nextVal = !notifEnabled;
    setNotifEnabled(nextVal);
    localStorage.setItem("app-sound-enabled", String(nextVal));
    if (nextVal) {
      try {
        const ctx  = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } catch { /* AudioContext tidak didukung */ }
      showToast("Notifikasi suara diaktifkan 🔔", "success");
    } else {
      showToast("Notifikasi suara dinonaktifkan 🔕", "info");
    }
  }, [notifEnabled, showToast]);

  // Touch Swipe Drawer
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchEndX(e.targetTouches[0].clientX);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchStartX - touchEndX > 70) setIsDrawerOpen(false);
    if (touchEndX - touchStartX > 70 && touchStartX < 50) setIsDrawerOpen(true);
  }, [touchStartX, touchEndX]);

  // ──────────────────────────────────────────────────────────
  // COMPUTED / MEMOIZED
  // ──────────────────────────────────────────────────────────

  // ✅ FIXED: allNavItems di-memo agar tidak re-create tiap render
  const allNavItems = useMemo(() => [
    { id: "dashboard",  label: t("common.nav.home",         { defaultValue: "Beranda"     }), icon: <LayoutDashboard size={18} />, roles: ["TAMU","ANGGOTA","PENGURUS","ADMIN","SUPER_ADMIN"] },
    { id: "pengumuman", label: t("common.nav.announcement", { defaultValue: "Pengumuman"  }), icon: <Megaphone size={18} />,       roles: ["TAMU","ANGGOTA","PENGURUS","ADMIN","SUPER_ADMIN"] },
    { id: "agenda",     label: t("common.nav.agenda",       { defaultValue: "Agenda"      }), icon: <Calendar size={18} />,        roles: ["TAMU","ANGGOTA","PENGURUS","ADMIN","SUPER_ADMIN"] },
    { id: "keuangan",   label: t("common.nav.finance",      { defaultValue: "Keuangan"    }), icon: <Wallet size={18} />,          roles: ["ANGGOTA","PENGURUS","ADMIN","SUPER_ADMIN"] },
    { id: "absensi",    label: t("common.nav.attendance",   { defaultValue: "Absensi"     }), icon: <UserCheck size={18} />,       roles: ["ANGGOTA","PENGURUS","ADMIN","SUPER_ADMIN"] },
    // Galeri hanya tampil jika Telegram Bot sudah dikonfigurasi
    ...(apiStatus.telegramBot ? [
      { id: "galeri",     label: t("common.nav.gallery",      { defaultValue: "Galeri"      }), icon: <ImageIcon size={18} />,       roles: ["TAMU","ANGGOTA","PENGURUS","ADMIN","SUPER_ADMIN"] }
    ] : []),
    { id: "anggota",    label: t("common.nav.member",       { defaultValue: "Anggota"     }), icon: <Users size={18} />,           roles: ["TAMU","ANGGOTA","PENGURUS","ADMIN","SUPER_ADMIN"] },
    { id: "voting",     label: t("common.nav.voting",       { defaultValue: "Voting"      }), icon: <Vote size={18} />,            roles: ["TAMU","ANGGOTA","PENGURUS","ADMIN","SUPER_ADMIN"] },
    { id: "aspirasi",   label: t("common.nav.aspiration",   { defaultValue: "Aspirasi"    }), icon: <Lightbulb size={18} />,       roles: ["TAMU","ANGGOTA","PENGURUS","ADMIN","SUPER_ADMIN"] },
    // Chat AI hanya tampil jika Gemini API sudah dikonfigurasi
    ...(apiStatus.geminiAI ? [
      { id: "chat",       label: "AI Assistant",                                                 icon: <MessageSquare size={18} />,   roles: ["TAMU","ANGGOTA","PENGURUS","ADMIN","SUPER_ADMIN"] }
    ] : []),
    { id: "pengaturan", label: t("common.nav.settings",     { defaultValue: "Pengaturan"  }), icon: <Settings size={18} />,        roles: ["TAMU","ANGGOTA","PENGURUS","ADMIN","SUPER_ADMIN"] },
    ...(session.role === "SUPER_ADMIN" ? [
      { id: "super-admin", label: "Super Admin", icon: <Crown size={18} className="text-amber-400" />, roles: ["SUPER_ADMIN"] }
    ] : []),
  ], [t, session.role]);

  const navItems = useMemo(
    () => allNavItems.filter(item => item.roles.includes(session.role)),
    [allNavItems, session.role]
  );

  const bottomNavItems = useMemo(() => {
    const items = [
      { id: "dashboard",  label: t("common.nav.home",    { defaultValue: "Beranda" }), icon: <LayoutDashboard size={22} /> },
      { id: "agenda",     label: t("common.nav.agenda",  { defaultValue: "Agenda"  }), icon: <Calendar size={22} /> },
    ];
    if (session.role !== "TAMU") {
      items.push({ id: "keuangan", label: t("common.nav.finance", { defaultValue: "Kas" }), icon: <Wallet size={22} /> });
    } else {
      items.push({ id: "pengumuman", label: t("common.nav.announcement", { defaultValue: "Berita" }), icon: <Megaphone size={22} /> });
    }
    items.push({ id: "pengaturan", label: t("common.nav.profile", { defaultValue: "Profil"  }), icon: <User size={22} /> });
    return items;
  }, [t, session.role]);

  // ──────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────

  if (session.role === "TAMU" && !isGuestExploring) {
    return (
      <div className={`min-h-screen h-full w-full flex flex-col ${darkMode ? "dark" : ""}`}>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
        <LoginPage
          anggotaList={appData.Anggota || []}
          onLoginSuccess={(newSession) => {
            setSession(newSession);
            setIsGuestExploring(false);
            if (newSession.role === "SUPER_ADMIN") {
              setActiveTab("super-admin");
            } else if (newSession.role !== "TAMU") {
              setActiveTab("dashboard");
            }
          }}
          onBrowseAsGuest={() => setIsGuestExploring(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen h-full w-full ${darkMode ? "dark" : ""} bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row font-sans transition-colors duration-300`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Toast Provider ───────────────────────────────────── */}
      {/* ✅ FIXED: Pakai ToastContainer (nama export yang benar) */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* ── Top Header Mobile ────────────────────────────────── */}
      <header className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 flex justify-between items-center px-4 py-2.5 shrink-0 transition-colors">
        <button
          onClick={() => setIsDrawerOpen(true)}
          aria-label="Buka menu"
          className="p-2 -ml-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all focus:outline-none"
        >
          <Menu size={24} />
        </button>

        <div onClick={handleLogoClick} className="cursor-pointer select-none flex items-center justify-center gap-2 flex-1">
          <PandawaLogo size={28} />
          <div className="text-left">
            <h1 className="text-xs font-black text-emerald-700 dark:text-emerald-400 leading-none">Remaja Legok 03</h1>
            <p className="text-[8px] font-extrabold text-slate-400 dark:text-slate-500 mt-0.5 uppercase tracking-wide">RT 03/RW 04</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Bell Notification */}
          <button
            onClick={() => setShowNotifList(prev => !prev)}
            aria-label={`Notifikasi (${unreadCount} belum dibaca)`}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all relative"
          >
            <Bell size={22} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Avatar Button */}
          <div className="relative">
            <button
              onClick={() => setShowAvatarDropdown(prev => !prev)}
              aria-label="Menu profil"
              className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center border transition-all ${getAvatarClass(session.role)}`}
            >
              {session.role === "TAMU" ? "T" : (session.nama_lengkap?.charAt(0) ?? "U")}
            </button>

            {showAvatarDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowAvatarDropdown(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{session.nama_lengkap || "Tamu"}</p>
                    <p className="text-[10px] font-medium text-slate-500 mt-0.5 truncate">{session.id_anggota || "Tamu"} • {session.role}</p>
                  </div>
                  <div className="p-1.5">
                    <button
                      onClick={() => { setActiveTab("pengaturan"); setShowAvatarDropdown(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl flex items-center gap-2"
                    >
                      <User size={16} /> Profil Saya
                    </button>
                    <button
                      onClick={() => { setActiveTab("pengaturan"); setShowAvatarDropdown(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl flex items-center gap-2"
                    >
                      <Settings size={16} /> Pengaturan
                    </button>
                  </div>
                  {session.role !== "TAMU" && (
                    <div className="p-1.5 border-t border-slate-100 dark:border-slate-700">
                      <button
                        onClick={() => { setShowAvatarDropdown(false); handleLogoutRequest(); }}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl flex items-center gap-2 font-bold"
                      >
                        <LogOut size={16} /> Keluar Akun
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Notification Popover ─────────────────────────────── */}
      {showNotifList && (
        <>
          <div className="fixed inset-0 z-30 bg-transparent" onClick={() => setShowNotifList(false)} />
          <div className="fixed top-14 right-4 w-[290px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-40 p-3 animate-in fade-in slide-in-from-top-3 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-2">
              <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Bell size={14} className="text-emerald-600" /> Notifikasi
              </span>
              <button onClick={handleMarkAllRead} className="text-[9px] text-emerald-600 font-extrabold hover:underline">
                Tandai Dibaca
              </button>
            </div>
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
              {notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  className={`p-2 rounded-xl border transition-all cursor-pointer ${
                    n.read
                      ? "bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 text-slate-500"
                      : "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40 text-slate-800 dark:text-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-[10px] font-extrabold ${n.read ? "text-slate-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                      {n.title}
                    </span>
                    <span className="text-[8px] text-slate-400">{n.time}</span>
                  </div>
                  <p className="text-[10px] leading-relaxed line-clamp-2">{n.body}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Mobile Drawer Overlay ────────────────────────────── */}
      {isDrawerOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* ── Mobile Drawer Content ────────────────────────────── */}
      <div className={`md:hidden fixed top-0 left-0 bottom-0 w-[82vw] max-w-[310px] bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${
        isDrawerOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        {/* Drawer Header */}
        <div className={`p-5 text-white flex flex-col justify-between shrink-0 relative overflow-hidden ${getDrawerGradient(session.role)}`}>
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -left-6 -top-6 w-20 h-20 bg-white/5 rounded-full blur-lg pointer-events-none" />

          <button
            onClick={() => setIsDrawerOpen(false)}
            aria-label="Tutup menu"
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white/90"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3 mt-2">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-inner ${getAvatarClass(session.role)}`}>
              {session.role.charAt(0)}
            </div>
            <div className="overflow-hidden flex-1">
              <h2 className="font-extrabold text-sm truncate">
                {session.role === "TAMU" ? "Warga / Tamu" : session.nama_lengkap}
              </h2>
              <p className="text-[10px] opacity-80 font-mono tracking-wider truncate mt-0.5">
                {session.id_anggota || "ID: RL03-TAMU"}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
            <RoleBadge role={session.role} size="xs" />
            {session.role !== "TAMU" ? (
              <button
                onClick={() => { setActiveTab("pengaturan"); setIsDrawerOpen(false); }}
                className="text-[10px] font-bold text-white underline hover:opacity-90 flex items-center gap-0.5"
              >
                Profil Lengkap <ArrowRight size={10} />
              </button>
            ) : (
              <button
                onClick={() => { setAuthModalMode("ID"); setIsAuthModalOpen(true); setIsDrawerOpen(false); }}
                className="px-2 py-0.5 bg-white text-emerald-800 rounded-md text-[10px] font-black uppercase hover:bg-emerald-50 transition-all"
              >
                Masuk ID
              </button>
            )}
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 dark:bg-slate-900">

          {/* Navigasi Utama */}
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 px-1">
              Navigasi Utama
            </span>
            <div className="space-y-0.5">
              {navItems.map(item => {
                const isActive = activeTab === item.id;
                // ✅ Badge notifikasi per menu (hanya tampil jika ada data)
                const badge = item.id === 'pengumuman' && unreadCount > 0
                  ? { text: `${unreadCount} baru`, color: "bg-rose-500 text-white" }
                  : undefined;

                return (
                  <button
                    key={`drawer-${item.id}`}
                    onClick={() => { setActiveTab(item.id as TabId); setIsDrawerOpen(false); }}
                    className={`flex items-center justify-between w-full p-2.5 rounded-xl transition-all font-bold text-xs ${
                      isActive
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-l-4 border-emerald-600 pl-2"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {badge && (
                        <span className={`px-1.5 py-0.5 text-[9px] font-black rounded-full ${badge.color}`}>
                          {badge.text}
                        </span>
                      )}
                      <ChevronRight size={12} className="text-slate-300 dark:text-slate-600" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fitur Khusus Level */}
          {session.role !== "TAMU" && (
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 px-1">
                Fitur Khusus Level
              </span>
              <div className="space-y-0.5">
                {(["SEKRETARIS","BENDAHARA","PENGURUS"].includes(session.role)) && (
                  <>
                    <button
                      onClick={() => { setActiveTab("agenda"); showToast("Buka agenda untuk log kegiatan harian", "info"); setIsDrawerOpen(false); }}
                      className="flex items-center justify-between w-full p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400 font-bold text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 size={16} className="text-amber-500" />
                        <span>📝 Tugas Pengurus</span>
                      </div>
                      <span className="px-1.5 py-0.5 text-[9px] font-black bg-amber-500 text-white rounded-full">Aktif</span>
                    </button>
                    <button
                      onClick={() => { setActiveTab("keuangan"); setIsDrawerOpen(false); }}
                      className="flex items-center justify-between w-full p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400 font-bold text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <Wallet size={16} className="text-emerald-500" />
                        <span>📊 Rekap Bulanan Kas</span>
                      </div>
                      <ChevronRight size={12} className="text-slate-300 dark:text-slate-600" />
                    </button>
                  </>
                )}

                {(["KETUA","ADMIN"].includes(session.role)) && (
                  <>
                    <button
                      onClick={() => { setActiveTab("keuangan"); setIsDrawerOpen(false); }}
                      className="flex items-center justify-between w-full p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400 font-bold text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <Crown size={16} className="text-rose-500" />
                        <span>📊 Laporan Organisasi</span>
                      </div>
                      <ChevronRight size={12} className="text-slate-300 dark:text-slate-600" />
                    </button>
                    <button
                      onClick={() => { setActiveTab("keuangan"); showToast("Membuka tab persetujuan.", "info"); setIsDrawerOpen(false); }}
                      className="flex items-center justify-between w-full p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400 font-bold text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        <span>✅ Approval Menunggu</span>
                      </div>
                      <span className="px-1.5 py-0.5 text-[9px] font-black bg-rose-500 text-white rounded-full">2</span>
                    </button>
                  </>
                )}

                {session.role === "SUPER_ADMIN" && (
                  <>
                    <button
                      onClick={() => { setActiveTab("super-admin"); setIsDrawerOpen(false); }}
                      className="flex items-center justify-between w-full p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400 font-bold text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <Crown size={16} className="text-amber-500" />
                        <span>🔴 Panel Super Admin</span>
                      </div>
                      <ChevronRight size={12} className="text-slate-300 dark:text-slate-600" />
                    </button>
                    <button
                      onClick={() => { setActiveTab("super-admin"); showToast("Buka aktivitas audit log sistem", "info"); setIsDrawerOpen(false); }}
                      className="flex items-center justify-between w-full p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400 font-bold text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <Info size={16} className="text-purple-500" />
                        <span>📋 Log Aktivitas Sistem</span>
                      </div>
                      <ChevronRight size={12} className="text-slate-300 dark:text-slate-600" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Aksi Cepat */}
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 px-1">
              Aksi Cepat
            </span>
            <div className="grid grid-cols-2 gap-2">
              {session.role === "TAMU" ? (
                <>
                  <button
                    onClick={() => { setAuthModalMode("ID"); setIsAuthModalOpen(true); setIsDrawerOpen(false); }}
                    className="p-3 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-400 text-center rounded-xl border border-emerald-100 dark:border-emerald-900/40 font-bold text-[10px] transition-all flex flex-col items-center gap-1.5 animate-pulse"
                  >
                    <KeyRound size={16} /><span>Masuk Akun</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab("anggota"); setIsDrawerOpen(false); }}
                    className="p-3 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-center rounded-xl border border-slate-200 dark:border-slate-800 font-bold text-[10px] transition-all flex flex-col items-center gap-1.5"
                  >
                    <Users size={16} /><span>Daftar Warga</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { setActiveTab("keuangan"); setIsDrawerOpen(false); }}
                    className="p-3 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 text-blue-800 dark:text-blue-400 text-center rounded-xl border border-blue-100 dark:border-blue-900/40 font-bold text-[10px] transition-all flex flex-col items-center gap-1.5"
                  >
                    <DollarSign size={16} /><span>Bayar Iuran</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab("absensi"); setIsDrawerOpen(false); }}
                    className="p-3 bg-indigo-50 dark:bg-indigo-950/20 hover:bg-indigo-100 text-indigo-800 dark:text-indigo-400 text-center rounded-xl border border-indigo-100 dark:border-indigo-900/40 font-bold text-[10px] transition-all flex flex-col items-center gap-1.5"
                  >
                    <UserCheck size={16} /><span>Absen Kegiatan</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab("aspirasi"); setIsDrawerOpen(false); }}
                    className="p-3 bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 text-amber-800 dark:text-amber-400 text-center rounded-xl border border-amber-100 dark:border-amber-900/40 font-bold text-[10px] transition-all flex flex-col items-center gap-1.5 col-span-2"
                  >
                    <Lightbulb size={16} /><span>Kirim Ide & Aspirasi</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Pengaturan Cepat */}
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 px-1">
              Pengaturan Cepat
            </span>
            <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">

              {/* Dark Mode */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  {darkMode ? <Moon size={15} className="text-yellow-400" /> : <Sun size={15} className="text-amber-500" />}
                  <span>Mode Gelap</span>
                </div>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none relative ${darkMode ? "bg-emerald-600" : "bg-slate-300"}`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-200 ease-in-out ${darkMode ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>

              {/* Notifikasi Suara */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Bell size={15} className="text-indigo-500" />
                  <span>Notifikasi Suara</span>
                </div>
                <button
                  onClick={handleToggleNotifSound}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none relative ${notifEnabled ? "bg-emerald-600" : "bg-slate-300"}`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-200 ease-in-out ${notifEnabled ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>

              {/* Bahasa */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Globe size={15} className="text-teal-500" />
                  <span>Bahasa</span>
                </div>
                <button
                  onClick={() => {
                    const codes   = availableLanguages.map(l => l.code);
                    const nextIdx = (codes.indexOf(currentLanguage) + 1) % codes.length;
                    const next    = availableLanguages[nextIdx];
                    changeLanguage(next.code);
                    showToast(`Bahasa diatur ke ${next.nativeName} 🌐`, "success");
                  }}
                  className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-black text-emerald-600 dark:text-emerald-400 hover:bg-slate-50"
                >
                  {languageName}
                </button>
              </div>

              {/* Font Size */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Type size={15} className="text-purple-500" />
                  <span>Ukuran Font</span>
                </div>
                <button
                  onClick={() => {
                    const sizes   = ["Kecil","Normal","Besar","Sangat Besar"];
                    const nextIdx = (sizes.indexOf(fontSize as string) + 1) % sizes.length;
                    const next    = sizes[nextIdx];
                    setFontSize(next as any);
                    showToast(`Ukuran font diubah ke ${next} 🔤`, "success");
                  }}
                  className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-black text-emerald-600 dark:text-emerald-400 hover:bg-slate-50"
                >
                  {fontSize}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shrink-0">
          {session.role !== "TAMU" ? (
            <button
              onClick={() => { handleLogoutRequest(); setIsDrawerOpen(false); }}
              className="flex items-center justify-center gap-2 p-3 w-full bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl transition-all font-black text-xs"
            >
              <LogOut size={16} /><span>Keluar Sesi</span>
            </button>
          ) : (
            <button
              onClick={() => { setAuthModalMode("ID"); setIsAuthModalOpen(true); setIsDrawerOpen(false); }}
              className="flex items-center justify-center gap-2 p-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-all font-black text-xs"
            >
              <KeyRound size={16} /><span>Masuk dengan ID</span>
            </button>
          )}
          <div className="mt-3 text-center text-[10px] text-slate-400 dark:text-slate-600 font-medium">
            <div>Versi 1.0.0</div>
            <div className="mt-0.5">© 2026 Remaja Legok 03 • Denokan</div>
          </div>
        </div>
      </div>

      {/* ── Sidebar Desktop ──────────────────────────────────── */}
      <aside className="hidden md:flex w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col justify-between sticky top-0 h-screen z-10 shrink-0 transition-colors">
        <div className="p-6 flex-shrink-0 border-b border-slate-100 dark:border-slate-800">
          <div onClick={handleLogoClick} className="cursor-pointer select-none flex items-center gap-3">
            <PandawaLogo size={40} />
            <div>
              <h1 className="text-sm font-black text-emerald-700 dark:text-emerald-400 leading-tight">Remaja Legok 03</h1>
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">RT 03 Denokan</p>
            </div>
          </div>

          {/* Session Card */}
          <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${getAvatarClass(session.role)}`}>
                {session.role.charAt(0)}
              </div>
              <div className="overflow-hidden flex-1">
                <div className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                  {session.role === "TAMU" ? "Mode Warga / Tamu" : session.nama_lengkap}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate">
                  {session.id_anggota || "Tanpa ID"}
                </div>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Level:</span>
              <RoleBadge role={session.role} />
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as TabId)}
              className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all font-bold text-xs text-left ${
                activeTab === item.id
                  ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 shadow-sm"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 mt-auto flex-shrink-0">
          {session.role === "TAMU" ? (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center justify-center gap-2 p-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-all font-bold text-xs"
            >
              <User size={16} /><span>Masuk dengan ID</span>
            </button>
          ) : (
            <button
              onClick={handleLogoutRequest}
              className="flex items-center justify-center gap-2 p-3 w-full bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/20 text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded-xl transition-all font-bold text-xs"
            >
              <LogOut size={16} /><span>Keluar Sesi</span>
            </button>
          )}
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────── */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto pb-24 md:pb-8 h-[calc(100vh-60px)] md:h-screen">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="animate-in fade-in duration-300">

            {activeTab === "dashboard" && (
              <Dashboard
                appData={appData} setAppData={setAppData}
                userRole={session.role} session={session}
                setTab={(tab: string) => setActiveTab(tab as TabId)}
                onOpenAuthModal={() => { setAuthModalMode("ID"); setIsAuthModalOpen(true); }}
              />
            )}

            {activeTab === "pengumuman" && (
              <Pengumuman
                appData={appData} setAppData={setAppData}
                userRole={session.role}
                currentUserName={session.nama_lengkap}
                showToast={showToast}
              />
            )}

            {activeTab === "agenda" && (
              <Agenda
                appData={appData} setAppData={setAppData}
                userRole={session.role}
                currentUserId={session.id_anggota}
                currentUserName={session.nama_lengkap}
                showToast={showToast}
              />
            )}

            {/* ✅ FIXED: Group tab keuangan dalam satu kondisi */}
            {(["keuangan","kas","kas-saya","iuran"] as TabId[]).includes(activeTab) && (
              <Keuangan
                appData={appData} setAppData={setAppData}
                userRole={session.role} session={session}
                currentUserName={session.nama_lengkap}
                showToast={showToast}
                onOpenAuthModal={() => { setAuthModalMode("ID"); setIsAuthModalOpen(true); }}
                initialSubTab={
                  activeTab === "kas-saya" ? "kas-saya" :
                  activeTab === "iuran"    ? "rekap"    :
                  "kas-umum"
                }
              />
            )}

            {activeTab === "absensi" && (
              <Absensi
                appData={appData} setAppData={setAppData}
                userRole={session.role}
                currentUserName={session.nama_lengkap}
                showToast={showToast}
              />
            )}

            {activeTab === "anggota" && (
              <Anggota
                appData={appData} setAppData={setAppData}
                userRole={session.role}
                currentUserId={session.id_anggota}
                showToast={showToast}
              />
            )}

            {activeTab === "aspirasi" && (
              <Aspirasi
                appData={appData} setAppData={setAppData}
                userRole={session.role}
                currentUserId={session.id_anggota}
                currentUserName={session.nama_lengkap}
                showToast={showToast}
              />
            )}

            {activeTab === "galeri" && (
              apiStatus.telegramBot ? (
                <Galeri
                  appData={appData} setAppData={setAppData}
                  userRole={session.role}
                  currentUserName={session.nama_lengkap}
                  showToast={showToast}
                />
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-lg mx-auto text-center space-y-4 shadow-xl mt-10">
                  <div className="w-16 h-16 bg-purple-500/20 text-purple-500 rounded-2xl flex items-center justify-center mx-auto">
                    <ImageIcon size={32} />
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Galeri Belum Dikonfigurasi</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Fitur Galeri memerlukan <strong>Telegram Bot</strong> untuk penyimpanan foto/video.
                    Super Admin dapat mengaturnya di Panel <strong>🔌 API & Integrasi</strong>.
                  </p>
                  <div className="pt-2 flex justify-center gap-3">
                    <button onClick={() => setActiveTab("dashboard")}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer">
                      Kembali ke Beranda
                    </button>
                    {session.role === "SUPER_ADMIN" && (
                      <button onClick={() => setActiveTab("super-admin" as TabId)}
                        className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black transition-all shadow-md cursor-pointer">
                        Buka API & Integrasi
                      </button>
                    )}
                  </div>
                </div>
              )
            )}

            {activeTab === "voting" && (
              <Voting
                appData={appData} setAppData={setAppData}
                userRole={session.role}
                currentUserId={session.id_anggota}
                currentUserName={session.nama_lengkap}
                showToast={showToast}
              />
            )}

            {activeTab === "chat" && (
              apiStatus.geminiAI ? (
                <Chatbot
                  appData={appData}
                  setAppData={setAppData}
                  session={session}
                  showToast={showToast}
                />
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-lg mx-auto text-center space-y-4 shadow-xl mt-10">
                  <div className="w-16 h-16 bg-teal-500/20 text-teal-500 rounded-2xl flex items-center justify-center mx-auto">
                    <MessageSquare size={32} />
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">AI Assistant Belum Aktif</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Fitur AI Chatbot memerlukan <strong>Gemini API Key</strong> dari Google AI Studio.
                    Super Admin dapat mengaturnya di Panel <strong>🔌 API & Integrasi</strong>.
                  </p>
                  <div className="pt-2 flex justify-center gap-3">
                    <button
                      onClick={() => setActiveTab("dashboard")}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Kembali ke Beranda
                    </button>
                    {session.role === "SUPER_ADMIN" && (
                      <button
                        onClick={() => setActiveTab("super-admin" as TabId)}
                        className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-black transition-all shadow-md cursor-pointer"
                      >
                        Buka API & Integrasi
                      </button>
                    )}
                  </div>
                </div>
              )
            )}

            {activeTab === "pengaturan" && (
              <Pengaturan
                session={session}
                appData={appData} setAppData={setAppData}
                onOpenAuthModal={() => setIsAuthModalOpen(true)}
                onLogout={handleLogoutRequest}
                showToast={showToast}
              />
            )}

            {/* ✅ FIXED: Resilient Super Admin Panel — mendukung alias tab & fallback jika belum otorisasi */}
            {(activeTab === "super-admin" || (activeTab as string) === "superadmin" || (activeTab as string) === "super_admin") && (
              session.role === "SUPER_ADMIN" ? (
                <ErrorBoundary>
                  <SuperAdminDashboard
                    appData={appData} setAppData={setAppData}
                    showToast={showToast}
                  />
                </ErrorBoundary>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-lg mx-auto text-center space-y-4 shadow-xl mt-10">
                  <div className="w-16 h-16 bg-amber-500/20 text-amber-500 rounded-2xl flex items-center justify-center mx-auto">
                    <Crown size={32} />
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Akses Khusus Super Admin</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Panel Super Admin hanya dapat diakses dengan otentikasi PIN Dinamis Super Admin. Silakan login terlebih dahulu untuk membuka kontrol sistem.
                  </p>
                  <div className="pt-2 flex justify-center gap-3">
                    <button
                      onClick={() => setActiveTab("dashboard")}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Kembali ke Beranda
                    </button>
                    <button
                      onClick={() => { setAuthModalMode("SUPER_ADMIN"); setIsAuthModalOpen(true); }}
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer"
                    >
                      Login Super Admin
                    </button>
                  </div>
                </div>
              )
            )}

            {/* ✅ FIXED: Fallback antrian layar putih jika tab tidak dikenali */}
            {!["dashboard", "pengumuman", "agenda", "keuangan", "kas", "kas-saya", "iuran", "absensi", "anggota", "aspirasi", "galeri", "voting", "chat", "pengaturan", "super-admin", "superadmin", "super_admin"].includes(activeTab as string) && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-lg mx-auto text-center space-y-4 shadow-xl mt-10">
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Halaman Tidak Ditemukan</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Tampilan tab "{activeTab}" tidak tersedia atau sedang dalam pemeliharaan.
                </p>
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black transition-all shadow-md cursor-pointer"
                >
                  Kembali ke Beranda
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Bottom Navigation Mobile ─────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-20 transition-colors shadow-lg"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex justify-around items-center h-[64px] px-2">
          {bottomNavItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={`bnav-${item.id}`}
                onClick={() => { setActiveTab(item.id as TabId); setIsDrawerOpen(false); }}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-all active:scale-95 ${
                  isActive
                    ? "text-emerald-600 dark:text-emerald-400 font-extrabold"
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400"
                }`}
                style={{ minWidth: "64px", minHeight: "48px" }}
              >
                <div className={`mb-1 p-1 rounded-xl transition-all ${
                  isActive
                    ? "bg-emerald-100 dark:bg-emerald-950/50 scale-110"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}>
                  {item.icon}
                </div>
                <span className="text-[10px] tracking-wide font-bold">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Modals ───────────────────────────────────────────── */}
      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogoutConfirm}
        session={session}
        isLoggingOut={isLoggingOut}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(newSession) => {
          setSession(newSession);
          showToast(`Berhasil masuk sebagai ${newSession.role}!`, "success");
          if (newSession.role !== "TAMU") setActiveTab("keuangan");
        }}
        anggotaList={appData.Anggota || []}
        onNavigateToDaftar={() => setActiveTab("anggota")}
      />
    </div>
  );
}
