import React, { useEffect, useRef } from 'react';
import { LogOut, AlertTriangle } from 'lucide-react';
import { AuthSession } from '../types';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  session: AuthSession;
  isLoggingOut: boolean;
}

export default function LogoutModal({ isOpen, onClose, onConfirm, session, isLoggingOut }: LogoutModalProps) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Close modal with Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoggingOut) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoggingOut, onClose]);

  // Auto-focus cancel button when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => cancelBtnRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Calculate session duration
  const getSessionDuration = () => {
    if (!session.timestamp) return "Tidak diketahui";
    const diffMs = Date.now() - session.timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Baru saja";
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam ${diffMins % 60} menit lalu`;
    return `${diffDays} hari lalu`;
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
    >
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
        onClick={!isLoggingOut ? onClose : undefined} 
        aria-hidden="true"
      />
      
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500">
            <AlertTriangle size={32} />
          </div>
          
          <h2 id="logout-modal-title" className="text-xl font-black text-slate-800 dark:text-slate-200 mb-2">
            Keluar Akun?
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Anda akan keluar dari sesi saat ini dan harus login kembali untuk mengakses akun.
          </p>
          
          <div className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 mb-6 border border-slate-100 dark:border-slate-800 text-left">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Login sebagai:</p>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-lg shrink-0">
                {session.nama_lengkap?.[0]?.toUpperCase() || session.id_anggota?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{session.nama_lengkap || "Pengguna"}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[10px] font-mono bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                    {session.id_anggota || "TAMU"}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">
                    {session.role}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-3 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
              <span>Login sejak: <span className="font-semibold text-slate-700 dark:text-slate-300">{getSessionDuration()}</span></span>
            </div>
          </div>
          
          <div className="flex w-full gap-3">
            <button
              ref={cancelBtnRef}
              type="button"
              onClick={onClose}
              disabled={isLoggingOut}
              className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoggingOut}
              className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingOut ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Sedang keluar...</span>
                </>
              ) : (
                <>
                  <LogOut size={16} />
                  <span>Ya, Keluar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
