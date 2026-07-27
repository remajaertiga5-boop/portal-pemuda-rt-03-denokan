import React, { useState } from "react";
import {
  Users,
  Plus,
  User as UserIcon,
  Search,
  Phone,
  Camera,
  Save,
  X,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { AppData, addLogAkses, generateIdAnggotaUnik } from "../utils/dataStore";
import { useLocale } from "../hooks/useLocale";
import { compressImage, validateFile } from "../utils/imageUtils";
import { AnggotaItem, UserRole } from "../types";

// ----------------------------------------------------------
// TYPES
// ----------------------------------------------------------
interface AnggotaProps {
  appData: AppData;
  setAppData: React.Dispatch<React.SetStateAction<AppData>>;
  userRole: UserRole;
  currentUserId?: string;
  showToast: (
    msg: string,
    type: "success" | "error" | "info" | "warning"
  ) => void;
}

// ----------------------------------------------------------
// COMPONENT
// ----------------------------------------------------------
export default function Anggota({
  appData,
  setAppData,
  userRole,
  showToast,
}: AnggotaProps) {
  const { t } = useLocale();
  const [showForm, setShowForm]               = useState(false);
  const [filterAktifOnly, setFilterAktifOnly] = useState(false);
  const [searchQuery, setSearchQuery]         = useState("");

  // Modal State
  const [selectedMember, setSelectedMember]     = useState<AnggotaItem | null>(null);
  const [editProfileData, setEditProfileData]   = useState<AnggotaItem | null>(null);

  // Form State - anggota baru
  const [nama, setNama]         = useState("");
  const [panggilan, setPanggilan] = useState("");
  const [nohp, setNohp]         = useState("");
  const [jk, setJk]             = useState("Laki-laki");
  const [tglLahir, setTglLahir] = useState("2005-01-01");
  const [minat, setMinat]       = useState("");

  // ----------------------------------------------------------
  // DATA
  // ----------------------------------------------------------
  const anggotaList = appData.Anggota || [];

  const isPengurus =
    userRole === "PENGURUS" ||
    userRole === "ADMIN"    ||
    userRole === "SUPER_ADMIN";

  // Filter anggota
  const filteredAnggota = anggotaList.filter((a) => {
    if (a.Status_Tampil === "ARSIP") return false;
    if (filterAktifOnly && a.Status_Aktif !== "AKTIF") return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.Nama_Lengkap.toLowerCase().includes(q) ||
      (a.Nama_Panggilan || "").toLowerCase().includes(q) ||
      a.ID_Anggota.toLowerCase().includes(q)
    );
  });

  const totalTampil = anggotaList.filter(
    (a) => a.Status_Tampil === "TAMPIL"
  ).length;

  // ----------------------------------------------------------
  // HELPER - Reset form
  // ----------------------------------------------------------
  const resetForm = () => {
    setNama("");
    setPanggilan("");
    setNohp("");
    setJk("Laki-laki");
    setTglLahir("2005-01-01");
    setMinat("");
  };

  // ----------------------------------------------------------
  // 15. Lihat Profil
  // ----------------------------------------------------------
  const handleLihatProfil = (member: AnggotaItem) => {
    setSelectedMember(member);
    setEditProfileData({ ...member });
  };

  // ----------------------------------------------------------
  // 16. Hubungi via WA
  // ----------------------------------------------------------
  const handleHubungiWa = (noHp: string, name: string) => {
    if (!noHp || noHp.trim() === "" || noHp === "Disembunyikan") {
      showToast("Nomor HP belum diisi atau disembunyikan!", "warning");
      return;
    }
    const formatted = noHp.replace(/^0/, "62").replace(/[^0-9]/g, "");
    if (formatted.length < 10) {
      showToast("Format nomor HP tidak valid!", "warning");
      return;
    }
    window.open(
      `https://wa.me/${formatted}?text=Halo%20${encodeURIComponent(name)},%20salam%20dari%20Remaja%20Legok%2003!`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  // ----------------------------------------------------------
  // 8. Ganti Foto Profil
  // ----------------------------------------------------------
  const handleGantiFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editProfileData) return;

    const validation = validateFile(file, 2);
    if (!validation.valid) {
      showToast(validation.error || "File tidak valid!", "error");
      return;
    }

    try {
      showToast("Mengompres foto...", "info");
      const compressed = await compressImage(file, {
        maxWidth: 400, maxHeight: 400, quality: 0.7, maxSizeMB: 0.2
      });

      // Gunakan compressed data URL langsung
      const finalUrl = compressed.dataUrl;

      setEditProfileData({
        ...editProfileData,
        Foto_Profil: finalUrl,
      });
      showToast("Foto profil diperbarui ✅", "success"
      );
    } catch {
      // Fallback: baca tanpa kompres
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditProfileData({ ...editProfileData, Foto_Profil: reader.result as string });
        showToast("Foto profil diperbarui (pratinjau)!", "info");
      };
      reader.readAsDataURL(file);
    }
  };

  // ----------------------------------------------------------
  // 9. Simpan Perubahan Profil
  // ----------------------------------------------------------
  const handleSimpanProfil = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProfileData) return;

    if (!editProfileData.Nama_Lengkap.trim()) {
      showToast("Nama lengkap tidak boleh kosong!", "error");
      return;
    }

    const updatedAnggota = appData.Anggota.map((a) =>
      a.ID_Anggota === editProfileData.ID_Anggota ? editProfileData : a
    );

    const updated    = { ...appData, Anggota: updatedAnggota };
    const loggedData = addLogAkses(
      updated,
      editProfileData.Nama_Lengkap,
      userRole,
      "UPDATE_PROFIL",
      `Memperbarui profil ${editProfileData.ID_Anggota}`
    );

    setAppData(loggedData);
    setSelectedMember(editProfileData);
    showToast("Data profil berhasil disimpan!", "success");
  };

  // ----------------------------------------------------------
  // 10. Batal Edit Profil
  // ----------------------------------------------------------
  const handleBatalEditProfil = () => {
    if (selectedMember) {
      setEditProfileData({ ...selectedMember });
    }
    showToast("Perubahan dibatalkan.", "info");
  };

  // ----------------------------------------------------------
  // Registrasi Anggota Baru
  // ----------------------------------------------------------
  const handleRegisterNewMember = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nama.trim() || !panggilan.trim()) {
      showToast("Nama lengkap dan nama panggilan wajib diisi!", "error");
      return;
    }

    // ✅ ID 10 angka acak unik dari seluruh riwayat data
    const nextId    = generateIdAnggotaUnik(appData.Anggota, appData);
    const newMember: AnggotaItem = {
      ID_Anggota        : nextId,
      Nama_Lengkap      : nama.trim(),
      Nama_Panggilan    : panggilan.trim(),
      Alamat            : appData.Settings?.Alamat_Komunitas || "",
      No_HP             : nohp.trim() || "",   // ✅ Simpan kosong bukan nomor palsu
      Jenis_Kelamin     : jk,
      Tanggal_Lahir     : tglLahir,
      Minat_Bakat       : minat.trim(),
      Tanggal_Daftar    : new Date().toISOString().split("T")[0],
      Status_Aktif      : "AKTIF",
      Status_Tampil     : "TAMPIL",
      Izin_NoHP         : true,
      Izin_TanggalLahir : true,
      Izin_Minat        : true,
    };

    const updated    = { ...appData, Anggota: [newMember, ...appData.Anggota] };
    const loggedData = addLogAkses(
      updated,
      nama,
      userRole,
      "DAFTAR_ANGGOTA",
      `Mendaftarkan anggota baru (${nextId})`
    );

    setAppData(loggedData);
    showToast(`Anggota ${nama} berhasil terdaftar! ID: ${nextId}`, "success");

    setShowForm(false);
    resetForm();
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
            <Users className="text-emerald-600" /> Halaman Anggota
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Menampilkan {filteredAnggota.length} dari {totalTampil} anggota terdaftar.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* 17. Toggle Filter Aktif */}
          <button
            onClick={() => setFilterAktifOnly(!filterAktifOnly)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
              filterAktifOnly
                ? "bg-emerald-600 text-white border-emerald-600 shadow-md dark:shadow-none"
                : "bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {filterAktifOnly ? "✅ Hanya Aktif" : "👥 Semua Anggota"}
          </button>

          {/* Tambah Anggota — hanya pengurus ke atas */}
          {isPengurus && (
            <button
              onClick={() => {
                if (showForm) resetForm();
                setShowForm(!showForm);
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md dark:shadow-none transition-all"
            >
              {showForm ? "Batal Tambah" : <><Plus size={16} /> Tambah Anggota</>}
            </button>
          )}
        </div>
      </div>

      {/* 14. Search Bar */}
      <div className="relative">
        <Search
          className="absolute left-4 top-3.5 text-slate-400 dark:text-slate-500"
          size={18}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="🔍 Cari anggota berdasarkan nama atau ID..."
          className="w-full pl-11 pr-10 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm dark:shadow-none"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            aria-label="Hapus pencarian"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Form Tambah Anggota */}
      {showForm && (
        <form
          onSubmit={handleRegisterNewMember}
          className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-emerald-200 shadow-md dark:shadow-none space-y-4"
        >
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
            Tambah Anggota Baru
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nama Lengkap *
              </label>
              <input
                required
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Rian Ardianto"
                className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nama Panggilan *
              </label>
              <input
                required
                type="text"
                value={panggilan}
                onChange={(e) => setPanggilan(e.target.value)}
                placeholder="Rian"
                className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                No WhatsApp
              </label>
              <input
                type="text"
                value={nohp}
                onChange={(e) => setNohp(e.target.value)}
                placeholder="081234567890 (opsional)"
                className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Jenis Kelamin
              </label>
              <select
                value={jk}
                onChange={(e) => setJk(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Lahir
              </label>
              <input
                type="date"
                value={tglLahir}
                onChange={(e) => setTglLahir(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Minat & Bakat
              </label>
              <input
                type="text"
                value={minat}
                onChange={(e) => setMinat(e.target.value)}
                placeholder="Musik, Futsal, IT"
                className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md dark:shadow-none transition-all text-sm"
          >
            💾 Simpan Data Anggota
          </button>
        </form>
      )}

      {/* Grid Anggota */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAnggota.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-slate-900 p-12 text-center rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 space-y-2">
            <p className="font-bold text-slate-700 dark:text-slate-300">
              Tidak ditemukan
            </p>
            <p className="text-xs">
              Tidak ada data anggota yang cocok dengan kata kunci pencarian Anda.
            </p>
          </div>
        ) : (
          filteredAnggota.map((item) => (
            <div
              key={item.ID_Anggota}
              className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Avatar & Nama */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                    {item.Foto_Profil ? (
                      <img
                        src={item.Foto_Profil}
                        alt={item.Nama_Lengkap}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserIcon className="text-slate-400 dark:text-slate-500" size={24} />
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <div className="font-extrabold text-slate-900 dark:text-slate-100 text-base truncate">
                      {item.Nama_Lengkap}
                    </div>
                    <div className="font-mono text-xs font-bold text-emerald-700">
                      {item.ID_Anggota}
                    </div>
                  </div>
                </div>

                {/* Info Singkat */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl space-y-1.5 text-xs text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800 mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400 dark:text-slate-500">No HP:</span>
                    <span className="font-medium">
                      {item.Izin_NoHP !== false
                        ? item.No_HP || "-"
                        : "🔒 Disembunyikan"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 dark:text-slate-500">Minat:</span>
                    <span className="font-medium">
                      {item.Izin_Minat !== false
                        ? item.Minat_Bakat || "-"
                        : "🔒 Disembunyikan"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {/* 15. Lihat Profil */}
                <button
                  onClick={() => handleLihatProfil(item)}
                  className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex justify-center items-center gap-1"
                >
                  <UserIcon size={14} /> Lihat Profil
                </button>

                {/* 16. Hubungi via WA */}
                <button
                  onClick={() =>
                    handleHubungiWa(
                      item.Izin_NoHP !== false ? item.No_HP || "" : "",
                      item.Nama_Lengkap
                    )
                  }
                  className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex justify-center items-center gap-1 shadow-sm dark:shadow-none"
                >
                  <Phone size={14} /> WA
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 15. Modal Profil & Edit */}
      {selectedMember && editProfileData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          {/* ✅ Hapus overflow-hidden yang conflict dengan overflow-y-auto */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-5 animate-in zoom-in-95 duration-200">

            {/* Header Modal */}
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="font-black text-slate-900 dark:text-slate-100 text-xl">
                  Profil Anggota
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {editProfileData.ID_Anggota}
                </p>
              </div>
              <button
                onClick={() => setSelectedMember(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                aria-label="Tutup profil"
              >
                <X size={20} />
              </button>
            </div>

            {/* Avatar & 8. Ganti Foto */}
            <div className="flex flex-col items-center justify-center text-center space-y-2">
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-emerald-100 shadow-md dark:shadow-none bg-slate-100 dark:bg-slate-800 group">
                {editProfileData.Foto_Profil ? (
                  <img
                    src={editProfileData.Foto_Profil}
                    alt="Foto Profil"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-full h-full p-6 text-slate-300" />
                )}
                <label className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white text-xs font-bold">
                  <Camera size={18} className="mr-1" /> Ganti
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleGantiFoto}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Maks. 2MB · JPG, PNG, WebP
              </p>
            </div>

            {/* Form Edit Profil */}
            <form onSubmit={handleSimpanProfil} className="space-y-4 text-xs">
              {/* Nama Lengkap */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap
                </label>
                <input
                  required
                  type="text"
                  value={editProfileData.Nama_Lengkap}
                  onChange={(e) =>
                    setEditProfileData({
                      ...editProfileData,
                      Nama_Lengkap: e.target.value,
                    })
                  }
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Nama Panggilan */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Panggilan
                  </label>
                  <input
                    type="text"
                    value={editProfileData.Nama_Panggilan || ""}
                    onChange={(e) =>
                      setEditProfileData({
                        ...editProfileData,
                        Nama_Panggilan: e.target.value,
                      })
                    }
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* No HP */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nomor HP / WA
                  </label>
                  <input
                    type="text"
                    value={editProfileData.No_HP || ""}
                    onChange={(e) =>
                      setEditProfileData({
                        ...editProfileData,
                        No_HP: e.target.value,
                      })
                    }
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Minat Bakat */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Minat & Bakat
                </label>
                <input
                  type="text"
                  value={editProfileData.Minat_Bakat || ""}
                  onChange={(e) =>
                    setEditProfileData({
                      ...editProfileData,
                      Minat_Bakat: e.target.value,
                    })
                  }
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Pengaturan Privasi 11, 12, 13 */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  Pengaturan Privasi Profil
                </div>

                {/* 11. Toggle No HP */}
                <div className="flex items-center justify-between">
                  <span>Tampilkan No HP ke publik</span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditProfileData({
                        ...editProfileData,
                        Izin_NoHP: !editProfileData.Izin_NoHP,
                      })
                    }
                    className="text-emerald-600 focus:outline-none"
                    aria-label="Toggle izin No HP"
                  >
                    {editProfileData.Izin_NoHP !== false ? (
                      <ToggleRight size={28} />
                    ) : (
                      <ToggleLeft size={28} className="text-slate-400 dark:text-slate-500" />
                    )}
                  </button>
                </div>

                {/* 12. Toggle Tanggal Lahir */}
                <div className="flex items-center justify-between">
                  <span>Tampilkan Tanggal Lahir</span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditProfileData({
                        ...editProfileData,
                        Izin_TanggalLahir: !editProfileData.Izin_TanggalLahir,
                      })
                    }
                    className="text-emerald-600 focus:outline-none"
                    aria-label="Toggle izin Tanggal Lahir"
                  >
                    {editProfileData.Izin_TanggalLahir !== false ? (
                      <ToggleRight size={28} />
                    ) : (
                      <ToggleLeft size={28} className="text-slate-400 dark:text-slate-500" />
                    )}
                  </button>
                </div>

                {/* 13. Toggle Minat */}
                <div className="flex items-center justify-between">
                  <span>Tampilkan Minat / Bakat</span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditProfileData({
                        ...editProfileData,
                        Izin_Minat: !editProfileData.Izin_Minat,
                      })
                    }
                    className="text-emerald-600 focus:outline-none"
                    aria-label="Toggle izin Minat"
                  >
                    {editProfileData.Izin_Minat !== false ? (
                      <ToggleRight size={28} />
                    ) : (
                      <ToggleLeft size={28} className="text-slate-400 dark:text-slate-500" />
                    )}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                {/* 10. Batal */}
                <button
                  type="button"
                  onClick={handleBatalEditProfil}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-all"
                >
                  Batal
                </button>

                {/* 9. Simpan */}
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-md dark:shadow-none flex justify-center items-center gap-1"
                >
                  <Save size={16} /> 💾 Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
