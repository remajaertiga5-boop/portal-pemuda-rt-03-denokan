import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Plus,
  ThumbsUp,
  MessageCircle,
  CheckCircle2,
  Trash2,
  X,
  AlertCircle,
} from "lucide-react";
import { AppData, addLogAkses } from "../utils/dataStore";
import { refreshSingleSheet } from "../utils/dataStoreSheets";
import { useLocale } from "../hooks/useLocale";
import { AspirasiItem, UserRole } from "../types";

// ----------------------------------------------------------
// TYPES
// ----------------------------------------------------------
interface AspirasiProps {
  appData: AppData;
  setAppData: React.Dispatch<React.SetStateAction<AppData>>;
  userRole: UserRole;
  currentUserId?: string;
  currentUserName?: string;
  showToast: (
    msg: string,
    type: "success" | "error" | "info" | "warning"
  ) => void;
}

// ----------------------------------------------------------
// KONSTANTA
// ----------------------------------------------------------
const KATEGORI_LIST = ["Sarana", "Kegiatan", "Keuangan", "Umum"] as const;
const FILTER_LIST   = ["SEMUA", ...KATEGORI_LIST] as const;

// ----------------------------------------------------------
// COMPONENT
// ----------------------------------------------------------
export default function Aspirasi({
  appData,
  setAppData,
  userRole,
  currentUserId,
  currentUserName,
  showToast,
}: AspirasiProps) {
  const { t } = useLocale();
  const [showForm, setShowForm]                   = useState(false);
  const [selectedCategory, setSelectedCategory]   = useState<string>("SEMUA");
  const [replyItem, setReplyItem]                 = useState<AspirasiItem | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<AspirasiItem | null>(null);

  // Form State
  const [isiAspirasi, setIsiAspirasi] = useState("");
  const [kategori, setKategori]       = useState<string>("Sarana");
  const [isAnonim, setIsAnonim]       = useState(false);

  // Reply State
  const [balasanText, setBalasanText] = useState("");

  // ----------------------------------------------------------
  // DATA
  // ----------------------------------------------------------

  // ── Refresh data Aspirasi dari Google Sheets tiap buka menu ──
  useEffect(() => {
    refreshSingleSheet("aspirasi").then((result: any) => {
      if (result?.Aspirasi) setAppData((prev: AppData) => ({ ...prev, Aspirasi: result.Aspirasi! }));
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const list = appData.Aspirasi || [];

  const isPengurus =
    userRole === "PENGURUS" ||
    userRole === "ADMIN"    ||
    userRole === "SUPER_ADMIN";

  const isAdmin =
    userRole === "ADMIN" ||
    userRole === "SUPER_ADMIN";

  // Filter berdasarkan kategori
  const filteredList = list.filter((a) => {
    if (selectedCategory === "SEMUA") return true;
    return a.Kategori?.toUpperCase() === selectedCategory.toUpperCase();
  });

  // ----------------------------------------------------------
  // 44. Kirim Aspirasi
  // ----------------------------------------------------------
  const handleSubmitAspirasi = (e: React.FormEvent) => {
    e.preventDefault();

    if (isiAspirasi.trim().length < 10) {
      showToast("Isi aspirasi minimal 10 karakter!", "error");
      return;
    }

    // ✅ ID pakai full timestamp — tidak collision
    const newItem: AspirasiItem = {
      ID         : `ASP-${Date.now()}`,
      Tanggal    : new Date().toISOString().split("T")[0],
      Pengirim   : isAnonim
        ? "Anonim Pemuda"
        : currentUserName || "Anggota",
      ID_Anggota : isAnonim ? undefined : currentUserId,
      // ✅ Simpan di satu field saja, tidak duplikasi
      Isi        : isiAspirasi.trim(),
      Kategori   : kategori,
      Status     : "MENUNGGU",
      // ✅ Pakai satu field Jumlah_Dukung saja
      Jumlah_Dukung: 0,
      SudahDukungBy: [],
    };

    const updated    = { ...appData, Aspirasi: [newItem, ...appData.Aspirasi] };
    const loggedData = addLogAkses(
      updated,
      newItem.Pengirim,
      userRole,
      "KIRIM_ASPIRASI",
      `Mengirim aspirasi kategori ${kategori}`
    );

    setAppData(loggedData);
    showToast(
      "Aspirasi Anda berhasil terkirim! Terima kasih masukannya ✨",
      "success"
    );

    // Reset form
    setShowForm(false);
    setIsiAspirasi("");
    setKategori("Sarana");
    setIsAnonim(false);
  };

  // ----------------------------------------------------------
  // 45. Dukung Aspirasi
  // ----------------------------------------------------------
  const handleLikeAspirasi = (item: AspirasiItem) => {
    const voterId      = currentUserId || "ANON-SESSION";
    const alreadyVoted = (item.SudahDukungBy || []).includes(voterId);

    if (alreadyVoted) {
      showToast("Anda sudah memberikan dukungan untuk aspirasi ini!", "info");
      return;
    }

    const updatedList = appData.Aspirasi.map((a) => {
      if (a.ID !== item.ID) return a;
      const currentCount = a.Jumlah_Dukung || 0;
      return {
        ...a,
        Jumlah_Dukung : currentCount + 1,
        SudahDukungBy : [...(a.SudahDukungBy || []), voterId],
      };
    });

    const updated    = { ...appData, Aspirasi: updatedList };
    // ✅ Catat ke log akses
    const loggedData = addLogAkses(
      updated,
      currentUserName || "Anggota",
      userRole,
      "DUKUNG_ASPIRASI",
      `Mendukung aspirasi ${item.ID}`
    );

    setAppData(loggedData);
    showToast("Dukungan Anda berhasil ditambahkan! 👍", "success");
  };

  // ----------------------------------------------------------
  // 46. Tanggapi Aspirasi
  // ----------------------------------------------------------
  const handleKirimBalasan = (e: React.FormEvent) => {
    e.preventDefault();

    if (!replyItem) return;
    if (!balasanText.trim()) {
      showToast("Isi tanggapan tidak boleh kosong!", "error");
      return;
    }

    const updatedList = appData.Aspirasi.map((a) => {
      if (a.ID !== replyItem.ID) return a;
      return {
        ...a,
        Tanggapan         : balasanText.trim(),
        Tanggapan_Oleh    : currentUserName || "Pengurus Harian",
        Tanggal_Tanggapan : new Date().toISOString().split("T")[0],
      };
    });

    const updated    = { ...appData, Aspirasi: updatedList };
    const loggedData = addLogAkses(
      updated,
      currentUserName || "Pengurus",
      userRole,
      "BALAS_ASPIRASI",
      `Membalas aspirasi ${replyItem.ID}`
    );

    setAppData(loggedData);
    showToast(
      "Tanggapan resmi pengurus berhasil dipublikasikan!",
      "success"
    );

    setReplyItem(null);
    setBalasanText("");
  };

  // ----------------------------------------------------------
  // 48. Tandai Selesai / Disetujui
  // ----------------------------------------------------------
  const handleTandaiSelesai = (item: AspirasiItem) => {
    const updatedList = appData.Aspirasi.map((a) =>
      a.ID === item.ID ? { ...a, Status: "DISETUJUI" as const } : a
    );

    const updated    = { ...appData, Aspirasi: updatedList };
    const loggedData = addLogAkses(
      updated,
      currentUserName || "Pengurus",
      userRole,
      "STATUS_ASPIRASI",
      `Menandai aspirasi ${item.ID} sebagai DISETUJUI`
    );

    setAppData(loggedData);
    showToast(
      "Status aspirasi diubah menjadi DISETUJUI / DITINDAKLANJUTI!",
      "success"
    );
  };

  // ----------------------------------------------------------
  // 49. Hapus Aspirasi
  // ----------------------------------------------------------
  const handleConfirmDelete = () => {
    if (!deleteConfirmItem) return;

    const updatedList = appData.Aspirasi.filter(
      (a) => a.ID !== deleteConfirmItem.ID
    );
    const updated    = { ...appData, Aspirasi: updatedList };
    const loggedData = addLogAkses(
      updated,
      currentUserName || "Admin",
      userRole,
      "HAPUS_ASPIRASI",
      `Menghapus aspirasi ${deleteConfirmItem.ID}`
    );

    setAppData(loggedData);
    showToast("Aspirasi berhasil dihapus!", "success");
    setDeleteConfirmItem(null);
  };

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------
  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <MessageSquare className="text-indigo-600" /> Halaman Aspirasi & Usulan
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Wadah penyampaian ide, kritik, dan usulan kemajuan desa.
          </p>
        </div>

        {/* 44. Tombol Kirim Aspirasi */}
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md dark:shadow-none transition-all"
        >
          {showForm ? "Batal" : <><Plus size={16} /> + Kirim Aspirasi</>}
        </button>
      </div>

      {/* 47. Filter Kategori */}
      <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-none">
        {FILTER_LIST.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
              selectedCategory === cat
                ? "bg-indigo-600 text-white border-indigo-600 shadow-md dark:shadow-none"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
            }`}
          >
            {cat === "SEMUA" ? "Semua Kategori" : cat}
          </button>
        ))}
      </div>

      {/* 44. Form Kirim Aspirasi */}
      {showForm && (
        <form
          onSubmit={handleSubmitAspirasi}
          className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-indigo-200 shadow-md dark:shadow-none space-y-4"
        >
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
            Sampaikan Aspirasi / Usulan
          </h3>

          {/* Kategori */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Kategori Usulan
            </label>
            <select
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none"
            >
              <option value="Sarana">Sarana & Prasarana</option>
              <option value="Kegiatan">Kegiatan Pemuda</option>
              <option value="Keuangan">Transparansi Keuangan</option>
              <option value="Umum">Usulan Umum</option>
            </select>
          </div>

          {/* Isi Aspirasi */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Isi Aspirasi / Saran *
            </label>
            <textarea
              rows={4}
              required
              value={isiAspirasi}
              onChange={(e) => setIsiAspirasi(e.target.value)}
              placeholder="Tuliskan ide atau saran Anda secara rinci (minimal 10 karakter)..."
              className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {/* Counter karakter */}
            <p className={`text-right text-[10px] mt-1 ${
              isiAspirasi.length < 10
                ? "text-rose-500"
                : "text-slate-400 dark:text-slate-500"
            }`}>
              {isiAspirasi.length} / min. 10 karakter
            </p>
          </div>

          {/* Toggle Anonim */}
          <div className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900">
            <input
              type="checkbox"
              id="anonimToggle"
              checked={isAnonim}
              onChange={(e) => setIsAnonim(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
            />
            <label
              htmlFor="anonimToggle"
              className="text-xs font-bold text-indigo-950 dark:text-indigo-200 cursor-pointer"
            >
              Sembunyikan Identitas (Sampaikan sebagai Anonim Pemuda)
            </label>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-md dark:shadow-none transition-all text-sm"
          >
            🚀 Kirimkan Aspirasi
          </button>
        </form>
      )}

      {/* List Aspirasi */}
      <div className="space-y-4">
        {filteredList.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
            Belum ada aspirasi pada kategori ini.
          </div>
        ) : (
          filteredList.map((item) => (
            <div
              key={item.ID}
              className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none hover:shadow-md transition-all space-y-4"
            >
              {/* Badge Status & Tanggal */}
              <div className="flex justify-between items-start gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {item.Kategori && (
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold rounded-full text-[10px] uppercase border border-indigo-100">
                      {item.Kategori}
                    </span>
                  )}
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    item.Status === "DISETUJUI"
                      ? "bg-emerald-100 text-emerald-800"
                      : item.Status === "DITOLAK"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-amber-100 text-amber-800"
                  }`}>
                    {item.Status === "DISETUJUI"
                      ? "DISETUJUI ✅"
                      : item.Status === "DITOLAK"
                      ? "DITOLAK ❌"
                      : "MENUNGGU ⏳"}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500 shrink-0">
                  {item.Tanggal}
                </span>
              </div>

              {/* Isi Aspirasi */}
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-1">
                  Oleh: {item.Pengirim}
                </div>
                <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                  "{item.Isi || item.Usulan || ""}"
                </p>
              </div>

              {/* Tanggapan Pengurus */}
              {item.Tanggapan && (
                <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-2xl border border-purple-100 dark:border-purple-900 space-y-1">
                  <div className="flex justify-between items-center text-[11px] font-bold text-purple-900 dark:text-purple-300">
                    <span>
                      💬 Tanggapan Resmi ({item.Tanggapan_Oleh || "Pengurus"})
                    </span>
                    <span className="font-mono text-purple-500">
                      {item.Tanggal_Tanggapan || ""}
                    </span>
                  </div>
                  <p className="text-xs text-purple-900 dark:text-purple-200 font-medium">
                    {item.Tanggapan}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                {/* 45. Dukung */}
                <button
                  onClick={() => handleLikeAspirasi(item)}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <ThumbsUp size={14} /> Dukung ({item.Jumlah_Dukung || item.Likes || 0})
                </button>

                <div className="flex gap-2">
                  {/* 46. Tanggapi — hanya pengurus ke atas */}
                  {isPengurus && (
                    <button
                      onClick={() => {
                        setReplyItem(item);
                        setBalasanText(item.Tanggapan || "");
                      }}
                      className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1"
                    >
                      <MessageCircle size={14} /> Tanggapi
                    </button>
                  )}

                  {/* 48. Setujui — hanya pengurus ke atas */}
                  {isPengurus && item.Status !== "DISETUJUI" && (
                    <button
                      onClick={() => handleTandaiSelesai(item)}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                    >
                      <CheckCircle2 size={14} /> Setujui
                    </button>
                  )}

                  {/* 49. Hapus — hanya admin ke atas */}
                  {isAdmin && (
                    <button
                      onClick={() => setDeleteConfirmItem(item)}
                      className="p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/60 text-rose-700 dark:text-rose-400 rounded-xl text-xs font-bold"
                      aria-label="Hapus aspirasi"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 46. Modal Tanggapi Aspirasi */}
      {replyItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setReplyItem(null);
                setBalasanText("");
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              aria-label="Tutup modal tanggapan"
            >
              <X size={20} />
            </button>

            <h3 className="font-black text-slate-900 dark:text-slate-100 text-lg">
              💬 Tanggapi Aspirasi
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Aspirasi dari{" "}
              <strong className="text-slate-700 dark:text-slate-300">
                {replyItem.Pengirim}
              </strong>
            </p>

            {/* Kutipan isi aspirasi */}
            <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800 italic">
              "{replyItem.Isi || replyItem.Usulan || ""}"
            </p>

            <form onSubmit={handleKirimBalasan} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tanggapan Resmi Pengurus *
                </label>
                <textarea
                  required
                  rows={4}
                  value={balasanText}
                  onChange={(e) => setBalasanText(e.target.value)}
                  placeholder="Tuliskan jawaban atau langkah penyelesaian dari pengurus..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setReplyItem(null);
                    setBalasanText("");
                  }}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold text-xs shadow-md dark:shadow-none"
                >
                  Kirim Tanggapan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 49. Modal Konfirmasi Hapus */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle size={32} />
            </div>

            <h3 className="font-black text-slate-900 dark:text-slate-100 text-lg">
              Hapus aspirasi ini?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Aspirasi dari{" "}
              <strong className="text-slate-700 dark:text-slate-300">
                {deleteConfirmItem.Pengirim}
              </strong>{" "}
              akan dihapus permanen.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmItem(null)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md dark:shadow-none"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
