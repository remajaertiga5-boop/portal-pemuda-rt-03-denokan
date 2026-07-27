import React from "react";
import { AuthSession } from "../types";
import {
  Wallet,
  CheckCircle2,
  Clock,
  CalendarCheck,
  ShieldCheck,
  AlertCircle,
  Check,
  X,
} from "lucide-react";
import { AppData } from "../utils/dataStore";

// ----------------------------------------------------------
// TYPES
// ----------------------------------------------------------
interface IuranRecord {
  id?      : string;
  ID?      : string;
  bulan?   : string;
  Bulan?   : string;
  Tahun?   : string | number;
  jumlah?  : number;
  Jumlah?  : number;
  status?  : string;
  Status?  : string;
  tgl?     : string;
  Tanggal_Bayar?: string;
  ID_Anggota?   : string;
}

interface AbsensiRecord {
  id?           : string;
  ID_Absensi?   : string;
  agenda?       : string;
  Nama_Kegiatan?: string;
  tanggal?      : string;
  Tanggal?      : string;
  status?       : string;
  Status?       : string;
  ID_Anggota?   : string;
}

interface KasSayaProps {
  session     : AuthSession;
  appData?    : AppData;
  iuranList?  : IuranRecord[];
  absensiList?: AbsensiRecord[];
}

// ----------------------------------------------------------
// HELPER - Normalisasi status
// ----------------------------------------------------------
function getStatus(item: IuranRecord | AbsensiRecord): string {
  return (item.Status || item.status || "").toUpperCase();
}

function getIuranKey(item: IuranRecord, idx: number): string {
  return item.id || item.ID || `iuran-fallback-${idx}`;
}

function getAbsensiKey(item: AbsensiRecord, idx: number): string {
  return item.id || item.ID_Absensi || `absensi-fallback-${idx}`;
}

// ----------------------------------------------------------
// KONSTANTA - Fallback data jika tidak ada dari appData
// ----------------------------------------------------------
const DEFAULT_IURAN: IuranRecord[] = [
  { id: "def-1", Bulan: "Januari",  Tahun: "2026", Jumlah: 10000, Status: "LUNAS",      Tanggal_Bayar: "2026-01-05" },
  { id: "def-2", Bulan: "Februari", Tahun: "2026", Jumlah: 10000, Status: "LUNAS",      Tanggal_Bayar: "2026-02-03" },
  { id: "def-3", Bulan: "Maret",    Tahun: "2026", Jumlah: 10000, Status: "LUNAS",      Tanggal_Bayar: "2026-03-02" },
  { id: "def-4", Bulan: "Juli",     Tahun: "2026", Jumlah: 10000, Status: "BELUM_BAYAR" },
];

const DEFAULT_ABSENSI: AbsensiRecord[] = [
  { id: "abs-1", Nama_Kegiatan: "Kerja Bakti Kebersihan",  Tanggal: "2026-07-12", Status: "HADIR" },
  { id: "abs-2", Nama_Kegiatan: "Rapat Bulanan Rutin",     Tanggal: "2026-07-20", Status: "HADIR" },
];

// ----------------------------------------------------------
// COMPONENT
// ----------------------------------------------------------
export default function KasSaya({
  session,
  appData,
  iuranList   = [],
  absensiList = [],
}: KasSayaProps) {

  // Akses ditolak jika tamu atau belum login
  if (session.role === "TAMU" || !session.id_anggota) {
    return (
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none text-center space-y-4">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Akses Dibatasi</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
          Fitur "Kas Saya" hanya dapat diakses setelah memasukkan ID Anggota valid.
        </p>
      </div>
    );
  }

  // ✅ Filter dari appData, fallback ke prop, lalu ke default
  const myIuran: IuranRecord[] =
    appData?.Iuran?.filter((i) => i.ID_Anggota === session.id_anggota) ||
    (iuranList.length > 0 ? iuranList : DEFAULT_IURAN);

  const myAbsensi: AbsensiRecord[] =
    appData?.Absensi?.filter((a) => a.ID_Anggota === session.id_anggota) ||
    (absensiList.length > 0 ? absensiList : DEFAULT_ABSENSI);

  const displayIuran   = myIuran.length   > 0 ? myIuran   : DEFAULT_IURAN;
  const displayAbsensi = myAbsensi.length > 0 ? myAbsensi : DEFAULT_ABSENSI;

  // ----------------------------------------------------------
  // KALKULASI
  // ----------------------------------------------------------
  const totalDibayar = displayIuran
    .filter((i) => getStatus(i) === "LUNAS")
    .reduce((acc, i) => acc + Number(i.Jumlah || i.jumlah || 10000), 0);

  const totalTunggakan = displayIuran
    .filter((i) => getStatus(i) !== "LUNAS")
    .reduce((acc, i) => acc + Number(i.Jumlah || i.jumlah || 10000), 0);

  const jumlahHadir = displayAbsensi.filter((a) => getStatus(a) === "HADIR").length;

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------
  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">

      {/* Header Profile Card */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 md:p-8 rounded-[2.5rem] text-white shadow-lg dark:shadow-none relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider mb-3">
              <ShieldCheck size={14} /> Status: ANGGOTA AKTIF
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold">{session.nama_lengkap}</h2>
            <p className="text-emerald-100 font-mono text-sm mt-1 tracking-wide">
              ID Permanen:{" "}
              <span className="font-bold text-white">{session.id_anggota}</span>
            </p>
          </div>

          <div className="flex gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 w-full md:w-auto">
            <div className="text-center px-4 border-r border-white/20">
              <span className="text-[10px] text-emerald-100 uppercase tracking-wider block font-bold">
                Total Dibayar
              </span>
              <span className="text-lg font-black">
                Rp {totalDibayar.toLocaleString("id-ID")}
              </span>
            </div>
            <div className="text-center px-4">
              <span className="text-[10px] text-amber-200 uppercase tracking-wider block font-bold">
                Tunggakan
              </span>
              <span className="text-lg font-black text-amber-300">
                Rp {totalTunggakan.toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Iuran & Absensi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Card Iuran Bulanan */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg flex items-center gap-2">
              <Wallet className="text-emerald-600" size={20} /> Catatan Iuran Saya
            </h3>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-full font-bold">
              2026
            </span>
          </div>

          <div className="space-y-2.5">
            {displayIuran.map((item, idx) => {
              const isLunas = getStatus(item) === "LUNAS";
              const label   = `${item.Bulan || item.bulan || ""} ${item.Tahun || ""}`.trim();
              const nominal = Number(item.Jumlah || item.jumlah || 10000);

              return (
                // ✅ Pakai ID unik bukan index
                <div
                  key={getIuranKey(item, idx)}
                  className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{label}</h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Rp {nominal.toLocaleString("id-ID")}
                    </p>
                  </div>

                  {isLunas ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                      <CheckCircle2 size={14} /> Lunas
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                      <Clock size={14} /> Belum Bayar
                    </span>
                  )}
                </div>
              );
            })}

            {displayIuran.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">
                Belum ada catatan iuran untuk tahun ini.
              </p>
            )}
          </div>
        </div>

        {/* Card Absensi Saya */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg flex items-center gap-2">
              <CalendarCheck className="text-blue-600" size={20} /> Kehadiran Saya
            </h3>
            <span className="text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full font-bold">
              {jumlahHadir} / {displayAbsensi.length} Hadir
            </span>
          </div>

          <div className="space-y-2.5">
            {displayAbsensi.map((item, idx) => {
              const status  = getStatus(item);
              const nama    = item.Nama_Kegiatan || item.agenda || "-";
              const tanggal = item.Tanggal       || item.tanggal || "-";

              return (
                // ✅ Pakai ID unik bukan index
                <div
                  key={getAbsensiKey(item, idx)}
                  className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{nama}</h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{tanggal}</p>
                  </div>

                  {status === "HADIR" && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                      <Check size={14} /> Hadir
                    </span>
                  )}
                  {status === "IZIN" && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full">
                      Izin
                    </span>
                  )}
                  {status === "ALPA" && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded-full">
                      <X size={14} /> Alpa
                    </span>
                  )}
                  {!["HADIR","IZIN","ALPA"].includes(status) && (
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold rounded-full">
                      {status || "-"}
                    </span>
                  )}
                </div>
              );
            })}

            {displayAbsensi.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">
                Belum ada catatan kehadiran.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
