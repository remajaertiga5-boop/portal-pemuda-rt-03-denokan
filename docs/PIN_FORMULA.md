# FORMULA KREDENSIAL & LEVEL OTORISASI (PIN & ID)

Sistem "Remaja Legok 03" dirancang menggunakan pendekatan
**Sistem Akses Bertingkat Tanpa Password Tradisional**.
Autentikasi didasarkan pada kecocokan kombinasi unik antara
**ID Anggota** dan **PIN Level Otorisasi**.

---

## ⚠️ PERINGATAN KEAMANAN

> 🔴 **WAJIB DIBACA SEBELUM DEPLOY**
>
> - **SEGERA GANTI** semua PIN default sebelum aplikasi digunakan
>   secara publik.
> - **JANGAN** bagikan PIN ke pihak yang tidak berkepentingan.
> - **JANGAN** simpan PIN di chat group, WhatsApp, atau media
>   komunikasi yang tidak terenkripsi.
> - PIN disimpan di **Google Apps Script Properties Service**
>   (bukan di kode langsung), sehingga aman dari exposure kode,
>   namun tetap dalam bentuk plain text.

---

## 1. STRUKTUR LEVEL OTORISASI

Aplikasi memiliki 5 level otorisasi dengan hak akses sebagai berikut:

| Level | Kredensial | Hak Akses Utama |
|-------|------------|-----------------|
| **TAMU / WARGA** | Tanpa Login | Membaca pengumuman publik, agenda publik, ringkasan kas umum, mengirim aspirasi anonim, melihat galeri publik |
| **ANGGOTA** | ID Anggota saja | Semua hak Tamu + absensi mandiri, riwayat iuran pribadi, data keanggotaan penuh |
| **PENGURUS HARIAN** | ID Anggota + PIN Pengurus | Semua hak Anggota + input kas umum, catat iuran, jadwalkan agenda, buat pengumuman |
| **KETUA** | ID Anggota + PIN Ketua | Semua hak Pengurus + setujui pengeluaran kas, mengubah status aspirasi, arsipkan anggota |
| **SUPER ADMIN** | PIN Super Admin saja | Semua hak Ketua + audit log, pendaftaran massal, backup manual, soft-delete mutlak |

### Diagram Hierarki Akses:

```
SUPER ADMIN  ──┐
               ├── Semua akses di bawahnya
    KETUA    ──┤
               ├── Semua akses di bawahnya
  PENGURUS   ──┤
               ├── Semua akses di bawahnya
  ANGGOTA    ──┤
               ├── Semua akses di bawahnya
    TAMU     ──┘ (Akses paling terbatas)
```

---

## 2. KREDENSIAL DEFAULT & FORMULA PIN

> ⚠️ **PENTING**: PIN di bawah ini adalah nilai **placeholder**
> untuk keperluan setup awal saja.
> **WAJIB DIGANTI** sebelum aplikasi dipublikasikan!

### Aturan Pembuatan PIN yang Aman:

| Level | Panjang Min. | Panjang Maks. | Rekomendasi |
|-------|-------------|---------------|-------------|
| PIN Pengurus | 6 digit | 12 digit | Angka acak, hindari urutan (123456) |
| PIN Ketua | 6 digit | 12 digit | Kombinasi angka tidak berurutan |
| PIN Super Admin | 8 digit | 16 digit | Angka acak panjang, simpan di tempat aman |

### ❌ Contoh PIN yang BURUK (Jangan Digunakan):
```
123456    ← Urutan angka
000000    ← Angka sama semua
19900101  ← Tanggal lahir
```

### ✅ Contoh PIN yang BAIK:
```
7429163   ← Acak, tidak berurutan
93841627  ← Acak, panjang
58204719  ← Acak, tidak mengandung info personal
```

---

### Cara Mengubah PIN Default:

> ✅ **Cara yang benar**: PIN disimpan di **Google Apps Script
> Properties Service**, bukan di objek `CONFIG` di kode.
> Gunakan cara berikut untuk mengubah PIN dengan aman.

#### Opsi A — Via Script Editor (Direkomendasikan):

1. Buka **Google Apps Script** dari Spreadsheet Anda
   (`Extensions > Apps Script`).

2. Buat fungsi sementara di `Code.gs` untuk mengatur PIN baru:

   ```javascript
   // Jalankan fungsi ini SEKALI, lalu hapus setelah selesai
   function setPINBaru() {
     const prop = PropertiesService.getScriptProperties();
     prop.setProperty('PIN_SUPER_ADMIN',    'GANTI_PIN_BARU_DISINI');
     prop.setProperty('PIN_KETUA_DEFAULT',  'GANTI_PIN_BARU_DISINI');
     prop.setProperty('PIN_PENGURUS_DEFAULT','GANTI_PIN_BARU_DISINI');
     Logger.log('PIN berhasil diperbarui.');
   }
   ```

3. Klik **Run** (`▶`) pada fungsi `setPINBaru`.

4. Pastikan log menampilkan `PIN berhasil diperbarui.`

5. **Hapus fungsi `setPINBaru`** dari kode setelah selesai
   agar tidak bisa dijalankan ulang oleh siapapun.

#### Opsi B — Via Script Properties UI:

1. Buka **Google Apps Script** dari Spreadsheet Anda.

2. Klik menu **Project Settings** (ikon ⚙️ di sidebar kiri).

3. Scroll ke bagian **Script Properties**.

4. Edit nilai untuk key berikut:

   | Key | Keterangan |
   |-----|------------|
   | `PIN_SUPER_ADMIN` | PIN untuk Super Admin |
   | `PIN_KETUA_DEFAULT` | PIN untuk Ketua |
   | `PIN_PENGURUS_DEFAULT` | PIN untuk Pengurus |

5. Klik **Save script properties**.

> ✅ Tidak perlu deploy ulang Apps Script setelah mengubah PIN
> via Properties Service — perubahan langsung aktif.

> ✅ **Verifikasi**: Setelah mengubah PIN, pastikan PIN lama
> sudah tidak bisa digunakan dengan mencoba login menggunakan
> PIN lama di aplikasi.

---

## 3. FORMAT ID ANGGOTA

ID Anggota digunakan sebagai identitas unik setiap anggota.
Format yang direkomendasikan:

```
RL03-XXX
│    │
│    └── Nomor urut anggota (001, 002, dst.)
└─────── Kode komunitas (RL = Remaja Legok, 03 = RT 03)
```

### Contoh:

| ID Anggota | Keterangan |
|------------|------------|
| `RL03-001` | Anggota pertama |
| `RL03-025` | Anggota ke-25 |
| `RL03-099` | Anggota ke-99 |

---

## 4. PENGAMANAN & DETEKSI BRUTE FORCE

Sistem perlindungan brute force **wajib diimplementasikan
di sisi server**, bukan hanya di browser.

### ✅ Implementasi yang Benar (Server-Side):

> ⚠️ **Catatan penting**: Vercel Serverless Functions bersifat
> **stateless** — setiap request bisa ditangani instance berbeda,
> sehingga `Map()` in-memory **tidak efektif** karena akan reset
> saat cold start.
>
> Untuk produksi, gunakan **Vercel KV** (Redis) atau layanan
> eksternal seperti **Upstash** untuk menyimpan data percobaan login.
> Contoh di bawah menggunakan `Map()` sebagai ilustrasi logika saja.

```javascript
// api/auth-verify.js
// ⚠️ Untuk produksi, ganti Map() dengan Vercel KV / Upstash Redis
// Contoh Upstash: https://upstash.com/docs/redis/quickstarts/vercel

import { Redis } from '@upstash/redis'   // Contoh jika pakai Upstash

const MAX_ATTEMPTS    = 3;
const LOCK_DURATION_S = 5 * 60; // 5 menit dalam detik

export default async function handler(req, res) {
  // ... (CORS, method check, validasi - sama seperti sebelumnya)

  const clientIP  = req.headers['x-forwarded-for']?.split(',')[0]
                    || req.socket.remoteAddress
                    || 'unknown';
  const attemptKey = `auth_attempts:${clientIP}`;

  // --- Jika menggunakan Upstash Redis ---
  // const redis   = new Redis({ url: process.env.UPSTASH_REDIS_URL,
  //                             token: process.env.UPSTASH_REDIS_TOKEN });
  // const attempts = await redis.get(attemptKey) || 0;
  // if (attempts >= MAX_ATTEMPTS) {
  //   const ttl = await redis.ttl(attemptKey);
  //   return res.status(429).json({
  //     error: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(ttl / 60)} menit.`
  //   });
  // }

  // Proses verifikasi (teruskan ke Google Apps Script)
  // const isValid = ...

  // if (!isValid) {
  //   await redis.set(attemptKey, attempts + 1, { ex: LOCK_DURATION_S });
  //   const sisa = MAX_ATTEMPTS - (attempts + 1);
  //   return res.status(401).json({
  //     error  : 'PIN salah.',
  //     sisa   : sisa > 0 ? sisa : 0
  //   });
  // }

  // Berhasil → hapus data percobaan
  // await redis.del(attemptKey);
  // return res.status(200).json({ status: 'success' });
}
```

### ❌ Implementasi yang SALAH (Client-Side Only):

```javascript
// ❌ JANGAN lakukan ini saja - mudah dibypass lewat DevTools!
localStorage.setItem('loginAttempts', count);
localStorage.setItem('lockUntil', timestamp);
// User bisa hapus localStorage dan langsung coba lagi!
```

### Perbandingan Keamanan:

| Metode | Dapat Dibypass User? | Rekomendasi |
|--------|----------------------|-------------|
| `localStorage` saja | ✅ Sangat mudah | ❌ Jangan |
| `sessionStorage` saja | ✅ Mudah | ❌ Jangan |
| `Map()` in-memory serverless | ✅ Reset tiap cold start | ⚠️ Hanya untuk dev |
| Server-side Redis (Upstash/KV) | ❌ Tidak bisa | ✅ Gunakan ini |
| Server-side Redis + Client-side | ❌ Tidak bisa | ✅ Terbaik |

---

## 5. CHECKLIST KEAMANAN SEBELUM GO-LIVE

- [ ] PIN Super Admin sudah diganti dari nilai default
      (via Script Properties, bukan edit kode)
- [ ] PIN Ketua sudah diganti dari nilai default
- [ ] PIN Pengurus sudah diganti dari nilai default
- [ ] Fungsi `setPINBaru()` sudah dihapus dari `Code.gs`
      setelah dijalankan
- [ ] PIN baru sudah didistribusikan secara aman
      (bukan lewat grup WhatsApp terbuka)
- [ ] Google Apps Script Properties sudah diverifikasi
      berisi PIN baru (bukan placeholder)
- [ ] Brute force protection berjalan di server-side
      (disarankan pakai Upstash Redis)
- [ ] File `.env` tidak ter-push ke GitHub
- [ ] Repositori GitHub diset ke **Private**
