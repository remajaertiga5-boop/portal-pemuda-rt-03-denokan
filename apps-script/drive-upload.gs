// ============================================================
// GOOGLE APPS SCRIPT — DRIVE UPLOAD API
// Upload bukti pembayaran ke folder Google Drive
// 
// Deploy: Publish → Deploy as web app → Anyone
// Copy URL ke env VERCEL_DRIVE_SCRIPT_URL
// ============================================================

const FOLDERS = {
  bukti: "18ZbevjsEm8ElZnrLiVB50GBlUtwoYRV7",
  profil: "1Kz8foBDUWew090EnGDfuu4T8Yw8FJSzh",
};
const DEFAULT_FOLDER = "bukti";
const API_KEY = "remaja-legok-03-2026";

// ── CORS Helper ───────────────────────────────────────────
function jsonResp(data, code) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
    .setStatusCode(code || 200);
}

// ── Auth ──────────────────────────────────────────────────
function checkAuth(req) {
  const key = (req.parameter.key || req.parameter.apiKey || "");
  const auth = (req.headers?.Authorization || "");
  return key === API_KEY || auth === "Bearer " + API_KEY;
}

// ── POST: Upload file ─────────────────────────────────────
function doPost(e) {
  if (!checkAuth(e)) return jsonResp({ error: "Unauthorized" }, 401);

  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch {
    return jsonResp({ error: "Invalid JSON" }, 400);
  }

  const { fileName, fileType, fileData, idAnggota } = body || {};

  if (!fileName || !fileType || !fileData) {
    return jsonResp({ error: "fileName, fileType, fileData wajib" }, 400);
  }

  // Limit: 5MB
  const sizeBytes = Math.ceil((fileData.length * 3) / 4);
  if (sizeBytes > 5 * 1024 * 1024) {
    return jsonResp({ error: "File terlalu besar (max 5MB)" }, 400);
  }

  try {
    // Decode base64
    const decoded = Utilities.base64Decode(fileData);
    const blob = Utilities.newBlob(decoded, fileType, fileName);

    // Upload ke folder
    const folderType = body.folderType || "bukti";
    const folderId = FOLDERS[folderType] || FOLDERS["bukti"];
    const folder = DriveApp.getFolderById(folderId);
    const file = folder.createFile(blob);

    // Set public
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Metadata
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    file.setName(`${folderType}-${idAnggota || "anon"}-${timestamp}-${fileName}`);
    file.setDescription(`${folderType === "profil" ? "Foto profil" : "Bukti pembayaran"} dari ${idAnggota || "Anggota"} — ${new Date().toLocaleString("id-ID")}`);

    return jsonResp({
      success     : true,
      url         : file.getUrl(),           // Drive sharing link
      downloadUrl : `https://drive.google.com/uc?export=view&id=${file.getId()}`,
      thumbnailUrl: `https://drive.google.com/thumbnail?id=${file.getId()}&sz=w400`,
      fileId      : file.getId(),
      fileName    : file.getName(),
      fileSize    : file.getSize(),
      mimeType    : file.getMimeType(),
      createdAt   : file.getDateCreated().toISOString(),
    });

  } catch (err) {
    return jsonResp({ error: "Upload gagal: " + err.toString() }, 500);
  }
}

// ── GET: Health check ─────────────────────────────────────
function doGet(e) {
  if (!checkAuth(e)) return jsonResp({ error: "Unauthorized" }, 401);
  return jsonResp({
    status  : "ok",
    folders : FOLDERS,
    time    : new Date().toISOString(),
  });
}
