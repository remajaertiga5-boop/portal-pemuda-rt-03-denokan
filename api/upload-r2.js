// ============================================================
// VERCEL SERVERLESS — UPLOAD FILE (Base64 JSON + R2 Proxy)
// v2.0 — Menerima JSON base64 dari frontend
// Fallback: return public URL jika R2 tidak dikonfigurasi
// ============================================================

import https from "https";

// ── Max file sizes ────────────────────────────────────────
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_B  = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf",
];

// ── S3 Client (lazy, hanya init jika R2 creds ada) ─────────
let s3Client = null;
function getS3Client() {
  if (s3Client) return s3Client;

  const accountId       = process.env.VITE_R2_ACCOUNT_ID;
  const accessKeyId     = process.env.VITE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.VITE_R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) return null;

  // Dynamic import — tidak crash jika @aws-sdk tidak terinstall
  const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

  s3Client = new S3Client({
    region     : "auto",
    endpoint   : `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    requestHandler: { httpsAgent: new https.Agent({ minVersion: "TLSv1.2" }) },
  });

  return s3Client;
}

// ── Upload ke R2 ──────────────────────────────────────────
async function uploadToR2Bucket(fileName, fileType, buffer, folder) {
  const s3     = getS3Client();
  if (!s3) return null;

  const bucketName = process.env.VITE_R2_BUCKET_NAME;
  const publicUrl  = process.env.VITE_R2_PUBLIC_URL;
  if (!bucketName || !publicUrl) return null;

  const { PutObjectCommand } = require("@aws-sdk/client-s3");

  const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const safeFolder = (folder || "umum").replace(/[^a-zA-Z0-9_-]/g, "") || "umum";
  const fileKey = `${safeFolder}/${Date.now()}-${cleanName}`;

  await s3.send(new PutObjectCommand({
    Bucket     : bucketName,
    Key        : fileKey,
    Body       : buffer,
    ContentType: fileType,
  }));

  return `${publicUrl.replace(/\/$/, "")}/${fileKey}`;
}

// ── Handler ────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const {
      fileName, fileType, fileSize, fileData,
      folder, idAnggota,
      accessKey, secretKey, bucket, accountId,
    } = req.body || {};

    // ── Validasi ──
    if (!fileName || !fileType || !fileData) {
      return res.status(400).json({ error: "fileName, fileType, dan fileData wajib diisi." });
    }

    if (!ALLOWED_TYPES.includes(fileType)) {
      return res.status(400).json({
        error: `Tipe file tidak diizinkan: ${fileType}. Gunakan: JPG, PNG, WEBP, GIF, PDF.`,
      });
    }

    // Konversi base64 → buffer
    let buffer;
    try {
      buffer = Buffer.from(fileData, "base64");
    } catch {
      return res.status(400).json({ error: "Data base64 tidak valid." });
    }

    if (fileSize && fileSize > MAX_FILE_SIZE_B) {
      return res.status(400).json({
        error: `Ukuran file terlalu besar (${(fileSize / 1024 / 1024).toFixed(1)}MB). Maks ${MAX_FILE_SIZE_MB}MB.`,
      });
    }

    // ── Coba upload ke R2 ──
    let uploadedUrl = null;
    try {
      uploadedUrl = await uploadToR2Bucket(fileName, fileType, buffer, folder);
    } catch (r2Err) {
      console.warn("[upload-r2] R2 upload failed, returning base64 fallback:", r2Err.message);
    }

    if (uploadedUrl) {
      return res.status(200).json({
        success: true,
        url    : uploadedUrl,
        key    : uploadedUrl.split("/").pop() || fileName,
        size   : buffer.length,
        type   : fileType,
      });
    }

    // ── Fallback: balikin data URL (base64) ──
    const dataUrl = `data:${fileType};base64,${fileData}`;
    return res.status(200).json({
      success   : true,
      url       : dataUrl,
      fallback  : true,
      warning   : "R2 storage tidak terkonfigurasi. File disimpan sebagai data URL (tidak direkomendasikan untuk file besar).",
      size      : buffer.length,
      type      : fileType,
    });

  } catch (error) {
    console.error("[upload-r2]", error);
    return res.status(500).json({ error: error.message || "Upload gagal." });
  }
}
