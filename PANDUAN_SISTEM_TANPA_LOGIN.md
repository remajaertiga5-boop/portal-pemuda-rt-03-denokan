# PANDUAN SISTEM REMAJA LEGOK 03

Dokumen ini menjelaskan arsitektur backend dan API untuk sistem Remaja Legok 03.
Autentikasi menggunakan PIN terpusat yang disimpan di Google Sheets.

---

## 1. GOOGLE APPS SCRIPT — BACKEND

```javascript
// ============================================================
// GOOGLE APPS SCRIPT - BACKEND REMAJA LEGOK 03
// ============================================================

const SHEET_ID  = 'ISI_ID_SPREADSHEET_ANDA';
const FOLDER_ID = 'ISI_ID_FOLDER_GALERI_ANDA';

// ============================================================
// ROUTER
// ============================================================

function doGet(e) {
  try {
    const action = e && e.parameter && e.parameter.action;
    if (!action) {
      return responseJSON({ status: 'error', message: 'Parameter action wajib diisi.' });
    }

    const sheet = getSheet(action);
    if (!sheet) {
      return responseJSON({ status: 'error', message: `Sheet '${action}' tidak ditemukan.` });
    }

    const data    = sheet.getDataRange().getValues();
    const headers = data[0];
    const result  = data.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, idx) => { obj[header] = row[idx] ?? ''; });
      return obj;
    });

    return responseJSON({ status: 'success', data: result });

  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responseJSON({ status: 'error', message: 'Request body kosong.' });
    }

    const body   = JSON.parse(e.postData.contents);
    const action = body.action;
    const pin    = body.pin || '';

    if (!action) {
      return responseJSON({ status: 'error', message: 'Parameter action wajib diisi.' });
    }

    // Aksi publik tidak perlu PIN
    const PUBLIC_ACTIONS = ['Aspirasi', 'Absensi'];

    if (!PUBLIC_ACTIONS.includes(action)) {
      const pinCheck = verifikasiPin(pin);
      if (!pinCheck.valid) {
        return responseJSON({ status: 'error', message: 'PIN salah atau tidak valid.' });
      }
    }

    if (body.type === 'upload_image') {
      return uploadImageToDrive(body);
    }

    return insertData(action, body.data);

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

// Verifikasi PIN dari sheet Pengaturan (server-side)
function verifikasiPin(pin) {
  if (!pin || pin.length < 6) return { valid: false };

  try {
    const sheet = getSheet('Pengaturan');
    if (!sheet) return { valid: false };

    const data     = sheet.getDataRange().getValues();
    const pinRow   = data.find(row => row[0] === 'PIN_ADMIN');
    const validPin = pinRow ? pinRow[1].toString().trim() : '';

    return { valid: pin === validPin };
  } catch (e) {
    return { valid: false };
  }
}

function insertData(sheetName, data) {
  if (!data) {
    return responseJSON({ status: 'error', message: 'Data tidak boleh kosong.' });
  }

  const sheet = getSheet(sheetName);
  if (!sheet) {
    return responseJSON({ status: 'error', message: `Sheet '${sheetName}' tidak ditemukan.` });
  }

  const headers = sheet.getDataRange().getValues()[0];
  const newRow  = headers.map(header => data[header] ?? '');

  // Auto generate ID di kolom pertama
  newRow[0] = Utilities.getUuid();

  sheet.appendRow(newRow);
  return responseJSON({ status: 'success', message: 'Data berhasil ditambahkan.' });
}

// Upload gambar dengan validasi tipe & ukuran
function uploadImageToDrive(body) {
  try {
    if (!body.base64 || !body.mimeType || !body.fileName) {
      return responseJSON({
        status : 'error',
        message: 'base64, mimeType, dan fileName wajib diisi.'
      });
    }

    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!ALLOWED_TYPES.includes(body.mimeType)) {
      return responseJSON({
        status : 'error',
        message: 'Tipe file tidak didukung. Hanya: JPEG, PNG, WEBP, GIF.'
      });
    }

    const base64Data = body.base64.includes(',')
      ? body.base64.split(',')[1]
      : body.base64;

    const sizeInBytes = (base64Data.length * 3) / 4;
    if (sizeInBytes > 5 * 1024 * 1024) {
      return responseJSON({ status: 'error', message: 'Ukuran file melebihi batas 5MB.' });
    }

    const folder = DriveApp.getFolderById(FOLDER_ID);
    const blob   = Utilities.newBlob(
      Utilities.base64Decode(base64Data),
      body.mimeType,
      body.fileName
    );
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const sheet = getSheet('Galeri');
    if (sheet) {
      sheet.appendRow([
        Utilities.getUuid(),
        body.title    || 'Foto Kegiatan',
        file.getUrl(),
        new Date().toISOString(),
        body.kategori || 'Umum'
      ]);
    }

    return responseJSON({
      status     : 'success',
      url        : file.getUrl(),
      downloadUrl: `https://drive.google.com/uc?id=${file.getId()}`
    });

  } catch (err) {
    return responseJSON({ status: 'error', message: 'Upload gagal: ' + err.toString() });
  }
}
```

---

## 2. API CLIENT — FRONTEND

```typescript
// ============================================================
// API CLIENT - REMAJA LEGOK 03
// Semua request ke /api/sheets-proxy (Vercel serverless)
// bukan langsung ke Apps Script URL
// ============================================================

const API_BASE = '/api/sheets-proxy';

// ============================================================
// TYPES
// ============================================================

export interface ApiResponse<T = unknown> {
  status  : 'success' | 'error';
  data   ?: T;
  message?: string;
}

// ============================================================
// GET DATA
// ============================================================

export async function fetchData<T = unknown>(
  sheetName: string
): Promise<T[]> {
  try {
    const res = await fetch(`${API_BASE}?action=${encodeURIComponent(sheetName)}`);

    if (!res.ok) {
      throw new Error(`HTTP error: ${res.status}`);
    }

    const json: ApiResponse<T[]> = await res.json();

    if (json.status === 'error') {
      throw new Error(json.message || 'Terjadi kesalahan.');
    }

    return json.data ?? [];

  } catch (err) {
    console.error(`[fetchData] Gagal fetch '${sheetName}':`, err);
    throw err;
  }
}

// ============================================================
// POST DATA
// ============================================================

export async function postData<T = unknown>(
  sheetName : string,
  data      : Record<string, unknown>,
  pin       : string = ''
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(API_BASE, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ action: sheetName, data, pin })
    });

    if (!res.ok) {
      throw new Error(`HTTP error: ${res.status}`);
    }

    const json: ApiResponse<T> = await res.json();
    return json;

  } catch (err) {
    console.error(`[postData] Gagal post ke '${sheetName}':`, err);
    throw err;
  }
}

// ============================================================
// UPLOAD GAMBAR
// Validasi tipe & ukuran sebelum upload
// ============================================================

const ALLOWED_TYPES  = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function uploadImage(
  file    : File,
  title   : string,
  kategori: string,
  pin     : string
): Promise<ApiResponse<{ url: string; downloadUrl: string }>> {

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      status : 'error',
      message: 'Tipe file tidak didukung. Gunakan: JPEG, PNG, WEBP, atau GIF.'
    };
  }

  if (file.size > MAX_SIZE_BYTES) {
    return {
      status : 'error',
      message: 'Ukuran file melebihi batas 5MB.'
    };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const base64 = reader.result as string;

        const res = await fetch(API_BASE, {
          method : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body   : JSON.stringify({
            type    : 'upload_image',
            action  : 'Galeri',
            fileName: file.name,
            mimeType: file.type,
            base64,
            title,
            kategori,
            pin
          })
        });

        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

        const json = await res.json();
        resolve(json);

      } catch (err) {
        console.error('[uploadImage] Gagal upload:', err);
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Gagal membaca file.'));
    reader.readAsDataURL(file);
  });
}
```

---

## 3. VERCEL SERVERLESS — PROXY

```typescript
// ============================================================
// VERCEL SERVERLESS - PROXY KE GOOGLE APPS SCRIPT
// GOOGLE_SCRIPT_URL tersimpan di server, tidak bocor ke browser
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

const SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Validasi ENV
  if (!SCRIPT_URL) {
    return res.status(500).json({
      status : 'error',
      message: 'GOOGLE_SCRIPT_URL belum dikonfigurasi di server.'
    });
  }

  try {
    let response: Response;

    if (req.method === 'GET') {
      const action = req.query.action as string;
      if (!action) {
        return res.status(400).json({
          status : 'error',
          message: 'Parameter action wajib diisi.'
        });
      }
      response = await fetch(
        `${SCRIPT_URL}?action=${encodeURIComponent(action)}`
      );

    } else if (req.method === 'POST') {
      response = await fetch(SCRIPT_URL, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify(req.body)
      });

    } else {
      return res.status(405).json({
        status : 'error',
        message: 'Method tidak diizinkan.'
      });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    console.error('[sheets-proxy] Error:', err);
    return res.status(500).json({
      status : 'error',
      message: 'Gagal menghubungi Google Apps Script.'
    });
  }
}
```

---

## 4. STRUKTUR SHEETS

### Sheet: `Anggota`
| ID_Anggota | Nama_Lengkap | Nama_Panggilan | Alamat | No_HP | Jenis_Kelamin | Tanggal_Lahir | Minat | Status |

### Sheet: `Agenda`
| ID_Agenda | Judul | Kategori | Tanggal | Jam | Lokasi | Penanggung_Jawab | Deskripsi |

### Sheet: `Absensi`
| ID_Absensi | ID_Agenda | Nama_Anggota | Status | Waktu |

### Sheet: `Pengumuman`
| ID_Pengumuman | Judul | Isi | Tanggal | Penting |

### Sheet: `Kas`
| ID_Kas | Tanggal | Jenis | Jumlah | Keterangan |

### Sheet: `Iuran`
| ID_Iuran | Nama_Anggota | Bulan | Tahun | Jumlah | Status |

### Sheet: `Aspirasi`
| ID_Aspirasi | Nama | Usulan | Tanggal | Like | Status |

### Sheet: `Galeri`
| ID_Galeri | Judul | URL_Drive | Tanggal | Kategori |

### Sheet: `Pengurus`
| ID_Pengurus | Nama | Jabatan | No_HP |

### Sheet: `Pengaturan`
| Key | Value |
|-----|-------|
| PIN_ADMIN | GANTI_PIN_BARU |

> ⚠️ **Jangan simpan PIN asli di dokumen ini!**
> Isi PIN di sheet `Pengaturan` langsung di Google Sheets.

---

## 5. ALUR KERJA SISTEM

```
┌──────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                        │
│                                                              │
│  fetchData('Anggota')    → GET  /api/sheets-proxy           │
│  postData('Iuran', data) → POST /api/sheets-proxy           │
│  uploadImage(file, ...)  → POST /api/sheets-proxy           │
└──────────────────────────────────┬───────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────┐
│              VERCEL SERVERLESS FUNCTION                      │
│                /api/sheets-proxy                             │
│                                                              │
│  • Meneruskan request ke Google Apps Script                  │
│  • GOOGLE_SCRIPT_URL di environment variable (server-side)   │
│  • URL tidak terekspos ke browser                            │
└──────────────────────────────────┬───────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────┐
│              GOOGLE APPS SCRIPT BACKEND                      │
│                                                              │
│  doGet(e)  → Membaca data dari sheet berdasarkan action      │
│  doPost(e) → Menulis data / upload gambar ke Drive           │
│  PIN diverifikasi dari sheet 'Pengaturan'                    │
│  Aksi publik (Aspirasi, Absensi) tidak perlu PIN             │
└──────────────────────────────────┬───────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────┐
│              GOOGLE SHEETS & DRIVE                           │
│                                                              │
│  • 10 Sheets sebagai database                                │
│  • Google Drive sebagai storage foto galeri                  │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. KEAMANAN

| Aspek | Mekanisme |
|-------|-----------|
| **PIN Admin** | Disimpan di sheet `Pengaturan`, diverifikasi di server-side Apps Script |
| **Aksi Publik** | `Aspirasi` dan `Absensi` tidak memerlukan PIN |
| **Aksi Terproteksi** | Semua aksi lain memerlukan PIN valid |
| **Upload Gambar** | Validasi tipe (JPEG, PNG, WEBP, GIF) & ukuran (max 5MB) |
| **URL Apps Script** | Disimpan di Vercel env var `GOOGLE_SCRIPT_URL`, tidak bocor ke browser |
| **CORS** | Dikelola oleh Google Apps Script dan Vercel |

---

## 7. PANDUAN DEPLOYMENT

### Langkah 1 — Setup Google Sheets
1. Buat spreadsheet baru dengan 10 sheet sesuai struktur di atas
2. Isi sheet `Pengaturan` dengan baris `PIN_ADMIN` dan nilai PIN pilihan Anda
3. Catat **Spreadsheet ID** dari URL spreadsheet
4. Buat folder di Google Drive untuk galeri, catat **Folder ID**-nya

### Langkah 2 — Deploy Google Apps Script
1. Buka **Extensions → Apps Script** dari spreadsheet
2. Tempelkan kode dari bagian 1 di atas
3. Ganti `SHEET_ID` dan `FOLDER_ID` dengan nilai yang dicatat di Langkah 1
4. Klik **Deploy → New Deployment**
   - Type: **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Salin URL deployment yang diberikan

### Langkah 3 — Setup Vercel
1. Di dashboard Vercel, tambahkan environment variable:
   ```
   GOOGLE_SCRIPT_URL = https://script.google.com/macros/s/AKfycbx.../exec
   ```
2. Tambahkan juga variabel lain dari `.env.example`
3. Deploy aplikasi

### Langkah 4 — Verifikasi
```bash
# Test endpoint proxy
curl https://your-app.vercel.app/api/sheets-proxy?action=Anggota

# Harusnya return:
# { "status": "success", "data": [...] }
```

---

## 8. TROUBLESHOOTING

| Masalah | Kemungkinan Penyebab | Solusi |
|---------|---------------------|--------|
| `GOOGLE_SCRIPT_URL belum dikonfigurasi` | Env var belum diset di Vercel | Tambahkan di Vercel Dashboard → Settings → Environment Variables |
| `Sheet 'X' tidak ditemukan` | Nama sheet salah / belum dibuat | Cek nama sheet di Google Sheets (case-sensitive) |
| `PIN salah atau tidak valid` | PIN di sheet Pengaturan tidak cocok | Cek nilai di baris `PIN_ADMIN` sheet Pengaturan |
| `Upload gagal: file terlalu besar` | File melebihi 5MB | Kompres gambar sebelum upload |
| `Gagal menghubungi Google Apps Script` | Apps Script belum di-deploy / URL salah | Re-deploy Apps Script, perbarui env var |

---

**Versi Dokumen :** 1.1
**Tanggal Update :** 2026-07-23
**Status         :** Final
