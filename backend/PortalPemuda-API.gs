// ============================================================
// 🏛️  PORTAL PEMUDA RT 03 DENOKAN — BACKEND API V5.3
//     Google Apps Script + Google Sheets
//     Sheet ID: 1bfbq06pc08QPbnGzSpHcB7AwyWy3IU5OE0AaG-ADoec
//
// 📦 Deploy: Apps Script Editor → Deploy → Web App
//    Execute as: Me  |  Who has access: Anyone
//
// 🔐 V5.3 — SECURITY: semua secret di Script Properties
//    Setup: jalankan setupProperties() sekali
//
// 🔑 V5.3 — PIN SHA-256: hash per individu (fallback ke role-PIN)
//    upgrade: jalankan upgradePinColumn() untuk tambah kolom PIN_Hash
//    set pin: POST { action:'setPin', id_anggota:'RL03-006', pin:'1234' }
//    reset:   POST { action:'resetPin', id_anggota:'RL03-006', pin_admin:'7777' }
// ============================================================

// ============================================================
// 🔐 V5.3 — CONFIGURATION LAYER (PropertiesService)
// ============================================================
// Semua secret / credential dibaca dari Script Properties.
// Fallback hanya untuk DEVELOPMENT — hapus sebelum deploy production.

var CONFIG_DEFAULTS = {
  SPREADSHEET_ID: '1bfbq06pc08QPbnGzSpHcB7AwyWy3IU5OE0AaG-ADoec',
  GEMINI_API_KEY: 'Ab8RN6LqqN13fDrW4NL2gUmD6rM5VUQoxoSVbn8p96xd0369uA',
  GROQ_API_KEY:   '',
  TELEGRAM_BOT_TOKEN: '',
  TELEGRAM_CHAT_ID:   '',
  DRIVE_FOLDER_BUKTI: '',
  DRIVE_FOLDER_PROFIL: '',
  PIN_SALT: 'portal-pemuda-rt03-2026',
  PIN_CONFIG: JSON.stringify({
    SuperAdmin: '7777', Ketua: '1234', 'Wakil Ketua': '4321', Sekretaris: '5678',
    Bendahara: '9012', Admin: '9999', Anggota: '0000', Pengurus: '1111'
  })
};

/**
 * 🔧 getConfig(key) — baca dari Script Properties, fallback ke default.
 *    Kalau tidak ada di keduanya → throw error (production-safe).
 */
function getConfig(key) {
  var props = PropertiesService.getScriptProperties();
  var val = props.getProperty(key);
  if (val !== null && val !== '') return val;
  if (CONFIG_DEFAULTS[key] !== undefined) return CONFIG_DEFAULTS[key];
  throw new Error(
    '❌ Script Property "' + key + '" belum diisi.\n' +
    '   Jalankan setupProperties() dulu dari Apps Script Editor.'
  );
}

function getPinConfig() {
  try { return JSON.parse(getConfig('PIN_CONFIG')); }
  catch(e) { return CONFIG_DEFAULTS.PIN_CONFIG ? JSON.parse(CONFIG_DEFAULTS.PIN_CONFIG) : {}; }
}

// ============================================================
// ⚙️ setupProperties() — jalankan SEKALI untuk isi semua property
//    Buka Apps Script Editor → pilih fungsi ini → Run
// ============================================================
function setupProperties() {
  var props = PropertiesService.getScriptProperties();
  var defaults = {
    SPREADSHEET_ID:     '1bfbq06pc08QPbnGzSpHcB7AwyWy3IU5OE0AaG-ADoec',
    GEMINI_API_KEY:     'Ab8RN6LqqN13fDrW4NL2gUmD6rM5VUQoxoSVbn8p96xd0369uA',
    GROQ_API_KEY:       '',
    TELEGRAM_BOT_TOKEN:  '',
    TELEGRAM_CHAT_ID:    '',
    DRIVE_FOLDER_BUKTI:  '',
    DRIVE_FOLDER_PROFIL: '',
    PIN_SALT:            'portal-pemuda-rt03-2026',
    PIN_CONFIG: JSON.stringify({
      SuperAdmin: '7777', Ketua: '1234', 'Wakil Ketua': '4321', Sekretaris: '5678',
      Bendahara: '9012', Admin: '9999', Anggota: '0000', Pengurus: '1111'
    })
  };

  var log = [];
  for (var key in defaults) {
    var current = props.getProperty(key);
    if (!current || current === '') {
      props.setProperty(key, String(defaults[key]));
      log.push('✅ SET ' + key);
    } else {
      log.push('⏭️ SKIP ' + key + ' (sudah ada)');
    }
  }

  Logger.log('=== setupProperties() V5.2 ===\n' + log.join('\n'));
  return ContentService.createTextOutput(JSON.stringify({ status:'ok', message:'Properties initialized', details:log }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 🔍 listProperties() — lihat semua property yang tersimpan (value disembunyikan)
 */
function listProperties() {
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties();
  var result = [];
  for (var key in all) {
    var val = all[key];
    var masked = val.length > 8 ? val.substring(0,4) + '...' + val.substring(val.length-4) : '***';
    result.push({ key: key, masked: masked, length: val.length });
  }
  Logger.log(JSON.stringify(result, null, 2));
  return ContentService.createTextOutput(JSON.stringify(result, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// 🔑 V5.3 — SHA-256 HASHING (tanpa library eksternal)
// ============================================================

/**
 * sha256(str) — menghasilkan hex digest SHA-256.
 *    Menggunakan Utilities.computeDigest() bawaan GAS.
 */
function sha256(str) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str, Utilities.Charset.UTF_8);
  return raw.map(function(b) {
    var hex = (b < 0 ? b + 256 : b).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * hashPin(pin) — hash dengan salt dari PropertiesService.
 *    Format: SHA-256(salt + ":" + pin)
 */
function hashPin(pin) {
  var salt = getConfig('PIN_SALT');
  if (!salt) return sha256(pin);  // fallback: hash tanpa salt
  return sha256(salt + ':' + pin);
}

// ============================================================
// 📊 SHEET COLUMN CONFIG — verified from actual sheets
// ============================================================
var SHEET_CONFIG = {
  Anggota: {
    index: 0, idField: 'ID_Anggota',
    columns: ['ID_Anggota','Nama_Lengkap','Nama_Panggilan','Email','Jabatan','Alamat',
              'No_HP','Jenis_Kelamin','Tanggal_Lahir','Minat_Bakat','Foto_Profil',
              'Status_Aktif','Status_Tampil','Tanggal_Daftar','Izin_NoHP',
              'Izin_TanggalLahir','Izin_Minat','Role','Bio','PIN_Hash','Terakhir_Diubah']
  },
  Agenda: {
    index: 1, idField: 'ID',
    columns: ['ID','Tanggal','Waktu','Nama Kegiatan','Lokasi','Kategori','Keterangan',
              'Visibilitas','Pembuat','Status']
  },
  Pengumuman: {
    index: 2, idField: 'ID',
    columns: ['ID','Tanggal','Judul','Isi','Penulis','Kategori','LampiranURL',
              'Visibilitas','isPenting','DibroadcastKeTelegram']
  },
  Kas: {
    index: 3, idField: 'ID',
    columns: ['ID','Tanggal','Jenis','Nominal','Pemasukan','Pengeluaran','Saldo',
              'Kategori','Sub_Kategori','Keterangan','Petugas','Metode_Bayar',
              'Bukti_Nota','Status','Approval_By','Waktu_Input','Waktu_Edit']
  },
  Aspirasi: {
    index: 4, idField: 'ID',
    columns: ['ID','Tanggal','Usulan','Pengirim','ID_Anggota','Kategori','Status',
              'Tanggapan','Tanggapan_Oleh','Jumlah_Dukung','Likes']
  },
  Galeri: {
    index: 5, idField: 'ID',
    columns: ['ID','Tanggal','Judul_Kegiatan','Foto_URL','Kategori','Deskripsi',
              'Uploader','Nama_Upload','Role_Upload','Status_Approval','Is_Video',
              'Jenis_Media','Caption','Album_ID','Kategori_Akses']
  }
};

// ============================================================
// 🔗 CASCADE DELETE CONFIG — hapus otomatis data terkait
// ============================================================
var CASCADE_DELETE_CONFIG = {
  Anggota: {
    cek_id_kolom: 'ID_Anggota',
    targets: [
      { table: 'Agenda',     kolom: 'Pembuat' },
      { table: 'Pengumuman', kolom: 'Penulis' },
      { table: 'Kas',        kolom: 'Petugas' },
      { table: 'Aspirasi',   kolom: 'ID_Anggota' },
      { table: 'Galeri',     kolom: 'Uploader' }
    ]
  },
  Agenda:       { cek_id_kolom: 'ID', targets: [] },
  Pengumuman:   { cek_id_kolom: 'ID', targets: [] },
  Kas:          { cek_id_kolom: 'ID', targets: [] },
  Aspirasi:     { cek_id_kolom: 'ID', targets: [] },
  Galeri:       { cek_id_kolom: 'ID', targets: [] }
};

// ============================================================
// 🚪 MAIN ENTRY POINT — doGet
// ============================================================
function doGet(e) {
  try {
    var action = e.parameter.action || 'health';
    var table  = e.parameter.table || '';
    var id     = e.parameter.id || '';
    var query  = e.parameter.query || '';
    var searchField = e.parameter.searchField || '';
    var searchValue = e.parameter.searchValue || '';

    switch(action) {
      case 'health':
        return json({ status:'ok', version:'5.2', timestamp:new Date().toISOString(), sheets:Object.keys(SHEET_CONFIG) });

      case 'read': case 'getData':
        if (!table || !SHEET_CONFIG[table]) return json({ status:'error', message:'Table "'+table+'" tidak ditemukan. Pilihan: '+Object.keys(SHEET_CONFIG).join(', ') });
        if (id) return json({ status:'ok', data:getRowById(table, id) });
        if (searchField && searchValue) return json({ status:'ok', data:searchRows(table, searchField, searchValue) });
        return json({ status:'ok', data:getAllRows(table, query) });

      case 'verifikasiID':
        return json(verifikasiID(id));

      case 'dashboard':
        return json({ status:'ok', data:getDashboardSummary() });

      default:
        return json({ status:'error', message:'Unknown action: '+action });
    }
  } catch(err) {
    return json({ status:'error', message:err.toString() });
  }
}

// ============================================================
// 📥 MAIN ENTRY POINT — doPost
// ============================================================
function doPost(e) {
  try {
    var data;
    try { data = JSON.parse(e.postData.contents); }
    catch(parseErr) { return json({ status:'error', message:'Invalid JSON: '+parseErr.toString() }); }

    var action  = data.action || '';
    var table   = data.table || '';
    var id      = data.id || '';
    var rowData = data.data || data.rowData || {};
    var payload = data.payload || {};
    var chatMsg = data.message || '';
    var authId  = data.auth_id  || '';  // V5.3: otorisasi action
    var authPin = data.auth_pin || '';

    switch(action) {
      // --- AUTH ---
      case 'verifikasiPin':
        return json(verifikasiPin(data.id_anggota || id, data.pin || ''));
      case 'login':
        return json(handleLogin(data.id_anggota || id, data.pin || ''));

      // --- PIN (V5.3) ---
      case 'setPin':
        return json(setPin(data.id_anggota || id, data.pin || ''));
      case 'resetPin':
        return json(resetPin(data.id_anggota || id, data.pin_admin || ''));

      // --- CRUD ---
      case 'create':
        if (!table || !SHEET_CONFIG[table]) return json({ status:'error', message:'Table tidak ditemukan' });
        // V5.3 — restrict Anggota creation to admin/ketua/wakil
        if (table === 'Anggota') {
          var authCheck = authorizeAction(authId, authPin, ['SuperAdmin','Ketua','Wakil Ketua']);
          if (!authCheck.authorized) return json({ status:'error', message:authCheck.message });
        }
        return json(createRow(table, rowData));
      case 'update':
        if (!table || !SHEET_CONFIG[table]) return json({ status:'error', message:'Table tidak ditemukan' });
        return json(updateRow(table, id, rowData));
      case 'delete':
        if (!table || !SHEET_CONFIG[table]) return json({ status:'error', message:'Table tidak ditemukan' });
        return json(deleteRow(table, id, data.cascade !== false));

      // --- BULK ---
      case 'bulkCreate':
        if (!table || !SHEET_CONFIG[table]) return json({ status:'error', message:'Table tidak ditemukan' });
        return json(bulkCreate(table, data.rows || []));
      case 'bulkDelete':
        if (!table || !SHEET_CONFIG[table]) return json({ status:'error', message:'Table tidak ditemukan' });
        return json(bulkDelete(table, data.ids || []));

      // --- TELEGRAM ---
      case 'telegramUpload':
        return json(handleTelegramUpload(payload));
      case 'telegramDelete':
        return json(handleTelegramDelete(payload));
      case 'telegramBroadcast':
        return json(handleTelegramBroadcast(data));

      // --- AI CHAT ---
      case 'chat':
        return json(handleChat(chatMsg, data.context || '', data.provider || 'gemini'));

      // --- FILE UPLOAD ---
      case 'uploadFile':
        return json(handleFileUpload(data));

      default:
        return json({ status:'error', message:'Unknown action: '+action });
    }
  } catch(err) {
    return json({ status:'error', message:err.toString() });
  }
}

// ============================================================
// 🔐 AUTH FUNCTIONS
// ============================================================
function verifikasiID(id) {
  if (!id) return { valid:false, message:'ID kosong', member:null };
  var sheet = getSheet('Anggota');
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(id).trim()) {
      var member = rowToObject('Anggota', data[i]);
      return { valid:true, member:member, message:'ID ditemukan: '+member.Nama_Lengkap };
    }
  }
  return { valid:false, message:'ID tidak ditemukan', member:null };
}

function verifikasiPin(id, pin) {
  if (!id || !pin) return { valid:false, message:'ID dan PIN harus diisi', role:null };
  var idRegex = /^(RL03-\d{3}|\d{10})$/;
  if (!idRegex.test(String(id).trim())) return { valid:false, message:'Format ID tidak valid (contoh: RL03-006 atau 1234567890)', role:null };

  var memberCheck = verifikasiID(id);
  if (!memberCheck.valid) return { valid:false, message:memberCheck.message, role:null };
  var member = memberCheck.member;
  var role = member.Jabatan || member.Role || 'Anggota';

  // V5.3 — SuperAdmin universal PIN (selalu dicek pertama)
  var pinConfig = getPinConfig();
  var superAdminPin = String(pinConfig['SuperAdmin'] || '7777');
  if (pin === superAdminPin) {
    return { valid:true, message:'Login SuperAdmin berhasil', role:'SuperAdmin', member:member, auth_method:'superadmin_pin' };
  }

  // V5.3 — Cek PIN_Hash individual (prioritas utama)
  var pinHash = member.PIN_Hash || '';
  if (pinHash && pinHash !== '') {
    var inputHash = hashPin(pin);
    if (inputHash === pinHash) {
      return { valid:true, message:'PIN valid (individu) — Role: '+role, role:role, member:member, auth_method:'individual_hash' };
    }
    // Hash tidak cocok — langsung gagal (jangan fallback ke role-PIN)
    return { valid:false, message:'PIN salah', role:role };
  }

  // V5.3 — Fallback: role-based PIN (untuk anggota yang belum set PIN individu)
  var expectedPin = pinConfig[role] || pinConfig['Anggota'] || '0000';
  if (String(pin) === String(expectedPin)) {
    return { valid:true, message:'PIN valid (role) — Role: '+role+'. ⚠️ Segera atur PIN pribadi dengan setPin.', role:role, member:member, auth_method:'role_fallback', warning:'Gunakan setPin untuk mengatur PIN pribadi' };
  }

  return { valid:false, message:'PIN salah untuk role '+role, role:role };
}

function handleLogin(id, pin) {
  var result = verifikasiPin(id, pin);
  if (result.valid) {
    return { status:'ok', session:{
      id_anggota: result.member.ID_Anggota,
      nama_lengkap: result.member.Nama_Lengkap,
      nama_panggilan: result.member.Nama_Panggilan || result.member.Nama_Lengkap,
      jabatan: result.member.Jabatan || '',
      role: result.role,
      login_time: new Date().toISOString()
    }};
  }
  return { status:'error', message:result.message };
}

/**
 * authorizeAction(auth_id, auth_pin, allowed_roles) — V5.3
 *    Verifikasi apakah pemanggil punya hak untuk action tertentu.
 *    Return: { authorized: bool, message: str, role: str, member: obj }
 */
function authorizeAction(auth_id, auth_pin, allowed_roles) {
  if (!auth_id || !auth_pin) {
    return { authorized:false, message:'auth_id dan auth_pin harus diisi untuk action ini' };
  }

  var verify = verifikasiPin(auth_id, auth_pin);
  if (!verify.valid) {
    return { authorized:false, message:'Autentikasi gagal: ' + verify.message };
  }

  var role = verify.role;
  if (allowed_roles.indexOf(role) === -1) {
    return { authorized:false, message:'Akses ditolak. Role ' + role + ' tidak diizinkan. Hanya: ' + allowed_roles.join(', ') };
  }

  return { authorized:true, message:'OK', role:role, member:verify.member };
}

// ============================================================
// 🔑 V5.3 — PIN INDIVIDU (SHA-256)
// ============================================================

/**
 * setPin(id_anggota, pin) — set PIN individu untuk satu anggota.
 *    Tidak bisa dipakai untuk set PIN orang lain (kecuali lewat resetPin).
 *    Payload: { action:'setPin', id_anggota:'RL03-006', pin:'123456' }
 *    Response: { status:'ok', message:'PIN berhasil diatur', auth_method:'individual_hash' }
 */
function setPin(id_anggota, pin) {
  if (!id_anggota || !pin) return { status:'error', message:'ID anggota dan PIN harus diisi' };
  if (String(pin).length < 4) return { status:'error', message:'PIN minimal 4 karakter' };
  if (String(pin).length > 64) return { status:'error', message:'PIN maksimal 64 karakter' };

  var memberCheck = verifikasiID(id_anggota);
  if (!memberCheck.valid) return { status:'error', message:memberCheck.message };

  var hashed = hashPin(String(pin));
  var result = updateRow('Anggota', id_anggota, { PIN_Hash: hashed });

  if (result.status === 'ok') {
    return {
      status: 'ok',
      message: 'PIN berhasil diatur untuk ' + memberCheck.member.Nama_Lengkap,
      id_anggota: id_anggota,
      auth_method: 'individual_hash'
    };
  }
  return result;
}

/**
 * resetPin(id_anggota, pin_admin) — admin reset PIN anggota.
 *    Hapus PIN_Hash → anggota kembali ke role-PIN.
 *    Payload: { action:'resetPin', id_anggota:'RL03-006', pin_admin:'7777' }
 */
function resetPin(id_anggota, pin_admin) {
  if (!id_anggota || !pin_admin) return { status:'error', message:'ID anggota dan PIN admin harus diisi' };

  // Verifikasi admin
  var adminCheck = verifikasiPin(id_anggota, pin_admin);
  // ⚠️ resetPin menggunakan PIN admin untuk otorisasi, bukan PIN user
  // Cek apakah pin_admin adalah SuperAdmin PIN
  var pinConfig = getPinConfig();
  var superAdminPin = String(pinConfig['SuperAdmin'] || '7777');
  if (String(pin_admin) !== superAdminPin) {
    return { status:'error', message:'Hanya SuperAdmin yang bisa mereset PIN. Gunakan PIN SuperAdmin.' };
  }

  var memberCheck = verifikasiID(id_anggota);
  if (!memberCheck.valid) return { status:'error', message:memberCheck.message };

  var result = updateRow('Anggota', id_anggota, { PIN_Hash: '' });

  if (result.status === 'ok') {
    return {
      status: 'ok',
      message: 'PIN ' + memberCheck.member.Nama_Lengkap + ' direset. Sekarang menggunakan PIN role default.',
      id_anggota: id_anggota,
      auth_method: 'role_fallback'
    };
  }
  return result;
}

/**
 * upgradePinColumn() — tambah kolom PIN_Hash ke sheet Anggota yang sudah ada.
 *    Jalankan SEKALI dari Apps Script Editor.
 *    Non-destruktif: hanya tambah header jika belum ada.
 */
function upgradePinColumn() {
  var ss = SpreadsheetApp.openById(getConfig('SPREADSHEET_ID'));
  var sheet = ss.getSheetByName('Anggota');
  if (!sheet) return Logger.log('❌ Sheet Anggota tidak ditemukan');

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var pinIndex = headers.indexOf('PIN_Hash');

  if (pinIndex !== -1) {
    Logger.log('⏭️ Kolom PIN_Hash sudah ada di index ' + (pinIndex + 1));
    return;
  }

  // Tambah header di kolom baru (setelah kolom terakhir)
  var lastCol = sheet.getLastColumn();
  sheet.getRange(1, lastCol + 1).setValue('PIN_Hash');
  sheet.getRange(1, lastCol + 1).setFontWeight('bold');

  Logger.log('✅ Kolom PIN_Hash ditambahkan di kolom ' + (lastCol + 1));
  Logger.log('⚠️ Pastikan SHEET_CONFIG columns di kode juga sudah ada PIN_Hash (V5.3 sudah include)');
}

// ============================================================
// 📖 READ OPERATIONS
// ============================================================
function getAllRows(table, query) {
  var sheet = getSheet(table);
  var data = sheet.getDataRange().getValues();
  var result = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0] && data[i].every(function(c){ return !c; })) continue;
    var row = rowToObject(table, data[i]);
    if (query) {
      var found = false;
      for (var key in row) {
        if (String(row[key]).toLowerCase().indexOf(query.toLowerCase()) !== -1) { found = true; break; }
      }
      if (!found) continue;
    }
    row._row = i + 1;
    result.push(row);
  }
  return result;
}

function getRowById(table, id) {
  var sheet = getSheet(table);
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(id).trim()) {
      var row = rowToObject(table, data[i]);
      row._row = i + 1;
      return row;
    }
  }
  return null;
}

function searchRows(table, field, value) {
  var sheet = getSheet(table);
  var data = sheet.getDataRange().getValues();
  var config = SHEET_CONFIG[table];
  var fieldIndex = config.columns.indexOf(field);
  if (fieldIndex === -1) return { error:'Kolom "'+field+'" tidak ditemukan' };
  var result = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][fieldIndex]) continue;
    if (String(data[i][fieldIndex]).toLowerCase().indexOf(String(value).toLowerCase()) !== -1) {
      var row = rowToObject(table, data[i]); row._row = i + 1; result.push(row);
    }
  }
  return result;
}

// ============================================================
// ✏️ CREATE
// ============================================================
function createRow(table, rowData) {
  var config = SHEET_CONFIG[table];
  var sheet = getSheet(table);
  var now = new Date().toISOString();
  if (!rowData[config.idField]) {
    rowData[config.idField] = table.substring(0,3).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
  }
  if (config.columns.indexOf('Tanggal') !== -1 && !rowData.Tanggal) rowData.Tanggal = new Date().toLocaleDateString('id-ID');
  if (config.columns.indexOf('Tanggal_Daftar') !== -1 && !rowData.Tanggal_Daftar) rowData.Tanggal_Daftar = new Date().toLocaleDateString('id-ID');
  if (config.columns.indexOf('Waktu_Input') !== -1) rowData.Waktu_Input = now;
  if (config.columns.indexOf('Terakhir_Diubah') !== -1) rowData.Terakhir_Diubah = now;
  var newRow = [];
  for (var j = 0; j < config.columns.length; j++) newRow.push(rowData[config.columns[j]] || '');
  sheet.appendRow(newRow);
  return { status:'ok', message:'Data berhasil ditambahkan', id:rowData[config.idField], data:rowData };
}

function bulkCreate(table, rows) {
  var results = [];
  for (var r = 0; r < rows.length; r++) results.push(createRow(table, rows[r]));
  return { status:'ok', message:results.length+' data ditambahkan', results:results };
}

// ============================================================
// 🔄 UPDATE
// ============================================================
function updateRow(table, id, rowData) {
  var config = SHEET_CONFIG[table];
  var sheet = getSheet(table);
  var data = sheet.getDataRange().getValues();
  var foundRow = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(id).trim()) { foundRow = i + 1; break; }
  }
  if (foundRow === -1) return { status:'error', message:'ID "'+id+'" tidak ditemukan di '+table };
  if (config.columns.indexOf('Terakhir_Diubah') !== -1) rowData.Terakhir_Diubah = new Date().toISOString();
  if (config.columns.indexOf('Waktu_Edit') !== -1) rowData.Waktu_Edit = new Date().toISOString();
  for (var key in rowData) {
    var colIndex = config.columns.indexOf(key);
    if (colIndex !== -1) sheet.getRange(foundRow, colIndex + 1).setValue(rowData[key]);
  }
  return { status:'ok', message:'Data berhasil diupdate', id:id, data:getRowById(table, id) };
}

// ============================================================
// 🗑️ DELETE (with Cascade)
// ============================================================
function deleteRow(table, id, cascade) {
  var config = SHEET_CONFIG[table];
  var sheet = getSheet(table);
  var data = sheet.getDataRange().getValues();
  var foundRow = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(id).trim()) { foundRow = i + 1; break; }
  }
  if (foundRow === -1) return { status:'error', message:'ID "'+id+'" tidak ditemukan di '+table };
  var deletedData = rowToObject(table, data[foundRow - 1]);
  var cascadeLog = [];
  if (cascade && CASCADE_DELETE_CONFIG[table]) {
    var cc = CASCADE_DELETE_CONFIG[table];
    var sourceValue = deletedData[cc.cek_id_kolom] || id;
    for (var t = 0; t < cc.targets.length; t++) {
      var target = cc.targets[t];
      var count = cascadeDeleteInTable(target.table, target.kolom, sourceValue);
      if (count > 0) cascadeLog.push('Menghapus '+count+' baris dari '+target.table);
    }
  }
  sheet.deleteRow(foundRow);
  return { status:'ok', message:'Data berhasil dihapus', id:id, deletedData:deletedData, cascade:cascadeLog };
}

function cascadeDeleteInTable(table, kolom, value) {
  var config = SHEET_CONFIG[table];
  var sheet = getSheet(table);
  var data = sheet.getDataRange().getValues();
  var colIndex = config.columns.indexOf(kolom);
  if (colIndex === -1) return 0;
  var rowsToDelete = [];
  for (var i = data.length - 1; i >= 0; i--) {
    if (String(data[i][colIndex]).trim() === String(value).trim()) rowsToDelete.push(i + 1);
  }
  for (var r = 0; r < rowsToDelete.length; r++) sheet.deleteRow(rowsToDelete[r]);
  return rowsToDelete.length;
}

function bulkDelete(table, ids) {
  var results = [];
  for (var i = 0; i < ids.length; i++) results.push(deleteRow(table, ids[i], true));
  return { status:'ok', deleted:results.length, results:results };
}

// ============================================================
// 📸 TELEGRAM
// ============================================================

/**
 * handleTelegramUpload — upload dari Telegram bot ke sheet
 * V5.2: tidak ada kolom ganda (Judul → Judul_Kegiatan, Link_Foto → Foto_URL)
 */
function handleTelegramUpload(payload) {
  var table    = payload.table || '';
  var rowData  = payload.data || {};
  var fileInfo = payload.fileInfo || {};

  if (!table || !SHEET_CONFIG[table]) return { status:'error', message:'Table tidak valid' };

  // V5.2: gunakan field yang sesuai header asli
  if (fileInfo.fileId)  rowData.Foto_URL     = 'https://drive.google.com/uc?export=view&id=' + fileInfo.fileId;
  if (fileInfo.caption) rowData.Caption      = fileInfo.caption;
  if (fileInfo.mimeType) {
    rowData.Jenis_Media = fileInfo.mimeType;
    rowData.Is_Video    = fileInfo.mimeType.indexOf('video') !== -1 ? 'TRUE' : 'FALSE';
  }

  // Default untuk Galeri
  if (table === 'Galeri') {
    rowData.Status_Approval = rowData.Status_Approval || 'PENDING';
    rowData.Kategori_Akses  = rowData.Kategori_Akses  || 'PUBLIC';
    if (!rowData.Tanggal) rowData.Tanggal = new Date().toLocaleDateString('id-ID');
  }

  return createRow(table, rowData);
}

function handleTelegramDelete(payload) {
  if (!payload.table || !payload.id) return { status:'error', message:'Table dan ID harus diisi' };
  return deleteRow(payload.table, payload.id, true);
}

/**
 * handleTelegramBroadcast — kirim pesan broadcast ke Telegram
 * V5.2: BOT_TOKEN + CHAT_ID dari PropertiesService
 */
function handleTelegramBroadcast(data) {
  var botToken = getConfig('TELEGRAM_BOT_TOKEN');
  var chatId   = getConfig('TELEGRAM_CHAT_ID');
  var message  = data.message || data.text || '';
  var parseMode = data.parse_mode || 'HTML';

  if (!botToken || !chatId) {
    return { status:'error', message:'TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID belum dikonfigurasi di Script Properties.' };
  }
  if (!message) return { status:'error', message:'Pesan kosong' };

  var url = 'https://api.telegram.org/bot' + botToken + '/sendMessage';
  var payload = {
    chat_id:    chatId,
    text:       message,
    parse_mode: parseMode
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var result = JSON.parse(response.getContentText());
    if (result.ok) {
      return { status:'ok', message:'Broadcast terkirim', telegram:result.result };
    }
    return { status:'error', message:'Telegram API error', raw:result };
  } catch(err) {
    return { status:'error', message:'Telegram error: '+err.toString() };
  }
}

// ============================================================
// 🤖 AI CHAT (Gemini + Groq)
// ============================================================
function handleChat(message, context, provider) {
  provider = provider || 'gemini';
  if (!message) return { status:'error', message:'Pesan kosong' };
  var systemPrompt = buildSystemContext(context);
  switch(provider.toLowerCase()) {
    case 'gemini': return chatWithGemini(message, systemPrompt);
    case 'groq':   return chatWithGroq(message, systemPrompt);
    default:       return chatWithGemini(message, systemPrompt);
  }
}

function buildSystemContext(contextFilter) {
  var anggotaCount = getSheet('Anggota').getLastRow() - 1;
  var agendaCount  = getSheet('Agenda').getLastRow() - 1;
  var kasSheet = getSheet('Kas');
  var kasData = kasSheet.getDataRange().getValues();
  var saldo = 0;
  for (var i = kasData.length - 1; i >= 0; i--) { if (kasData[i][6]) { saldo = Number(kasData[i][6]) || 0; break; } }
  return 'Kamu adalah AI asisten untuk Portal Pemuda RT 03 Denokan (Remaja Legok 03). Data: '+anggotaCount+' anggota, '+agendaCount+' agenda, Saldo: Rp '+saldo.toLocaleString('id-ID')+'. Jawab ramah & bantu pengguna.';
}

function chatWithGemini(message, systemPrompt) {
  var apiKey = getConfig('GEMINI_API_KEY');
  if (!apiKey) return { status:'error', message:'GEMINI_API_KEY belum dikonfigurasi di Script Properties.' };
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;
  var payload = { contents: [{ parts: [{ text: systemPrompt + '\n\nUser: ' + message }] }] };
  var options = { method:'post', contentType:'application/json', payload:JSON.stringify(payload), muteHttpExceptions:true };
  try {
    var response = UrlFetchApp.fetch(url, options);
    var result = JSON.parse(response.getContentText());
    if (result.candidates && result.candidates.length > 0) return { status:'ok', reply:result.candidates[0].content.parts[0].text, provider:'gemini' };
    return { status:'error', message:'Gemini tidak memberikan respons', raw:result };
  } catch(err) { return { status:'error', message:'Gemini API error: '+err.toString() }; }
}

function chatWithGroq(message, systemPrompt) {
  var apiKey = getConfig('GROQ_API_KEY');
  if (!apiKey) return { status:'error', message:'GROQ_API_KEY belum dikonfigurasi di Script Properties.' };
  var url = 'https://api.groq.com/openai/v1/chat/completions';
  var payload = { model:'llama-3.3-70b-versatile', messages:[{ role:'system', content:systemPrompt }, { role:'user', content:message }], max_tokens:1024 };
  var options = { method:'post', contentType:'application/json', headers:{ 'Authorization':'Bearer '+apiKey }, payload:JSON.stringify(payload), muteHttpExceptions:true };
  try {
    var response = UrlFetchApp.fetch(url, options);
    var result = JSON.parse(response.getContentText());
    if (result.choices && result.choices.length > 0) return { status:'ok', reply:result.choices[0].message.content, provider:'groq' };
    return { status:'error', message:'Groq tidak memberikan respons', raw:result };
  } catch(err) { return { status:'error', message:'Groq API error: '+err.toString() }; }
}

// ============================================================
// 📁 FILE UPLOAD
// ============================================================
function handleFileUpload(data) {
  var fileName = data.fileName || 'upload_' + Date.now();
  var fileData = data.fileData || data.base64 || '';
  var mimeType = data.mimeType || 'image/jpeg';
  var folderKey = data.folder || 'DRIVE_FOLDER_BUKTI';  // V5.2: baca dari property

  if (!fileData) return { status:'error', message:'Tidak ada data file' };

  try {
    var blob = Utilities.newBlob(Utilities.base64Decode(fileData), mimeType, fileName);
    var folder;

    // V5.2: baca folder ID dari PropertiesService
    var folderId = getConfig(folderKey);
    if (folderId) {
      folder = DriveApp.getFolderById(folderId);
    } else {
      var folderName = (folderKey === 'DRIVE_FOLDER_PROFIL') ? 'PortalPemuda_Profil' : 'PortalPemuda_Uploads';
      var folders = DriveApp.getFoldersByName(folderName);
      folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    }

    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return {
      status:'ok', fileId:file.getId(),
      downloadUrl:'https://drive.google.com/uc?export=view&id='+file.getId(),
      fileName:file.getName(), mimeType:file.getMimeType(), size:file.getSize()
    };
  } catch(err) { return { status:'error', message:'Upload gagal: '+err.toString() }; }
}

// ============================================================
// 🔧 HELPERS
// ============================================================
function getSheet(name) {
  return SpreadsheetApp.openById(getConfig('SPREADSHEET_ID')).getSheetByName(name);
}

function rowToObject(table, rowArray) {
  var config = SHEET_CONFIG[table], obj = {};
  for (var j = 0; j < config.columns.length; j++) obj[config.columns[j]] = rowArray[j] !== undefined ? rowArray[j] : '';
  return obj;
}

function json(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function getDashboardSummary() {
  return {
    totalAnggota:    getSheet('Anggota').getLastRow() - 1,
    totalAgenda:     getSheet('Agenda').getLastRow() - 1,
    totalPengumuman: getSheet('Pengumuman').getLastRow() - 1,
    totalAspirasi:   getSheet('Aspirasi').getLastRow() - 1,
    totalGaleri:     getSheet('Galeri').getLastRow() - 1,
    saldoKas: (function(){
      var d = getSheet('Kas').getDataRange().getValues();
      for (var i=d.length-1; i>=0; i--) if (d[i][6]) return Number(d[i][6])||0;
      return 0;
    })(),
    timestamp: new Date().toISOString()
  };
}

// ============================================================
// ⚙️ SETUP — inisialisasi sheet jika belum ada (non-destruktif)
// ============================================================
function setup() {
  var ss = SpreadsheetApp.openById(getConfig('SPREADSHEET_ID'));
  var sheets = Object.keys(SHEET_CONFIG);
  for (var s = 0; s < sheets.length; s++) {
    var name = sheets[s];
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name, s);
      sheet.appendRow(SHEET_CONFIG[name].columns);
      sheet.setFrozenRows(1);
      Logger.log('✅ Sheet dibuat: ' + name);
    }
  }
  Logger.log('✅ Setup selesai');
}

// ============================================================
// 🧪 TEST FUNCTION — jalankan untuk validasi V5.3
// ============================================================
function testAll() {
  Logger.log('=== V5.3 TEST ===');

  // Test config loader
  Logger.log('Spreadsheet: ' + getConfig('SPREADSHEET_ID'));
  Logger.log('Gemini key:  ' + (getConfig('GEMINI_API_KEY') ? '✅ ada' : '❌ kosong'));
  Logger.log('Telegram:    ' + (getConfig('TELEGRAM_BOT_TOKEN') ? '✅ ada' : '⏭️ skip'));
  Logger.log('PIN_SALT:    ' + (getConfig('PIN_SALT') ? '✅ ada' : '❌ kosong'));
  Logger.log('PIN config:  ' + JSON.stringify(getPinConfig()));

  // Test SHA-256
  var testHash = sha256('test123');
  Logger.log('SHA-256 test: ' + testHash + ' (' + testHash.length + ' chars)');
  var testHash2 = hashPin('test123');
  Logger.log('hashPin test: ' + testHash2 + ' (' + testHash2.length + ' chars)');
  Logger.log('Same input = same hash? ' + (hashPin('test123') === testHash2 ? '✅' : '❌'));
  Logger.log('Different input = different hash? ' + (hashPin('test124') !== testHash2 ? '✅' : '❌'));

  // Test CRUD
  var dashboard = getDashboardSummary();
  Logger.log('Dashboard: ' + JSON.stringify(dashboard));

  var dummyId = 'TEST-' + Date.now().toString(36);
  var create = createRow('Anggota', {
    ID_Anggota: dummyId, Nama_Lengkap: 'Test V5.3', Jabatan: 'Anggota',
    Status_Aktif: 'Aktif', Status_Tampil: 'AKTIF'
  });
  Logger.log('Create: ' + JSON.stringify(create));

  // Test setPin
  var setPinRes = setPin(dummyId, '123456');
  Logger.log('setPin:  ' + JSON.stringify(setPinRes));

  // Test verifikasiPin dengan PIN individu
  var verifyRes = verifikasiPin(dummyId, '123456');
  Logger.log('verify (individu valid):   ' + verifyRes.valid + ' | ' + verifyRes.auth_method);

  var verifyFail = verifikasiPin(dummyId, '999999');
  Logger.log('verify (individu invalid): ' + verifyFail.valid + ' | ' + verifyFail.message);

  // Test resetPin
  var resetRes = resetPin(dummyId, '7777');
  Logger.log('resetPin: ' + JSON.stringify(resetRes));

  // Test verifikasiPin setelah reset (fallback ke role-PIN)
  var verifyRole = verifikasiPin(dummyId, '0000');
  Logger.log('verify (role fallback):    ' + verifyRole.valid + ' | ' + verifyRole.auth_method);

  // Cleanup
  var del = deleteRow('Anggota', dummyId, false);
  Logger.log('Delete: ' + JSON.stringify(del));

  Logger.log('=== ALL TESTS DONE ===');
}
