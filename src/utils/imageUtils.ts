// ============================================================
// IMAGE UTILS — Kompresi, resize, validasi sebelum upload
// ============================================================

export interface CompressOptions {
  maxWidth   ?: number;  // Default 1200px
  maxHeight  ?: number;  // Default 1200px
  quality    ?: number;  // Default 0.75 (0-1)
  maxSizeMB  ?: number;  // Default 1MB — kalau lebih, kompres lagi
}

const DEFAULT: Required<CompressOptions> = {
  maxWidth  : 1200,
  maxHeight : 1200,
  quality   : 0.75,
  maxSizeMB : 1,
};

/**
 * Kompres gambar via Canvas API.
 * - Resize jika > maxWidth/maxHeight
 * - Konversi ke JPEG dengan quality tertentu
 * - Return sebagai base64 data URL
 */
export function compressImage(
  file     : File,
  options  : CompressOptions = {}
): Promise<{ dataUrl: string; blob: Blob; width: number; height: number }> {

  return new Promise((resolve, reject) => {
    const opts = { ...DEFAULT, ...options };

    // Hanya kompres image, bukan PDF
    if (!file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve({
          dataUrl,
          blob   : file,
          width  : 0,
          height : 0,
        });
      };
      reader.onerror = () => reject(new Error("Gagal membaca file."));
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Resize kalau terlalu besar
      if (width > opts.maxWidth) {
        height = Math.round((height * opts.maxWidth) / width);
        width  = opts.maxWidth;
      }
      if (height > opts.maxHeight) {
        width  = Math.round((width * opts.maxHeight) / height);
        height = opts.maxHeight;
      }

      const canvas  = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas tidak didukung."));
        return;
      }

      // Fill white background (untuk PNG transparan)
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Convert ke JPEG (lebih kecil dari PNG)
      const dataUrl = canvas.toDataURL("image/jpeg", opts.quality);

      // Convert dataUrl → blob untuk cek ukuran
      const byteString = atob(dataUrl.split(",")[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const blob = new Blob([ab], { type: "image/jpeg" });

      // Kalau masih > maxSizeMB, kompres lagi dengan quality lebih rendah
      if (blob.size > opts.maxSizeMB * 1024 * 1024 && opts.quality > 0.3) {
        const newQuality = opts.quality - 0.2;
        canvas.toBlob(
          (b) => {
            if (!b) { resolve({ dataUrl, blob, width, height }); return; }
            const reader = new FileReader();
            reader.onload = () => resolve({
              dataUrl: reader.result as string,
              blob: b,
              width,
              height,
            });
            reader.readAsDataURL(b);
          },
          "image/jpeg",
          newQuality
        );
      } else {
        resolve({ dataUrl, blob, width, height });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gagal memuat gambar."));
    };

    img.src = url;
  });
}

/**
 * Validasi file sebelum upload
 */
export interface FileValidation {
  valid   : boolean;
  error  ?: string;
}

export function validateFile(
  file      : File,
  maxSizeMB : number = 5,
  allowedTypes?: string[]
): FileValidation {

  // Cek tipe
  const types = allowedTypes || [
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "application/pdf",
  ];

  if (!types.includes(file.type)) {
    return {
      valid : false,
      error : `Tipe file tidak diizinkan: ${file.type}. Gunakan JPG, PNG, WEBP, GIF, atau PDF.`,
    };
  }

  // Cek ukuran
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > maxSizeMB) {
    return {
      valid : false,
      error : `Ukuran file terlalu besar (${sizeMB.toFixed(1)}MB). Maksimal ${maxSizeMB}MB.`,
    };
  }

  return { valid: true };
}

/**
 * Ambil ekstensi dari filename
 */
export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

/**
 * Generate nama file yang aman
 */
export function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(0, 100);
}

export default compressImage;
