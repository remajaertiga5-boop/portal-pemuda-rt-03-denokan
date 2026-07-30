# 🚀 MIGRASI SUPABASE — Portal Pemuda RT 03 Denokan

## Struktur File

```
backend/supabase/
├── 01-schema.sql           ← Tabel + Enum + Trigger + Index
├── 02-rls-policies.sql     ← Row Level Security (22 policies)
├── 03-rpc-functions.sql    ← RPC: verifikasi_id, verifikasi_pin, dashboard, sync
├── 04-edge-sync-sheets.ts  ← Edge Function: sync GAS → Supabase
├── 05-migration-map.ts     ← Peta: setiap action GAS → query Supabase
└── README.md               ← kamu di sini
```

---

## Langkah Eksekusi (30 menit)

### Step 1 — Buat project Supabase (2 menit)
1. Buka [supabase.com](https://supabase.com) → **New Project**
2. Isi: nama `portal-pemuda-rt03`, password DB (simpan!), region `Southeast Asia`
3. Tunggu provisioning (~1 menit)

### Step 2 — Jalankan SQL (5 menit)
1. Buka **SQL Editor** di dashboard Supabase
2. **Copy-paste `01-schema.sql`** → **Run** → semua tabel + trigger terbuat
3. **Copy-paste `02-rls-policies.sql`** → **Run** → 22 policy aktif
4. **Copy-paste `03-rpc-functions.sql`** → **Run** → RPC siap

> ⚠️ Jangan skip — urutan penting: schema → RLS → RPC. Kalau RLS dijalankan sebelum tabel ada, error.

### Step 3 — Setup Storage Bucket (1 menit)
1. Sidebar → **Storage** → **New Bucket**
2. Buat 2 bucket:
   - `media` (public) — foto kegiatan, bukti nota
   - `profil` (public) — foto profil anggota

### Step 4 — Deploy Edge Function (3 menit)
```bash
# Install Supabase CLI
npx supabase login
npx supabase link --project-ref <project-ref>

# Deploy sync function
npx supabase functions deploy sync-sheets

# Set environment variables
npx supabase secrets set GAS_BASE_URL="https://script.google.com/macros/s/AKfycbxxx/exec"
npx supabase secrets set SYNC_SECRET="random-secret-string-123"
```

### Step 5 — Jalankan sync pertama (5 menit)
```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/sync-sheets" \
  -H "Authorization: Bearer random-secret-string-123"
```

**Response sukses:**
```json
{
  "status": "ok",
  "timestamp": "2026-07-31T...",
  "results": {
    "Anggota":    { "fetched": 45, "upserted": 45 },
    "Agenda":     { "fetched": 12, "upserted": 12 },
    "Pengumuman": { "fetched": 8,  "upserted": 8 },
    "Kas":        { "fetched": 50, "upserted": 50 },
    "Aspirasi":   { "fetched": 5,  "upserted": 5 },
    "Galeri":     { "fetched": 30, "upserted": 30 }
  }
}
```

### Step 6 — Setup auto-sync (3 menit)
Buat cron job di Dashboard Supabase → **Cron Jobs**:
```
SELECT cron.schedule('sync-sheets-hourly', '0 * * * *', $$
  SELECT net.http_post(
    url:='https://<project-ref>.supabase.co/functions/v1/sync-sheets',
    headers:='{"Authorization":"Bearer random-secret-string-123"}'::jsonb
  );
$$);
```

### Step 7 — Update frontend (10 menit)
1. Install: `npm i @supabase/supabase-js`
2. Ganti semua `fetch(GAS_URL, ...)` dengan `supabase.from(...)` / `.rpc(...)`
3. Referensi: lihat `05-migration-map.ts` untuk mapping lengkap

---

## Arsitektur Dual-Write (masa transisi)

Selama masa transisi, tulis ke **keduanya**:

```typescript
// ✅ Tulis ke GAS (backend existing)
await fetch(GAS_URL, { method:'POST', body: JSON.stringify({ action:'create', table:'Agenda', data }) })

// ✅ Tulis ke Supabase (backend baru)
await supabase.from('agenda').insert(mappedData)

// Data akan di-sync ulang oleh cron job, jadi gap sementara aman
```

Setelah semua stabil, matikan GAS dan hanya pakai Supabase.

---

## Perbandingan Fitur: GAS vs Supabase

| Fitur | GAS V5.0 | Supabase |
|-------|----------|----------|
| CRUD | ✅ | ✅ |
| Search | ✅ query global | ✅ ILIKE + RPC search_global |
| Auth | PIN per-role | ✅ JWT + Supabase Auth |
| RLS | ❌ | ✅ 22 policy |
| Cascade delete | ✅ manual loop | ✅ DB trigger otomatis |
| Chat AI | ✅ Gemini | ✅ Edge Function |
| File upload | Google Drive | S3 Storage (lebih cepat) |
| Realtime | ❌ | ✅ WebSocket subscribe |
| Rate limit | ~20 req/detik | Unlimited |
| Row limit | 10M cells | Unlimited |
| Biaya | Gratis | Gratis (500MB) |

---

## Rollback Plan

Kalau ada masalah:
1. Matikan cron job sync
2. Frontend: ganti balik `SUPABASE_URL` → `GAS_URL`
3. Data di Google Sheets tetap utuh (sync satu arah)

Tidak ada data loss — Sheets adalah source of truth selama transisi.
