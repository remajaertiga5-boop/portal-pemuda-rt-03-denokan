// ============================================================
// API CLIENT TERPUSAT
// Semua API calls melalui file ini — retry, timeout, cache,
// offline detection, error handling terstandarisasi
// ============================================================

import { AppData } from "./dataStore";

// ── Constants ─────────────────────────────────────────────
const API_BASE     = "/api";
const TIMEOUT_MS   = 15000;
const MAX_RETRY    = 2;

// ── Types ─────────────────────────────────────────────────
export interface ApiResult<T = any> {
  ok      : boolean;
  data   ?: T;
  error  ?: string;
  status  : number;
  fromCache?: boolean;
}

export type ApiMethod = "GET" | "POST" | "PUT" | "DELETE";

interface RequestOptions {
  method ?: ApiMethod;
  body   ?: any;
  timeout?: number;
  retry  ?: number;
  signal ?: AbortSignal;
}

// ── Cache (in-memory, session only) ────────────────────────
const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 menit

function getCacheKey(url: string, body?: any): string {
  return url + (body ? "|" + JSON.stringify(body) : "");
}

function getFromCache(key: string): any | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, ts: Date.now() });
  // Batasi ukuran cache
  if (cache.size > 50) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) cache.delete(oldest[0]);
  }
}

// ── Helpers ────────────────────────────────────────────────
function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

async function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function isRetryable(err: Error): boolean {
  const msg = err.message?.toLowerCase() || "";
  return (
    msg.includes("network") ||
    msg.includes("failed to fetch") ||
    msg.includes("timeout") ||
    msg.includes("5") // 5xx errors
  );
}

// ── Core Request ───────────────────────────────────────────
export async function apiRequest<T = any>(
  path      : string,
  options   : RequestOptions = {}
): Promise<ApiResult<T>> {

  const {
    method  = "GET",
    body,
    timeout = TIMEOUT_MS,
    retry   = MAX_RETRY,
    signal  : externalSignal,
  } = options;

  const url       = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const cacheKey  = getCacheKey(url, body);

  // Return from cache for GET requests when offline
  if (method === "GET" && !isOnline()) {
    const cached = getFromCache(cacheKey);
    if (cached) {
      return { ok: true, data: cached, status: 200, fromCache: true };
    }
    return { ok: false, error: "Tidak ada koneksi internet & tidak ada data cache.", status: 0 };
  }

  let lastError: Error = new Error("Unknown error");

  for (let attempt = 0; attempt <= retry; attempt++) {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), timeout);

    // Gabungkan sinyal
    const signal = externalSignal
      ? (() => {
          if (externalSignal.aborted) controller.abort();
          externalSignal.addEventListener("abort", () => controller.abort(), { once: true });
          return controller.signal;
        })()
      : controller.signal;

    try {
      const fetchOptions: RequestInit = {
        method,
        signal,
        headers: { "Content-Type": "application/json" },
      };

      if (body && method !== "GET") {
        fetchOptions.body = JSON.stringify(body);
      }

      const res = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      // Parse response
      let data: any;
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        try { data = await res.json(); } catch { data = null; }
      } else {
        try { data = await res.text(); } catch { data = null; }
      }

      if (!res.ok) {
        const errMsg = data?.error || data?.message || `HTTP ${res.status}`;
        return { ok: false, error: errMsg, status: res.status, data };
      }

      // Cache successful GET responses
      if (method === "GET") {
        setCache(cacheKey, data);
      }

      return { ok: true, data, status: res.status };

    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;

      if (err.name === "AbortError") {
        if (externalSignal?.aborted) {
          return { ok: false, error: "Permintaan dibatalkan.", status: 0 };
        }
        // Timeout — retry
      }

      if (attempt < retry && isRetryable(err)) {
        await delay(Math.pow(2, attempt) * 500);
        continue;
      }

      return {
        ok    : false,
        error : err.message || "Gagal terhubung ke server.",
        status: 0,
      };
    }
  }

  return {
    ok    : false,
    error : lastError.message || "Gagal setelah beberapa kali percobaan.",
    status: 0,
  };
}

// ── API Endpoints ──────────────────────────────────────────

/** Chat AI / Asisten Pemuda */
export async function chatAI(
  message     : string,
  history     : { role: string; text: string }[],
  appData     : AppData,
  userRole    : string,
  customApiKey?: string
): Promise<ApiResult<{ reply: string; updatedAppData?: AppData }>> {
  return apiRequest("/chat", {
    method: "POST",
    body  : { message, history, appData, userRole, customApiKey },
    timeout: 25000, // AI butuh waktu lebih lama
    retry  : 1,
  });
}

/** Kirim media ke Telegram */
export async function sendToTelegram(
  botToken: string,
  chatId  : string,
  mediaUrl: string,
  caption : string,
  isVideo : boolean
): Promise<ApiResult> {
  return apiRequest("/telegram/send-media", {
    method: "POST",
    body  : { botToken, chatId, mediaUrl, caption, isVideo },
    timeout: 12000,
    retry  : 1,
  });
}

/** Upload file ke Cloudflare R2 */
export async function uploadToR2(
  file     : File,
  folder   : string,
  idAnggota: string,
  accessKey?: string,
  secretKey?: string,
  bucket   ?: string,
  accountId?: string
): Promise<ApiResult<{ url: string; key: string; size?: number; fallback?: boolean; warning?: string }>> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string)?.split(",")[1] || "";
      const result = await apiRequest("/upload-r2", {
        method : "POST",
        body   : {
          fileName  : file.name,
          fileType  : file.type,
          fileSize  : file.size,
          fileData  : base64,
          folder,
          idAnggota,
          accessKey,
          secretKey,
          bucket,
          accountId,
        },
        timeout: 30000,
        retry  : 1,
      });
      resolve(result);
    };
    reader.onerror = () => {
      resolve({ ok: false, error: "Gagal membaca file.", status: 0 });
    };
    reader.readAsDataURL(file);
  });
}

/** Proxy ke Google Sheets (read/write) */
export async function sheetsProxy(
  action     : string,
  params     : Record<string, any> = {}
): Promise<ApiResult> {
  return apiRequest("/sheets-proxy", {
    method: "POST",
    body  : { action, ...params },
    timeout: 10000,
  });
}

/** Verifikasi auth via Google Sheets */
export async function verifyAuth(
  idAnggota: string,
  pin      : string
): Promise<ApiResult<{ valid: boolean; role?: string; name?: string }>> {
  return apiRequest("/auth-verify", {
    method: "POST",
    body  : { idAnggota, pin },
    timeout: 8000,
  });
}

// ── Offline Queue ──────────────────────────────────────────
const QUEUE_KEY = "api_offline_queue";

interface QueuedRequest {
  id      : string;
  path    : string;
  options : RequestOptions;
  created : number;
}

export function getOfflineQueue(): QueuedRequest[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveOfflineQueue(queue: QueuedRequest[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(0, 100)));
  } catch {}
}

/** Tambahkan request ke antrian offline */
export function enqueueOffline(path: string, options: RequestOptions): void {
  const queue = getOfflineQueue();
  queue.push({
    id      : `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    path,
    options,
    created : Date.now(),
  });
  saveOfflineQueue(queue);
}

/** Proses antrian offline saat online kembali */
export async function processOfflineQueue(): Promise<{ success: number; failed: number }> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { success: 0, failed: 0 };

  let success = 0, failed = 0;
  const remaining: QueuedRequest[] = [];

  for (const item of queue) {
    const result = await apiRequest(item.path, item.options);
    if (result.ok) {
      success++;
    } else {
      failed++;
      // Simpan yang gagal untuk dicoba lagi nanti (max 3x)
      if (Date.now() - item.created < 30 * 60 * 1000) {
        remaining.push(item);
      }
    }
  }

  saveOfflineQueue(remaining);
  return { success, failed };
}

// ── Health Check ───────────────────────────────────────────
let _apiStatus: "online" | "offline" | "unknown" = "unknown";

export async function checkApiHealth(): Promise<boolean> {
  // Cek koneksi lokal dulu
  if (!isOnline()) {
    _apiStatus = "offline";
    return false;
  }
  try {
    // Coba ping endpoint ringan
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${API_BASE}/sheets-proxy`, {
      method : "POST",
      signal : controller.signal,
      headers: { "Content-Type": "application/json" },
      body   : JSON.stringify({ action: "ping" }),
    });
    clearTimeout(timeoutId);
    _apiStatus = res.ok ? "online" : "offline";
    return res.ok;
  } catch {
    _apiStatus = "offline";
    return false;
  }
}

export function getApiStatus(): "online" | "offline" | "unknown" {
  return _apiStatus;
}

// ── Clear Cache ────────────────────────────────────────────
export function clearApiCache(): void {
  cache.clear();
}

// ── Export Default ─────────────────────────────────────────
const apiClient = {
  apiRequest,
  chatAI,
  sendToTelegram,
  uploadToR2,
  sheetsProxy,
  verifyAuth,
  checkApiHealth,
  getApiStatus,
  getOfflineQueue,
  enqueueOffline,
  processOfflineQueue,
  clearApiCache,
};

export default apiClient;
