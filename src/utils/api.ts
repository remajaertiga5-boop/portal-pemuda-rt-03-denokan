// ============================================================
// API Integration — Google Apps Script Backend v3.0
// ============================================================

function getScriptUrl(): string {
  try { const s = localStorage.getItem("apps_script_url"); if (s) return s; } catch {}
  try { if (import.meta.env?.VITE_API_URL) return import.meta.env.VITE_API_URL; } catch {}
  return "https://script.google.com/macros/s/AKfycbyn9nU2CFNoGfUqN42KEPEm8HO0Xqnd8wEfyO5i7e3bqcNx-8i4JCt2dhcTW47OWcvchw/exec";
}

const API_KEY = "remaja-legok-03-2026";
const DEFAULT_TIMEOUT = 15000;
const MAX_RETRY = 2;

export interface ApiResponse<T = any> {
  success?: boolean; status?: string; message?: string; data?: T;
  total?: number; error?: string; reply?: string;
  url?: string; fileId?: string; isVideo?: boolean;
  valid?: boolean; found?: boolean; role?: string;
  nama?: string; jabatan?: string; foto?: string; idAnggota?: string;
}

export interface FetchOptions { timeoutMs?: number; maxRetry?: number; signal?: AbortSignal; }

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export async function fetchAPI(params: Record<string, any>, options: FetchOptions = {}): Promise<ApiResponse> {
  const { timeoutMs = DEFAULT_TIMEOUT, maxRetry = MAX_RETRY, signal: extSignal } = options;
  if (typeof navigator !== "undefined" && !navigator.onLine) throw new Error("Tidak ada koneksi internet.");

const API_URL = getScriptUrl();
  let lastErr: Error = new Error("Unknown");

  for (let i = 0; i <= maxRetry; i++) {
    const ctrl = new AbortController(); const tid = setTimeout(() => ctrl.abort(), timeoutMs);
    if (extSignal) { if (extSignal.aborted) ctrl.abort(); extSignal.addEventListener("abort", () => ctrl.abort(), { once: true }); }
    try {
      let resp: Response;
      if (params.method === "POST") {
        const { method: _m, ...body } = params;
        resp = await fetch(API_URL, { method: "POST", signal: ctrl.signal, headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ ...body, key: API_KEY, apiKey: API_KEY }) });
      } else {
        const { method: _m, ...qp } = params;
        const qs = new URLSearchParams(Object.entries(qp).map(([k,v]) => [k,String(v)])).toString();
        resp = await fetch(`${API_URL}${API_URL.includes("?")?"&":"?"}${qs}&key=${encodeURIComponent(API_KEY)}`, { signal: ctrl.signal });
      }
      clearTimeout(tid);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.json();
    } catch (e: any) {
      clearTimeout(tid); lastErr = e;
      if (e.name === "AbortError") { if (extSignal?.aborted) throw new Error("Dibatalkan."); throw new Error(`Timeout ${timeoutMs/1000}s.`); }
      if (i < maxRetry && /network|failed|timeout/i.test(e.message||"")) { await delay(Math.pow(2,i)*500); continue; }
      throw e;
    }
  }
  throw lastErr;
}

export function getData(act: string, p: Record<string,any>={}, o?: FetchOptions) { return fetchAPI({action:act,...p,method:"GET"},o); }
export function postData(act: string, d: Record<string,any>={}, o?: FetchOptions) { return fetchAPI({action:act,...d,method:"POST"},o); }

// Upload file ke Drive
export function uploadFile(file: File, folder: string, idAnggota: string): Promise<ApiResponse> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = async e => {
      const b = (e.target?.result as string)?.split(",")[1];
      if (!b) return reject(new Error("Gagal baca file"));
      try { resolve(await postData("",{fileName:file.name,fileType:file.type,fileData:b,idAnggota,folderType:folder==="profil"?"profil":"bukti"})); }
      catch(er) { reject(er); }
    };
    r.onerror = () => reject(new Error("Gagal baca file"));
    r.readAsDataURL(file);
  });
}

// Telegram
export function uploadToTelegram(d: {fileData:string;fileName:string;fileType:string;caption?:string;idAnggota?:string;namaUpload?:string;roleUpload?:string;albumId?:string;judul?:string;kategori?:string;kategoriAkses?:string}) { return postData("telegramUpload",d,{timeoutMs:30000}); }
export function getTelegramUrl(fileId:string) { return getData("telegramGetUrl",{fileId}); }
export function broadcastTelegram(text:string) { return postData("telegramBroadcast",{text}); }

// AI Chat
export function chatAI(msg: string, history: { role: string; text: string }[] = []) { return postData("chat", { message: msg, history }, { timeoutMs: 30000 }); }

// Auth
export function verifyID(idAnggota:string) { return postData("verifikasiID",{idAnggota}); }
export function verifyPin(pin:string, tipe="pengurus", idAnggota="") { return postData("verifikasiPin",{pin,tipe,idAnggota}); }

export function setScriptUrl(url:string) { try { localStorage.setItem("apps_script_url",url); } catch {} }
export function getStoredScriptUrl() { return getScriptUrl(); }
