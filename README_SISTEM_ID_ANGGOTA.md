// ============================================================
// GOOGLE APPS SCRIPT - SISTEM ID ANGGOTA REMAJA LEGOK 03
// RT 03 RW 04 Denokan, Gondoryo, Jambu, Semarang
// ============================================================

const SHEET_ID = 'ISI_ID_SPREADSHEET_ANDA';
const KODE_POS = '50663';
const RT       = '03';
const RW       = '04';

// ============================================================
// ROUTER
// ============================================================

function doGet(e) {
  try {
    const action = e && e.parameter && e.parameter.action;
    if (!action) {
      return responseJSON({ status: 'error', message: 'Parameter action wajib diisi.' });
    }

    if (action === 'Anggota') {
      return getAnggotaPublik();
    }

    // Handle sheet lain secara generik
    const sheet = getSheet(action);
    if (!sheet) {
      return responseJSON({ status: 'error', message: `Sheet '${action}' tidak ditemukan.` });
    }

    const data    = sheet.getDataRange().getValues();
    const headers = data[0];
    const result  = data.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
      return obj;
    });

    return responseJSON({ status: 'success', data: result });

  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  }
}

function doPost(e) {
  try {
    // ✅ Fix Bug 3: Validasi postData
    if (!e || !e.postData || !e.postData.contents) {
      return responseJSON({ status: 'error', message: 'Request body kosong.' });
    }

    const body   = JSON.parse(e.postData.contents);
    const action = body.action;
    const pin    = body.pin || '';

    if (!action) {
      return responseJSON({ status: 'error', message: 'Parameter action wajib diisi.' });
    }

    // Aksi yang memerlukan PIN Admin
    const ADMIN_ACTIONS = [
      'arsipAnggota',
      'kembalikanAnggota',
      'getRiwayatAnggota',
      'getAllAnggotaAdmin'
    ];

    if (ADMIN_ACTIONS.includes(action)) {
      const pinCheck = verifikasiPinAdmin(pin);
      if (!pinCheck.valid) {
        return responseJSON({ status: 'error', message: pinCheck.message });
      }
    }

    switch (action) {
      case 'addAnggota':
        return addAnggota(body.data);
      case 'arsipAnggota':
        return arsipAnggota(body.id_anggota, body.nama_ketua);
      case 'kembalikanAnggota':
        return kembalikanAnggota(body.id_anggota);
      case 'getRiwayatAnggota':
        return getRiwayatAnggota(body.id_anggota);
      case 'getAllAnggotaAdmin':
        return getAllAnggotaAdmin();
      default:
        return responseJSON({ status: 'error', message: `Aksi '${action}' tidak dikenal.` });
    }

  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  }
}

// ============================================================
// HELPER
// ============================================================

// ✅ Fix Bug 7: Satu fungsi responseJSON untuk semua
function responseJSON(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet(sheetName) {
  try {
    return SpreadsheetApp.openById(SHEET_ID).getSheetByName(sheetName);
  } catch (e) {
    return null;
  }
}

// ✅ Fix Bug 1: Tidak ada fallback PIN hardcoded
function verifikasiPinAdmin(pin) {
  if (!pin || pin.trim().length < 6) {
    return { valid: false, message: 'PIN tidak valid.' };
  }

  try {
    const sheet = getSheet('Pengaturan');
    if (!sheet) {
      return { valid: false, message: 'Sheet Pengaturan tidak ditemukan.' };
    }

    const data   = sheet.getDataRange().getValues();
    const pinRow = data.find(r => r[0] === 'PIN_ADMIN');

    if (!pinRow || !pinRow[1]) {
      return { valid: false, message: 'PIN Admin belum dikonfigurasi di sheet Pengaturan.' };
    }

    const validPin = pinRow[1].toString().trim();
    if (pin !== validPin) {
      return { valid: false, message: 'PIN Admin salah.' };
    }

    return { valid: true, message: 'OK' };

  } catch (err) {
    return { valid: false, message: 'Gagal verifikasi PIN: ' + err.toString() };
  }
}

// ✅ Fix Bug 2: generateID dengan Lock untuk cegah race condition
function generateID(sheet) {
  const lock = LockService.getScriptLock();

  try {
    // Tunggu maksimal 10 detik untuk dapat lock
    lock.waitLock(10000);

    const data     = sheet.getDataRange().getValues();
    // Hitung dari data yang ada (exclude header)
    const totalData = data.length - 1;
    // Nomor urut = total data + 1 (data baru)
    const urut     = (totalData + 1).toString().padStart(3, '0');

    let isUnique = false;
    let newId    = '';
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      // 4 angka acak antara 1000-9999
      const acak = Math.floor(1000 + Math.random() * 9000).toString();
      newId      = `${KODE_POS}-${acak}-${RT}-${RW}-${urut}`;

      // Cek duplikat di kolom ID_Anggota (kolom pertama)
      const found = data.slice(1).find(row => row[0] === newId);
      if (!found) isUnique = true;
      attempts++;
    }

    if (!isUnique) {
      throw new Error('Gagal generate ID unik setelah 10 percobaan.');
    }

    return newId;

  } finally {
    // Selalu lepas lock
    lock.releaseLock();
  }
}

// ============================================================
// ANGGOTA - PUBLIK
// ============================================================

// ✅ Fix Bug 4: Pakai indexOf bukan hardcoded index
function getAnggotaPublik() {
  try {
    const sheet   = getSheet('Anggota');
    if (!sheet) return responseJSON({ status: 'error', message: 'Sheet Anggota tidak ditemukan.' });

    const data    = sheet.getDataRange().getValues();
    const headers = data[0];
    const stIdx   = headers.indexOf('Status_Tampil');

    if (stIdx === -1) {
      return responseJSON({ status: 'error', message: 'Kolom Status_Tampil tidak ditemukan.' });
    }

    const result = data.slice(1)
      .filter(row => row[stIdx] === 'TAMPIL')
      .map(row => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });

        // Sembunyikan data sensitif untuk akses publik
        delete obj['No_HP'];
        delete obj['Catatan'];
        delete obj['Diarsip_Oleh'];
        delete obj['Tanggal_Arsip'];

        return obj;
      });

    return responseJSON({ status: 'success', data: result });

  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  }
}

// ============================================================
// ANGGOTA - ADMIN
// ============================================================

function getAllAnggotaAdmin() {
  try {
    const sheet   = getSheet('Anggota');
    if (!sheet) return responseJSON({ status: 'error', message: 'Sheet Anggota tidak ditemukan.' });

    const data    = sheet.getDataRange().getValues();
    const headers = data[0];

    const result = data.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
      return obj;
    });

    return responseJSON({ status: 'success', data: result });

  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  }
}

// ============================================================
// TAMBAH ANGGOTA
// ============================================================

// ✅ Fix Bug 6: Validasi field wajib
function addAnggota(data) {
  if (!data) {
    return responseJSON({ status: 'error', message: 'Data tidak boleh kosong.' });
  }

  const REQUIRED_FIELDS = ['Nama_Lengkap', 'Jenis_Kelamin'];
  for (const field of REQUIRED_FIELDS) {
    if (!data[field] || data[field].toString().trim() === '') {
      return responseJSON({
        status : 'error',
        message: `Field '${field}' wajib diisi.`
      });
    }
  }

  try {
    const sheet   = getSheet('Anggota');
    if (!sheet) {
      return responseJSON({ status: 'error', message: 'Sheet Anggota tidak ditemukan.' });
    }

    // ✅ Fix Bug 2: generateID sudah pakai Lock
    const newId     = generateID(sheet);
    const tglDaftar = new Date().toISOString().split('T')[0];

    // Sesuai urutan header:
    // ID_Anggota | Nama_Lengkap | Nama_Panggilan | Alamat | No_HP |
    // Jenis_Kelamin | Tanggal_Lahir | Minat_Bakat | Tanggal_Daftar |
    // Status_Aktif | Status_Tampil | Catatan | Diarsip_Oleh | Tanggal_Arsip
    const newRow = [
      newId,
      data.Nama_Lengkap.toString().trim(),
      data.Nama_Panggilan  || '',
      data.Alamat          || '',
      data.No_HP           || '',
      data.Jenis_Kelamin,
      data.Tanggal_Lahir   || '',
      data.Minat_Bakat     || '',
      tglDaftar,
      'AKTIF',
      'TAMPIL',
      '',
      '',
      ''
    ];

    sheet.appendRow(newRow);

    // Log pendaftaran
    logAktivitas(newId, data.Nama_Lengkap, 'ANGGOTA', 'DAFTAR', 'Pendaftaran anggota baru');

    return responseJSON({
      status    : 'success',
      message   : 'Pendaftaran berhasil! Simpan ID Anggota Anda.',
      id_anggota: newId
    });

  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  }
}

// ============================================================
// ARSIP & KEMBALIKAN ANGGOTA
// ============================================================

// ✅ Fix Bug 5: Pakai indexOf bukan hardcoded index
function arsipAnggota(id_anggota, nama_ketua) {
  if (!id_anggota) {
    return responseJSON({ status: 'error', message: 'ID Anggota wajib diisi.' });
  }

  try {
    const sheet   = getSheet('Anggota');
    if (!sheet) return responseJSON({ status: 'error', message: 'Sheet Anggota tidak ditemukan.' });

    const data    = sheet.getDataRange().getValues();
    const headers = data[0];

    // ✅ Cari index kolom dari header (bukan hardcoded)
    const idIdx       = headers.indexOf('ID_Anggota');
    const statAktifIdx = headers.indexOf('Status_Aktif');
    const statTampilIdx = headers.indexOf('Status_Tampil');
    const diarsipIdx  = headers.indexOf('Diarsip_Oleh');
    const tglArsipIdx = headers.indexOf('Tanggal_Arsip');

    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === id_anggota) {

        // Sudah diarsip sebelumnya?
        if (data[i][statTampilIdx] === 'ARSIP') {
          return responseJSON({ status: 'error', message: 'Anggota sudah diarsip sebelumnya.' });
        }

        sheet.getRange(i + 1, statAktifIdx  + 1).setValue('NONAKTIF');
        sheet.getRange(i + 1, statTampilIdx + 1).setValue('ARSIP');
        sheet.getRange(i + 1, diarsipIdx    + 1).setValue(nama_ketua || 'Admin');
        sheet.getRange(i + 1, tglArsipIdx   + 1).setValue(new Date().toISOString().split('T')[0]);

        logAktivitas(id_anggota, data[i][headers.indexOf('Nama_Lengkap')], 'ADMIN', 'ARSIP_ANGGOTA', `Diarsip oleh: ${nama_ketua}`);

        return responseJSON({ status: 'success', message: 'Anggota berhasil diarsipkan.' });
      }
    }

    return responseJSON({ status: 'error', message: 'Anggota tidak ditemukan.' });

  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  }
}

function kembalikanAnggota(id_anggota) {
  if (!id_anggota) {
    return responseJSON({ status: 'error', message: 'ID Anggota wajib diisi.' });
  }

  try {
    const sheet   = getSheet('Anggota');
    if (!sheet) return responseJSON({ status: 'error', message: 'Sheet Anggota tidak ditemukan.' });

    const data    = sheet.getDataRange().getValues();
    const headers = data[0];

    const idIdx        = headers.indexOf('ID_Anggota');
    const statAktifIdx = headers.indexOf('Status_Aktif');
    const statTampilIdx = headers.indexOf('Status_Tampil');
    const diarsipIdx   = headers.indexOf('Diarsip_Oleh');
    const tglArsipIdx  = headers.indexOf('Tanggal_Arsip');

    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === id_anggota) {

        // Sudah aktif?
        if (data[i][statTampilIdx] === 'TAMPIL') {
          return responseJSON({ status: 'error', message: 'Anggota sudah aktif.' });
        }

        sheet.getRange(i + 1, statAktifIdx  + 1).setValue('AKTIF');
        sheet.getRange(i + 1, statTampilIdx + 1).setValue('TAMPIL');
        sheet.getRange(i + 1, diarsipIdx    + 1).setValue('');
        sheet.getRange(i + 1, tglArsipIdx   + 1).setValue('');

        logAktivitas(id_anggota, data[i][headers.indexOf('Nama_Lengkap')], 'ADMIN', 'KEMBALIKAN_ANGGOTA', 'Status dikembalikan ke Aktif');

        return responseJSON({ status: 'success', message: 'Anggota berhasil dikembalikan.' });
      }
    }

    return responseJSON({ status: 'error', message: 'Anggota tidak ditemukan.' });

  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  }
}

// ============================================================
// RIWAYAT ANGGOTA
// ============================================================

function getRiwayatAnggota(id_anggota) {
  if (!id_anggota) {
    return responseJSON({ status: 'error', message: 'ID Anggota wajib diisi.' });
  }

  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);

    const getDataByID = (sheetName) => {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) return [];

      const data    = sheet.getDataRange().getValues();
      const headers = data[0];
      const idIdx   = headers.indexOf('ID_Anggota');

      if (idIdx === -1) return [];

      return data.slice(1)
        .filter(row => row[idIdx] === id_anggota)
        .map(row => {
          const obj = {};
          headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
          return obj;
        });
    };

    return responseJSON({
      status: 'success',
      data  : {
        absensi : getDataByID('Absensi'),
        iuran   : getDataByID('Iuran'),
        kas     : getDataByID('Kas'),
        aspirasi: getDataByID('Aspirasi')
      }
    });

  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  }
}

// ============================================================
// LOG AKTIVITAS
// ============================================================

function logAktivitas(id_anggota, nama, role, aksi, detail) {
  try {
    const sheet = getSheet('Log_Akses');
    if (!sheet) return;

    sheet.appendRow([
      new Date().toISOString(),
      id_anggota || 'SISTEM',
      nama       || '',
      role       || '',
      aksi,
      detail,
      'Apps Script'
    ]);
  } catch (err) {
    console.error('[logAktivitas] Error:', err.toString());
  }
}