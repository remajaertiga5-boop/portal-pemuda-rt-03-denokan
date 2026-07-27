// ============================================================
// API Integration Helper
// Google Apps Script & Backend Proxies
// ============================================================

// ✅ FIXED: Helper env yang lebih aman & konsisten
const getEnvVar = (key: string): string | undefined => {
  try {
    if (typeof import.meta !== "undefined" && (import.meta as any).env) {
      return (import.meta as any).env[key];
    }
  } catch {
    // Ignore — environment tidak support import.meta
  }
  if (typeof process !== "undefined" && process.env) {
    return process.env[key];
  }
  return undefined;
};

// ✅ FIXED: Pisahkan BASE_URL & fallback lebih jelas
const API_URL =
  getEnvVar("VITE_API_URL") ||
  "https://script.google.com/macros/s/AKfycbx_EXAMPLE_APPS_SCRIPT_URL/exec";

// ✅ ADDED: Timeout default bisa dikonfigurasi via env
const DEFAULT_TIMEOUT_MS = Number(getEnvVar("VITE_API_TIMEOUT")) || 15000;

// ✅ ADDED: Max retry otomatis saat network error
const DEFAULT_MAX_RETRY = 2;

// ============================================================
// TYPES
// ============================================================

export interface ApiResponse<T = any> {
  status  : "success" | "error";
  message?: string;
  data   ?: T;
  // ✅ ADDED: Field tambahan yang sering dipakai
  total  ?: number;
  page   ?: number;
  error  ?: string;
}

// ✅ ADDED: Tipe untuk opsi fetch tambahan
export interface FetchOptions {
  timeoutMs?: number;   // Override timeout per-request
  maxRetry ?: number;   // Override max retry per-request
  signal   ?: AbortSignal; // Untuk cancel dari luar
}

// ============================================================
// HELPERS
// ============================================================

// ✅ ADDED: Cek apakah error layak di-retry
const isRetryableError = (error: any): boolean => {
  // Retry jika: timeout, network error, 5xx server error
  if (error.name === "AbortError") return false; // Jangan retry kalau di-cancel manual
  if (error.message?.includes("NetworkError")) return true;
  if (error.message?.includes("Failed to fetch")) return true;
  if (error.message?.includes("HTTP Error: 5")) return true;
  return false;
};

// ✅ ADDED: Delay untuk retry (exponential backoff)
const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

// ✅ ADDED: Sanitasi params agar tidak ada nilai undefined/null
const sanitizeParams = (params: Record<string, any>): Record<string, any> => {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null
    )
  );
};

// ============================================================
// CORE FETCH
// ============================================================

export async function fetchAPI(
  params : Record<string, any>,
  options: FetchOptions = {}
): Promise<ApiResponse> {

  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxRetry  = DEFAULT_MAX_RETRY,
    signal    : externalSignal,
  } = options;

  // ✅ FIXED: Cek koneksi lebih awal & pesan lebih jelas
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("Tidak ada koneksi internet. Periksa jaringan Anda.");
  }

  // ✅ ADDED: Sanitasi params sebelum dikirim
  const cleanParams = sanitizeParams(params);

  let lastError: Error = new Error("Unknown error");

  for (let attempt = 0; attempt <= maxRetry; attempt++) {

    // ✅ FIXED: AbortController per-attempt agar tidak konflik
    const controller  = new AbortController();
    const timeoutId   = setTimeout(() => controller.abort(), timeoutMs);

    // ✅ ADDED: Gabungkan signal eksternal dengan timeout signal
    const signal = externalSignal
      ? (() => {
          // Jika external signal di-abort, abort juga controller ini
          if (externalSignal.aborted) controller.abort();
          externalSignal.addEventListener("abort", () => controller.abort());
          return controller.signal;
        })()
      : controller.signal;

    try {
      let response: Response;

      if (cleanParams.method === "POST") {
        // ✅ FIXED: Hapus field 'method' dari body — tidak perlu dikirim ke server
        const { method: _method, ...bodyParams } = cleanParams;
        response = await fetch(API_URL, {
          method : "POST",
          signal,
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
          },
          body: JSON.stringify(bodyParams),
        });
      } else {
        // ✅ FIXED: Hapus field 'method' dari query string
        const { method: _method, ...queryParams } = cleanParams;
        const queryString = new URLSearchParams(
          // URLSearchParams hanya terima string values
          Object.fromEntries(
            Object.entries(queryParams).map(([k, v]) => [k, String(v)])
          )
        ).toString();
        const url = `${API_URL}${API_URL.includes("?") ? "&" : "?"}${queryString}`;
        response  = await fetch(url, { signal });
      }

      clearTimeout(timeoutId);

      // ✅ FIXED: Handle berbagai HTTP error code dengan pesan spesifik
      if (!response.ok) {
        const statusMessages: Record<number, string> = {
          400: "Permintaan tidak valid (400)",
          401: "Tidak terotorisasi (401)",
          403: "Akses ditolak (403)",
          404: "Endpoint tidak ditemukan (404)",
          429: "Terlalu banyak permintaan. Coba lagi nanti (429)",
          500: "Server error (500)",
          502: "Bad gateway (502)",
          503: "Server tidak tersedia (503)",
          504: "Gateway timeout (504)",
        };
        throw new Error(
          statusMessages[response.status] ||
          `HTTP Error: ${response.status} ${response.statusText}`
        );
      }

      // ✅ FIXED: Handle jika response bukan JSON valid
      let data: ApiResponse;
      try {
        data = await response.json();
      } catch {
        throw new Error("Response dari server bukan format JSON yang valid.");
      }

      return data;

    } catch (error: any) {
      clearTimeout(timeoutId);
      lastError = error;

      // ✅ FIXED: Pesan AbortError lebih informatif
      if (error.name === "AbortError") {
        // Cek apakah di-abort dari external atau timeout
        if (externalSignal?.aborted) {
          throw new Error("Permintaan dibatalkan.");
        }
        throw new Error(
          `Server tidak merespon dalam ${timeoutMs / 1000} detik. Coba lagi.`
        );
      }

      // ✅ ADDED: Jangan retry kalau koneksi memang mati
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw new Error("Tidak ada koneksi internet.");
      }

      // ✅ ADDED: Retry dengan exponential backoff
      if (attempt < maxRetry && isRetryableError(error)) {
        const waitMs = Math.pow(2, attempt) * 500; // 500ms, 1000ms, 2000ms
        console.warn(
          `[API] Percobaan ${attempt + 1} gagal. Retry dalam ${waitMs}ms...`,
          error.message
        );
        await delay(waitMs);
        continue;
      }

      // Sudah habis retry atau error tidak bisa di-retry
      console.warn("[API] Request gagal:", error);
      throw error;
    }
  }

  // Tidak seharusnya sampai sini, tapi TypeScript perlu ini
  throw lastError;
}

// ============================================================
// SHORTHAND FUNCTIONS
// ============================================================

// ✅ FIXED: Tambah parameter options untuk fleksibilitas
export async function getData(
  action : string,
  params : Record<string, any> = {},
  options: FetchOptions = {}
): Promise<ApiResponse> {
  return fetchAPI({ action, ...params, method: "GET" }, options);
}

export async function postData(
  action : string,
  data   : Record<string, any> = {},
  options: FetchOptions = {}
): Promise<ApiResponse> {
  return fetchAPI({ action, data, method: "POST" }, options);
}

// ============================================================
// FILE UPLOAD
// ============================================================

// ✅ ADDED: Validasi tipe & ukuran file sebelum upload
const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const MAX_FILE_SIZE_MB = 5;

export async function uploadFile(
  file      : File,
  folder    : string,
  idAnggota : string,
  options   : FetchOptions = {}
): Promise<ApiResponse> {

  // ✅ ADDED: Validasi tipe file
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error(
      `Tipe file tidak diizinkan: ${file.type}. ` +
      `Format yang diizinkan: JPG, PNG, WEBP, PDF.`
    );
  }

  // ✅ ADDED: Validasi ukuran file
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > MAX_FILE_SIZE_MB) {
    throw new Error(
      `Ukuran file terlalu besar (${fileSizeMB.toFixed(1)}MB). ` +
      `Maksimal ${MAX_FILE_SIZE_MB}MB.`
    );
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const resultStr = e.target?.result as string;

        // ✅ FIXED: Guard jika result tidak ada atau bukan data URL
        if (!resultStr || !resultStr.includes(",")) {
          throw new Error("Gagal membaca file: format data tidak valid.");
        }

        const base64 = resultStr.split(",")[1];

        // ✅ FIXED: Guard jika base64 kosong
        if (!base64) {
          throw new Error("Gagal mengkonversi file ke base64.");
        }

        const response = await postData(
          "uploadFile",
          {
            fileName  : file.name,
            fileType  : file.type,
            fileSize  : file.size,   // ✅ ADDED: Kirim ukuran file ke server
            fileData  : base64,
            folder,
            idAnggota,
          },
          options
        );

        resolve(response);
      } catch (error) {
        reject(error);
      }
    };

    // ✅ FIXED: Pesan error lebih spesifik
    reader.onerror = () =>
      reject(new Error(`Gagal membaca file "${file.name}". File mungkin rusak atau tidak bisa diakses.`));

    reader.readAsDataURL(file);
  });
}

// ============================================================
// UTILITY EXPORTS
// ============================================================

// ✅ ADDED: Export konstanta yang berguna untuk komponen lain
export const API_CONFIG = {
  url       : API_URL,
  timeoutMs : DEFAULT_TIMEOUT_MS,
  maxRetry  : DEFAULT_MAX_RETRY,
  maxFileMB : MAX_FILE_SIZE_MB,
  allowedTypes: ALLOWED_FILE_TYPES,
} as const;
