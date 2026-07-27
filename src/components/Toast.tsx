import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

export interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove?: (id: string) => void;
  removeToast?: (id: string) => void;
}

export default function ToastContainer({ toasts, onRemove, removeToast }: ToastContainerProps) {
  const handleRemove = (id: string) => {
    if (onRemove) onRemove(id);
    if (removeToast) removeToast(id);
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={handleRemove} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: ToastMessage;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const bgStyles = {
    success: "bg-emerald-800 text-white border-emerald-700 shadow-emerald-950/20",
    error: "bg-rose-800 text-white border-rose-700 shadow-rose-950/20",
    info: "bg-blue-800 text-white border-blue-700 shadow-blue-950/20",
    warning: "bg-amber-800 text-white border-amber-700 shadow-amber-950/20",
  }[toast.type];

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-300 shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-300 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0" />,
  }[toast.type];

  return (
    <div
      className={`pointer-events-auto p-4 rounded-2xl border shadow-lg dark:shadow-none flex items-center justify-between gap-3 text-sm font-medium transition-all duration-300 animate-in slide-in-from-top-2 ${bgStyles}`}
    >
      <div className="flex items-center gap-3">
        {icons}
        <span>{toast.message}</span>
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="p-1 rounded-lg hover:bg-white/20 transition-colors shrink-0"
      >
        <X className="w-4 h-4 text-white/80" />
      </button>
    </div>
  );
};
