import React, { useState, useEffect } from "react";
import { Megaphone, Plus, Pin, Edit3, Trash2, X, AlertCircle, Eye, Lock } from "lucide-react";
import { AppData, addLogAkses, filterKontenByAkses } from "../utils/dataStore";
import { refreshSingleSheet } from "../utils/dataStoreSheets";
import { useLocale } from "../hooks/useLocale";
import { PengumumanItem, UserRole, ContentVisibility } from "../types";

interface PengumumanProps {
  appData: AppData;
  setAppData: React.Dispatch<React.SetStateAction<AppData>>;
  userRole: UserRole;
  currentUserName?: string;
  showToast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
}

export default function Pengumuman({ appData, setAppData, userRole, currentUserName, showToast }: PengumumanProps) {
  const { t } = useLocale();
  const [showForm, setShowForm] = useState(false);
  const [editingPengumuman, setEditingPengumuman] = useState<PengumumanItem | null>(null);
  const [selectedPengumuman, setSelectedPengumuman] = useState<PengumumanItem | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<PengumumanItem | null>(null);

  // Form state
  const [judul, setJudul] = useState("");
  const [isi, setIsi] = useState("");
  const [penulis, setPenulis] = useState("Pengurus Harian");
  const [isPenting, setIsPenting] = useState(false);
  const [visibilitas, setVisibilitas] = useState<ContentVisibility>("PUBLIK");


  // ── Refresh data Pengumuman dari Google Sheets tiap buka menu ──
  useEffect(() => {
    refreshSingleSheet("pengumuman").then((result: any) => {
      if (result?.Pengumuman) setAppData((prev: AppData) => ({ ...prev, Pengumuman: result.Pengumuman! }));
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const rawList = appData.Pengumuman || [];
  const list = filterKontenByAkses(rawList, userRole);

  const handleOpenEdit = (item: PengumumanItem) => {
    setEditingPengumuman(item);
    setJudul(item.Judul);
    setIsi(item.Isi);
    setPenulis(item.Penulis || "Pengurus");
    setIsPenting(item.isPenting || false);
    setVisibilitas(item.Visibilitas || "PUBLIK");
    setShowForm(true);
  };

  // Submit / Edit Pengumuman
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul.trim() || !isi.trim()) {
      showToast("Judul dan isi pengumuman wajib diisi!", "error");
      return;
    }

    if (editingPengumuman) {
      const updatedList = appData.Pengumuman.map((p) =>
        p.ID === editingPengumuman.ID ? { ...p, Judul: judul, Isi: isi, Penulis: penulis, isPenting, Visibilitas: visibilitas } : p
      );
      const updated = { ...appData, Pengumuman: updatedList };
      const loggedData = addLogAkses(updated, currentUserName || "Pengurus", userRole, "EDIT_PENGUMUMAN", `Mengubah pengumuman ${editingPengumuman.ID}`);
      setAppData(loggedData);
      showToast("Pengumuman berhasil diperbarui!", "success");
    } else {
      const newItem: PengumumanItem = {
        ID: `PGM-${Date.now().toString().slice(-4)}`,
        Tanggal: new Date().toISOString().split("T")[0],
        Judul: judul,
        Isi: isi,
        Penulis: penulis || currentUserName || "Pengurus",
        isPenting: isPenting,
        Visibilitas: visibilitas,
      };
      const updated = { ...appData, Pengumuman: [newItem, ...appData.Pengumuman] };
      const loggedData = addLogAkses(updated, currentUserName || "Pengurus", userRole, "BUAT_PENGUMUMAN", `Membuat pengumuman ${newItem.Judul} (${visibilitas})`);
      setAppData(loggedData);
      showToast("Pengumuman baru berhasil diterbitkan!", "success");
    }

    setShowForm(false);
    setEditingPengumuman(null);
    setJudul("");
    setIsi("");
    setIsPenting(false);
    setVisibilitas("PUBLIK");
  };

  // 28. Hapus Pengumuman
  const handleConfirmDelete = () => {
    if (!deleteConfirmItem) return;

    const updatedList = appData.Pengumuman.filter((p) => p.ID !== deleteConfirmItem.ID);
    const updated = { ...appData, Pengumuman: updatedList };
    const loggedData = addLogAkses(updated, currentUserName || "Admin", userRole, "HAPUS_PENGUMUMAN", `Menghapus pengumuman ${deleteConfirmItem.ID}`);
    setAppData(loggedData);
    showToast("Pengumuman berhasil dihapus!", "success");
    setDeleteConfirmItem(null);
  };

  // 29. Tandai Penting Toggle
  const handleTogglePenting = (item: PengumumanItem) => {
    const newPentingState = !item.isPenting;
    const updatedList = appData.Pengumuman.map((p) =>
      p.ID === item.ID ? { ...p, isPenting: newPentingState } : p
    );
    const updated = { ...appData, Pengumuman: updatedList };
    setAppData(updated);
    showToast(
      newPentingState ? "Pengumuman ditandai sebagai PENTING! (Tampil di Beranda)" : "Pengumuman diubah menjadi biasa.",
      "info"
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Megaphone className="text-purple-600" /> Halaman Pengumuman
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Informasi dan berita terkini pemuda RT 03 Legok RW 04 Denokan.</p>
        </div>

        {(userRole === "PENGURUS" || userRole === "ADMIN" || userRole === "SUPER_ADMIN") && (
          /* 25. Tombol [+ Buat Pengumuman] */
          <button
            onClick={() => {
              setEditingPengumuman(null);
              setJudul("");
              setIsi("");
              setIsPenting(false);
              setShowForm(!showForm);
            }}
            className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md dark:shadow-none transition-all"
          >
            {showForm ? "Batal" : <><Plus size={16} /> + Buat Pengumuman</>}
          </button>
        )}
      </div>

      {/* Form Buat / Edit Pengumuman */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-purple-200 shadow-md dark:shadow-none space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">{editingPengumuman ? "Edit Pengumuman" : "Buat Pengumuman Baru"}</h3>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Judul Pengumuman *</label>
            <input 
              type="text" 
              required
              value={judul}
              onChange={e => setJudul(e.target.value)}
              placeholder="Undangan Kerja Bakti Pemuda"
              className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Penulis / Pengirim</label>
            <input 
              type="text" 
              value={penulis}
              onChange={e => setPenulis(e.target.value)}
              placeholder="Pengurus Harian"
              className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Visibilitas / Akses Konten</label>
            <select
              value={visibilitas}
              onChange={e => setVisibilitas(e.target.value as ContentVisibility)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-600 font-semibold"
            >
              <option value="PUBLIK">🌍 Publik (Dapat dilihat oleh semua warga/tamu tanpa PIN)</option>
              <option value="ANGGOTA">👥 Anggota (Hanya anggota & pengurus yang masuk dengan PIN)</option>
              <option value="PENGURUS">🔒 Khusus Pengurus (Hanya pengurus & admin)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Isi Pengumuman Lengkap *</label>
            <textarea 
              rows={4}
              required
              value={isi}
              onChange={e => setIsi(e.target.value)}
              placeholder="Tuliskan detail pengumuman secara rinci..."
              className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-600"
            />
          </div>

          {/* Toggle Pengumuman Penting */}
          <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-xl border border-purple-100">
            <input 
              type="checkbox" 
              id="pentingToggle"
              checked={isPenting}
              onChange={e => setIsPenting(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
            />
            <label htmlFor="pentingToggle" className="text-xs font-bold text-purple-900 cursor-pointer">
              📌 Tandai sebagai PENTING (Otomatis tampil menonjol di Halaman Beranda)
            </label>
          </div>

          <button type="submit" className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-3 rounded-xl shadow-md dark:shadow-none transition-all text-sm">
            💾 Simpan Pengumuman
          </button>
        </form>
      )}

      {/* Grid List Pengumuman */}
      <div className="space-y-4">
        {list.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
            Belum ada pengumuman yang diterbitkan.
          </div>
        ) : (
          list.map((item) => (
            <div key={item.ID} className={`bg-white dark:bg-slate-900 p-6 rounded-3xl border shadow-sm dark:shadow-none transition-all relative ${
              item.isPenting ? "border-purple-300 ring-2 ring-purple-100" : "border-slate-200 dark:border-slate-800"
            }`}>
              <div className="flex justify-between items-start gap-3 mb-2">
                <div className="flex items-center gap-2">
                  {item.isPenting && (
                    <span className="px-2.5 py-1 bg-purple-700 text-amber-300 font-extrabold rounded-full text-[10px] uppercase flex items-center gap-1 shadow-sm dark:shadow-none">
                      <Pin size={12} /> PENTING
                    </span>
                  )}
                  <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500">{item.Tanggal}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase border ${
                    item.Visibilitas === "PENGURUS" 
                      ? "bg-purple-50 text-purple-700 border-purple-200" 
                      : item.Visibilitas === "ANGGOTA" 
                        ? "bg-blue-50 text-blue-700 border-blue-200" 
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}>
                    {item.Visibilitas || "PUBLIK"}
                  </span>
                </div>

                {/* 29. Tombol Tandai Penting Toggle */}
                {(userRole === "PENGURUS" || userRole === "ADMIN" || userRole === "SUPER_ADMIN") && (
                  <button
                    onClick={() => handleTogglePenting(item)}
                    title="Toggle Status Penting"
                    className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                      item.isPenting ? "bg-amber-100 text-amber-800" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    📌 {item.isPenting ? "Penting" : "Tandai Penting"}
                  </button>
                )}
              </div>

              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg mb-2">{item.Judul}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Oleh: <strong>{item.Penulis}</strong></p>

              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-3 mb-4">
                {item.Isi}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                {/* 26. Tombol [Baca Selengkapnya] */}
                <button
                  onClick={() => setSelectedPengumuman(item)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
                >
                  📖 Baca Selengkapnya
                </button>

                {/* 27 & 28 buttons for Pengurus/Admin */}
                {(userRole === "PENGURUS" || userRole === "ADMIN" || userRole === "SUPER_ADMIN") && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold flex items-center gap-1"
                    >
                      <Edit3 size={14} /> Edit
                    </button>
                    {(userRole === "ADMIN" || userRole === "SUPER_ADMIN") && (
                      <button
                        onClick={() => setDeleteConfirmItem(item)}
                        className="px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold flex items-center gap-1"
                      >
                        <Trash2 size={14} /> Hapus
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 26. Modal Detail Pengumuman */}
      {selectedPengumuman && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-4 animate-in zoom-in-95 duration-200">
            <button onClick={() => setSelectedPengumuman(null)} className="absolute top-4 right-4 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400">
              <X size={20} />
            </button>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500">{selectedPengumuman.Tanggal}</span>
                {selectedPengumuman.isPenting && (
                  <span className="px-2 py-0.5 bg-purple-700 text-amber-300 font-bold rounded-full text-[10px]">PENTING</span>
                )}
              </div>
              <h3 className="font-black text-slate-900 dark:text-slate-100 text-xl">{selectedPengumuman.Judul}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Penulis: {selectedPengumuman.Penulis}</p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-sm text-slate-800 dark:text-slate-200 leading-relaxed max-h-80 overflow-y-auto border border-slate-200 dark:border-slate-800">
              {selectedPengumuman.Isi}
            </div>

            <button onClick={() => setSelectedPengumuman(null)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-xs">
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* 28. Modal Konfirmasi Hapus */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle size={32} />
            </div>

            <h3 className="font-black text-slate-900 dark:text-slate-100 text-lg">t("pengumuman.hapusPengumuman")</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">"{deleteConfirmItem.Judul}" akan dihapus permanen.</p>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setDeleteConfirmItem(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs">
                Batal
              </button>
              <button onClick={handleConfirmDelete} className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md dark:shadow-none">
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
