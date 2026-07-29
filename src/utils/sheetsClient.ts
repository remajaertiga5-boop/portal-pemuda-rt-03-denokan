// ============================================================
// SHEETS CLIENT — Google Sheets via Apps Script
// v3.0 — Semua CRUD langsung ke Apps Script Web App
// ============================================================

import { fetchAPI } from "./api";

const SHEET_NAMES: Record<string, string> = {
  anggota: "Anggota", agenda: "Agenda", pengumuman: "Pengumuman",
  kas: "Kas", aspirasi: "Aspirasi", galeri: "Galeri",
};

interface DbResponse<T = any> {
  success?: boolean; data?: T[]; error?: string; total?: number; row?: number;
}

function resolveTable(table: string): string { return SHEET_NAMES[table.toLowerCase()] || table; }

export async function readSheet<T = any>(table: string): Promise<DbResponse<T>> {
  const tbl = resolveTable(table);
  try {
    const r = await fetchAPI({ action: "read", table: tbl, method: "GET" });
    const arr = Array.isArray(r.data) ? r.data : [];
    return { data: arr as T[], total: r.total ?? arr.length };
  } catch { return { data: [] as T[], total: 0 }; }
}

export async function readRow<T = any>(table: string, id: string, idColumn = "ID"): Promise<DbResponse<T>> {
  const tbl = resolveTable(table);
  const r = await fetchAPI({ action: "read", table: tbl, id, idColumn, method: "GET" });
  return r as unknown as DbResponse<T>;
}

export async function createRow(table: string, data: Record<string, any>, idColumn = "ID"): Promise<DbResponse> {
  return fetchAPI({ action: "create", table: resolveTable(table), idColumn, data, method: "POST" }) as unknown as DbResponse;
}

export async function updateRow(table: string, id: string, data: Record<string, any>, idColumn = "ID"): Promise<DbResponse> {
  return fetchAPI({ action: "update", table: resolveTable(table), idColumn, id, data, method: "POST" }) as unknown as DbResponse;
}

export async function deleteRow(table: string, id: string, idColumn = "ID"): Promise<DbResponse> {
  return fetchAPI({ action: "delete", table: resolveTable(table), idColumn, id, method: "POST" }) as unknown as DbResponse;
}

export async function upsertRow(table: string, id: string, data: Record<string, any>, idColumn = "ID"): Promise<DbResponse> {
  return fetchAPI({ action: "upsert", table: resolveTable(table), idColumn, id, data, method: "POST" }) as unknown as DbResponse;
}

export async function syncSheet(table: string, data: Record<string, any>[]): Promise<DbResponse> {
  return fetchAPI({ action: "sync", table: resolveTable(table), data, method: "POST" }) as unknown as DbResponse;
}

export async function checkDbHealth(): Promise<boolean> {
  try { const r = await readSheet("anggota"); return !r.error; } catch { return false; }
}

export { SHEET_NAMES };
export type { DbResponse };
export default { readSheet, readRow, createRow, updateRow, deleteRow, upsertRow, syncSheet, checkDbHealth };
