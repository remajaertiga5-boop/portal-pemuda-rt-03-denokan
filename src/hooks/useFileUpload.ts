// ============================================================
// useFileUpload — Hook reusable untuk upload file/foto
// Features: kompresi, upload ke R2, fallback base64, loading state
// ============================================================

import { useState, useCallback } from "react";
import { compressImage, validateFile, sanitizeFileName } from "../utils/imageUtils";
import { uploadToR2 } from "../utils/apiClient";

// ── Types ─────────────────────────────────────────────────
interface UploadResult {
  url      : string;
  fileName : string;
  fileType : string;
  size     : number;
  isDataUrl: boolean; // true = fallback base64, false = R2 URL
}

interface UseFileUploadOptions {
  folder      ?: string;
  compress    ?: boolean;
  maxWidth    ?: number;
  maxHeight   ?: number;
  quality     ?: number;
  maxSizeMB   ?: number;
  onSuccess   ?: (result: UploadResult) => void;
  onError     ?: (error: string) => void;
}

interface UseFileUploadReturn {
  uploading     : boolean;
  progress      : string; // "Memproses...", "Mengupload...", dll
  lastResult    : UploadResult | null;
  lastError     : string | null;
  upload        : (file: File, idAnggota?: string) => Promise<UploadResult | null>;
  uploadMultiple: (files: File[], idAnggota?: string) => Promise<UploadResult[]>;
  reset         : () => void;
}

// ── Hook ───────────────────────────────────────────────────
export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadReturn {
  const {
    folder    = "umum",
    compress  = true,
    maxWidth  = 1200,
    maxHeight = 1200,
    quality   = 0.75,
    maxSizeMB = 5,
    onSuccess,
    onError,
  } = options;

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState("");
  const [lastResult, setLastResult] = useState<UploadResult | null>(null);
  const [lastError, setLastError]   = useState<string | null>(null);

  const upload = useCallback(async (
    file       : File,
    idAnggota ?: string
  ): Promise<UploadResult | null> => {
    setUploading(true);
    setLastError(null);
    setProgress("Memvalidasi file...");

    try {
      // 1. Validasi
      const validation = validateFile(file, maxSizeMB);
      if (!validation.valid) {
        throw new Error(validation.error || "File tidak valid.");
      }

      // 2. Kompresi (kalau image)
      let fileData: string;
      let processedFile: File;

      if (compress && file.type.startsWith("image/")) {
        setProgress("Mengompres gambar...");
        const compressed = await compressImage(file, { maxWidth, maxHeight, quality });
        fileData      = compressed.dataUrl.split(",")[1]; // base64 only
        processedFile = new File([compressed.blob], sanitizeFileName(file.name), { type: "image/jpeg" });
      } else {
        // Baca file mentah (untuk PDF dll)
        setProgress("Membaca file...");
        fileData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload  = () => resolve((reader.result as string)?.split(",")[1] || "");
          reader.onerror = () => reject(new Error("Gagal membaca file."));
          reader.readAsDataURL(file);
        });
        processedFile = file;
      }

      // 3. Upload ke R2
      setProgress("Mengupload ke server...");
      const result = await uploadToR2(
        processedFile,
        folder,
        idAnggota || "anonymous",
      );

      if (!result.ok) {
        throw new Error(result.error || "Upload gagal.");
      }

      const uploadResult: UploadResult = {
        url      : result.data?.url || "",
        fileName : processedFile.name,
        fileType : processedFile.type,
        size     : (result.data as any)?.size || processedFile.size,
        isDataUrl: (result.data as any)?.fallback || false,
      };

      setLastResult(uploadResult);
      setProgress("");
      onSuccess?.(uploadResult);
      return uploadResult;

    } catch (err: any) {
      const errorMsg = err.message || "Upload gagal.";
      setLastError(errorMsg);
      setProgress("");
      onError?.(errorMsg);
      return null;
    } finally {
      setUploading(false);
    }
  }, [folder, compress, maxWidth, maxHeight, quality, maxSizeMB, onSuccess, onError]);

  const uploadMultiple = useCallback(async (
    files      : File[],
    idAnggota ?: string
  ): Promise<UploadResult[]> => {
    const results: UploadResult[] = [];
    for (const file of files) {
      setProgress(`Upload ${results.length + 1}/${files.length}...`);
      const result = await upload(file, idAnggota);
      if (result) results.push(result);
    }
    setProgress("");
    return results;
  }, [upload]);

  const reset = useCallback(() => {
    setLastResult(null);
    setLastError(null);
    setProgress("");
  }, []);

  return { uploading, progress, lastResult, lastError, upload, uploadMultiple, reset };
}

export type { UploadResult };
export default useFileUpload;
