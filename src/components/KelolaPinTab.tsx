import React from "react";
import { Eye, EyeOff } from "lucide-react";
import { AppData, addLogAkses } from "../utils/dataStore";
import { setStoredPIN, verifikasiPINDinamis, generatePINDinamis } from "../utils/auth";
import PINField from "./PINField";

interface KelolaPinTabProps {
  appData           : AppData;
  setAppData        : React.Dispatch<React.SetStateAction<AppData>>;
  showToast         : (msg: string, type: "success" | "error" | "info" | "warning") => void;
  currentTime       : Date;
  // PIN states
  showPinDynamic    : boolean;
  onTogglePin       : () => void;
  // PIN Ketua
  pinSaVerifikasiKetua: string;
  onSetSaVerifKetua   : (v: string) => void;
  pinKetuaBaru      : string;
  onSetKetuaBaru    : (v: string) => void;
  pinKetuaBaruKonf  : string;
  onSetKetuaKonf    : (v: string) => void;
  onResetPinKetua   : () => void;
  // PIN Pengurus
  pinSaVerifikasiPengurus: string;
  onSetSaVerifPengurus   : (v: string) => void;
  pinPengurusBaru   : string;
  onSetPengurusBaru : (v: string) => void;
  pinPengurusBaruKonf: string;
  onSetPengurusKonf : (v: string) => void;
  onResetPinPengurus: () => void;
}

/** Tab Kelola PIN Sistem — Ubah PIN Ketua, Pengurus & Info PIN Dinamis */
export default function KelolaPinTab({
  appData, setAppData, showToast, currentTime,
  showPinDynamic, onTogglePin,
  pinSaVerifikasiKetua, onSetSaVerifKetua, pinKetuaBaru, onSetKetuaBaru,
  pinKetuaBaruKonf, onSetKetuaKonf, onResetPinKetua,
  pinSaVerifikasiPengurus, onSetSaVerifPengurus, pinPengurusBaru, onSetPengurusBaru,
  pinPengurusBaruKonf, onSetPengurusKonf, onResetPinPengurus,
}: KelolaPinTabProps) {

  // ── PIN Strength ──────────────────────────────────────────
  const getPINStrengthScore = (pin: string): number => {
    if (pin.length < 8) return 1;
    const sequentialAsc  = "1234567890123456789";
    const sequentialDesc = "9876543210987654321";
    if (/^(\d)\1+$/.test(pin) || sequentialAsc.includes(pin) || sequentialDesc.includes(pin)) return 1;
    const unique = new Set(pin).size;
    if (unique <= 2) return 2;
    if (unique <= 4) return 3;
    if (unique <= 6) return 4;
    return 5;
  };

  // ── Ubah PIN Ketua ────────────────────────────────────────
  const handleUbahPinKetua = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifikasiPINDinamis(pinSaVerifikasiKetua)) {
      showToast("PIN Super Admin verifikasi salah atau sudah kedaluwarsa!", "error");
      return;
    }
    if (pinKetuaBaru.length !== 6) {
      showToast("PIN Ketua Baru harus 6 digit angka!", "error");
      return;
    }
    if (pinKetuaBaru !== pinKetuaBaruKonf) {
      showToast("Konfirmasi PIN Ketua Baru tidak cocok!", "error");
      return;
    }
    if (pinKetuaBaru === appData.Settings.PIN_Pengurus) {
      showToast("PIN Ketua tidak boleh sama dengan PIN Pengurus!", "error");
      return;
    }
    setStoredPIN("ADMIN", pinKetuaBaru);
    const updated = {
      ...appData,
      Settings: { ...appData.Settings, PIN_Ketua: pinKetuaBaru },
    };
    const logged = addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "UBAH_PIN_KETUA", "Mengubah PIN Ketua");
    setAppData(logged);
    showToast("PIN Ketua berhasil diperbarui! 🔐", "success");
    onResetPinKetua();
  };

  // ── Ubah PIN Pengurus ─────────────────────────────────────
  const handleUbahPinPengurus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifikasiPINDinamis(pinSaVerifikasiPengurus)) {
      showToast("PIN Super Admin verifikasi salah atau sudah kedaluwarsa!", "error");
      return;
    }
    if (pinPengurusBaru.length !== 6) {
      showToast("PIN Pengurus Baru harus 6 digit angka!", "error");
      return;
    }
    if (pinPengurusBaru === "000000" || pinPengurusBaru === "123456") {
      showToast("PIN Pengurus tidak boleh terlalu mudah (000000/123456)!", "error");
      return;
    }
    if (pinPengurusBaru !== pinPengurusBaruKonf) {
      showToast("Konfirmasi PIN Pengurus Baru tidak cocok!", "error");
      return;
    }
    setStoredPIN("PENGURUS", pinPengurusBaru);
    const updated = {
      ...appData,
      Settings: { ...appData.Settings, PIN_Pengurus: pinPengurusBaru },
    };
    const logged = addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "UBAH_PIN_PENGURUS", "Mengubah PIN Pengurus");
    setAppData(logged);
    showToast("PIN Pengurus berhasil diperbarui! 🔐", "success");
    onResetPinPengurus();
  };

  // ── Countdown ─────────────────────────────────────────────
  const secondsUntilNextHour = 3600 - ((currentTime.getMinutes() * 60) + currentTime.getSeconds());
  const minutesLeft = Math.floor(secondsUntilNextHour / 60);
  const secondsLeft = secondsUntilNextHour % 60;
  const progressPercent = Math.floor((((currentTime.getMinutes() * 60) + currentTime.getSeconds()) / 3600) * 100);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* 68. Ubah PIN Ketua */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-100 text-rose-700 rounded-xl flex items-center justify-center font-bold">🔑</div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">68. Ubah PIN Ketua</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Ubah PIN akses Ketua umum.</p>
          </div>
        </div>

        <form onSubmit={handleUbahPinKetua} className="space-y-4">
          <PINField
            id="pin-sa-verif-ketua"
            label="PIN Super Admin (Verifikasi)"
            value={pinSaVerifikasiKetua}
            onChange={onSetSaVerifKetua}
            maxLength={8}
            placeholder="••••••••"
            inputClassName="focus:ring-rose-500"
          />
          <PINField
            id="pin-ketua-baru"
            label="PIN Ketua Baru (6 digit)"
            value={pinKetuaBaru}
            onChange={onSetKetuaBaru}
            maxLength={6}
            placeholder="••••••"
            inputClassName="focus:ring-rose-500"
          />
          <PINField
            id="pin-ketua-baru-konf"
            label="Konfirmasi PIN Ketua Baru"
            value={pinKetuaBaruKonf}
            onChange={onSetKetuaKonf}
            maxLength={6}
            placeholder="••••••"
            inputClassName="focus:ring-rose-500"
          />
          <button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl shadow-md dark:shadow-none transition-all text-xs">
            💾 Simpan PIN Ketua Baru
          </button>
        </form>
      </div>

      {/* 69. Ubah PIN Pengurus */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center font-bold">🔑</div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">69. Ubah PIN Pengurus</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Ubah PIN akses Pengurus harian.</p>
          </div>
        </div>

        <form onSubmit={handleUbahPinPengurus} className="space-y-4">
          <PINField
            id="pin-sa-verif-pengurus"
            label="PIN Super Admin (Verifikasi)"
            value={pinSaVerifikasiPengurus}
            onChange={onSetSaVerifPengurus}
            maxLength={8}
            placeholder="••••••••"
            inputClassName="focus:ring-blue-500"
          />
          <PINField
            id="pin-pengurus-baru"
            label="PIN Pengurus Baru (6 digit)"
            value={pinPengurusBaru}
            onChange={onSetPengurusBaru}
            maxLength={6}
            placeholder="••••••"
            inputClassName="focus:ring-blue-500"
          />
          <PINField
            id="pin-pengurus-baru-konf"
            label="Konfirmasi PIN Pengurus Baru"
            value={pinPengurusBaruKonf}
            onChange={onSetPengurusKonf}
            maxLength={6}
            placeholder="••••••"
            inputClassName="focus:ring-blue-500"
          />
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl shadow-md dark:shadow-none transition-all text-xs">
            💾 Simpan PIN Pengurus Baru
          </button>
        </form>
      </div>

      {/* 70. Info PIN Dinamis */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-purple-200 shadow-sm dark:shadow-none space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 text-purple-800 rounded-xl flex items-center justify-center font-bold">👑</div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">70. Info PIN Super Admin Dinamis</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">PIN Super Admin berubah otomatis setiap jam berdasarkan waktu.</p>
          </div>
        </div>

        <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800/60 pb-3">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Waktu Perangkat:</span>
            <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
              {currentTime.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} — {currentTime.toLocaleTimeString("id-ID")}
            </span>
          </div>

          {/* 🔒 PIN — tersembunyi default */}
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800/60 pb-3">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">PIN Jam Ini:</span>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-mono font-extrabold px-2.5 py-1 rounded-lg border transition-all ${
                showPinDynamic
                  ? "bg-purple-100 text-purple-700 border-purple-200"
                  : "bg-slate-200 dark:bg-slate-700 text-transparent border-slate-300 dark:border-slate-600 select-none"
              }`}>
                {showPinDynamic ? generatePINDinamis(0) : "••••••••"}
              </span>
              <button type="button" onClick={onTogglePin}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                title={showPinDynamic ? "Sembunyikan PIN" : "Tampilkan PIN"}>
                {showPinDynamic ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Countdown progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>⏱️ PIN akan berubah dalam:</span>
              <span className="font-bold text-purple-700">{minutesLeft}m {secondsLeft}s</span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 transition-all duration-1000"
                style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          {/* Daftar PIN — hanya saat toggle aktif */}
          {showPinDynamic && (
            <div className="pt-2 text-[11px] text-slate-500 dark:text-slate-400 space-y-1.5 leading-relaxed animate-in fade-in duration-200">
              <p className="font-bold text-purple-800 flex items-center gap-1">
                <span>💡</span> Daftar PIN yang sedang aktif (Toleransi ±1 jam):
              </p>
              <ul className="list-disc pl-4 space-y-0.5 font-mono">
                <li>Sebelumnya (-1 jam): <span className="font-bold text-slate-700 dark:text-slate-300">{generatePINDinamis(-1)}</span></li>
                <li>Sekarang (Jam ini): <span className="font-bold text-purple-700">{generatePINDinamis(0)}</span></li>
                <li>Berikutnya (+1 jam): <span className="font-bold text-slate-700 dark:text-slate-300">{generatePINDinamis(1)}</span></li>
              </ul>
              <p className="text-[10px] text-amber-600 italic mt-2">
                *Sistem memverifikasi input PIN dengan toleransi ±1 jam untuk mengatasi ketidakcocokan waktu perangkat.
              </p>
            </div>
          )}
          {!showPinDynamic && (
            <div className="pt-2 text-center">
              <button type="button" onClick={onTogglePin}
                className="text-[11px] text-purple-600 hover:text-purple-700 font-bold underline underline-offset-2 flex items-center gap-1 mx-auto">
                <Eye size={12} /> Klik untuk melihat PIN & daftar toleransi
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
