const NAMA_KEY = "Nama Kegiatan";
import React, { useState, useEffect } from "react";
import { Calendar, Plus, Clock, MapPin, Edit3, Trash2, X, AlertCircle } from "lucide-react";
import { AppData, addLogAkses, filterKontenByAkses } from "../utils/dataStore";
import { refreshSingleSheet } from "../utils/dataStoreSheets";
import { useLocale } from "../hooks/useLocale";
import { AgendaItem, UserRole, ContentVisibility } from "../types";

interface AbsensiRecord {
  id: string;
  ID_Agenda: string;
  Nama_Kegiatan: string;
  ID_Anggota: string;
  Nama_Anggota: string;
  Tanggal: string;
  Waktu: string;
  Status: "HADIR" | "IZIN" | "ALPA";
  Keterangan?: string;
}

interface AgendaProps {
  appData: AppData;
  setAppData: React.Dispatch<React.SetStateAction<AppData>>;
  userRole: UserRole;
  currentUserId?: string;
  currentUserName?: string;
  showToast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
}

const KATEGORI_LIST = ["Rapat", "Olahraga", "Kerja Bakti", "Lainnya"] as const;
const FILTER_LIST = ["SEMUA", ...KATEGORI_LIST] as const;

export default function Agenda({ appData, setAppData, userRole, currentUserId, currentUserName, showToast }: AgendaProps) {
  const { t } = useLocale();
  const [showForm, setShowForm] = useState(false);
  const [editingAgenda, setEditingAgenda] = useState<AgendaItem | null>(null);
  const [selectedAgenda, setSelectedAgenda] = useState<AgendaItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("SEMUA");
  const [deleteConfirmAgenda, setDeleteConfirmAgenda] = useState<AgendaItem | null>(null);
  const [showIzinModal, setShowIzinModal] = useState(false);
  const [alasanIzin, setAlasanIzin] = useState("");
  const [namaKegiatan, setNamaKegiatan] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [waktu, setWaktu] = useState("");
  const [lokasi, setLokasi] = useState("");
  const [kategori, setKategori] = useState<string>("Rapat");
  const [keterangan, setKeterangan] = useState("");
  const [visibilitas, setVisibilitas] = useState<ContentVisibility>("PUBLIK");

  useEffect(() => { refreshSingleSheet("agenda").then((result: any) => { if (result?.Agenda) setAppData((prev: AppData) => ({ ...prev, Agenda: result.Agenda! })); }); }, []);

  const rawList = appData.Agenda || [];
  const absensiList = (appData.Absensi || []) as AbsensiRecord[];
  const accessibleAgenda = filterKontenByAkses(rawList, userRole);
  const filteredAgenda = accessibleAgenda.filter((a) => { if (selectedCategory === "SEMUA") return true; return a.Kategori?.toUpperCase() === selectedCategory.toUpperCase(); });
  const isPengurus = userRole === "PENGURUS" || userRole === "ADMIN" || userRole === "SUPER_ADMIN";
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  const resetForm = () => { setNamaKegiatan(""); setTanggal(""); setWaktu(""); setLokasi(""); setKategori("Rapat"); setKeterangan(""); setVisibilitas("PUBLIK"); setEditingAgenda(null); };
  const isUserAbsen = (agendaId: string): boolean => { if (!currentUserId) return false; return absensiList.some((abs) => abs.ID_Agenda === agendaId && abs.ID_Anggota === currentUserId); };

  const handleOpenEdit = (agenda: AgendaItem) => { setEditingAgenda(agenda); setNamaKegiatan(agenda[NAMA_KEY]); setTanggal(agenda.Tanggal); setWaktu(agenda.Waktu); setLokasi(agenda.Lokasi); setKategori(agenda.Kategori || "Rapat"); setKeterangan(agenda.Keterangan || ""); setVisibilitas(agenda.Visibilitas || "PUBLIK"); setShowForm(true); };

  const handleSubmitAgenda = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaKegiatan.trim() || !tanggal || !lokasi.trim()) { showToast("Nama kegiatan, tanggal, dan lokasi wajib diisi!", "error"); return; }
    if (editingAgenda) {
      const updatedList = appData.Agenda.map((a) => a.ID === editingAgenda.ID ? { ...a, [NAMA_KEY]: namaKegiatan, Tanggal: tanggal, Waktu: waktu, Lokasi: lokasi, Kategori: kategori, Keterangan: keterangan, Visibilitas: visibilitas } : a);
      const updated = { ...appData, Agenda: updatedList };
      const loggedData = addLogAkses(updated, currentUserName || "Pengurus", userRole, "EDIT_AGENDA", `Mengubah agenda ${editingAgenda.ID} (${visibilitas})`);
      setAppData(loggedData); showToast("Agenda berhasil diperbarui!", "success");
    } else {
      const newAgenda: AgendaItem = { ID: `AGD-${Date.now()}`, [NAMA_KEY]: namaKegiatan, Tanggal: tanggal, Waktu: waktu || "19:00", Lokasi: lokasi, Kategori: kategori, Keterangan: keterangan, Visibilitas: visibilitas };
      const updated = { ...appData, Agenda: [newAgenda, ...appData.Agenda] };
      const loggedData = addLogAkses(updated, currentUserName || "Pengurus", userRole, "TAMBAH_AGENDA", `Menambah agenda ${newAgenda[NAMA_KEY]} (${visibilitas})`);
      setAppData(loggedData); showToast("Agenda baru berhasil ditambahkan!", "success");
    }
    setShowForm(false); resetForm();
  };

  const handleConfirmDelete = () => { if (!deleteConfirmAgenda) return; const updatedList = appData.Agenda.filter((a) => a.ID !== deleteConfirmAgenda.ID); const updated = { ...appData, Agenda: updatedList }; const loggedData = addLogAkses(updated, currentUserName || "Admin", userRole, "HAPUS_AGENDA", `Menghapus agenda ${deleteConfirmAgenda.ID}`); setAppData(loggedData); showToast("Agenda berhasil dihapus!", "success"); setDeleteConfirmAgenda(null); setSelectedAgenda(null); };

  const handleAbsenHadir = (agenda: AgendaItem) => {
    if (!currentUserId) { showToast("Silakan masuk dengan ID Anggota terlebih dahulu untuk absen!", "warning"); return; }
    if (isUserAbsen(agenda.ID)) { showToast("Anda sudah melakukan absensi untuk kegiatan ini!", "info"); return; }
    const newAbsen: AbsensiRecord = { id: `ABS-${Date.now()}`, ID_Agenda: agenda.ID, Nama_Kegiatan: agenda[NAMA_KEY], ID_Anggota: currentUserId, Nama_Anggota: currentUserName || "Anggota", Tanggal: new Date().toISOString().split("T")[0], Waktu: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }), Status: "HADIR" };
    const updated = { ...appData, Absensi: [newAbsen, ...absensiList] };
    const loggedData = addLogAkses(updated, currentUserName || "Anggota", userRole, "ABSENSI_HADIR", `Absen HADIR pada ${agenda[NAMA_KEY]}`);
    setAppData(loggedData); showToast("Kehadiran Anda berhasil dicatat! Terima kasih ✅", "success");
  };

  const handleKirimIzin = (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedAgenda || !currentUserId) return;
    if (!alasanIzin.trim()) { showToast("Tuliskan alasan izin Anda!", "error"); return; }
    const newAbsen: AbsensiRecord = { id: `ABS-${Date.now()}`, ID_Agenda: selectedAgenda.ID, Nama_Kegiatan: selectedAgenda[NAMA_KEY], ID_Anggota: currentUserId, Nama_Anggota: currentUserName || "Anggota", Tanggal: new Date().toISOString().split("T")[0], Waktu: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }), Status: "IZIN", Keterangan: alasanIzin };
    const updated = { ...appData, Absensi: [newAbsen, ...absensiList] };
    const loggedData = addLogAkses(updated, currentUserName || "Anggota", userRole, "ABSENSI_IZIN", `Izin pada ${selectedAgenda[NAMA_KEY]}`);
    setAppData(loggedData); showToast("Permohonan izin Anda berhasil terkirim!", "success");
    setShowIzinModal(false); setAlasanIzin(""); setSelectedAgenda(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"><Calendar className="text-blue-600" /> Halaman Agenda & Kegiatan</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Jadwal kegiatan pemuda RT 03 Legok RW 04 Denokan.</p>
        </div>
        {isPengurus && (<button onClick={() => { if (showForm) { setShowForm(false); resetForm(); } else { resetForm(); setShowForm(true); } }} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md dark:shadow-none transition-all">{showForm ? "Batal" : <><Plus size={16} /> + Tambah Agenda</>}</button>)}
      </div>
      <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-none">
        {FILTER_LIST.map((cat) => (<button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${selectedCategory === cat ? "bg-blue-600 text-white border-blue-600 shadow-md dark:shadow-none" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"}`}>{cat === "SEMUA" ? "Semua Kategori" : cat}</button>))}
      </div>
      {showForm && (
        <form onSubmit={handleSubmitAgenda} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-blue-200 shadow-md dark:shadow-none space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">{editingAgenda ? "Edit Agenda Kegiatan" : "Tambah Agenda Baru"}</h3>
          <div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Kegiatan *</label><input required type="text" value={namaKegiatan} onChange={(e) => setNamaKegiatan(e.target.value)} placeholder="Rapat Rutin Bulanan" className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tanggal *</label><input required type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Waktu / Jam</label><input type="time" value={waktu} onChange={(e) => setWaktu(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Kategori Agenda</label><select value={kategori} onChange={(e) => setKategori(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500">{KATEGORI_LIST.map((k) => (<option key={k} value={k}>{k}</option>))}</select></div>
          </div>
          <div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Lokasi *</label><input required type="text" value={lokasi} onChange={(e) => setLokasi(e.target.value)} placeholder="Balai RT 03 Legok" className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Keterangan / Catatan</label><textarea value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="Opsional: Perlengkapan yang harus dibawa" className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Visibilitas / Akses Konten</label><select value={visibilitas} onChange={(e) => setVisibilitas(e.target.value as ContentVisibility)} className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold"><option value="PUBLIK">🌍 Publik (Dapat dilihat oleh semua warga/tamu)</option><option value="ANGGOTA">👥 Anggota (Hanya anggota & pengurus)</option><option value="PENGURUS">🔒 Khusus Pengurus (Hanya pengurus & admin)</option></select></div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md dark:shadow-none transition-all text-sm">💾 Simpan Agenda</button>
        </form>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAgenda.length === 0 ? (<div className="col-span-full bg-white dark:bg-slate-900 p-12 text-center rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">Belum ada agenda pada kategori ini.</div>) : (filteredAgenda.map((item) => { const hasAbsen = isUserAbsen(item.ID); return (
          <div key={item.ID} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none hover:shadow-md transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex justify-between items-start gap-2">
                <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold rounded-full text-[10px] uppercase border border-blue-100">{item.Kategori || "Kegiatan"}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase border ${item.Visibilitas === "PENGURUS" ? "bg-purple-50 text-purple-700 border-purple-200" : item.Visibilitas === "ANGGOTA" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>{item.Visibilitas || "PUBLIK"}</span>
                  <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500">{item.ID}</span>
                </div>
              </div>
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg leading-snug">{item[NAMA_KEY]}</h3>
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2"><Calendar size={14} className="text-blue-600 shrink-0" /><span>{item.Tanggal}</span></div>
                <div className="flex items-center gap-2"><Clock size={14} className="text-blue-600 shrink-0" /><span>{item.Waktu || "19:00"} WIB</span></div>
                <div className="flex items-center gap-2"><MapPin size={14} className="text-blue-600 shrink-0" /><span>{item.Lokasi}</span></div>
              </div>
              {item.Keterangan && (<div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-xs text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800"><strong>Info:</strong> {item.Keterangan}</div>)}
            </div>
            <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
              <button onClick={() => setSelectedAgenda(item)} className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all">🔍 Detail Agenda</button>
              <button disabled={hasAbsen} onClick={() => handleAbsenHadir(item)} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex justify-center items-center gap-1 shadow-sm dark:shadow-none ${hasAbsen ? "bg-emerald-100 text-emerald-800 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`}>{hasAbsen ? "Sudah Absen ✅" : "✅ Saya Hadir"}</button>
              {!hasAbsen && (<button onClick={() => { setSelectedAgenda(item); setShowIzinModal(true); }} className="py-2 px-3 bg-amber-500 hover:bg-amber-600 text-purple-950 rounded-xl text-xs font-bold transition-all">📝 Izin</button>)}
              {isPengurus && (<div className="flex gap-1 w-full pt-1">
                <button onClick={() => handleOpenEdit(item)} className="flex-1 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold flex justify-center items-center gap-1"><Edit3 size={12} /> Edit</button>
                {isAdmin && (<button onClick={() => setDeleteConfirmAgenda(item)} className="flex-1 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-semibold flex justify-center items-center gap-1"><Trash2 size={12} /> Hapus</button>)}
              </div>)}
            </div>
          </div>); }))}
      </div>
      {selectedAgenda && !showIzinModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4 animate-in zoom-in-95 duration-200">
            <button onClick={() => setSelectedAgenda(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" aria-label="Tutup detail agenda"><X size={20} /></button>
            <div><span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-extrabold text-[10px] uppercase">{selectedAgenda.Kategori || "Kegiatan"}</span><h3 className="font-black text-slate-900 dark:text-slate-100 text-xl mt-2">{selectedAgenda[NAMA_KEY]}</h3></div>
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <p><strong>Tanggal:</strong> {selectedAgenda.Tanggal}</p><p><strong>Waktu:</strong> {selectedAgenda.Waktu} WIB</p><p><strong>Lokasi:</strong> {selectedAgenda.Lokasi}</p>
              {selectedAgenda.Keterangan && (<p><strong>Keterangan:</strong> {selectedAgenda.Keterangan}</p>)}
            </div>
            <div className="space-y-2"><h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">Daftar Kehadiran</h4>
              <div className="max-h-36 overflow-y-auto space-y-1 text-xs">
                {absensiList.filter((abs) => abs.ID_Agenda === selectedAgenda.ID).length === 0 ? (<p className="text-slate-400 dark:text-slate-500 text-center py-3">Belum ada data kehadiran.</p>) : (absensiList.filter((abs) => abs.ID_Agenda === selectedAgenda.ID).map((a) => (<div key={a.id} className="p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl flex justify-between items-center"><span className="font-bold text-slate-800 dark:text-slate-200">{a.Nama_Anggota}</span><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${a.Status === "HADIR" ? "bg-emerald-100 text-emerald-800" : a.Status === "IZIN" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"}`}>{a.Status}{a.Keterangan ? ` (${a.Keterangan})` : ""}</span></div>)))}
              </div>
            </div>
            <button onClick={() => setSelectedAgenda(null)} className="w-full py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-xl font-bold text-xs">Tutup</button>
          </div>
        </div>
      )}
      {showIzinModal && selectedAgenda && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg">📝 Form Izin Tidak Hadir</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Kegiatan:{" "}<strong className="text-slate-700 dark:text-slate-300">{selectedAgenda[NAMA_KEY]}</strong></p>
            <form onSubmit={handleKirimIzin} className="space-y-3">
              <div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Alasan Izin *</label><textarea required rows={3} value={alasanIzin} onChange={(e) => setAlasanIzin(e.target.value)} placeholder="Contoh: Ada keperluan keluarga mendadak." className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500" /></div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setShowIzinModal(false); setAlasanIzin(""); setSelectedAgenda(null); }} className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs">Batal</button>
                <button type="submit" className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-purple-950 rounded-xl font-bold text-xs">Kirim Permohonan Izin</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {deleteConfirmAgenda && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto"><AlertCircle size={32} /></div>
            <h3 className="font-black text-slate-900 dark:text-slate-100 text-lg">Yakin hapus agenda ini?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Agenda{" "}<strong className="text-slate-700 dark:text-slate-300">"{deleteConfirmAgenda[NAMA_KEY]}"</strong>{" "}akan dihapus permanen.</p>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setDeleteConfirmAgenda(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs">Batal</button>
              <button onClick={handleConfirmDelete} className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md dark:shadow-none">Ya, Hapus Agenda</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
