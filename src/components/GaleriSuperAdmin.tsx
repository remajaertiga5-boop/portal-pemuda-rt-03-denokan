import React, { useState, useEffect, useRef } from "react";
import {
  Image as ImageIcon, Plus, Eye, Trash2, Download, Share2, X,
  FolderPlus, Filter, Search, Check, Lock, Shield, CheckCircle2,
  XCircle, Clock, ChevronRight, ChevronLeft, ArrowLeftRight, Settings, Grid,
  List, HardDrive, ArrowLeft, Play, Pause, Copy,
  ExternalLink, Layers, CheckCheck, RotateCcw
} from "lucide-react";
import { AppData, addLogAkses } from "../utils/dataStore";
import { GaleriItem, AlbumItem, UserRole, ContentVisibility } from "../types";
import { verifikasiPINDinamis } from "../utils/auth";
import PINField from "./PINField";
import { sendMediaToTelegram } from "../utils/apiConfigHelper";
import PandawaLogo from "./PandawaLogo";

// ----------------------------------------------------------
// TYPES
// ----------------------------------------------------------
type SortBy = "TERBARU" | "TERLAMA" | "ALBUM_AZ" | "UPLOADER_AZ";
type ViewMode = "GRID_2" | "LIST";
type ActiveTab = "semua_foto" | "kelola_album" | "menunggu" | "upload" | "pengaturan";
type ApprovalStatus = "DISETUJUI" | "MENUNGGU" | "DITOLAK";
type UploadStrategy = "AUTO" | "SAME";

type FotoSiapaUpload = "SEMUA_ANGGOTA" | "PENGURUS" | "KETUA";

interface PinModalAction {
  type: "DELETE_PHOTO" | "DELETE_BULK_PHOTOS" | "DELETE_ALBUM" | "EMPTY_RECYCLE_BIN" | "SAVE_SETTINGS";
  title: string;
  description: string;
  payload?: any;
}

interface UploadFileItem {
  id     : string;
  url    : string;
  title  : string;
  caption: string;
  sizeKB : number;
  isVideo?: boolean;
}

interface GaleriSuperAdminProps {
  appData: AppData;
  setAppData: React.Dispatch<React.SetStateAction<AppData>>;
  showToast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
  onBackToDashboard?: () => void;
}

// ----------------------------------------------------------
// COMPONENT
// ----------------------------------------------------------
export default function GaleriSuperAdmin({
  appData,
  setAppData,
  showToast,
  onBackToDashboard,
}: GaleriSuperAdminProps) {
  // Navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>("semua_foto");

  // Filter & Search
  const [filterVisibilitas, setFilterVisibilitas]     = useState<string>("ALL");
  const [filterAlbum, setFilterAlbum]                 = useState<string>("ALL");
  const [filterStatus, setFilterStatus]               = useState<string>("ALL");
  const [filterUploaderRole, setFilterUploaderRole]   = useState<string>("ALL");
  const [searchQuery, setSearchQuery]                 = useState("");
  const [sortBy, setSortBy]                           = useState<SortBy>("TERBARU");
  const [viewMode, setViewMode]                       = useState<ViewMode>("GRID_2");

  // Album Detail
  const [selectedAlbumDetail, setSelectedAlbumDetail] = useState<AlbumItem | null>(null);

  // Bulk Selection
  const [isSelectMode, setIsSelectMode]       = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);

  // Lightbox
  const [lightboxPhoto, setLightboxPhoto] = useState<GaleriItem | null>(null);

  // Modals
  const [isCreateAlbumOpen, setIsCreateAlbumOpen]   = useState(false);
  const [editingAlbum, setEditingAlbum]             = useState<AlbumItem | null>(null);
  const [moveAlbumPhoto, setMoveAlbumPhoto]         = useState<GaleriItem | null>(null);
  const [targetMoveAlbumId, setTargetMoveAlbumId]   = useState("");
  const [changeVisPhoto, setChangeVisPhoto]         = useState<GaleriItem | null>(null);
  const [targetNewVis, setTargetNewVis]             = useState<ContentVisibility>("PUBLIK");
  const [rejectingPhoto, setRejectingPhoto]         = useState<GaleriItem | null>(null);
  const [rejectReason, setRejectReason]             = useState("Foto tidak sesuai kegiatan");
  const [rejectCustomNote, setRejectCustomNote]     = useState("");
  const [pinModalAction, setPinModalAction]         = useState<PinModalAction | null>(null);
  const [pinInput, setPinInput]                     = useState("");
  const [confirmNameInput, setConfirmNameInput]     = useState("");
  const [albumVisWarning, setAlbumVisWarning]       = useState<{ album: AlbumItem; newVis: ContentVisibility } | null>(null);
  const [isRecycleBinOpen, setIsRecycleBinOpen]     = useState(false);
  const [isShareModalOpen, setIsShareModalOpen]     = useState(false);
  const [shareAlbumItem, setShareAlbumItem]         = useState<AlbumItem | null>(null);

  // Slideshow
  const [isSlideshowOpen, setIsSlideshowOpen]         = useState(false);
  const [slideshowIndex, setSlideshowIndex]           = useState(0);
  const [isSlideshowPlaying, setIsSlideshowPlaying]   = useState(true);
  const slideshowRef                                  = useRef<ReturnType<typeof setInterval> | null>(null);

  // Album Form
  const [albumForm, setAlbumForm] = useState({
    Nama_Album       : "",
    Deskripsi        : "",
    Tanggal_Kegiatan : new Date().toISOString().split("T")[0],
    Kategori_Akses   : "PUBLIK" as ContentVisibility,
    Cover_URL        : "",
    Kategori_Kegiatan: "Hari Besar",
  });

  // Upload Form
  const [uploadFiles, setUploadFiles]                       = useState<UploadFileItem[]>([]);
  const [uploadAlbumId, setUploadAlbumId]                   = useState<string>("");
  const [uploadVisibilitas, setUploadVisibilitas]           = useState<ContentVisibility>("PUBLIK");
  const [uploadTitleStrategy, setUploadTitleStrategy]       = useState<UploadStrategy>("SAME");
  const [uploadGlobalTitle, setUploadGlobalTitle]           = useState("");
  const [uploadGlobalCaption, setUploadGlobalCaption]       = useState("");
  const [isUploadingProgress, setIsUploadingProgress]       = useState(false);
  const [uploadProgressPercent, setUploadProgressPercent]   = useState(0);
  const [showInlineCreateAlbum, setShowInlineCreateAlbum]   = useState(false);
  const [inlineAlbumName, setInlineAlbumName]               = useState("");

  // Settings
  const settings = appData.Settings?.ContentAccess || {};
  const [settingsForm, setSettingsForm] = useState({
    fotoSiapaUpload           : (settings.fotoSiapaUpload || "SEMUA_ANGGOTA") as FotoSiapaUpload,
    fotoPerluApproval         : settings.fotoPerluApproval         ?? true,
    fotoPengurusPerluApproval : settings.fotoPengurusPerluApproval ?? false,
    maxFileSizeMB             : settings.maxFileSizeMB             || 10,
    maxBatchUploadCount       : settings.maxBatchUploadCount       || 10,
    enableRecycleBin          : settings.enableRecycleBin          ?? true,
    recycleBinDays            : settings.recycleBinDays            || 30,
    showUploaderInPublic      : settings.showUploaderInPublic      ?? true,
    requireDeleteConfirm      : settings.requireDeleteConfirm      ?? true,
    fotoDefaultVisibilitas    : settings.fotoDefaultVisibilitas    || "TANYA",
    albumDefaultVisibilitas   : settings.albumDefaultVisibilitas   || "TANYA",
  });

  // ----------------------------------------------------------
  // DATA
  // ----------------------------------------------------------
  const activePhotos  = (appData.Galeri || []).filter((f) => !f.Is_Deleted);
  const deletedPhotos = (appData.Galeri || []).filter((f) => f.Is_Deleted);
  const totalAlbums   = appData.Album  || [];
  const pendingPhotos = activePhotos.filter((f) => f.Status_Approval === "MENUNGGU");
  const countPublik   = activePhotos.filter((f) => (f.Kategori_Akses || "PUBLIK") === "PUBLIK").length;
  const countAnggota  = activePhotos.filter((f) => f.Kategori_Akses === "ANGGOTA").length;
  const countPengurus = activePhotos.filter((f) => f.Kategori_Akses === "PENGURUS").length;

  // ----------------------------------------------------------
  // HELPER
  // ----------------------------------------------------------
  const getAlbumName = (albumId?: string): string => {
    if (!albumId) return "Umum / Tanpa Album";
    const found = totalAlbums.find((a) => a.ID_Album === albumId);
    return found ? found.Nama_Album : "Album Dihapus";
  };

  const getPhotoId = (photo: GaleriItem): string =>
    photo.ID || photo.ID_Foto || "";

  const verifySA_PIN = (pin: string): boolean =>
    verifikasiPINDinamis(pin) || pin === appData.Settings?.PIN_SuperAdmin;

  // ----------------------------------------------------------
  // FILTER & SORT FOTO
  // ----------------------------------------------------------
  const getFilteredPhotos = (): GaleriItem[] => {
    let result = activePhotos;

    if (selectedAlbumDetail) {
      result = result.filter((f) => f.Album_ID === selectedAlbumDetail.ID_Album);
    } else if (filterAlbum !== "ALL") {
      result = result.filter((f) => f.Album_ID === filterAlbum);
    }

    if (filterVisibilitas !== "ALL") {
      result = result.filter((f) => (f.Kategori_Akses || "PUBLIK") === filterVisibilitas);
    }

    if (filterStatus !== "ALL") {
      result = result.filter((f) => (f.Status_Approval || "DISETUJUI") === filterStatus);
    }

    if (filterUploaderRole !== "ALL") {
      result = result.filter((f) => (f.Role_Upload || "ANGGOTA") === filterUploaderRole);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((f) => {
        const title    = (f.Judul || f.Judul_Kegiatan || "").toLowerCase();
        const caption  = (f.Caption || f.Deskripsi || "").toLowerCase();
        const uploader = (f.Nama_Upload || f.Uploader || "").toLowerCase();
        const albumObj = totalAlbums.find((a) => a.ID_Album === f.Album_ID);
        const albumName = (albumObj?.Nama_Album || "").toLowerCase();
        return title.includes(q) || caption.includes(q) || uploader.includes(q) || albumName.includes(q);
      });
    }

    return [...result].sort((a, b) => {
      switch (sortBy) {
        case "TERBARU"     : return new Date(b.Tanggal).getTime() - new Date(a.Tanggal).getTime();
        case "TERLAMA"     : return new Date(a.Tanggal).getTime() - new Date(b.Tanggal).getTime();
        case "ALBUM_AZ"    : {
          const nameA = totalAlbums.find((x) => x.ID_Album === a.Album_ID)?.Nama_Album || "";
          const nameB = totalAlbums.find((x) => x.ID_Album === b.Album_ID)?.Nama_Album || "";
          return nameA.localeCompare(nameB);
        }
        case "UPLOADER_AZ" : return (a.Nama_Upload || "").localeCompare(b.Nama_Upload || "");
        default            : return 0;
      }
    });
  };

  const filteredPhotos = getFilteredPhotos();

  // ✅ Slideshow interval yang benar-benar berjalan
  useEffect(() => {
    if (!isSlideshowOpen || !isSlideshowPlaying || filteredPhotos.length === 0) {
      if (slideshowRef.current) clearInterval(slideshowRef.current);
      return;
    }
    slideshowRef.current = setInterval(() => {
      setSlideshowIndex((prev) =>
        prev < filteredPhotos.length - 1 ? prev + 1 : 0
      );
    }, 3000);
    return () => {
      if (slideshowRef.current) clearInterval(slideshowRef.current);
    };
  }, [isSlideshowOpen, isSlideshowPlaying, filteredPhotos.length]);

  // ----------------------------------------------------------
  // HANDLERS
  // ----------------------------------------------------------
  const handleApprovePhoto = (photo: GaleriItem) => {
    const pId = getPhotoId(photo);
    const updated = {
      ...appData,
      Galeri: appData.Galeri.map((f) =>
        getPhotoId(f) === pId
          ? { ...f, Status_Approval: "DISETUJUI" as ApprovalStatus, Tanggal_Approval: new Date().toISOString(), Approved_By: "Super Admin" }
          : f
      ),
    };
    setAppData(addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "SETUJUI_FOTO", `Menyetujui foto "${photo.Judul || photo.Judul_Kegiatan}"`));
    showToast(`Foto "${photo.Judul || photo.Judul_Kegiatan}" telah disetujui! ✅`, "success");
  };

  const handleConfirmRejectPhoto = () => {
    if (!rejectingPhoto) return;
    const pId = getPhotoId(rejectingPhoto);
    const fullReason = `${rejectReason}${rejectCustomNote ? ` - Catatan: ${rejectCustomNote}` : ""}`;
    const updated = {
      ...appData,
      Galeri: appData.Galeri.map((f) =>
        getPhotoId(f) === pId
          ? { ...f, Status_Approval: "DITOLAK" as ApprovalStatus, Alasan_Penolakan: fullReason, Tanggal_Approval: new Date().toISOString(), Approved_By: "Super Admin" }
          : f
      ),
    };
    setAppData(addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "TOLAK_FOTO", `Menolak foto: ${fullReason}`));
    showToast("Foto ditolak. Alasan tersimpan. ❌", "info");
    setRejectingPhoto(null);
    setRejectCustomNote("");
  };

  const handleApproveAllPending = () => {
    if (pendingPhotos.length === 0) return;
    const updated = {
      ...appData,
      Galeri: appData.Galeri.map((f) =>
        f.Status_Approval === "MENUNGGU" && !f.Is_Deleted
          ? { ...f, Status_Approval: "DISETUJUI" as ApprovalStatus, Tanggal_Approval: new Date().toISOString(), Approved_By: "Super Admin" }
          : f
      ),
    };
    setAppData(addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "SETUJUI_SEMUA_FOTO", `Menyetujui massal ${pendingPhotos.length} foto`));
    showToast(`Berhasil menyetujui ${pendingPhotos.length} foto! 🎉`, "success");
  };

  const handleRestorePhoto = (photo: GaleriItem) => {
    const pId = getPhotoId(photo);
    const updated = {
      ...appData,
      Galeri: appData.Galeri.map((f) =>
        getPhotoId(f) === pId
          ? { ...f, Is_Deleted: false, Tanggal_Dihapus: undefined, Dihapus_Oleh: undefined }
          : f
      ),
    };
    setAppData(addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "PULIHKAN_FOTO", `Memulihkan foto "${photo.Judul || photo.Judul_Kegiatan}"`));
    showToast("Foto berhasil dipulihkan! 🔄", "success");
  };

  const handleExecuteMovePhoto = () => {
    if (!moveAlbumPhoto || !targetMoveAlbumId) return;
    const pId = getPhotoId(moveAlbumPhoto);
    const updated = {
      ...appData,
      Galeri: appData.Galeri.map((f) =>
        getPhotoId(f) === pId ? { ...f, Album_ID: targetMoveAlbumId } : f
      ),
    };
    const destName = getAlbumName(targetMoveAlbumId);
    setAppData(addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "PINDAH_ALBUM_FOTO", `Pindahkan foto ke album ${destName}`));
    showToast(`Foto dipindahkan ke "${destName}"! 🔀`, "success");
    setMoveAlbumPhoto(null);
    setTargetMoveAlbumId("");
  };

  const handleExecuteChangeVis = () => {
    if (!changeVisPhoto) return;
    const pId = getPhotoId(changeVisPhoto);
    const updated = {
      ...appData,
      Galeri: appData.Galeri.map((f) =>
        getPhotoId(f) === pId ? { ...f, Kategori_Akses: targetNewVis } : f
      ),
    };
    setAppData(addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "UBAH_VISIBILITAS_FOTO", `Ubah visibilitas foto ke ${targetNewVis}`));
    showToast(`Visibilitas diubah menjadi ${targetNewVis}! 🔄`, "success");
    setChangeVisPhoto(null);
  };

  const handlePINModalExecute = () => {
    if (!pinModalAction) return;
    if (!verifySA_PIN(pinInput)) {
      showToast("PIN Super Admin tidak valid!", "error");
      return;
    }

    switch (pinModalAction.type) {
      case "DELETE_ALBUM": {
        const albumToDelete: AlbumItem = pinModalAction.payload;
        if (confirmNameInput.trim() !== albumToDelete.Nama_Album.trim()) {
          showToast("Nama album konfirmasi tidak sesuai!", "error");
          return;
        }
        const updated = {
          ...appData,
          Album: appData.Album.filter((a) => a.ID_Album !== albumToDelete.ID_Album),
          Galeri: appData.Galeri.map((f) =>
            f.Album_ID === albumToDelete.ID_Album
              ? { ...f, Is_Deleted: true, Tanggal_Dihapus: new Date().toISOString(), Dihapus_Oleh: "Super Admin (Hapus Album)" }
              : f
          ),
        };
        setAppData(addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "HAPUS_ALBUM", `Menghapus album "${albumToDelete.Nama_Album}"`));
        showToast(`Album "${albumToDelete.Nama_Album}" dihapus! 🗑️`, "success");
        if (selectedAlbumDetail?.ID_Album === albumToDelete.ID_Album) setSelectedAlbumDetail(null);
        break;
      }
      case "DELETE_PHOTO": {
        const photo: GaleriItem = pinModalAction.payload;
        const pId = getPhotoId(photo);
        const updated = {
          ...appData,
          Galeri: appData.Galeri.map((f) =>
            getPhotoId(f) === pId
              ? { ...f, Is_Deleted: true, Tanggal_Dihapus: new Date().toISOString(), Dihapus_Oleh: "Super Admin" }
              : f
          ),
        };
        setAppData(addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "HAPUS_FOTO", `Menghapus foto "${photo.Judul || photo.Judul_Kegiatan}"`));
        showToast("Foto dipindahkan ke Recycle Bin! 🗑️", "success");
        if (lightboxPhoto && getPhotoId(lightboxPhoto) === pId) setLightboxPhoto(null);
        break;
      }
      case "DELETE_BULK_PHOTOS": {
        const ids: string[] = pinModalAction.payload;
        const updated = {
          ...appData,
          Galeri: appData.Galeri.map((f) =>
            ids.includes(getPhotoId(f))
              ? { ...f, Is_Deleted: true, Tanggal_Dihapus: new Date().toISOString(), Dihapus_Oleh: "Super Admin (Massal)" }
              : f
          ),
        };
        setAppData(addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "HAPUS_FOTO_MASSAL", `Menghapus ${ids.length} foto`));
        showToast(`${ids.length} foto dihapus! 🗑️`, "success");
        setSelectedPhotoIds([]);
        setIsSelectMode(false);
        break;
      }
      case "EMPTY_RECYCLE_BIN": {
        const updated = { ...appData, Galeri: appData.Galeri.filter((f) => !f.Is_Deleted) };
        setAppData(addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "KOSONGKAN_RECYCLE_BIN", "Mengosongkan Recycle Bin"));
        showToast("Recycle Bin dikosongkan! ✅", "success");
        break;
      }
      case "SAVE_SETTINGS": {
        const updated = {
          ...appData,
          Settings: {
            ...appData.Settings,
            ContentAccess: { ...appData.Settings?.ContentAccess, ...settingsForm },
          },
        };
        setAppData(addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "UBAH_PENGATURAN_GALERI", "Memperbarui pengaturan galeri"));
        showToast("Pengaturan galeri disimpan! ⚙️", "success");
        break;
      }
    }

    setPinModalAction(null);
    setPinInput("");
    setConfirmNameInput("");
  };

  const handleSaveAlbum = (e: React.FormEvent) => {
    e.preventDefault();
    if (!albumForm.Nama_Album.trim()) {
      showToast("Nama album wajib diisi!", "error");
      return;
    }

    if (editingAlbum) {
      if (editingAlbum.Kategori_Akses !== albumForm.Kategori_Akses) {
        setAlbumVisWarning({ album: editingAlbum, newVis: albumForm.Kategori_Akses });
        return;
      }
      const updated = {
        ...appData,
        Album: appData.Album.map((a) =>
          a.ID_Album === editingAlbum.ID_Album
            ? { ...a, ...albumForm, Deskripsi: albumForm.Deskripsi.trim(), Nama_Album: albumForm.Nama_Album.trim() }
            : a
        ),
      };
      setAppData(addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "EDIT_ALBUM", `Memperbarui album "${albumForm.Nama_Album}"`));
      showToast("Info album diperbarui! ✏️", "success");
      setEditingAlbum(null);
    } else {
      // ✅ ID pakai full timestamp — tidak collision
      const newAlbumId = `ALB-${Date.now()}`;
      const newAlbum: AlbumItem = {
        ID_Album         : newAlbumId,
        Nama_Album       : albumForm.Nama_Album.trim(),
        Deskripsi        : albumForm.Deskripsi.trim(),
        Tanggal_Kegiatan : albumForm.Tanggal_Kegiatan,
        ID_Anggota_Buat  : "SA-001",
        Nama_Pembuat     : "Super Admin",
        Role_Pembuat     : "SUPER_ADMIN",
        Kategori_Akses   : albumForm.Kategori_Akses,
        Jumlah_Foto      : 0,
        Cover_URL        : albumForm.Cover_URL || "",
        Kategori_Kegiatan: albumForm.Kategori_Kegiatan,
        Tanggal_Dibuat   : new Date().toISOString().split("T")[0],
      };
      const updated = { ...appData, Album: [newAlbum, ...appData.Album] };
      setAppData(addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "BUAT_ALBUM", `Membuat album "${albumForm.Nama_Album}"`));
      showToast(`Album "${albumForm.Nama_Album}" dibuat! 📁`, "success");
      setUploadAlbumId(newAlbumId);
      setUploadVisibilitas(albumForm.Kategori_Akses);
      setIsCreateAlbumOpen(false);
    }

    setAlbumForm({
      Nama_Album: "", Deskripsi: "",
      Tanggal_Kegiatan: new Date().toISOString().split("T")[0],
      Kategori_Akses: "PUBLIK", Cover_URL: "", Kategori_Kegiatan: "Hari Besar",
    });
  };

  const handleApplyAlbumVisChange = (applyToPhotos: boolean) => {
    if (!albumVisWarning) return;
    const { album, newVis } = albumVisWarning;
    const updated = {
      ...appData,
      Album: appData.Album.map((a) =>
        a.ID_Album === album.ID_Album ? { ...a, Kategori_Akses: newVis } : a
      ),
      Galeri: applyToPhotos
        ? appData.Galeri.map((f) =>
            f.Album_ID === album.ID_Album ? { ...f, Kategori_Akses: newVis } : f
          )
        : appData.Galeri,
    };
    setAppData(addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "UBAH_VISIBILITAS_ALBUM", `Ubah visibilitas album "${album.Nama_Album}" ke ${newVis}`));
    showToast(`Visibilitas album diperbarui ke ${newVis}!`, "success");
    setAlbumVisWarning(null);
    setEditingAlbum(null);
  };

  const handleSelectFilesToUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file, index) => {
      const isVideo = file.type.startsWith("video/");
      const maxSize = isVideo ? 25 * 1024 * 1024 : settingsForm.maxFileSizeMB * 1024 * 1024;
      if (file.size > maxSize) {
        showToast(isVideo ? `Video ${file.name} melebihi batas 25MB!` : `File ${file.name} melebihi batas ${settingsForm.maxFileSizeMB} MB!`, "warning");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadFiles((prev) => [
          ...prev,
          {
            id     : `UPL-${Date.now()}-${index}`,
            url    : reader.result as string,
            title  : file.name.replace(/\.[^/.]+$/, ""),
            caption: "",
            sizeKB : Math.round(file.size / 1024),
            isVideo: isVideo,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleStartUpload = () => {
    if (uploadFiles.length === 0) {
      showToast("Pilih minimal satu foto!", "error");
      return;
    }

    let finalAlbumId = uploadAlbumId;

    if (showInlineCreateAlbum && inlineAlbumName.trim()) {
      const inlineId = `ALB-${Date.now()}`;   // ✅ Full timestamp
      const inlineAlbum: AlbumItem = {
        ID_Album         : inlineId,
        Nama_Album       : inlineAlbumName.trim(),
        Deskripsi        : "Album dibuat saat upload cepat",
        Tanggal_Kegiatan : new Date().toISOString().split("T")[0],
        ID_Anggota_Buat  : "SA-001",
        Nama_Pembuat     : "Super Admin",
        Role_Pembuat     : "SUPER_ADMIN",
        Kategori_Akses   : uploadVisibilitas,
        Jumlah_Foto      : uploadFiles.length,
        Cover_URL        : uploadFiles[0]?.url || "",
        Tanggal_Dibuat   : new Date().toISOString().split("T")[0],
      };
      setAppData((prev) => ({ ...prev, Album: [inlineAlbum, ...prev.Album] }));
      finalAlbumId = inlineId;
    }

    setIsUploadingProgress(true);
    setUploadProgressPercent(10);

    const interval = setInterval(() => {
      setUploadProgressPercent((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          finishUploadProcess(finalAlbumId);
          return 100;
        }
        return prev + 30;
      });
    }, 400);
  };

  const finishUploadProcess = (targetAlbumId: string) => {
    const ts = Date.now();
    const newItems: GaleriItem[] = uploadFiles.map((item, idx) => {
      let finalTitle = item.title;
      if (uploadTitleStrategy === "SAME" && uploadGlobalTitle.trim()) {
        finalTitle = uploadGlobalTitle.trim() + (uploadFiles.length > 1 ? ` (${idx + 1})` : "");
      }
      const isVideo = item.isVideo || item.url.startsWith("data:video/");
      return {
        // ✅ ID pakai full timestamp + idx — tidak collision
        ID              : `FTO-${ts}-${idx}`,
        ID_Foto         : `FTO-${ts}-${idx}`,
        Judul           : finalTitle,
        Judul_Kegiatan  : finalTitle,
        Foto_URL        : item.url,
        Link_Foto       : item.url,
        Album_ID        : targetAlbumId || totalAlbums[0]?.ID_Album || "",
        Tanggal         : new Date().toISOString().split("T")[0],
        Kategori        : "Kegiatan",
        Kategori_Akses  : uploadVisibilitas,
        ID_Anggota_Upload: "SA-001",
        Nama_Upload     : "Super Admin",
        Uploader        : "Super Admin",
        Role_Upload     : "SUPER_ADMIN",
        Caption         : uploadGlobalCaption.trim() || item.caption,
        Status_Approval : "DISETUJUI" as ApprovalStatus,
        Ukuran_KB       : item.sizeKB,
        Is_Video        : isVideo,
        Jenis_Media     : isVideo ? "VIDEO" : "FOTO",
      };
    });

    const updated = { ...appData, Galeri: [...newItems, ...appData.Galeri] };
    setAppData(addLogAkses(updated, "Super Admin", "SUPER_ADMIN", "UPLOAD_FOTO_MASSAL", `Mengunggah ${newItems.length} foto ke album ${getAlbumName(targetAlbumId)}`));

    newItems.forEach((item) => {
      sendMediaToTelegram(
        appData,
        item.Foto_URL || "",
        `📱 Remaja Legok 03 - Admin Upload (${item.Jenis_Media})\n📌 Judul: ${item.Judul_Kegiatan}\n👤 Uploader: Super Admin`,
        Boolean(item.Is_Video)
      );
    });

    setIsUploadingProgress(false);
    setUploadProgressPercent(0);
    setUploadFiles([]);
    setUploadGlobalTitle("");
    setUploadGlobalCaption("");
    setShowInlineCreateAlbum(false);
    setInlineAlbumName("");

    showToast(`Berhasil mengunggah ${newItems.length} foto! 📷`, "success");
    setActiveTab("semua_foto");
  };

  const generateWAShareText = (album: AlbumItem): string => {
    const text =
      `*DOKUMENTASI KEGIATAN REMAJA LEGOK 03*\n` +
      `📌 *Album:* ${album.Nama_Album}\n` +
      `📅 *Tanggal:* ${album.Tanggal_Kegiatan}\n` +
      `📝 *Keterangan:* ${album.Deskripsi}\n\n` +
      `Galeri kegiatan RT 03 Legok RW 04 Denokan. Buka aplikasi Remaja Legok 03 untuk foto selengkapnya! 📸✨`;
    return encodeURIComponent(text);
  };

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------
  return (
    <div className="space-y-6 text-slate-100 font-sans pb-16">

      {/* HEADER */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 p-5 rounded-3xl border border-amber-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold tracking-wider uppercase mb-1">
              <Shield size={16} /> Remaja Legok 03 • Akses Penuh Super Admin
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white">🖼️ Galeri Kegiatan Pemuda</h1>
            <p className="text-xs text-slate-300 mt-1">
              Pusat kendali dokumentasi RT 03 Legok RW 04 Denokan
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onBackToDashboard && (
              <button
                onClick={onBackToDashboard}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all"
              >
                <ArrowLeft size={15} /> Dashboard SA
              </button>
            )}
            <button
              onClick={() => setActiveTab("upload")}
              className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-lg dark:shadow-none flex items-center gap-2 transition-all"
            >
              <Plus size={16} /> Upload Foto Cepat
            </button>
            <button
              onClick={() => setIsRecycleBinOpen(true)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all"
            >
              <Trash2 size={15} className="text-rose-400" /> Sampah
              {deletedPhotos.length > 0 && (
                <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full">
                  {deletedPhotos.length}
                </span>
              )}
            </button>
            <button
              onClick={() => { setIsSlideshowOpen(true); setSlideshowIndex(0); }}
              className="px-3 py-2 bg-purple-900/60 hover:bg-purple-800/80 text-purple-200 text-xs font-bold rounded-xl border border-purple-700/50 flex items-center gap-1.5 transition-all"
            >
              <Play size={15} className="text-amber-300" /> Slideshow
            </button>
          </div>
        </div>

        {/* Statistik */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80">
          {[
            { icon: <ImageIcon size={20} />, color: "amber", label: "Total Foto",  value: activePhotos.length },
            { icon: <Layers    size={20} />, color: "emerald", label: "Total Album", value: totalAlbums.length  },
          ].map((stat) => (
            <div key={stat.label} className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800/80 flex items-center gap-3">
              <div className={`p-2.5 bg-${stat.color}-400/20 text-${stat.color}-400 rounded-xl`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">{stat.label}</p>
                <p className="text-lg font-black text-white">{stat.value}</p>
              </div>
            </div>
          ))}

          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800/80 flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-300 rounded-xl">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-[10px] text-amber-300 font-bold uppercase">Menunggu</p>
              <p className="text-lg font-black text-amber-300">{pendingPhotos.length} Foto</p>
            </div>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800/80">
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Rincian Akses</p>
            <div className="flex items-center gap-2 text-xs font-black">
              <span className="text-emerald-400">🌐 {countPublik}</span>
              <span className="text-blue-400">👥 {countAnggota}</span>
              <span className="text-purple-400">🔵 {countPengurus}</span>
            </div>
          </div>
        </div>
      </div>

      {/* TAB BAR */}
      <div className="flex overflow-x-auto gap-2 bg-slate-900 p-2 rounded-2xl border border-slate-800 shadow-xl dark:shadow-none scrollbar-none sticky top-2 z-20">
        {([
          { key: "semua_foto",  label: `🖼️ SEMUA FOTO (${activePhotos.length})`,      icon: <ImageIcon size={16} /> },
          { key: "kelola_album", label: `📁 KELOLA ALBUM (${totalAlbums.length})`,    icon: <Layers    size={16} /> },
          { key: "menunggu",    label: "⏳ MENUNGGU PERSETUJUAN",                     icon: <Clock     size={16} />, badge: pendingPhotos.length },
          { key: "upload",      label: "📤 UPLOAD FOTO",                              icon: <Plus      size={16} /> },
          { key: "pengaturan",  label: "⚙️ PENGATURAN GALERI",                        icon: <Settings  size={16} /> },
        ] as { key: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? "bg-amber-400 text-slate-950 shadow-lg dark:shadow-none"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            {tab.icon} {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full animate-pulse">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ================================================================= */}
      {/* TAB 1: SEMUA FOTO */}
      {/* ================================================================= */}
      {activeTab === "semua_foto" && (
        <div className="space-y-5">
          {/* Filter Panel */}
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  <Filter size={14} /> Visibilitas:
                </span>
                {[
                  { val: "ALL",      label: `Semua (${activePhotos.length})`, active: "bg-slate-100 text-slate-950", inactive: "bg-slate-800 text-slate-400" },
                  { val: "PUBLIK",   label: `🌐 Publik (${countPublik})`,    active: "bg-emerald-500 text-slate-950", inactive: "bg-slate-800 text-emerald-400" },
                  { val: "ANGGOTA",  label: `👥 Anggota (${countAnggota})`,  active: "bg-blue-500 text-slate-950",    inactive: "bg-slate-800 text-blue-400" },
                  { val: "PENGURUS", label: `🔵 Pengurus (${countPengurus})`,active: "bg-purple-500 text-white",      inactive: "bg-slate-800 text-purple-400" },
                ].map((f) => (
                  <button
                    key={f.val}
                    onClick={() => setFilterVisibilitas(f.val)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      filterVisibilitas === f.val ? f.active : f.inactive + " hover:bg-slate-700"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setIsSelectMode(!isSelectMode)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                    isSelectMode
                      ? "bg-amber-400 text-slate-950 font-black"
                      : "bg-slate-800 text-amber-300 hover:bg-slate-700 border border-amber-500/30"
                  }`}
                >
                  <CheckCheck size={15} /> {isSelectMode ? "Batal" : "Pilih Foto"}
                </button>

                <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                  {(["GRID_2", "LIST"] as ViewMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`p-1.5 rounded-lg text-xs transition-all ${
                        viewMode === mode ? "bg-amber-400 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {mode === "GRID_2" ? <Grid size={15} /> : <List size={15} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Dropdown filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-slate-800">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari foto, album, pengunggah..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <select
                value={filterAlbum}
                onChange={(e) => setFilterAlbum(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
              >
                <option value="ALL">📁 Semua Album</option>
                {totalAlbums.map((a) => (
                  <option key={a.ID_Album} value={a.ID_Album}>{a.Nama_Album}</option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
              >
                <option value="ALL">✅ Semua Status</option>
                <option value="DISETUJUI">✅ Disetujui</option>
                <option value="MENUNGGU">⏳ Menunggu</option>
                <option value="DITOLAK">❌ Ditolak</option>
              </select>

              {/* ✅ sortBy pakai SortBy type bukan as any */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
              >
                <option value="TERBARU">⏱️ Terbaru</option>
                <option value="TERLAMA">⌛ Terlama</option>
                <option value="ALBUM_AZ">🔤 Album A-Z</option>
                <option value="UPLOADER_AZ">👤 Pengunggah A-Z</option>
              </select>
            </div>
          </div>

          {/* Bulk Selection Bar */}
          {isSelectMode && (
            <div className="bg-amber-500/10 border border-amber-500/40 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (selectedPhotoIds.length === filteredPhotos.length) {
                      setSelectedPhotoIds([]);
                    } else {
                      setSelectedPhotoIds(filteredPhotos.map((f) => getPhotoId(f)));
                    }
                  }}
                  className="px-3 py-1.5 bg-amber-400 text-slate-950 font-black text-xs rounded-xl"
                >
                  {selectedPhotoIds.length === filteredPhotos.length ? "Batal Pilih Semua" : "Pilih Semua"}
                </button>
                <span className="text-xs font-bold text-amber-300">
                  Terpilih: {selectedPhotoIds.length} / {filteredPhotos.length}
                </span>
              </div>

              {selectedPhotoIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      filteredPhotos
                        .filter((f) => selectedPhotoIds.includes(getPhotoId(f)))
                        .forEach((p) => handleApprovePhoto(p));
                      setSelectedPhotoIds([]);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1"
                  >
                    <CheckCircle2 size={14} /> Setujui ({selectedPhotoIds.length})
                  </button>
                  <button
                    onClick={() => setPinModalAction({
                      type: "DELETE_BULK_PHOTOS",
                      title: `Hapus ${selectedPhotoIds.length} Foto`,
                      description: `Pindahkan ${selectedPhotoIds.length} foto ke Sampah?`,
                      payload: selectedPhotoIds,
                    })}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl flex items-center gap-1"
                  >
                    <Trash2 size={14} /> Hapus Terpilih
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Photo Grid / List */}
          {filteredPhotos.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
              <ImageIcon size={48} className="mx-auto text-slate-600" />
              <h3 className="text-base font-bold text-slate-300">Tidak ada foto ditemukan</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">Coba ubah kriteria filter di atas.</p>
            </div>
          ) : viewMode === "GRID_2" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {filteredPhotos.map((photo) => {
                const pId       = getPhotoId(photo);
                const isSelected = selectedPhotoIds.includes(pId);
                const vis        = photo.Kategori_Akses || "PUBLIK";
                const status     = photo.Status_Approval || "DISETUJUI";
                const fotoSrc   = photo.Foto_URL || photo.Link_Foto || "";

                return (
                  <div
                    key={pId}
                    className={`group bg-slate-900 rounded-2xl border transition-all overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? "border-amber-400 ring-2 ring-amber-400/50"
                        : "border-slate-800 hover:border-slate-700 shadow-md"
                    }`}
                  >
                    <div
                      className="aspect-square bg-slate-950 relative overflow-hidden cursor-pointer"
                      onClick={() => setLightboxPhoto(photo)}
                    >
                      {fotoSrc ? (
                        photo.Is_Video || photo.Jenis_Media === "VIDEO" || fotoSrc.startsWith("data:video/") ? (
                          <div className="w-full h-full relative bg-black flex items-center justify-center">
                            <video src={fotoSrc} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-xs shadow-lg">
                                ▶
                              </div>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={fotoSrc}
                            alt={photo.Judul || photo.Judul_Kegiatan}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        )
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                          Tidak ada media
                        </div>
                      )}

                      {isSelectMode && (
                        <div
                          className="absolute top-2 left-2 z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPhotoIds((prev) =>
                              isSelected ? prev.filter((id) => id !== pId) : [...prev, pId]
                            );
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-5 h-5 rounded accent-amber-400 cursor-pointer"
                          />
                        </div>
                      )}

                      <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase backdrop-blur-md shadow ${
                          vis === "PUBLIK"   ? "bg-emerald-500/90 text-slate-950" :
                          vis === "ANGGOTA"  ? "bg-blue-500/90 text-white" :
                                              "bg-purple-600/90 text-white"
                        }`}>
                          {vis === "PUBLIK" ? "🌐 Publik" : vis === "ANGGOTA" ? "👥 Anggota" : "🔵 Pengurus"}
                        </span>
                        {status === "MENUNGGU" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 animate-pulse">
                            ⏳ Menunggu
                          </span>
                        )}
                        {status === "DITOLAK" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white">
                            ❌ Ditolak
                          </span>
                        )}
                      </div>

                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent p-2.5 pt-6">
                        <p className="text-xs font-bold text-white line-clamp-1">
                          {photo.Judul || photo.Judul_Kegiatan}
                        </p>
                        <p className="text-[10px] text-amber-300/90 font-medium truncate">
                          📁 {getAlbumName(photo.Album_ID)}
                        </p>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-900 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                      <div className="truncate pr-1">
                        <p className="text-[10px] text-slate-300 font-bold truncate">
                          👤 {photo.Nama_Upload || photo.Uploader || "Anggota"}
                        </p>
                        <p className="text-[9px] text-slate-500">{photo.Tanggal}</p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {status === "MENUNGGU" && (
                          <button
                            onClick={() => handleApprovePhoto(photo)}
                            className="p-1 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 rounded-lg transition-all"
                            title="Setujui"
                          >
                            <Check size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => setMoveAlbumPhoto(photo)}
                          className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                          title="Pindah Album"
                        >
                          <ArrowLeftRight size={13} />
                        </button>
                        <button
                          onClick={() => setPinModalAction({
                            type: "DELETE_PHOTO",
                            title: "Hapus Foto",
                            description: `Pindahkan foto "${photo.Judul || photo.Judul_Kegiatan}" ke Recycle Bin?`,
                            payload: photo,
                          })}
                          className="p-1 bg-slate-800 hover:bg-rose-900/60 text-rose-400 rounded-lg"
                          title="Hapus"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPhotos.map((photo) => {
                const pId    = getPhotoId(photo);
                const vis    = photo.Kategori_Akses || "PUBLIK";
                const status = photo.Status_Approval || "DISETUJUI";

                return (
                  <div
                    key={pId}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <img
                        src={photo.Foto_URL || photo.Link_Foto || ""}
                        alt={photo.Judul || ""}
                        loading="lazy"
                        className="w-16 h-16 rounded-xl object-cover bg-slate-950 shrink-0 cursor-pointer"
                        onClick={() => setLightboxPhoto(photo)}
                      />
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-extrabold text-white truncate">
                            {photo.Judul || photo.Judul_Kegiatan}
                          </p>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            vis === "PUBLIK"  ? "bg-emerald-500/20 text-emerald-400" :
                            vis === "ANGGOTA" ? "bg-blue-500/20 text-blue-400" :
                                               "bg-purple-500/20 text-purple-300"
                          }`}>
                            {vis}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          📁 <span className="text-amber-300">{getAlbumName(photo.Album_ID)}</span> • 👤 {photo.Nama_Upload || photo.Uploader} • 📅 {photo.Tanggal}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {status === "MENUNGGU" && (
                        <button
                          onClick={() => handleApprovePhoto(photo)}
                          className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1"
                        >
                          <Check size={14} /> Setujui
                        </button>
                      )}
                      <button
                        onClick={() => setLightboxPhoto(photo)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => setMoveAlbumPhoto(photo)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl"
                      >
                        <ArrowLeftRight size={14} />
                      </button>
                      <button
                        onClick={() => setPinModalAction({
                          type: "DELETE_PHOTO",
                          title: "Hapus Foto",
                          description: `Pindahkan foto "${photo.Judul || photo.Judul_Kegiatan}" ke Recycle Bin?`,
                          payload: photo,
                        })}
                        className="p-2 bg-slate-800 hover:bg-rose-900/60 text-rose-400 rounded-xl"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 2: KELOLA ALBUM */}
      {/* ================================================================= */}
      {activeTab === "kelola_album" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                📁 Kelola Semua Album ({totalAlbums.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Atur album, ubah visibilitas, dan upload foto per kegiatan</p>
            </div>
            <button
              onClick={() => {
                setEditingAlbum(null);
                setAlbumForm({
                  Nama_Album: "", Deskripsi: "",
                  Tanggal_Kegiatan: new Date().toISOString().split("T")[0],
                  Kategori_Akses: "PUBLIK", Cover_URL: "", Kategori_Kegiatan: "Hari Besar",
                });
                setIsCreateAlbumOpen(true);
              }}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 shadow-md shrink-0"
            >
              <FolderPlus size={16} /> ➕ Buat Album Baru
            </button>
          </div>

          {selectedAlbumDetail ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <button
                  onClick={() => setSelectedAlbumDetail(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5"
                >
                  <ArrowLeft size={14} /> Kembali
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingAlbum(selectedAlbumDetail);
                      setAlbumForm({
                        Nama_Album       : selectedAlbumDetail.Nama_Album,
                        Deskripsi        : selectedAlbumDetail.Deskripsi,
                        Tanggal_Kegiatan : selectedAlbumDetail.Tanggal_Kegiatan,
                        Kategori_Akses   : selectedAlbumDetail.Kategori_Akses,
                        Cover_URL        : selectedAlbumDetail.Cover_URL || "",
                        Kategori_Kegiatan: selectedAlbumDetail.Kategori_Kegiatan || "Hari Besar",
                      });
                      setIsCreateAlbumOpen(true);
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold rounded-xl"
                  >
                    ✏️ Edit Album
                  </button>
                  <button
                    onClick={() => {
                      setUploadAlbumId(selectedAlbumDetail.ID_Album);
                      setUploadVisibilitas(selectedAlbumDetail.Kategori_Akses);
                      setActiveTab("upload");
                    }}
                    className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black rounded-xl flex items-center gap-1"
                  >
                    <Plus size={14} /> Upload ke Album Ini
                  </button>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 items-start bg-slate-950 p-4 rounded-2xl border border-slate-800">
                {selectedAlbumDetail.Cover_URL && (
                  <img
                    src={selectedAlbumDetail.Cover_URL}
                    alt={selectedAlbumDetail.Nama_Album}
                    className="w-full md:w-48 h-32 object-cover rounded-xl shrink-0"
                  />
                )}
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-white">{selectedAlbumDetail.Nama_Album}</h3>
                  <p className="text-xs text-slate-300">{selectedAlbumDetail.Deskripsi}</p>
                  <p className="text-[11px] text-slate-400 pt-1">
                    📅 {selectedAlbumDetail.Tanggal_Kegiatan} • 👤 {selectedAlbumDetail.Nama_Pembuat}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-slate-400 uppercase">
                  Foto dalam Album ({filteredPhotos.length})
                </h4>
                {filteredPhotos.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">Belum ada foto dalam album ini.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {filteredPhotos.map((photo) => (
                      <div
                        key={getPhotoId(photo)}
                        className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden group cursor-pointer"
                        onClick={() => setLightboxPhoto(photo)}
                      >
                        <div className="aspect-square relative">
                          <img
                            src={photo.Foto_URL || photo.Link_Foto || ""}
                            alt={photo.Judul || ""}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                            <Eye size={18} className="text-white" />
                          </div>
                        </div>
                        <div className="p-2">
                          <p className="text-[11px] font-bold text-white truncate">{photo.Judul}</p>
                          <p className="text-[9px] text-slate-400">{photo.Tanggal}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {totalAlbums.map((album) => {
                const albumPhotosCount = activePhotos.filter((f) => f.Album_ID === album.ID_Album).length;
                return (
                  <div
                    key={album.ID_Album}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden flex flex-col justify-between shadow-lg transition-all"
                  >
                    <div>
                      <div className="h-36 bg-slate-950 relative overflow-hidden">
                        {album.Cover_URL && (
                          <img
                            src={album.Cover_URL}
                            alt={album.Nama_Album}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/30" />
                        <div className="absolute top-2 right-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase backdrop-blur-md ${
                            album.Kategori_Akses === "PUBLIK"   ? "bg-emerald-500 text-slate-950" :
                            album.Kategori_Akses === "ANGGOTA"  ? "bg-blue-500 text-white" :
                                                                  "bg-purple-600 text-white"
                          }`}>
                            {album.Kategori_Akses}
                          </span>
                        </div>
                        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-white text-xs">
                          <span className="font-bold drop-shadow">📷 {albumPhotosCount} Foto</span>
                          <span className="text-[10px] text-slate-300 drop-shadow">📅 {album.Tanggal_Kegiatan}</span>
                        </div>
                      </div>

                      <div className="p-4 space-y-2">
                        <h3 className="text-base font-extrabold text-white line-clamp-1">{album.Nama_Album}</h3>
                        <p className="text-xs text-slate-400 line-clamp-2">{album.Deskripsi}</p>
                        <p className="text-[10px] text-slate-500 pt-1">
                          Pembuat: <span className="text-slate-300 font-bold">{album.Nama_Pembuat}</span>
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between gap-1 text-xs">
                      <button
                        onClick={() => setSelectedAlbumDetail(album)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl flex items-center gap-1 transition-all"
                      >
                        <Eye size={13} /> Buka Album
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingAlbum(album);
                            setAlbumForm({
                              Nama_Album: album.Nama_Album, Deskripsi: album.Deskripsi,
                              Tanggal_Kegiatan: album.Tanggal_Kegiatan, Kategori_Akses: album.Kategori_Akses,
                              Cover_URL: album.Cover_URL || "", Kategori_Kegiatan: album.Kategori_Kegiatan || "Hari Besar",
                            });
                            setIsCreateAlbumOpen(true);
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => { setShareAlbumItem(album); setIsShareModalOpen(true); }}
                          className="p-1.5 bg-slate-800 hover:bg-emerald-950 text-emerald-400 rounded-lg"
                        >
                          <Share2 size={13} />
                        </button>
                        <button
                          onClick={() => setPinModalAction({
                            type: "DELETE_ALBUM",
                            title: `Hapus Album "${album.Nama_Album}"`,
                            description: `PERINGATAN: Menghapus album ini akan memindahkan ${albumPhotosCount} foto ke Sampah.`,
                            payload: album,
                          })}
                          className="p-1.5 bg-slate-800 hover:bg-rose-900/60 text-rose-400 rounded-lg"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 3: MENUNGGU PERSETUJUAN */}
      {/* ================================================================= */}
      {activeTab === "menunggu" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div>
              <h2 className="text-base font-extrabold text-amber-300 flex items-center gap-2">
                ⏳ Foto Menunggu Persetujuan ({pendingPhotos.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Foto dari anggota memerlukan persetujuan sebelum tampil publik
              </p>
            </div>
            {pendingPhotos.length > 0 && (
              <button
                onClick={handleApproveAllPending}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 shadow-lg"
              >
                <CheckCircle2 size={16} /> Setujui Semua ({pendingPhotos.length})
              </button>
            )}
          </div>

          {pendingPhotos.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
              <CheckCircle2 size={48} className="mx-auto text-emerald-400" />
              <h3 className="text-base font-bold text-slate-200">Semua foto telah diproses 👍</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingPhotos.map((photo) => (
                <div
                  key={getPhotoId(photo)}
                  className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-lg"
                >
                  <div className="flex gap-3">
                    <img
                      src={photo.Foto_URL || photo.Link_Foto || ""}
                      alt={photo.Judul || ""}
                      loading="lazy"
                      className="w-28 h-28 object-cover rounded-xl bg-slate-950 shrink-0 cursor-pointer"
                      onClick={() => setLightboxPhoto(photo)}
                    />
                    <div className="space-y-1 min-w-0">
                      <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 text-[10px] font-black rounded-full">
                        ⏳ Menunggu Persetujuan
                      </span>
                      <h4 className="text-sm font-bold text-white truncate pt-1">
                        {photo.Judul || photo.Judul_Kegiatan}
                      </h4>
                      <p className="text-xs text-slate-300">
                        📁 <span className="text-amber-300">{getAlbumName(photo.Album_ID)}</span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        👤 <span className="text-white font-bold">{photo.Nama_Upload || photo.Uploader}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => setRejectingPhoto(photo)}
                      className="px-3 py-2 bg-rose-900/40 hover:bg-rose-800 text-rose-200 text-xs font-bold rounded-xl flex items-center gap-1"
                    >
                      <XCircle size={14} /> Tolak
                    </button>
                    <button
                      onClick={() => handleApprovePhoto(photo)}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black rounded-xl flex items-center gap-1 shadow-md"
                    >
                      <CheckCircle2 size={14} /> SETUJUI FOTO
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 4: UPLOAD FOTO */}
      {/* ================================================================= */}
      {activeTab === "upload" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">📤 Upload Foto Kegiatan</h2>
              <p className="text-xs text-slate-400">Foto yang Anda unggah otomatis disetujui</p>
            </div>
            <div className="bg-slate-950 px-3 py-1.5 rounded-2xl border border-slate-800 flex items-center gap-2">
              <PandawaLogo size={28} />
              <span className="text-xs font-bold text-amber-400">Remaja Legok 03</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Pilih Album Tujuan:</label>
              {!showInlineCreateAlbum ? (
                <div className="flex gap-2">
                  <select
                    value={uploadAlbumId}
                    onChange={(e) => setUploadAlbumId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="">-- Pilih Album --</option>
                    {totalAlbums.map((a) => (
                      <option key={a.ID_Album} value={a.ID_Album}>{a.Nama_Album} ({a.Kategori_Akses})</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowInlineCreateAlbum(true)}
                    className="px-3 py-2 bg-amber-400 text-slate-950 text-xs font-bold rounded-xl whitespace-nowrap"
                  >
                    + Album Baru
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nama Album Baru..."
                    value={inlineAlbumName}
                    onChange={(e) => setInlineAlbumName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <button
                    onClick={() => setShowInlineCreateAlbum(false)}
                    className="px-3 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl"
                  >
                    Batal
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Visibilitas Foto:</label>
              <select
                value={uploadVisibilitas}
                onChange={(e) => setUploadVisibilitas(e.target.value as ContentVisibility)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              >
                <option value="PUBLIK">🌐 PUBLIK</option>
                <option value="ANGGOTA">👥 ANGGOTA</option>
                <option value="PENGURUS">🔵 PENGURUS</option>
              </select>
            </div>
          </div>

          {/* File Picker */}
          <div className="border-2 border-dashed border-slate-700 hover:border-amber-400 rounded-2xl p-6 text-center space-y-3 transition-colors bg-slate-950/50">
            <ImageIcon size={40} className="mx-auto text-amber-400" />
            <p className="text-xs font-bold text-slate-200">Klik untuk memilih foto atau video</p>
            <p className="text-[10px] text-slate-500">JPG, PNG, WEBP, MP4, WEBM. Foto maks {settingsForm.maxFileSizeMB}MB, Video maks 25MB.</p>
            <label className="inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl cursor-pointer border border-slate-700">
              Pilih Media
              <input type="file" multiple accept="image/*,video/*" onChange={handleSelectFilesToUpload} className="hidden" />
            </label>
          </div>

          {uploadFiles.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-amber-300 uppercase">Media Dipilih ({uploadFiles.length})</h4>
                <button onClick={() => setUploadFiles([])} className="text-xs text-rose-400 hover:underline">Hapus Semua</button>
              </div>

              {uploadFiles.length > 1 && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                  <label className="text-xs font-bold text-slate-300 block">Strategi Judul:</label>
                  <div className="flex gap-3 text-xs">
                    {(["SAME", "AUTO"] as UploadStrategy[]).map((s) => (
                      <label key={s} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="strategy"
                          checked={uploadTitleStrategy === s}
                          onChange={() => setUploadTitleStrategy(s)}
                        />
                        {s === "SAME" ? "Gunakan Judul Sama" : "Dari Nama File"}
                      </label>
                    ))}
                  </div>
                  {uploadTitleStrategy === "SAME" && (
                    <input
                      type="text"
                      placeholder="Judul utama media..."
                      value={uploadGlobalTitle}
                      onChange={(e) => setUploadGlobalTitle(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {uploadFiles.map((item) => (
                  <div key={item.id} className="bg-slate-950 p-2 rounded-xl border border-slate-800 relative space-y-1">
                    {item.isVideo || item.url.startsWith("data:video/") ? (
                      <video src={item.url} className="w-full h-24 object-cover rounded-lg" />
                    ) : (
                      <img src={item.url} alt="preview" className="w-full h-24 object-cover rounded-lg" />
                    )}
                    <p className="text-[10px] text-slate-300 truncate font-bold">{item.title}</p>
                    <p className="text-[9px] text-slate-500">{item.sizeKB} KB {item.isVideo ? "• Video" : ""}</p>
                    <button
                      onClick={() => setUploadFiles((prev) => prev.filter((x) => x.id !== item.id))}
                      className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>

              {isUploadingProgress && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-amber-300 font-bold">
                    <span>Mengunggah...</span>
                    <span>{uploadProgressPercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 transition-all duration-300" style={{ width: `${uploadProgressPercent}%` }} />
                  </div>
                </div>
              )}

              <button
                onClick={handleStartUpload}
                disabled={isUploadingProgress}
                className="w-full py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-sm rounded-xl shadow-lg disabled:opacity-60 transition-all"
              >
                {isUploadingProgress ? "Proses Upload..." : `PROSES UNGGAH ${uploadFiles.length} FOTO`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 5: PENGATURAN */}
      {/* ================================================================= */}
      {activeTab === "pengaturan" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-white">⚙️ Kebijakan & Pengaturan Galeri</h2>
              <p className="text-xs text-slate-400">Atur izin unggah, batas file, dan persetujuan</p>
            </div>
            <button
              onClick={() => setPinModalAction({
                type: "SAVE_SETTINGS",
                title: "Simpan Pengaturan Galeri",
                description: "Masukkan PIN Super Admin untuk menyimpan perubahan.",
              })}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg"
            >
              💾 Simpan Pengaturan
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-black text-amber-300 uppercase tracking-wider">
                1. Izin & Persetujuan Upload
              </h3>
              <div>
                <label className="text-xs text-slate-300 block font-bold mb-1">Siapa Boleh Upload?</label>
                {/* ✅ Pakai FotoSiapaUpload type bukan as any */}
                <select
                  value={settingsForm.fotoSiapaUpload}
                  onChange={(e) => setSettingsForm({ ...settingsForm, fotoSiapaUpload: e.target.value as FotoSiapaUpload })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="SEMUA_ANGGOTA">Semua Anggota Ber-ID</option>
                  <option value="PENGURUS">Hanya Pengurus & Ketua</option>
                  <option value="KETUA">Hanya Ketua Pemuda</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsForm.fotoPerluApproval}
                  onChange={(e) => setSettingsForm({ ...settingsForm, fotoPerluApproval: e.target.checked })}
                  className="w-4 h-4 rounded accent-amber-400"
                />
                <span>Foto dari Anggota biasa harus disetujui Pengurus/SA</span>
              </label>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <HardDrive size={16} /> 2. Kuota Penyimpanan Google Drive
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between font-bold text-slate-300">
                  <span>Sisa Kuota Drive:</span>
                  <span className="text-emerald-400">14.2 GB / 15 GB</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[12%]" />
                </div>
                <p className="text-[10px] text-slate-500">
                  File tersimpan di Google Drive folder "Remaja Legok 03 / Galeri Kegiatan".
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* LIGHTBOX MODAL */}
      {/* ================================================================= */}
      {lightboxPhoto && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-lg flex flex-col justify-between p-4">
          <div className="flex items-center justify-between text-white border-b border-white/10 pb-3">
            <div>
              <p className="text-xs text-amber-400 font-bold">📁 {getAlbumName(lightboxPhoto.Album_ID)}</p>
              <h3 className="text-base font-black truncate max-w-md">
                {lightboxPhoto.Judul || lightboxPhoto.Judul_Kegiatan}
              </h3>
            </div>
            <button
              onClick={() => setLightboxPhoto(null)}
              aria-label="Tutup lightbox"
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center py-4">
            {lightboxPhoto.Is_Video || lightboxPhoto.Jenis_Media === "VIDEO" || (lightboxPhoto.Foto_URL || "").startsWith("data:video/") ? (
              <video
                src={lightboxPhoto.Foto_URL || lightboxPhoto.Link_Foto || ""}
                controls
                autoPlay
                className="max-h-[70vh] max-w-full object-contain rounded-2xl shadow-2xl"
              />
            ) : (
              <img
                src={lightboxPhoto.Foto_URL || lightboxPhoto.Link_Foto || ""}
                alt={lightboxPhoto.Judul || ""}
                className="max-h-[70vh] max-w-full object-contain rounded-2xl shadow-2xl"
              />
            )}
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl max-w-3xl mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <div>
              <p className="text-slate-300 italic">"{lightboxPhoto.Caption || "Tanpa deskripsi"}"</p>
              <p className="text-[10px] text-slate-400">
                👤 <span className="text-white font-bold">{lightboxPhoto.Nama_Upload || lightboxPhoto.Uploader}</span> • {lightboxPhoto.Tanggal}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={lightboxPhoto.Foto_URL || lightboxPhoto.Link_Foto || ""}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl flex items-center gap-1"
              >
                <Download size={14} /> Unduh
              </a>
              <button
                onClick={() => setPinModalAction({
                  type: "DELETE_PHOTO",
                  title: "Hapus Foto",
                  description: `Pindahkan foto "${lightboxPhoto.Judul}" ke Sampah?`,
                  payload: lightboxPhoto,
                })}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl flex items-center gap-1"
              >
                <Trash2 size={14} /> Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* PIN VERIFICATION MODAL */}
      {/* ================================================================= */}
      {pinModalAction && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between text-amber-400 border-b border-slate-800 pb-3">
              <h3 className="text-base font-black flex items-center gap-2">
                <Lock size={18} /> {pinModalAction.title}
              </h3>
              <button
                onClick={() => { setPinModalAction(null); setPinInput(""); setConfirmNameInput(""); }}
                aria-label="Tutup modal"
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-300">{pinModalAction.description}</p>

            {pinModalAction.type === "DELETE_ALBUM" && (
              <div className="space-y-1">
                <label className="text-[11px] text-amber-300 font-bold block">
                  Ketik nama album untuk konfirmasi:
                </label>
                <input
                  type="text"
                  placeholder={pinModalAction.payload?.Nama_Album}
                  value={confirmNameInput}
                  onChange={(e) => setConfirmNameInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">PIN Super Admin:</label>
              <PINField
                id="pin-sa-galeri-modal"
                value={pinInput}
                onChange={setPinInput}
                maxLength={8}
                placeholder="Masukkan 8 digit PIN SA..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setPinModalAction(null); setPinInput(""); setConfirmNameInput(""); }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handlePINModalExecute}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg"
              >
                Konfirmasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* RECYCLE BIN MODAL */}
      {/* ================================================================= */}
      {isRecycleBinOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between text-rose-400 border-b border-slate-800 pb-3 shrink-0">
              <h3 className="text-base font-black flex items-center gap-2">
                <Trash2 size={18} /> Recycle Bin ({deletedPhotos.length})
              </h3>
              <button onClick={() => setIsRecycleBinOpen(false)} aria-label="Tutup recycle bin" className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {deletedPhotos.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">Recycle Bin kosong.</div>
              ) : (
                deletedPhotos.map((photo) => (
                  <div
                    key={getPhotoId(photo)}
                    className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={photo.Foto_URL || photo.Link_Foto || ""}
                        alt="deleted"
                        className="w-12 h-12 rounded-xl object-cover"
                      />
                      <div>
                        <p className="text-xs font-bold text-white">{photo.Judul || photo.Judul_Kegiatan}</p>
                        <p className="text-[10px] text-slate-400">Dihapus oleh: {photo.Dihapus_Oleh || "Super Admin"}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRestorePhoto(photo)}
                      className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1 transition-all"
                    >
                      <RotateCcw size={14} /> Pulihkan
                    </button>
                  </div>
                ))
              )}
            </div>

            {deletedPhotos.length > 0 && (
              <div className="pt-3 border-t border-slate-800 flex justify-end shrink-0">
                <button
                  onClick={() => setPinModalAction({
                    type: "EMPTY_RECYCLE_BIN",
                    title: "Kosongkan Recycle Bin",
                    description: "PERINGATAN: Foto yang dihapus permanen tidak dapat dikembalikan!",
                  })}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl"
                >
                  🧹 Kosongkan Recycle Bin
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* REJECT REASON MODAL */}
      {/* ================================================================= */}
      {rejectingPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-black text-rose-400 flex items-center gap-2">
              <XCircle size={18} /> Alasan Penolakan Foto
            </h3>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">Pilih Alasan:</label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="Foto tidak sesuai kegiatan">Foto tidak sesuai kegiatan</option>
                <option value="Foto kurang pantas">Foto kurang pantas</option>
                <option value="Foto sudah ada yang sama">Foto sudah ada yang sama</option>
                <option value="Kualitas foto terlalu buruk">Kualitas foto terlalu buruk</option>
                <option value="Album tidak sesuai">Album tidak sesuai</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">Pesan Tambahan (Opsional):</label>
              <textarea
                placeholder="Tulis pesan untuk anggota..."
                value={rejectCustomNote}
                onChange={(e) => setRejectCustomNote(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white h-20"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectingPhoto(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmRejectPhoto}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl"
              >
                Konfirmasi Tolak
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* CREATE / EDIT ALBUM MODAL */}
      {/* ================================================================= */}
      {isCreateAlbumOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleSaveAlbum} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-amber-300">
                {editingAlbum ? "✏️ Edit Album" : "📁 Buat Album Baru"}
              </h3>
              <button type="button" onClick={() => setIsCreateAlbumOpen(false)} aria-label="Tutup" className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Nama Album *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kerja Bakti Agustus 2026"
                  value={albumForm.Nama_Album}
                  onChange={(e) => setAlbumForm({ ...albumForm, Nama_Album: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-300 mb-1">Deskripsi</label>
                <textarea
                  placeholder="Keterangan singkat..."
                  value={albumForm.Deskripsi}
                  onChange={(e) => setAlbumForm({ ...albumForm, Deskripsi: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white h-20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Tanggal Kegiatan</label>
                  <input
                    type="date"
                    value={albumForm.Tanggal_Kegiatan}
                    onChange={(e) => setAlbumForm({ ...albumForm, Tanggal_Kegiatan: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Visibilitas</label>
                  <select
                    value={albumForm.Kategori_Akses}
                    onChange={(e) => setAlbumForm({ ...albumForm, Kategori_Akses: e.target.value as ContentVisibility })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="PUBLIK">🌐 PUBLIK</option>
                    <option value="ANGGOTA">👥 ANGGOTA</option>
                    <option value="PENGURUS">🔵 PENGURUS</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreateAlbumOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg"
              >
                {editingAlbum ? "Simpan Perubahan" : "Buat Album"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================================================================= */}
      {/* SLIDESHOW MODAL */}
      {/* ================================================================= */}
      {isSlideshowOpen && filteredPhotos.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-4">
          <div className="flex justify-between items-center text-white z-10">
            <span className="text-xs font-bold text-amber-400">
              🎬 Slideshow ({slideshowIndex + 1}/{filteredPhotos.length})
            </span>
            <button
              onClick={() => setIsSlideshowOpen(false)}
              aria-label="Tutup slideshow"
              className="p-2 bg-white/10 rounded-full"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center">
            {filteredPhotos[slideshowIndex]?.Is_Video || filteredPhotos[slideshowIndex]?.Jenis_Media === "VIDEO" || (filteredPhotos[slideshowIndex]?.Foto_URL || "").startsWith("data:video/") ? (
              <video
                src={filteredPhotos[slideshowIndex]?.Foto_URL || filteredPhotos[slideshowIndex]?.Link_Foto || ""}
                controls
                autoPlay
                className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl transition-all duration-500"
              />
            ) : (
              <img
                src={filteredPhotos[slideshowIndex]?.Foto_URL || filteredPhotos[slideshowIndex]?.Link_Foto || ""}
                alt="slideshow"
                className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl transition-all duration-500"
              />
            )}
          </div>

          <div className="flex items-center justify-center gap-4 bg-slate-900/80 p-3 rounded-2xl max-w-sm mx-auto w-full z-10">
            <button
              onClick={() => setSlideshowIndex((prev) => (prev > 0 ? prev - 1 : filteredPhotos.length - 1))}
              className="p-2 bg-slate-800 text-white rounded-xl"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setIsSlideshowPlaying(!isSlideshowPlaying)}
              className="px-4 py-2 bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1"
            >
              {isSlideshowPlaying ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Play</>}
            </button>
            <button
              onClick={() => setSlideshowIndex((prev) => (prev < filteredPhotos.length - 1 ? prev + 1 : 0))}
              className="p-2 bg-slate-800 text-white rounded-xl"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* WHATSAPP SHARE MODAL */}
      {/* ================================================================= */}
      {isShareModalOpen && shareAlbumItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 text-emerald-400">
              <h3 className="text-base font-black flex items-center gap-2">
                <Share2 size={18} /> Bagikan Album ke WhatsApp
              </h3>
              <button onClick={() => setIsShareModalOpen(false)} aria-label="Tutup" className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap">
              {decodeURIComponent(generateWAShareText(shareAlbumItem))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(decodeURIComponent(generateWAShareText(shareAlbumItem)));
                  showToast("Teks berhasil disalin! 📋", "success");
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1"
              >
                <Copy size={14} /> Salin Teks
              </button>
              <a
                href={`https://wa.me/?text=${generateWAShareText(shareAlbumItem)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1 shadow-md"
              >
                <ExternalLink size={14} /> Buka WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* ALBUM VISIBILITY WARNING MODAL */}
      {/* ================================================================= */}
      {albumVisWarning && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-black text-amber-400">
              ⚠️ Ubah Visibilitas Album
            </h3>
            <p className="text-xs text-slate-300">
              Anda mengubah visibilitas album <strong className="text-white">"{albumVisWarning.album.Nama_Album}"</strong> dari{" "}
              <strong>{albumVisWarning.album.Kategori_Akses}</strong> ke{" "}
              <strong className="text-amber-300">{albumVisWarning.newVis}</strong>.
            </p>
            <p className="text-xs text-slate-400">
              Apakah Anda juga ingin menerapkan visibilitas baru ini ke semua foto di dalam album?
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => handleApplyAlbumVisChange(true)}
                className="w-full py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl"
              >
                Ya, Ubah Album + Semua Foto di Dalamnya
              </button>
              <button
                onClick={() => handleApplyAlbumVisChange(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl"
              >
                Hanya Ubah Album (Foto Tetap)
              </button>
              <button
                onClick={() => setAlbumVisWarning(null)}
                className="w-full py-2 text-slate-400 hover:text-white text-xs"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
