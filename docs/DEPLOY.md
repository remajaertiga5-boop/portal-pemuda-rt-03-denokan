# PANDUAN DEPLOYMENT - REMAJA LEGOK 03

Ikuti instruksi ini untuk mempublikasikan repositori kode ke GitHub
dan melakukan setup deployment otomatis menggunakan Vercel.

---

## ⚠️ PENTING: MEMAHAMI ENVIRONMENT VARIABLES

Sebelum memulai, pahami perbedaan ini:

| Prefix | Dapat Diakses | Contoh Penggunaan |
|--------|---------------|-------------------|
| `VITE_` | ✅ Browser & Server | Nama app, URL publik, config non-rahasia |
| Tanpa prefix | ✅ Server-side Only | API Key, Secret, Token |

> 🔴 **JANGAN** pernah menyimpan Secret Key atau Token sensitif
> dengan prefix `VITE_` karena akan **otomatis ter-expose ke browser**
> dan bisa disalahgunakan!
>
> ⚠️ **Catatan khusus proyek ini:** Beberapa variabel seperti
> `VITE_GOOGLE_SCRIPT_URL` dan `VITE_R2_*` sengaja menggunakan
> prefix `VITE_` karena **hanya diakses via Vercel Serverless Functions**
> (bukan langsung di browser). Pastikan variabel ini **tidak pernah
> digunakan langsung di kode React/frontend**.

---

## 1. STRATEGI REPOSITORI GITHUB

Untuk menjamin keamanan kredensial dan kebersihan kode,
ikuti langkah git berikut:

### Langkah-langkah:

1. Buat repositori baru di [GitHub](https://github.com) dengan nama
   `remaja-legok-03` (**Direkomendasikan**: set ke **Private**).

2. Pastikan file `.gitignore` sudah ada dan mengabaikan file sensitif:
   ```gitignore
   .env
   .env.local
   .env.*.local
   node_modules/
   dist/
   .clasp.json
   ```

3. Di mesin lokal Anda, jalankan perintah berikut:
   ```bash
   git init
   git add .
   git commit -m "Inisialisasi Proyek Remaja Legok 03"
   git branch -M main
   git remote add origin https://github.com/USERNAME/remaja-legok-03.git
   git push -u origin main
   ```

4. Verifikasi file `.env` tidak ikut ter-push:
   ```bash
   # Pastikan .env tidak muncul di output ini
   git ls-files | grep .env

   # Jika muncul, segera jalankan:
   git rm --cached .env
   git commit -m "Hapus .env dari tracking"
   git push
   ```

---

## 2. DEPLOYMENT KE VERCEL (FRONTEND & API ENDPOINTS)

Vercel akan otomatis mendeteksi konfigurasi Vite dan mem-build
aplikasi React. Vercel Serverless Functions di dalam folder `api/`
akan di-deploy secara otomatis sebagai endpoint API backend.

### Langkah-langkah:

1. Masuk ke dashboard [Vercel](https://vercel.com)
   (Login menggunakan akun GitHub Anda).

2. Klik **New Project** → pilih repositori `remaja-legok-03`
   dari daftar → klik **Import**.

3. Di bagian **Configure Project**:

   | Setting | Nilai |
   |---------|-------|
   | **Framework Preset** | `Vite` (atau Auto-detect) |
   | **Root Directory** | `.` (Default) |
   | **Build Command** | `npm run build` |
   | **Output Directory** | `dist` |

4. Buka tab **Environment Variables** dan tambahkan
   variabel-variabel berikut:

   ### 🟢 Variabel PUBLIC — Digunakan di Frontend (React)
   > Variabel ini boleh diakses browser karena tidak mengandung rahasia.

   | Nama Variabel | Contoh Nilai | Keterangan |
   |---------------|--------------|------------|
   | `VITE_APP_NAME` | `Remaja Legok 03` | Nama aplikasi |
   | `VITE_APP_URL` | `https://remaja-legok-03.vercel.app` | URL produksi |
   | `VITE_ORG_NAME` | `Remaja RT 03 RW 04 Denokan` | Nama organisasi |
   | `VITE_ORG_ALAMAT` | `Denokan, Gondoryo, Jambu, Semarang` | Alamat organisasi |
   | `VITE_R2_PUBLIC_URL` | `https://pub-xxx.r2.dev` | URL publik bucket R2 (tidak mengandung secret) |

   ### 🟡 Variabel SEMI-PUBLIK — Hanya Diakses Serverless Functions
   > Variabel ini menggunakan prefix `VITE_` karena dibutuhkan
   > saat build, **tetapi JANGAN pernah digunakan langsung di kode React**.
   > Selalu akses via endpoint `/api/` saja.

   | Nama Variabel | Keterangan |
   |---------------|------------|
   | `VITE_GOOGLE_SCRIPT_URL` | URL Google Apps Script — dipakai `sheets-proxy.js` & `auth-verify.js` |
   | `VITE_R2_ACCOUNT_ID` | Cloudflare Account ID — dipakai `upload-r2.js` |
   | `VITE_R2_ACCESS_KEY_ID` | R2 Access Key ID — dipakai `upload-r2.js` |
   | `VITE_R2_SECRET_ACCESS_KEY` | R2 Secret Access Key — dipakai `upload-r2.js` |
   | `VITE_R2_BUCKET_NAME` | Nama bucket Cloudflare R2 — dipakai `upload-r2.js` |

5. Klik **Deploy** dan tunggu proses build selesai
   (biasanya kurang dari 2 menit).

6. Setelah selesai, Vercel akan memberikan URL produksi
   (contoh: `https://remaja-legok-03.vercel.app`).

### ✅ Verifikasi Setelah Deploy:

Lakukan pengecekan berikut setelah deploy berhasil:

```bash
# 1. Cek apakah frontend dapat diakses
curl -I https://remaja-legok-03.vercel.app

# 2. Cek sheets-proxy
curl -X POST https://remaja-legok-03.vercel.app/api/sheets-proxy \
  -H "Content-Type: application/json" \
  -d '{"action": "getAnggota"}'

# 3. Cek auth-verify
curl -X POST https://remaja-legok-03.vercel.app/api/auth-verify \
  -H "Content-Type: application/json" \
  -d '{"action": "verify-id", "idAnggota": "ANG-001"}'

# 4. Cek upload-r2 (method check)
curl -X GET https://remaja-legok-03.vercel.app/api/upload-r2
# Harus mengembalikan: {"error":"Method not allowed. Use POST."}

# 5. Cek apakah secret key TIDAK bocor ke browser
# Buka DevTools > Console di browser, lalu ketik:
# console.log(import.meta.env)
# Pastikan VITE_R2_SECRET_ACCESS_KEY dan VITE_GOOGLE_SCRIPT_URL
# TIDAK muncul saat diakses langsung dari komponen React!
```

---

## 3. PENYEMPURNAAN INTEGRASI (CI/CD)

Setiap kali Anda melakukan push atau menggabungkan Pull Request
ke branch `main`, Vercel akan otomatis rebuild dan deploy pembaruan.

### Alur CI/CD:

```
Push ke GitHub (branch: main)
        ↓
GitHub Actions (Lint & Build Check)
        ↓
Vercel Auto-Deploy
        ↓
Preview URL (jika PR) / Production URL (jika merge ke main)
```

### Pengaturan Tambahan (Opsional):

#### Custom Domain
Hubungkan domain kustom di **Settings > Domains** di Vercel:
```
pemuda.legok03.com  →  remaja-legok-03.vercel.app
```

#### Proteksi Branch GitHub
Aktifkan branch protection di:
`GitHub Repo > Settings > Branches > Add Rule`

| Setting | Nilai |
|---------|-------|
| Branch name pattern | `main` |
| Require pull request before merging | ✅ Aktif |
| Require status checks to pass | ✅ Aktif |
| Do not allow bypassing | ✅ Aktif |

---

## 4. ROLLBACK JIKA DEPLOY GAGAL

Jika deployment terbaru menyebabkan masalah, lakukan rollback:

### Via Vercel Dashboard:
1. Buka **Vercel Dashboard** → pilih project
2. Klik tab **Deployments**
3. Cari deployment sebelumnya yang berhasil
4. Klik **⋯ (titik tiga)** → **Promote to Production**

### Via Git:
```bash
# Lihat riwayat commit
git log --oneline

# Kembalikan ke commit sebelumnya
git revert HEAD
git push origin main
# Vercel akan otomatis deploy ulang dengan kode yang sudah di-revert
```

---

## 5. CHECKLIST DEPLOYMENT

Gunakan checklist ini sebelum dan sesudah deploy:

### Sebelum Deploy:
- [ ] File `.env` sudah ada di `.gitignore`
- [ ] Tidak ada API Key/Secret yang di-hardcode di kode
- [ ] Semua variabel env sudah ditambahkan di Vercel dashboard
- [ ] Build lokal berhasil (`npm run build`)
- [ ] Lint tidak ada error (`npm run lint`)
- [ ] `VITE_R2_SECRET_ACCESS_KEY` tidak digunakan langsung di kode React

### Sesudah Deploy:
- [ ] Frontend dapat diakses di URL produksi
- [ ] `GET /api/upload-r2` mengembalikan `405 Method Not Allowed`
- [ ] `POST /api/sheets-proxy` dengan `{"action":"getAnggota"}` merespon `200`
- [ ] `POST /api/auth-verify` dengan `{"action":"verify-id","idAnggota":"ANG-001"}` merespon benar
- [ ] Secret key tidak muncul di `import.meta.env` saat dicek dari browser
- [ ] Tidak ada error di **Vercel Function Logs**
- [ ] Backup Google Drive dapat di-trigger via `triggerBackup`
