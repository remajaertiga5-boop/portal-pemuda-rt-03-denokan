import { AppData, addLogAkses } from "./dataStore";
import { UserRole, PengunduranDiriItem, JabatanKosongItem } from "../types";

/**
 * F.4 Matrix Otoritas Approval Pengunduran Diri per Jabatan
 * Returns the required Role to approve resignation for a given position.
 */
export function getApprovalRoleForResignation(jabatan: string): UserRole {
  const norm = (jabatan || "").toLowerCase().trim();
  if (norm.includes("wakil ketua") || norm === "wakil_ketua") return "KETUA";
  if (norm.includes("ketua")) return "SEKRETARIS"; // (Or SUPER_ADMIN / SEKRETARIS)
  if (norm.includes("wakil sekretaris") || norm === "wakil_sekretaris") return "SEKRETARIS";
  if (norm.includes("sekretaris")) return "KETUA";
  if (norm.includes("wakil bendahara") || norm === "wakil_bendahara") return "BENDAHARA";
  if (norm.includes("bendahara")) return "KETUA";
  if (norm.includes("kepala humas") || norm === "kepala_humas") return "KETUA";
  if (norm.includes("humas")) return "KEPALA_HUMAS";
  return "KETUA";
}

/**
 * Checks if a user with given userRole can approve a resignation request for candidatePosition
 */
export function canApproveResignation(approverRole: UserRole, candidatePosition: string): boolean {
  if (approverRole === "SUPER_ADMIN") return true; // Super Admin overrides everything
  const requiredRole = getApprovalRoleForResignation(candidatePosition);
  return approverRole === requiredRole;
}

/**
 * F.2 & F.3 Cascading Promotion & Vacancy Logic
 * Handles automatic promotion when a position is vacated, or adds to JabatanKosong.
 */
export function processVacatedPosition(
  appData: AppData,
  vacatedMemberId: string,
  vacatedPositionName: string,
  operatorName: string,
  operatorRole: UserRole,
  reason: string = "Pengunduran Diri / Diberhentikan"
): AppData {
  const todayStr = new Date().toISOString().split("T")[0];
  const normPos = (vacatedPositionName || "").toLowerCase().trim();

  let updatedAnggota = [...appData.Anggota];
  let existingKosong = [...(appData.JabatanKosong || [])];
  let newKosongEntries: JabatanKosongItem[] = [];
  let logDetail = "";

  // Helper to mark member nonactive/anggota
  const demoteMember = (mId: string) => {
    updatedAnggota = updatedAnggota.map(m => {
      if (m.ID_Anggota === mId) {
        return {
          ...m,
          Role: "ANGGOTA" as UserRole,
          Jabatan: "Anggota",
          Status_Jabatan: "Nonaktif"
        };
      }
      return m;
    });
  };

  if (normPos.includes("bendahara") && !normPos.includes("wakil")) {
    // F.3: Bendahara Kosong
    demoteMember(vacatedMemberId);

    // CEK Wakil Bendahara aktif?
    const wakilBendahara = updatedAnggota.find(
      m => (m.Role === "WAKIL_BENDAHARA" || m.Jabatan?.toLowerCase() === "wakil bendahara") &&
           (m.Status_Jabatan === "Aktif" || m.Status_Aktif === "AKTIF")
    );

    if (wakilBendahara) {
      // ADA -> Wakil Bendahara naik jadi Bendahara, posisi wakil_bendahara kosong
      updatedAnggota = updatedAnggota.map(m => {
        if (m.ID_Anggota === wakilBendahara.ID_Anggota) {
          return {
            ...m,
            Role: "BENDAHARA" as UserRole,
            Jabatan: "Bendahara",
            Status_Jabatan: "Aktif",
            Tanggal_Menjabat: todayStr
          };
        }
        return m;
      });

      newKosongEntries.push({
        ID: `JK-${Date.now()}-1`,
        Jabatan: "Wakil Bendahara",
        Tanggal: todayStr,
        Status: "BelumTerisi"
      });

      logDetail = `Bendahara (${vacatedMemberId}) mundur/kosong. Wakil Bendahara (${wakilBendahara.Nama_Lengkap}) otomatis naik menjadi Bendahara. Posisi Wakil Bendahara sekarang kosong.`;
    } else {
      // TIDAK -> Posisi bendahara kosong
      newKosongEntries.push({
        ID: `JK-${Date.now()}-1`,
        Jabatan: "Bendahara",
        Tanggal: todayStr,
        Status: "BelumTerisi"
      });

      logDetail = `Bendahara (${vacatedMemberId}) mundur/kosong. Tidak ada Wakil Bendahara aktif, posisi Bendahara dicatat di JabatanKosong.`;
    }
  } else if (normPos.includes("sekretaris") && !normPos.includes("wakil")) {
    // F.2: Sekretaris Kosong
    demoteMember(vacatedMemberId);

    // CEK Wakil Sekretaris aktif?
    const wakilSekretaris = updatedAnggota.find(
      m => (m.Role === "WAKIL_SEKRETARIS" || m.Jabatan?.toLowerCase() === "wakil sekretaris") &&
           (m.Status_Jabatan === "Aktif" || m.Status_Aktif === "AKTIF")
    );

    if (wakilSekretaris) {
      // ADA -> Wakil Sekretaris naik jadi Sekretaris, posisi wakil_sekretaris kosong
      updatedAnggota = updatedAnggota.map(m => {
        if (m.ID_Anggota === wakilSekretaris.ID_Anggota) {
          return {
            ...m,
            Role: "SEKRETARIS" as UserRole,
            Jabatan: "Sekretaris",
            Status_Jabatan: "Aktif",
            Tanggal_Menjabat: todayStr
          };
        }
        return m;
      });

      newKosongEntries.push({
        ID: `JK-${Date.now()}-1`,
        Jabatan: "Wakil Sekretaris",
        Tanggal: todayStr,
        Status: "BelumTerisi"
      });

      logDetail = `Sekretaris (${vacatedMemberId}) mundur/kosong. Wakil Sekretaris (${wakilSekretaris.Nama_Lengkap}) otomatis naik menjadi Sekretaris. Posisi Wakil Sekretaris sekarang kosong.`;
    } else {
      newKosongEntries.push({
        ID: `JK-${Date.now()}-1`,
        Jabatan: "Sekretaris",
        Tanggal: todayStr,
        Status: "BelumTerisi"
      });

      logDetail = `Sekretaris (${vacatedMemberId}) mundur/kosong. Tidak ada Wakil Sekretaris aktif, posisi Sekretaris dicatat di JabatanKosong.`;
    }
  } else if (normPos.includes("ketua") && !normPos.includes("wakil")) {
    // Ketua Kosong
    demoteMember(vacatedMemberId);

    // CEK Wakil Ketua aktif?
    const wakilKetua = updatedAnggota.find(
      m => (m.Role === "WAKIL_KETUA" || m.Jabatan?.toLowerCase() === "wakil ketua") &&
           (m.Status_Jabatan === "Aktif" || m.Status_Aktif === "AKTIF")
    );

    if (wakilKetua) {
      updatedAnggota = updatedAnggota.map(m => {
        if (m.ID_Anggota === wakilKetua.ID_Anggota) {
          return {
            ...m,
            Role: "KETUA" as UserRole,
            Jabatan: "Ketua",
            Status_Jabatan: "Aktif",
            Tanggal_Menjabat: todayStr
          };
        }
        return m;
      });

      newKosongEntries.push({
        ID: `JK-${Date.now()}-1`,
        Jabatan: "Wakil Ketua",
        Tanggal: todayStr,
        Status: "BelumTerisi"
      });

      logDetail = `Ketua (${vacatedMemberId}) mundur/kosong. Wakil Ketua (${wakilKetua.Nama_Lengkap}) otomatis naik menjadi Ketua. Posisi Wakil Ketua sekarang kosong.`;
    } else {
      newKosongEntries.push({
        ID: `JK-${Date.now()}-1`,
        Jabatan: "Ketua",
        Tanggal: todayStr,
        Status: "BelumTerisi"
      });

      logDetail = `Ketua (${vacatedMemberId}) mundur/kosong. Tidak ada Wakil Ketua aktif, posisi Ketua dicatat di JabatanKosong.`;
    }
  } else if (normPos.includes("kepala humas") || normPos.includes("kepalahumas")) {
    // Kepala Humas Kosong
    demoteMember(vacatedMemberId);

    const humasMember = updatedAnggota.find(
      m => (m.Role === "HUMAS" || m.Jabatan?.toLowerCase() === "humas") &&
           (m.Status_Jabatan === "Aktif" || m.Status_Aktif === "AKTIF")
    );

    if (humasMember) {
      updatedAnggota = updatedAnggota.map(m => {
        if (m.ID_Anggota === humasMember.ID_Anggota) {
          return {
            ...m,
            Role: "KEPALA_HUMAS" as UserRole,
            Jabatan: "Kepala Humas",
            Status_Jabatan: "Aktif",
            Tanggal_Menjabat: todayStr
          };
        }
        return m;
      });

      newKosongEntries.push({
        ID: `JK-${Date.now()}-1`,
        Jabatan: "Humas",
        Tanggal: todayStr,
        Status: "BelumTerisi"
      });

      logDetail = `Kepala Humas (${vacatedMemberId}) mundur/kosong. Member Humas (${humasMember.Nama_Lengkap}) otomatis naik menjadi Kepala Humas. Posisi Humas sekarang kosong.`;
    } else {
      newKosongEntries.push({
        ID: `JK-${Date.now()}-1`,
        Jabatan: "Kepala Humas",
        Tanggal: todayStr,
        Status: "BelumTerisi"
      });

      logDetail = `Kepala Humas (${vacatedMemberId}) mundur/kosong. Posisi Kepala Humas dicatat di JabatanKosong.`;
    }
  } else {
    // Regular Position vacant
    demoteMember(vacatedMemberId);

    newKosongEntries.push({
      ID: `JK-${Date.now()}-1`,
      Jabatan: vacatedPositionName,
      Tanggal: todayStr,
      Status: "BelumTerisi"
    });

    logDetail = `Jabatan ${vacatedPositionName} (${vacatedMemberId}) kosong. Dicatat di JabatanKosong.`;
  }

  const updatedData: AppData = {
    ...appData,
    Anggota: updatedAnggota,
    JabatanKosong: [...newKosongEntries, ...existingKosong]
  };

  return addLogAkses(
    updatedData,
    operatorName,
    operatorRole,
    "POSITION_VACATED",
    `${logDetail} Alasan: ${reason}`
  );
}
