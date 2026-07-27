import React, { useState } from "react";
import { X, ShieldCheck, Search, Filter, Lock, CheckCircle2, Eye, User, Ban } from "lucide-react";
import { UserRole } from "../types";
import { MODULE_PERMISSIONS_MATRIX, PermissionLevel } from "../utils/permissionMatrix";

interface MatriksHakAksesModalProps {
  onClose: () => void;
  currentUserRole?: UserRole;
}

const ROLE_DISPLAY_NAMES: { role: UserRole; label: string }[] = [
  { role: "SUPER_ADMIN", label: "Super Admin" },
  { role: "KETUA", label: "Ketua" },
  { role: "WAKIL_KETUA", label: "Wakil Ketua" },
  { role: "SEKRETARIS", label: "Sekretaris" },
  { role: "WAKIL_SEKRETARIS", label: "Wakil Sekretaris" },
  { role: "BENDAHARA", label: "Bendahara" },
  { role: "WAKIL_BENDAHARA", label: "Wakil Bendahara" },
  { role: "KEPALA_HUMAS", label: "Kepala Humas" },
  { role: "HUMAS", label: "Humas" },
  { role: "ANGGOTA", label: "Anggota" },
  { role: "TAMU", label: "Tamu" },
];

export default function MatriksHakAksesModal({ onClose, currentUserRole }: MatriksHakAksesModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<UserRole | "ALL">("ALL");

  const filteredMatrix = MODULE_PERMISSIONS_MATRIX.filter((item) => {
    const matchesSearch =
      item.modulName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.kategori.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedRoleFilter === "ALL") return matchesSearch;

    const rolePerm = item.permissions[selectedRoleFilter];
    return matchesSearch && rolePerm && rolePerm.level !== "NONE";
  });

  const renderBadge = (level: PermissionLevel, note?: string) => {
    switch (level) {
      case "FULL":
        return (
          <span className="inline-flex flex-col items-center justify-center p-1 px-2 rounded-lg bg-emerald-950/80 border border-emerald-700 text-emerald-300 font-bold text-[11px] shadow-sm">
            <span className="flex items-center gap-1">
              <CheckCircle2 size={12} className="text-emerald-400" /> ✅ FULL
            </span>
            {note && <span className="text-[9px] text-emerald-200/80 font-normal">({note})</span>}
          </span>
        );
      case "VIEW":
        return (
          <span className="inline-flex flex-col items-center justify-center p-1 px-2 rounded-lg bg-sky-950/80 border border-sky-700 text-sky-300 font-bold text-[11px] shadow-sm">
            <span className="flex items-center gap-1">
              <Eye size={12} className="text-sky-400" /> 👁️ VIEW
            </span>
            {note && <span className="text-[9px] text-sky-200/80 font-normal">({note})</span>}
          </span>
        );
      case "LIMITED":
        return (
          <span className="inline-flex flex-col items-center justify-center p-1 px-2 rounded-lg bg-amber-950/80 border border-amber-700 text-amber-300 font-bold text-[11px] shadow-sm">
            <span className="flex items-center gap-1">
              <User size={12} className="text-amber-400" /> 🔸 Saja
            </span>
            {note && <span className="text-[9px] text-amber-200/80 font-normal">({note})</span>}
          </span>
        );
      case "NONE":
      default:
        return (
          <span className="inline-flex items-center justify-center p-1 px-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-500 font-bold text-[11px]">
            <Ban size={12} className="text-slate-600 mr-1" /> ❌ NONE
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-amber-500/30 rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl text-white overflow-hidden">
        
        {/* Header Modal */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-400/10 border border-amber-400/30 text-amber-400 rounded-2xl">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
                Matriks Hak Akses Lengkap (Bagian I)
              </h3>
              <p className="text-xs text-slate-400">
                Peta wewenang operasional per Modul × Per Struktur Role Jabatan (Pandawa Ertiga)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Legend & Filter Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/90 space-y-3 shrink-0">
          {/* Legenda Keterangan Badge */}
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap text-xs text-slate-300 bg-slate-950 p-2.5 px-4 rounded-2xl border border-slate-800">
            <span className="font-bold text-amber-400 uppercase text-[10px]">Legenda Hak Akses:</span>
            <span className="flex items-center gap-1 font-semibold text-emerald-300">
              ✅ Akses Penuh (CRUD)
            </span>
            <span className="flex items-center gap-1 font-semibold text-sky-300">
              👁️ Lihat Saja (Read-Only)
            </span>
            <span className="flex items-center gap-1 font-semibold text-amber-300">
              🔸 Terbatas (Hanya Data Sendiri)
            </span>
            <span className="flex items-center gap-1 font-semibold text-slate-500">
              ❌ Tidak Bisa Akses
            </span>
          </div>

          {/* Search & Role Tab Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Cari modul atau kategori..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-amber-400 shrink-0" />
              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value as any)}
                className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-amber-300 outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="ALL">Semua Role (11 Jabatan)</option>
                {ROLE_DISPLAY_NAMES.map((r) => (
                  <option key={r.role} value={r.role}>
                    Role: {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tabel Matriks Responsive */}
        <div className="p-4 overflow-auto flex-1 space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-amber-400 uppercase text-[10px] font-black sticky top-0 z-10">
                  <th className="p-3.5 min-w-[180px] bg-slate-900">Modul Aplikasi</th>
                  {ROLE_DISPLAY_NAMES.map((r) => (
                    <th
                      key={r.role}
                      className={`p-3 text-center min-w-[110px] ${
                        currentUserRole === r.role ? "bg-amber-950/60 text-amber-300 border-x border-amber-500/30" : ""
                      }`}
                    >
                      {r.label}
                      {currentUserRole === r.role && (
                        <span className="block text-[8px] text-amber-400 font-mono normal-case">(Anda)</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredMatrix.map((row) => (
                  <tr key={row.modulKey} className="hover:bg-slate-900/60 transition-colors">
                    <td className="p-3.5 font-bold text-white bg-slate-950">
                      <div>{row.modulName}</div>
                      <span className="text-[9.5px] font-mono text-slate-500 font-normal">
                        Kategori: {row.kategori}
                      </span>
                    </td>

                    {ROLE_DISPLAY_NAMES.map((r) => {
                      const perm = row.permissions[r.role];
                      const isCurrent = currentUserRole === r.role;
                      return (
                        <td
                          key={r.role}
                          className={`p-2.5 text-center align-middle ${
                            isCurrent ? "bg-amber-950/20 border-x border-amber-500/20" : ""
                          }`}
                        >
                          {perm ? renderBadge(perm.level, perm.note) : renderBadge("NONE")}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <Lock size={14} className="text-amber-400" />
            <span>Akses Super Admin memiliki wewenang overriding penuh untuk audit & pemulihan data.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer shadow-md"
          >
            Tutup Matriks
          </button>
        </div>
      </div>
    </div>
  );
}
