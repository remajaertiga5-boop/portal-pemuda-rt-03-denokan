// ============================================================
// GOOGLE APPS SCRIPT - BACKEND REMAJA LEGOK 03
// RT 03 RW 04 Denokan, Gondoryo, Jambu, Semarang
// ============================================================

const SHEET_ID       = 'ISI_ID_SPREADSHEET_ANDA';
const FOLDER_GALERI_ID = 'ISI_ID_FOLDER_DRIVE_GALERI';

// ============================================================
// ROUTER
// ============================================================

function doGet(e) {
  try {
    const action = e && e.parameter && e.parameter.action;
    if (!action) {
      return responseJSON({ status: 'error', message: 'Parameter action wajib diisi.' });
    }

    switch (action) {
      case 'getGaleri':
        return getGaleri(e.parameter.level_akses || 'TAMU');
      default: {
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
      }
    }
  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  }
}

function doPost(e) {
  try {
    // ✅ Fix Bug 3: Validasi postData tidak null
    if (!e || !e.postData || !e.postData.contents) {
      return responseJSON({ status: 'error', message: 'Request body kosong.' });
    }

    const body   = JSON.parse(e.postData.contents);
    const action = body.action;

    if (!action) {
      return responseJSON({ status: 'error', message: 'Parameter action wajib diisi.' });
    }

    switch (action) {
      case 'verifikasiID':
        return verifikasiID(body.id_anggota);
      case 'verifikasiPengurus':
        return verifikasiPengurus(body.id_anggota, body.pin);
      case 'verifikasiKetua':
        return verifikasiKetua(body.id_anggota, body.pin);
      case 'getKasSaya':
        return getKasSaya(body.id_anggota);
      case 'getGaleri':
        return getGaleri(body.level_akses);
      case 'uploadFoto':
        return uploadFoto(body);
      case 'buatAlbum':
        return buatAlbum(body);
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

// ✅ Fix Bug 2: Ambil PIN dari sheet, tanpa fallback hardcoded
function ambilPIN(keyName) {
  const sheet = getSheet('Pengaturan');
  if (!sheet) return null;

  const data   = sheet.getDataRange().getValues();
  const pinRow = data.find(r => r[0] === keyName);
  if (!pinRow || !pinRow[1]) return null;

  return pinRow[1].toString().trim();
}

// ✅ Fix Bug 1: Helper cari anggota — tidak return ContentService
//    agar bisa dipanggil dari fungsi lain
function cariAnggota(id_anggota) {
  if (!id_anggota) {
    return { status: 'error', message: 'ID Anggota wajib diisi.' };
  }

  const sheet = getSheet('Anggota');
  if (!sheet) {
    return { status: 'error', message: 'Sheet Anggota tidak ditemukan.' };
  }

  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIdx   = headers.indexOf('ID_Anggota');
  const stIdx   = headers.indexOf('Status_Tampil');

  if (idIdx === -1) {
    return { status: 'error', message: 'Kolom ID_Anggota tidak ditemukan.' };
  }

  const row = data.slice(1).find(
    r => r[idIdx] === id_anggota && r[stIdx] === 'TAMPIL'
  );

  if (!row) {
    return { status: 'error', message: 'ID Anggota tidak ditemukan atau diarsip.' };
  }

  return {
    status: 'success',
    data: {
      id_anggota    : row[idIdx],
      nama_lengkap  : row[headers.indexOf('Nama_Lengkap')]   ?? '',
      nama_panggilan: row[headers.indexOf('Nama_Panggilan')] ?? '',
      status_aktif  : row[headers.indexOf('Status_Aktif')]   ?? '',
      role          : 'ANGGOTA'
    }
  };
}

// ✅ Fix Bug 5: Log aktivitas dengan info yang lebih akurat
function logAktivitas(id_anggota, nama, role, aksi, detail) {
  try {
    const sheet = getSheet('Log_Akses');
    if (!sheet) return;

    sheet.appendRow([
      new Date().toISOString(),
      id_anggota || 'TAMU',
      nama       || 'Tidak Diketahui',
      role       || 'TAMU',
      aksi,
      detail,
      'Apps Script Web Client'
    ]);
  } catch (err) {
    console.error('[logAktivitas] Error:', err.toString());
  }
}

// ============================================================
// VERIFIKASI & AUTH
// ============================================================

function verifikasiID(id_anggota) {
  const result = cariAnggota(id_anggota);

  if (result.status === 'success') {
    logAktivitas(
      result.data.id_anggota,
      result.data.nama_lengkap,
      'ANGGOTA',
      'VERIFIKASI_ID',
      'Login Anggota Berhasil'
    );
  }

  return responseJSON(result);
}

function verifikasiPengurus(id_anggota, pin) {
  if (!pin) {
    return responseJSON({ status: 'error', message: 'PIN wajib diisi.' });
  }

  // ✅ Fix Bug 2: Tidak ada fallback PIN hardcoded
  const validPin = ambilPIN('PIN_PENGURUS');
  if (!validPin) {
    return responseJSON({ status: 'error', message: 'PIN Pengurus belum dikonfigurasi di sheet Pengaturan.' });
  }

  if (pin !== validPin) {
    return responseJSON({ status: 'error', message: 'PIN Pengurus salah.' });
  }

  // ✅ Fix Bug 1: Panggil cariAnggota() bukan verifikasiID()
  const result = cariAnggota(id_anggota);
  if (result.status !== 'success') return responseJSON(result);

  result.data.role = 'PENGURUS';

  logAktivitas(
    result.data.id_anggota,
    result.data.nama_lengkap,
    'PENGURUS',
    'VERIFIKASI_PENGURUS',
    'Akses Pengurus Disetujui'
  );

  return responseJSON({ status: 'success', data: result.data });
}

function verifikasiKetua(id_anggota, pin) {
  if (!pin) {
    return responseJSON({ status: 'error', message: 'PIN wajib diisi.' });
  }

  // ✅ Fix Bug 2: Tidak ada fallback PIN hardcoded
  const validPin = ambilPIN('PIN_ADMIN');
  if (!validPin) {
    return responseJSON({ status: 'error', message: 'PIN Admin belum dikonfigurasi di sheet Pengaturan.' });
  }

  if (pin !== validPin) {
    return responseJSON({ status: 'error', message: 'PIN Ketua/Admin salah.' });
  }

  // ✅ Fix Bug 1: Panggil cariAnggota() bukan verifikasiID()
  const result = cariAnggota(id_anggota);
  if (result.status !== 'success') return responseJSON(result);

  result.data.role = 'ADMIN';

  logAktivitas(
    result.data.id_anggota,
    result.data.nama_lengkap,
    'ADMIN',
    'VERIFIKASI_KETUA',
    'Akses Admin/Ketua Disetujui'
  );

  return responseJSON({ status: 'success', data: result.data });
}

// ============================================================
// KAS SAYA
// ============================================================

function getKasSaya(id_anggota) {
  if (!id_anggota) {
    return responseJSON({ status: 'error', message: 'ID Anggota wajib diisi.' });
  }

  try {
    // Ambil iuran
    const iuranSheet = getSheet('Iuran');
    const iuranData  = iuranSheet ? iuranSheet.getDataRange().getValues() : [];
    const iHeader    = iuranData[0] || [];
    const idIdxI     = iHeader.indexOf('ID_Anggota');

    const myIuran = iuranData.slice(1)
      .filter(r => r[idIdxI] === id_anggota)
      .map(r => ({
        bulan : r[iHeader.indexOf('Bulan')]   ?? '',
        tahun : r[iHeader.indexOf('Tahun')]   ?? '',
        jumlah: r[iHeader.indexOf('Jumlah')]  ?? 0,
        status: r[iHeader.indexOf('Status')]  ?? ''
      }));

    // Ambil absensi
    const absSheet = getSheet('Absensi');
    const absData  = absSheet ? absSheet.getDataRange().getValues() : [];
    const aHeader  = absData[0] || [];
    const idIdxA   = aHeader.indexOf('ID_Anggota');

    const myAbsensi = absData.slice(1)
      .filter(r => r[idIdxA] === id_anggota)
      .map(r => ({
        agenda: r[aHeader.indexOf('ID_Agenda')] ?? '',
        status: r[aHeader.indexOf('Status')]    ?? '',
        waktu : r[aHeader.indexOf('Waktu')]     ?? ''
      }));

    return responseJSON({
      status: 'success',
      data  : { iuran: myIuran, absensi: myAbsensi }
    });

  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  }
}

// ============================================================
// GALERI
// ============================================================

// ✅ Fix Bug 4: Validasi level_akses
const VALID_LEVELS = ['TAMU', 'ANGGOTA', 'PENGURUS', 'ADMIN'];

function getGaleri(level_akses) {
  // ✅ Validasi level akses
  const level = VALID_LEVELS.includes(level_akses) ? level_akses : 'TAMU';

  try {
    // Ambil foto
    const fotoSheet = getSheet('Galeri');
    const fotoData  = fotoSheet ? fotoSheet.getDataRange().getValues() : [[]];
    const fHeaders  = fotoData[0] || [];
    const catIdxF   = fHeaders.indexOf('Kategori_Akses');
    const statIdxF  = fHeaders.indexOf('Status');

    const foto = fotoData.slice(1)
      .filter(r => {
        if (r[statIdxF] !== 'AKTIF') return false;
        const cat = r[catIdxF];
        if (level === 'TAMU')    return cat === 'PUBLIK';
        if (level === 'ANGGOTA') return cat === 'PUBLIK' || cat === 'ANGGOTA';
        return true; // PENGURUS & ADMIN lihat semua
      })
      .map(r => {
        const obj = {};
        fHeaders.forEach((h, i) => { obj[h] = r[i] ?? ''; });
        return obj;
      });

    // Ambil album
    const albumSheet = getSheet('Album');
    const albumData  = albumSheet ? albumSheet.getDataRange().getValues() : [[]];
    const aHeaders   = albumData[0] || [];
    const catIdxA    = aHeaders.indexOf('Kategori_Akses');
    const statIdxA   = aHeaders.indexOf('Status');

    const album = albumData.slice(1)
      .filter(r => {
        if (r[statIdxA] !== 'AKTIF') return false;
        const cat = r[catIdxA];
        if (level === 'TAMU')    return cat === 'PUBLIK';
        if (level === 'ANGGOTA') return cat === 'PUBLIK' || cat === 'ANGGOTA';
        return true;
      })
      .map(r => {
        const obj = {};
        aHeaders.forEach((h, i) => { obj[h] = r[i] ?? ''; });
        return obj;
      });

    return responseJSON({ status: 'success', data: { foto, album } });

  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  }
}

// ============================================================
// UPLOAD FOTO
// ✅ Fix Bug 6: Implementasikan fungsi yang sebelumnya tidak ada
// ============================================================

function uploadFoto(body) {
  // Validasi input
  if (!body.base64 || !body.mimeType || !body.fileName) {
    return responseJSON({ status: 'error', message: 'base64, mimeType, dan fileName wajib diisi.' });
  }
  if (!body.id_anggota || !body.level_akses) {
    return responseJSON({ status: 'error', message: 'id_anggota dan level_akses wajib diisi.' });
  }

  // Whitelist tipe file
  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!ALLOWED.includes(body.mimeType)) {
    return responseJSON({ status: 'error', message: 'Tipe file tidak didukung.' });
  }

  // Validasi ukuran (max 5MB)
  const base64Data  = body.base64.includes(',') ? body.base64.split(',')[1] : body.base64;
  const sizeInBytes = (base64Data.length * 3) / 4;
  if (sizeInBytes > 5 * 1024 * 1024) {
    return responseJSON({ status: 'error', message: 'Ukuran file melebihi 5MB.' });
  }

  // Validasi level akses untuk upload
  if (!['ANGGOTA', 'PENGURUS', 'ADMIN'].includes(body.level_akses)) {
    return responseJSON({ status: 'error', message: 'Level akses tidak valid untuk upload.' });
  }

  try {
    const folder = DriveApp.getFolderById(FOLDER_GALERI_ID);
    const blob   = Utilities.newBlob(
      Utilities.base64Decode(base64Data),
      body.mimeType,
      body.fileName
    );
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fotoId = 'FOT' + Date.now();

    // Simpan ke sheet Galeri
    const sheet = getSheet('Galeri');
    if (sheet) {
      sheet.appendRow([
        fotoId,
        body.judul           || 'Foto Kegiatan',
        file.getUrl(),
        `https://drive.google.com/uc?id=${file.getId()}`,
        body.album_id        || '',
        new Date().toISOString(),
        body.kategori_akses  || 'ANGGOTA',
        body.id_anggota,
        body.nama_upload     || '',
        body.level_akses,
        body.caption         || '',
        'AKTIF'
      ]);
    }

    logAktivitas(
      body.id_anggota,
      body.nama_upload || '',
      body.level_akses,
      'UPLOAD_FOTO',
      `Upload: ${body.fileName}`
    );

    return responseJSON({
      status     : 'success',
      data       : {
        id_foto    : fotoId,
        url        : file.getUrl(),
        downloadUrl: `https://drive.google.com/uc?id=${file.getId()}`
      }
    });

  } catch (err) {
    return responseJSON({ status: 'error', message: 'Upload gagal: ' + err.toString() });
  }
}

// ============================================================
// BUAT ALBUM
// ✅ Fix Bug 6: Implementasikan fungsi yang sebelumnya tidak ada
// ============================================================

function buatAlbum(body) {
  if (!body.nama_album || !body.id_anggota) {
    return responseJSON({ status: 'error', message: 'nama_album dan id_anggota wajib diisi.' });
  }

  // Validasi level akses untuk buat album
  if (!['ANGGOTA', 'PENGURUS', 'ADMIN'].includes(body.level_akses)) {
    return responseJSON({ status: 'error', message: 'Level akses tidak valid untuk buat album.' });
  }

  // Tamu tidak bisa buat album
  const kategoriAkses = body.kategori_akses || 'ANGGOTA';
  // Anggota hanya bisa buat album level ANGGOTA atau PUBLIK
  if (body.level_akses === 'ANGGOTA' && kategoriAkses === 'PENGURUS') {
    return responseJSON({ status: 'error', message: 'Anggota tidak bisa buat album level Pengurus.' });
  }

  try {
    const sheet   = getSheet('Album');
    if (!sheet) {
      return responseJSON({ status: 'error', message: 'Sheet Album tidak ditemukan.' });
    }

    const albumId = 'ALB' + Date.now();

    sheet.appendRow([
      albumId,
      body.nama_album,
      body.deskripsi         || '',
      body.tanggal_kegiatan  || new Date().toISOString(),
      body.id_anggota,
      body.nama_pembuat      || '',
      body.level_akses,
      kategoriAkses,
      0,           // Jumlah_Foto awal = 0
      'AKTIF'
    ]);

    logAktivitas(
      body.id_anggota,
      body.nama_pembuat || '',
      body.level_akses,
      'BUAT_ALBUM',
      `Album: ${body.nama_album}`
    );

    return responseJSON({
      status: 'success',
      data  : { id_album: albumId, nama_album: body.nama_album }
    });

  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  }
}