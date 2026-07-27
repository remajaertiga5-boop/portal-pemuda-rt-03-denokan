import React, { useState } from "react";
import {
  Image as ImageIcon,
  Plus,
  Eye,
  Trash2,
  Download,
  X,
  AlertCircle,
} from "lucide-react";
import { AppData, addLogAkses } from "../utils/dataStore";
import { useLocale } from "../hooks/useLocale";
import { compressImage } from "../utils/imageUtils";
import { GaleriItem, UserRole } from "../types";
import { sendMediaToTelegram, uploadMediaToTelegram } from "../utils/apiConfigHelper";
import PandawaLogo from "./PandawaLogo";

// ----------------------------------------------------------
// KONSTANTA
// ----------------------------------------------------------
const KATEGORI_LIST   = ["Kegiatan", "Rapat", "Olahraga", "Kerja Bakti"] as const;
const FILTER_LIST     = ["SEMUA", ...KATEGORI_LIST] as const;
const MAX_FILE_SIZE   = 5 * 1024 * 1024; // 5MB

// ----------------------------------------------------------
// TYPES
// ----------------------------------------------------------
interface GaleriProps {
  appData: AppData;
  setAppData: React.Dispatch<React.SetStateAction<AppData>>;
  userRole: UserRole;
  currentUserName?: string;
  showToast: (
    msg: string,
    type: "success" | "error" | "info" | "warning"
  ) => void;
}

type ApprovalStatus = "DISETUJUI" | "MENUNGGU" | "DITOLAK";

// ----------------------------------------------------------
// COMPONENT
// ----------------------------------------------------------
export default function Galeri({
  appData,
  setAppData,
  userRole,
  currentUserName,
  showToast,
}: GaleriProps) {
  const { t } = useLocale();
  const [showForm, setShowForm]                   = useState(false);
  const [selectedCategory, setSelectedCategory]   = useState<string>("SEMUA");
  const [selectedPhoto, setSelectedPhoto]         = useState<GaleriItem | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<GaleriItem | null>(null);

  // Form State
  const [judulKegiatan, setJudulKegiatan] = useState("");
  const [kategori, setKategori]           = useState<string>("Kegiatan");
  const [deskripsi, setDeskripsi]         = useState("");
  const [fotoUrl, setFotoUrl]             = useState("");

  // ----------------------------------------------------------
  // DATA
  // ----------------------------------------------------------
  const list = appData.Galeri || [];

  const isPengurus =
    userRole === "PENGURUS" ||
    userRole === "ADMIN"    ||
    userRole === "SUPER_ADMIN";

  const isAdmin =
    userRole === "ADMIN" ||
    userRole === "SUPER_ADMIN";

  // Filter berdasarkan kategori, akses, dan approval
  const filteredList = list.filter((g) => {
    if (
      selectedCategory !== "SEMUA" &&
      g.Kategori?.toUpperCase() !== selectedCategory.toUpperCase()
    ) return false;

    const vis = g.Kategori_Akses || "PUBLIK";
    if (userRole === "TAMU"    && vis !== "PUBLIK")    return false;
    if (userRole === "ANGGOTA" && vis === "PENGURUS")  return false;

    if (g.Status_Approval === "MENUNGGU") {
      const isUploader =
        g.Uploader === currentUserName ||
        g.Nama_Upload === currentUserName;
      return isUploader || isPengurus;
    }

    if (g.Status_Approval === "DITOLAK") {
      return isAdmin;
    }

    return true;
  });

  // ----------------------------------------------------------
  // HELPER - Trigger download
  // ----------------------------------------------------------
  const triggerDownload = (url: string, filename: string) => {
    if (!url) return;
    const link = document.createElement("a");
    link.href     = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileExt = (url: string): string =>
    url.startsWith("data:image/png") ? "png" : "jpg";

  const getFilename = (item: GaleriItem): string =>
    `Remaja_RT03_${item.Kategori || "Galeri"}_${item.ID}.${getFileExt(item.Foto_URL || "")}`;

  // ----------------------------------------------------------
  // Download semua foto
  // ----------------------------------------------------------
  const downloadAll = () => {
    if (filteredList.length === 0) {
      showToast("Tidak ada foto yang dapat diunduh!", "warning");
      return;
    }
    showToast(`Mengunduh ${filteredList.length} foto... 📥`, "info");
    filteredList.forEach((item, index) => {
      const url = item.Foto_URL || item.Link_Foto || "";
      if (!url) return;
      setTimeout(() => triggerDownload(url, getFilename(item)), index * 300);
    });
  };

  // ----------------------------------------------------------
  // 50. Upload Foto
  // ----------------------------------------------------------
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    const maxSize = isVideo ? 25 * 1024 * 1024 : MAX_FILE_SIZE;

    if (file.size > maxSize) {
      showToast(isVideo ? "Ukuran video maksimal 25MB!" : "Ukuran foto maksimal 5MB!", "error");
      e.target.value = "";
      return;
    }

    try {
      if (!isVideo && file.type.startsWith("image/")) {
        // Kompres gambar sebelum preview
        showToast("Mengompres gambar...", "info");
        const compressed = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.8 });
        setFotoUrl(compressed.dataUrl);
        // Simpan blob untuk upload nanti
        (window as any).__uploadBlob = compressed.blob;
        const ratio = compressed.blob.size / file.size;
        showToast(
          `Gambar dikompres ${ratio < 0.5 ? (ratio * 100).toFixed(0) + "%" : "ke " + (compressed.blob.size / 1024).toFixed(0) + "KB"} 📷`,
          "info"
        );
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFotoUrl(reader.result as string);
          showToast(isVideo ? "Video dimuat ke pratinjau 📹" : "File dimuat 📄", "info");
        };
        reader.readAsDataURL(file);
        (window as any).__uploadBlob = file;
      }
    } catch {
      // Fallback: baca tanpa kompres
      const reader = new FileReader();
      reader.onloadend = () => setFotoUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitGaleri = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!judulKegiatan.trim() || !fotoUrl) {
      showToast("Judul kegiatan dan media wajib diisi!", "error");
      return;
    }

    const isVideo = fotoUrl.startsWith("data:video/") || fotoUrl.includes(".mp4") || fotoUrl.includes(".webm");
    const needsApproval     = appData.Settings?.ContentAccess?.fotoPerluApproval ?? true;
    const initialApproval: ApprovalStatus =
      isPengurus || !needsApproval ? "DISETUJUI" : "MENUNGGU";

    // ── Upload Storage (Telegram ➔ R2 ➔ fallback base64) ──
    let finalUrl = fotoUrl;
    let storageMethod = "local";

    // 1. TRY: Telegram (prioritas utama)
    try {
      const tgFileType = isVideo ? "video/mp4" : "image/jpeg";
      const tgFileName = `${judulKegiatan.trim().slice(0, 30)}.${isVideo ? "mp4" : "jpg"}`;
      const tgResult = await uploadMediaToTelegram(
        appData, fotoUrl, tgFileName, tgFileType,
        `📱 Remaja Legok 03\n📌 ${judulKegiatan.trim()}\n👤 ${currentUserName || "Anggota"}`
      );
      if (tgResult?.url) {
        finalUrl = tgResult.url;
        storageMethod = "telegram";
        showToast("📸 Disimpan di Telegram!", "success");
      }
    } catch {}

    // 2. LAST RESORT: base64 data URL (tetap di localStorage)
    if (storageMethod === "local") {
      showToast("⚠️ Disimpan lokal — upload ke Telegram gagal", "warning");
    }

    const newItem: GaleriItem = {
      ID              : `GLR-${Date.now()}`,
      Tanggal         : new Date().toISOString().split("T")[0],
      Judul_Kegiatan  : judulKegiatan.trim(),
      Kategori        : kategori,
      Foto_URL        : finalUrl,
      Deskripsi       : deskripsi.trim(),
      Uploader        : currentUserName || "Anggota",
      Nama_Upload     : currentUserName || "Anggota",
      Role_Upload     : userRole,
      Kategori_Akses  : "PUBLIK",
      Status_Approval : initialApproval,
      Is_Video        : isVideo,
      Jenis_Media     : isVideo ? "VIDEO" : "FOTO",
    };

    const updated    = { ...appData, Galeri: [newItem, ...appData.Galeri] };
    const loggedData = addLogAkses(
      updated,
      currentUserName || "Anggota",
      userRole,
      "UPLOAD_GALERI",
      `Upload ${isVideo ? "video" : "foto"} ${judulKegiatan} (Status: ${initialApproval})`
    );
    setAppData(loggedData);

    // Notifikasi: foto sudah dikirim via uploadMediaToTelegram — tidak perlu kirim ulang

    showToast(
      initialApproval === "MENUNGGU"
        ? "Media dikirim! Menunggu persetujuan pengurus. ⏳"
        : `Media ${isVideo ? "video" : "foto"} berhasil diunggah ke galeri! ✨`,
      initialApproval === "MENUNGGU" ? "info" : "success"
    );

    // Reset form
    setShowForm(false);
    setJudulKegiatan("");
    setDeskripsi("");
    setFotoUrl("");
    setKategori("Kegiatan");
  };

  // ----------------------------------------------------------
  // Approval handler — dipisah dari JSX
  // ----------------------------------------------------------
  const handleApproval = (item: GaleriItem, status: ApprovalStatus) => {
    const actionLog =
      status === "DISETUJUI" ? "SETUJUI_FOTO" : "TOLAK_FOTO";
    const logMsg =
      status === "DISETUJUI"
        ? `Menyetujui foto ${item.Judul_Kegiatan}`
        : `Menolak foto ${item.Judul_Kegiatan}`;

    const updated    = {
      ...appData,
      Galeri: appData.Galeri.map((g) =>
        g.ID === item.ID ? { ...g, Status_Approval: status } : g
      ),
    };
    const loggedData = addLogAkses(
      updated,
      currentUserName || "Pengurus",
      userRole,
      actionLog,
      logMsg
    );
    setAppData(loggedData);

    showToast(
      status === "DISETUJUI"
        ? "Foto disetujui & sekarang tampil publik! ✅"
        : "Foto ditolak.",
      status === "DISETUJUI" ? "success" : "warning"
    );
  };

  // ----------------------------------------------------------
  // 53. Hapus Foto
  // ----------------------------------------------------------
  const handleConfirmDelete = () => {
    if (!deleteConfirmItem) return;

    const updatedList = appData.Galeri.filter(
      (g) => g.ID !== deleteConfirmItem.ID
    );
    const updated    = { ...appData, Galeri: updatedList };
    const loggedData = addLogAkses(
      updated,
      currentUserName || "Admin",
      userRole,
      "HAPUS_GALERI",
      `Menghapus foto ${deleteConfirmItem.ID}`
    );
    setAppData(loggedData);
    showToast("Foto berhasil dihapus dari galeri!", "success");

    setDeleteConfirmItem(null);
    setSelectedPhoto(null);
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
            <ImageIcon className="text-rose-500" /> Halaman Galeri Kegiatan
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Dokumentasi momen & kegiatan pemuda RT 03 Legok RW 04 Denokan.
          </p>
        </div>

        {/* 50. Tombol Upload */}
        {userRole !== "TAMU" && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md dark:shadow-none transition-all"
          >
            {showForm ? "Batal" : <><Plus size={16} /> + Upload Foto</>}
          </button>
        )}
      </div>

      {/* 52. Filter & Download All */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-none w-full sm:w-auto">
          {FILTER_LIST.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                selectedCategory === cat
                  ? "bg-rose-600 text-white border-rose-600 shadow-md dark:shadow-none"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              }`}
            >
              {cat === "SEMUA" ? "Semua Foto" : cat}
            </button>
          ))}
        </div>

        {filteredList.length > 0 && (
          <button
            onClick={downloadAll}
            className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm dark:shadow-none transition-all whitespace-nowrap"
          >
            <Download size={14} /> Unduh Semua ({filteredList.length} Foto)
          </button>
        )}
      </div>

      {/* 50. Form Upload Foto */}
      {showForm && (
        <form
          onSubmit={handleSubmitGaleri}
          className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-rose-200 shadow-md dark:shadow-none space-y-4"
        >
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
              📤 Upload Foto/Video Kegiatan
            </h3>
            <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl flex items-center gap-2">
              <PandawaLogo size={24} />
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">Remaja Legok 03</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Judul Kegiatan *
              </label>
              <input
                required
                value={judulKegiatan}
                onChange={(e) => setJudulKegiatan(e.target.value)}
                placeholder="Contoh: Kerja Bakti Bersih Desa"
                className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kategori
              </label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500"
              >
                {KATEGORI_LIST.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
          </div>

          {/* File Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Pilih File Media (Foto/Video) * (Foto maks 5MB, Video maks 25MB)
            </label>
            <input
              required
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100"
            />
          </div>

          {/* Pratinjau */}
          {fotoUrl && (
            <div className="p-2 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xs">
              {fotoUrl.startsWith("data:video/") ? (
                <video src={fotoUrl} controls className="h-36 w-full object-cover rounded-xl" />
              ) : (
                <img
                  src={fotoUrl}
                  alt="Pratinjau"
                  className="h-36 w-full object-cover rounded-xl"
                />
              )}
            </div>
          )}

          {/* Deskripsi */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Deskripsi / Keterangan Momen
            </label>
            <textarea
              rows={2}
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Tuliskan momen seru dari kegiatan ini..."
              className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl shadow-md dark:shadow-none transition-all text-sm"
          >
            🚀 Publikasikan ke Galeri
          </button>
        </form>
      )}

      {/* Grid Galeri */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filteredList.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-slate-900 p-12 text-center rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
            Belum ada dokumentasi media pada kategori ini.
          </div>
        ) : (
          filteredList.map((item) => {
            const fotoSrc = item.Foto_URL || item.Link_Foto || "";
            const isVideo = item.Is_Video || item.Jenis_Media === "VIDEO" || fotoSrc.startsWith("data:video/");

            return (
              <div
                key={item.ID}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none overflow-hidden group hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Thumbnail */}
                <div className="relative h-48 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  {fotoSrc ? (
                    isVideo ? (
                      <div className="w-full h-full relative bg-black flex items-center justify-center">
                        <video src={fotoSrc} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg font-bold">
                            ▶
                          </div>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={fotoSrc}
                        alt={item.Judul_Kegiatan}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs">
                      Tidak ada media
                    </div>
                  )}

                  {/* 51. Lightbox trigger */}
                  {fotoSrc && (
                    <button
                      onClick={() => setSelectedPhoto(item)}
                      aria-label="Lihat media fullscreen"
                      className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs gap-1"
                    >
                      <Eye size={18} /> Lihat Fullscreen
                    </button>
                  )}

                  <span className="absolute top-3 left-3 px-2.5 py-1 bg-slate-900/80 backdrop-blur-sm text-white font-bold rounded-full text-[10px]">
                    {item.Kategori} {isVideo ? "• 📹 Video" : "• 📷 Foto"}
                  </span>

                  {item.Status_Approval === "MENUNGGU" && (
                    <span className="absolute top-3 right-3 px-2.5 py-1 bg-amber-500 text-white font-black rounded-full text-[10px] shadow-md animate-pulse">
                      ⏳ Menunggu Persetujuan
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-4 space-y-1">
                  <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm truncate">
                    {item.Judul_Kegiatan}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {item.Tanggal} • {item.Uploader || "Anggota"}
                  </p>
                  {item.Deskripsi && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 pt-1">
                      {item.Deskripsi}
                    </p>
                  )}
                </div>

                {/* Action Footer */}
                <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  {/* Unduh */}
                  <button
                    onClick={() => {
                      if (!fotoSrc) return;
                      triggerDownload(fotoSrc, getFilename(item));
                      showToast("Unduhan dimulai! 📥", "success");
                    }}
                    disabled={!fotoSrc}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-40"
                    title="Unduh Foto"
                  >
                    <Download size={13} /> Unduh
                  </button>

                  {/* Approval — hanya tampil jika MENUNGGU dan pengurus */}
                  {item.Status_Approval === "MENUNGGU" && isPengurus && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleApproval(item, "DISETUJUI")}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm dark:shadow-none"
                      >
                        Setujui
                      </button>
                      <button
                        onClick={() => handleApproval(item, "DITOLAK")}
                        className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 hover:bg-rose-100 text-xs font-bold rounded-xl"
                      >
                        Tolak
                      </button>
                    </div>
                  )}

                  {/* Hapus — hanya admin */}
                  {item.Status_Approval !== "MENUNGGU" && isAdmin && (
                    <button
                      onClick={() => setDeleteConfirmItem(item)}
                      className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 hover:bg-rose-100 rounded-lg text-xs font-bold flex items-center gap-1"
                      aria-label="Hapus foto"
                    >
                      <Trash2 size={12} /> Hapus
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 51. Lightbox Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-800 text-white">
            <button
              onClick={() => setSelectedPhoto(null)}
              aria-label="Tutup lightbox"
              className="absolute top-4 right-4 z-10 p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-full"
            >
              <X size={20} />
            </button>

            <div className="max-h-[70vh] bg-black flex items-center justify-center overflow-hidden">
              {selectedPhoto.Is_Video || selectedPhoto.Jenis_Media === "VIDEO" || (selectedPhoto.Foto_URL || "").startsWith("data:video/") ? (
                <video
                  src={selectedPhoto.Foto_URL || selectedPhoto.Link_Foto || ""}
                  controls
                  autoPlay
                  className="max-h-[70vh] w-auto object-contain"
                />
              ) : (
                <img
                  src={selectedPhoto.Foto_URL || selectedPhoto.Link_Foto || ""}
                  alt={selectedPhoto.Judul_Kegiatan}
                  className="max-h-[70vh] w-auto object-contain"
                />
              )}
            </div>

            <div className="p-6 space-y-2">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <span className="px-2.5 py-1 bg-rose-600 text-white font-bold rounded-full text-[10px] uppercase">
                    {selectedPhoto.Kategori}
                  </span>
                  <h3 className="font-black text-xl text-white mt-1">
                    {selectedPhoto.Judul_Kegiatan}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {selectedPhoto.Tanggal} • {selectedPhoto.Uploader || "Pengurus"}
                  </p>
                </div>

                <a
                  href={selectedPhoto.Foto_URL || selectedPhoto.Link_Foto || ""}
                  download={`galeri_${selectedPhoto.ID}.jpg`}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <Download size={16} /> Unduh
                </a>
              </div>

              {selectedPhoto.Deskripsi && (
                <p className="text-sm text-slate-300 pt-2 border-t border-slate-800">
                  {selectedPhoto.Deskripsi}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 53. Modal Konfirmasi Hapus */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle size={32} />
            </div>

            <h3 className="font-black text-slate-900 dark:text-slate-100 text-lg">
              Hapus foto ini?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Foto{" "}
              <strong className="text-slate-700 dark:text-slate-300">
                "{deleteConfirmItem.Judul_Kegiatan}"
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
