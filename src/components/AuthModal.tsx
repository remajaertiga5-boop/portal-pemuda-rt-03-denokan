import React, { useState, useEffect } from "react";
import { AuthSession, AnggotaItem } from "../types";
import {
  saveAuthSession,
  checkLockoutStatus,
  recordFailedPinAttempt,
  resetPinAttempts,
  addAccessLog,
  verifikasiPINDinamis,
  getRoleFromJabatan,
} from "../utils/auth";
import {
  ShieldCheck,
  UserCheck,
  X,
  AlertCircle,
  KeyRound,
  Info,
} from "lucide-react";
import PINField from "./PINField";

// ----------------------------------------------------------
// KONSTANTA
// ----------------------------------------------------------
const SA_PIN_LENGTH = 10;

// ----------------------------------------------------------
// TYPES
// ----------------------------------------------------------
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (session: AuthSession) => void;
  anggotaList: AnggotaItem[];        // ✅ Ganti any[] → AnggotaItem[]
  onNavigateToDaftar?: () => void;
  initialMode?: "ID" | "SUPER_ADMIN";
}

// Quick test IDs dihapus — tidak bocorin ID anggota ke publik

// ----------------------------------------------------------
// COMPONENT
// ----------------------------------------------------------
export default function AuthModal({
  isOpen,
  onClose,
  onLoginSuccess,
  anggotaList,
  onNavigateToDaftar,
  initialMode = "ID",
}: AuthModalProps) {
  const [activeTab, setActiveTab]     = useState<"ID" | "SUPER_ADMIN">(initialMode);
  const [memberIdInput, setMemberIdInput] = useState("");
  const [pinInput, setPinInput]       = useState("");
  const [rememberMe, setRememberMe]   = useState(true);
  const [errorMsg, setErrorMsg]       = useState("");
  const [loading, setLoading]         = useState(false);

  // Reset state setiap modal dibuka
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      setErrorMsg("");
      setMemberIdInput("");
      setPinInput("");
      setRememberMe(true);
      setLoading(false);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const lockout = checkLockoutStatus();

  // ----------------------------------------------------------
  // Handler input ID
  // ----------------------------------------------------------
  const handleIdChange = (val: string) => {
    let clean = val.toUpperCase();

    // Auto-format: RL03 → RL03-
    if (
      clean.startsWith("RL03") &&
      !clean.includes("-") &&
      clean.length > 4
    ) {
      clean = `${clean.slice(0, 4)}-${clean.slice(4)}`;
    }

    // Batasi panjang: jika RL03-XXX max 8, jika numeric 10 digit max 10
    const maxLen = clean.startsWith("RL03") ? 8 : 10;
    if (clean.length > maxLen) {
      clean = clean.slice(0, maxLen);
    }

    setMemberIdInput(clean);
    setErrorMsg("");
  };

  // ----------------------------------------------------------
  // Handler input PIN
  // ----------------------------------------------------------
  const handlePinChange = (val: string) => {
    const clean = val.replace(/[^0-9]/g, "").slice(0, SA_PIN_LENGTH);
    setPinInput(clean);
    setErrorMsg("");
  };

  // ----------------------------------------------------------
  // Helper fokus field
  // ----------------------------------------------------------
  const focusField = (id: string) => {
    setTimeout(() => document.getElementById(id)?.focus(), 10);
  };

  // ----------------------------------------------------------
  // TAB 1: Verifikasi ID Anggota
  // ✅ Tidak pakai setTimeout untuk logika sinkron
  // ----------------------------------------------------------
  const handleVerifyMemberId = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const cleanId = memberIdInput.trim().toUpperCase();

    if (!cleanId) {
      setErrorMsg("Masukkan ID Anggota Anda!");
      focusField("id-anggota-login-field");
      return;
    }

    if (!/^RL03-\d{3}$/.test(cleanId) && !/^\d{10}$/.test(cleanId)) {
      setErrorMsg("Format ID tidak valid (Contoh: RL03-XXX atau 10 digit angka)");
      focusField("id-anggota-login-field");
      return;
    }

    setLoading(true);

    // ✅ Type guard — `found` tidak undefined setelah cek
    const found = (anggotaList || []).find(
      (a) =>
        a.ID_Anggota.toUpperCase() === cleanId &&
        a.Status_Tampil !== "ARSIP"
    );

    if (!found) {
      setErrorMsg(
        "ID anda tidak terdaftar di anggota remaja RT 03"
      );
      addAccessLog(
        cleanId,
        "Unknown",
        "TAMU",
        "VERIFIKASI_GAGAL",
        "ID Anggota tidak ditemukan"
      );
      setLoading(false);
      focusField("id-anggota-login-field");
      return;
    }

    const autoRole = getRoleFromJabatan(found.Jabatan);
    const session  = saveAuthSession({
      role         : autoRole,
      id_anggota   : found.ID_Anggota,
      nama_lengkap : found.Nama_Lengkap,
      nama_panggilan: found.Nama_Panggilan,
      jabatan      : found.Jabatan || "Anggota",
    }, rememberMe);

    setLoading(false);
    onLoginSuccess(session);
    onClose();
  };

  // ----------------------------------------------------------
  // TAB 2: Verifikasi Super Admin
  // ----------------------------------------------------------
  const handleVerifySuperAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (lockout.isLocked) {
      const timeStr =
        lockout.remainingSeconds < 60
          ? `${lockout.remainingSeconds} detik`
          : `${lockout.remainingMinutes} menit`;
      setErrorMsg(`Akses ditangguhkan sementara. Silakan tunggu ${timeStr}.`);
      return;
    }

    const cleanPin = pinInput.trim();

    // ✅ Validasi panjang pakai konstanta SA_PIN_LENGTH
    if (cleanPin.length !== SA_PIN_LENGTH) {
      setErrorMsg(`PIN harus tepat ${SA_PIN_LENGTH} digit angka.`);
      focusField("pin-superadmin-login");
      return;
    }

    setLoading(true);

    if (!verifikasiPINDinamis(cleanPin)) {
      const attempts = recordFailedPinAttempt(cleanPin);

      if (attempts >= 5) {
        setErrorMsg("Terlalu banyak percobaan gagal. Akses dikunci sementara.");
      } else if (attempts >= 3) {
        setErrorMsg(
          `Verifikasi gagal. Akses ditangguhkan sementara (30 detik). Sisa percobaan: ${5 - attempts}.`
        );
      } else {
        setErrorMsg(
          `Verifikasi gagal. Sisa percobaan: ${5 - attempts}.`
        );
      }

      setLoading(false);
      focusField("pin-superadmin-login");
      return;
    }

    resetPinAttempts();

    const session = saveAuthSession({
      role          : "SUPER_ADMIN",
      id_anggota    : "SA-001",
      nama_lengkap  : "Super Admin",
      nama_panggilan: "SuperAdmin",
      jabatan       : "Super Admin",
    }, rememberMe);

    setLoading(false);
    onLoginSuccess(session);
    onClose();
  };

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      {/* ✅ Hapus overflow-hidden yang conflict dengan overflow-y-auto */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">

        {/* Tombol Tutup */}
        <button
          onClick={onClose}
          aria-label="Tutup modal login"
          className="absolute top-4 right-4 p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="text-center mb-5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-inner ${
            activeTab === "SUPER_ADMIN"
              ? "bg-slate-800 text-amber-400"
              : "bg-emerald-100 text-emerald-700"
          }`}>
            {activeTab === "SUPER_ADMIN"
              ? <ShieldCheck size={28} />
              : <UserCheck size={28} />}
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
            {activeTab === "SUPER_ADMIN"
              ? "Akses Terbatas"
              : "Masuk dengan ID Anggota"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Remaja Legok 03 RT 03/RW 04 Denokan
          </p>
        </div>

        {/* Notifikasi Lockout */}
        {lockout.isLocked && (
          <div className="mb-4 bg-red-950/80 border border-red-800/60 text-red-200 p-3.5 rounded-2xl text-xs flex items-center gap-2.5">
            <AlertCircle size={18} className="shrink-0 text-red-400" />
            <div>
              <strong>Akses Ditangguhkan:</strong> Silakan tunggu{" "}
              {lockout.remainingSeconds < 60
                ? `${lockout.remainingSeconds} detik`
                : `${lockout.remainingMinutes} menit`}{" "}
              sebelum mencoba kembali.
            </div>
          </div>
        )}

        {/* Tidak ada tab switcher — akses Super Admin hanya via secret path/logo-tap */}

        {/* ===================== TAB 1: ID Anggota ===================== */}
        {activeTab === "ID" && (
          <form onSubmit={handleVerifyMemberId} className="space-y-4">
            {/* Info box */}
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-3.5 rounded-2xl text-xs text-emerald-900 dark:text-emerald-300 leading-relaxed">
              <div className="flex items-start gap-2">
                <Info size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Deteksi Level Otomatis:</strong> Level akses Anda
                  ditentukan otomatis berdasarkan data Jabatan di database.
                </div>
              </div>
            </div>

            {/* Error message */}
            {errorMsg && (
              <div className="p-3 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-xl text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <PINField
              id="id-anggota-login-field"
              label="ID Anggota (Permanen)"
              value={memberIdInput}
              onChange={handleIdChange}
              placeholder="Masukkan ID Anggota"
              maxLength={10}
              isID={true}
              error={!!errorMsg}
              inputClassName="focus:ring-emerald-500 text-slate-900 dark:text-slate-100 text-base tracking-wider font-mono uppercase"
            />



            {/* Remember Me Toggle */}
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 p-3 rounded-2xl">
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-xl ${rememberMe ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"}`}>
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Ingat Saya (Sesi Persisten)
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">
                    Simpan sesi terenkripsi agar tidak perlu login ulang saat browser dibuka kembali
                  </span>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={rememberMe}
                onClick={() => setRememberMe(!rememberMe)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  rememberMe ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-600"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    rememberMe ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black py-3.5 rounded-xl shadow-md dark:shadow-none transition-all flex justify-center items-center gap-2 text-xs uppercase tracking-wider"
              >
                {loading ? "Memeriksa Database..." : "VERIFIKASI & MASUK"}
              </button>

              {onNavigateToDaftar && (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => { onClose(); onNavigateToDaftar(); }}
                    className="text-xs text-emerald-700 dark:text-emerald-400 font-bold hover:underline"
                  >
                    Belum terdaftar? Klik di sini untuk mendaftar
                  </button>
                </div>
              )}
            </div>
          </form>
        )}

        {/* ===================== TAB 2: Super Admin ===================== */}
        {activeTab === "SUPER_ADMIN" && (
          <form onSubmit={handleVerifySuperAdmin} className="space-y-4">
            {/* Header SA */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center text-slate-200 shadow-inner">
              <div className="w-10 h-10 bg-slate-800 text-amber-400 rounded-xl flex items-center justify-center mx-auto mb-2 border border-slate-700">
                <KeyRound size={20} />
              </div>
              <h3 className="font-bold text-slate-100 text-xs tracking-wider uppercase">
                Verifikasi Sistem
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Akses terbatas untuk otorisasi manajerial
              </p>
            </div>

            {/* Error message */}
            {errorMsg && (
              <div className="p-3 bg-red-950/90 text-red-200 border border-red-800/60 rounded-xl text-xs font-medium text-center">
                {errorMsg}
              </div>
            )}

            <PINField
              id="pin-superadmin-login"
              label={`Kode Otorisasi (${SA_PIN_LENGTH} Digit)`}
              value={pinInput}
              onChange={handlePinChange}
              placeholder="••••••••••"
              maxLength={SA_PIN_LENGTH}
              disabled={loading || lockout.isLocked}
              error={!!errorMsg}
              hideProgressText={true}
              inputClassName="focus:ring-amber-500 font-mono text-center tracking-widest text-lg bg-slate-900 dark:bg-slate-950 text-white font-black border-slate-700 placeholder-slate-600"
            />

            {/* Remember Me Toggle */}
            <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-xl ${rememberMe ? "bg-amber-950 text-amber-400 border border-amber-800/40" : "bg-slate-800 text-slate-500"}`}>
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-200 block">
                    Ingat Sesi Perangkat
                  </span>
                  <span className="text-[10px] text-slate-400 block leading-tight">
                    Sesi Super Admin terenkripsi disimpan di LocalStorage & Cookie
                  </span>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={rememberMe}
                onClick={() => setRememberMe(!rememberMe)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  rememberMe ? "bg-amber-500" : "bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-100 shadow-md ring-0 transition duration-200 ease-in-out ${
                    rememberMe ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || lockout.isLocked || pinInput.length !== SA_PIN_LENGTH}
                className="w-full bg-slate-900 hover:bg-slate-950 text-slate-200 font-bold py-3.5 rounded-xl border border-slate-800 shadow-md dark:shadow-none transition-all flex justify-center items-center gap-2 disabled:opacity-40 text-xs uppercase tracking-wider"
              >
                {loading ? "Memverifikasi Kode..." : "MASUK SISTEM"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
