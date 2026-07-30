-- ============================================================
-- ⚡ RPC FUNCTIONS — Portal Pemuda RT 03 Denokan
--    Dipanggil dari frontend via: supabase.rpc('nama_fungsi', { params })
-- ============================================================

-- ============================================================
-- 🔍 verifikasi_id — cek apakah ID anggota valid
--    Panggil: supabase.rpc('verifikasi_id', { p_id: 'RL03-006' })
-- ============================================================
CREATE OR REPLACE FUNCTION verifikasi_id(p_id TEXT)
RETURNS JSONB AS $$
DECLARE
  member_json JSONB;
  nama TEXT;
BEGIN
  SELECT row_to_json(a.*)::jsonb, a.nama_lengkap
  INTO member_json, nama
  FROM anggota a
  WHERE a.id_anggota = p_id AND a.status_tampil = 'AKTIF';

  IF member_json IS NOT NULL THEN
    RETURN jsonb_build_object(
      'valid',   true,
      'message', 'ID ditemukan: ' || nama,
      'member',  member_json
    );
  END IF;

  RETURN jsonb_build_object('valid', false, 'message', 'ID tidak ditemukan', 'member', null);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 🔐 verifikasi_pin — cek PIN sesuai role anggota
--    Panggil: supabase.rpc('verifikasi_pin', { p_id: 'RL03-006', p_pin: '1234' })
-- ============================================================
CREATE OR REPLACE FUNCTION verifikasi_pin(p_id TEXT, p_pin TEXT)
RETURNS JSONB AS $$
DECLARE
  member_json JSONB;
  member_role role_enum;
  expected TEXT;
BEGIN
  IF p_pin IS NULL OR p_pin = '' THEN
    RETURN jsonb_build_object('valid', false, 'message', 'PIN harus diisi', 'role', null);
  END IF;

  SELECT row_to_json(a.*)::jsonb, a.role
  INTO member_json, member_role
  FROM anggota a
  WHERE a.id_anggota = p_id AND a.status_tampil = 'AKTIF';

  IF member_json IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'message', 'ID tidak ditemukan', 'role', null);
  END IF;

  -- PIN mapping (nanti upgrade ke hash SHA-256)
  CASE member_role
    WHEN 'SUPER_ADMIN' THEN expected := '7777';
    WHEN 'KETUA'       THEN expected := '1234';
    WHEN 'SEKRETARIS'  THEN expected := '5678';
    WHEN 'BENDAHARA'   THEN expected := '9012';
    WHEN 'PENGURUS'    THEN expected := '1111';
    ELSE expected := '0000';  -- ANGGOTA
  END CASE;

  -- SUPER_ADMIN universal PIN
  IF p_pin = '7777' THEN
    RETURN jsonb_build_object('valid', true, 'message', 'Login SuperAdmin', 'role', 'SUPER_ADMIN', 'member', member_json);
  END IF;

  IF p_pin = expected THEN
    RETURN jsonb_build_object('valid', true, 'message', 'PIN valid — Role: ' || member_role, 'role', member_role::TEXT, 'member', member_json);
  END IF;

  RETURN jsonb_build_object('valid', false, 'message', 'PIN salah untuk role ' || member_role, 'role', member_role::TEXT);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 📊 dashboard_summary — ringkasan data
--    Panggil: supabase.rpc('dashboard_summary')
-- ============================================================
CREATE OR REPLACE FUNCTION dashboard_summary()
RETURNS JSONB AS $$
DECLARE
  a_count INTEGER; g_count INTEGER; p_count INTEGER;
  r_count INTEGER; l_count INTEGER; s_akhir DECIMAL;
BEGIN
  SELECT COUNT(*) INTO a_count FROM anggota    WHERE status_tampil = 'AKTIF';
  SELECT COUNT(*) INTO g_count FROM agenda     WHERE status = 'AKTIF';
  SELECT COUNT(*) INTO p_count FROM pengumuman;
  SELECT COUNT(*) INTO r_count FROM aspirasi;
  SELECT COUNT(*) INTO l_count FROM galeri     WHERE status_approval = 'APPROVED';
  SELECT saldo   INTO s_akhir FROM kas         ORDER BY waktu_input DESC LIMIT 1;

  RETURN jsonb_build_object(
    'totalAnggota',    a_count,
    'totalAgenda',     g_count,
    'totalPengumuman', p_count,
    'totalAspirasi',   r_count,
    'totalGaleri',     l_count,
    'saldoKas',        COALESCE(s_akhir, 0),
    'timestamp',       NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ➕ like_aspirasi — toggle like usulan
--    Panggil: supabase.rpc('like_aspirasi', { p_aspirasi_id: 'uuid', p_id_anggota: 'RL03-006' })
-- ============================================================
CREATE OR REPLACE FUNCTION like_aspirasi(p_aspirasi_id UUID, p_id_anggota TEXT)
RETURNS JSONB AS $$
DECLARE
  current_likes JSONB;
  already_liked BOOLEAN;
BEGIN
  SELECT likes INTO current_likes FROM aspirasi WHERE id = p_aspirasi_id;
  IF current_likes IS NULL THEN current_likes := '[]'::jsonb; END IF;

  already_liked := current_likes @> to_jsonb(p_id_anggota);

  IF already_liked THEN
    -- Unlike
    UPDATE aspirasi
    SET likes = likes - p_id_anggota,
        jumlah_dukung = jumlah_dukung - 1
    WHERE id = p_aspirasi_id;
    RETURN jsonb_build_object('liked', false, 'jumlah_dukung', (SELECT jumlah_dukung FROM aspirasi WHERE id = p_aspirasi_id));
  ELSE
    -- Like
    UPDATE aspirasi
    SET likes = COALESCE(likes, '[]'::jsonb) || to_jsonb(p_id_anggota),
        jumlah_dukung = jumlah_dukung + 1
    WHERE id = p_aspirasi_id;
    RETURN jsonb_build_object('liked', true, 'jumlah_dukung', (SELECT jumlah_dukung FROM aspirasi WHERE id = p_aspirasi_id));
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 🔄 sync_sheets_to_supabase — upsert dari GAS payload
--    Dipanggil dari Edge Function / GAS langsung
--    Panggil: supabase.rpc('sync_sheets_to_supabase', { p_table: 'anggota', p_data: '[...]'::jsonb })
-- ============================================================
CREATE OR REPLACE FUNCTION sync_upsert_row(p_table TEXT, p_row JSONB)
RETURNS VOID AS $$
DECLARE
  id_col TEXT;
  id_val TEXT;
BEGIN
  -- Tentukan nama kolom ID per tabel
  CASE p_table
    WHEN 'anggota'    THEN id_col := 'id_anggota';  id_val := p_row->>'id_anggota';
    WHEN 'agenda'     THEN id_col := 'id';           id_val := p_row->>'id';
    WHEN 'pengumuman' THEN id_col := 'id';           id_val := p_row->>'id';
    WHEN 'kas'        THEN id_col := 'id';           id_val := p_row->>'id';
    WHEN 'aspirasi'   THEN id_col := 'id';           id_val := p_row->>'id';
    WHEN 'galeri'     THEN id_col := 'id';           id_val := p_row->>'id';
    ELSE RAISE EXCEPTION 'Unknown table: %', p_table;
  END CASE;

  -- Upsert: update kalau ada, insert kalau belum
  IF EXISTS (SELECT 1 FROM anggota WHERE id_anggota = id_val) THEN
    EXECUTE format('UPDATE %I SET %s WHERE %I = %L', p_table, '...', id_col, id_val);
  ELSE
    EXECUTE format('INSERT INTO %I SELECT * FROM jsonb_populate_record(NULL::%I, %L)', p_table, p_table, p_row);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 🗑️ delete_cascade — hapus anggota + nullify referensi
--    Panggil: supabase.rpc('delete_cascade', { p_id_anggota: 'RL03-006' })
-- ============================================================
CREATE OR REPLACE FUNCTION delete_cascade(p_id_anggota TEXT)
RETURNS JSONB AS $$
DECLARE
  deleted_member JSONB;
  log TEXT[] := ARRAY[]::TEXT[];
  cnt INTEGER;
BEGIN
  -- Simpan data yang akan dihapus
  SELECT row_to_json(a.*)::jsonb INTO deleted_member FROM anggota a WHERE a.id_anggota = p_id_anggota;
  IF deleted_member IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'ID tidak ditemukan');
  END IF;

  -- Nullify referensi di semua tabel terkait
  UPDATE agenda     SET pembuat     = NULL WHERE pembuat    = p_id_anggota; GET DIAGNOSTICS cnt = ROW_COUNT; IF cnt > 0 THEN log := log || (cnt || ' agenda'); END IF;
  UPDATE pengumuman SET penulis     = NULL WHERE penulis    = p_id_anggota; GET DIAGNOSTICS cnt = ROW_COUNT; IF cnt > 0 THEN log := log || (cnt || ' pengumuman'); END IF;
  UPDATE kas        SET petugas     = NULL WHERE petugas    = p_id_anggota; GET DIAGNOSTICS cnt = ROW_COUNT; IF cnt > 0 THEN log := log || (cnt || ' kas'); END IF;
  UPDATE aspirasi   SET id_anggota  = NULL WHERE id_anggota = p_id_anggota; GET DIAGNOSTICS cnt = ROW_COUNT; IF cnt > 0 THEN log := log || (cnt || ' aspirasi'); END IF;
  UPDATE galeri     SET uploader    = NULL WHERE uploader   = p_id_anggota; GET DIAGNOSTICS cnt = ROW_COUNT; IF cnt > 0 THEN log := log || (cnt || ' galeri'); END IF;

  -- Hapus anggota
  DELETE FROM anggota WHERE id_anggota = p_id_anggota;

  RETURN jsonb_build_object(
    'status',       'ok',
    'message',      'Anggota ' || p_id_anggota || ' dihapus',
    'deletedData',  deleted_member,
    'cascade',      log
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 🔎 search_global — cari di semua tabel
--    Panggil: supabase.rpc('search_global', { p_query: 'rapat' })
-- ============================================================
CREATE OR REPLACE FUNCTION search_global(p_query TEXT)
RETURNS JSONB AS $$
DECLARE
  results JSONB := '[]'::jsonb;
BEGIN
  -- Cari di agenda
  results := results || (
    SELECT COALESCE(jsonb_agg(jsonb_build_object('table', 'agenda', 'data', row_to_json(a.*), 'score', similarity(nama_kegiatan, p_query))), '[]'::jsonb)
    FROM agenda a WHERE nama_kegiatan ILIKE '%' || p_query || '%' OR keterangan ILIKE '%' || p_query || '%'
  );

  -- Cari di pengumuman
  results := results || (
    SELECT COALESCE(jsonb_agg(jsonb_build_object('table', 'pengumuman', 'data', row_to_json(p.*))), '[]'::jsonb)
    FROM pengumuman p WHERE judul ILIKE '%' || p_query || '%' OR isi ILIKE '%' || p_query || '%'
  );

  -- Cari di aspirasi
  results := results || (
    SELECT COALESCE(jsonb_agg(jsonb_build_object('table', 'aspirasi', 'data', row_to_json(r.*))), '[]'::jsonb)
    FROM aspirasi r WHERE usulan ILIKE '%' || p_query || '%' OR tanggapan ILIKE '%' || p_query || '%'
  );

  RETURN jsonb_build_object('query', p_query, 'results', results);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
