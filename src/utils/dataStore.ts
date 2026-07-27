import {
  AnggotaItem,
  AgendaItem,
  PengumumanItem,
  KasItem,
  IuranItem,
  AbsensiItem,
  AspirasiItem,
  AlbumItem,
  FotoItem,
  LogAksesItem,
  JabatanHistoryItem,
  JabatanConfig,
  SystemSettings,
  UserRole,
  VotingItem,
  JabatanKosongItem,
  VotingHasilItem,
  KasWajibItem,
  PengunduranDiriItem,
  KonfigurasiAPIItem,
  LogAktivitasItem,
  PaymentInfoItem,
  PaymentProofItem,
} from "../types";

// ============================================================
// CONSTANTS
// ============================================================

const STORAGE_KEY     = "remaja_legok_03_db_v1";
const MAX_LOG_ENTRIES = 200; // ✅ FIXED: Naikkan dari implisit tak terbatas

// ============================================================
// TYPES
// ============================================================

export interface AppData {
  Anggota       : AnggotaItem[];
  Agenda        : AgendaItem[];
  Pengumuman    : PengumumanItem[];
  Kas           : KasItem[];
  Iuran         : IuranItem[];
  Absensi       : AbsensiItem[];
  Aspirasi      : AspirasiItem[];
  Album         : AlbumItem[];
  Galeri        : FotoItem[];
  LogAkses      : LogAksesItem[];
  RiwayatJabatan: JabatanHistoryItem[];
  Jabatan      ?: JabatanConfig;
  JabatanHistory?: JabatanHistoryItem[];
  Settings      : SystemSettings;
  Voting        : VotingItem[];
  JabatanKosong?: JabatanKosongItem[];
  VotingHasil  ?: VotingHasilItem[];
  KasWajib     ?: KasWajibItem[];
  PengunduranDiri?: PengunduranDiriItem[];
  KonfigurasiAPI?: KonfigurasiAPIItem[];
  LogAktivitas ?: LogAktivitasItem[];
  PaymentInfo: PaymentInfoItem[];
  PaymentProofs: PaymentProofItem[];
}

// ============================================================
// DEFAULT DATA
// ============================================================

const defaultInitialData: AppData = {
  Anggota: [
    {
      ID_Anggota    : "RL03-001",
      Nama_Lengkap  : "Andi Setiawan",
      Nama_Panggilan: "Andi",
      Jabatan       : "Ketua",
      Alamat        : "RT 03 Legok RW 04 Denokan",
      No_HP         : "081234567890",
      Jenis_Kelamin : "Laki-laki",
      Tanggal_Lahir : "2003-05-14",
      Minat_Bakat   : "Futsal & Musik",
      Foto_Profil   : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      Tanggal_Daftar: "2023-01-10",
      Status_Aktif  : "AKTIF",
      Status_Tampil : "TAMPIL",
      Izin_NoHP         : true,
      Izin_TanggalLahir : true,
      Izin_Minat        : true,
    },
    {
      ID_Anggota    : "RL03-002",
      Nama_Lengkap  : "Budi Raharjo",
      Nama_Panggilan: "Budi",
      Jabatan       : "Sekretaris",
      Alamat        : "RT 03 Legok RW 04 Denokan",
      No_HP         : "082198765432",
      Jenis_Kelamin : "Laki-laki",
      Tanggal_Lahir : "2002-08-20",
      Minat_Bakat   : "Desain Grafis & Voli",
      Foto_Profil   : "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      Tanggal_Daftar: "2023-01-10",
      Status_Aktif  : "AKTIF",
      Status_Tampil : "TAMPIL",
      Izin_NoHP         : true,
      Izin_TanggalLahir : true,
      Izin_Minat        : true,
    },
    {
      ID_Anggota    : "RL03-003",
      Nama_Lengkap  : "Citra Lestari",
      Nama_Panggilan: "Citra",
      Jabatan       : "Bendahara",
      Alamat        : "RT 03 Legok RW 04 Denokan",
      No_HP         : "085712341234",
      Jenis_Kelamin : "Perempuan",
      Tanggal_Lahir : "2004-12-01",
      Minat_Bakat   : "Tari Tradisional & Administrasi",
      Foto_Profil   : "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      Tanggal_Daftar: "2023-02-15",
      Status_Aktif  : "AKTIF",
      Status_Tampil : "TAMPIL",
      Izin_NoHP         : true,
      Izin_TanggalLahir : true,
      Izin_Minat        : true,
    },
    {
      ID_Anggota    : "RL03-004",
      Nama_Lengkap  : "Deni Kurniawan",
      Nama_Panggilan: "Deni",
      Jabatan       : "Humas",
      Alamat        : "RT 03 Legok RW 04 Denokan",
      No_HP         : "089611223344",
      Jenis_Kelamin : "Laki-laki",
      Tanggal_Lahir : "2001-10-10",
      Minat_Bakat   : "Sound System & Bulutangkis",
      Foto_Profil   : "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
      Tanggal_Daftar: "2023-01-10",
      Status_Aktif  : "AKTIF",
      Status_Tampil : "TAMPIL",
      Izin_NoHP         : true,
      Izin_TanggalLahir : false,
      Izin_Minat        : true,
    },
    {
      ID_Anggota    : "RL03-005",
      Nama_Lengkap  : "Eka Putri",
      Nama_Panggilan: "Eka",
      Jabatan       : "Anggota",
      Alamat        : "RT 03 Legok RW 04 Denokan",
      No_HP         : "081355667788",
      Jenis_Kelamin : "Perempuan",
      Tanggal_Lahir : "2005-03-25",
      Minat_Bakat   : "Kuliner & Dekorasi",
      Foto_Profil   : "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80",
      Tanggal_Daftar: "2023-03-01",
      Status_Aktif  : "AKTIF",
      Status_Tampil : "TAMPIL",
      Izin_NoHP         : true,
      Izin_TanggalLahir : true,
      Izin_Minat        : true,
    },
    {
      ID_Anggota    : "RL03-006",
      Nama_Lengkap  : "Fajar Pratama",
      Nama_Panggilan: "Fajar",
      Jabatan       : "Anggota",
      Alamat        : "RT 03 Legok RW 04 Denokan",
      No_HP         : "081299887766",
      Jenis_Kelamin : "Laki-laki",
      Tanggal_Lahir : "2002-11-12",
      Minat_Bakat   : "Otomotif & Sepeda",
      Foto_Profil   : "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80",
      Tanggal_Daftar: "2023-01-10",
      Status_Aktif  : "AKTIF",
      Status_Tampil : "TAMPIL",
      Izin_NoHP         : true,
      Izin_TanggalLahir : true,
      Izin_Minat        : true,
    },
    // ── Akun Testing ──────────────────────────────────────────
    {
      ID_Anggota    : "RL03-TEST-001",
      Nama_Lengkap  : "Akun Test Anggota",
      Nama_Panggilan: "TestAnggota",
      Jabatan       : "Anggota",
      Alamat        : "RT 03 Legok RW 04 Denokan",
      No_HP         : "080000000001",
      Jenis_Kelamin : "Laki-laki",
      Tanggal_Lahir : "2005-01-01",
      Minat_Bakat   : "Testing System",
      Tanggal_Daftar: "2026-01-01",
      Status_Aktif  : "AKTIF",
      Status_Tampil : "TAMPIL",
      Izin_NoHP         : true,
      Izin_TanggalLahir : true,
      Izin_Minat        : true,
    },
    {
      ID_Anggota    : "RL03-TEST-002",
      Nama_Lengkap  : "Akun Test Humas",
      Nama_Panggilan: "TestHumas",
      Jabatan       : "Humas",
      Alamat        : "RT 03 Legok RW 04 Denokan",
      No_HP         : "080000000002",
      Jenis_Kelamin : "Laki-laki",
      Tanggal_Lahir : "2005-01-01",
      Minat_Bakat   : "Testing System",
      Tanggal_Daftar: "2026-01-01",
      Status_Aktif  : "AKTIF",
      Status_Tampil : "TAMPIL",
      Izin_NoHP         : true,
      Izin_TanggalLahir : true,
      Izin_Minat        : true,
    },
    {
      ID_Anggota    : "RL03-TEST-003",
      Nama_Lengkap  : "Akun Test Sekretaris",
      Nama_Panggilan: "TestSekretaris",
      Jabatan       : "Sekretaris",
      Alamat        : "RT 03 Legok RW 04 Denokan",
      No_HP         : "080000000003",
      Jenis_Kelamin : "Perempuan",
      Tanggal_Lahir : "2005-01-01",
      Minat_Bakat   : "Testing System",
      Tanggal_Daftar: "2026-01-01",
      Status_Aktif  : "AKTIF",
      Status_Tampil : "TAMPIL",
      Izin_NoHP         : true,
      Izin_TanggalLahir : true,
      Izin_Minat        : true,
    },
    {
      ID_Anggota    : "RL03-TEST-004",
      Nama_Lengkap  : "Akun Test Ketua",
      Nama_Panggilan: "TestKetua",
      Jabatan       : "Ketua",
      Alamat        : "RT 03 Legok RW 04 Denokan",
      No_HP         : "080000000004",
      Jenis_Kelamin : "Laki-laki",
      Tanggal_Lahir : "2005-01-01",
      Minat_Bakat   : "Testing System",
      Tanggal_Daftar: "2026-01-01",
      Status_Aktif  : "AKTIF",
      Status_Tampil : "TAMPIL",
      Izin_NoHP         : true,
      Izin_TanggalLahir : true,
      Izin_Minat        : true,
    },
    {
      ID_Anggota    : "RL03-TEST-005",
      Nama_Lengkap  : "Akun Test Bendahara",
      Nama_Panggilan: "TestBendahara",
      Jabatan       : "Bendahara",
      Alamat        : "RT 03 Legok RW 04 Denokan",
      No_HP         : "080000000005",
      Jenis_Kelamin : "Perempuan",
      Tanggal_Lahir : "2005-01-01",
      Minat_Bakat   : "Testing System",
      Tanggal_Daftar: "2026-01-01",
      Status_Aktif  : "AKTIF",
      Status_Tampil : "TAMPIL",
      Izin_NoHP         : true,
      Izin_TanggalLahir : true,
      Izin_Minat        : true,
    },
    // ── Anggota Lainnya ───────────────────────────────────────
    {
      ID_Anggota    : "RL03-007",
      Nama_Lengkap  : "Gita Gutawa",
      Nama_Panggilan: "Gita",
      Alamat        : "RT 03 Legok RW 04 Denokan",
      No_HP         : "085611223344",
      Jenis_Kelamin : "Perempuan",
      Tanggal_Lahir : "2004-04-18",
      Minat_Bakat   : "Paduan Suara",
      Foto_Profil   : "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
      Tanggal_Daftar: "2023-04-05",
      Status_Aktif  : "AKTIF",
      Status_Tampil : "TAMPIL",
      Izin_NoHP         : true,
      Izin_TanggalLahir : true,
      Izin_Minat        : true,
    },
    {
      ID_Anggota    : "RL03-008",
      Nama_Lengkap  : "Hadi Susanto",
      Nama_Panggilan: "Hadi",
      Alamat        : "RT 03 Legok RW 04 Denokan",
      No_HP         : "087788990011",
      Jenis_Kelamin : "Laki-laki",
      Tanggal_Lahir : "2003-09-09",
      Minat_Bakat   : "E-Sports",
      Foto_Profil   : "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
      Tanggal_Daftar: "2023-02-01",
      Status_Aktif  : "AKTIF",
      Status_Tampil : "TAMPIL",
      Izin_NoHP         : true,
      Izin_TanggalLahir : true,
      Izin_Minat        : true,
    },
    {
      ID_Anggota    : "RL03-009",
      Nama_Lengkap  : "Indah Permata",
      Nama_Panggilan: "Indah",
      Alamat        : "RT 03 Legok RW 04 Denokan",
      No_HP         : "089533445566",
      Jenis_Kelamin : "Perempuan",
      Tanggal_Lahir : "2005-01-15",
      Minat_Bakat   : "Melukis & Kerajinan",
      Foto_Profil   : "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
      Tanggal_Daftar: "2023-05-10",
      Status_Aktif  : "AKTIF",
      Status_Tampil : "TAMPIL",
      Izin_NoHP         : true,
      Izin_TanggalLahir : true,
      Izin_Minat        : true,
    },
    {
      ID_Anggota    : "RL03-010",
      Nama_Lengkap  : "Joko Widodo",
      Nama_Panggilan: "Joko",
      Alamat        : "RT 03 Legok RW 04 Denokan",
      No_HP         : "081311223344",
      Jenis_Kelamin : "Laki-laki",
      Tanggal_Lahir : "2001-06-21",
      Minat_Bakat   : "Organisasi",
      Foto_Profil   : "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
      Tanggal_Daftar: "2023-01-10",
      Status_Aktif  : "AKTIF",
      Status_Tampil : "TAMPIL",
      Izin_NoHP         : true,
      Izin_TanggalLahir : true,
      Izin_Minat        : true,
    },
  ],

  Agenda: [
    {
      ID            : "AGD-101",
      Tanggal       : "2026-08-01",
      Waktu         : "19:30",
      "Nama Kegiatan": "Rapat Rutin & Persiapan Kemerdekaan RI",
      Lokasi        : "Balai RT 03 Legok",
      Kategori      : "Rapat",
      Keterangan    : "Membahas pembentukan panitia lomba 17 Agustus.",
    },
    {
      ID            : "AGD-102",
      Tanggal       : "2026-08-10",
      Waktu         : "07:00",
      "Nama Kegiatan": "Kerja Bakti Bersih Lingkungan RT 03",
      Lokasi        : "Jalan Utama RT 03 Legok",
      Kategori      : "Kerja Bakti",
      Keterangan    : "Harap membawa sapu lidi, cangkul, dan kantong sampah.",
    },
    {
      ID            : "AGD-103",
      Tanggal       : "2026-08-17",
      Waktu         : "08:00",
      "Nama Kegiatan": "Pesta Lomba Rakyat Remaja RT 03",
      Lokasi        : "Lapangan Denokan",
      Kategori      : "Olahraga",
      Keterangan    : "Lomba makan kerupuk, balap karung, dan tarik tambang.",
    },
  ],

  Pengumuman: [
    {
      ID       : "PGM-201",
      Tanggal  : "2026-07-20",
      Judul    : "Undangan Rapat Pembentukan Panitia 17-an",
      Isi      : "Diundang seluruh remaja RT 03 Legok untuk hadir pada Sabtu malam Minggu pukul 19.30 WIB di Balai RT.",
      Penulis  : "Ketua Pemuda",
      isPenting: true,
    },
    {
      ID       : "PGM-202",
      Tanggal  : "2026-07-15",
      Judul    : "Pembersihan Lapangan Futsal RT",
      Isi      : "Terima kasih kepada rekan-rekan remaja yang telah berpartisipasi dalam pembersihan lapangan futsal RT kemarin.",
      Penulis  : "Pengurus Harian",
      isPenting: false,
    },
  ],

  Kas: [
    { id: "KAS-2026-001", ID: "KAS-2026-001", Nomor_Bukti: "KAS-2026-001", Tanggal: "2026-07-01", Jenis: "Pemasukan",   Kategori: "Sisa Kas Bulan Lalu",      Sub_Kategori: "Saldo Awal",        Keterangan: "Sisa kas bersih bulan Juni 2026",                                Nominal: 500000, Pemasukan: 500000, Pengeluaran: 0,      Petugas: "Citra Lestari (Sekretaris)", ID_Petugas: "RL03-003", Metode_Bayar: "Transfer", Status: "DISETUJUI",           Approval_By: "Joko Widodo (Ketua)", Waktu_Input: "2026-07-01 08:00" },
    { id: "KAS-2026-002", ID: "KAS-2026-002", Nomor_Bukti: "KAS-2026-002", Tanggal: "2026-07-05", Jenis: "Pemasukan",   Kategori: "Iuran Anggota",            Sub_Kategori: "Iuran Bulanan",     Keterangan: "Penerimaan iuran bulanan Juli dari 15 anggota",                  Nominal: 150000, Pemasukan: 150000, Pengeluaran: 0,      Petugas: "Citra Lestari (Sekretaris)", ID_Petugas: "RL03-003", Metode_Bayar: "Tunai",    Status: "DISETUJUI",           Approval_By: "Joko Widodo (Ketua)", Waktu_Input: "2026-07-05 20:30" },
    { id: "KAS-2026-003", ID: "KAS-2026-003", Nomor_Bukti: "KAS-2026-003", Tanggal: "2026-07-08", Jenis: "Pengeluaran", Kategori: "Konsumsi Rapat",           Sub_Kategori: "Snack & Minuman",   Keterangan: "Konsumsi rapat koordinasi panitia HUT RI 81",                   Nominal: 75000,  Pemasukan: 0,      Pengeluaran: 75000,  Petugas: "Citra Lestari (Sekretaris)", ID_Petugas: "RL03-003", Metode_Bayar: "Tunai",    Status: "DISETUJUI",           Approval_By: "Joko Widodo (Ketua)", Waktu_Input: "2026-07-08 21:00", Bukti_Nota: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&auto=format&fit=crop&q=80" },
    { id: "KAS-2026-004", ID: "KAS-2026-004", Nomor_Bukti: "KAS-2026-004", Tanggal: "2026-07-12", Jenis: "Pemasukan",   Kategori: "Donasi Warga",             Sub_Kategori: "Sumbangan Sukarela",Keterangan: "Donasi dari Bapak Budianto untuk kas pemuda",                    Nominal: 200000, Pemasukan: 200000, Pengeluaran: 0,      Petugas: "Andi Setiawan (Pengurus)",   ID_Petugas: "RL03-001", Metode_Bayar: "Tunai",    Status: "DISETUJUI",           Approval_By: "Joko Widodo (Ketua)", Waktu_Input: "2026-07-12 10:15" },
    { id: "KAS-2026-005", ID: "KAS-2026-005", Nomor_Bukti: "KAS-2026-005", Tanggal: "2026-07-15", Jenis: "Pengeluaran", Kategori: "Perlengkapan Kegiatan",    Sub_Kategori: "Bahan & Alat",      Keterangan: "Pembelian 3 kaleng cat & kuas untuk perbaikan gapura RT 03",     Nominal: 120000, Pemasukan: 0,      Pengeluaran: 120000, Petugas: "Deni Kurniawan (Petugas)",   ID_Petugas: "RL03-004", Metode_Bayar: "Tunai",    Status: "DISETUJUI",           Approval_By: "Joko Widodo (Ketua)", Waktu_Input: "2026-07-15 16:45", Bukti_Nota: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=80" },
    { id: "KAS-2026-006", ID: "KAS-2026-006", Nomor_Bukti: "KAS-2026-006", Tanggal: "2026-07-18", Jenis: "Pemasukan",   Kategori: "Sumbangan Sponsor",        Sub_Kategori: "Sponsor Kegiatan",  Keterangan: "Sponsorship Toko Kelontong Berkah Denokan untuk Lomba Kemerdekaan",Nominal: 300000, Pemasukan: 300000, Pengeluaran: 0,      Petugas: "Budi Raharjo (Humas)",       ID_Petugas: "RL03-002", Metode_Bayar: "Transfer", Status: "DISETUJUI",           Approval_By: "Joko Widodo (Ketua)", Waktu_Input: "2026-07-18 14:20" },
    { id: "KAS-2026-007", ID: "KAS-2026-007", Nomor_Bukti: "KAS-2026-007", Tanggal: "2026-07-20", Jenis: "Pengeluaran", Kategori: "Kas Sosial",               Sub_Kategori: "Santunan & Besuk",  Keterangan: "Kas sosial pemuda untuk besuk anggota yang sedang dirawat sakit", Nominal: 100000, Pemasukan: 0,      Pengeluaran: 100000, Petugas: "Citra Lestari (Sekretaris)", ID_Petugas: "RL03-003", Metode_Bayar: "Tunai",    Status: "DISETUJUI",           Approval_By: "Joko Widodo (Ketua)", Waktu_Input: "2026-07-20 11:30" },
    { id: "KAS-2026-008", ID: "KAS-2026-008", Nomor_Bukti: "KAS-2026-008", Tanggal: "2026-07-21", Jenis: "Pengeluaran", Kategori: "Perlengkapan Kegiatan",    Sub_Kategori: "Sewa Alat",         Keterangan: "Uang muka sewa Sound System untuk panggung 17-an",               Nominal: 600000, Pemasukan: 0,      Pengeluaran: 600000, Petugas: "Citra Lestari (Sekretaris)", ID_Petugas: "RL03-003", Metode_Bayar: "Transfer", Status: "MENUNGGU_APPROVAL",   Catatan: "Nominal di atas Rp 500.000, membutuhkan approval Ketua", Waktu_Input: "2026-07-21 19:10" },
  ],

  Iuran: [
    // ── Andi Setiawan (RL03-001) — Lunas Jan–Jul ──────────────
    { id: "IUR-2026-001", ID_Anggota: "RL03-001", Nama_Anggota: "Andi Setiawan", Bulan: "Januari",  Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-01-05", Metode_Bayar: "Tunai",    Penerima: "Citra (Sekretaris)", Nomor_Bukti: "IUR-2026-001" },
    { id: "IUR-2026-002", ID_Anggota: "RL03-001", Nama_Anggota: "Andi Setiawan", Bulan: "Februari", Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-02-04", Metode_Bayar: "Transfer", Penerima: "Citra (Sekretaris)", Nomor_Bukti: "IUR-2026-002" },
    { id: "IUR-2026-003", ID_Anggota: "RL03-001", Nama_Anggota: "Andi Setiawan", Bulan: "Maret",    Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-03-06", Metode_Bayar: "QRIS",     Penerima: "Citra (Sekretaris)", Nomor_Bukti: "IUR-2026-003" },
    { id: "IUR-2026-004", ID_Anggota: "RL03-001", Nama_Anggota: "Andi Setiawan", Bulan: "April",    Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-04-02", Metode_Bayar: "Tunai",    Penerima: "Citra (Sekretaris)", Nomor_Bukti: "IUR-2026-004" },
    { id: "IUR-2026-005", ID_Anggota: "RL03-001", Nama_Anggota: "Andi Setiawan", Bulan: "Mei",      Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-05-08", Metode_Bayar: "Transfer", Penerima: "Citra (Sekretaris)", Nomor_Bukti: "IUR-2026-005" },
    { id: "IUR-2026-006", ID_Anggota: "RL03-001", Nama_Anggota: "Andi Setiawan", Bulan: "Juni",     Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-06-05", Metode_Bayar: "QRIS",     Penerima: "Citra (Sekretaris)", Nomor_Bukti: "IUR-2026-006" },
    { id: "IUR-2026-007", ID_Anggota: "RL03-001", Nama_Anggota: "Andi Setiawan", Bulan: "Juli",     Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-07-02", Metode_Bayar: "Transfer", Penerima: "Citra (Sekretaris)", Nomor_Bukti: "IUR-2026-007" },

    // ── Budi Raharjo (RL03-002) — Lunas Jan–Jul ───────────────
    { id: "IUR-2026-008", ID_Anggota: "RL03-002", Nama_Anggota: "Budi Raharjo", Bulan: "Januari",  Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-01-08", Metode_Bayar: "Tunai",    Penerima: "Citra (Sekretaris)" },
    { id: "IUR-2026-009", ID_Anggota: "RL03-002", Nama_Anggota: "Budi Raharjo", Bulan: "Februari", Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-02-09", Metode_Bayar: "Tunai",    Penerima: "Citra (Sekretaris)" },
    { id: "IUR-2026-010", ID_Anggota: "RL03-002", Nama_Anggota: "Budi Raharjo", Bulan: "Maret",    Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-03-10", Metode_Bayar: "Transfer", Penerima: "Citra (Sekretaris)" },
    { id: "IUR-2026-011", ID_Anggota: "RL03-002", Nama_Anggota: "Budi Raharjo", Bulan: "April",    Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-04-09", Metode_Bayar: "Tunai",    Penerima: "Citra (Sekretaris)" },
    { id: "IUR-2026-012", ID_Anggota: "RL03-002", Nama_Anggota: "Budi Raharjo", Bulan: "Mei",      Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-05-10", Metode_Bayar: "Tunai",    Penerima: "Citra (Sekretaris)" },
    { id: "IUR-2026-013", ID_Anggota: "RL03-002", Nama_Anggota: "Budi Raharjo", Bulan: "Juni",     Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-06-08", Metode_Bayar: "Transfer", Penerima: "Citra (Sekretaris)" },
    { id: "IUR-2026-014", ID_Anggota: "RL03-002", Nama_Anggota: "Budi Raharjo", Bulan: "Juli",     Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-07-03", Metode_Bayar: "Transfer", Penerima: "Citra (Sekretaris)" },

    // ── Citra Lestari (RL03-003) — Lunas Jan–Mei, Jun–Jul Belum
    { id: "IUR-2026-015", ID_Anggota: "RL03-003", Nama_Anggota: "Citra Lestari", Bulan: "Januari",  Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-01-10", Metode_Bayar: "Tunai", Penerima: "Joko (Ketua)" },
    { id: "IUR-2026-016", ID_Anggota: "RL03-003", Nama_Anggota: "Citra Lestari", Bulan: "Februari", Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-02-10", Metode_Bayar: "Tunai", Penerima: "Joko (Ketua)" },
    { id: "IUR-2026-017", ID_Anggota: "RL03-003", Nama_Anggota: "Citra Lestari", Bulan: "Maret",    Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-03-12", Metode_Bayar: "Tunai", Penerima: "Joko (Ketua)" },
    { id: "IUR-2026-018", ID_Anggota: "RL03-003", Nama_Anggota: "Citra Lestari", Bulan: "April",    Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-04-10", Metode_Bayar: "Tunai", Penerima: "Joko (Ketua)" },
    { id: "IUR-2026-019", ID_Anggota: "RL03-003", Nama_Anggota: "Citra Lestari", Bulan: "Mei",      Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-05-12", Metode_Bayar: "Tunai", Penerima: "Joko (Ketua)" },

    // ── Deni Kurniawan (RL03-004) — Lunas Jan–Jul ─────────────
    { id: "IUR-2026-020", ID_Anggota: "RL03-004", Nama_Anggota: "Deni Kurniawan", Bulan: "Januari",  Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-01-05", Metode_Bayar: "Tunai", Penerima: "Citra (Sekretaris)" },
    { id: "IUR-2026-021", ID_Anggota: "RL03-004", Nama_Anggota: "Deni Kurniawan", Bulan: "Februari", Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-02-05", Metode_Bayar: "Tunai", Penerima: "Citra (Sekretaris)" },
    { id: "IUR-2026-022", ID_Anggota: "RL03-004", Nama_Anggota: "Deni Kurniawan", Bulan: "Maret",    Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-03-05", Metode_Bayar: "Tunai", Penerima: "Citra (Sekretaris)" },
    { id: "IUR-2026-023", ID_Anggota: "RL03-004", Nama_Anggota: "Deni Kurniawan", Bulan: "April",    Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-04-05", Metode_Bayar: "Tunai", Penerima: "Citra (Sekretaris)" },
    { id: "IUR-2026-024", ID_Anggota: "RL03-004", Nama_Anggota: "Deni Kurniawan", Bulan: "Mei",      Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-05-05", Metode_Bayar: "Tunai", Penerima: "Citra (Sekretaris)" },
    { id: "IUR-2026-025", ID_Anggota: "RL03-004", Nama_Anggota: "Deni Kurniawan", Bulan: "Juni",     Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-06-05", Metode_Bayar: "Tunai", Penerima: "Citra (Sekretaris)" },
    { id: "IUR-2026-026", ID_Anggota: "RL03-004", Nama_Anggota: "Deni Kurniawan", Bulan: "Juli",     Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-07-05", Metode_Bayar: "Tunai", Penerima: "Citra (Sekretaris)" },

    // ── Eka Putri (RL03-005) — Lunas Jan–Mei, Juli Cicil ──────
    { id: "IUR-2026-027", ID_Anggota: "RL03-005", Nama_Anggota: "Eka Putri", Bulan: "Januari",  Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-01-10", Metode_Bayar: "Tunai", Penerima: "Citra (Sekretaris)" },
    { id: "IUR-2026-028", ID_Anggota: "RL03-005", Nama_Anggota: "Eka Putri", Bulan: "Februari", Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-02-12", Metode_Bayar: "Tunai", Penerima: "Citra (Sekretaris)" },
    { id: "IUR-2026-029", ID_Anggota: "RL03-005", Nama_Anggota: "Eka Putri", Bulan: "Maret",    Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-03-15", Metode_Bayar: "Tunai", Penerima: "Citra (Sekretaris)" },
    { id: "IUR-2026-030", ID_Anggota: "RL03-005", Nama_Anggota: "Eka Putri", Bulan: "April",    Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-04-14", Metode_Bayar: "Tunai", Penerima: "Citra (Sekretaris)" },
    { id: "IUR-2026-031", ID_Anggota: "RL03-005", Nama_Anggota: "Eka Putri", Bulan: "Mei",      Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-05-15", Metode_Bayar: "Tunai", Penerima: "Citra (Sekretaris)" },
    { id: "IUR-2026-032", ID_Anggota: "RL03-005", Nama_Anggota: "Eka Putri", Bulan: "Juli",     Tahun: 2026, Jumlah: 10000, Status: "CICIL",  Tanggal_Bayar: "2026-07-10", Metode_Bayar: "Tunai", Penerima: "Citra (Sekretaris)", Nominal_Cicil: 5000, Catatan: "Baru bayar Rp 5.000" },

    // ── Fajar Pratama (RL03-006) — Lunas Jan–Mar, Nunggak Apr–Jul
    { id: "IUR-2026-033", ID_Anggota: "RL03-006", Nama_Anggota: "Fajar Pratama", Bulan: "Januari",  Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-01-15", Metode_Bayar: "Tunai", Penerima: "Citra (Sekretaris)" },
    { id: "IUR-2026-034", ID_Anggota: "RL03-006", Nama_Anggota: "Fajar Pratama", Bulan: "Februari", Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-02-18", Metode_Bayar: "Tunai", Penerima: "Citra (Sekretaris)" },
    { id: "IUR-2026-035", ID_Anggota: "RL03-006", Nama_Anggota: "Fajar Pratama", Bulan: "Maret",    Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-03-20", Metode_Bayar: "Tunai", Penerima: "Citra (Sekretaris)" },

    // ── Gita Gutawa (RL03-007) — Lunas Jan–Jun, Juli Menunggu ─
    { id: "IUR-2026-036", ID_Anggota: "RL03-007", Nama_Anggota: "Gita Gutawa", Bulan: "Januari",  Tahun: 2026, Jumlah: 10000, Status: "LUNAS",               Tanggal_Bayar: "2026-01-08", Metode_Bayar: "Transfer", Penerima: "Citra (Sekretaris)" },
    { id: "IUR-2026-037", ID_Anggota: "RL03-007", Nama_Anggota: "Gita Gutawa", Bulan: "Februari", Tahun: 2026, Jumlah: 10000, Status: "LUNAS",               Tanggal_Bayar: "2026-02-08", Metode_Bayar: "Transfer", Penerima: "Citra (Sekretaris)" },
    { id: "IUR-2026-038", ID_Anggota: "RL03-007", Nama_Anggota: "Gita Gutawa", Bulan: "Maret",    Tahun: 2026, Jumlah: 10000, Status: "LUNAS",               Tanggal_Bayar: "2026-03-08", Metode_Bayar: "Transfer", Penerima: "Citra (Sekretaris)" },
    { id: "IUR-2026-039", ID_Anggota: "RL03-007", Nama_Anggota: "Gita Gutawa", Bulan: "April",    Tahun: 2026, Jumlah: 10000, Status: "LUNAS",               Tanggal_Bayar: "2026-04-08", Metode_Bayar: "Transfer", Penerima: "Citra (Sekretaris)" },
    { id: "IUR-2026-040", ID_Anggota: "RL03-007", Nama_Anggota: "Gita Gutawa", Bulan: "Mei",      Tahun: 2026, Jumlah: 10000, Status: "LUNAS",               Tanggal_Bayar: "2026-05-08", Metode_Bayar: "Transfer", Penerima: "Citra (Sekretaris)" },
    { id: "IUR-2026-041", ID_Anggota: "RL03-007", Nama_Anggota: "Gita Gutawa", Bulan: "Juni",     Tahun: 2026, Jumlah: 10000, Status: "LUNAS",               Tanggal_Bayar: "2026-06-08", Metode_Bayar: "Transfer", Penerima: "Citra (Sekretaris)" },
    { id: "IUR-2026-042", ID_Anggota: "RL03-007", Nama_Anggota: "Gita Gutawa", Bulan: "Juli",     Tahun: 2026, Jumlah: 10000, Status: "MENUNGGU_KONFIRMASI", Tanggal_Bayar: "2026-07-21", Metode_Bayar: "Transfer", Catatan: "Sudah transfer BCA a.n Gita, mohon verifikasi", Bukti_Transfer: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=300&auto=format&fit=crop&q=80" },

    // ── Hadi Susanto (RL03-008) — Dibebaskan (Tugas Belajar) ──
    { id: "IUR-2026-043", ID_Anggota: "RL03-008", Nama_Anggota: "Hadi Susanto", Bulan: "Mei",  Tahun: 2026, Jumlah: 0, Status: "DIBEBASKAN", Alasan_Bebas: "Tugas perkuliahan luar kota", Penerima: "Joko (Ketua)" },
    { id: "IUR-2026-044", ID_Anggota: "RL03-008", Nama_Anggota: "Hadi Susanto", Bulan: "Juni", Tahun: 2026, Jumlah: 0, Status: "DIBEBASKAN", Alasan_Bebas: "Tugas perkuliahan luar kota", Penerima: "Joko (Ketua)" },
    { id: "IUR-2026-045", ID_Anggota: "RL03-008", Nama_Anggota: "Hadi Susanto", Bulan: "Juli", Tahun: 2026, Jumlah: 0, Status: "DIBEBASKAN", Alasan_Bebas: "Tugas perkuliahan luar kota", Penerima: "Joko (Ketua)" },

    // ── Indah Permata (RL03-009) — Lunas Jan–Mei, Jun–Jul Belum
    { id: "IUR-2026-046", ID_Anggota: "RL03-009", Nama_Anggota: "Indah Permata", Bulan: "Januari",  Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-01-12", Metode_Bayar: "QRIS", Penerima: "Citra (Sekretaris)" },
    { id: "IUR-2026-047", ID_Anggota: "RL03-009", Nama_Anggota: "Indah Permata", Bulan: "Februari", Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-02-14", Metode_Bayar: "QRIS", Penerima: "Citra (Sekretaris)" },
    { id: "IUR-2026-048", ID_Anggota: "RL03-009", Nama_Anggota: "Indah Permata", Bulan: "Maret",    Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-03-12", Metode_Bayar: "QRIS", Penerima: "Citra (Sekretaris)" },
    { id: "IUR-2026-049", ID_Anggota: "RL03-009", Nama_Anggota: "Indah Permata", Bulan: "April",    Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-04-15", Metode_Bayar: "QRIS", Penerima: "Citra (Sekretaris)" },
    { id: "IUR-2026-050", ID_Anggota: "RL03-009", Nama_Anggota: "Indah Permata", Bulan: "Mei",      Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-05-18", Metode_Bayar: "QRIS", Penerima: "Citra (Sekretaris)" },

    // ── Joko Widodo (RL03-010) — Lunas Jan–Jul ────────────────
    { id: "IUR-2026-051", ID_Anggota: "RL03-010", Nama_Anggota: "Joko Widodo", Bulan: "Januari",  Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-01-02", Metode_Bayar: "Tunai", Penerima: "Citra (Sekretaris)" },
    { id: "IUR-2026-052", ID_Anggota: "RL03-010", Nama_Anggota: "Joko Widodo", Bulan: "Februari", Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-02-02", Metode_Bayar: "Tunai", Penerima: "Citra (Sekretaris)" },
    { id: "IUR-2026-053", ID_Anggota: "RL03-010", Nama_Anggota: "Joko Widodo", Bulan: "Maret",    Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-03-02", Metode_Bayar: "Tunai", Penerima: "Citra (Sekretaris)" },
    { id: "IUR-2026-054", ID_Anggota: "RL03-010", Nama_Anggota: "Joko Widodo", Bulan: "April",    Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-04-02", Metode_Bayar: "Tunai", Penerima: "Citra (Sekretaris)" },
    { id: "IUR-2026-055", ID_Anggota: "RL03-010", Nama_Anggota: "Joko Widodo", Bulan: "Mei",      Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-05-02", Metode_Bayar: "Tunai", Penerima: "Citra (Sekretaris)" },
    { id: "IUR-2026-056", ID_Anggota: "RL03-010", Nama_Anggota: "Joko Widodo", Bulan: "Juni",     Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-06-02", Metode_Bayar: "Tunai", Penerima: "Citra (Sekretaris)" },
    { id: "IUR-2026-057", ID_Anggota: "RL03-010", Nama_Anggota: "Joko Widodo", Bulan: "Juli",     Tahun: 2026, Jumlah: 10000, Status: "LUNAS", Tanggal_Bayar: "2026-07-02", Metode_Bayar: "Tunai", Penerima: "Citra (Sekretaris)" },
  ],

  Absensi: [
    { id: "ABS-001", ID_Agenda: "AGD-101", Nama_Kegiatan: "Rapat Rutin & Persiapan Kemerdekaan RI", ID_Anggota: "RL03-001", Nama_Anggota: "Andi Setiawan", Tanggal: "2026-07-20", Waktu: "19:35", Status: "HADIR" },
  ],

  Aspirasi: [
    { ID: "ASP-401", Tanggal: "2026-07-18", Usulan: "Bagaimana kalau diadakan turnamen e-sports Mobile Legends antar RT saat peringatan 17-an?", Pengirim: "Budi Raharjo",   ID_Anggota: "RL03-002", Likes: 12, Status: "DISETUJUI" },
    { ID: "ASP-402", Tanggal: "2026-07-19", Usulan: "Usul pengadaan kerja bakti rutin sebulan 2x untuk menjaga kebersihan selokan jelang musim hujan.",  Pengirim: "Deni Kurniawan", ID_Anggota: "RL03-004", Likes: 8,  Status: "MENUNGGU"  },
  ],

  Album: [
    { ID_Album: "ALB-501", Nama_Album: "Kegiatan Ramadhan 1447H",        Deskripsi: "Dokumentasi bagi takjil dan buka bersama remaja RT 03 Legok",                   Tanggal_Kegiatan: "2026-03-20", ID_Anggota_Buat: "RL03-001", Nama_Pembuat: "Andi Setiawan",  Role_Pembuat: "PENGURUS", Kategori_Akses: "PUBLIK",    Kategori_Kegiatan: "Hari Besar",  Cover_URL: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&auto=format&fit=crop&q=80", Tanggal_Dibuat: "2026-03-20", Jumlah_Foto: 3 },
    { ID_Album: "ALB-502", Nama_Album: "Kerja Bakti Lapangan Denokan",   Deskripsi: "Pembersihan lingkungan dan pengecatan garis lapangan olahraga RT 03",           Tanggal_Kegiatan: "2026-06-14", ID_Anggota_Buat: "RL03-002", Nama_Pembuat: "Budi Raharjo",   Role_Pembuat: "PENGURUS", Kategori_Akses: "PUBLIK",    Kategori_Kegiatan: "Kerja Bakti", Cover_URL: "https://images.unsplash.com/photo-1558008258-3256797b43f3?w=800&auto=format&fit=crop&q=80", Tanggal_Dibuat: "2026-06-14", Jumlah_Foto: 3 },
    { ID_Album: "ALB-503", Nama_Album: "Turnamen Voli Pemuda RT 03",     Deskripsi: "Pertandingan persahabatan antar dawis & kejuaraan bola voli internal",          Tanggal_Kegiatan: "2026-07-05", ID_Anggota_Buat: "RL03-004", Nama_Pembuat: "Deni Kurniawan", Role_Pembuat: "ANGGOTA",  Kategori_Akses: "ANGGOTA",   Kategori_Kegiatan: "Olahraga",    Cover_URL: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&auto=format&fit=crop&q=80", Tanggal_Dibuat: "2026-07-05", Jumlah_Foto: 3 },
    { ID_Album: "ALB-504", Nama_Album: "Rapat Kerja & Evaluasi Kas 2026",Deskripsi: "Musyawarah pengurus harian dan pembahasan laporan keuangan semester 1",         Tanggal_Kegiatan: "2026-07-10", ID_Anggota_Buat: "RL03-001", Nama_Pembuat: "Andi Setiawan",  Role_Pembuat: "PENGURUS", Kategori_Akses: "PENGURUS",  Kategori_Kegiatan: "Rapat",       Cover_URL: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80", Tanggal_Dibuat: "2026-07-10", Jumlah_Foto: 2 },
    { ID_Album: "ALB-505", Nama_Album: "Persiapan Panggung HUT RI 81",   Deskripsi: "Latihan tari tradisional, musik, dan dekorasi panggung kemerdekaan",            Tanggal_Kegiatan: "2026-07-21", ID_Anggota_Buat: "RL03-003", Nama_Pembuat: "Citra Lestari",  Role_Pembuat: "ANGGOTA",  Kategori_Akses: "PUBLIK",    Kategori_Kegiatan: "Seni",        Cover_URL: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&auto=format&fit=crop&q=80", Tanggal_Dibuat: "2026-07-21", Jumlah_Foto: 3 },
  ],

  Galeri: [
    { ID_Foto: "FTO-601", ID: "FTO-601", Judul: "Buka Bersama Remaja RT 03",          Judul_Kegiatan: "Buka Bersama Remaja RT 03",          Link_Foto: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&auto=format&fit=crop&q=80", Foto_URL: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&auto=format&fit=crop&q=80", Album_ID: "ALB-501", Tanggal: "2026-03-20", Kategori: "Hari Besar",  Kategori_Akses: "PUBLIK",    ID_Anggota_Upload: "RL03-001", Nama_Upload: "Andi Setiawan",  Uploader: "Andi Setiawan",  Role_Upload: "PENGURUS", Caption: "Keceriaan saat buka bersama di Balai RT 03 Legok.",               Status_Approval: "DISETUJUI", Ukuran_KB: 1240 },
    { ID_Foto: "FTO-602", ID: "FTO-602", Judul: "Berbagi Takjil di Jalur Denokan",    Judul_Kegiatan: "Berbagi Takjil di Jalur Denokan",    Link_Foto: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&auto=format&fit=crop&q=80", Foto_URL: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&auto=format&fit=crop&q=80", Album_ID: "ALB-501", Tanggal: "2026-03-20", Kategori: "Hari Besar",  Kategori_Akses: "PUBLIK",    ID_Anggota_Upload: "RL03-001", Nama_Upload: "Andi Setiawan",  Uploader: "Andi Setiawan",  Role_Upload: "PENGURUS", Caption: "Pembagian takjil gratis untuk pengguna jalan Denokan.",          Status_Approval: "DISETUJUI", Ukuran_KB: 1850 },
    { ID_Foto: "FTO-603", ID: "FTO-603", Judul: "Persiapan Menu Buka Bersama",        Judul_Kegiatan: "Persiapan Menu Buka Bersama",        Link_Foto: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80", Foto_URL: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80", Album_ID: "ALB-501", Tanggal: "2026-03-20", Kategori: "Hari Besar",  Kategori_Akses: "ANGGOTA",   ID_Anggota_Upload: "RL03-005", Nama_Upload: "Eka Putri",      Uploader: "Eka Putri",      Role_Upload: "ANGGOTA",  Caption: "Tim konsumsi remaja putri menyiapkan es buah segar.",            Status_Approval: "DISETUJUI", Ukuran_KB: 980  },
    { ID_Foto: "FTO-604", ID: "FTO-604", Judul: "Pengecatan Lapangan Voli",           Judul_Kegiatan: "Pengecatan Lapangan Voli",           Link_Foto: "https://images.unsplash.com/photo-1558008258-3256797b43f3?w=800&auto=format&fit=crop&q=80", Foto_URL: "https://images.unsplash.com/photo-1558008258-3256797b43f3?w=800&auto=format&fit=crop&q=80", Album_ID: "ALB-502", Tanggal: "2026-06-14", Kategori: "Kerja Bakti", Kategori_Akses: "PUBLIK",    ID_Anggota_Upload: "RL03-002", Nama_Upload: "Budi Raharjo",   Uploader: "Budi Raharjo",   Role_Upload: "PENGURUS", Caption: "Membuat garis pembatas lapangan voli RT 03 dengan cat putih.",   Status_Approval: "DISETUJUI", Ukuran_KB: 2100 },
    { ID_Foto: "FTO-605", ID: "FTO-605", Judul: "Gotong Royong Bersih Selokan",       Judul_Kegiatan: "Gotong Royong Bersih Selokan",       Link_Foto: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80", Foto_URL: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80", Album_ID: "ALB-502", Tanggal: "2026-06-14", Kategori: "Kerja Bakti", Kategori_Akses: "PUBLIK",    ID_Anggota_Upload: "RL03-004", Nama_Upload: "Deni Kurniawan", Uploader: "Deni Kurniawan", Role_Upload: "ANGGOTA",  Caption: "Pembersihan rumput liar dan lumpur di drainase jalan utama.",   Status_Approval: "DISETUJUI", Ukuran_KB: 1450 },
    { ID_Foto: "FTO-606", ID: "FTO-606", Judul: "Servis Pertama Pembukaan Voli",      Judul_Kegiatan: "Servis Pertama Pembukaan Voli",      Link_Foto: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&auto=format&fit=crop&q=80", Foto_URL: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&auto=format&fit=crop&q=80", Album_ID: "ALB-503", Tanggal: "2026-07-05", Kategori: "Olahraga",    Kategori_Akses: "ANGGOTA",   ID_Anggota_Upload: "RL03-004", Nama_Upload: "Deni Kurniawan", Uploader: "Deni Kurniawan", Role_Upload: "ANGGOTA",  Caption: "Pertandingan seru antara tim Blok Utara vs Blok Selatan.",      Status_Approval: "DISETUJUI", Ukuran_KB: 1620 },
    { ID_Foto: "FTO-607", ID: "FTO-607", Judul: "Laporan Keuangan Rapat Pengurus",    Judul_Kegiatan: "Laporan Keuangan Rapat Pengurus",    Link_Foto: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80", Foto_URL: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80", Album_ID: "ALB-504", Tanggal: "2026-07-10", Kategori: "Rapat",       Kategori_Akses: "PENGURUS",  ID_Anggota_Upload: "RL03-001", Nama_Upload: "Andi Setiawan",  Uploader: "Andi Setiawan",  Role_Upload: "PENGURUS", Caption: "Penjelasan pencatatan iuran kas oleh tim bendahara.",            Status_Approval: "DISETUJUI", Ukuran_KB: 1100 },
    { ID_Foto: "FTO-608", ID: "FTO-608", Judul: "Latihan Tari Gambyong Remaja Putri", Judul_Kegiatan: "Latihan Tari Gambyong Remaja Putri", Link_Foto: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&auto=format&fit=crop&q=80", Foto_URL: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&auto=format&fit=crop&q=80", Album_ID: "ALB-505", Tanggal: "2026-07-21", Kategori: "Seni",        Kategori_Akses: "PUBLIK",    ID_Anggota_Upload: "RL03-003", Nama_Upload: "Citra Lestari",  Uploader: "Citra Lestari",  Role_Upload: "ANGGOTA",  Caption: "Persiapan penampilan tarian sambutan panggung 17-an.",           Status_Approval: "DISETUJUI", Ukuran_KB: 1750 },
    { ID_Foto: "FTO-609", ID: "FTO-609", Judul: "Usulan Dekorasi Gapura RT 03",       Judul_Kegiatan: "Usulan Dekorasi Gapura RT 03",       Link_Foto: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&auto=format&fit=crop&q=80", Foto_URL: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&auto=format&fit=crop&q=80", Album_ID: "ALB-505", Tanggal: "2026-07-21", Kategori: "Hari Besar",  Kategori_Akses: "PUBLIK",    ID_Anggota_Upload: "RL03-005", Nama_Upload: "Eka Putri",      Uploader: "Eka Putri",      Role_Upload: "ANGGOTA",  Caption: "Mohon izin upload foto referensi hiasan bambu untuk gapura utama.", Status_Approval: "MENUNGGU", Ukuran_KB: 1320 },
    { ID_Foto: "FTO-610", ID: "FTO-610", Judul: "Foto Bersama Selesai Voli",          Judul_Kegiatan: "Foto Bersama Selesai Voli",          Link_Foto: "https://images.unsplash.com/photo-1526676037777-05a232554f77?w=800&auto=format&fit=crop&q=80", Foto_URL: "https://images.unsplash.com/photo-1526676037777-05a232554f77?w=800&auto=format&fit=crop&q=80", Album_ID: "ALB-503", Tanggal: "2026-07-05", Kategori: "Olahraga",    Kategori_Akses: "ANGGOTA",   ID_Anggota_Upload: "RL03-002", Nama_Upload: "Budi Raharjo",   Uploader: "Budi Raharjo",   Role_Upload: "ANGGOTA",  Caption: "Kekompakan tim voli setelah babak penyisihan.",                 Status_Approval: "MENUNGGU", Ukuran_KB: 1540 },
  ],

  LogAkses: [
    { id: "LOG-001", Waktu: "2026-07-21 20:00", ID_Anggota: "SA-001", Nama: "Super Admin", Role: "SUPER_ADMIN", Aksi: "Login Super Admin", Detail: "Masuk dengan PIN Super Admin" },
  ],

  RiwayatJabatan: [
    { id: "JBT-001", Tanggal: "2025-01-01", Nama_Ketua: "Andi Setiawan", ID_Ketua: "RL03-001", Ditunjuk_Oleh: "Musyawarah Pemuda RT 03", Status: "AKTIF" },
  ],

  Settings: {
    Nama_Komunitas      : "Remaja Legok 03",
    Alamat_Komunitas    : "RT 03 Legok RW 04 Denokan, Kel. Gondoryo, Kec. Jambu, Kab. Semarang, Jawa Tengah",
    Deskripsi_Komunitas : "Wadah silaturahmi, gotong royong, dan kreasi pemuda pemudi RT 03 Legok RW 04 Denokan.",
    Logo_URL            : "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=120&auto=format&fit=crop&q=80",
    Banner_URL          : "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&auto=format&fit=crop&q=80",
    Fitur_AI_Aktif      : true,
    Fitur_Kas_Aktif     : true,
    Nominal_Iuran       : 10000,
    PIN_Ketua           : "123456",
    PIN_Pengurus        : "654321",
    PIN_SuperAdmin      : "12345678",
    WA_Ketua            : "6281234567890",
    WA_Sekretaris       : "6281234567891",
    Nama_Ketua          : "Iqbal (RT 03 Denokan)",
    Nama_Sekretaris     : "Nabila (RT 03 Denokan)",
    KasAccess: {
      kasSaldoVisibilitas  : "SEMUA_ANGGOTA",
      kasDetailVisibilitas : "BENDAHARA_KETUA_SAJA",
      kasIuranVisibilitas  : "PENGURUS_SAJA",
      jabatanPermissions: [
        { jabatan: "Bendahara Umum", bisaInputMasuk: true,  bisaInputKeluar: true,  bisaLihatDetail: true,  bisaLihatIuran: true,  bisaHapus: false, bisaExport: true,  maxNominalInput: 500000 },
        { jabatan: "Bendahara 1",    bisaInputMasuk: true,  bisaInputKeluar: true,  bisaLihatDetail: true,  bisaLihatIuran: true,  bisaHapus: false, bisaExport: true,  maxNominalInput: 500000 },
        { jabatan: "Bendahara 2",    bisaInputMasuk: true,  bisaInputKeluar: false, bisaLihatDetail: true,  bisaLihatIuran: true,  bisaHapus: false, bisaExport: false, maxNominalInput: 200000 },
        { jabatan: "Wakil Ketua",    bisaInputMasuk: true,  bisaInputKeluar: true,  bisaLihatDetail: true,  bisaLihatIuran: true,  bisaHapus: false, bisaExport: true,  maxNominalInput: 500000 },
        { jabatan: "Sekretaris",     bisaInputMasuk: false, bisaInputKeluar: false, bisaLihatDetail: true,  bisaLihatIuran: true,  bisaHapus: false, bisaExport: false, maxNominalInput: 0      },
        { jabatan: "Humas",          bisaInputMasuk: true,  bisaInputKeluar: false, bisaLihatDetail: false, bisaLihatIuran: false, bisaHapus: false, bisaExport: false, maxNominalInput: 200000 },
      ],
      notifJatuhTempo  : true,
      notifIuranLunas  : true,
      notifPengeluaran : false,
      notifSaldoMenipis: true,
    },
    ContentAccess: {
      pengumumanDefaultVisibilitas: "TANYA",
      pengumumanSiapaBuat         : "PENGURUS",
      agendaDefaultVisibilitas    : "TANYA",
      agendaSiapaBuat             : "PENGURUS",
      fotoDefaultVisibilitas      : "TANYA",
      fotoSiapaUpload             : "SEMUA_ANGGOTA",
      fotoPerluApproval           : true,
    },
  },
  Voting: [
    {
      ID_Voting: "VOTE-001",
      Judul: "Lokasi Rapat Kerja Akbar 2026",
      Deskripsi: "Silakan rekan-rekan memilih lokasi yang paling kondusif untuk Rapat Kerja Akbar Remaja Legok 03 periode 2026/2027.",
      Tanggal_Dibuat: "2026-07-20",
      Tanggal_Berakhir: "2026-07-30",
      Status: "AKTIF",
      Pilihan: [
        { ID_Option: "OPT-1", Nama_Pilihan: "Balai Desa Gondoriyo", Jumlah_Suara: 3 },
        { ID_Option: "OPT-2", Nama_Pilihan: "Omah Kopi Jambu", Jumlah_Suara: 7 },
        { ID_Option: "OPT-3", Nama_Pilihan: "Kampoeng Rawa Ambarawa", Jumlah_Suara: 2 }
      ],
      Pemilih: ["RL03-001", "RL03-002", "RL03-003"],
      Kategori_Akses: "ANGGOTA",
      Dibuat_Oleh: "SA-001"
    },
    {
      ID_Voting: "VOTE-002",
      Judul: "Pilihan Warna Jaket Komunitas",
      Deskripsi: "Menentukan warna dasar untuk jaket resmi kepengurusan baru Remaja Legok 03.",
      Tanggal_Dibuat: "2026-07-15",
      Tanggal_Berakhir: "2026-08-05",
      Status: "AKTIF",
      Pilihan: [
        { ID_Option: "OPT-1", Nama_Pilihan: "Hijau Emerald Premium", Jumlah_Suara: 8 },
        { ID_Option: "OPT-2", Nama_Pilihan: "Hitam Stealth Elegan", Jumlah_Suara: 11 },
        { ID_Option: "OPT-3", Nama_Pilihan: "Biru Navy Klasik", Jumlah_Suara: 5 }
      ],
      Pemilih: ["RL03-001"],
      Kategori_Akses: "PUBLIK",
      Dibuat_Oleh: "SA-001"
    }
  ],
  KonfigurasiAPI: [
    {
      ID: "API-01",
      NamaAPI: "Gemini AI",
      Kategori: "Layanan AI",
      KeyField1: "API_KEY",
      ValueField1: "AIzaSy_DEFAULT_KEY_EXAMPLE_8913821",
      Status: "Aktif",
      Keterangan: "Digunakan oleh Chatbot AI Asisten (Server-Side)"
    },
    {
      ID: "API-02",
      NamaAPI: "Google Drive Galeri",
      Kategori: "Penyimpanan",
      KeyField1: "CLIENT_ID",
      ValueField1: "9081230192-example.apps.googleusercontent.com",
      KeyField2: "CLIENT_SECRET",
      ValueField2: "GOCS-SecretKey-Example-12345",
      Status: "Aktif",
      Keterangan: "Digunakan oleh Modul Galeri Foto (Server-Side)"
    },
    {
      ID: "API-03",
      NamaAPI: "Telegram Bot",
      Kategori: "Notifikasi & Telegram",
      KeyField1: "BOT_TOKEN",
      ValueField1: "",
      KeyField2: "CHAT_ID",
      ValueField2: "",
      Status: "Aktif",
      Keterangan: "Penyimpanan foto & video otomatis ke Telegram Channel/Group"
    }
  ],
  PaymentInfo: [],
  PaymentProofs: []
};

// ============================================================
// LOAD & SAVE
// ============================================================

export function loadAppData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultInitialData;

    const parsed = JSON.parse(raw);

    // ✅ FIXED: Deep merge — pastikan semua key dari default tersedia
    // Cegah crash jika localStorage menyimpan versi lama yang kurang field
    return {
      ...defaultInitialData,
      ...parsed,
      Voting: parsed.Voting || defaultInitialData.Voting || [],
      PaymentInfo: parsed.PaymentInfo || defaultInitialData.PaymentInfo || [],
      PaymentProofs: parsed.PaymentProofs || defaultInitialData.PaymentProofs || [],
      KonfigurasiAPI: parsed.KonfigurasiAPI || defaultInitialData.KonfigurasiAPI || [],
      // ✅ Settings di-merge secara dalam agar sub-object tidak hilang
      Settings: {
        ...defaultInitialData.Settings,
        ...(parsed.Settings || {}),
        KasAccess: {
          ...defaultInitialData.Settings.KasAccess,
          ...(parsed.Settings?.KasAccess || {}),
        },
        ContentAccess: {
          ...defaultInitialData.Settings.ContentAccess,
          ...(parsed.Settings?.ContentAccess || {}),
        },
      },
    };
  } catch (e) {
    console.error("[dataStore] Gagal load data, gunakan default:", e);
    return defaultInitialData;
  }
}

export function saveAppData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // ✅ FIXED: Pesan error lebih informatif
    console.error("[dataStore] Gagal menyimpan data:", e);
  }
}

// ✅ ADDED: Reset ke data awal (berguna untuk dev/testing)
export function resetAppData(): AppData {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
  return defaultInitialData;
}

// ✅ ADDED: Ekspor data sebagai JSON string (untuk backup)
export function exportAppData(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

// ============================================================
// ACCESS CONTROL
// ============================================================

export function filterKontenByAkses<
  T extends { Visibilitas?: string; Kategori_Akses?: string }
>(items: T[], role: UserRole): T[] {

  const allowedMap: Record<UserRole, string[]> = {
    TAMU            : ["PUBLIK"],
    ANGGOTA         : ["PUBLIK", "ANGGOTA"],
    HUMAS           : ["PUBLIK", "ANGGOTA", "HUMAS"],
    KEPALA_HUMAS    : ["PUBLIK", "ANGGOTA", "HUMAS", "PENGURUS"],
    SEKRETARIS      : ["PUBLIK", "ANGGOTA", "SEKRETARIS", "PENGURUS"],
    WAKIL_SEKRETARIS: ["PUBLIK", "ANGGOTA", "SEKRETARIS", "PENGURUS"],
    BENDAHARA       : ["PUBLIK", "ANGGOTA", "BENDAHARA",  "PENGURUS"],
    WAKIL_BENDAHARA : ["PUBLIK", "ANGGOTA", "BENDAHARA",  "PENGURUS"],
    KETUA           : ["PUBLIK", "ANGGOTA", "PENGURUS",   "KETUA"],
    WAKIL_KETUA     : ["PUBLIK", "ANGGOTA", "PENGURUS",   "KETUA"],
    PENGURUS        : ["PUBLIK", "ANGGOTA", "PENGURUS"],
    ADMIN           : ["PUBLIK", "ANGGOTA", "PENGURUS",   "KETUA"],
    SUPER_ADMIN     : ["PUBLIK", "ANGGOTA", "PENGURUS", "HUMAS", "SEKRETARIS", "BENDAHARA", "KETUA"],
  };

  const allowedLevels = allowedMap[role] ?? ["PUBLIK"];

  return (items || []).filter(item => {
    const vis = item.Visibilitas || item.Kategori_Akses || "PUBLIK";
    return allowedLevels.includes(vis);
  });
}

export function bisaLihatKas(
  role    : UserRole,
  type    : "saldo_umum" | "kas_saya" | "iuran_semua" | "detail_transaksi" | "hapus_transaksi",
  jabatan?: string
): boolean {
  if (role === "TAMU") return false;
  if (role === "SUPER_ADMIN" || role === "ADMIN" || role === "KETUA") return true;

  if (type === "kas_saya" || type === "saldo_umum") return true;

  if (type === "iuran_semua") {
    return role === "PENGURUS" || role === "BENDAHARA" || role === "SEKRETARIS";
  }

  if (type === "detail_transaksi") {
    if (!jabatan) return false;
    const j = jabatan.toLowerCase();
    return j.includes("bendahara") || j.includes("ketua");
  }

  // hapus_transaksi — hanya SUPER_ADMIN & ADMIN (sudah return true di atas)
  return false;
}

// ============================================================
// LOG AKSES
// ============================================================

export function addLogAkses(
  data      : AppData,
  nama      : string,
  role      : UserRole,
  aksi      : string,
  detail    : string,
  idAnggota = "-"
): AppData {
  const newLog: LogAksesItem = {
    // ✅ FIXED: ID lebih unik — sama dengan auth.ts
    id        : `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    Waktu     : new Date().toLocaleString("id-ID"),
    ID_Anggota: idAnggota,
    Nama      : nama,
    Role      : role,
    Aksi      : aksi,
    Detail    : detail,
  };

  // ✅ FIXED: Pakai konstanta MAX_LOG_ENTRIES
  const updated: AppData = {
    ...data,
    LogAkses: [newLog, ...(data.LogAkses || [])].slice(0, MAX_LOG_ENTRIES),
  };

  saveAppData(updated);
  return updated;
}

// ============================================================
// B.6 GENERATE ID ANGGOTA (10 DIGIT) & BUAT AKUN MINIMAL
// ============================================================

export function generateIdAnggotaUnik(existingMembers?: AnggotaItem[], appDataRef?: any): string {
  // 1. Ambil dari localStorage historical set (ID yang pernah dibuat atau dihapus sebelumnya)
  let historicalSet: Set<string>;
  try {
    const rawHist = localStorage.getItem("remaja_legok_historical_ids");
    historicalSet = new Set(rawHist ? JSON.parse(rawHist) : []);
  } catch {
    historicalSet = new Set();
  }

  // 2. Tambahkan dari existingMembers yang di-pass
  existingMembers?.forEach((m) => {
    if (m?.ID_Anggota) historicalSet.add(m.ID_Anggota);
  });

  // 3. Tambahkan dari seluruh histori data aplikasi (agar ID tidak pernah sama meski akun sudah keluar/dihapus)
  let data = appDataRef;
  if (!data) {
    try {
      const raw = localStorage.getItem("remaja_legok_app_data");
      if (raw) data = JSON.parse(raw);
    } catch {
      // Abaikan jika gagal baca
    }
  }

  if (data) {
    data.Anggota?.forEach((m: any) => m?.ID_Anggota && historicalSet.add(m.ID_Anggota));
    data.PengunduranDiri?.forEach((p: any) => {
      if (p?.IDPengaju) historicalSet.add(p.IDPengaju);
      if (p?.ID_Anggota) historicalSet.add(p.ID_Anggota);
    });
    data.LogAkses?.forEach((l: any) => l?.ID_Anggota && historicalSet.add(l.ID_Anggota));
    data.Kas?.forEach((k: any) => k?.ID_Anggota && historicalSet.add(k.ID_Anggota));
    data.Iuran?.forEach((i: any) => i?.ID_Anggota && historicalSet.add(i.ID_Anggota));
    data.Voting?.forEach((v: any) => v?.Pemilih?.forEach((id: string) => id && historicalSet.add(id)));
    data.Aspirasi?.forEach((a: any) => a?.ID_Anggota && historicalSet.add(a.ID_Anggota));
    data.Galeri?.forEach((g: any) => g?.ID_Anggota_Upload && historicalSet.add(g.ID_Anggota_Upload));
    data.Album?.forEach((a: any) => a?.ID_Anggota_Buat && historicalSet.add(a.ID_Anggota_Buat));
    data.JabatanHistory?.forEach((j: any) => j?.ID_Ketua && historicalSet.add(j.ID_Ketua));
  }

  // 4. Generate tepat 10 angka acak (tanpa huruf atau tanda hubung)
  let idBaru = "";
  let sudahDipakai = true;
  do {
    idBaru = "";
    for (let i = 0; i < 10; i++) {
      idBaru += Math.floor(Math.random() * 10).toString();
    }
    // Pastikan diawali angka 1-9 agar konsisten 10 digit numerik padat
    if (idBaru.startsWith("0")) continue;

    sudahDipakai = historicalSet.has(idBaru);
  } while (sudahDipakai);

  // 5. Simpan ID baru ke historical set di localStorage
  try {
    historicalSet.add(idBaru);
    localStorage.setItem("remaja_legok_historical_ids", JSON.stringify(Array.from(historicalSet)));
  } catch (e) {
    console.error("Gagal menyimpan histori ID:", e);
  }

  return idBaru;
}

export function buatAkunMinimal(
  namaPanggilan: string,
  dibuatOleh: string,
  appData: AppData
): { id: string; updatedData: AppData } {
  const id = generateIdAnggotaUnik(appData.Anggota, appData);
  const today = new Date().toISOString().split("T")[0];

  const newMember: AnggotaItem = {
    ID_Anggota: id,
    Nama_Lengkap: "",
    Nama_Panggilan: namaPanggilan,
    NoWA: "",
    TampilkanWA: "Ya",
    Foto_Profil: "",
    PasswordHash: "",
    StatusPassword: "BelumDiatur",
    Role: "ANGGOTA",
    Status_Jabatan: "Aktif",
    Dibuat_Oleh: dibuatOleh,
    Tanggal_Daftar: today,
    Status_Aktif: "AKTIF",
    Status_Tampil: "TAMPIL",
    Izin_NoHP: true,
    Izin_TanggalLahir: true,
    Izin_Minat: true,
  };

  const updatedData: AppData = {
    ...appData,
    Anggota: [newMember, ...(appData.Anggota || [])],
  };

  saveAppData(updatedData);
  return { id, updatedData };
}
