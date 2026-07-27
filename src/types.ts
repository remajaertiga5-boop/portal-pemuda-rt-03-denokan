export type UserRole = 
  | "TAMU" 
  | "ANGGOTA" 
  | "HUMAS"
  | "KEPALA_HUMAS" 
  | "BENDAHARA"
  | "WAKIL_BENDAHARA" 
  | "SEKRETARIS"
  | "WAKIL_SEKRETARIS" 
  | "WAKIL_KETUA"
  | "KETUA" 
  | "PENGURUS" 
  | "ADMIN" 
  | "SUPER_ADMIN";

export interface AuthSession {
  role: UserRole;
  id_anggota?: string;
  nama_lengkap?: string;
  nama_panggilan?: string;
  jabatan?: string;
  timestamp: number;
  rememberMe?: boolean;
}

export interface AnggotaItem {
  ID_Anggota: string;
  Nama_Lengkap: string;
  Nama_Panggilan?: string;
  Email?: string;
  Jabatan?: string;
  Alamat?: string;
  No_HP?: string;
  NoWA?: string;
  TampilkanWA?: "Ya" | "Tidak" | string;
  Jenis_Kelamin?: string;
  Tempat_Lahir?: string;
  Tanggal_Lahir?: string;
  Minat_Bakat?: string;
  Foto_Profil?: string;
  FotoProfilURL?: string;
  PasswordHash?: string;
  StatusPassword?: "BelumDiatur" | "SudahDiatur" | string;
  Role?: UserRole | string;
  Status_Jabatan?: "Aktif" | "Kosong" | "Nonaktif" | string;
  Dibuat_Oleh?: string;
  Tanggal_Daftar?: string;
  Tanggal_Menjabat?: string;
  Status_Aktif?: "AKTIF" | "NONAKTIF" | string;
  Status_Tampil?: "TAMPIL" | "ARSIP" | string;
  Diarsip_Oleh?: string;
  Tanggal_Arsip?: string;
  Bio?: string;
  Terakhir_Diubah?: string;
  Izin_NoHP?: boolean;
  Izin_TanggalLahir?: boolean;
  Izin_Minat?: boolean;
}

export interface KasItem {
  id?: string;
  ID?: string;
  Nomor_Bukti?: string;
  Tanggal: string;
  Jenis?: "Pemasukan" | "Pengeluaran" | "Masuk" | "Keluar" | string;
  Nominal?: number;
  Jumlah?: number;
  Pemasukan?: number;
  Pengeluaran?: number;
  Saldo?: number;
  Kategori?: string;
  Sub_Kategori?: string;
  Keterangan: string;
  Petugas?: string;
  ID_Petugas?: string;
  DicatatOleh?: string;
  Metode_Bayar?: "Tunai" | "Transfer" | "QRIS" | string;
  Bukti_Nota?: string;
  ID_Anggota?: string;
  Nama_Anggota?: string;
  Status?: "DISETUJUI" | "MENUNGGU_APPROVAL" | "DITOLAK" | "DIHAPUS" | "LUNAS";
  Approval_By?: string;
  Alasan_Tolak?: string;
  Alasan_Hapus?: string;
  Catatan?: string;
  Waktu_Input?: string;
  Waktu_Edit?: string;
}

export interface KasWajibItem {
  ID: string;
  IDAnggota: string;
  Bulan: string;
  Jumlah: number;
  TanggalSetor: string;
  DicatatOleh: string;
}

export interface IuranItem {
  id?: string;
  ID?: string;
  ID_Anggota: string;
  Nama_Anggota: string;
  Bulan: string;
  Tahun: number | string;
  Jumlah?: number;
  Nominal?: number;
  Status: "LUNAS" | "BELUM_BAYAR" | "CICIL" | "DIBEBASKAN" | "MENUNGGU_KONFIRMASI";
  Tanggal_Bayar?: string;
  Penerima?: string;
  Metode_Bayar?: "Tunai" | "Transfer" | "QRIS" | string;
  Nomor_Bukti?: string;
  Catatan?: string;
  Bukti_Transfer?: string;
  Alasan_Bebas?: string;
  Nominal_Cicil?: number;
}

export interface AbsensiItem {
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

export type ContentVisibility = "PUBLIK" | "ANGGOTA" | "PENGURUS";

export interface JabatanKasPermission {
  jabatan: string;
  bisaInputMasuk: boolean;
  bisaInputKeluar: boolean;
  bisaLihatDetail: boolean;
  bisaLihatIuran: boolean;
  bisaHapus: boolean;
  bisaExport: boolean;
  maxNominalInput: number;
}

export interface KasAccessSettings {
  kasSaldoVisibilitas?: "SEMUA_ANGGOTA" | "PENGURUS_SAJA" | "KETUA_BENDAHARA_SAJA";
  kasDetailVisibilitas?: "BENDAHARA_KETUA_SAJA" | "PENGURUS_SAJA" | "SEMUA_ANGGOTA";
  kasIuranVisibilitas?: "PENGURUS_SAJA" | "BENDAHARA_KETUA_SAJA" | "SEMUA_ANGGOTA";
  jabatanPermissions?: JabatanKasPermission[];
  notifJatuhTempo?: boolean;
  notifIuranLunas?: boolean;
  notifPengeluaran?: boolean;
  notifSaldoMenipis?: boolean;
}

export interface ContentAccessSettings {
  pengumumanDefaultVisibilitas?: "TANYA" | "PUBLIK" | "ANGGOTA";
  pengumumanSiapaBuat?: "PENGURUS" | "KETUA" | "SEMUA_ANGGOTA";
  agendaDefaultVisibilitas?: "TANYA" | "PUBLIK" | "ANGGOTA";
  agendaSiapaBuat?: "PENGURUS" | "KETUA" | "SEMUA_ANGGOTA";
  fotoDefaultVisibilitas?: "TANYA" | "PUBLIK" | "ANGGOTA";
  fotoSiapaUpload?: "SEMUA_ANGGOTA" | "PENGURUS" | "KETUA";
  fotoPerluApproval?: boolean;
  fotoPengurusPerluApproval?: boolean;
  maxFileSizeMB?: number;
  allowedFormats?: string[];
  maxBatchUploadCount?: number;
  enableRecycleBin?: boolean;
  recycleBinDays?: number;
  defaultGalleryLayout?: "GRID_2" | "GRID_3" | "LIST";
  showUploaderInPublic?: boolean;
  showPhotoCountInAlbum?: boolean;
  whoCanDeletePhotos?: "SUPER_ADMIN" | "PENGURUS" | "ANGGOTA_SENDIRI";
  requireDeleteConfirm?: boolean;
  albumDefaultVisibilitas?: "TANYA" | "PUBLIK" | "ANGGOTA";
}

export interface AgendaItem {
  ID: string;
  Tanggal: string;
  Waktu: string;
  "Nama Kegiatan": string;
  Lokasi: string;
  Kategori?: string;
  Keterangan: string;
  Visibilitas?: ContentVisibility;
}

export interface PengumumanItem {
  ID: string;
  Tanggal: string;
  Judul: string;
  Isi: string;
  Penulis?: string;
  Pembuat?: string;
  Kategori?: "Penting" | "Kegiatan" | "Umum" | string;
  LampiranURL?: string;
  DibroadcastKeTelegram?: boolean;
  isPenting?: boolean;
  Visibilitas?: ContentVisibility;
}

export interface AspirasiItem {
  ID: string;
  Tanggal: string;
  Usulan?: string;
  Isi?: string;
  Pengirim: string;
  ID_Anggota?: string;
  Kategori?: string;
  Likes?: number;
  Jumlah_Dukung?: number;
  SudahDukungBy?: string[];
  LikedByDevice?: string[];
  Status: "MENUNGGU" | "DISETUJUI" | "DITOLAK" | "PROSES" | "SELESAI";
  Tanggapan?: string;
  Tanggapan_Oleh?: string;
  Tanggal_Tanggapan?: string;
}

export interface AlbumItem {
  ID_Album: string;
  Nama_Album: string;
  Deskripsi: string;
  Tanggal_Kegiatan: string;
  ID_Anggota_Buat: string;
  Nama_Pembuat: string;
  Role_Pembuat: UserRole;
  Kategori_Akses: "PUBLIK" | "ANGGOTA" | "PENGURUS";
  Jumlah_Foto: number;
  Cover_URL?: string;
  Kategori_Kegiatan?: "Rapat" | "Kerja Bakti" | "Olahraga" | "Hari Besar" | "Sosial" | "Seni" | "Lainnya" | string;
  Tanggal_Dibuat?: string;
}

export interface FotoItem {
  ID_Foto?: string;
  ID?: string;
  Judul?: string;
  Judul_Kegiatan?: string;
  Link_Foto?: string;
  Foto_URL?: string;
  Album_ID?: string;
  Tanggal: string;
  Kategori?: string;
  Kategori_Akses?: ContentVisibility;
  ID_Anggota_Upload?: string;
  Nama_Upload?: string;
  Uploader?: string;
  Role_Upload?: UserRole;
  Caption?: string;
  Deskripsi?: string;
  Status_Approval?: "DISETUJUI" | "MENUNGGU" | "DITOLAK";
  Alasan_Penolakan?: string;
  Pesan_Penolakan?: string;
  Tanggal_Approval?: string;
  Approved_By?: string;
  Is_Deleted?: boolean;
  Tanggal_Dihapus?: string;
  Dihapus_Oleh?: string;
  Ukuran_KB?: number;
  Is_Video?: boolean;
  Jenis_Media?: "FOTO" | "VIDEO";
}

export interface GaleriItem extends FotoItem {}

export interface LogAksesItem {
  id: string;
  Waktu: string;
  ID_Anggota: string;
  Nama: string;
  Role: UserRole;
  Aksi: string;
  Detail: string;
}

export interface JabatanHistoryItem {
  id: string;
  Tanggal: string;
  Nama_Ketua: string;
  ID_Ketua: string;
  Ditunjuk_Oleh: string;
  Status: "AKTIF" | "DEMISIONER";
}

export interface JabatanConfig {
  Ketua?: { ID_Anggota: string; Nama: string; Tanggal_Mulai?: string };
  Wakil?: { ID_Anggota: string; Nama: string };
  Sekretaris?: { ID_Anggota: string; Nama: string }[];
  Bendahara?: { ID_Anggota: string; Nama: string }[];
  Pengurus?: { ID_Anggota: string; Nama: string; Jabatan: string }[];
}

export interface SystemSettings {
  Nama_Komunitas: string;
  Alamat_Komunitas: string;
  Deskripsi_Komunitas: string;
  Logo_URL: string;
  Banner_URL: string;
  Fitur_AI_Aktif: boolean;
  Fitur_Kas_Aktif: boolean;
  Nominal_Iuran: number;
  Jatuh_Tempo_Iuran?: number;
  Enable_Denda?: boolean;
  Nominal_Denda?: number;
  Enable_Reminder_H3?: boolean;
  Enable_Reminder_H7?: boolean;
  Enable_Laporan_Ketua?: boolean;
  Sekretaris_Bisa_Input?: boolean;
  Bendahara_Bisa_Input?: boolean;
  Format_Nomor_Bukti?: string;
  PIN_Ketua: string;
  PIN_Pengurus: string;
  PIN_SuperAdmin: string;
  KasAccess?: KasAccessSettings;
  ContentAccess?: ContentAccessSettings;
  WA_Ketua?: string;
  WA_Sekretaris?: string;
  Nama_Ketua?: string;
  Nama_Sekretaris?: string;
}

export interface VotingOption {
  ID_Option: string;
  Nama_Pilihan: string;
  Jumlah_Suara: number;
}

export interface VotingItem {
  ID_Voting: string;
  ID?: string;
  Judul: string;
  Deskripsi: string;
  Jenis?: "VotingKetua" | "Umum" | string;
  Pilihan: VotingOption[];
  Tanggal_Dibuat: string;
  TanggalMulai?: string;
  Tanggal_Berakhir: string;
  TanggalSelesai?: string;
  Status: "AKTIF" | "SELESAI" | "Berlangsung" | string;
  Pemilih: string[]; // Berisi daftar ID_Anggota yang sudah memberikan suara
  Kategori_Akses?: "PUBLIK" | "ANGGOTA" | "PENGURUS";
  Dibuat_Oleh?: string;
}

export interface VotingHasilItem {
  ID: string;
  IDVoting: string;
  IDAnggota: string;
  Pilihan: string;
}

export interface PengunduranDiriItem {
  ID: string;
  IDPengaju: string;
  Jabatan: string;
  Alasan: string;
  Status: "Pending" | "Disetujui" | "Ditolak" | string;
  DisetujuiOleh?: string;
  TanggalPengajuan: string;
  TanggalKeputusan?: string;
  Catatan?: string;
}

export interface JabatanKosongItem {
  ID: string;
  Jabatan: string;
  Tanggal: string;
  Status: "BelumTerisi" | "Terisi" | string;
}

export interface LogAktivitasItem {
  ID: string;
  Waktu: string;
  User: string;
  Aksi: string;
  Detail: string;
}

export interface KonfigurasiAPIItem {
  ID: string;
  NamaAPI: string;
  Kategori: string;
  KeyField1?: string;
  KeyField2?: string;
  KeyField3?: string;
  ValueField1?: string;
  ValueField2?: string;
  ValueField3?: string;
  Status: "Aktif" | "Nonaktif" | string;
  Keterangan?: string;
  DitambahkanOleh?: string;
  TanggalDitambahkan?: string;
}

export interface PaymentInfoItem {
  ID: string;
  Nama_Akun: string;
  Nomor_Rekening: string;
  Nama_Bank_QRIS: string;
  Visibilitas: "Pengurus" | "Anggota" | "Umum";
  Tanggal_Dibuat: string;
  Dibuat_Oleh: string;
}

export interface PaymentProofItem {
  ID: string;
  ID_Anggota: string;
  Nama_Anggota: string;
  Tanggal_Upload: string;
  Jumlah_Bayar: number;
  Bukti_URL: string;
  Status: "Menunggu" | "Disetujui" | "Ditolak";
  Catatan_Admin?: string;
}

