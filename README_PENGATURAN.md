// src/types/settings.ts

// ============================================================
// USER SETTINGS
// ============================================================

export interface NotifikasiSettings {
  agenda     : boolean;
  pengumuman : boolean;
  h_min_1    : boolean;
  kas        : boolean;
  metode     : ('in_app' | 'whatsapp')[];
}

export interface PrivasiSettings {
  tampilkan_no_hp      : boolean;
  tampilkan_tgl_lahir  : boolean;
  terima_pesan_anggota : boolean;
}

export interface TampilanSettings {
  dark_mode  : boolean;
  ukuran_teks: 'kecil' | 'normal' | 'besar' | 'sangat_besar';
  bahasa     : 'id' | 'en' | 'jv';
  tema       : 'green' | 'blue' | 'rose' | 'amber' | 'purple';
}

export interface UserSettings {
  notifikasi: NotifikasiSettings;
  privasi   : PrivasiSettings;
  tampilan  : TampilanSettings;
}

// ✅ Fix Bug 4: Role konsisten dengan sistem PIN
export type UserRole = 'tamu' | 'anggota' | 'pengurus' | 'ketua' | 'super_admin';

export interface UserDocument {
  uid          : string;
  nama_lengkap : string;
  no_whatsapp  : string;
  role         : UserRole;
  id_anggota  ?: string; // RL03-001, dll
  settings     : UserSettings;
  created_at   : string;
  updated_at   : string;
}

// ============================================================
// COMMUNITY SETTINGS
// ============================================================

export interface ProfilKomunitas {
  nama      : string;
  alamat    : string;
  deskripsi : string;
  logo_url  : string;
}

export interface KeuanganSettings {
  iuran_default        : number;
  sistem_kas_aktif     : boolean;
  visibilitas_laporan  : 'semua_anggota' | 'pengurus_saja' | 'publik';
}

export interface AgendaSettings {
  absensi_otomatis  : boolean;
  qr_checkin        : boolean;
  kategori_default  : string[];
}

export interface AIAssistantSettings {
  aktif       : boolean;
  gaya_bahasa : 'formal' | 'semi_formal' | 'santai';
  panjang_teks: 'singkat' | 'sedang' | 'panjang';
}

export interface CommunityDocument {
  id         : string;
  profil     : ProfilKomunitas;
  keuangan   : KeuanganSettings;
  agenda     : AgendaSettings;
  ai_assistant: AIAssistantSettings;
  updated_at : string;
  updated_by : string;
}