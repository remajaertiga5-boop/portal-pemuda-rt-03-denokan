# PANDUAN INTEGRASI & SETUP MANDIRI - REMAJA LEGOK 03

Ikuti langkah-langkah di bawah ini untuk melakukan setup database
Google Sheets, Apps Script backend, Google Drive, dan Cloudflare R2
dari awal.

---

## ⚠️ PENTING SEBELUM MEMULAI

### Pemahaman Prefix Environment Variables:

| Prefix | Dapat Diakses | Gunakan Untuk |
|--------|---------------|---------------|
| `VITE_` | ✅ Browser & Server | Nama app, URL publik, config non-rahasia |
| Tanpa prefix | 🔒 Server-side Only | API Key, Secret, Token murni rahasia |

> 🔴 **JANGAN** simpan Secret Key atau Token sensitif dengan prefix
> `VITE_` karena akan **otomatis bocor ke browser**!
>
> ⚠️ **Catatan khusus proyek ini:** Variabel seperti
> `VITE_GOOGLE_SCRIPT_URL` dan `VITE_R2_*` menggunakan prefix `VITE_`
> karena dibutuhkan oleh Vercel Serverless Functions saat build.
> **Pastikan variabel ini tidak pernah digunakan langsung
> di kode React/frontend.**

---

## 1. SETUP GOOGLE SHEETS (DATABASE UTAMA)

1. Buka [Google Sheets](https://sheets.google.com) dan buat
   Spreadsheet baru.

2. Namai spreadsheet: `Database Remaja Legok 03`.

3. Ambil **Spreadsheet ID** dari URL browser:
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
                                           ^^^^^^^^^^^^^^^^
                                           Salin bagian ini
   ```

4. Buat **10 Tabs / Sheets** berikut dengan header kolom
   **persis** seperti di bawah (huruf kapital & underscore harus cocok):

---

### TAB 1: `Anggota`
*Kolom A s/d M (13 kolom):*

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| `ID_Anggota` | `Nama_Lengkap` | `Nama_Panggilan` | `Jenis_Kelamin` | `Tempat_Lahir` | `Tanggal_Lahir` | `No_HP` |

| H | I | J | K | L | M |
|---|---|---|---|---|---|
| `Alamat` | `Foto_Profil` | `Jabatan` | `Status` | `Tanggal_Daftar` | `Ditambahkan_Oleh` |

---

### TAB 2: `Kas_Umum`
*Kolom A s/d N (14 kolom):*

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| `ID_Transaksi` | `Tanggal` | `Jenis` | `Kategori` | `Sub_Kategori` | `Nominal` | `Keterangan` |

| H | I | J | K | L | M | N |
|---|---|---|---|---|---|---|
| `Metode` | `Bukti_Foto` | `Petugas` | `Status` | `Waktu_Input` | `Waktu_Edit` | `Catatan` |

---

### TAB 3: `Iuran`
*Kolom A s/d M (13 kolom):*

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| `ID_Iuran` | `ID_Anggota` | `Nama_Anggota` | `Bulan` | `Tahun` | `Nominal` | `Tanggal_Bayar` |

| H | I | J | K | L | M |
|---|---|---|---|---|---|
| `Metode` | `Status` | `Bukti_Transfer` | `Nomor_Bukti` | `Petugas` | `Waktu_Input` |

---

### TAB 4: `Agenda`
*Kolom A s/d M (13 kolom):*

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| `ID_Agenda` | `Nama_Kegiatan` | `Kategori` | `Tanggal` | `Waktu_Mulai` | `Waktu_Selesai` | `Lokasi` |

| H | I | J | K | L | M |
|---|---|---|---|---|---|
| `Deskripsi` | `Visibilitas` | `Status_Sesi` | `Poster` | `Dibuat_Oleh` | `Tanggal_Dibuat` |

---

### TAB 5: `Absensi`
*Kolom A s/d I (9 kolom):*

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| `ID_Absensi` | `ID_Agenda` | `Nama_Kegiatan` | `ID_Anggota` | `Nama_Anggota` | `Status` | `Waktu_Absen` | `Keterangan` | `Metode` |

---

### TAB 6: `Pengumuman`
*Kolom A s/d J (10 kolom):*

| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| `ID_Pengumuman` | `Judul` | `Isi` | `Kategori` | `Visibilitas` | `Prioritas` | `Tanggal` | `Berlaku_Sampai` | `Gambar` | `Dibuat_Oleh` |

---

### TAB 7: `Aspirasi`
*Kolom A s/d K (11 kolom):*

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| `ID_Aspirasi` | `Pengirim` | `Nama_Pengirim` | `Judul` | `Isi` | `Kategori` | `Tanggal_Kirim` | `Status` | `Tanggapan` | `Ditanggapi_Oleh` | `Tanggal_Tanggapan` |

---

### TAB 8: `Galeri`
*Kolom A s/d K (11 kolom):*

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| `ID_Foto` | `Judul` | `Album` | `URL_Foto` | `URL_Thumbnail` | `Ukuran_File` | `Tipe_File` | `Diupload_Oleh` | `Tanggal_Upload` | `Visibilitas` | `Tags` |

---

### TAB 9: `Log_Akses`
*Kolom A s/d I (9 kolom):*

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| `Timestamp` | `ID_User` | `Nama_User` | `Level_Akses` | `Aksi` | `Detail` | `IP_Address` | `User_Agent` | `Status` |

---

### TAB 10: `Pengaturan_Sistem`
*Kolom A s/d F (6 kolom):*

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| `Key` | `Value` | `Kategori` | `Deskripsi` | `Diubah_Oleh` | `Tanggal_Diubah` |

---

### ✅ Verifikasi Setup Google Sheets:
- [ ] Semua 10 tab sudah dibuat
- [ ] Nama tab persis sama (case-sensitive)
- [ ] Header kolom sesuai urutan
- [ ] Spreadsheet ID sudah dicatat

---

## 2. SETUP GOOGLE APPS SCRIPT (REST API)

1. Di dalam Spreadsheet, klik menu **Extensions > Apps Script**.

2. Hapus seluruh kode default (`myFunction`).

3. Salin seluruh isi file `/apps-script/Code.gs` dari source code
   proyek ini dan tempelkan ke editor.

4. Sesuaikan konstanta `CONFIG` di bagian paling atas
   **hanya untuk SPREADSHEET_ID dan DRIVE_FOLDER_ID**:

   ```javascript
   const CONFIG = {
     // Ambil dari URL Spreadsheet Anda
     SPREADSHEET_ID : 'ISI_SPREADSHEET_ID_ANDA',

     // Ambil dari URL folder Google Drive (lihat langkah 3)
     DRIVE_FOLDER_ID: 'ISI_DRIVE_FOLDER_ID_ANDA',

     IURAN_BULANAN_DEFAULT: 10000
   };
   ```

   > ✅ **PIN tidak ada di CONFIG** — PIN disimpan di
   > **Script Properties** secara otomatis saat pertama kali
   > fungsi dijalankan. Lihat cara mengubah PIN di bawah.

5. **Ubah PIN Default** sebelum deploy menggunakan
   Script Properties:

   Tambahkan fungsi sementara ini di `Code.gs`, lalu jalankan
   **sekali saja**:

   ```javascript
   // Jalankan SEKALI lalu HAPUS fungsi ini setelah selesai!
   function setPINBaru() {
     const prop = PropertiesService.getScriptProperties();
     prop.setProperty('PIN_SUPER_ADMIN',     'GANTI_PIN_BARU_MIN_8_DIGIT');
     prop.setProperty('PIN_KETUA_DEFAULT',   'GANTI_PIN_BARU_MIN_6_DIGIT');
     prop.setProperty('PIN_PENGURUS_DEFAULT','GANTI_PIN_BARU_MIN_6_DIGIT');
     Logger.log('✅ PIN berhasil diperbarui.');
   }
   ```

   Setelah log menampilkan `✅ PIN berhasil diperbarui.`,
   **hapus fungsi `setPINBaru()`** dari kode.

6. Klik **Save** (Ctrl+S).

7. Klik **Deploy > New Deployment**.

8. Klik ikon ⚙️ (gerigi) di sebelah "Select type" →
   pilih **Web app**.

9. Konfigurasi deployment:

   | Setting | Nilai | Keterangan |
   |---------|-------|------------|
   | Description | `API Portal Remaja Legok 03 v1` | Label versi |
   | Execute as | `Me (email@gmail.com)` | Jalankan sebagai pemilik |
   | Who has access | `Anyone` | Agar Vercel bisa akses API |

   > ⚠️ **Catatan Keamanan**: `Anyone` diperlukan agar Vercel
   > Serverless Function bisa memanggil API ini.
   > Keamanan dijaga oleh validasi PIN di dalam Apps Script
   > dan enkapsulasi URL di Vercel server-side.
   > **Jangan bagikan Web App URL ini secara publik.**

10. Klik **Deploy** → izinkan akses yang diminta → salin
    **Web App URL** yang dihasilkan:
    ```
    https://script.google.com/macros/s/AKfycb.../exec
    ```

11. Simpan URL ini sebagai variabel environment:
    ```bash
    # ✅ Dipakai oleh Vercel Serverless Functions (sheets-proxy & auth-verify)
    VITE_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/AKfycb.../exec
    ```

    > ⚠️ Meskipun menggunakan prefix `VITE_`, URL ini **jangan
    > pernah digunakan langsung di kode React**. Selalu akses
    > melalui `/api/sheets-proxy` atau `/api/auth-verify`.

### ✅ Verifikasi Setup Apps Script:
```bash
# Test API langsung dari terminal
curl -L "https://script.google.com/macros/s/AKfycb.../exec?action=getAnggota"

# Response yang diharapkan:
# {"status":"success","data":[]}
```
- [ ] Web App URL sudah disalin
- [ ] Test curl mengembalikan response JSON
- [ ] PIN sudah diganti via `setPINBaru()` dan fungsi sudah dihapus
- [ ] Script Properties berisi PIN baru (bukan placeholder)

---

## 3. SETUP GOOGLE DRIVE (SISTEM BACKUP)

1. Buka [Google Drive](https://drive.google.com) dan buat folder
   baru: `Remaja Legok 03`.

2. Di dalam folder tersebut, buat 2 sub-folder:
   - `Backup Database`
   - `Dokumen Resmi`

3. Ambil **Folder ID** dari URL saat membuka folder
   `Remaja Legok 03`:
   ```
   https://drive.google.com/drive/folders/[FOLDER_ID]
                                           ^^^^^^^^^
                                           Salin bagian ini
   ```

4. Simpan sebagai:
   ```bash
   # ✅ Folder ID bukan informasi sensitif, boleh pakai VITE_
   VITE_DRIVE_FOLDER_ID=1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

5. Aktifkan backup harian otomatis di Apps Script:
   - Klik ikon **⏰ Triggers** di sidebar kiri
   - Klik **+ Add Trigger** (pojok kanan bawah)
   - Konfigurasi:

   | Setting | Nilai |
   |---------|-------|
   | Function to run | `backupSheetToDrive` |
   | Deployment | `Head` |
   | Event source | `Time-driven` |
   | Type of trigger | `Day timer` |
   | Time of day | `Midnight to 1am` |

   - Klik **Save**

### ✅ Verifikasi Setup Google Drive:
- [ ] Folder `Remaja Legok 03` sudah dibuat
- [ ] Sub-folder `Backup Database` dan `Dokumen Resmi` ada
- [ ] Folder ID sudah dicatat
- [ ] Trigger backup harian sudah aktif
- [ ] Test manual: jalankan `backupSheetToDrive()` di Apps Script

---

## 4. SETUP CLOUDFLARE R2 (STORAGE MEDIA & FOTO)

1. Masuk ke [Cloudflare Dashboard](https://dash.cloudflare.com).

2. Catat **Account ID** Anda dari sidebar kanan halaman utama:
   ```bash
   # Dipakai oleh upload-r2.js (Vercel Serverless)
   VITE_R2_ACCOUNT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

3. Pilih menu **R2 Object Storage** → klik **Create bucket**.
   - Nama bucket: `remaja-legok-03`
   - Region: Pilih **APAC** (Asia Pacific) untuk performa terbaik

4. Aktifkan Public Access:
   - Masuk ke tab **Settings** pada bucket
   - Cari **Public Access** → aktifkan **R2.dev Subdomain**
   - Salin domain yang muncul:
   ```bash
   # ✅ URL Publik boleh pakai VITE_ (bukan rahasia)
   VITE_R2_PUBLIC_URL=https://pub-xxxxxxxxxxxxxxxx.r2.dev
   ```

5. Buat API Token dengan permission **minimal**:
   - Kembali ke halaman utama R2
   - Klik **Manage R2 API Tokens** → **Create API Token**
   - Konfigurasi:

   | Setting | Nilai | Keterangan |
   |---------|-------|------------|
   | Token name | `Upload Remaja Legok 03` | Nama deskriptif |
   | Permissions | **Object Read & Write** | ✅ Cukup untuk upload |
   | ~~Admin Read & Write~~ | ❌ Jangan pilih ini | Terlalu berbahaya |
   | Bucket | `remaja-legok-03` | Batasi ke 1 bucket saja |
   | TTL | 1 tahun | Sesuaikan kebutuhan |

   - Klik **Create Token** → simpan kredensial:

   ```bash
   # Dipakai oleh upload-r2.js (Vercel Serverless)
   # ⚠️ Jangan gunakan langsung di kode React!
   VITE_R2_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   VITE_R2_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   VITE_R2_BUCKET_NAME=remaja-legok-03
   ```

   > 🔴 **Secret Access Key hanya ditampilkan SEKALI!**
   > Simpan segera di tempat yang aman sebelum menutup halaman.

6. Setup CORS Policy:
   - Di tab **Settings** bucket R2
   - Scroll ke bagian **CORS Policy** → klik **Add CORS Policy**
   - Isikan JSON berikut:

   ```json
   [
     {
       "AllowedOrigins": [
         "https://remaja-legok-03.vercel.app"
       ],
       "AllowedMethods": [
         "GET",
         "PUT",
         "POST",
         "HEAD"
       ],
       "AllowedHeaders": [
         "Content-Type",
         "Content-Length",
         "Authorization"
       ],
       "ExposeHeaders": [
         "ETag"
       ],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

   > 💡 **Untuk development lokal**, tambahkan sementara:
   > ```json
   > "AllowedOrigins": [
   >   "https://remaja-legok-03.vercel.app",
   >   "http://localhost:5173"
   > ]
   > ```
   > **Hapus** `localhost` dari CORS sebelum production!

### ✅ Verifikasi Setup Cloudflare R2:
- [ ] Bucket `remaja-legok-03` sudah dibuat
- [ ] Public Access sudah diaktifkan
- [ ] API Token dengan permission **Object Read & Write** sudah dibuat
- [ ] Secret Access Key sudah disimpan
- [ ] CORS Policy sudah dikonfigurasi
- [ ] Test upload dari aplikasi berhasil

---

## 5. RANGKUMAN ENVIRONMENT VARIABLES

Setelah semua setup selesai, file `.env.local` Anda
seharusnya berisi variabel berikut:

```bash
# ============================================================
# PUBLIC VARIABLES — Aman diakses browser
# ============================================================
VITE_APP_NAME=Remaja Legok 03
VITE_APP_URL=https://remaja-legok-03.vercel.app
VITE_ORG_NAME=Remaja RT 03 RW 04 Denokan
VITE_ORG_ALAMAT=Denokan, Gondoryo, Jambu, Semarang
VITE_DRIVE_FOLDER_ID=1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_R2_PUBLIC_URL=https://pub-xxxxxxxxxxxxxxxx.r2.dev

# ============================================================
# SERVER-SIDE VARIABLES — Dipakai Vercel Serverless Functions
# ⚠️ Jangan gunakan langsung di kode React/frontend!
# ============================================================
VITE_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/AKfycb.../exec
VITE_R2_ACCOUNT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_R2_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_R2_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_R2_BUCKET_NAME=remaja-legok-03
```

---

## 6. CHECKLIST SETUP LENGKAP

### Google Sheets:
- [ ] Spreadsheet dibuat & diberi nama
- [ ] Semua 10 tab dibuat dengan header yang benar
- [ ] Spreadsheet ID dicatat & dimasukkan ke `CONFIG` di `Code.gs`

### Google Apps Script:
- [ ] Kode berhasil disalin & disimpan
- [ ] `CONFIG.SPREADSHEET_ID` & `CONFIG.DRIVE_FOLDER_ID` sudah diisi
- [ ] PIN sudah diganti via fungsi `setPINBaru()`
- [ ] Fungsi `setPINBaru()` sudah **dihapus** setelah dijalankan
- [ ] Script Properties sudah berisi PIN baru (bukan placeholder)
- [ ] Web App sudah di-deploy
- [ ] Web App URL dicatat & ditest via curl

### Google Drive:
- [ ] Folder `Remaja Legok 03` dibuat
- [ ] Sub-folder `Backup Database` & `Dokumen Resmi` dibuat
- [ ] Folder ID dicatat
- [ ] Trigger backup otomatis aktif

### Cloudflare R2:
- [ ] Bucket `remaja-legok-03` dibuat
- [ ] Public Access aktif & URL dicatat
- [ ] API Token (Object R&W) dibuat & disimpan
- [ ] CORS Policy dikonfigurasi

### Vercel:
- [ ] Semua ENV variables sudah diinput di Vercel dashboard
- [ ] `VITE_R2_SECRET_ACCESS_KEY` tidak digunakan di kode React
- [ ] Deploy berhasil
- [ ] Semua endpoint API merespon dengan benar
