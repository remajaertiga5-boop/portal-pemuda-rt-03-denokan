// ============================================================
// useConfirm — Standardisasi dialog konfirmasi CRUD
// ============================================================

import { useState, useCallback } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import React from "react";

// ── Types ─────────────────────────────────────────────────
interface ConfirmOptions {
  title      : string;
  message    : string;
  confirmText?: string;
  cancelText ?: string;
  variant    ?: "danger" | "warning" | "info";
  icon       ?: React.ReactNode;
}

interface ConfirmState {
  isOpen  : boolean;
  options : ConfirmOptions;
  resolve : ((value: boolean) => void) | null;
}

// ── Hook ───────────────────────────────────────────────────
export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    isOpen  : false,
    options : { title: "", message: "" },
    resolve : null,
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ isOpen: true, options, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState(prev => ({ ...prev, isOpen: false, resolve: null }));
  }, [state.resolve]);

  const handleCancel = useCallback(() => {
    state.resolve?.(false);
    setState(prev => ({ ...prev, isOpen: false, resolve: null }));
  }, [state.resolve]);

  // ── Quick confirm helpers ──────────────────────────────
  const confirmDelete = useCallback((itemName: string): Promise<boolean> => {
    return confirm({
      title   : "Hapus Data?",
      message : `Apakah Anda yakin ingin menghapus **"${itemName}"**?\n\nTindakan ini tidak dapat dibatalkan. Data yang dihapus mungkin masih bisa dipulihkan oleh Super Admin.`,
      confirmText: "Ya, Hapus",
      cancelText : "Batal",
      variant    : "danger",
      icon       : <Trash2 size={28} />,
    });
  }, [confirm]);

  const confirmCancel = useCallback((itemName?: string): Promise<boolean> => {
    return confirm({
      title   : "Batalkan?",
      message : itemName
        ? `Batalkan perubahan pada **"${itemName}"**? Perubahan yang belum disimpan akan hilang.`
        : "Batalkan perubahan? Data yang belum disimpan akan hilang.",
      confirmText: "Ya, Batalkan",
      cancelText : "Lanjut Edit",
      variant    : "warning",
      icon       : <AlertTriangle size={28} />,
    });
  }, [confirm]);

  const confirmAction = useCallback((title: string, message: string): Promise<boolean> => {
    return confirm({
      title, message,
      confirmText: "Lanjutkan",
      cancelText: "Batal",
      variant: "info",
      icon: <AlertTriangle size={28} />,
    });
  }, [confirm]);

  // ── Modal Component ─────────────────────────────────────
  const ConfirmModal = state.isOpen ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className={`p-5 text-center ${
          state.options.variant === "danger" ? "bg-rose-50 dark:bg-rose-950/20" :
          state.options.variant === "warning" ? "bg-amber-50 dark:bg-amber-950/20" :
          "bg-blue-50 dark:bg-blue-950/20"
        }`}>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 ${
            state.options.variant === "danger" ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600" :
            state.options.variant === "warning" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600" :
            "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
          }`}>
            {state.options.icon || <AlertTriangle size={28} />}
          </div>
          <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg">
            {state.options.title}
          </h3>
        </div>

        {/* Body */}
        <div className="p-5">
          <p className="text-sm text-slate-600 dark:text-slate-400 text-center leading-relaxed whitespace-pre-line">
            {state.options.message}
          </p>
        </div>

        {/* Buttons */}
        <div className="p-4 pt-0 flex gap-3">
          <button onClick={handleCancel}
            className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-colors">
            {state.options.cancelText || "Batal"}
          </button>
          <button onClick={handleConfirm}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
              state.options.variant === "danger"
                ? "bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-200"
                : state.options.variant === "warning"
                ? "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-200"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200"
            }`}>
            {state.options.confirmText || "OK"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return {
    confirm,
    confirmDelete,
    confirmCancel,
    confirmAction,
    ConfirmModal,
  };
}

export default useConfirm;
