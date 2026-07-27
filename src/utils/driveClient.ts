// ============================================================
// DRIVE CLIENT — Upload bukti pembayaran ke Google Drive
// ============================================================

import { apiRequest } from "./apiClient";

interface DriveUploadResult {
  success      : boolean;
  url          : string;   // Google Drive sharing link
  downloadUrl  : string;   // Direct embed/view URL
  thumbnailUrl : string;   // Thumbnail preview URL
  fileId       : string;
  fileName     : string;
  fileSize     : number;
  mimeType     : string;
  createdAt    : string;
  error       ?: string;
}

/**
 * Upload bukti pembayaran ke Google Drive
 * @param fileData  - Base64 data URL (data:image/jpeg;base64,...)
 * @param fileName  - Nama file
 * @param fileType  - MIME type (image/jpeg, image/png, etc.)
 * @param idAnggota - ID anggota yang upload
 */
export async function uploadToDrive(
  fileData  : string,
  fileName  : string,
  fileType  : string,
  idAnggota : string = "",
): Promise<DriveUploadResult | null> {
  try {
    // Strip prefix if data URL
    let base64Data = fileData;
    if (fileData.startsWith("data:")) {
      const parts = fileData.split(",");
      base64Data = parts[1] || fileData;
    }

    const result = await apiRequest("/drive-upload", {
      method: "POST",
      body: {
        fileName,
        fileType,
        fileData  : base64Data,
        idAnggota : idAnggota || "anggota",
      },
      timeout: 15000,
      retry  : 1,
    });

    if (result.ok && result.data?.success) {
      return result.data as DriveUploadResult;
    }

    console.warn("[DriveClient] Upload failed:", result.error || result.data?.error);
    return null;
  } catch (err) {
    console.error("[DriveClient] Upload error:", err);
    return null;
  }
}

export type { DriveUploadResult };
