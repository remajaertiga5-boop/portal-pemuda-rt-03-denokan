// ============================================================
// 🚀 SUPABASE EDGE FUNCTION — sync-sheets
//    Pemicu: dipanggil dari GAS atau cron-job
//    Fungsi: tarik data dari GAS API, upsert ke Supabase
//
// 📦 Deploy: supabase functions deploy sync-sheets
// 🧪 Test:   curl https://xxx.supabase.co/functions/v1/sync-sheets
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ⚙️ KONFIG — ganti sesuai environment
const GAS_URL = Deno.env.get("GAS_BASE_URL")!;          // https://script.google.com/macros/s/AKfycbxxx/exec
const TABLES  = ["Anggota", "Agenda", "Pengumuman", "Kas", "Aspirasi", "Galeri"];

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ============================================================
// 📥 COLUMN MAP: GAS column → Supabase column
// ============================================================
const COLUMN_MAP: Record<string, Record<string, string>> = {
  Anggota: {
    ID_Anggota: "id_anggota", Nama_Lengkap: "nama_lengkap", Nama_Panggilan: "nama_panggilan",
    Email: "email", Jabatan: "jabatan", Alamat: "alamat", No_HP: "no_hp",
    Jenis_Kelamin: "jenis_kelamin", Tanggal_Lahir: "tanggal_lahir",
    Minat_Bakat: "minat_bakat", Foto_Profil: "foto_profil",
    Status_Aktif: "status_aktif", Status_Tampil: "status_tampil",
    Tanggal_Daftar: "tanggal_daftar", Izin_NoHP: "izin_nohp",
    Izin_TanggalLahir: "izin_tanggallahir", Izin_Minat: "izin_minat",
    Role: "role", Bio: "bio", Terakhir_Diubah: "terakhir_diubah",
  },
  Agenda: {
    ID: "id", Tanggal: "tanggal", Waktu: "waktu", "Nama Kegiatan": "nama_kegiatan",
    Lokasi: "lokasi", Kategori: "kategori", Keterangan: "keterangan",
    Visibilitas: "visibilitas", Pembuat: "pembuat", Status: "status",
  },
  Pengumuman: {
    ID: "id", Tanggal: "tanggal", Judul: "judul", Isi: "isi",
    Penulis: "penulis", Kategori: "kategori", LampiranURL: "lampiran_url",
    Visibilitas: "visibilitas", isPenting: "is_penting",
    DibroadcastKeTelegram: "dibroadcast_telegram",
  },
  Kas: {
    ID: "id", Tanggal: "tanggal", Jenis: "jenis", Nominal: "nominal",
    Pemasukan: "pemasukan", Pengeluaran: "pengeluaran", Saldo: "saldo",
    Kategori: "kategori", Sub_Kategori: "sub_kategori", Keterangan: "keterangan",
    Petugas: "petugas", Metode_Bayar: "metode_bayar", Bukti_Nota: "bukti_nota",
    Status: "status", Approval_By: "approval_by",
    Waktu_Input: "waktu_input", Waktu_Edit: "waktu_edit",
  },
  Aspirasi: {
    ID: "id", Tanggal: "tanggal", Usulan: "usulan", Pengirim: "pengirim",
    ID_Anggota: "id_anggota", Kategori: "kategori", Status: "status",
    Tanggapan: "tanggapan", Tanggapan_Oleh: "tanggapan_oleh",
    Jumlah_Dukung: "jumlah_dukung", Likes: "likes",
  },
  Galeri: {
    ID: "id", Tanggal: "tanggal", Judul_Kegiatan: "judul_kegiatan",
    Foto_URL: "foto_url", Kategori: "kategori", Deskripsi: "deskripsi",
    Uploader: "uploader", Nama_Upload: "nama_upload", Role_Upload: "role_upload",
    Status_Approval: "status_approval", Is_Video: "is_video",
    Jenis_Media: "jenis_media", Caption: "caption",
    Album_ID: "album_id", Kategori_Akses: "kategori_akses",
  },
};

// ============================================================
// 🔧 HELPERS
// ============================================================
function mapRow(row: Record<string, unknown>, gasTable: string): Record<string, unknown> {
  const map = COLUMN_MAP[gasTable];
  const out: Record<string, unknown> = {};
  for (const [gas, supabase] of Object.entries(map)) {
    let val = row[gas];
    // Type conversions
    const bools = ["is_penting", "dibroadcast_telegram", "is_video", "izin_nohp", "izin_tanggallahir", "izin_minat"];
    const nums  = ["nominal", "pemasukan", "pengeluaran", "saldo", "jumlah_dukung"];
    const dates = ["tanggal", "tanggal_lahir", "tanggal_daftar"];

    if (bools.includes(supabase))  val = val === "TRUE" || val === true || val === "true";
    if (nums.includes(supabase))   val = parseFloat(String(val ?? "0")) || 0;
    if (dates.includes(supabase) && val) {
      const d = new Date(String(val));
      val = isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
    }
    if (supabase === "likes" && typeof val === "string") {
      try { val = JSON.parse(val); } catch { val = []; }
    }
    out[supabase] = val ?? "";
  }
  // Exclude row metadata from GAS
  delete out["_row"];
  return out;
}

async function fetchFromGAS(table: string): Promise<Record<string, unknown>[]> {
  const url = `${GAS_URL}?action=read&table=${table}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GAS fetch failed: ${res.status} ${res.statusText}`);
  const json = await res.json();
  return json.data || [];
}

async function upsertToSupabase(supabaseTable: string, rows: Record<string, unknown>[]) {
  // Upsert per row (karena PK beda: text id_anggota vs UUID)
  for (const row of rows) {
    const idCol = supabaseTable === "anggota" ? "id_anggota" : "id";
    const idVal = row[idCol];

    if (!idVal) continue;

    const { error } = await supabase
      .from(supabaseTable)
      .upsert(row, { onConflict: idCol, ignoreDuplicates: false });

    if (error) console.error(`  ❌ ${supabaseTable} ${idVal}: ${error.message}`);
  }
}

// ============================================================
// 🚪 MAIN HANDLER
// ============================================================
serve(async (req: Request) => {
  // Auth check (optional)
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${Deno.env.get("SYNC_SECRET")}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const results: Record<string, { fetched: number; upserted: number }> = {};

  try {
    // ⚠️ Urutan penting: Anggota dulu (FK reference)
    for (const table of TABLES) {
      console.log(`📥 Fetching ${table}...`);
      const rows = await fetchFromGAS(table);
      console.log(`   ${rows.length} rows`);

      const mapped = rows.map((r) => mapRow(r, table));
      const supabaseTable = table.toLowerCase();

      await upsertToSupabase(supabaseTable, mapped);

      results[table] = { fetched: rows.length, upserted: mapped.length };
      console.log(`✅ ${table}: ${mapped.length} synced`);
    }

    return new Response(JSON.stringify({
      status: "ok",
      timestamp: new Date().toISOString(),
      results,
    }), { headers: { "Content-Type": "application/json" } });

  } catch (err) {
    console.error("Sync error:", err);
    return new Response(JSON.stringify({
      status: "error",
      message: (err as Error).message,
      results,
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
