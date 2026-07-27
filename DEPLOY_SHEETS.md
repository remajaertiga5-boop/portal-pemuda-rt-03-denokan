# 📊 Deploy Google Sheets Database

## 1. Deploy Google Apps Script

1. Buka https://script.google.com/
2. Buat project baru → copy isi `apps-script/Code.gs`
3. Ganti `API_KEY` dengan key rahasia kamu
4. Klik **Deploy → New Deployment → Web App**
5. Execute as: **Me**
6. Who has access: **Anyone**
7. Copy URL yang muncul, contoh: `https://script.google.com/macros/s/xxx/exec`

## 2. Set Environment Variables di Vercel

```env
GOOGLE_SCRIPT_DB_URL=https://script.google.com/macros/s/xxx/exec
SHEETS_API_KEY=remaja-legok-03-2026  # Sama dengan API_KEY di Code.gs
```

## 3. Verify

1. Redeploy Vercel setelah set env variables
2. Buka portal → Dashboard Super Admin
3. Klik tombol "☁️ Sync Sheets"
4. Cek Google Sheets → data harus muncul!

## Struktur Sheet

| Sheet | Primary Key | Data |
|-------|-------------|------|
| Anggota | ID_Anggota | Data anggota aktif |
| Agenda | ID | Kegiatan & acara |
| Pengumuman | ID | Pengumuman |
| Kas | ID | Transaksi keuangan |
| Aspirasi | ID | Usulan warga |
| Galeri | ID | Foto & video |

## Troubleshooting

- **"Apps Script belum di-deploy"** → Pastikan deploy as Web App, bukan sebagai library
- **401 Unauthorized** → Cek SHEETS_API_KEY di Vercel & API_KEY di Code.gs sama
- **Data tidak muncul** → Klik "Sync Sheets" di dashboard Super Admin
- **Sync gagal** → Cek koneksi internet, cek log Vercel
