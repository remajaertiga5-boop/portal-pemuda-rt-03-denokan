import { UserRole } from "../types";

export type PermissionLevel = "FULL" | "VIEW" | "LIMITED" | "NONE";

export interface RolePermissionDetail {
  level: PermissionLevel;
  note?: string; // e.g. "buat", "ikut", "hanya data sendiri"
}

export interface ModulePermissionRow {
  modulKey: string;
  modulName: string;
  kategori: string;
  permissions: Record<UserRole, RolePermissionDetail>;
}

// Helper to construct permission detail
const P = (level: PermissionLevel, note?: string): RolePermissionDetail => ({ level, note });

export const MODULE_PERMISSIONS_MATRIX: ModulePermissionRow[] = [
  {
    modulKey: "dasbor",
    modulName: "Dasbor",
    kategori: "Umum",
    permissions: {
      SUPER_ADMIN: P("FULL"),
      KETUA: P("FULL"),
      ADMIN: P("FULL"),
      WAKIL_KETUA: P("FULL"),
      SEKRETARIS: P("FULL"),
      WAKIL_SEKRETARIS: P("FULL"),
      BENDAHARA: P("FULL"),
      WAKIL_BENDAHARA: P("FULL"),
      KEPALA_HUMAS: P("FULL"),
      HUMAS: P("FULL"),
      PENGURUS: P("FULL"),
      ANGGOTA: P("FULL"),
      TAMU: P("FULL"),
    },
  },
  {
    modulKey: "pengumuman",
    modulName: "Pengumuman",
    kategori: "Informasi",
    permissions: {
      SUPER_ADMIN: P("FULL"),
      KETUA: P("FULL"),
      ADMIN: P("FULL"),
      WAKIL_KETUA: P("FULL"),
      SEKRETARIS: P("FULL"),
      WAKIL_SEKRETARIS: P("VIEW"),
      BENDAHARA: P("VIEW"),
      WAKIL_BENDAHARA: P("VIEW"),
      KEPALA_HUMAS: P("VIEW"),
      HUMAS: P("VIEW"),
      PENGURUS: P("VIEW"),
      ANGGOTA: P("VIEW"),
      TAMU: P("VIEW"),
    },
  },
  {
    modulKey: "keuangan",
    modulName: "Keuangan",
    kategori: "Keuangan",
    permissions: {
      SUPER_ADMIN: P("FULL"),
      KETUA: P("VIEW"),
      ADMIN: P("VIEW"),
      WAKIL_KETUA: P("VIEW"),
      SEKRETARIS: P("VIEW"),
      WAKIL_SEKRETARIS: P("NONE"),
      BENDAHARA: P("FULL"),
      WAKIL_BENDAHARA: P("FULL"),
      KEPALA_HUMAS: P("VIEW"),
      HUMAS: P("NONE"),
      PENGURUS: P("LIMITED", "Laporan Kas Publik"),
      ANGGOTA: P("LIMITED", "Iuran Sendiri"),
      TAMU: P("NONE"),
    },
  },
  {
    modulKey: "kas_wajib",
    modulName: "Kas Wajib (bagian Keuangan)",
    kategori: "Keuangan",
    permissions: {
      SUPER_ADMIN: P("FULL"),
      KETUA: P("VIEW"),
      ADMIN: P("VIEW"),
      WAKIL_KETUA: P("NONE"),
      SEKRETARIS: P("NONE"),
      WAKIL_SEKRETARIS: P("NONE"),
      BENDAHARA: P("VIEW"),
      WAKIL_BENDAHARA: P("VIEW"),
      KEPALA_HUMAS: P("FULL"),
      HUMAS: P("NONE"),
      PENGURUS: P("LIMITED", "Hanya Data Sendiri"),
      ANGGOTA: P("LIMITED", "Hanya Data Sendiri"),
      TAMU: P("NONE"),
    },
  },
  {
    modulKey: "bayar_iuran",
    modulName: "Bayar Iuran",
    kategori: "Keuangan",
    permissions: {
      SUPER_ADMIN: P("FULL"),
      KETUA: P("VIEW"),
      ADMIN: P("VIEW"),
      WAKIL_KETUA: P("NONE"),
      SEKRETARIS: P("NONE"),
      WAKIL_SEKRETARIS: P("NONE"),
      BENDAHARA: P("FULL"),
      WAKIL_BENDAHARA: P("FULL"),
      KEPALA_HUMAS: P("VIEW"),
      HUMAS: P("NONE"),
      PENGURUS: P("LIMITED", "Iuran Sendiri"),
      ANGGOTA: P("LIMITED", "Iuran Sendiri"),
      TAMU: P("NONE"),
    },
  },
  {
    modulKey: "absensi",
    modulName: "Absensi",
    kategori: "Kegiatan",
    permissions: {
      SUPER_ADMIN: P("FULL"),
      KETUA: P("FULL"),
      ADMIN: P("FULL"),
      WAKIL_KETUA: P("FULL"),
      SEKRETARIS: P("FULL"),
      WAKIL_SEKRETARIS: P("FULL"),
      BENDAHARA: P("VIEW"),
      WAKIL_BENDAHARA: P("VIEW"),
      KEPALA_HUMAS: P("FULL"),
      HUMAS: P("FULL"),
      PENGURUS: P("LIMITED", "Absen Sendiri"),
      ANGGOTA: P("LIMITED", "Absen Sendiri"),
      TAMU: P("NONE"),
    },
  },
  {
    modulKey: "absensi_kegiatan",
    modulName: "Absensi Kegiatan",
    kategori: "Kegiatan",
    permissions: {
      SUPER_ADMIN: P("FULL"),
      KETUA: P("FULL"),
      ADMIN: P("FULL"),
      WAKIL_KETUA: P("FULL"),
      SEKRETARIS: P("FULL"),
      WAKIL_SEKRETARIS: P("FULL"),
      BENDAHARA: P("VIEW"),
      WAKIL_BENDAHARA: P("VIEW"),
      KEPALA_HUMAS: P("FULL"),
      HUMAS: P("FULL"),
      PENGURUS: P("LIMITED", "Absen Sendiri"),
      ANGGOTA: P("LIMITED", "Absen Sendiri"),
      TAMU: P("NONE"),
    },
  },
  {
    modulKey: "galeri",
    modulName: "Galeri",
    kategori: "Media",
    permissions: {
      SUPER_ADMIN: P("FULL"),
      KETUA: P("FULL"),
      ADMIN: P("FULL"),
      WAKIL_KETUA: P("FULL"),
      SEKRETARIS: P("VIEW"),
      WAKIL_SEKRETARIS: P("VIEW"),
      BENDAHARA: P("VIEW"),
      WAKIL_BENDAHARA: P("VIEW"),
      KEPALA_HUMAS: P("FULL"),
      HUMAS: P("FULL"),
      PENGURUS: P("VIEW"),
      ANGGOTA: P("VIEW"),
      TAMU: P("VIEW"),
    },
  },
  {
    modulKey: "anggota",
    modulName: "Anggota (Data Master)",
    kategori: "Keanggotaan",
    permissions: {
      SUPER_ADMIN: P("FULL"),
      KETUA: P("FULL"),
      ADMIN: P("FULL"),
      WAKIL_KETUA: P("VIEW"),
      SEKRETARIS: P("FULL"),
      WAKIL_SEKRETARIS: P("VIEW"),
      BENDAHARA: P("VIEW"),
      WAKIL_BENDAHARA: P("VIEW"),
      KEPALA_HUMAS: P("VIEW"),
      HUMAS: P("VIEW"),
      PENGURUS: P("LIMITED", "Data Profil Sendiri"),
      ANGGOTA: P("LIMITED", "Data Profil Sendiri"),
      TAMU: P("NONE"),
    },
  },
  {
    modulKey: "kartu_anggota",
    modulName: "Kartu Anggota",
    kategori: "Keanggotaan",
    permissions: {
      SUPER_ADMIN: P("FULL"),
      KETUA: P("FULL"),
      ADMIN: P("FULL"),
      WAKIL_KETUA: P("FULL"),
      SEKRETARIS: P("FULL"),
      WAKIL_SEKRETARIS: P("FULL"),
      BENDAHARA: P("FULL"),
      WAKIL_BENDAHARA: P("FULL"),
      KEPALA_HUMAS: P("FULL"),
      HUMAS: P("FULL"),
      PENGURUS: P("LIMITED", "Kartu Sendiri"),
      ANGGOTA: P("LIMITED", "Kartu Sendiri"),
      TAMU: P("NONE"),
    },
  },
  {
    modulKey: "aspirasi_kelola",
    modulName: "Aspirasi (Kelola)",
    kategori: "Interaksi",
    permissions: {
      SUPER_ADMIN: P("FULL"),
      KETUA: P("FULL"),
      ADMIN: P("FULL"),
      WAKIL_KETUA: P("FULL"),
      SEKRETARIS: P("FULL"),
      WAKIL_SEKRETARIS: P("FULL"),
      BENDAHARA: P("VIEW"),
      WAKIL_BENDAHARA: P("VIEW"),
      KEPALA_HUMAS: P("VIEW"),
      HUMAS: P("VIEW"),
      PENGURUS: P("LIMITED", "Status Usulan Sendiri"),
      ANGGOTA: P("LIMITED", "Status Usulan Sendiri"),
      TAMU: P("NONE"),
    },
  },
  {
    modulKey: "kirim_aspirasi",
    modulName: "Kirim Ide / Aspirasi",
    kategori: "Interaksi",
    permissions: {
      SUPER_ADMIN: P("FULL"),
      KETUA: P("FULL"),
      ADMIN: P("FULL"),
      WAKIL_KETUA: P("FULL"),
      SEKRETARIS: P("FULL"),
      WAKIL_SEKRETARIS: P("FULL"),
      BENDAHARA: P("FULL"),
      WAKIL_BENDAHARA: P("FULL"),
      KEPALA_HUMAS: P("FULL"),
      HUMAS: P("FULL"),
      PENGURUS: P("FULL"),
      ANGGOTA: P("FULL"),
      TAMU: P("FULL"),
    },
  },
  {
    modulKey: "voting",
    modulName: "Voting",
    kategori: "Interaksi",
    permissions: {
      SUPER_ADMIN: P("FULL", "Buat & Kelola"),
      KETUA: P("FULL", "Buat Sesi"),
      ADMIN: P("FULL", "Buat Sesi"),
      WAKIL_KETUA: P("NONE"),
      SEKRETARIS: P("FULL", "Buat Sesi"),
      WAKIL_SEKRETARIS: P("NONE"),
      BENDAHARA: P("NONE"),
      WAKIL_BENDAHARA: P("NONE"),
      KEPALA_HUMAS: P("NONE"),
      HUMAS: P("NONE"),
      PENGURUS: P("FULL", "Ikut Memilih"),
      ANGGOTA: P("FULL", "Ikut Memilih"),
      TAMU: P("NONE"),
    },
  },
  {
    modulKey: "struktur_organisasi",
    modulName: "Struktur Organisasi",
    kategori: "Organisasi",
    permissions: {
      SUPER_ADMIN: P("FULL"),
      KETUA: P("FULL"),
      ADMIN: P("FULL"),
      WAKIL_KETUA: P("LIMITED", "Jabatan Sendiri"),
      SEKRETARIS: P("FULL"),
      WAKIL_SEKRETARIS: P("LIMITED", "Jabatan Sendiri"),
      BENDAHARA: P("LIMITED", "Jabatan Sendiri"),
      WAKIL_BENDAHARA: P("LIMITED", "Jabatan Sendiri"),
      KEPALA_HUMAS: P("LIMITED", "Jabatan Sendiri"),
      HUMAS: P("LIMITED", "Jabatan Sendiri"),
      PENGURUS: P("LIMITED", "Jabatan Sendiri"),
      ANGGOTA: P("LIMITED", "Jabatan Sendiri"),
      TAMU: P("NONE"),
    },
  },
  {
    modulKey: "ai_asisten",
    modulName: "AI Asisten",
    kategori: "Layanan Smart",
    permissions: {
      SUPER_ADMIN: P("FULL"),
      KETUA: P("FULL"),
      ADMIN: P("FULL"),
      WAKIL_KETUA: P("FULL"),
      SEKRETARIS: P("FULL"),
      WAKIL_SEKRETARIS: P("FULL"),
      BENDAHARA: P("FULL"),
      WAKIL_BENDAHARA: P("FULL"),
      KEPALA_HUMAS: P("FULL"),
      HUMAS: P("FULL"),
      PENGURUS: P("FULL"),
      ANGGOTA: P("FULL"),
      TAMU: P("NONE"),
    },
  },
  {
    modulKey: "pengaturan_profil",
    modulName: "Pengaturan (Profil Sendiri)",
    kategori: "Pengaturan",
    permissions: {
      SUPER_ADMIN: P("FULL"),
      KETUA: P("FULL"),
      ADMIN: P("FULL"),
      WAKIL_KETUA: P("FULL"),
      SEKRETARIS: P("FULL"),
      WAKIL_SEKRETARIS: P("FULL"),
      BENDAHARA: P("FULL"),
      WAKIL_BENDAHARA: P("FULL"),
      KEPALA_HUMAS: P("FULL"),
      HUMAS: P("FULL"),
      PENGURUS: P("FULL"),
      ANGGOTA: P("FULL"),
      TAMU: P("FULL"),
    },
  },
  {
    modulKey: "super_admin_panel",
    modulName: "Super Admin Panel",
    kategori: "Sistem & Keamanan",
    permissions: {
      SUPER_ADMIN: P("FULL"),
      KETUA: P("NONE"),
      ADMIN: P("NONE"),
      WAKIL_KETUA: P("NONE"),
      SEKRETARIS: P("NONE"),
      WAKIL_SEKRETARIS: P("NONE"),
      BENDAHARA: P("NONE"),
      WAKIL_BENDAHARA: P("NONE"),
      KEPALA_HUMAS: P("NONE"),
      HUMAS: P("NONE"),
      PENGURUS: P("NONE"),
      ANGGOTA: P("NONE"),
      TAMU: P("NONE"),
    },
  },
  {
    modulKey: "log_aktivitas",
    modulName: "Log Aktivitas Sistem",
    kategori: "Sistem & Keamanan",
    permissions: {
      SUPER_ADMIN: P("FULL"),
      KETUA: P("NONE"),
      ADMIN: P("NONE"),
      WAKIL_KETUA: P("NONE"),
      SEKRETARIS: P("NONE"),
      WAKIL_SEKRETARIS: P("NONE"),
      BENDAHARA: P("NONE"),
      WAKIL_BENDAHARA: P("NONE"),
      KEPALA_HUMAS: P("NONE"),
      HUMAS: P("NONE"),
      PENGURUS: P("NONE"),
      ANGGOTA: P("NONE"),
      TAMU: P("NONE"),
    },
  },
  {
    modulKey: "integrasi_api",
    modulName: "Integrasi API",
    kategori: "Sistem & Keamanan",
    permissions: {
      SUPER_ADMIN: P("FULL"),
      KETUA: P("NONE"),
      ADMIN: P("NONE"),
      WAKIL_KETUA: P("NONE"),
      SEKRETARIS: P("NONE"),
      WAKIL_SEKRETARIS: P("NONE"),
      BENDAHARA: P("NONE"),
      WAKIL_BENDAHARA: P("NONE"),
      KEPALA_HUMAS: P("NONE"),
      HUMAS: P("NONE"),
      PENGURUS: P("NONE"),
      ANGGOTA: P("NONE"),
      TAMU: P("NONE"),
    },
  },
];

/**
 * Check if a role has access to a specific module according to Matriks Hak Akses (Bagian I)
 */
export function getRoleModulePermission(
  modulKey: string,
  userRole: UserRole
): RolePermissionDetail {
  const row = MODULE_PERMISSIONS_MATRIX.find(
    (item) => item.modulKey.toLowerCase() === modulKey.toLowerCase()
  );

  if (!row) {
    return P("NONE");
  }

  return row.permissions[userRole] || P("NONE");
}

/**
 * Boolean helper: Can user edit/manage module?
 */
export function canManageModule(modulKey: string, userRole: UserRole): boolean {
  const perm = getRoleModulePermission(modulKey, userRole);
  return perm.level === "FULL";
}

/**
 * Boolean helper: Can user view module?
 */
export function canViewModule(modulKey: string, userRole: UserRole): boolean {
  const perm = getRoleModulePermission(modulKey, userRole);
  return perm.level === "FULL" || perm.level === "VIEW" || perm.level === "LIMITED";
}
