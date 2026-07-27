import React, { useState } from "react";
import { FileText, Search, ChevronDown, ChevronUp, Filter } from "lucide-react";
import { AppData } from "../utils/dataStore";

interface LogTabProps {
  appData       : AppData;
  search        : string;
  onSearchChange: (v: string) => void;
}

/** Tab Log Aktivitas — tabel log dengan filter & expand/collapse */
export default function LogTab({ appData, search, onSearchChange }: LogTabProps) {
  const [expanded, setExpanded] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>("SEMUA");

  const logs = appData.LogAkses || [];

  // Filter
  let filtered = logs.filter(l =>
    (l.Nama   || "").toLowerCase().includes(search.toLowerCase()) ||
    (l.Aksi   || "").toLowerCase().includes(search.toLowerCase()) ||
    (l.Detail || "").toLowerCase().includes(search.toLowerCase())
  );

  if (roleFilter !== "SEMUA") {
    filtered = filtered.filter(l => l.Role === roleFilter);
  }

  // Urutkan terbaru di atas
  const sorted = [...filtered].reverse();

  // Limit display unless expanded
  const displayed = expanded ? sorted : sorted.slice(0, 50);

  // Unique roles
  const roles = [...new Set(logs.map(l => l.Role))];

  const hasMore = sorted.length > 50;

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
          <FileText className="text-purple-600" size={20} /> Log Aktivitas Sistem
          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 rounded-full text-[11px] font-bold">
            {logs.length}
          </span>
        </h3>
        <div className="flex gap-2 w-full sm:w-auto">
          {/* Role filter */}
          <div className="relative">
            <Filter className="absolute left-2.5 top-2.5 text-slate-400" size={12} />
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
              className="pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-purple-600 appearance-none cursor-pointer min-w-[100px]">
              <option value="SEMUA">Semua Role</option>
              {roles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {/* Search */}
          <div className="relative w-full sm:w-48">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input type="text" value={search}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Cari log..." className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-600" />
          </div>
        </div>
      </div>

      {/* Quick stats */}
      {!search && roleFilter === "SEMUA" && (
        <div className="flex gap-3 flex-wrap text-[10px]">
          {roles.slice(0, 5).map(r => {
            const count = logs.filter(l => l.Role === r).length;
            return (
              <button key={r} onClick={() => setRoleFilter(r)}
                className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-purple-100 hover:text-purple-700 font-medium transition-colors">
                {r}: {count}
              </button>
            );
          })}
        </div>
      )}

      {/* Table */}
      {sorted.length === 0 ? (
        <div className="py-12 text-center text-slate-400">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Belum ada log aktivitas.</p>
          <p className="text-[11px] mt-1">Aktivitas Super Admin dan pengurus akan tercatat di sini.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto max-h-[450px] overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-800">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 uppercase font-bold text-[10px] sticky top-0 z-10">
                <tr>
                  <th className="p-3 w-[130px]">Waktu</th>
                  <th className="p-3 hidden sm:table-cell">Pengguna</th>
                  <th className="p-3 w-[90px]">Role</th>
                  <th className="p-3">Aksi</th>
                  <th className="p-3 hidden md:table-cell">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayed.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-mono text-[10px] text-slate-500 dark:text-slate-400">{l.Waktu}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-slate-100 hidden sm:table-cell">{l.Nama} <span className="font-normal text-slate-400">({l.ID_Anggota})</span></td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        l.Role === "SUPER_ADMIN" ? "bg-amber-100 text-amber-800" :
                        l.Role === "ADMIN" ? "bg-purple-100 text-purple-800" :
                        "bg-slate-100 text-slate-700"
                      }`}>{l.Role}</span>
                    </td>
                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{l.Aksi}</td>
                    <td className="p-3 text-slate-500 hidden md:table-cell text-[10px]">{l.Detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Expand/Collapse */}
          {hasMore && (
            <button onClick={() => setExpanded(!expanded)}
              className="w-full py-2.5 text-xs font-bold text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-xl flex items-center justify-center gap-1.5 transition-all">
              {expanded ? (
                <><ChevronUp size={14} /> Tampilkan Lebih Sedikit</>
              ) : (
                <><ChevronDown size={14} /> Tampilkan Semua ({sorted.length} entri)</>
              )}
            </button>
          )}

          {filtered.length !== sorted.length && (
            <p className="text-center text-[10px] text-slate-400">
              Menampilkan {displayed.length} dari {sorted.length} log {roleFilter !== "SEMUA" && `(filter: ${roleFilter})`}
            </p>
          )}
        </>
      )}
    </div>
  );
}
