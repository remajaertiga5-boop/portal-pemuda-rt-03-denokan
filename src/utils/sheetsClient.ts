// ============================================================
// SHEETS CLIENT — Google Sheets Database via Vercel API Proxy
// v1.0 — Full CRUD: read, create, update, delete, upsert, sync
// ============================================================

import { apiRequest } from "./apiClient";

// ── Types ─────────────────────────────────────────────────
interface DbResponse<T = any> {
  success ?: boolean;
  data    ?: T[];
  error   ?: string;
  total   ?: number;
  row     ?: number;
}

interface CrudPayload {
  table   : string;
  action  : "create" | "update" | "delete" | "upsert";
  idColumn?: string;
  id      ?: string;
  data    ?: Record<string, any>;
}

// ── Config ────────────────────────────────────────────────
const SHEET_NAMES: Record<string, string> = {
  anggota    : "Anggota",
  agenda     : "Agenda",
  pengumuman : "Pengumuman",
  kas        : "Kas",
  aspirasi   : "Aspirasi",
  galeri     : "Galeri",
};

// ── Read all rows from a sheet ────────────────────────────
export async function readSheet<T = any>(table: string): Promise<DbResponse<T>> {
  const sheetName = SHEET_NAMES[table] || table;
  const result = await apiRequest(`/sheets-db?table=${encodeURIComponent(sheetName)}`, {
    method: "GET",
  });
  return result as unknown as DbResponse<T>;
}

// ── Read single row by ID ─────────────────────────────────
export async function readRow<T = any>(
  table: string,
  id: string,
  idColumn = "ID"
): Promise<DbResponse<T>> {
  const sheetName = SHEET_NAMES[table] || table;
  const params = `table=${encodeURIComponent(sheetName)}&id=${encodeURIComponent(id)}&idColumn=${encodeURIComponent(idColumn)}`;
  const result = await apiRequest(`/sheets-db?${params}`, { method: "GET" });
  return result as unknown as DbResponse<T>;
}

// ── Create a new row ──────────────────────────────────────
export async function createRow(
  table   : string,
  data    : Record<string, any>,
  idColumn = "ID"
): Promise<DbResponse> {
  const sheetName = SHEET_NAMES[table] || table;
  return apiRequest("/sheets-db", {
    method: "POST",
    body  : JSON.stringify({
      table, action: "create", idColumn, data,
    }),
  }) as unknown as DbResponse;
}

// ── Update a row ──────────────────────────────────────────
export async function updateRow(
  table   : string,
  id      : string,
  data    : Record<string, any>,
  idColumn = "ID"
): Promise<DbResponse> {
  const sheetName = SHEET_NAMES[table] || table;
  return apiRequest("/sheets-db", {
    method: "POST",
    body  : JSON.stringify({
      table, action: "update", idColumn, id, data,
    }),
  }) as unknown as DbResponse;
}

// ── Delete a row ──────────────────────────────────────────
export async function deleteRow(
  table   : string,
  id      : string,
  idColumn = "ID"
): Promise<DbResponse> {
  const sheetName = SHEET_NAMES[table] || table;
  return apiRequest("/sheets-db", {
    method: "POST",
    body  : JSON.stringify({
      table, action: "delete", idColumn, id,
    }),
  }) as unknown as DbResponse;
}

// ── Upsert (create or update) ─────────────────────────────
export async function upsertRow(
  table   : string,
  id      : string,
  data    : Record<string, any>,
  idColumn = "ID"
): Promise<DbResponse> {
  const sheetName = SHEET_NAMES[table] || table;
  return apiRequest("/sheets-db", {
    method: "POST",
    body  : JSON.stringify({
      table, action: "upsert", idColumn, id, data,
    }),
  }) as unknown as DbResponse;
}

// ── Bulk sync — replace all data in a sheet ───────────────
export async function syncSheet(
  table: string,
  data : Record<string, any>[]
): Promise<DbResponse> {
  const sheetName = SHEET_NAMES[table] || table;
  return apiRequest("/sheets-db", {
    method: "POST",
    body  : JSON.stringify({
      table, action: "sync", data,
    }),
  }) as unknown as DbResponse;
}

// ── Health check ──────────────────────────────────────────
export async function checkDbHealth(): Promise<boolean> {
  try {
    const result = await readSheet("anggota");
    return !result.error && (result.data !== undefined || result.total !== undefined);
  } catch {
    return false;
  }
}

export { SHEET_NAMES };
export type { DbResponse, CrudPayload };
export default {
  readSheet, readRow, createRow, updateRow, deleteRow, upsertRow, syncSheet, checkDbHealth,
};
