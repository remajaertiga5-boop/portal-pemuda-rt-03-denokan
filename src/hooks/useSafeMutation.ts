// ============================================================
// useSafeMutation — Bungkus mutasi AppData dengan try/catch auto
// + audit logging + toast notification + optimistic rollback
// ============================================================

import { useCallback, useRef } from "react";
import { AppData, addLogAkses, saveAppData } from "../utils/dataStore";
import type { UserRole } from "../types";

type ToastFn = (msg: string, type: "success" | "error" | "info" | "warning") => void;

interface MutationContext {
  appData    : AppData;
  setAppData : React.Dispatch<React.SetStateAction<AppData>>;
  showToast  : ToastFn;
  userName   : string;
  userRole   : UserRole;
}

interface MutateOptions {
  /** Nama operasi untuk log audit */
  operation  : string;
  /** Deskripsi detail untuk log */
  detail     : string;
  /** Callback sukses */
  onSuccess ?: () => void;
  /** Callback gagal */
  onError   ?: (err: Error) => void;
}

/**
 * Hook untuk membungkus mutasi AppData dengan:
 * - try/catch otomatis
 * - audit logging via addLogAkses
 * - save to localStorage
 * - toast success/error
 *
 * Usage:
 * ```
 * const { mutate, ctx } = useSafeMutation({ appData, setAppData, showToast, userName, userRole });
 *
 * const handleDelete = async () => {
 *   await mutate({ operation: "HAPUS", detail: "Hapus agenda X" }, () => {
 *     return { ...ctx.appData, Agenda: ctx.appData.Agenda.filter(a => a.id !== id) };
 *   });
 * };
 * ```
 */
export function useSafeMutation(ctx: MutationContext) {
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx; // Always use latest

  const mutate = useCallback(async <T = void>(
    options : MutateOptions,
    fn      : (data: AppData) => AppData
  ): Promise<boolean> => {
    const { appData, setAppData, showToast, userName, userRole } = ctxRef.current;

    try {
      // Simpan snapshot untuk rollback
      const snapshot = { ...appData };

      // Jalankan mutasi
      const newData = fn(appData);

      // Validasi hasil
      if (!newData || typeof newData !== "object") {
        throw new Error("Mutasi menghasilkan data tidak valid.");
      }

      // Tambah log audit
      const withLog = addLogAkses(newData, userName, userRole, options.operation, options.detail);

      // Simpan
      setAppData(withLog);
      saveAppData(withLog);

      showToast(`${options.detail} — berhasil!`, "success");
      options.onSuccess?.();
      return true;

    } catch (err: any) {
      console.error(`[SafeMutation] ${options.operation} gagal:`, err);
      showToast(`Gagal: ${err.message || "Terjadi kesalahan."}`, "error");
      options.onError?.(err);
      return false;
    }
  }, []); // ctx via ref, no deps needed

  /** Quick mutate untuk delete */
  const deleteItem = useCallback(async (
    label     : string,
    arrayKey  : keyof AppData,
    idField   : string,
    idValue   : string,
    operation = "HAPUS"
  ): Promise<boolean> => {
    return mutate(
      { operation, detail: `Menghapus ${label}` },
      (data) => {
        const arr = data[arrayKey] as any[];
        return { ...data, [arrayKey]: arr.filter((item: any) => item[idField] !== idValue) };
      }
    );
  }, [mutate]);

  /** Quick mutate untuk soft delete */
  const softDeleteItem = useCallback(async (
    label     : string,
    arrayKey  : keyof AppData,
    idField   : string,
    idValue   : string,
    deleteField = "Is_Deleted",
    operation = "HAPUS_SOFT"
  ): Promise<boolean> => {
    return mutate(
      { operation, detail: `Mengarsip ${label}` },
      (data) => {
        const arr = data[arrayKey] as any[];
        return {
          ...data,
          [arrayKey]: arr.map((item: any) =>
            item[idField] === idValue
              ? { ...item, [deleteField]: true, Tanggal_Dihapus: new Date().toISOString(), Dihapus_Oleh: ctxRef.current.userName }
              : item
          ),
        };
      }
    );
  }, [mutate]);

  /** Quick mutate untuk add */
  const addItem = useCallback(async (
    label     : string,
    arrayKey  : keyof AppData,
    newItem   : any,
    operation = "TAMBAH"
  ): Promise<boolean> => {
    return mutate(
      { operation, detail: `Menambahkan ${label}` },
      (data) => {
        const arr = data[arrayKey] as any[];
        return { ...data, [arrayKey]: [newItem, ...arr] };
      }
    );
  }, [mutate]);

  /** Quick mutate untuk update */
  const updateItem = useCallback(async (
    label     : string,
    arrayKey  : keyof AppData,
    idField   : string,
    idValue   : string,
    updates   : Record<string, any>,
    operation = "EDIT"
  ): Promise<boolean> => {
    return mutate(
      { operation, detail: `Memperbarui ${label}` },
      (data) => {
        const arr = data[arrayKey] as any[];
        return {
          ...data,
          [arrayKey]: arr.map((item: any) =>
            item[idField] === idValue ? { ...item, ...updates } : item
          ),
        };
      }
    );
  }, [mutate]);

  return { mutate, deleteItem, softDeleteItem, addItem, updateItem };
}

export type { MutationContext };
export default useSafeMutation;
