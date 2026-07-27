import React, { useState, useRef, useEffect } from "react";
import { Send, User, Bot, Loader2, Sparkles, Wifi, WifiOff } from "lucide-react";
import { loadAppData, saveAppData, AppData } from "../utils/dataStore";
import { ambilKonfigAPIByKategori, ambilKonfigAPIByNama } from "../utils/apiConfigHelper";
import { chatAI } from "../utils/apiClient";

// ----------------------------------------------------------
// TYPES
// ----------------------------------------------------------
interface ChatMessage {
  id    : string;
  role  : "user" | "model";
  text  : string;
}

// ----------------------------------------------------------
// KONSTANTA
// ----------------------------------------------------------
const INITIAL_MESSAGE: ChatMessage = {
  id  : "init-0",
  role: "model",
  text: "Halo! 👋 Saya asisten AI untuk Remaja RT 03 RW 04 Denokan. Silakan tanya tentang kegiatan, data anggota, keuangan, atau minta ide program pemuda!",
};

const MAX_HISTORY = 10;

// ----------------------------------------------------------
// LOKAL FALLBACK — Cerdas tanpa API
// ----------------------------------------------------------
function generateLocalResponse(message: string, appData: AppData | null, role: string): string {
  const msg = message.toLowerCase();
  const anggota = appData?.Anggota || [];
  const agenda = appData?.Agenda || [];
  const kas = appData?.Kas || [];
  const pengumuman = appData?.Pengumuman || [];
  const iuran = appData?.Iuran || [];
  const voting = appData?.Voting || [];

  const totalAnggota = anggota.filter((a: any) => a.Status_Tampil !== "ARSIP").length;
  const totalPemasukan = kas.filter((k: any) => k.Jenis === "Pemasukan").reduce((s: number, k: any) => s + (Number(k.Nominal) || Number(k.Pemasukan) || 0), 0);
  const totalPengeluaran = kas.filter((k: any) => k.Jenis === "Pengeluaran").reduce((s: number, k: any) => s + (Number(k.Nominal) || Number(k.Pengeluaran) || 0), 0);
  const saldo = totalPemasukan - totalPengeluaran;
  const agendaMendatang = agenda.filter((a: any) => a.Tanggal >= new Date().toISOString().split("T")[0]);
  const pengumumanTerbaru = [...pengumuman].sort((a: any, b: any) => (b.Tanggal || "").localeCompare(a.Tanggal || "")).slice(0, 3);

  if (/(halo|hai|hey|assalam|salam|apa kabar|tes|test|ping)/.test(msg)) {
    return `👋 Halo! Saya asisten virtual Remaja Legok 03. Saat ini saya dalam **mode lokal**.\n\n📋 Yang bisa saya bantu:\n• "**info anggota**" — jumlah anggota\n• "**info kas**" — laporan keuangan\n• "**agenda**" — kegiatan terdekat\n• "**pengumuman**" — info terbaru\n• "**ide kegiatan**" — saran program\n\n💡 Untuk AI yang lebih cerdas, tambahkan *GEMINI_API_KEY* di Environment Vercel.`;
  }

  if (/(berapa|jumlah|total).*(anggota|warga|member)/.test(msg) || msg.includes("info anggota")) {
    const ketua = anggota.find((a: any) => a.Jabatan === "Ketua" && a.Status_Aktif === "AKTIF");
    const pengurus = anggota.filter((a: any) => ["Ketua","Sekretaris","Bendahara","Humas"].includes(a.Jabatan || "") && a.Status_Aktif === "AKTIF");
    let resp = `👥 **Data Anggota Remaja Legok 03**\n\n📊 Total: **${totalAnggota} anggota** aktif\n👑 Ketua: ${ketua?.Nama_Lengkap || "Andi Setiawan"}\n📋 Pengurus: ${pengurus.length} orang`;
    pengurus.forEach((p: any) => { resp += `\n  • ${p.Nama_Lengkap} — ${p.Jabatan}`; });
    return resp;
  }

  if (/(info|data|laporan|saldo|keuangan).*kas|kas.*(berapa|info|data)/.test(msg)) {
    const pemasukan = totalPemasukan.toLocaleString("id-ID");
    const pengeluaran = totalPengeluaran.toLocaleString("id-ID");
    const saldoStr = saldo.toLocaleString("id-ID");
    const status = saldo >= 0 ? "✅ Positif" : "⚠️ Defisit";
    return `💰 **Laporan Kas Remaja Legok 03**\n\n📥 Pemasukan: Rp ${pemasukan}\n📤 Pengeluaran: Rp ${pengeluaran}\n💵 Saldo: Rp ${saldoStr}\n📊 Status: ${status}\n\nTotal ${kas.length} transaksi tercatat.`;
  }

  if (/(agenda|kegiatan|acara|event|jadwal)/.test(msg)) {
    if (agendaMendatang.length === 0) {
      return `📅 Belum ada agenda mendatang. Kamu bisa mengusulkan kegiatan di menu **Aspirasi**! 💡`;
    }
    let resp = `📅 **Agenda Mendatang** (${agendaMendatang.length} kegiatan):\n`;
    agendaMendatang.forEach((a: any) => {
      resp += `\n📌 **${a["Nama Kegiatan"] || a.Judul || "-"}**\n   📍 ${a.Lokasi || "-"} | 🕐 ${a.Tanggal || "-"} ${a.Waktu || ""}`;
    });
    return resp;
  }

  if (/(pengumuman|berita|info|kabar|update)/.test(msg)) {
    if (pengumumanTerbaru.length === 0) {
      return `📢 Belum ada pengumuman terbaru. Admin bisa menambahkan di menu **Pengumuman**.`;
    }
    let resp = `📢 **Pengumuman Terbaru:**\n`;
    pengumumanTerbaru.forEach((p: any) => {
      resp += `\n📌 **${p.Judul || "-"}** (${p.Tanggal || "-"})\n   ${(p.Isi || "").slice(0, 100)}...`;
    });
    return resp;
  }

  if (/(iuran|bayar|tagihan)/.test(msg)) {
    const lunas = iuran.filter((i: any) => i.Status === "LUNAS").length;
    const menunggu = iuran.filter((i: any) => i.Status === "MENUNGGU" || i.Status === "MENUNGGU_KONFIRMASI").length;
    const blmLunas = iuran.filter((i: any) => i.Status !== "LUNAS" && i.Status !== "DIBEBASKAN").length;
    return `💰 **Status Iuran Anggota**\n\n✅ Lunas: ${lunas}\n⏳ Menunggu: ${menunggu}\n❌ Belum: ${blmLunas}\n\nTotal ${iuran.length} catatan iuran.`;
  }

  if (/(ide|saran|usul|program|kegiatan.*baru|bantu.*ide)/.test(msg)) {
    const ideas = [
      "🏆 **Turnamen Futsal Antar RT** — Ajak semua pemuda untuk kompetisi sehat",
      "🎨 **Workshop Kreatif** — Belajar desain grafis, fotografi, atau videografi bareng",
      "🌱 **Gerakan Hijau Denokan** — Tanam pohon di sepanjang jalan RT 03",
      "🎵 **Pentas Seni Pemuda** — Tampilkan bakat musik, tari, dan teater warga",
      "📚 **Pojok Baca RT 03** — Buat perpustakaan mini di balai RT",
      "🍳 **Lomba Masak Kreasi Remaja** — Adu kreasi masakan dengan bahan lokal",
    ];
    const pick = ideas[Math.floor(Math.random() * ideas.length)];
    return `💡 **Ide Kegiatan untuk Remaja RT 03:**\n\n${pick}\n\nMau ide lain? Ketik "ide kegiatan" lagi! Atau usulkan di menu **Aspirasi**. 🚀`;
  }

  if (/(siapa|nama).*(ketua|bendahara|sekretaris|humas)/.test(msg)) {
    const jabatan = msg.includes("ketua") ? "Ketua" : msg.includes("bendahara") ? "Bendahara" : msg.includes("sekretaris") ? "Sekretaris" : "Humas";
    const person = anggota.find((a: any) => a.Jabatan === jabatan && a.Status_Aktif === "AKTIF");
    if (person) {
      return `👤 **${jabatan} Remaja Legok 03:**\n\nNama: ${person.Nama_Lengkap}\nID: ${person.ID_Anggota}\n📱 ${person.No_HP || "Tidak tersedia"}`;
    }
    return `Maaf, data ${jabatan} tidak ditemukan.`;
  }

  if (/(thanks|terima kasih|makasih|mantap|oke|sip)/.test(msg)) {
    return "Sama-sama! 😊 Senang bisa membantu. Ada lagi yang bisa saya bantu?";
  }

  if (/(bantuan|help|perintah|command|bisa apa|fitur)/.test(msg)) {
    return `🤖 **Perintah yang tersedia (Mode Lokal):**\n\n• "**info anggota**" — data anggota\n• "**info kas**" — laporan keuangan\n• "**agenda**" — jadwal kegiatan\n• "**pengumuman**" — info terbaru\n• "**iuran**" — status iuran\n• "**ide kegiatan**" — saran program\n• "**siapa ketua?**" — cari pengurus\n\n💡 Ketik kata kunci di atas kapan saja!`;
  }

  return `ℹ️ Saya dalam **mode lokal** — beroperasi tanpa koneksi AI server.\n\nKamu bisa tanya:\n• "**info anggota**" • "**info kas**" • "**agenda**"\n• "**pengumuman**" • "**ide kegiatan**" • "**iuran**"\n\nKetik "**bantuan**" untuk lihat semua perintah.`;
}

// ----------------------------------------------------------
// COMPONENT PROPS
// ----------------------------------------------------------
export interface ChatbotProps {
  appData?: AppData;
  setAppData?: (data: AppData) => void;
  session?: any;
  showToast?: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

// ----------------------------------------------------------
// COMPONENT
// ----------------------------------------------------------
export default function Chatbot({ appData, setAppData, session, showToast }: ChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);
  const messagesEndRef          = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const userText = input.trim();
    if (!userText || loading) return;

    const userMsg: ChatMessage = {
      id  : `msg-${Date.now()}-user`,
      role: "user",
      text: userText,
    };

    setInput("");
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const limitedHistory = messages.slice(-MAX_HISTORY).map(({ role, text }) => ({ role, text }));
      const currentAppData = appData || loadAppData();
      const currentSession = session || JSON.parse(localStorage.getItem("remaja_legok_03_session") || "{}");
      const currentRole = currentSession?.role || "TAMU";

      // Coba API dulu
      let customApiKey = "";
      const configByKategori = ambilKonfigAPIByKategori(currentAppData, "Layanan AI");
      if (configByKategori && configByKategori.API_KEY) {
        customApiKey = configByKategori.API_KEY;
      } else {
        const configByNama = ambilKonfigAPIByNama(currentAppData, "Gemini AI");
        if (configByNama && configByNama.API_KEY) {
          customApiKey = configByNama.API_KEY;
        }
      }

      let botText = "";

      if (apiAvailable !== false) {
        try {
          const result = await chatAI(
            userText,
            limitedHistory,
            currentAppData,
            currentRole,
            customApiKey || undefined
          );

          if (result.ok && result.data) {
            setApiAvailable(true);
            if (result.data.updatedAppData) {
              saveAppData(result.data.updatedAppData);
              if (setAppData) setAppData(result.data.updatedAppData);
              if (showToast) showToast("Database berhasil diperbarui oleh AI!", "success");
            }
            botText = result.data.reply || "Maaf, terjadi kesalahan pada server.";
          } else {
            throw new Error(result.error || "Server error");
          }
        } catch {
          setApiAvailable(false);
          botText = generateLocalResponse(userText, currentAppData, currentRole);
        }
      } else {
        botText = generateLocalResponse(userText, currentAppData, currentRole);
      }

      const botMsg: ChatMessage = {
        id  : `msg-${Date.now()}-model`,
        role: "model",
        text: botText,
      };
      setMessages((prev) => [...prev, botMsg]);

    } catch (err) {
      console.error("[Chatbot] Error:", err);
      const currentAppData = appData || loadAppData();
      const currentSession = session || JSON.parse(localStorage.getItem("remaja_legok_03_session") || "{}");
      const fallbackText = generateLocalResponse(input, currentAppData, currentSession?.role || "TAMU");
      setMessages((prev) => [...prev, {
        id  : `msg-${Date.now()}-error`,
        role: "model",
        text: fallbackText,
      }]);
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm dark:shadow-none border border-neutral-200 dark:border-slate-800 h-[calc(100vh-160px)] md:h-[calc(100vh-100px)] min-h-[500px] flex flex-col animate-in fade-in duration-500 overflow-hidden">

      {/* Header */}
      <div className="bg-teal-600 p-4 md:p-6 text-white flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
          <Sparkles size={20} className="text-teal-50" />
        </div>
        <div className="flex-1">
          <h2 className="font-bold text-lg leading-tight">Asisten Pemuda</h2>
          <p className="text-teal-100 text-xs flex items-center gap-1">
            {apiAvailable === false ? (
              <><WifiOff size={10} /> Mode Lokal (tanpa AI)</>
            ) : apiAvailable === true ? (
              <><Wifi size={10} /> Gemini AI</>
            ) : (
              "Memeriksa koneksi..."
            )}
          </p>
        </div>
      </div>

      {/* Area Pesan */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-neutral-50/50 dark:bg-slate-800/20">
        {apiAvailable === false && messages.length <= 1 && (
          <div className="text-center p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl mx-auto max-w-sm">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-bold mb-1">ℹ️ Mode Lokal Aktif</p>
            <p className="text-[11px] text-amber-600 dark:text-amber-500">
              AI belum tersedia. Saya tetap bisa membantu dengan data lokal. Tambahkan <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">GEMINI_API_KEY</code> di Vercel untuk mode AI penuh.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : ""}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
              msg.role === "user"
                ? "bg-teal-600 text-white"
                : "bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-700 text-teal-600"
            }`}>
              {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm dark:shadow-none whitespace-pre-line break-words ${
              msg.role === "user"
                ? "bg-teal-600 text-white rounded-tr-none"
                : "bg-white dark:bg-slate-900 text-neutral-800 dark:text-slate-200 border border-neutral-100 dark:border-slate-700 rounded-tl-none"
            }`}>
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 max-w-[85%]">
            <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-700 text-teal-600 flex items-center justify-center flex-shrink-0 mt-1">
              <Bot size={16} />
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 text-neutral-800 border border-neutral-100 dark:border-slate-700 rounded-tl-none shadow-sm dark:shadow-none flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-teal-600" />
              <span className="text-sm text-neutral-500 dark:text-slate-400">Mengetik...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-neutral-100 dark:border-slate-800 shrink-0">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tanya: info anggota, info kas, agenda, ide kegiatan..."
            disabled={loading}
            className="flex-1 p-3 px-5 bg-neutral-100 dark:bg-slate-800 border-none rounded-full focus:ring-2 focus:ring-teal-500 outline-none text-sm transition-all dark:text-slate-200 dark:placeholder-slate-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            aria-label="Kirim pesan"
            className="w-12 h-12 bg-teal-600 text-white rounded-full flex items-center justify-center hover:bg-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-md dark:shadow-none"
          >
            <Send size={18} className="ml-1" />
          </button>
        </form>
      </div>
    </div>
  );
}
