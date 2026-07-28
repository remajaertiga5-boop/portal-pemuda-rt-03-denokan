# 🔌 Panduan Menyambung Portal ke Data Eksternal

Panduan ini menjelaskan cara menyambung Portal Pemuda RT 03 Denokan ke:

- 📊 **Google Sheets** — sebagai database utama (Anggota, Agenda, Pengumuman, Kas, Aspirasi, Galeri)
- 📁 **Google Drive** — untuk simpan foto profil & bukti pembayaran
- 📱 **Telegram** — untuk broadcast pengumuman & upload foto ke group

---

## 📊 1. Google Sheets — SUDAH TERSAMBUNG di kode

Spreadsheet ID sudah **hardcoded** di [`api/sheets-db.js`](api/sheets-db.js) → `1bwb4dIlyLQiq0hMjzC5HGCQPd5cQZVB7ndQ51FaC8R8`
Nama spreadsheet: **"Portal Pemuda API"** dengan 6 sheet: `Anggota`, `Agenda`, `Pengumuman`, `Kas`, `Aspirasi`, `Galeri`.

### Yang perlu di-setup di Vercel:

**Env `GOOGLE_SERVICE_ACCOUNT_JSON`** (rahasia, server-side)

Cara dapat:
1. Buka [Google Cloud Console](https://console.cloud.google.com/) → pilih project atau buat baru
2. **APIs & Services → Library** → cari "Google Sheets API" → **Enable**
3. **IAM & Admin → Service Accounts → Create Service Account**
   - Name: `portal-pemuda-sheets`
   - Grant role: (kosongkan, tidak perlu IAM role project)
4. Klik service account yang baru dibuat → tab **Keys → Add Key → Create new key → JSON** → download
5. **Buka spreadsheet Portal Pemuda API** di Google Sheets → klik **Share** → paste email service account (`xxx@yyy.iam.gserviceaccount.com`) → beri akses **Editor**
6. Copy seluruh isi file JSON, paste sebagai value env `GOOGLE_SERVICE_ACCOUNT_JSON` di:
   - Vercel: **Project → Settings → Environment Variables**
   - Lokal: `.env.local` (jangan commit!)

Contoh format:
```
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"-----BEGIN...","client_email":"...@....iam.gserviceaccount.com",...}
```

---

## 📱 2. Telegram Bot — sudah 3 endpoint tersedia

Endpoint yang tersedia setelah refactor:

| Endpoint | Method | Deskripsi |
|---|---|---|
| `/api/telegram/send-media` | POST | Kirim foto/video ke group |
| `/api/telegram/upload-return-url` | POST | Upload media & dapat URL publik |
| `/api/telegram/broadcast` | POST | ⭐ **BARU** — Kirim pesan text ke group |

Semua endpoint sekarang **fallback ke env server** kalau frontend tidak kirim `botToken`/`chatId`. Ini lebih aman karena bot token tidak perlu diekspos ke browser.

### Yang perlu di-setup di Vercel:

```bash
TELEGRAM_BOT_TOKEN=<isi_bot_token_dari_BotFather>
TELEGRAM_CHAT_ID=-1004474501263
```

> **Chat ID `-1004474501263`** adalah group Telegram Remaja RT 03 Denokan.
> **Bot token** harus di-generate ulang lewat [@BotFather](https://t.me/BotFather) — token lama yang tadi kebocor di chat WAJIB direvoke.

### Contoh pemakaian dari frontend:

```ts
// Broadcast pengumuman
await fetch('/api/telegram/broadcast', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: '<b>📢 Pengumuman!</b>\nRapat pengurus Sabtu 20.00 di Balai RT 03.',
    parseMode: 'HTML',
  }),
});

// Upload foto ke Telegram (return public URL)
await fetch('/api/telegram/upload-return-url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileData: 'data:image/jpeg;base64,...',
    fileName: 'kegiatan.jpg',
    fileType: 'image/jpeg',
    caption: 'Kerja bakti minggu pagi',
  }),
});
```

Tidak perlu kirim `botToken` atau `chatId` — server-side akan pakai env default.

---

## 📁 3. Google Drive — untuk upload file backup

Folder yang sudah tersedia:

| Folder | ID | Kegunaan |
|---|---|---|
| **Foto Profil** | `1Kz8foBDUWew090EnGDfuu4T8Yw8FJSzh` | Foto profil anggota |
| **Bukti Pembayaran** | `18ZbevjsEm8ElZnrLiVB50GBlUtwoYRV7` | Screenshot transfer iuran kas |

### Yang perlu di-setup di Vercel:

**Frontend (public, bisa aman di browser):**
```bash
VITE_SHEETS_ID=1bwb4dIlyLQiq0hMjzC5HGCQPd5cQZVB7ndQ51FaC8R8
VITE_DRIVE_FOLDER_ID=1Kz8foBDUWew090EnGDfuu4T8Yw8FJSzh
```

**Kalau perlu upload ke Drive lewat backend (`api/drive-upload.js`):** service account yang sama dengan Sheets sudah cukup — cukup share folder Drive-nya ke email service account juga (klik folder → Share → paste email SA → Editor).

---

## 🚀 4. Deploy ke Vercel — Ringkasan Env Vars

Set semua ini di **Vercel Dashboard → Project Settings → Environment Variables** (untuk semua environment: Production, Preview, Development):

### 🔒 Server-only (RAHASIA — tanpa prefix VITE_)
```bash
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
TELEGRAM_BOT_TOKEN=<dari-BotFather>
TELEGRAM_CHAT_ID=-1004474501263
```

### 🌐 Frontend (public — dengan prefix VITE_)
```bash
VITE_APP_TITLE=Portal Pemuda RT 03
VITE_APP_URL=https://<subdomain>.vercel.app
VITE_ORG_NAME=Remaja RT 03 RW 04 Denokan
VITE_SHEETS_ID=1bwb4dIlyLQiq0hMjzC5HGCQPd5cQZVB7ndQ51FaC8R8
VITE_DRIVE_FOLDER_ID=1Kz8foBDUWew090EnGDfuu4T8Yw8FJSzh
VITE_ENABLE_AI=false
VITE_ENABLE_R2=false
```

### 🚢 Deploy
1. Import repo di Vercel: **Add New → Project → Import** `remajaertiga5-boop/portal-pemuda-rt-03-denokan`
2. Set semua env vars di atas
3. Klik **Deploy**
4. Setelah deploy sukses, buka URL Vercel yang dikasih → cek `/api/sheets-db?table=galeri` untuk verifikasi

---

## ✅ Checklist Verifikasi

- [ ] Service account JSON sudah di-generate & spreadsheet dishare ke email SA
- [ ] Bot token baru sudah dibuat (yang lama sudah direvoke!)
- [ ] Env `GOOGLE_SERVICE_ACCOUNT_JSON` sudah di-set di Vercel
- [ ] Env `TELEGRAM_BOT_TOKEN` & `TELEGRAM_CHAT_ID` sudah di-set di Vercel
- [ ] Env `VITE_SHEETS_ID` & `VITE_DRIVE_FOLDER_ID` sudah di-set di Vercel
- [ ] Deploy sukses & `/api/sheets-db` mengembalikan data
- [ ] Test `/api/telegram/broadcast` dengan pesan test

---

## 🔧 Troubleshooting

**`sheets-db` return 500 "invalid_grant" / "unauthorized"**
→ Service account belum dishare akses ke spreadsheet. Buka Sheets → Share → paste email SA.

**Telegram: "Bad Request: chat not found"**
→ Bot belum dijadikan member group. Add bot ke group Telegram dulu (`-1004474501263`).

**Telegram: "Forbidden: bot was kicked"**
→ Bot dikeluarkan dari group. Add ulang & kasih admin permission.
