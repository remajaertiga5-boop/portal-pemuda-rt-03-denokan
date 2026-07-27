// ============================================================
// DATASTORE HYBRID — Google Sheets Primary + localStorage Cache
// v1.0 — Automatic sync, offline fallback, conflict resolution
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

// ── State ─────────────────────────────────────────────────

// ── Safe Array Helper ───────────────────────────────────
function safeArray(val: any): any[] {
  if (Array.isArray(val)) return val;
  return [];
}

let syncCallbacks: SyncCallback[] = [];
let currentStatus: SyncStatus = "idle";
let lastSyncTime: Date | null = null;

// ── Subscribe to sync events ──────────────────────────────
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

// ── Check if online ───────────────────────────────────────
function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

// ── Load all data from Google Sheets ──────────────────────
export async function loadFromSheets(): Promise<AppData | null> {
  if (!isOnline()) {
    notify("offline", "Tidak ada koneksi internet");
    return null;
  }

  notify("syncing", "Memuat data dari Google Sheets...");

  try {
    const [anggota, agenda, pengumuman, kas, aspirasi, galeri] = await Promise.all([
      sheets.readSheet("anggota"),
      sheets.readSheet("agenda"),
      sheets.readSheet("pengumuman"),
      sheets.readSheet("kas"),
      sheets.readSheet("aspirasi"),
      sheets.readSheet("galeri"),
    ]);

    // Build AppData — merge Sheets dengan localStorage
    // ...existingData preserve: Iuran, Voting, KonfigurasiAPI, Settings, etc.
    const existingData = loadAppData();
    const appData: AppData = {
      ...existingData,
      // Overwrite hanya 6 tabel dari Sheets:
      Anggota     : safeArray(anggota.data),
      Agenda      : safeArray(agenda.data),
      Pengumuman  : safeArray(pengumuman.data),
      Kas         : safeArray(kas.data),
      Aspirasi    : safeArray(aspirasi.data),
      Galeri      : safeArray(galeri.data),
    };

    // Cache ke localStorage
    saveAppData(appData);

    notify("idle", `Data dimuat: ${appData.Anggota.length} anggota, ${appData.Kas.length} kas, ${appData.Agenda.length} agenda`);
    return appData;

  } catch (err: any) {
    notify("error", `Gagal memuat dari Sheets: ${err.message}`);
    console.error("[SheetsDB] Load error:", err);
    return null;
  }
}

// ── Save all data to Google Sheets ────────────────────────
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

// ── Initial load — Sheets first, fallback to localStorage ──
export async function initializeData(): Promise<AppData> {
  try {
    // 1. Coba dari Sheets
    const sheetsData = await loadFromSheets();
    if (sheetsData) return sheetsData;
  } catch (err) {
    console.error("[SheetsDB] initializeData error:", err);
  }

  // 2. Fallback ke localStorage
  try {
    const localData = loadAppData();
    if (localData && localData.Anggota) {
      notify("idle", "Menggunakan data lokal (Google Sheets tidak tersedia)");
      return localData;
    }
  } catch (err) {
    console.error("[SheetsDB] localStorage fallback error:", err);
  }

  // 3. Last resort — empty safe data
  notify("error", "Tidak ada data tersedia — menggunakan data kosong");
  return loadAppData(); // returns default empty
}

// ── Quick sync single table ───────────────────────────────
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

// ── Status ────────────────────────────────────────────────
export function getSyncStatus(): SyncStatus { return currentStatus; }
export function getLastSyncTime(): Date | null { return lastSyncTime; }

export type { SyncStatus, SyncResult, SyncCallback };
