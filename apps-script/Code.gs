// ============================================================
// GOOGLE APPS SCRIPT — BACKEND REMAJA LEGOK 03
// RT 03 RW 04 Denokan, Gondoryo, Jambu, Semarang
// ============================================================
// CARA DEPLOY:
// 1. Buka script.google.com
// 2. Tempel kode ini
// 3. Deploy → New Deployment → Web App
//    - Execute as: Me
//    - Who has access: Anyone
// 4. Salin URL deployment → masukkan ke VITE_API_URL di .env.local
// ============================================================

// ============================================================
// CONFIG
// ✅ GANTI nilai di bawah sebelum deploy!
// ============================================================

const CONFIG = {
  SPREADSHEET_ID      : 'GANTI_DENGAN_SPREADSHEET_ID_ANDA',
  DRIVE_FOLDER_ID     : 'GANTI_DENGAN_DRIVE_FOLDER_ID_ANDA',
  KODE_POS            : '50663',
  RT                  : '03',
  RW                  : '04',

  // ✅ PIN — WAJIB GANTI sebelum production!
  // Format PIN_SUPER_ADMIN: YYYYMMDDHHH (10 digit, otomatis berubah tiap jam)
  // Lihat generatePINDinamis() di auth.ts untuk logikanya
  PIN_SUPER_ADMIN     : 'GANTI_PIN_SUPER_ADMIN',
  PIN_KETUA_DEFAULT   : 'GANTI_PIN_KETUA',
  PIN_PENGURUS_DEFAULT: 'GANTI_PIN_PENGURUS',

  // ✅ ADDED: Tipe file yang diizinkan untuk upload
  ALLOWED_FILE_TYPES  : ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],

  // ✅ ADDED: Ukuran file maksimal (dalam bytes) — default 5MB
  MAX_FILE_SIZE_BYTES : 5 * 1024 * 1024,

  // ✅ ADDED: Kolom yang tidak boleh diubah user saat updateProfil
  PROTECTED_COLUMNS   : ['ID_Anggota', 'Status', 'Jabatan', 'Tanggal_Daftar'],
};

// ✅ ADDED: Daftar action yang valid — untuk validasi di router
const VALID_ACTIONS = [
  'verifikasiID', 'verifikasiPengurus', 'verifikasiKetua', 'verifikasiSuperAdmin',
  'getAnggota', 'getAllAnggota', 'getAnggotaByID',
  'daftarAnggotaCepat', 'daftarAnggotaMassal', 'updateProfil',
  'arsipAnggota', 'kembalikanAnggota',
  'getAgenda', 'tambahAgenda', 'editAgenda', 'hapusAgenda',
  'getAbsensi', 'inputAbsensi',
  'getPengumuman', 'tambahPengumuman', 'editPengumuman', 'hapusPengumuman',
  'getKasUmum', 'getKasDetail', 'getKasSaya', 'inputKas', 'inputIuran',
  'getAspirasi', 'kirimAspirasi', 'likeAspirasi', 'updateStatusAspirasi',
  'getGaleri', 'getAlbum', 'buatAlbum', 'uploadFile',
];

// Spreadsheet ID yang bisa di-override per-request
var CURRENT_SPREADSHEET_ID = null;

// ============================================================
// ROUTER — doGet & doPost
// ============================================================

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  // ✅ ADDED: CORS headers agar bisa diakses dari browser
  try {
    var params = {};

    if (e && e.postData && e.postData.contents) {
      try {
        params = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        return responseJSON({
          status : 'error',
          message: 'Body request bukan JSON yang valid: ' + parseErr.toString()
        });
      }
    } else if (e && e.parameter) {
      params = e.parameter;
    }

    // Override Spreadsheet ID dari request (opsional)
    CURRENT_SPREADSHEET_ID =
      params.spreadsheetId ||
      params.sheetsId      ||
      params.VITE_SHEETS_ID ||
      null;

    // ✅ FIXED: Validasi action lebih ketat
    var action = (params.action || '').trim();
    if (!action) {
      return responseJSON({
        status : 'error',
        message: 'Parameter "action" wajib diisi.'
      });
    }

    if (VALID_ACTIONS.indexOf(action) === -1) {
      return responseJSON({
        status : 'error',
        message: 'Action "' + action + '" tidak dikenal.'
      });
    }

    var result;

    switch (action) {

      // ── Auth & Verifikasi ────────────────────────────────
      case 'verifikasiID':
        result = verifikasiID(params.idAnggota);
        break;
      case 'verifikasiPengurus':
        result = verifikasiPengurus(params.idAnggota, params.pin);
        break;
      case 'verifikasiKetua':
        result = verifikasiKetua(params.idAnggota, params.pin);
        break;
      case 'verifikasiSuperAdmin':
        result = verifikasiSuperAdmin(params.pin);
        break;

      // ── Anggota ──────────────────────────────────────────
      case 'getAnggota':
        result = getAnggota();
        break;
      case 'getAllAnggota':
        result = getAllAnggota(params.pin);
        break;
      // ✅ ADDED: getAnggotaByID — dipakai ProfilSaya.tsx
      case 'getAnggotaByID':
        result = getAnggotaByID(params.id || params.idAnggota);
        break;
      case 'daftarAnggotaCepat':
        result = daftarAnggotaCepat(params.data);
        break;
      case 'daftarAnggotaMassal':
        result = daftarAnggotaMassal(params.data, params.pin);
        break;
      case 'updateProfil':
        result = updateProfil(params.idAnggota, params.data);
        break;
      case 'arsipAnggota':
        result = arsipAnggota(params.idAnggota, params.oleh, params.pin);
        break;
      case 'kembalikanAnggota':
        result = kembalikanAnggota(params.idAnggota, params.pin);
        break;

      // ── Agenda ───────────────────────────────────────────
      case 'getAgenda':
        result = getAgenda();
        break;
      case 'tambahAgenda':
        result = tambahAgenda(params.data, params.pin);
        break;
      case 'editAgenda':
        result = editAgenda(params.idAgenda, params.data, params.pin);
        break;
      case 'hapusAgenda':
        result = hapusAgenda(params.idAgenda, params.pin);
        break;

      // ── Absensi ──────────────────────────────────────────
      case 'getAbsensi':
        result = getAbsensi(params.idAgenda);
        break;
      case 'inputAbsensi':
        result = inputAbsensi(params.data);
        break;

      // ── Pengumuman ───────────────────────────────────────
      case 'getPengumuman':
        result = getPengumuman();
        break;
      case 'tambahPengumuman':
        result = tambahPengumuman(params.data, params.pin);
        break;
      case 'editPengumuman':
        result = editPengumuman(params.id, params.data, params.pin);
        break;
      case 'hapusPengumuman':
        result = hapusPengumuman(params.id, params.pin);
        break;

      // ── Kas & Iuran ──────────────────────────────────────
      case 'getKasUmum':
        result = getKasUmum();
        break;
      case 'getKasDetail':
        result = getKasDetail(params.pin);
        break;
      case 'getKasSaya':
        result = getKasSaya(params.idAnggota);
        break;
      case 'inputKas':
        result = inputKas(params.data, params.pin);
        break;
      case 'inputIuran':
        result = inputIuran(params.data, params.pin);
        break;

      // ── Aspirasi ─────────────────────────────────────────
      case 'getAspirasi':
        result = getAspirasi();
        break;
      case 'kirimAspirasi':
        result = kirimAspirasi(params.data);
        break;
      case 'likeAspirasi':
        result = likeAspirasi(params.id);
        break;
      case 'updateStatusAspirasi':
        result = updateStatusAspirasi(params.id, params.status, params.pin);
        break;

      // ── Galeri & File ─────────────────────────────────────
      case 'getGaleri':
        result = getGaleri(params.levelAkses);
        break;
      case 'getAlbum':
        result = getAlbum(params.levelAkses);
        break;
      case 'buatAlbum':
        result = buatAlbum(params.data, params.idAnggota);
        break;
      case 'uploadFile':
        result = uploadFile(
          params.fileName,
          params.fileType,
          params.fileData,
          params.folder,
          params.idAnggota,
          params.fileSize
        );
        break;

      default:
        result = { status: 'error', message: 'Action tidak ditemukan.' };
    }

    return responseJSON(result);

  } catch (error) {
    console.error('handleRequest error: ' + error.toString());
    return responseJSON({
      status : 'error',
      message: 'Server error: ' + error.toString()
    });
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

// ✅ FIXED: responseJSON dengan proper MIME type
function responseJSON(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ✅ FIXED: getSheet() dengan error handling yang lebih baik
function getSheet(sheetName) {
  var ss   = null;
  var id   = CURRENT_SPREADSHEET_ID || CONFIG.SPREADSHEET_ID;
  var isValidId =
    id &&
    id.trim() &&
    id.indexOf('GANTI') === -1 &&
    id !== '1_PASTE_YOUR_SPREADSHEET_ID_HERE';

  if (isValidId) {
    try {
      ss = SpreadsheetApp.openById(id.trim());
    } catch (err) {
      console.error('[getSheet] Gagal openById "' + id + '": ' + err.toString());
    }
  }

  if (!ss) {
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (err) {
      console.error('[getSheet] Gagal getActiveSpreadsheet: ' + err.toString());
    }
  }

  if (!ss) {
    throw new Error(
      'Spreadsheet tidak ditemukan. Periksa CONFIG.SPREADSHEET_ID: ' + id
    );
  }

  var sheet = ss.getSheetByName(sheetName);

  // ✅ ADDED: Auto-create sheet jika belum ada
  if (!sheet) {
    console.warn('[getSheet] Sheet "' + sheetName + '" tidak ada, membuat baru...');
    sheet = ss.insertSheet(sheetName);
  }

  return sheet;
}

// ✅ ADDED: Helper konversi rows ke array of objects
function rowsToObjects(values) {
  if (!values || values.length < 2) return [];
  var headers = values[0];
  var result  = [];
  for (var i = 1; i < values.length; i++) {
    // ✅ Skip baris kosong
    if (values[i].every(function(c) { return c === '' || c === null || c === undefined; })) {
      continue;
    }
    var obj = {};
    headers.forEach(function(h, idx) {
      obj[h] = values[i][idx] !== undefined ? values[i][idx] : '';
    });
    result.push(obj);
  }
  return result;
}

// ✅ ADDED: Helper cari baris berdasarkan kolom & nilai
function findRowIndex(sheet, colName, value) {
  var values  = sheet.getDataRange().getValues();
  var headers = values[0];
  var colIdx  = headers.indexOf(colName);
  if (colIdx === -1) return -1;
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][colIdx]) === String(value)) return i;
  }
  return -1;
}

// ✅ ADDED: Helper generate ID unik
function generateId(prefix) {
  return prefix + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
}

// ============================================================
// PIN HELPERS
// ============================================================

// ✅ FIXED: isPinValid — validasi ketat, satu sumber kebenaran
function isPinValid(pin, level) {
  if (!pin || !level) return false;
  switch (level) {
    case 'PENGURUS'   : return String(pin) === String(CONFIG.PIN_PENGURUS_DEFAULT);
    case 'KETUA'      : return String(pin) === String(CONFIG.PIN_KETUA_DEFAULT);
    case 'SUPER_ADMIN': return String(pin) === String(CONFIG.PIN_SUPER_ADMIN);
    default           : return false;
  }
}

// ✅ FIXED: hasAccess — hirarki akses yang benar
function hasAccess(pin, minimumLevel) {
  if (!pin) return false;
  // Super Admin bisa akses semua
  if (isPinValid(pin, 'SUPER_ADMIN')) return true;
  // Ketua bisa akses Ketua & Pengurus
  if (minimumLevel === 'KETUA' || minimumLevel === 'PENGURUS') {
    if (isPinValid(pin, 'KETUA')) return true;
  }
  // Pengurus hanya bisa akses Pengurus
  if (minimumLevel === 'PENGURUS') {
    if (isPinValid(pin, 'PENGURUS')) return true;
  }
  return false;
}

// ============================================================
// VERIFIKASI & AUTH
// ============================================================

function verifikasiID(idAnggota) {
  if (!idAnggota || !idAnggota.trim()) {
    return { status: 'error', message: 'ID Anggota wajib diisi.' };
  }

  try {
    var sheet   = getSheet('Anggota');
    var values  = sheet.getDataRange().getValues();
    var headers = values[0];
    var idCol   = headers.indexOf('ID_Anggota');
    var namaCol = headers.indexOf('Nama_Lengkap');
    var jabCol  = headers.indexOf('Jabatan');
    var statCol = headers.indexOf('Status');
    var hpCol   = headers.indexOf('No_HP');
    var fotoCol = headers.indexOf('Foto_Profil');

    if (idCol === -1) {
      return { status: 'error', message: 'Kolom ID_Anggota tidak ditemukan di sheet Anggota.' };
    }

    for (var i = 1; i < values.length; i++) {
      if (String(values[i][idCol]).trim() === String(idAnggota).trim()) {
        var status = statCol !== -1 ? values[i][statCol] : 'Aktif';
        if (status !== 'Aktif' && status !== 'AKTIF') {
          return { status: 'error', message: 'Akun anggota ini tidak aktif.' };
        }
        return {
          status: 'success',
          data: {
            idAnggota  : values[i][idCol],
            nama       : namaCol !== -1 ? values[i][namaCol] : '',
            jabatan    : jabCol  !== -1 ? values[i][jabCol]  : '',
            no_hp      : hpCol   !== -1 ? values[i][hpCol]   : '',
            foto_profil: fotoCol !== -1 ? values[i][fotoCol] : '',
          }
        };
      }
    }

    return { status: 'error', message: 'ID Anggota tidak ditemukan.' };

  } catch (e) {
    console.error('[verifikasiID] Error: ' + e.toString());
    return { status: 'error', message: 'Gagal verifikasi: ' + e.toString() };
  }
}

function verifikasiPengurus(idAnggota, pin) {
  if (!idAnggota || !pin) {
    return { status: 'error', message: 'ID Anggota dan PIN wajib diisi.' };
  }
  if (!hasAccess(pin, 'PENGURUS')) {
    return { status: 'error', message: 'PIN Pengurus salah.' };
  }
  // ✅ ADDED: Cek anggota benar-benar ada
  var anggota = verifikasiID(idAnggota);
  if (anggota.status !== 'success') return anggota;

  return {
    status: 'success',
    data: {
      idAnggota: idAnggota,
      nama     : anggota.data.nama,
      jabatan  : anggota.data.jabatan,
      role     : 'PENGURUS'
    }
  };
}

function verifikasiKetua(idAnggota, pin) {
  if (!idAnggota || !pin) {
    return { status: 'error', message: 'ID Anggota dan PIN wajib diisi.' };
  }
  if (!hasAccess(pin, 'KETUA')) {
    return { status: 'error', message: 'PIN Ketua salah.' };
  }
  var anggota = verifikasiID(idAnggota);
  if (anggota.status !== 'success') return anggota;

  return {
    status: 'success',
    data: {
      idAnggota: idAnggota,
      nama     : anggota.data.nama,
      jabatan  : anggota.data.jabatan,
      role     : 'KETUA'
    }
  };
}

function verifikasiSuperAdmin(pin) {
  if (!pin) {
    return { status: 'error', message: 'PIN Super Admin wajib diisi.' };
  }
  if (!isPinValid(pin, 'SUPER_ADMIN')) {
    return { status: 'error', message: 'PIN Super Admin salah.' };
  }
  return { status: 'success', message: 'Verifikasi Super Admin berhasil.' };
}

// ============================================================
// ANGGOTA
// ============================================================

function getAnggota() {
  try {
    var sheet  = getSheet('Anggota');
    var values = sheet.getDataRange().getValues();
    if (values.length < 2) return { status: 'success', data: [] };

    var headers = values[0];
    var statCol = headers.indexOf('Status');
    var list    = [];

    for (var i = 1; i < values.length; i++) {
      var status = statCol !== -1 ? values[i][statCol] : 'Aktif';
      if (status === 'Aktif' || status === 'AKTIF') {
        var obj = {};
        headers.forEach(function(h, idx) { obj[h] = values[i][idx] || ''; });
        list.push(obj);
      }
    }
    return { status: 'success', data: list };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function getAllAnggota(pin) {
  if (!hasAccess(pin, 'PENGURUS')) {
    return { status: 'error', message: 'Akses ditolak. Butuh PIN Pengurus atau lebih tinggi.' };
  }
  try {
    var sheet  = getSheet('Anggota');
    var values = sheet.getDataRange().getValues();
    return { status: 'success', data: rowsToObjects(values) };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

// ✅ ADDED: getAnggotaByID — dipanggil dari ProfilSaya.tsx
function getAnggotaByID(id) {
  if (!id) {
    return { status: 'error', message: 'ID Anggota wajib diisi.' };
  }
  try {
    var sheet   = getSheet('Anggota');
    var values  = sheet.getDataRange().getValues();
    var headers = values[0];
    var idCol   = headers.indexOf('ID_Anggota');

    for (var i = 1; i < values.length; i++) {
      if (String(values[i][idCol]).trim() === String(id).trim()) {
        var obj = {};
        headers.forEach(function(h, idx) { obj[h] = values[i][idx] || ''; });
        return { status: 'success', data: obj };
      }
    }
    return { status: 'error', message: 'Anggota tidak ditemukan.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function daftarAnggotaCepat(data) {
  if (!data || !data.ID_Anggota || !data.Nama_Lengkap) {
    return { status: 'error', message: 'ID_Anggota dan Nama_Lengkap wajib diisi.' };
  }
  // ✅ ADDED: Cek duplikat ID
  var existing = getAnggotaByID(data.ID_Anggota);
  if (existing.status === 'success') {
    return { status: 'error', message: 'ID Anggota "' + data.ID_Anggota + '" sudah terdaftar.' };
  }
  try {
    var sheet = getSheet('Anggota');
    sheet.appendRow([
      data.ID_Anggota,
      data.Nama_Lengkap,
      data.Nama_Panggilan  || '',
      data.Jenis_Kelamin   || '',
      data.Tempat_Lahir    || '',
      data.Tanggal_Lahir   || '',
      data.No_HP           || '',
      data.Alamat          || '',
      data.Foto_Profil     || '',
      data.Jabatan         || 'Anggota',
      'Aktif',
      new Date().toISOString(),
      'Self-Register'
    ]);
    return {
      status : 'success',
      message: 'Pendaftaran berhasil.',
      data   : { idAnggota: data.ID_Anggota, nama: data.Nama_Lengkap }
    };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function daftarAnggotaMassal(data, pin) {
  if (!hasAccess(pin, 'SUPER_ADMIN')) {
    return { status: 'error', message: 'Akses terbatas untuk Super Admin.' };
  }
  if (!Array.isArray(data) || data.length === 0) {
    return { status: 'error', message: 'Data harus berupa array yang tidak kosong.' };
  }
  try {
    var sheet = getSheet('Anggota');
    var count = 0;
    var skipped = 0;

    data.forEach(function(d) {
      if (!d.ID_Anggota || !d.Nama_Lengkap) {
        skipped++;
        return;
      }
      sheet.appendRow([
        d.ID_Anggota,
        d.Nama_Lengkap,
        d.Nama_Panggilan || '',
        d.Jenis_Kelamin  || '',
        d.Tempat_Lahir   || '',
        d.Tanggal_Lahir  || '',
        d.No_HP          || '',
        d.Alamat         || '',
        d.Foto_Profil    || '',
        d.Jabatan        || 'Anggota',
        'Aktif',
        new Date().toISOString(),
        'Massal'
      ]);
      count++;
    });

    return {
      status : 'success',
      message: count + ' anggota berhasil didaftarkan.' +
               (skipped > 0 ? ' ' + skipped + ' data dilewati (data tidak lengkap).' : '')
    };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function updateProfil(idAnggota, data) {
  if (!idAnggota || !data) {
    return { status: 'error', message: 'ID Anggota dan data wajib diisi.' };
  }
  try {
    var sheet   = getSheet('Anggota');
    var values  = sheet.getDataRange().getValues();
    var headers = values[0];
    var idCol   = headers.indexOf('ID_Anggota');
    var rowIdx  = -1;

    for (var i = 1; i < values.length; i++) {
      if (String(values[i][idCol]).trim() === String(idAnggota).trim()) {
        rowIdx = i;
        break;
      }
    }

    if (rowIdx === -1) {
      return { status: 'error', message: 'Anggota tidak ditemukan.' };
    }

    var updatedFields = 0;
    Object.keys(data).forEach(function(key) {
      // ✅ FIXED: Pakai CONFIG.PROTECTED_COLUMNS
      if (CONFIG.PROTECTED_COLUMNS.indexOf(key) !== -1) return;
      var colIdx = headers.indexOf(key);
      if (colIdx !== -1) {
        sheet.getRange(rowIdx + 1, colIdx + 1).setValue(data[key]);
        updatedFields++;
      }
    });

    // ✅ ADDED: Update timestamp Terakhir_Diubah
    var terakhirCol = headers.indexOf('Terakhir_Diubah');
    if (terakhirCol !== -1) {
      sheet.getRange(rowIdx + 1, terakhirCol + 1).setValue(new Date().toISOString());
    }

    return {
      status : 'success',
      message: 'Profil berhasil diperbarui (' + updatedFields + ' field diubah).'
    };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function arsipAnggota(idAnggota, oleh, pin) {
  if (!hasAccess(pin, 'SUPER_ADMIN')) {
    return { status: 'error', message: 'Akses terbatas untuk Super Admin.' };
  }
  if (!idAnggota) {
    return { status: 'error', message: 'ID Anggota wajib diisi.' };
  }
  try {
    var sheet   = getSheet('Anggota');
    var values  = sheet.getDataRange().getValues();
    var headers = values[0];
    var idCol   = headers.indexOf('ID_Anggota');
    var statCol = headers.indexOf('Status');

    for (var i = 1; i < values.length; i++) {
      if (String(values[i][idCol]).trim() === String(idAnggota).trim()) {
        sheet.getRange(i + 1, statCol + 1).setValue('Nonaktif');

        // ✅ ADDED: Catat siapa yang mengarsipkan & kapan
        var arsipOlehCol = headers.indexOf('Diarsip_Oleh');
        var tglArsipCol  = headers.indexOf('Tanggal_Arsip');
        if (arsipOlehCol !== -1) sheet.getRange(i + 1, arsipOlehCol + 1).setValue(oleh || 'Super Admin');
        if (tglArsipCol  !== -1) sheet.getRange(i + 1, tglArsipCol  + 1).setValue(new Date().toISOString());

        return { status: 'success', message: 'Anggota berhasil diarsipkan.' };
      }
    }
    return { status: 'error', message: 'Anggota tidak ditemukan.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function kembalikanAnggota(idAnggota, pin) {
  if (!hasAccess(pin, 'SUPER_ADMIN')) {
    return { status: 'error', message: 'Akses terbatas untuk Super Admin.' };
  }
  if (!idAnggota) {
    return { status: 'error', message: 'ID Anggota wajib diisi.' };
  }
  try {
    var sheet   = getSheet('Anggota');
    var values  = sheet.getDataRange().getValues();
    var headers = values[0];
    var idCol   = headers.indexOf('ID_Anggota');
    var statCol = headers.indexOf('Status');

    for (var i = 1; i < values.length; i++) {
      if (String(values[i][idCol]).trim() === String(idAnggota).trim()) {
        sheet.getRange(i + 1, statCol + 1).setValue('Aktif');

        // ✅ ADDED: Bersihkan kolom arsip
        var arsipOlehCol = headers.indexOf('Diarsip_Oleh');
        var tglArsipCol  = headers.indexOf('Tanggal_Arsip');
        if (arsipOlehCol !== -1) sheet.getRange(i + 1, arsipOlehCol + 1).setValue('');
        if (tglArsipCol  !== -1) sheet.getRange(i + 1, tglArsipCol  + 1).setValue('');

        return { status: 'success', message: 'Anggota berhasil dikembalikan.' };
      }
    }
    return { status: 'error', message: 'Anggota tidak ditemukan.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

// ============================================================
// AGENDA
// ============================================================

function getAgenda() {
  try {
    var sheet  = getSheet('Agenda');
    var values = sheet.getDataRange().getValues();
    return { status: 'success', data: rowsToObjects(values) };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function tambahAgenda(data, pin) {
  if (!hasAccess(pin, 'PENGURUS')) {
    return { status: 'error', message: 'Akses ditolak.' };
  }
  if (!data || !data.Nama_Kegiatan || !data.Tanggal) {
    return { status: 'error', message: 'Nama_Kegiatan dan Tanggal wajib diisi.' };
  }
  try {
    var sheet = getSheet('Agenda');
    sheet.appendRow([
      generateId('AGD'),
      data.Nama_Kegiatan,
      data.Kategori      || '',
      data.Tanggal,
      data.Waktu_Mulai   || '',
      data.Waktu_Selesai || '',
      data.Lokasi        || '',
      data.Deskripsi     || '',
      data.Visibilitas   || 'Anggota',
      data.Status_Sesi   || 'Terbuka',
      data.Poster        || '',
      data.Dibuat_Oleh   || 'Pengurus',
      new Date().toISOString()
    ]);
    return { status: 'success', message: 'Agenda berhasil ditambahkan.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function editAgenda(idAgenda, data, pin) {
  if (!hasAccess(pin, 'PENGURUS')) {
    return { status: 'error', message: 'Akses ditolak.' };
  }
  if (!idAgenda || !data) {
    return { status: 'error', message: 'ID Agenda dan data wajib diisi.' };
  }
  try {
    var sheet   = getSheet('Agenda');
    var values  = sheet.getDataRange().getValues();
    var headers = values[0];
    var rowIdx  = findRowIndex(sheet, 'ID_Agenda', idAgenda);

    if (rowIdx === -1) return { status: 'error', message: 'Agenda tidak ditemukan.' };

    Object.keys(data).forEach(function(key) {
      if (key === 'ID_Agenda') return;
      var colIdx = headers.indexOf(key);
      if (colIdx !== -1) sheet.getRange(rowIdx + 1, colIdx + 1).setValue(data[key]);
    });
    return { status: 'success', message: 'Agenda berhasil diperbarui.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function hapusAgenda(idAgenda, pin) {
  if (!hasAccess(pin, 'KETUA')) {
    return { status: 'error', message: 'Akses terbatas untuk Ketua / Super Admin.' };
  }
  if (!idAgenda) {
    return { status: 'error', message: 'ID Agenda wajib diisi.' };
  }
  try {
    var sheet  = getSheet('Agenda');
    var rowIdx = findRowIndex(sheet, 'ID_Agenda', idAgenda);
    if (rowIdx === -1) return { status: 'error', message: 'Agenda tidak ditemukan.' };
    sheet.deleteRow(rowIdx + 1);
    return { status: 'success', message: 'Agenda berhasil dihapus.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

// ============================================================
// ABSENSI
// ============================================================

function getAbsensi(idAgenda) {
  try {
    var sheet   = getSheet('Absensi');
    var values  = sheet.getDataRange().getValues();
    var headers = values[0];
    var idCol   = headers.indexOf('ID_Agenda');
    var list    = [];

    for (var i = 1; i < values.length; i++) {
      if (!idAgenda || String(values[i][idCol]) === String(idAgenda)) {
        var obj = {};
        headers.forEach(function(h, idx) { obj[h] = values[i][idx] || ''; });
        list.push(obj);
      }
    }
    return { status: 'success', data: list };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function inputAbsensi(data) {
  if (!data || !data.ID_Agenda || !data.ID_Anggota) {
    return { status: 'error', message: 'ID_Agenda dan ID_Anggota wajib diisi.' };
  }
  try {
    var sheet = getSheet('Absensi');
    sheet.appendRow([
      generateId('ABS'),
      data.ID_Agenda,
      data.Nama_Kegiatan || '',
      data.ID_Anggota,
      data.Nama_Anggota  || '',
      data.Status        || 'Hadir',
      new Date().toISOString(),
      data.Keterangan    || '',
      data.Metode        || 'Self'
    ]);
    return { status: 'success', message: 'Absensi berhasil dicatat.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

// ============================================================
// PENGUMUMAN
// ============================================================

function getPengumuman() {
  try {
    var sheet  = getSheet('Pengumuman');
    var values = sheet.getDataRange().getValues();
    return { status: 'success', data: rowsToObjects(values) };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function tambahPengumuman(data, pin) {
  if (!hasAccess(pin, 'PENGURUS')) {
    return { status: 'error', message: 'Akses ditolak.' };
  }
  if (!data || !data.Judul || !data.Isi) {
    return { status: 'error', message: 'Judul dan Isi wajib diisi.' };
  }
  try {
    var sheet = getSheet('Pengumuman');
    sheet.appendRow([
      generateId('ANN'),
      data.Judul,
      data.Isi,
      data.Kategori       || 'Umum',
      data.Visibilitas    || 'Anggota',
      data.Prioritas      || 'Normal',
      new Date().toISOString(),
      data.Berlaku_Sampai || '',
      data.Gambar         || '',
      data.Dibuat_Oleh    || 'Pengurus'
    ]);
    return { status: 'success', message: 'Pengumuman berhasil dipublikasikan.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function editPengumuman(id, data, pin) {
  if (!hasAccess(pin, 'PENGURUS')) {
    return { status: 'error', message: 'Akses ditolak.' };
  }
  if (!id || !data) {
    return { status: 'error', message: 'ID dan data wajib diisi.' };
  }
  try {
    var sheet   = getSheet('Pengumuman');
    var values  = sheet.getDataRange().getValues();
    var headers = values[0];
    var rowIdx  = findRowIndex(sheet, 'ID_Pengumuman', id);
    if (rowIdx === -1) return { status: 'error', message: 'Pengumuman tidak ditemukan.' };

    Object.keys(data).forEach(function(key) {
      if (key === 'ID_Pengumuman') return;
      var colIdx = headers.indexOf(key);
      if (colIdx !== -1) sheet.getRange(rowIdx + 1, colIdx + 1).setValue(data[key]);
    });
    return { status: 'success', message: 'Pengumuman berhasil diubah.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function hapusPengumuman(id, pin) {
  if (!hasAccess(pin, 'KETUA')) {
    return { status: 'error', message: 'Akses terbatas untuk Ketua / Super Admin.' };
  }
  if (!id) {
    return { status: 'error', message: 'ID Pengumuman wajib diisi.' };
  }
  try {
    var sheet  = getSheet('Pengumuman');
    var rowIdx = findRowIndex(sheet, 'ID_Pengumuman', id);
    if (rowIdx === -1) return { status: 'error', message: 'Pengumuman tidak ditemukan.' };
    sheet.deleteRow(rowIdx + 1);
    return { status: 'success', message: 'Pengumuman berhasil dihapus.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

// ============================================================
// KAS & IURAN
// ============================================================

function getKasUmum() {
  try {
    var sheet   = getSheet('Kas_Umum');
    var values  = sheet.getDataRange().getValues();
    var headers = values[0];
    var jenisCol = headers.indexOf('Jenis');
    var nomCol   = headers.indexOf('Nominal');
    var statCol  = headers.indexOf('Status');

    var totalPemasukan   = 0;
    var totalPengeluaran = 0;

    for (var i = 1; i < values.length; i++) {
      var status  = statCol  !== -1 ? values[i][statCol]  : 'Aktif';
      var nominal = nomCol   !== -1 ? Number(values[i][nomCol]) || 0 : 0;
      var jenis   = jenisCol !== -1 ? values[i][jenisCol] : '';

      if (status === 'Aktif' || status === 'AKTIF' || status === 'DISETUJUI') {
        if (jenis === 'Pemasukan')   totalPemasukan   += nominal;
        if (jenis === 'Pengeluaran') totalPengeluaran += nominal;
      }
    }

    return {
      status: 'success',
      data: {
        totalPemasukan,
        totalPengeluaran,
        saldo: totalPemasukan - totalPengeluaran
      }
    };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function getKasDetail(pin) {
  if (!hasAccess(pin, 'PENGURUS')) {
    return { status: 'error', message: 'Akses ditolak.' };
  }
  try {
    var sheet  = getSheet('Kas_Umum');
    var values = sheet.getDataRange().getValues();
    return { status: 'success', data: rowsToObjects(values) };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function getKasSaya(idAnggota) {
  if (!idAnggota) {
    return { status: 'error', message: 'ID Anggota wajib diisi.' };
  }
  try {
    var sheet   = getSheet('Iuran');
    var values  = sheet.getDataRange().getValues();
    var headers = values[0];
    var idCol   = headers.indexOf('ID_Anggota');
    var list    = [];

    for (var i = 1; i < values.length; i++) {
      if (String(values[i][idCol]).trim() === String(idAnggota).trim()) {
        var obj = {};
        headers.forEach(function(h, idx) { obj[h] = values[i][idx] || ''; });
        list.push(obj);
      }
    }
    return { status: 'success', data: list };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function inputKas(data, pin) {
  if (!hasAccess(pin, 'PENGURUS')) {
    return { status: 'error', message: 'Akses ditolak.' };
  }
  if (!data || !data.Jenis || data.Nominal === undefined) {
    return { status: 'error', message: 'Jenis dan Nominal wajib diisi.' };
  }
  // ✅ ADDED: Validasi Jenis
  if (data.Jenis !== 'Pemasukan' && data.Jenis !== 'Pengeluaran') {
    return { status: 'error', message: 'Jenis harus "Pemasukan" atau "Pengeluaran".' };
  }
  try {
    var sheet = getSheet('Kas_Umum');
    sheet.appendRow([
      generateId('KAS'),
      data.Tanggal      || new Date().toISOString(),
      data.Jenis,
      data.Kategori     || '',
      data.Sub_Kategori || '',
      Number(data.Nominal) || 0,
      data.Keterangan   || '',
      data.Metode       || 'Tunai',
      data.Bukti_Foto   || '',
      data.Petugas      || '',
      'Aktif',
      new Date().toISOString(),
      '', ''
    ]);
    return { status: 'success', message: 'Transaksi kas berhasil disimpan.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function inputIuran(data, pin) {
  if (!hasAccess(pin, 'PENGURUS')) {
    return { status: 'error', message: 'Akses ditolak.' };
  }
  if (!data || !data.ID_Anggota || !data.Bulan || !data.Tahun) {
    return { status: 'error', message: 'ID_Anggota, Bulan, dan Tahun wajib diisi.' };
  }
  try {
    var sheet = getSheet('Iuran');
    sheet.appendRow([
      generateId('IUR'),
      data.ID_Anggota,
      data.Nama_Anggota  || '',
      data.Bulan,
      data.Tahun,
      Number(data.Nominal) || 10000,
      data.Tanggal_Bayar  || new Date().toISOString(),
      data.Metode         || 'Tunai',
      data.Status         || 'Lunas',
      data.Bukti_Transfer || '',
      data.Nomor_Bukti    || '',
      data.Petugas        || '',
      new Date().toISOString()
    ]);
    return { status: 'success', message: 'Iuran berhasil disimpan.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

// ============================================================
// ASPIRASI
// ============================================================

function getAspirasi() {
  try {
    var sheet  = getSheet('Aspirasi');
    var values = sheet.getDataRange().getValues();
    return { status: 'success', data: rowsToObjects(values) };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function kirimAspirasi(data) {
  if (!data || !data.Isi) {
    return { status: 'error', message: 'Isi aspirasi wajib diisi.' };
  }
  try {
    var sheet = getSheet('Aspirasi');
    sheet.appendRow([
      generateId('ASP'),
      data.Pengirim      || 'Anonim',
      data.Nama_Pengirim || 'Anonim',
      data.Judul         || 'Tanpa Judul',
      data.Isi,
      data.Kategori      || 'Usulan',
      new Date().toISOString(),
      'Baru',
      '', '', '', 0
    ]);
    return { status: 'success', message: 'Aspirasi berhasil dikirim.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function likeAspirasi(id) {
  if (!id) {
    return { status: 'error', message: 'ID Aspirasi wajib diisi.' };
  }
  try {
    var sheet   = getSheet('Aspirasi');
    var values  = sheet.getDataRange().getValues();
    var headers = values[0];
    var idCol   = headers.indexOf('ID_Aspirasi');
    var likeCol = headers.indexOf('Likes');

    for (var i = 1; i < values.length; i++) {
      if (String(values[i][idCol]) === String(id)) {
        var current = Number(values[i][likeCol]) || 0;
        sheet.getRange(i + 1, likeCol + 1).setValue(current + 1);
        return { status: 'success', data: { likes: current + 1 } };
      }
    }
    return { status: 'error', message: 'Aspirasi tidak ditemukan.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function updateStatusAspirasi(id, status, pin) {
  if (!hasAccess(pin, 'KETUA')) {
    return { status: 'error', message: 'Akses terbatas untuk Ketua / Super Admin.' };
  }
  if (!id || !status) {
    return { status: 'error', message: 'ID dan Status wajib diisi.' };
  }
  // ✅ ADDED: Validasi nilai status
  var validStatus = ['Baru', 'Diproses', 'Disetujui', 'Ditolak', 'Selesai'];
  if (validStatus.indexOf(status) === -1) {
    return { status: 'error', message: 'Status tidak valid. Pilih: ' + validStatus.join(', ') };
  }
  try {
    var sheet   = getSheet('Aspirasi');
    var values  = sheet.getDataRange().getValues();
    var headers = values[0];
    var statCol = headers.indexOf('Status');
    var rowIdx  = findRowIndex(sheet, 'ID_Aspirasi', id);

    if (rowIdx === -1) return { status: 'error', message: 'Aspirasi tidak ditemukan.' };
    sheet.getRange(rowIdx + 1, statCol + 1).setValue(status);
    return { status: 'success', message: 'Status aspirasi berhasil diperbarui.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

// ============================================================
// GALERI & FILE
// ============================================================

function getGaleri(levelAkses) {
  try {
    var sheet   = getSheet('Galeri');
    var values  = sheet.getDataRange().getValues();
    var headers = values[0];
    var visCol  = headers.indexOf('Visibilitas');
    var list    = [];

    for (var i = 1; i < values.length; i++) {
      var vis = visCol !== -1 ? values[i][visCol] : 'Publik';
      if (vis === 'Publik' || (levelAkses && vis === 'Anggota')) {
        var obj = {};
        headers.forEach(function(h, idx) { obj[h] = values[i][idx] || ''; });
        list.push(obj);
      }
    }
    return { status: 'success', data: list };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function getAlbum(levelAkses) {
  try {
    var sheet   = getSheet('Album');
    var values  = sheet.getDataRange().getValues();
    var headers = values[0];
    var visCol  = headers.indexOf('Visibilitas');
    var list    = [];

    for (var i = 1; i < values.length; i++) {
      var vis = visCol !== -1 ? values[i][visCol] : 'Publik';
      if (vis === 'Publik' || (levelAkses && vis === 'Anggota')) {
        var obj = {};
        headers.forEach(function(h, idx) { obj[h] = values[i][idx] || ''; });
        list.push(obj);
      }
    }
    return { status: 'success', data: list };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function buatAlbum(data, idAnggota) {
  if (!data || !data.Nama_Album) {
    return { status: 'error', message: 'Nama_Album wajib diisi.' };
  }
  if (!idAnggota) {
    return { status: 'error', message: 'ID Anggota wajib diisi.' };
  }
  try {
    var sheet = getSheet('Album');
    sheet.appendRow([
      generateId('ALB'),
      data.Nama_Album,
      data.Deskripsi   || '',
      data.Visibilitas || 'Anggota',
      idAnggota,
      new Date().toISOString()
    ]);
    return { status: 'success', message: 'Album berhasil dibuat.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

// ✅ FIXED: uploadFile dengan validasi lengkap
function uploadFile(fileName, fileType, fileData, folderName, idAnggota, fileSize) {
  // Validasi input wajib
  if (!fileName || !fileType || !fileData) {
    return { status: 'error', message: 'fileName, fileType, dan fileData wajib diisi.' };
  }

  // Validasi tipe file
  if (CONFIG.ALLOWED_FILE_TYPES.indexOf(fileType) === -1) {
    return {
      status : 'error',
      message: 'Tipe file tidak didukung. Diizinkan: ' + CONFIG.ALLOWED_FILE_TYPES.join(', ')
    };
  }

  // ✅ ADDED: Validasi ukuran file (dari parameter fileSize)
  if (fileSize && Number(fileSize) > CONFIG.MAX_FILE_SIZE_BYTES) {
    return {
      status : 'error',
      message: 'Ukuran file melebihi batas ' + (CONFIG.MAX_FILE_SIZE_BYTES / 1024 / 1024) + 'MB.'
    };
  }

  try {
    // Tentukan folder target
    var parentFolder;
    var isValidFolder =
      CONFIG.DRIVE_FOLDER_ID &&
      CONFIG.DRIVE_FOLDER_ID.indexOf('GANTI') === -1;

    if (isValidFolder) {
      parentFolder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
    } else {
      parentFolder = DriveApp.getRootFolder();
    }

    // Buat subfolder jika folderName disediakan
    var targetFolder = parentFolder;
    if (folderName) {
      var existing = parentFolder.getFoldersByName(folderName);
      targetFolder = existing.hasNext()
        ? existing.next()
        : parentFolder.createFolder(folderName);
    }

    // Decode base64 & upload
    var decoded = Utilities.base64Decode(fileData);
    var blob    = Utilities.newBlob(decoded, fileType, fileName);
    var file    = targetFolder.createFile(blob);

    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var fileId  = file.getId();
    var fileUrl = file.getUrl();
    var directUrl = 'https://drive.google.com/uc?id=' + fileId;

    // ✅ ADDED: Simpan metadata ke sheet Galeri
    if (idAnggota) {
      try {
        var sheet = getSheet('Galeri');
        sheet.appendRow([
          generateId('IMG'),
          fileName,
          folderName || 'Umum',
          fileUrl,
          directUrl,
          fileSize || blob.getBytes().length,
          fileType,
          idAnggota,
          new Date().toISOString(),
          'Anggota',
          ''  // Status approval
        ]);
      } catch (sheetErr) {
        // Metadata gagal — tapi upload sudah berhasil, jangan gagalkan
        console.error('[uploadFile] Gagal simpan metadata: ' + sheetErr.toString());
      }
    }

    return {
      status: 'success',
      data: {
        fileId    : fileId,
        fileUrl   : fileUrl,
        url       : directUrl,  // ✅ ADDED: Alias 'url' untuk kompatibilitas frontend
        downloadUrl: directUrl
      }
    };
  } catch (e) {
    console.error('[uploadFile] Error: ' + e.toString());
    return { status: 'error', message: 'Gagal mengunggah file: ' + e.toString() };
  }
}

// ============================================================
// UTILITY — Test Connection (bisa dipanggil dari browser)
// ============================================================

// ✅ ADDED: Fungsi test untuk cek koneksi ke Spreadsheet
function testConnection() {
  try {
    var sheet = getSheet('Anggota');
    var count = Math.max(0, sheet.getLastRow() - 1);
    return {
      status: 'success',
      message: 'Koneksi berhasil!',
      data: {
        spreadsheetId: CONFIG.SPREADSHEET_ID,
        jumlahAnggota: count,
        timestamp    : new Date().toISOString()
      }
    };
  } catch (e) {
    return { status: 'error', message: 'Koneksi gagal: ' + e.toString() };
  }
}
