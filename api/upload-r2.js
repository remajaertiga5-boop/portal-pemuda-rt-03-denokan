// ============================================================
// VERCEL SERVERLESS FUNCTION - CLOUDFLARE R2 FILE UPLOAD PROXY
// ============================================================

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import multer from "multer";
import https from "https";

// ----------------------------------------------------------
// ALLOWED MIME TYPES
// ----------------------------------------------------------
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

// ----------------------------------------------------------
// MULTER - IN MEMORY STORAGE
// ----------------------------------------------------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipe file tidak diizinkan: ${file.mimetype}`));
    }
  },
});

// ----------------------------------------------------------
// HELPER - RUN MIDDLEWARE
// ----------------------------------------------------------
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

// ----------------------------------------------------------
// LAZY LOAD S3 CLIENT
// ----------------------------------------------------------
let s3Client = null;

function getS3Client() {
  if (!s3Client) {
    const accountId      = process.env.VITE_R2_ACCOUNT_ID;
    const accessKeyId    = process.env.VITE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.VITE_R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error("Missing Cloudflare R2 environment credentials");
    }

    s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
      requestHandler: {
        httpsAgent: new https.Agent({
          minVersion: 'TLSv1.2',
        }),
      },
    });
  }
  return s3Client;
}

// ----------------------------------------------------------
// VERCEL CONFIG - DISABLE BODY PARSER
// ----------------------------------------------------------
export const config = {
  api: {
    bodyParser: false,
  },
};

// ----------------------------------------------------------
// HANDLER
// ----------------------------------------------------------
export default async function handler(req, res) {

  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  // ----------------------------------------------------------
  // VALIDASI ENV
  // ----------------------------------------------------------
  const bucketName = process.env.VITE_R2_BUCKET_NAME;
  const publicUrl  = process.env.VITE_R2_PUBLIC_URL;

  if (!bucketName) {
    console.error("[upload-r2] Missing VITE_R2_BUCKET_NAME");
    return res.status(500).json({ error: "System configuration error." });
  }

  if (!publicUrl) {
    console.error("[upload-r2] Missing VITE_R2_PUBLIC_URL");
    return res.status(500).json({ error: "System configuration error." });
  }

  try {
    // Jalankan multer
    await runMiddleware(req, res, upload.single("file"));

    if (!req.file) {
      return res.status(400).json({ error: "Tidak ada file yang diupload." });
    }

    // Sanitasi folder name
    let folder = (req.body?.folder || "umum").replace(/[^a-zA-Z0-9_-]/g, "");
    if (!folder) folder = "umum";

    // Generate file key unik
    const cleanFileName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileKey       = `${folder}/${Date.now()}-${cleanFileName}`;

    // Upload ke Cloudflare R2
    const s3 = getS3Client();

    await s3.send(
      new PutObjectCommand({
        Bucket:      bucketName,
        Key:         fileKey,
        Body:        req.file.buffer,
        ContentType: req.file.mimetype,
      })
    );

    const uploadedUrl = `${publicUrl.replace(/\/$/, "")}/${fileKey}`;

    return res.status(200).json({
      success:  true,
      url:      uploadedUrl,
      key:      fileKey,
      size:     req.file.size,
      mimetype: req.file.mimetype,
    });

  } catch (error) {
    console.error("[upload-r2] Upload error:", error);
    return res.status(500).json({
      error: "Upload file gagal. Silakan coba lagi."
    });
  }
}
