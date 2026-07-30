-- ============================================================
-- 🗄️  SUPABASE MIGRATION — Portal Pemuda RT 03 Denokan
--     Dari: Google Apps Script V5.0 + Google Sheets
--     Ke:   Supabase (PostgreSQL 15)
--
-- 📋 URUTAN EKSEKUSI:
--    Bagian 1 → Enum + Tabel + Trigger + Index
--    Bagian 2 → RLS Policies
--    Bagian 3 → RPC Functions
--    Bagian 4 → Storage Buckets (via Dashboard)
-- ============================================================

-- ============================================================
-- BAGIAN 0 — ENUMS
-- ============================================================
CREATE TYPE role_enum          AS ENUM ('SUPER_ADMIN','KETUA','SEKRETARIS','BENDAHARA','PENGURUS','ANGGOTA');
CREATE TYPE status_aktif_enum  AS ENUM ('Aktif','Nonaktif','Alumni');
CREATE TYPE status_tampil_enum AS ENUM ('AKTIF','ARSIP');
CREATE TYPE jenis_kelamin_enum AS ENUM ('L','P');
CREATE TYPE jenis_kas_enum     AS ENUM ('pemasukan','pengeluaran');
CREATE TYPE approval_enum      AS ENUM ('PENDING','APPROVED','REJECTED');
CREATE TYPE visibilitas_enum   AS ENUM ('PUBLIC','ANGGOTA','PENGURUS','PRIVATE');
CREATE TYPE status_kegiatan    AS ENUM ('AKTIF','SELESAI','DIBATALKAN');

-- ============================================================
-- BAGIAN 1 — TABEL (6 tabel = 6 sheet)
-- ============================================================

-- 1️⃣ ANGGOTA — root table, semua FK dari sini
CREATE TABLE anggota (
  id_anggota        TEXT PRIMARY KEY,                        -- RL03-006 / 10-digit
  nama_lengkap      TEXT NOT NULL,
  nama_panggilan    TEXT,
  email             TEXT,
  jabatan           TEXT,                                    -- Ketua, Sekretaris, dll
  alamat            TEXT,
  no_hp             TEXT,
  jenis_kelamin     jenis_kelamin_enum,
  tanggal_lahir     DATE,
  minat_bakat       TEXT,
  foto_profil       TEXT,                                    -- URL Drive / Supabase Storage
  status_aktif      status_aktif_enum DEFAULT 'Aktif',
  status_tampil     status_tampil_enum DEFAULT 'AKTIF',
  tanggal_daftar    DATE DEFAULT CURRENT_DATE,
  izin_nohp         BOOLEAN DEFAULT false,
  izin_tanggallahir BOOLEAN DEFAULT false,
  izin_minat        BOOLEAN DEFAULT false,
  role              role_enum DEFAULT 'ANGGOTA',
  bio               TEXT,
  terakhir_diubah   TIMESTAMPTZ DEFAULT NOW()
);

-- 2️⃣ AGENDA
CREATE TABLE agenda (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal         DATE NOT NULL DEFAULT CURRENT_DATE,
  waktu           TEXT,
  nama_kegiatan   TEXT NOT NULL,
  lokasi          TEXT,
  kategori        TEXT,
  keterangan      TEXT,
  visibilitas     visibilitas_enum DEFAULT 'PUBLIC',
  pembuat         TEXT REFERENCES anggota(id_anggota) ON DELETE SET NULL,
  status          status_kegiatan DEFAULT 'AKTIF',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3️⃣ PENGUMUMAN
CREATE TABLE pengumuman (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal               DATE NOT NULL DEFAULT CURRENT_DATE,
  judul                 TEXT NOT NULL,
  isi                   TEXT,
  penulis               TEXT REFERENCES anggota(id_anggota) ON DELETE SET NULL,
  kategori              TEXT,
  lampiran_url          TEXT,
  visibilitas           visibilitas_enum DEFAULT 'PUBLIC',
  is_penting            BOOLEAN DEFAULT false,
  dibroadcast_telegram  BOOLEAN DEFAULT false,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 4️⃣ KAS
CREATE TABLE kas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal         DATE NOT NULL DEFAULT CURRENT_DATE,
  jenis           jenis_kas_enum NOT NULL,
  nominal         DECIMAL(12,0) NOT NULL DEFAULT 0,
  pemasukan       DECIMAL(12,0) DEFAULT 0,
  pengeluaran     DECIMAL(12,0) DEFAULT 0,
  saldo           DECIMAL(12,0) DEFAULT 0,
  kategori        TEXT,
  sub_kategori    TEXT,
  keterangan      TEXT,
  petugas         TEXT REFERENCES anggota(id_anggota) ON DELETE SET NULL,
  metode_bayar    TEXT,
  bukti_nota      TEXT,
  status          TEXT DEFAULT 'AKTIF',
  approval_by     TEXT,
  waktu_input     TIMESTAMPTZ DEFAULT NOW(),
  waktu_edit      TIMESTAMPTZ DEFAULT NOW()
);

-- 5️⃣ ASPIRASI
CREATE TABLE aspirasi (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal         DATE NOT NULL DEFAULT CURRENT_DATE,
  usulan          TEXT NOT NULL,
  pengirim        TEXT,
  id_anggota      TEXT REFERENCES anggota(id_anggota) ON DELETE SET NULL,
  kategori        TEXT,
  status          TEXT DEFAULT 'MENUNGGU',
  tanggapan       TEXT,
  tanggapan_oleh  TEXT,
  jumlah_dukung   INTEGER DEFAULT 0,
  likes           JSONB DEFAULT '[]'::jsonb,                -- array ["RL03-001","RL03-002"]
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 6️⃣ GALERI
CREATE TABLE galeri (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal           DATE NOT NULL DEFAULT CURRENT_DATE,
  judul_kegiatan    TEXT,
  foto_url          TEXT NOT NULL,
  kategori          TEXT,
  deskripsi         TEXT,
  uploader          TEXT REFERENCES anggota(id_anggota) ON DELETE SET NULL,
  nama_upload       TEXT,
  role_upload       TEXT,
  status_approval   approval_enum DEFAULT 'PENDING',
  is_video          BOOLEAN DEFAULT false,
  jenis_media       TEXT,
  caption           TEXT,
  album_id          UUID,
  kategori_akses    visibilitas_enum DEFAULT 'PUBLIC',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_anggota_nama      ON anggota (nama_lengkap);
CREATE INDEX idx_anggota_role      ON anggota (role);
CREATE INDEX idx_agenda_tanggal    ON agenda (tanggal DESC);
CREATE INDEX idx_agenda_pembuat    ON agenda (pembuat);
CREATE INDEX idx_pengumuman_tgl    ON pengumuman (tanggal DESC);
CREATE INDEX idx_kas_tanggal       ON kas (tanggal DESC);
CREATE INDEX idx_kas_jenis         ON kas (jenis);
CREATE INDEX idx_aspirasi_status   ON aspirasi (status);
CREATE INDEX idx_aspirasi_anggota  ON aspirasi (id_anggota);
CREATE INDEX idx_galeri_tanggal    ON galeri (tanggal DESC);
CREATE INDEX idx_galeri_uploader   ON galeri (uploader);
CREATE INDEX idx_galeri_approval   ON galeri (status_approval);

-- ============================================================
-- TRIGGER: auto-update timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['agenda','pengumuman','aspirasi','galeri','kas'])
  LOOP
    EXECUTE format('
      CREATE TRIGGER trg_%s_updated
      BEFORE UPDATE ON %I
      FOR EACH ROW EXECUTE FUNCTION update_timestamp()
    ', t, t);
  END LOOP;
END $$;

-- Trigger khusus anggota (kolom Terakhir_Diubah, bukan updated_at)
CREATE OR REPLACE FUNCTION update_terakhir_diubah()
RETURNS TRIGGER AS $$
BEGIN NEW.terakhir_diubah = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_anggota_updated
  BEFORE UPDATE ON anggota FOR EACH ROW EXECUTE FUNCTION update_terakhir_diubah();

-- ============================================================
-- TRIGGER: auto-hitung kas (pemasukan/pengeluaran/saldo)
-- ============================================================
CREATE OR REPLACE FUNCTION auto_hitung_kas()
RETURNS TRIGGER AS $$
DECLARE
  saldo_sebelumnya DECIMAL;
BEGIN
  SELECT saldo INTO saldo_sebelumnya
  FROM kas
  WHERE id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
  ORDER BY waktu_input DESC LIMIT 1;
  saldo_sebelumnya := COALESCE(saldo_sebelumnya, 0);

  IF NEW.jenis = 'pemasukan' THEN
    NEW.pemasukan   := NEW.nominal;
    NEW.pengeluaran := 0;
    NEW.saldo       := saldo_sebelumnya + NEW.nominal;
  ELSE
    NEW.pemasukan   := 0;
    NEW.pengeluaran := NEW.nominal;
    NEW.saldo       := saldo_sebelumnya - NEW.nominal;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_kas_auto_hitung
  BEFORE INSERT ON kas FOR EACH ROW EXECUTE FUNCTION auto_hitung_kas();

-- ============================================================
-- TRIGGER: cascade nullify (saat anggota dihapus)
-- ============================================================
CREATE OR REPLACE FUNCTION cascade_nullify_anggota()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE agenda     SET pembuat  = NULL WHERE pembuat  = OLD.id_anggota;
  UPDATE pengumuman SET penulis  = NULL WHERE penulis  = OLD.id_anggota;
  UPDATE kas        SET petugas  = NULL WHERE petugas  = OLD.id_anggota;
  UPDATE aspirasi   SET id_anggota = NULL WHERE id_anggota = OLD.id_anggota;
  UPDATE galeri     SET uploader = NULL WHERE uploader = OLD.id_anggota;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_anggota_cascade_delete
  BEFORE DELETE ON anggota FOR EACH ROW EXECUTE FUNCTION cascade_nullify_anggota();
