// ============================================================
// VERCEL SERVERLESS — GOOGLE DRIVE UPLOAD PROXY
// Upload bukti pembayaran ke folder Drive via Apps Script
// ============================================================

const DRIVE_SCRIPT_URL = process.env.VERCEL_DRIVE_SCRIPT_URL 
  || process.env.GOOGLE_SCRIPT_DB_URL 
  || "https://script.google.com/macros/s/AKfycbzhjPTUpHBfGyRRlrdvCqYnHk5TYe_mCrL-s7tWhTd3IrAYsj4ePlsRYJuk1a4ht6nfZg/exec";
const API_KEY          = process.env.SHEETS_API_KEY || "remaja-legok-03-2026";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  if (!DRIVE_SCRIPT_URL) {
    return res.status(500).json({ error: "VERCEL_DRIVE_SCRIPT_URL belum dikonfigurasi." });
  }

  try {
    const { fileName, fileType, fileData, idAnggota, folderType } = req.body || {};

    if (!fileName || !fileType || !fileData) {
      return res.status(400).json({ error: "fileName, fileType, fileData wajib" });
    }

    // Size check (base64 → binary estimate)
    const sizeEstimate = Math.ceil((fileData.length * 3) / 4);
    if (sizeEstimate > 5 * 1024 * 1024) {
      return res.status(400).json({ error: "File terlalu besar (max 5MB)" });
    }

    const url = DRIVE_SCRIPT_URL + "?key=" + encodeURIComponent(API_KEY);
    const driveRes = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + API_KEY,
      },
      body: JSON.stringify({ fileName, fileType, fileData, idAnggota, folderType: folderType || "bukti" }),
    });

    const data = await driveRes.json();

    if (!driveRes.ok || data.error) {
      return res.status(driveRes.status || 500).json(data);
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error("[drive-upload]", err.message);
    return res.status(500).json({ error: err.message || "Upload ke Drive gagal." });
  }
}
