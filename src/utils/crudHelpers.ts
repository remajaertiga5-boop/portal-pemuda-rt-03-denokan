// ============================================================
// CRUD HELPERS — Standardisasi operasi Create/Update/Delete
// Dengan: try/catch, audit log, toast, rollback support
// ============================================================

import { AppData, addLogAkses, saveAppData } from "./dataStore";
import type { UserRole } from "../types";

// ── Types ─────────────────────────────────────────────────
type ToastFn = (msg: string, type: "success" | "error" | "info" | "warning") => void;
type SetAppDataFn = React.Dispatch<React.SetStateAction<AppData>>;

interface CrudContext {
  appData    : AppData;
  setAppData : SetAppDataFn;
  showToast  : ToastFn;
  userName   : string;
  userRole   : UserRole;
}

interface CrudResult<T = any> {
  success  : boolean;
  data    ?: T;
  error   ?: string;
  rolledBack?: boolean;
}

// ── Safe wrapper with try/catch ───────────────────────────
export function safeCrud<T>(
  ctx       : CrudContext,
  operation : string,
  detail    : string,
  fn        : (data: AppData) => AppData,
  options  ?: { confirmMsg?: string; onSuccess?: (result: T) => void }
): CrudResult<T> {
  try {
    const oldData = ctx.appData;

    // Jalankan mutasi
    const newData = fn(oldData);

    // Validasi data tidak rusak
    if (!newData || typeof newData !== "object") {
      throw new Error("Mutasi menghasilkan data tidak valid.");
    }

    // Tambah log audit
    const withLog = addLogAkses(newData, ctx.userName, ctx.userRole, operation, detail);

    // Simpan
    ctx.setAppData(withLog);
    saveAppData(withLog);

    ctx.showToast(`${detail} — berhasil!`, "success");

    return { success: true };

  } catch (err: any) {
    console.error(`[CRUD] ${operation} gagal:`, err);
    ctx.showToast(
      `Gagal: ${err.message || "Terjadi kesalahan saat menyimpan data."}`,
      "error"
    );
    return { success: false, error: err.message };
  }
}

// ── Generic Add ───────────────────────────────────────────
export function addItem<T extends Record<string, any>>(
  ctx       : CrudContext,
  arrayKey  : keyof AppData,
  newItem   : T,
  label     : string,
  operation : string,
): CrudResult<T> {
  return safeCrud(ctx, operation, label, (data) => {
    const arr = (data[arrayKey] as T[]) || [];
    return { ...data, [arrayKey]: [newItem, ...arr] } as AppData;
  });
}

// ── Generic Update ────────────────────────────────────────
export function updateItem<T extends Record<string, any>>(
  ctx       : CrudContext,
  arrayKey  : keyof AppData,
  idField   : string,
  idValue   : string,
  updates   : Partial<T>,
  label     : string,
  operation : string,
): CrudResult<T> {
  return safeCrud(ctx, operation, label, (data) => {
    const arr = (data[arrayKey] as T[]) || [];
    const updated = arr.map(item =>
      (item as any)[idField] === idValue ? { ...item, ...updates } : item
    );
    return { ...data, [arrayKey]: updated } as AppData;
  });
}

// ── Generic Delete ────────────────────────────────────────
export function deleteItem<T extends Record<string, any>>(
  ctx       : CrudContext,
  arrayKey  : keyof AppData,
  idField   : string,
  idValue   : string,
  label     : string,
  operation : string,
): CrudResult<T> {
  return safeCrud(ctx, operation, label, (data) => {
    const arr = (data[arrayKey] as T[]) || [];
    const filtered = arr.filter(item => (item as any)[idField] !== idValue);
    return { ...data, [arrayKey]: filtered } as AppData;
  });
}

// ── Generic Soft Delete (tandai sebagai dihapus) ──────────
export function softDeleteItem<T extends Record<string, any>>(
  ctx       : CrudContext,
  arrayKey  : keyof AppData,
  idField   : string,
  idValue   : string,
  label     : string,
  operation : string,
  deleteField = "Is_Deleted",
): CrudResult<T> {
  return safeCrud(ctx, operation, label, (data) => {
    const arr = (data[arrayKey] as T[]) || [];
    const updated = arr.map(item =>
      (item as any)[idField] === idValue
        ? { ...item, [deleteField]: true, Tanggal_Dihapus: new Date().toISOString(), Dihapus_Oleh: ctx.userName }
        : item
    );
    return { ...data, [arrayKey]: updated } as AppData;
  });
}

// ── Batch Update ──────────────────────────────────────────
export function batchUpdateItems<T extends Record<string, any>>(
  ctx       : CrudContext,
  arrayKey  : keyof AppData,
  idField   : string,
  idValues  : string[],
  updates   : Partial<T>,
  label     : string,
  operation : string,
): CrudResult<T> {
  const idSet = new Set(idValues);
  return safeCrud(ctx, operation, label, (data) => {
    const arr = (data[arrayKey] as T[]) || [];
    const updated = arr.map(item =>
      idSet.has((item as any)[idField]) ? { ...item, ...updates } : item
    );
    return { ...data, [arrayKey]: updated } as AppData;
  });
}

// ── Generic Settings Update ───────────────────────────────
export function updateSettings(
  ctx       : CrudContext,
  updates   : Partial<AppData["Settings"]>,
  label     : string,
  operation = "UBAH_SETTINGS",
): CrudResult {
  return safeCrud(ctx, operation, label, (data) => ({
    ...data,
    Settings: { ...data.Settings, ...updates },
  }));
}

// ── Build CrudContext from common props ───────────────────
export function buildCrudContext(
  appData    : AppData,
  setAppData : SetAppDataFn,
  showToast  : ToastFn,
  userName   : string,
  userRole   : UserRole,
): CrudContext {
  return { appData, setAppData, showToast, userName, userRole };
}

export type { CrudContext, CrudResult, ToastFn, SetAppDataFn };
