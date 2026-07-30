// ============================================================
// DATASTORE HYBRID — Google Sheets Primary + localStorage Cache
// v1.1 — Fixed: refreshSingleSheet now merges instead of replacing
// ============================================================

import { AppData, loadAppData, saveAppData } from "./dataStore";
import * as sheets from "./sheetsClient";
import type { DbResponse } from "./sheetsClient";

// ── Types ─────────────────────────────────────────────────
type SyncStatus = "idle" | "syncing" | "error" | "offline";
type SyncCallback = (status: SyncStatus, message?: string) => void;

interface SyncResult {
  success    : boolean;
  syncedTo   : "sheets" | "local" | "none";
  lastSync   : string;
  totalRows  : number;
  error     ?: string;
}

function safeArray(val: any): any[] {
  if (Array.isArray(val)) return val;
  return [];
}

let syncCallbacks: SyncCallback[] = [];
let currentStatus: SyncStatus = "idle";
let lastSyncTime: Date | null = null;

export function onSyncChange(cb: SyncCallback) {
  syncCallbacks.push(cb);
  cb(currentStatus);
  return () => { syncCallbacks = syncCallbacks.filter(c => c !== cb); };
}

function notify(status: SyncStatus, message?: string) {
  currentStatus = status;
  if (status === "idle") lastSyncTime = new Date();
  syncCallbacks.forEach(cb => cb(status, message));
}

function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

export async function loadFromSheets(): Promise<AppData | null> {
  if (!isOnline()) {
    notify("offline", "Tidak ada koneksi internet");
    return null;
  }

  notify("syncing", "Memuat data dari sumber backend...");

  const SUPABASE_URL = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_URL : undefined;
  const SUPABASE_KEY = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_ANON_KEY : undefined;

  async function readFromSupabase(table: string) {
    if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase not configured');
    const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}?select=*`;
    const r = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
    if (!r.ok) throw new Error(`Supabase ${table} HTTP ${r.status}`);
    const json = await r.json();
    return { data: json } as DbResponse;
  }

  try {
    let anggota: DbResponse, agenda: DbResponse, pengumuman: DbResponse, kas: DbResponse, aspirasi: DbResponse, galeri: DbResponse;

    if (SUPABASE_URL && SUPABASE_KEY) {
      // Prefer Supabase if configured
      [anggota, agenda, pengumuman, kas, aspirasi, galeri] = await Promise.all([
        readFromSupabase('anggota'),
        readFromSupabase('agenda'),
        readFromSupabase('pengumuman'),
        readFromSupabase('kas'),
        readFromSupabase('aspirasi'),
        readFromSupabase('galeri'),
      ]);
    } else {
      [anggota, agenda, pengumuman, kas, aspirasi, galeri] = await Promise.all([
        sheets.readSheet('anggota'),
        sheets.readSheet('agenda'),
        sheets.readSheet('pengumuman'),
        sheets.readSheet('kas'),
        sheets.readSheet('aspirasi'),
        sheets.readSheet('galeri'),
      ]);
    }

    const existingData = loadAppData();
    const appData: AppData = {
      ...existingData,
      Anggota: (() => {
        const anggotaSheets = safeArray(anggota.data);
        if (anggotaSheets.length > 0) {
          const localAnggota = existingData.Anggota || [];
          const sheetsIds = new Set(anggotaSheets.map((s: any) => s.ID));
          return [...anggotaSheets, ...localAnggota.filter((l: any) => !sheetsIds.has(l.ID))];
        }
        return existingData.Anggota || [];
      })(),
      Agenda      : safeArray(agenda.data),
      Pengumuman  : safeArray(pengumuman.data),
      Kas         : safeArray(kas.data),
      Aspirasi    : safeArray(aspirasi.data),
      Galeri: (() => {
        const galeriSheets = safeArray(galeri.data);
        if (galeriSheets.length > 0) {
          const localGaleri = existingData.Galeri || [];
          const sheetsIds = new Set(galeriSheets.map((s: any) => s.ID));
          return [...galeriSheets, ...localGaleri.filter((l: any) => !sheetsIds.has(l.ID))];
        }
        return existingData.Galeri || [];
      })(),
    };

    saveAppData(appData);
    notify("idle", `Data dimuat: ${appData.Anggota.length} anggota, ${appData.Kas.length} kas, ${appData.Agenda.length} agenda`);
    return appData;

  } catch (err: any) {
    notify("error", `Gagal memuat dari backend: ${err.message}`);
    console.error("[SheetsDB] Load error:", err);
    return null;
  }
}

export async function refreshSingleSheet(table: string): Promise<Partial<AppData> | null> {
  if (!isOnline()) return null;

  // Hotfix: if galeri lightbox is open in the UI, skip the automatic single-sheet refresh
  try {
    if (typeof window !== "undefined" && (window as any).__galeri_lightbox_open) {
      // eslint-disable-next-line no-console
      console.debug(`[SheetsDB] Skipping refreshSingleSheet(${table}) because galeri lightbox is open`);
      return null;
    }
  } catch (err) {
    // ignore
  }

  const SUPABASE_URL = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_URL : undefined;
  const SUPABASE_KEY = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_ANON_KEY : undefined;

  try {
    let result: DbResponse;
    if (SUPABASE_URL && SUPABASE_KEY) {
      const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}?select=*`;
      const resp = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
      if (!resp.ok) throw new Error(`Supabase ${table} HTTP ${resp.status}`);
      const json = await resp.json();
      result = { data: json } as DbResponse;
    } else {
      result = await (sheets as any).readSheet(table);
    }

    const rawData = safeArray(result.data);

    const keyMap: Record<string, keyof AppData> = {
      anggota: "Anggota", agenda: "Agenda", pengumuman: "Pengumuman",
      kas: "Kas", aspirasi: "Aspirasi", galeri: "Galeri"
    };

    const appKey = keyMap[table];
    if (!appKey) return null;

    // Merge: Sheets/Supabase + localStorage — jangan hapus data lokal kalau remote kosong
    const existing = loadAppData();
    const existingData = (existing as any)[appKey] || [];
    if (rawData.length === 0) {
      // Remote kosong → pertahankan data lokal
      return { [appKey]: existingData } as Partial<AppData>;
    }
    // Merge: remote priority, local sebagai pelengkap (hindari duplikat ID)
    const sheetsIds2 = new Set(rawData.map((item: any) => item.ID || item.ID_Foto || ""));
    const merged = [...rawData, ...existingData.filter((item: any) => !sheetsIds2.has(item.ID || item.ID_Foto || ""))];
    const updated = { ...existing, [appKey]: merged };
    saveAppData(updated);
    return { [appKey]: merged } as Partial<AppData>;
  } catch (err: any) {
    console.error("[SheetsDB] Refresh single sheet error:", table, err);
    return null;
  }
}

export async function saveToSheets(appData: AppData): Promise<SyncResult> {
  if (!isOnline()) {
    notify("offline", "Offline — data hanya disimpan lokal");
    return { success: false, syncedTo: "local", lastSync: new Date().toISOString(), totalRows: 0, error: "Offline" };
  }

  notify("syncing", "Menyimpan ke Google Sheets...");

  const results: { table: string; rows: number; error?: string }[] = [];

  const syncTable = async (table: string, data: any[]) => {
    if (!Array.isArray(data)) return;
    try {
      const result = await sheets.syncSheet(table, data);
      if (result.error) throw new Error(result.error);
      results.push({ table, rows: result.row || data.length });
    } catch (err: any) {
      results.push({ table, rows: 0, error: err.message });
    }
  };

  try {
    await Promise.all([
      syncTable("anggota",    appData.Anggota || []),
      syncTable("agenda",     appData.Agenda || []),
      syncTable("pengumuman", appData.Pengumuman || []),
      syncTable("kas",        appData.Kas || []),
      syncTable("aspirasi",   appData.Aspirasi || []),
      syncTable("galeri",     appData.Galeri || []),
    ]);

    const totalRows = results.reduce((s, r) => s + r.rows, 0);
    const errors = results.filter(r => r.error);

    if (errors.length > 0) {
      notify("error", `${errors.length} tabel gagal disinkron`);
      return {
        success: false, syncedTo: "sheets", lastSync: new Date().toISOString(),
        totalRows, error: errors.map(e => `${e.table}: ${e.error}`).join("; "),
      };
    }

    notify("idle", `Tersimpan: ${totalRows} baris ke Google Sheets`);
    return { success: true, syncedTo: "sheets", lastSync: new Date().toISOString(), totalRows };

  } catch (err: any) {
    notify("error", `Sync gagal: ${err.message}`);
    console.error("[SheetsDB] Save error:", err);
    return {
      success: false, syncedTo: "local", lastSync: new Date().toISOString(),
      totalRows: 0, error: err.message,
    };
  }
}

export async function initializeData(): Promise<AppData> {
  try {
    const sheetsData = await loadFromSheets();
    if (sheetsData) return sheetsData;
  } catch (err) {
    console.error("[SheetsDB] initializeData error:", err);
  }

  try {
    const localData = loadAppData();
    if (localData && localData.Anggota) {
      notify("idle", "Menggunakan data lokal (Google Sheets tidak tersedia)");
      return localData;
    }
  } catch (err) {
    console.error("[SheetsDB] localStorage fallback error:", err);
  }

  notify("error", "Tidak ada data tersedia — menggunakan data kosong");
  return loadAppData();
}

export async function syncSingleTable(
  table: keyof typeof sheets.SHEET_NAMES | string,
  data : any[]
): Promise<void> {
  try {
    await sheets.syncSheet(table, data);
  } catch (err: any) {
    console.error(`[SheetsDB] Sync ${table} gagal:`, err);
  }
}

export function getSyncStatus(): SyncStatus { return currentStatus; }
export function getLastSyncTime(): Date | null { return lastSyncTime; }

export type { SyncStatus, SyncResult, SyncCallback };
