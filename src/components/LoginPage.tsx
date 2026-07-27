import React, { useState, useEffect, useRef } from "react";
import { 
  Lock, CreditCard, HelpCircle, Phone, Mail, Globe, Sun, Moon, Laptop,
  CheckCircle2, AlertTriangle, AlertCircle, ShieldAlert, KeyRound, ArrowRight,
  Eye, EyeOff, ChevronRight
} from "lucide-react";
import { AuthSession, AnggotaItem } from "../types";
import { useTheme } from "../context/ThemeContext";
import { useLocale } from "../hooks/useLocale";
import PandawaLogo from "./PandawaLogo";
import { 
  saveAuthSession, 
  checkLockoutStatus, 
  recordFailedPinAttempt, 
  resetPinAttempts, 
  hashPin,
  addAccessLog,
  getRoleFromJabatan,
  verifikasiPINDinamis
} from "../utils/auth";

interface LoginPageProps {
  anggotaList: AnggotaItem[];
  onLoginSuccess: (session: AuthSession) => void;
  onBrowseAsGuest?: () => void;
}

// ============================================================
// TRANS-LITERATION DICTIONARY FOR LOGIN PAGE (ID, EN, JV)
// ============================================================
const LOGIN_I18N: Record<string, Record<string, string>> = {
  id: {
    welcome: "Selamat Datang",
    subtitle: "Portal Digital Remaja Legok 03. Menuju pemuda yang produktif, transparan, dan inovatif.",
    tab_member: "Masuk Anggota / Pengurus",
    tab_admin: "Akses Khusus Super Admin",
    placeholder_id: "Masukkan ID Anggota",
    placeholder_pin: "Masukkan PIN",
    placeholder_confirm_pin: "Konfirmasi PIN Baru",
    remember_me: "Ingat Saya di perangkat ini",
    forgot_pin: "Lupa PIN?",
    btn_login: "Masuk Sesi Aman",
    btn_register_login: "Daftar PIN & Masuk",
    btn_guest: "Lanjutkan sebagai Tamu",
    error_empty_id: "Masukkan ID Anggota Anda!",
    error_empty_pin: "Masukkan PIN Anda!",
    error_confirm_mismatch: "Konfirmasi PIN tidak cocok!",
    error_pin_length: "PIN harus terdiri dari 4 hingga 8 digit angka.",
    error_id_format: "Format ID tidak valid (Contoh: RL03-006 atau 1234567890)",
    error_id_not_found: "ID anda tidak terdaftar di anggota remaja RT 03",
    success_login: "Login Berhasil! Mengalihkan ke Dashboard...",
    connection_online: "Tersambung",
    connection_offline: "Terputus (Mode Offline)",
    connection_offline_warn: "Anda sedang offline. Beberapa data mungkin diambil dari cache lokal.",
    organization_name: "Remaja Legok 03",
    organization_loc: "RT 03 RW 04, Desa Gondoriyo, Kec. Jambu, Kab. Semarang, Jawa Tengah",
    contact_admin: "Hubungi Admin",
    help_title: "Butuh Bantuan Akses?",
    help_desc: "Jika Anda belum terdaftar, lupa PIN, atau mengalami kendala masuk, silakan hubungi tim administrasi kami.",
    help_call: "Kirim Pesan WhatsApp",
    setup_first_pin: " Setup PIN Baru",
    setup_first_pin_desc: "Ini adalah login pertama Anda untuk ID ini. Silakan buat PIN baru (4-8 digit) untuk mengamankan akun Anda ke depan.",
    lockout_active: "Sistem Terkunci",
    lockout_wait: "Terlalu banyak percobaan gagal. Silakan tunggu {{time}}.",
    wrong_pin: "PIN yang dimasukkan salah!"
  },
  en: {
    welcome: "Welcome Back",
    subtitle: "Digital Portal of Remaja Legok 03. Toward a productive, transparent, and innovative youth.",
    tab_member: "Member / Board Login",
    tab_admin: "Special Super Admin Access",
    placeholder_id: "Enter Member ID",
    placeholder_pin: "Enter PIN",
    placeholder_confirm_pin: "Confirm New PIN",
    remember_me: "Remember me on this device",
    forgot_pin: "Forgot PIN?",
    btn_login: "Secure Login",
    btn_register_login: "Register PIN & Login",
    btn_guest: "Continue as Guest",
    error_empty_id: "Please enter your Member ID!",
    error_empty_pin: "Please enter your PIN!",
    error_confirm_mismatch: "PIN confirmation does not match!",
    error_pin_length: "PIN must be between 4 and 8 digits long.",
    error_id_format: "Invalid ID format (Example: RL03-006)",
    error_id_not_found: "Member ID not found in database or archived!",
    success_login: "Login Successful! Redirecting to Dashboard...",
    connection_online: "Connected",
    connection_offline: "Disconnected (Offline Mode)",
    connection_offline_warn: "You are currently offline. Some features and live synchronization are disabled.",
    organization_name: "Remaja Legok 03",
    organization_loc: "RT 03 RW 04, Gondoriyo Village, Jambu, Semarang Regency, Central Java",
    contact_admin: "Contact Admin",
    help_title: "Need Access Assistance?",
    help_desc: "If you are not registered, forgot your PIN, or have login issues, please contact our administrative team.",
    help_call: "Send WhatsApp Message",
    setup_first_pin: "Setup New PIN",
    setup_first_pin_desc: "This is your first login for this ID. Please create a new PIN (4-8 digits) to secure your account.",
    lockout_active: "System Locked",
    lockout_wait: "Too many failed attempts. Please wait {{time}}.",
    wrong_pin: "The PIN entered is incorrect!"
  },
  jv: {
    welcome: "Sugeng Rawuh",
    subtitle: "Portal Digital Remaja Legok 03. Mugi dados pemuda ingkang produktif, transparan, lan inovatif.",
    tab_member: "Mlebet Anggota / Pengurus",
    tab_admin: "Akses Khusus Super Admin",
    placeholder_id: "Mlebetaken ID Anggota",
    placeholder_pin: "Mlebetaken PIN",
    placeholder_confirm_pin: "Konfirmasi PIN Enggal",
    remember_me: "Kersanipun tetep mlebet ten HP niki",
    forgot_pin: "Kesupen PIN?",
    btn_login: "Mlebet Sesi Aman",
    btn_register_login: "Ndaptar PIN & Mlebet",
    btn_guest: "Terusaken dados Tamu",
    error_empty_id: "Mlebetaken ID Anggota panjenengan!",
    error_empty_pin: "Mlebetaken PIN panjenengan!",
    error_confirm_mismatch: "Konfirmasi PIN mboten cocok!",
    error_pin_length: "PIN kedah 4 ngantos 8 digit angka.",
    error_id_format: "Format ID mboten sah (Contoh: RL03-006)",
    error_id_not_found: "ID Anggota mboten wonten ten database utawi sampun dipun-arsip!",
    success_login: "Saged Mlebet! Nembe mindahaken ten Dashboard...",
    connection_online: "Nyambung",
    connection_offline: "Pedot (Mode Offline)",
    connection_offline_warn: "Panjenengan saweg offline. Sebagian data mendet saking memori lokal.",
    organization_name: "Remaja Legok 03",
    organization_loc: "RT 03 RW 04, Deso Gondoriyo, Kec. Jambu, Kab. Semarang, Jawa Tengah",
    contact_admin: "Hubungi Admin",
    help_title: "Butuh Pitulungan Mlebet?",
    help_desc: "Menawi panjenengan dereng terdaftar, kesupen PIN, utawi wonten alangan mlebet, monggo hubungi tim admin.",
    help_call: "Kirim Pesen WhatsApp",
    setup_first_pin: "Nyetel PIN Enggal",
    setup_first_pin_desc: "Niki kaping sepisan mlebet ngginakaken ID niki. Monggo damel PIN enggal (4-8 digit) kagem ngamanaken akun.",
    lockout_active: "Sistem Dikunci",
    lockout_wait: "Kakehan gagal mlebet. Monggo tenggo {{time}}.",
    wrong_pin: "PIN ingkang dipun-mlebetaken salah!"
  }
};

export default function LoginPage({
  anggotaList,
  onLoginSuccess,
  onBrowseAsGuest
}: LoginPageProps) {
  const { currentLanguage, setLanguage, availableLanguages } = useLocale();
  const { isDark, toggleTheme, setTheme } = useTheme();

  // Pick dynamic translations
  const lang = LOGIN_I18N[currentLanguage] || LOGIN_I18N.id;

  // Active Login Mode: "MEMBER" or "SUPER_ADMIN"
  // Super Admin login hanya via secret path/logo-tap (AuthModal), tidak ditampilkan di sini

  // Inputs
  const [memberId, setMemberId] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  // Layout & UI helper states
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [isFirstTimePin, setIsFirstTimePin] = useState(false);
  
  // Status handlers
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // References
  const idInputRef = useRef<HTMLInputElement>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);
  const confirmPinInputRef = useRef<HTMLInputElement>(null);

  // Sync online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Lockout status check
  const lockout = checkLockoutStatus();

  // ID Format Auto-completion and PIN state checking
  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase();

    // Auto hyphen after RL03
    if (val.startsWith("RL03") && !val.includes("-") && val.length > 4) {
      val = `${val.slice(0, 4)}-${val.slice(4)}`;
    }

    // Limit ID length: max 8 for RL03-000, or 10 for numeric IDs
    const maxIdLen = val.startsWith("RL03") ? 8 : 10;
    if (val.length > maxIdLen) {
      val = val.slice(0, maxIdLen);
    }

    setMemberId(val);
    setError("");

    // Check first-time setup PIN condition as user types a valid completed ID
    if (/^RL03-\d{3}$/.test(val) || /^\d{10}$/.test(val)) {
      const storedPinHash = localStorage.getItem(`remaja_legok_pin_${val}`);
      if (!storedPinHash) {
        setIsFirstTimePin(true);
      } else {
        setIsFirstTimePin(false);
      }
    } else {
      setIsFirstTimePin(false);
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const maxLen = 10;
    const val = e.target.value.replace(/[^0-9]/g, "").slice(0, maxLen);
    setPin(val);
    setError("");
  };

  const handleConfirmPinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 8);
    setConfirmPin(val);
    setError("");
  };

  // Submit flow
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (lockout.isLocked) {
      const waitStr = lockout.remainingSeconds < 60 
        ? `${lockout.remainingSeconds}s` 
        : `${lockout.remainingMinutes}m`;
      setError(lang.lockout_wait.replace("{{time}}", waitStr));
      return;
    }

    {
      const cleanId = memberId.trim().toUpperCase();
      const cleanPin = pin.trim();

      // Validations
      if (!cleanId) {
        setError(lang.error_empty_id);
        idInputRef.current?.focus();
        return;
      }

      if (!/^RL03-\d{3}$/.test(cleanId) && !/^\d{10}$/.test(cleanId)) {
        setError(lang.error_id_format);
        idInputRef.current?.focus();
        return;
      }

      if (!cleanPin) {
        setError(lang.error_empty_pin);
        pinInputRef.current?.focus();
        return;
      }

      if (cleanPin.length < 4 || cleanPin.length > 8) {
        setError(lang.error_pin_length);
        pinInputRef.current?.focus();
        return;
      }

      setLoading(true);
      await new Promise((r) => setTimeout(r, 600)); // Smooth timing

      // Find user
      const foundUser = (anggotaList || []).find(
        (a) => a.ID_Anggota.toUpperCase() === cleanId && a.Status_Tampil !== "ARSIP"
      );

      if (!foundUser) {
        setError(lang.error_id_not_found);
        setLoading(false);
        addAccessLog(cleanId, "Seseorang", "TAMU", "LOGIN_GAGAL", "ID tidak terdaftar atau diarsip");
        idInputRef.current?.focus();
        return;
      }

      // Check PIN setup status
      const storedPinHash = localStorage.getItem(`remaja_legok_pin_${cleanId}`);

      if (isFirstTimePin) {
        // Must match confirm PIN
        const cleanConfirm = confirmPin.trim();
        if (cleanConfirm !== cleanPin) {
          setError(lang.error_confirm_mismatch);
          setLoading(false);
          confirmPinInputRef.current?.focus();
          return;
        }

        // Save PIN
        const hashed = hashPin(cleanPin);
        localStorage.setItem(`remaja_legok_pin_${cleanId}`, hashed);
        setIsFirstTimePin(false);
        addAccessLog(cleanId, foundUser.Nama_Lengkap, getRoleFromJabatan(foundUser.Jabatan), "PIN_SETUP", "Menginisialisasi PIN baru");
      } else {
        // Verify PIN
        const hashedInput = hashPin(cleanPin);
        if (hashedInput !== storedPinHash) {
          const attempts = recordFailedPinAttempt(cleanPin);
          if (attempts >= 5) {
            setError(lang.lockout_wait.replace("{{time}}", "5 menit"));
          } else {
            setError(`${lang.wrong_pin} Sisa percobaan: ${5 - (attempts % 5)}`);
          }
          setLoading(false);
          pinInputRef.current?.focus();
          return;
        }
      }

      // Success Login
      resetPinAttempts();
      const autoRole = getRoleFromJabatan(foundUser.Jabatan);
      const session = saveAuthSession({
        role: autoRole,
        id_anggota: foundUser.ID_Anggota,
        nama_lengkap: foundUser.Nama_Lengkap,
        nama_panggilan: foundUser.Nama_Panggilan,
        jabatan: foundUser.Jabatan || "Anggota"
      }, rememberMe);

      setSuccess(lang.success_login);
      setLoading(false);

      setTimeout(() => {
        onLoginSuccess(session);
      }, 1000);

    }
  };

  // WhatsApp click handler helper
  const handleWhatsAppHelp = () => {
    const textMessage = encodeURIComponent(
      `Halo Admin Remaja Legok 03, saya memiliki kendala masuk ke dalam aplikasi. Mohon bantuannya.`
    );
    window.open(`https://wa.me/6281234567890?text=${textMessage}`, "_blank");
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-gradient-to-tr from-slate-100 via-slate-50 to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950 text-slate-800 dark:text-slate-100 transition-colors duration-500 relative overflow-hidden select-none">
      
      {/* Dynamic Animated Background Bubbles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-40 dark:opacity-20">
        <div className="absolute top-[10%] left-[5%] w-72 h-72 bg-emerald-300 dark:bg-emerald-900 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[15%] right-[5%] w-96 h-96 bg-teal-200 dark:bg-teal-900 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute top-[50%] left-[40%] w-60 h-60 bg-blue-200 dark:bg-blue-900 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s' }} />
      </div>

      {/* ── TOP HEADER / NAV BAR ── */}
      <header className="w-full max-w-7xl mx-auto px-4 py-4 flex items-center justify-between z-10 relative shrink-0">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <PandawaLogo size={42} />
          <div>
            <h1 className="text-base font-black leading-tight text-emerald-700 dark:text-emerald-400">
              {lang.organization_name}
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
              RT 03 / RW 04 Denokan
            </p>
          </div>
        </div>

        {/* Right Corner Controls: Theme, Language, Connection */}
        <div className="flex items-center gap-2">
          {/* Connection Pill */}
          <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase transition-all duration-300 ${
            isOnline 
              ? "bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400" 
              : "bg-rose-50 border-rose-100 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/40 dark:text-rose-400"
          }`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-rose-500 animate-ping"}`} />
            {isOnline ? lang.connection_online : lang.connection_offline}
          </div>

          {/* Theme Selector */}
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-all focus:outline-none min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Ubah Tema"
          >
            {isDark ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-slate-700" />}
          </button>

          {/* Language Selector */}
          <div className="relative group">
            <button
              onClick={() => {
                const list = availableLanguages;
                const currIdx = list.findIndex(l => l.code === currentLanguage);
                const nextIdx = (currIdx + 1) % list.length;
                setLanguage(list[nextIdx].code);
              }}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-emerald-700 dark:text-emerald-400 font-extrabold text-xs flex items-center gap-1.5 focus:outline-none min-h-[44px]"
            >
              <Globe size={15} />
              <span>
                {availableLanguages.find(l => l.code === currentLanguage)?.nativeName.split(" ")[0]}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ── CENTRAL LOGIN CARD CONTAINER ── */}
      <main className="w-full flex-1 flex flex-col justify-center items-center px-4 py-8 z-10 relative">
        {/* Offline notification card */}
        {!isOnline && (
          <div className="w-full max-w-md mb-4 bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-300 p-3.5 rounded-2xl text-xs flex items-center gap-2.5 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <AlertTriangle size={18} className="shrink-0 text-amber-600 dark:text-amber-500" />
            <div>{lang.connection_offline_warn}</div>
          </div>
        )}

        {/* Outer Wrapper with soft glow and calculated nested border-radius */}
        <div className="w-full max-w-md bg-white/95 dark:bg-slate-900/95 border border-slate-100 dark:border-slate-850 rounded-3xl shadow-2xl p-6 md:p-8 transition-all duration-300 relative overflow-hidden flex flex-col gap-5">
          
          {/* Accent strip */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />

          {/* Welcome Title */}
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner transform hover:scale-105 transition-all">
              <KeyRound size={32} />
            </div>
            <h2 className="text-2xl font-black text-slate-950 dark:text-slate-50 tracking-tight">
              {lang.welcome}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1.5 max-w-sm mx-auto">
              {lang.subtitle}
            </p>
          </div>

          {/* Header — hanya Member Login */}
          <div className="text-center mb-3">
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-200">{lang.tab_member}</h2>
          </div>

          {/* Locked status banner */}
          {lockout.isLocked && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 p-3.5 rounded-2xl text-xs flex items-center gap-2.5 animate-pulse">
              <AlertCircle size={18} className="shrink-0 text-red-500" />
              <div>
                <strong>{lang.lockout_active}:</strong> Silakan tunggu{" "}
                {lockout.remainingSeconds < 60
                  ? `${lockout.remainingSeconds} detik`
                  : `${lockout.remainingMinutes} menit`}{" "}
                sebelum mencoba kembali.
              </div>
            </div>
          )}

          {/* Feedback alerts */}
          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 p-3.5 rounded-2xl text-xs flex items-center gap-2.5 animate-shake duration-300">
              <ShieldAlert size={18} className="shrink-0 text-rose-500" />
              <div>{error}</div>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 p-3.5 rounded-2xl text-xs flex items-center gap-2.5 shadow-sm">
              <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
              <div>{success}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleFormSubmit} className="space-y-4">
            
            {/* Input 1: ID Anggota */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  ID Anggota
                </label>
                <div className="relative flex items-center">
                  <CreditCard className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" size={18} />
                  <input
                    ref={idInputRef}
                    type="text"
                    required
                    disabled={loading || lockout.isLocked}
                    value={memberId}
                    onChange={handleIdChange}
                    placeholder={lang.placeholder_id}
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold tracking-wider font-mono outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50 min-h-[48px]"
                  />
                </div>
              </div>

            {/* First-time PIN setup badge */}
            {isFirstTimePin && (
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-blue-800 dark:text-blue-400 p-3 rounded-2xl text-[11px] leading-relaxed space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="font-extrabold flex items-center gap-1">
                  <AlertCircle size={14} /> {lang.setup_first_pin}
                </div>
                <p>{lang.setup_first_pin_desc}</p>
              </div>
            )}

            {/* Input 2: PIN (Required for both Member & Admin) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                PIN Akses
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" size={18} />
                <input
                  ref={pinInputRef}
                  type={showPin ? "text" : "password"}
                  required
                  disabled={loading || lockout.isLocked}
                  value={pin}
                  onChange={handlePinChange}
                  placeholder={lang.placeholder_pin}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  className="w-full pl-11 pr-12 py-3 bg-slate-50 dark:bg-slate-800 text-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl text-base font-extrabold tracking-widest font-mono outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50 min-h-[48px]"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

            </div>

            {/* Input 3: Confirm PIN (Only for first-time login) */}
            {isFirstTimePin && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-3 duration-300">
                <label className="block text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  {lang.placeholder_confirm_pin}
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" size={18} />
                  <input
                    ref={confirmPinInputRef}
                    type={showConfirmPin ? "text" : "password"}
                    required
                    disabled={loading || lockout.isLocked}
                    value={confirmPin}
                    onChange={handleConfirmPinChange}
                    placeholder={lang.placeholder_confirm_pin}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full pl-11 pr-12 py-3 bg-slate-50 dark:bg-slate-800 text-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold tracking-widest font-mono outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50 min-h-[48px]"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirmPin(!showConfirmPin)}
                    className="absolute right-3.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {showConfirmPin ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {/* Remember Me and Forgot PIN row */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-500 dark:text-slate-400 font-medium">
                <input
                  type="checkbox"
                  disabled={loading}
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4.5 h-4.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 bg-white dark:bg-slate-800 dark:border-slate-700 transition-all cursor-pointer"
                />
                <span>{lang.remember_me}</span>
              </label>

              <button
                  type="button"
                  onClick={() => setShowHelpModal(true)}
                  className="text-emerald-700 dark:text-emerald-400 font-extrabold hover:underline select-none"
                >
                  {lang.forgot_pin}
                </button>
            </div>

            {/* Buttons */}
            <div className="space-y-3 pt-2">
              <button
                type="submit"
                disabled={loading || lockout.isLocked}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm tracking-wide shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none min-h-[48px]"
              >
                {loading ? (
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{isFirstTimePin ? lang.btn_register_login : lang.btn_login}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              {onBrowseAsGuest && (
                <button
                  type="button"
                  onClick={onBrowseAsGuest}
                  className="w-full py-3 px-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-extrabold text-sm border border-slate-200 dark:border-slate-800 shadow-sm active:scale-[0.98] transition-all duration-200 min-h-[48px]"
                >
                  {lang.btn_guest}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Floating Trigger button for help contact info */}
        <button
          onClick={() => setShowHelpModal(true)}
          className="mt-6 flex items-center gap-1.5 px-4.5 py-2.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-900 shadow-md font-bold text-xs select-none focus:outline-none min-h-[44px]"
        >
          <HelpCircle size={15} />
          <span>{lang.contact_admin}</span>
        </button>
      </main>

      {/* ── FOOTER ORGANIZATION DETAILS & VERSION ── */}
      <footer className="w-full bg-white/70 dark:bg-slate-950/40 border-t border-slate-200/50 dark:border-slate-850 py-5 px-4 text-center z-10 shrink-0 relative transition-all">
        <div className="max-w-4xl mx-auto space-y-2">
          {/* Organization Details */}
          <p className="text-[10px] sm:text-xs font-black text-slate-500 dark:text-slate-400 tracking-wide">
            {lang.organization_name} • {lang.organization_loc}
          </p>

          {/* Legal / Copyright details */}
          <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-1 text-[10px] text-slate-400 dark:text-slate-600 font-bold">
            <span>Versi 2.0.0</span>
            <span className="hidden sm:inline">•</span>
            <span>Build #20260724</span>
            <span className="hidden sm:inline">•</span>
            <span>© 2026 {lang.organization_name} • Jambu, Semarang</span>
          </div>
        </div>
      </footer>

      {/* ── HELP / CONTACT ADMIN MODAL DIALOGUE ── */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            onClick={() => setShowHelpModal(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300" 
          />

          {/* Modal Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 relative z-10 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-50 flex items-center gap-2 mb-2">
              <HelpCircle className="text-emerald-600 dark:text-emerald-500" />
              {lang.help_title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
              {lang.help_desc}
            </p>

            {/* Contacts Info list */}
            <div className="space-y-3.5 mb-6">
              {/* WhatsApp Option */}
              <button
                onClick={handleWhatsAppHelp}
                className="w-full p-3.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl flex items-center justify-between text-xs font-bold transition-all"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <Phone size={16} />
                  <div>
                    <p className="font-extrabold text-slate-800 dark:text-slate-200">Ahmad Fauzi (Humas)</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">+62 812-3456-7890</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </button>

              {/* Email Option */}
              <a
                href="mailto:remajaertiga5@gmail.com?subject=Bantuan%20Aplikasi%20Remaja%20Legok"
                className="p-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between text-xs font-bold transition-all"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <Mail size={16} className="text-slate-400 dark:text-slate-500" />
                  <div>
                    <p className="font-extrabold text-slate-800 dark:text-slate-200">Email Hubungan</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">remajaertiga5@gmail.com</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </a>
            </div>

            {/* Close */}
            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-colors min-h-[44px]"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
