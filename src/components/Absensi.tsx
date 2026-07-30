import React, { useState } from "react";
import { UserCheck, Plus, Download, Trash2, Calendar, Filter, Eye, X, AlertCircle } from "lucide-react";
import { AppData, addLogAkses } from "../utils/dataStore";
import { UserRole } from "../types";

interface AbsensiProps {
  appData: AppData;
  setAppData: React.Dispatch<React.SetStateAction<AppData>>;
  userRole: UserRole;
  currentUserName?: string;
  showToast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
}

export default function Absensi({ appData, setAppData, userRole, currentUserName, showToast }: AbsensiProps) {
  const [showForm, setShowForm] = useState(false);
  const [selectedAgendaIdFilter, setSelectedAgendaIdFilter] = useState<string>("SEMUA");
  const [selectedDetailAgenda, setSelectedDetailAgenda] = useState<string | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<any | null>(null);

  const [targetAgendaId, setTargetAgendaId] = useState("");
  const [targetAnggotaId, setTargetAnggotaId] = useState("");
  const [statusAbsen, setStatusAbsen] = useState<"HADIR" | "IZIN" | "ALPA">("HADIR");
  const [keterangan, setKeterangan] = useState("");

  const absensiList = appData.Absensi || [];
  const agendaList = appData.Agenda || [];
  const anggotaList = (appData.Anggota || []).filter(a => a.Status_Tampil !== "ARSIP");

  const filteredList = absensiList.filter((abs) => {
    if (selectedAgendaIdFilter === "SEMUA") return true;
    return abs.ID_Agenda === selectedAgendaIdFilter;
  });

  const NAMA_KEY = "Nama Kegiatan";

  const handleSubmitManualAbsen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAgendaId || !targetAnggotaId) {
      showToast("Pilih agenda dan anggota terlebih dahulu!", "error");
      return;
    }
    const agendaObj = agendaList.find(a => a.ID === targetAgendaId);
    const memberObj = anggotaList.find(a => a.ID_Anggota === targetAnggotaId);
    if (!agendaObj || !memberObj) return;
    const newAbsen = {
      id: `ABS-${Date.now()}`,
      ID_Agenda: agendaObj.ID,
      Nama_Kegiatan: agendaObj[NAMA_KEY],
      ID_Anggota: memberObj.ID_Anggota,
      Nama_Anggota: memberObj.Nama_Lengkap,
      Tanggal: new Date().toISOString().split("T")[0],
      Waktu: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      Status: statusAbsen,
      Keterangan: keterangan,
    };
    const updated = { ...appData, Absensi: [newAbsen, ...appData.Absensi] };
    const loggedData = addLogAkses(updated, currentUserName || "Pengurus", userRole, "REKAP_ABSENSI", `Rekap manual ${statusAbsen} ${memberObj.Nama_Lengkap}`);
    setAppData(loggedData);
    showToast(`Rekap absensi ${memberObj.Nama_Lengkap} berhasil disimpan!`, "success");
    setShowForm(false);
    setKeterangan("");
  };

  const handleExportCsv = () => {
    let csvContent = "data:text/csv;charset=utf-8,ID_Agenda,Nama_Kegiatan,ID_Anggota,Nama_Anggota,Tanggal,Waktu,Status,Keterangan\n";
    filteredList.forEach((a) => {
      csvContent += `"${a.ID_Agenda}","${a.Nama_Kegiatan}","${a.ID_Anggota}","${a.Nama_Anggota}","${a.Tanggal}","${a.Waktu}","${a.Status}","${a.Keterangan || ""}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `absensi_remaja_legok_03_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast("File CSV absensi berhasil diunduh!", "success");
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmItem) return;
    const updatedList = appData.Absensi.filter((a) => a.id !== deleteConfirmItem.id);
    const updated = { ...appData, Absensi: updatedList };
    const loggedData = addLogAkses(updated, currentUserName || "Admin", userRole, "HAPUS_ABSENSI", `Menghapus absensi ID ${deleteConfirmItem.id}`);
    setAppData(loggedData);
    showToast("Data absensi berhasil dihapus!", "success");
    setDeleteConfirmItem(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <UserCheck className="text-emerald-600" /> Halaman Absensi Kegiatan
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Rekapitulasi kehadiran pemuda pada setiap agenda.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={handleExportCsv} className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 transition-all">
            <Download size={16} /> 57. Export CSV
          </button>
          {(userRole === "PENGURUS" || userRole === "ADMIN" || userRole === "SUPER_ADMIN") && (
            <button onClick={() => setShowForm(!showForm)} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md dark:shadow-none transition-all">
              {showForm ? "Batal" : <><Plus size={16} /> + Rekap Manual</>}
            </button>
          )}
        </div>
      </div>
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none flex flex-col sm:flex-row justify-between items-center gap-3">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Filter size={16} className="text-emerald-600" /> 56. Filter Berdasarkan Agenda:
        </span>
        <select value={selectedAgendaIdFilter} onChange={e => setSelectedAgendaIdFilter(e.target.value)} className="w-full sm:w-auto p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none">
          <option value="SEMUA">Semua Agenda Kegiatan</option>
          {agendaList.map(a => (<option key={a.ID} value={a.ID}>{a[NAMA_KEY]} ({a.Tanggal})</option>))}
        </select>
      </div>
      {showForm && (
        <form onSubmit={handleSubmitManualAbsen} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-emerald-200 shadow-md dark:shadow-none space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">54. Rekap Absensi Manual</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Pilih Agenda *</label>
              <select required value={targetAgendaId} onChange={e => setTargetAgendaId(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none">
                <option value="">-- Pilih Agenda --</option>
                {agendaList.map(a => (<option key={a.ID} value={a.ID}>{a[NAMA_KEY]}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Pilih Anggota *</label>
              <select required value={targetAnggotaId} onChange={e => setTargetAnggotaId(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none">
                <option value="">-- Pilih Anggota --</option>
                {anggotaList.map(a => (<option key={a.ID_Anggota} value={a.ID_Anggota}>{a.Nama_Lengkap} ({a.ID_Anggota})</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Status Kehadiran</label>
              <select value={statusAbsen} onChange={e => setStatusAbsen(e.target.value as any)} className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none">
                <option value="HADIR">HADIR ✅</option>
                <option value="IZIN">IZIN 📝</option>
                <option value="ALPA">ALPA ❌</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Keterangan / Alasan (Jika Izin)</label>
            <input value={keterangan} onChange={e => setKeterangan(e.target.value)} placeholder="Opsional..." className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none" />
          </div>
          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md dark:shadow-none transition-all text-sm">
            💾 Simpan Rekap Absensi
          </button>
        </form>
      )}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 uppercase font-bold text-[10px]">
              <tr>
                <th className="p-3">Kegiatan Agenda</th>
                <th className="p-3">Nama & ID Anggota</th>
                <th className="p-3">Waktu Absen</th>
                <th className="p-3">Status</th>
                <th className="p-3">Keterangan</th>
                <th className="p-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400 dark:text-slate-500">Belum ada data rekap absensi.</td></tr>
              ) : (
                filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 dark:bg-slate-800/50">
                    <td className="p-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{item.Nama_Kegiatan}</div>
                      <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{item.ID_Agenda}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{item.Nama_Anggota}</div>
                      <div className="text-[10px] font-mono text-purple-700">{item.ID_Anggota}</div>
                    </td>
                    <td className="p-3 font-mono text-slate-500 dark:text-slate-400">{item.Tanggal} • {item.Waktu}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-full font-extrabold text-[10px] ${item.Status === "HADIR" ? "bg-emerald-100 text-emerald-800" : item.Status === "IZIN" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"}`}>{item.Status}</span>
                    </td>
                    <td className="p-3 text-slate-500 dark:text-slate-400">{item.Keterangan || "-"}</td>
                    <td className="p-3">
                      {(userRole === "ADMIN" || userRole === "SUPER_ADMIN") && (
                        <button onClick={() => setDeleteConfirmItem(item)} className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold"><Trash2 size={14} /></button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {deleteConfirmItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto"><AlertCircle size={32} /></div>
            <h3 className="font-black text-slate-900 dark:text-slate-100 text-lg">Hapus rekap absensi ini?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Data absensi {deleteConfirmItem.Nama_Anggota} akan dihapus.</p>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setDeleteConfirmItem(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs">Batal</button>
              <button onClick={handleConfirmDelete} className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md dark:shadow-none">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
