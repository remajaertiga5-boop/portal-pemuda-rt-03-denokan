-- ============================================================
-- 🔐 RLS POLICIES — Portal Pemuda RT 03 Denokan
--    Role: SUPER_ADMIN | KETUA | PENGURUS (Sekretaris+Bendahara) | ANGGOTA
--
--    Prinsip: role dibaca dari raw_user_meta_data → 'role'
--    user_metadata diset saat sign-up via Supabase Auth
-- ============================================================

-- ENABLE RLS
ALTER TABLE anggota    ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengumuman ENABLE ROW LEVEL SECURITY;
ALTER TABLE kas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE aspirasi   ENABLE ROW LEVEL SECURITY;
ALTER TABLE galeri     ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 🔧 HELPER FUNCTIONS
-- ============================================================

-- Ambil role dari JWT user_metadata
CREATE OR REPLACE FUNCTION auth_role()
RETURNS role_enum AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role')::role_enum,
    'ANGGOTA'::role_enum
  );
$$ LANGUAGE sql STABLE;

-- Ambil id_anggota dari JWT user_metadata
CREATE OR REPLACE FUNCTION auth_id_anggota()
RETURNS TEXT AS $$
  SELECT auth.jwt() -> 'user_metadata' ->> 'id_anggota';
$$ LANGUAGE sql STABLE;

-- Cek apakah role saat ini PENGURUS ke atas
CREATE OR REPLACE FUNCTION is_pengurus()
RETURNS BOOLEAN AS $$
  SELECT auth_role() IN ('SUPER_ADMIN','KETUA','SEKRETARIS','BENDAHARA','PENGURUS');
$$ LANGUAGE sql STABLE;

-- Cek apakah role saat ini adalah admin (SUPER_ADMIN / KETUA)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT auth_role() IN ('SUPER_ADMIN','KETUA');
$$ LANGUAGE sql STABLE;

-- ============================================================
-- 📋 ANGGOTA
-- ============================================================

-- SELECT: semua role bisa lihat anggota aktif
CREATE POLICY "anggota_select_public" ON anggota
  FOR SELECT USING (status_tampil = 'AKTIF');

-- SELECT: pengurus bisa lihat semua (termasuk ARSIP)
CREATE POLICY "anggota_select_pengurus" ON anggota
  FOR SELECT USING (is_pengurus());

-- INSERT: SUPER_ADMIN / KETUA / SEKRETARIS
CREATE POLICY "anggota_insert_admin" ON anggota
  FOR INSERT WITH CHECK (auth_role() IN ('SUPER_ADMIN','KETUA','SEKRETARIS'));

-- UPDATE: diri sendiri ATAU SUPER_ADMIN
CREATE POLICY "anggota_update_self" ON anggota
  FOR UPDATE USING (
    id_anggota = auth_id_anggota()
    OR auth_role() = 'SUPER_ADMIN'
  );

-- DELETE: SUPER_ADMIN only
CREATE POLICY "anggota_delete_superadmin" ON anggota
  FOR DELETE USING (auth_role() = 'SUPER_ADMIN');

-- ============================================================
-- 📅 AGENDA
-- ============================================================

CREATE POLICY "agenda_select_all" ON agenda
  FOR SELECT USING (
    visibilitas = 'PUBLIC' OR is_pengurus()
  );

CREATE POLICY "agenda_insert_pengurus" ON agenda
  FOR INSERT WITH CHECK (is_pengurus());

CREATE POLICY "agenda_update_pengurus" ON agenda
  FOR UPDATE USING (is_pengurus());

CREATE POLICY "agenda_delete_admin" ON agenda
  FOR DELETE USING (is_admin());

-- ============================================================
-- 📢 PENGUMUMAN
-- ============================================================

CREATE POLICY "pengumuman_select_all" ON pengumuman
  FOR SELECT USING (
    visibilitas = 'PUBLIC' OR is_pengurus()
  );

CREATE POLICY "pengumuman_insert_pengurus" ON pengumuman
  FOR INSERT WITH CHECK (is_pengurus());

CREATE POLICY "pengumuman_update_pengurus" ON pengumuman
  FOR UPDATE USING (is_pengurus());

CREATE POLICY "pengumuman_delete_admin" ON pengumuman
  FOR DELETE USING (is_admin());

-- ============================================================
-- 💰 KAS (sensitif — hanya pengurus)
-- ============================================================

CREATE POLICY "kas_select_pengurus" ON kas
  FOR SELECT USING (is_pengurus());

CREATE POLICY "kas_insert_bendahara" ON kas
  FOR INSERT WITH CHECK (auth_role() IN ('SUPER_ADMIN','BENDAHARA'));

CREATE POLICY "kas_update_bendahara" ON kas
  FOR UPDATE USING (auth_role() IN ('SUPER_ADMIN','BENDAHARA'));

CREATE POLICY "kas_delete_superadmin" ON kas
  FOR DELETE USING (auth_role() = 'SUPER_ADMIN');

-- ============================================================
-- 💬 ASPIRASI
-- ============================================================

CREATE POLICY "aspirasi_select_all" ON aspirasi
  FOR SELECT USING (true);

CREATE POLICY "aspirasi_insert_all" ON aspirasi
  FOR INSERT WITH CHECK (true);

CREATE POLICY "aspirasi_update_pengurus" ON aspirasi
  FOR UPDATE USING (is_pengurus());

CREATE POLICY "aspirasi_delete_admin" ON aspirasi
  FOR DELETE USING (is_admin());

-- ============================================================
-- 🖼️ GALERI
-- ============================================================

CREATE POLICY "galeri_select_approved" ON galeri
  FOR SELECT USING (
    (kategori_akses = 'PUBLIC' AND status_approval = 'APPROVED')
    OR is_pengurus()
  );

CREATE POLICY "galeri_insert_all" ON galeri
  FOR INSERT WITH CHECK (true);

CREATE POLICY "galeri_update_pengurus" ON galeri
  FOR UPDATE USING (is_pengurus());

CREATE POLICY "galeri_delete_admin" ON galeri
  FOR DELETE USING (is_admin());

-- ============================================================
-- 📊 TOTAL: 22 policies untuk 6 tabel
-- ============================================================
