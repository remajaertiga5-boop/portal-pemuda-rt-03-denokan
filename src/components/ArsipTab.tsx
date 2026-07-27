import React from "react";
import { Archive, RefreshCw, Search } from "lucide-react";
import { AppData, addLogAkses } from "../utils/dataStore";
import { verifikasiPINDinamis } from "../utils/auth";
import PINField from "./PINField";

interface ArsipTabProps {
  appData       : AppData;
  setAppData    : React.Dispatch<React.SetStateAction<AppData>>;
  showToast     : (msg: string, type: "success" | "error" | "info" | "warning") => void;
  search        : string;
  onSearchChange: (v: string) => void;
  pinKonfirmasi : string;
  onPinChange   : (v: string) => void;
  onPinReset    : () => void;
}

/** Tab Arsip Anggota — daftar anggota diarsip + restore dengan PIN gate */
export default function ArsipTab({
  appData, setAppData, showToast,
  search, onSearchChange, pinKonfirmasi, onPinChange, onPinReset,
}: ArsipTabProps) {

  const archivedMembers = appData.Anggota.filter(a => a.Status_Tampil === "ARSIP");
  const filtered = archivedMembers.filter(a =>
    (a.Nama_Lengkap || "").toLowerCase().includes(search.toLowerCase()) ||
    (a.ID_Anggota   || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleRestore = (id: string) => {
    if (!verifikasiPINDinamis(pinKonfirmasi)) {
      showToast("Otorisasi PIN Super Admin salah atau sudah kedaluwarsa!", "error");
      return;
    }
    const updated = {
      ...appData,
      Anggota: appData.Anggota.map(a =>
        a.ID_Anggota === id
          ? { ...a, Status_Tampil: "TAMPIL" as const, Diarsip_Oleh: undefined, Tanggal_Arsip: undefined }
          : a
      ),
    };
    const logged = addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "KEMBALIKAN_ARSIP", `Mengembalikan anggota ${id} dari arsip`);
    setAppData(logged);
    showToast(`Anggota ${id} berhasil dikembalikan!`, "success");
    onPinReset();
  };

  const isEmpty = filtered.length === 0;

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
          <Archive className="text-purple-600" size={20} /> Arsip Anggota
          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 rounded-full text-[11px] font-bold">
            {archivedMembers.length}
          </span>
        </h3>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input type="text" value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Cari anggota diarsip..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-600" />
        </div>
      </div>

      {/* PIN Gate */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div>
          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">Otorisasi PIN Super Admin</h4>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Masukkan PIN untuk mengizinkan pengembalian arsip.</p>
        </div>
        <PINField id="pin-arsip-konf" placeholder="••••••••" maxLength={8}
          value={pinKonfirmasi} onChange={onPinChange}
          className="w-full sm:w-48" inputClassName="focus:ring-purple-600 py-2 text-sm" />
      </div>

      {/* Table */}
      {isEmpty ? (
        <div className="py-12 text-center text-slate-400">
          <Archive size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">
            {search ? `Tidak ada hasil untuk "${search}"` : "Tidak ada anggota yang diarsip."}
          </p>
          <p className="text-[11px] mt-1">Anggota yang diarsipkan akan muncul di sini.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 uppercase font-bold text-[10px]">
              <tr>
                <th className="p-3">ID Anggota</th>
                <th className="p-3">Nama Lengkap</th>
                <th className="p-3 hidden sm:table-cell">Diarsip Oleh</th>
                <th className="p-3 hidden sm:table-cell">Tanggal Arsip</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map(a => (
                <tr key={a.ID_Anggota} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 group">
                  <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">{a.ID_Anggota}</td>
                  <td className="p-3 font-semibold">{a.Nama_Lengkap}</td>
                  <td className="p-3 text-slate-500 hidden sm:table-cell">{a.Diarsip_Oleh || "Admin"}</td>
                  <td className="p-3 text-slate-500 hidden sm:table-cell text-[10px]">{(a as any).Tanggal_Arsip || "-"}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => handleRestore(a.ID_Anggota)} disabled={!pinKonfirmasi}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all ml-auto">
                      <RefreshCw size={12} /> Kembalikan
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
