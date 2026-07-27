# DOKUMENTASI API ENDPOINT - REMAJA LEGOK 03

Aplikasi ini menggunakan perpaduan **Vercel Serverless Functions**
(untuk enkapsulasi token & upload data sensitif) dan
**Google Apps Script** (untuk operasi data ke Google Sheets).

---

## DAFTAR ENDPOINT

| No | Endpoint | Metode | Fungsi |
|----|----------|--------|--------|
| 1 | `/api/upload-r2` | `POST` | Upload foto/berkas ke Cloudflare R2 |
| 2 | `/api/sheets-proxy` | `POST` | Proxy aman ke Google Apps Script (juga mendukung GET) |
| 3 | `/api/auth-verify` | `POST` | Verifikasi ID Anggota & PIN |

---

## 1. ENDPOINT: `/api/upload-r2`

Digunakan untuk mengunggah berkas foto profil, bukti iuran, kas,
maupun poster agenda ke Cloudflare R2 secara langsung.

- **Metode**: `POST`
- **Tipe Konten**: `multipart/form-data`
- **Autentikasi**: Tidak diperlukan (token dikelola server-side)

### Parameter Body

| Parameter | Tipe | Wajib | Keterangan |
|-----------|------|-------|------------|
| `file` | `File` | ✅ Ya | Berkas gambar/PDF, maks. **10MB** |
| `folder` | `string` | ❌ Tidak | Folder tujuan di R2 bucket (default: `umum`) |

### Tipe File yang Diizinkan

| Tipe MIME | Keterangan |
|-----------|------------|
| `image/jpeg` | Foto format JPG |
| `image/png` | Foto format PNG |
| `image/webp` | Foto format WebP |
| `image/gif` | Foto format GIF |
| `application/pdf` | Dokumen PDF |

### Nilai `folder` yang Diizinkan

| Nilai | Keterangan |
|-------|------------|
| `foto-profil` | Foto profil anggota |
| `bukti-transaksi/kas` | Bukti transaksi kas umum |
| `bukti-transaksi/iuran` | Bukti pembayaran iuran |
| `agenda` | Poster/banner agenda kegiatan |
| `galeri` | Foto dokumentasi kegiatan |

### Contoh Respon Berhasil (`200 OK`)

```json
{
  "success": true,
  "url": "https://pub-your-bucket-id.r2.dev/foto-profil/172158913-foto_saya.jpg",
  "key": "foto-profil/172158913-foto_saya.jpg",
  "size": 142054,
  "mimetype": "image/jpeg"
}
```

### Contoh Respon Gagal (`400 Bad Request`)

```json
{
  "error": "Tidak ada file yang diupload."
}
```

### Contoh Respon Gagal (`415 Unsupported Media Type`)

```json
{
  "error": "Tipe file tidak diizinkan: application/exe"
}
```

---

## 2. ENDPOINT: `/api/sheets-proxy`

Meneruskan permintaan ke Google Apps Script dengan aman,
digunakan untuk operasi CRUD data di Google Sheets.

- **Metode**: `POST` (juga mendukung `GET` untuk permintaan sederhana)
- **Tipe Konten**: `application/json`
- **Autentikasi**: Tidak diperlukan (credentials disimpan di environment variables)

### Parameter Body

Body harus berupa JSON dengan field `action` dan parameter tambahan sesuai aksi yang dituju.
Lihat dokumentasi Aksi di bawah untuk detail.

### Aksi yang Didukung

| Aksi | Deskripsi | Parameter Tambahan |
|------|-----------|---------------------|
| `verifikasiID` | Verifikasi ID anggota aktif | `idAnggota` |
| `verifikasiPengurus` | Verifikasi PIN pengurus | `idAnggota`, `pin` |
| `verifikasiKetua` | Verifikasi PIN ketua | `idAnggota`, `pin` |
| `verifikasiSuperAdmin` | Verifikasi PIN Super Admin | `pin` |
| `getAnggota` | Daftar semua anggota | - |
| `getAnggotaByID` | Detail anggota berdasarkan ID | `id` |
| `tambahAnggota` | Tambah anggota baru | `data` (objek), `pin` |
| `updateProfil` | Update profil anggota | `idAnggota`, `data` (objek), `pin` |
| `arsipAnggota` | Nonaktifkan anggota | `idAnggota`, `pin` |
| `getKasUmum` | Daftar transaksi kas | - |
| `inputKas` | Catat transaksi kas | `data` (objek), `pin` |
| `getIuran` | Daftar iuran | `idAnggota` (opsional), `tahun` (opsional) |
| `catatIuran` | Catat pembayaran iuran | `data` (objek), `pin` |
| `getAgenda` | Daftar agenda | - |
| `tambahAgenda` | Tambah agenda baru | `data` (objek), `pin` |
| `getAbsensi` | Daftar absensi | `idAgenda` (opsional) |
| `catatAbsensi` | Catat kehadiran | `data` (objek) |
| `getPengumuman` | Daftar pengumuman | - |
| `tambahPengumuman` | Tambah pengumuman | `data` (objek), `pin` |
| `getAspirasi` | Daftar aspirasi | - |
| `kirimAspirasi` | Kirim aspirasi | `data` (objek) |
| `updateStatusAspirasi` | Update status aspirasi | `id`, `status`, `tanggapan`, `pin` |
| `getGaleri` | Daftar galeri foto | - |
| `simpanMetadataFoto` | Simpan metadata foto | `data` (objek) |
| `triggerBackup` | Jalankan backup ke Drive | - |

### Contoh Request

```json
{
  "action": "verifikasiID",
  "idAnggota": "ANG-001"
}
```

### Contoh Respon Berhasil (`200 OK`)

```json
{
  "status": "success",
  "data": {
    "idAnggota": "ANG-001",
    "nama": "Budi Santoso",
    "jabatan": "Anggota"
  }
}
```

### Contoh Respon Gagal (`400 Bad Request`)

```json
{
  "error": "ID Anggota tidak terdaftar atau nonaktif."
}
```

### Contoh Respon Gagal (`500 Internal Server Error`)

```json
{
  "error": "Gagal berkomunikasi dengan backend. Silakan coba lagi."
}
```

---

## 3. ENDPOINT: `/api/auth-verify`

Digunakan untuk verifikasi identitas anggota dan PIN dengan
pemeriksaan peran secara ketat.

- **Metode**: `POST`
- **Tipe Konten**: `application/json`
- **Autentikasi**: Tidak diperlukan

### Parameter Body

| Parameter | Tipe | Wajib | Keterangan |
|-----------|------|-------|------------|
| `action` | `string` | ✅ Ya | Jenis verifikasi: `verify-id`, `verify-pengurus`, `verify-ketua`, `verify-sa` |
| `idAnggota` | `string` | ❌ (lihat keterangan) | Diperlukan untuk `verify-id`, `verify-pengurus`, `verify-ketua` |
| `pin` | `string` | ❌ (lihat keterangan) | Diperlukan untuk `verify-pengurus`, `verify-ketua`, `verify-sa` |

### Aksi yang Didukung

| Aksi | Deskripsi | Parameter Wajib |
|------|-----------|-----------------|
| `verify-id` | Verifikasi ID anggota (status aktif) | `idAnggota` |
| `verify-pengurus` | Verifikasi PIN pengurus (juga cek jabatan) | `idAnggota`, `pin` |
| `verify-ketua` | Verifikasi PIN ketua (juga cek jabatan) | `idAnggota`, `pin` |
| `verify-sa` | Verifikasi PIN Super Admin | `pin` |

### Contoh Request

```json
{
  "action": "verify-id",
  "idAnggota": "ANG-001"
}
```

```json
{
  "action": "verify-pengurus",
  "idAnggota": "ANG-002",
  "pin": "654321"
}
```

### Contoh Respon Berhasil (`200 OK`)

```json
{
  "status": "success",
  "data": {
    "idAnggota": "ANG-001",
    "nama": "Budi Santoso",
    "jabatan": "Anggota"
  }
}
```

### Contoh Respon Gagal — Field Tidak Lengkap (`400 Bad Request`)

```json
{
  "error": "idAnggota dan pin wajib diisi untuk verifikasi pengurus."
}
```

### Contoh Respon Gagal — PIN Salah (`401 Unauthorized`)

```json
{
  "error": "PIN Pengurus salah."
}
```

---

## CATATAN KEAMANAN

- Semua kredensial (R2, Google Apps Script URL, PIN default) disimpan di
  **environment variables** Vercel, tidak terekspos ke client.
- Google Apps Script telah diperbaiki untuk **tidak menerima override spreadsheet ID**
  dari request, mencegah injeksi.
- Verifikasi PIN **memeriksa jabatan** anggota dari database,
  sehingga PIN default tidak bisa digunakan oleh sembarang orang.
- Upload file dibatasi hanya untuk tipe **image dan PDF**,
  ekstensi berbahaya akan ditolak otomatis.

---

## PENGEMBANGAN

Untuk menambahkan aksi baru, modifikasi:
1. `Code.gs` — tambahkan `case` baru di `switch` pada `handleRequest` dan buat fungsi handler-nya.
2. `API.md` — perbarui tabel **Aksi yang Didukung** di endpoint `/api/sheets-proxy`.

---
