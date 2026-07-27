import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, User, Bot, Loader2, Sparkles, Wifi, WifiOff,
  Trash2, Copy, Check, Zap, Lightbulb, Calendar, DollarSign, Users, Megaphone
} from "lucide-react";
import { loadAppData, saveAppData, AppData } from "../utils/dataStore";
import { ambilKonfigAPIByKategori, ambilKonfigAPIByNama } from "../utils/apiConfigHelper";
import { chatAI, checkApiHealth } from "../utils/apiClient";

// ── TYPES ─────────────────────────────────────────────────
interface ChatMessage {
  id     : string;
  role   : "user" | "model";
  text   : string;
  copied ?: boolean;
}

// ── CONSTANTS ─────────────────────────────────────────────
const INITIAL_MESSAGE: ChatMessage = {
  id  : "init-0",
  role: "model",
  text: "Halo! 👋 Saya asisten AI untuk Remaja RT 03 RW 04 Denokan.\n\nSilakan tanya tentang:\n• 📊 **Data anggota & pengurus**\n• 💰 **Laporan keuangan**\n• 📅 **Agenda kegiatan**\n• 📢 **Pengumuman terbaru**\n• 💡 **Ide program pemuda**\n\nAtau klik saran di bawah 👇",
};

const MAX_HISTORY = 15;

const QUICK_ACTIONS = [
  { icon: Users,      label: "Info Anggota", query: "Berapa total anggota aktif dan siapa pengurusnya?" },
  { icon: DollarSign, label: "Info Kas",     query: "Bagaimana laporan keuangan terkini?" },
  { icon: Calendar,   label: "Agenda",       query: "Apa saja agenda kegiatan terdekat?" },
  { icon: Megaphone,  label: "Pengumuman",   query: "Apa pengumuman terbaru?" },
  { icon: Lightbulb,  label: "Ide Kegiatan", query: "Beri saya 3 ide kegiatan seru untuk remaja RT!" },
  { icon: Zap,        label: "Bantuan",      query: "Apa saja yang bisa kamu bantu?" },
];

// ── MARKDOWN HELPER ───────────────────────────────────────
function renderMarkdown(text: string): string {
  // Bold: **text**
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="font-extrabold">$1</strong>');
  // Italic: *text*
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Code: `text`
  text = text.replace(/`(.+?)`/g, '<code class="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[13px] font-mono">$1</code>');
  // Bullet lists: • or - at start of line
  text = text.replace(/^[•\-]\s(.+)$/gm, '<li class="ml-4 list-disc">$1</li>');
  // Numbered lists: 1. 2. etc
  text = text.replace(/^\d+\.\s(.+)$/gm, '<li class="ml-4 list-decimal">$1</li>');
  // Line breaks
  text = text.replace(/\n/g, '<br/>');
  return text;
}

// ── LOCAL FALLBACK ────────────────────────────────────────
function generateLocalResponse(message: string, appData: AppData | null, role: string): string {
  const msg = message.toLowerCase();
  const anggota    = appData?.Anggota || [];
  const agenda     = appData?.Agenda  || [];
  const kas        = appData?.Kas     || [];
  const pengumuman = appData?.Pengumuman || [];
  const iuran      = appData?.Iuran   || [];

  const totalAnggota   = anggota.filter((a: any) => a.Status_Tampil !== "ARSIP").length;
  const totalPemasukan  = kas.filter((k: any) => k.Jenis === "Pemasukan").reduce((s: number, k: any) => s + (Number(k.Nominal) || 0), 0);
  const totalPengeluaran = kas.filter((k: any) => k.Jenis === "Pengeluaran").reduce((s: number, k: any) => s + (Number(k.Nominal) || 0), 0);
  const saldo           = totalPemasukan - totalPengeluaran;
  const today           = new Date().toISOString().split("T")[0];
  const agendaMendatang = agenda.filter((a: any) => a.Tanggal >= today);
  const pengumumanTerbaru = [...pengumuman].sort((a: any, b: any) => (b.Tanggal || "").localeCompare(a.Tanggal || "")).slice(0, 3);

  // ── Greeting ──
  if (/(halo|hai|hey|assalam|salam|apa kabar|tes|test|ping|pagi|siang|sore|malam)/.test(msg)) {
    return `👋 Halo! Saya asisten virtual **Remaja Legok 03**.\n\nSaat ini saya dalam **mode lokal** (tanpa AI cloud).\n\nYang bisa saya bantu:\n• "**info anggota**" — data & pengurus\n• "**info kas**" — laporan keuangan\n• "**agenda**" — kegiatan terdekat\n• "**pengumuman**" — info terbaru\n• "**ide kegiatan**" — saran program\n• "**iuran**" — status iuran\n\nKetik "**bantuan**" untuk lihat semua perintah.`;
  }

  // ── Anggota ──
  if (/(berapa|jumlah|total|data|info).*(anggota|warga|member|pengurus|ketua|sekretaris|bendahara|humas)/.test(msg) || msg.includes("info anggota")) {
    const ketua = anggota.find((a: any) => a.Jabatan === "Ketua" && a.Status_Aktif === "AKTIF");
    const pengurus = anggota.filter((a: any) =>
      ["Ketua","Sekretaris","Bendahara","Humas","Wakil Ketua"].includes(a.Jabatan || "") && a.Status_Aktif === "AKTIF"
    );
    let resp = `👥 **Data Anggota Remaja Legok 03**\n\n📊 Total: **${totalAnggota} anggota** aktif\n👑 Ketua: ${ketua?.Nama_Lengkap || "Belum ditunjuk"}\n📋 Pengurus: ${pengurus.length} orang`;
    if (pengurus.length > 0) {
      resp += `\n`;
      pengurus.forEach((p: any) => { resp += `\n• **${p.Nama_Lengkap}** — ${p.Jabatan}`; });
    }
    return resp;
  }

  // ── Keuangan ──
  if (/(info|data|laporan|saldo|uang).*(kas|keuangan)|kas.*(berapa|info|data|uang)/.test(msg) || msg.includes("info kas")) {
    const s = saldo >= 0 ? "✅ Positif" : "⚠️ Defisit";
    return `💰 **Laporan Kas Remaja Legok 03**\n\n📥 Pemasukan: **Rp ${totalPemasukan.toLocaleString("id-ID")}**\n📤 Pengeluaran: **Rp ${totalPengeluaran.toLocaleString("id-ID")}**\n💵 Saldo: **Rp ${saldo.toLocaleString("id-ID")}**\n📊 Status: ${s}\n\nTotal **${kas.length} transaksi** tercatat.`;
  }

  // ── Agenda ──
  if (/(agenda|kegiatan|acara|event|jadwal)/.test(msg)) {
    if (agendaMendatang.length === 0) return `📅 Belum ada agenda mendatang. Kamu bisa mengusulkan kegiatan di menu **Aspirasi**! 💡`;
    let resp = `📅 **Agenda Mendatang** (${agendaMendatang.length}):\n`;
    agendaMendatang.slice(0, 5).forEach((a: any) => {
      resp += `\n📌 **${a["Nama Kegiatan"] || a.Judul || "-"}**\n   📍 ${a.Lokasi || "-"} | 🕐 ${a.Tanggal || "-"} ${a.Waktu || ""}`;
    });
    return resp;
  }

  // ── Pengumuman ──
  if (/(pengumuman|berita|info terbaru|kabar|update)/.test(msg)) {
    if (pengumumanTerbaru.length === 0) return `📢 Belum ada pengumuman. Admin bisa menambahkan di menu **Pengumuman**.`;
    let resp = `📢 **Pengumuman Terbaru:**\n`;
    pengumumanTerbaru.forEach((p: any) => {
      resp += `\n📌 **${p.Judul || "-"}** (${p.Tanggal || "-"})\n   ${(p.Isi || "").slice(0, 120)}...`;
    });
    return resp;
  }

  // ── Iuran ──
  if (/(iuran|bayar|tagihan|status iuran)/.test(msg)) {
    const lunas  = iuran.filter((i: any) => i.Status === "LUNAS").length;
    const nunggu = iuran.filter((i: any) => i.Status === "MENUNGGU" || i.Status === "MENUNGGU_KONFIRMASI").length;
    const blm    = iuran.filter((i: any) => i.Status !== "LUNAS" && i.Status !== "DIBEBASKAN").length;
    return `💰 **Status Iuran**\n\n✅ Lunas: **${lunas}**\n⏳ Menunggu: **${nunggu}**\n❌ Belum: **${blm}**\n\nTotal **${iuran.length}** catatan.`;
  }

  // ── Ide Kegiatan ──
  if (/(ide|saran|usul|program|kegiatan.*baru|bantu.*ide)/.test(msg)) {
    const ideas = [
      "🏆 **Turnamen Futsal Antar RT** — Ajak semua pemuda untuk kompetisi sehat mingguan",
      "🎨 **Workshop Konten Kreator** — Belajar edit video, foto, dan social media bareng",
      "🌱 **Gerakan Hijau Denokan** — Tanam pohon + vertical garden di sepanjang RT 03",
      "🎵 **Pentas Seni Pemuda** — Tampilkan bakat musik, tari, dan teater warga",
      "📚 **Pojok Baca Digital** — Buat perpustakaan mini + WiFi corner di balai RT",
      "🍳 **Lomba Masak Kreasi Remaja** — Adu kreasi masakan dengan bahan lokal terjangkau",
      "🧹 **Jumat Bersih Bareng** — Gotong royong bersihkan lingkungan tiap Jumat sore",
      "🎮 **Turnamen Mobile Legends** — Kompetisi game online yang positif & terkontrol",
    ];
    const picks = [...ideas].sort(() => Math.random() - 0.5).slice(0, 3);
    return `💡 **3 Ide Kegiatan untuk Remaja RT 03:**\n\n${picks.join("\n\n")}\n\nMau ide lain? Ketik "ide kegiatan" lagi! Atau usulkan di menu **Aspirasi**. 🚀`;
  }

  // ── Cari Pengurus ──
  if (/(siapa|nama|kontak).*(ketua|bendahara|sekretaris|humas)/.test(msg)) {
    const j = msg.includes("ketua") ? "Ketua" : msg.includes("bendahara") ? "Bendahara" : msg.includes("sekretaris") ? "Sekretaris" : "Humas";
    const p = anggota.find((a: any) => a.Jabatan === j && a.Status_Aktif === "AKTIF");
    return p
      ? `👤 **${j} Remaja Legok 03:**\n\nNama: **${p.Nama_Lengkap}**\nID: ${p.ID_Anggota}\n📱 ${p.No_HP || "Tidak tersedia"}`
      : `Maaf, data ${j} tidak ditemukan.`;
  }

  // ── Terima Kasih ──
  if (/(thanks|terima kasih|makasih|mantap|oke|sip|ok|good)/.test(msg)) {
    return "Sama-sama! 😊 Senang bisa bantu. Ada lagi yang bisa saya bantu?";
  }

  // ── Bantuan ──
  if (/(bantuan|help|perintah|command|bisa apa|fitur|apa aja)/.test(msg)) {
    return `🤖 **Perintah Tersedia (Mode Lokal):**\n\n• "**info anggota**" — data & pengurus\n• "**info kas**" — laporan keuangan\n• "**agenda**" — jadwal kegiatan\n• "**pengumuman**" — info terbaru\n• "**iuran**" — status iuran\n• "**ide kegiatan**" — saran program\n• "**siapa ketua?**" — cari pengurus\n\n💡 Ketik kata kunci di atas kapan saja!`;
  }

  return `ℹ️ Saya dalam **mode lokal** (tanpa AI cloud).\n\nKamu bisa tanya:\n• "**info anggota**" • "**info kas**" • "**agenda**"\n• "**pengumuman**" • "**ide kegiatan**" • "**iuran**"\n\nKetik "**bantuan**" untuk lihat semua perintah.`;
}

// ── PROPS ─────────────────────────────────────────────────
interface ChatbotProps {
  appData   ?: AppData;
  setAppData?: (data: AppData) => void;
  session   ?: any;
  showToast ?: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

// ── COMPONENT ─────────────────────────────────────────────
export default function Chatbot({ appData, setAppData, session, showToast }: ChatbotProps) {
  const [messages, setMessages]   = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [thinking, setThinking]   = useState(""); // Status "apa yang AI sedang lakukan"
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);
  const [checking, setChecking]   = useState(true); // Initial API health check
  const messagesEndRef            = useRef<HTMLDivElement>(null);

  // ── Auto-scroll ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, thinking]);

  // ── Ping API on mount ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setChecking(true);
      const online = await checkApiHealth();
      if (!cancelled) {
        setApiAvailable(online ? null : false); // null = belum pasti, false = offline
        setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Copy message ──
  const handleCopy = useCallback((id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, copied: true } : m));
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, copied: false } : m));
    }, 2000);
  }, []);

  // ── Clear chat ──
  const handleClear = () => {
    setMessages([INITIAL_MESSAGE]);
    showToast?.("Chat di-reset!", "info");
  };

  // ── Send ──
  const handleSend = async (e?: React.FormEvent, quickQuery?: string) => {
    if (e) e.preventDefault();
    const userText = (quickQuery || input).trim();
    if (!userText || loading) return;

    const userMsg: ChatMessage = { id: `msg-${Date.now()}-user`, role: "user", text: userText };
    setInput("");
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setThinking("Menganalisis pertanyaan...");

    try {
      const limitedHistory = messages.slice(-MAX_HISTORY).map(({ role, text }) => ({ role, text }));
      const currentAppData = appData || loadAppData();
      const currentSession = session || JSON.parse(localStorage.getItem("remaja_legok_03_session") || "{}");
      const currentRole     = currentSession?.role || "TAMU";

      // Ambil API key dari konfigurasi
      let customApiKey = "";
      const byKategori = ambilKonfigAPIByKategori(currentAppData, "Layanan AI");
      if (byKategori?.API_KEY) customApiKey = byKategori.API_KEY;
      else {
        const byNama = ambilKonfigAPIByNama(currentAppData, "Gemini AI");
        if (byNama?.API_KEY) customApiKey = byNama.API_KEY;
      }

      let botText = "";

      if (apiAvailable !== false) {
        setThinking("Menghubungkan ke AI...");
        try {
          const result = await chatAI(userText, limitedHistory, currentAppData, currentRole, customApiKey || undefined);

          if (result.ok && result.data) {
            if (result.data.reply) {
              // AI berhasil merespon
              setApiAvailable(true);
              botText = result.data.reply;
              if (result.data.updatedAppData) {
                saveAppData(result.data.updatedAppData);
                setAppData?.(result.data.updatedAppData);
                showToast?.("Database diperbarui oleh AI!", "success");
              }
            } else if (result.data.error) {
              // AI error (rate limited, etc) — fallback ke lokal
              console.warn("[Chatbot] AI error:", result.data.error);
              setApiAvailable(true); // API tersedia tapi sibuk
              botText = generateLocalResponse(userText, currentAppData, currentRole);
            } else {
              botText = generateLocalResponse(userText, currentAppData, currentRole);
            }
          } else {
            throw new Error(result.error || "Server error");
          }
        } catch {
          setApiAvailable(false);
          setThinking("Menyiapkan jawaban lokal...");
          await new Promise(r => setTimeout(r, 400)); // small delay for UX
          botText = generateLocalResponse(userText, currentAppData, currentRole);
        }
      } else {
        setThinking("Mode lokal — mencari data...");
        await new Promise(r => setTimeout(r, 300));
        botText = generateLocalResponse(userText, currentAppData, currentRole);
      }

      setMessages(prev => [...prev, { id: `msg-${Date.now()}-model`, role: "model", text: botText }]);
    } catch (err) {
      console.error("[Chatbot]", err);
      const currentAppData = appData || loadAppData();
      const currentSession = session || JSON.parse(localStorage.getItem("remaja_legok_03_session") || "{}");
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}-error`, role: "model",
        text: generateLocalResponse(input, currentAppData, currentSession?.role || "TAMU"),
      }]);
    } finally {
      setLoading(false);
      setThinking("");
    }
  };

  // ── RENDER ──────────────────────────────────────────────
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
            {checking ? (
              <><Loader2 size={10} className="animate-spin" /> Memeriksa koneksi...</>
            ) : apiAvailable === false ? (
              <><WifiOff size={10} /> Mode Lokal</>
            ) : (
              <><Wifi size={10} /> Gemini AI</>
            )}
          </p>
        </div>
        <button onClick={handleClear} title="Reset chat"
          className="p-2 rounded-xl hover:bg-white/10 text-teal-100 hover:text-white transition-colors">
          <Trash2 size={16} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 bg-neutral-50/50 dark:bg-slate-800/20">
        {/* Offline banner */}
        {!checking && apiAvailable === false && messages.length <= 1 && (
          <div className="text-center p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl mx-auto max-w-sm">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-bold mb-1">ℹ️ Mode Lokal Aktif</p>
            <p className="text-[11px] text-amber-600 dark:text-amber-500">
              AI cloud belum tersedia. Saya tetap bisa membantu dengan data lokal.
            </p>
          </div>
        )}

        {/* Messages */}
        {messages.map(msg => (
          <div key={msg.id}
            className={`flex gap-3 max-w-[88%] group ${msg.role === "user" ? "ml-auto flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
              msg.role === "user"
                ? "bg-teal-600 text-white"
                : "bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-700 text-teal-600"
            }`}>
              {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className="relative">
              <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm dark:shadow-none whitespace-pre-line break-words ${
                msg.role === "user"
                  ? "bg-teal-600 text-white rounded-tr-none"
                  : "bg-white dark:bg-slate-900 text-neutral-800 dark:text-slate-200 border border-neutral-100 dark:border-slate-700 rounded-tl-none"
              }`}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }}
              />
              {/* Copy button */}
              {msg.role === "model" && (
                <button onClick={() => handleCopy(msg.id, msg.text)}
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-teal-600 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                  title="Salin">
                  {msg.copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Thinking indicator */}
        {thinking && (
          <div className="flex gap-3 max-w-[88%]">
            <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-700 text-teal-600 flex items-center justify-center flex-shrink-0 mt-1">
              <Bot size={16} />
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-neutral-100 dark:border-slate-700 rounded-tl-none shadow-sm flex items-center gap-2.5">
              <Loader2 size={16} className="animate-spin text-teal-600" />
              <span className="text-sm text-neutral-500 dark:text-slate-400">{thinking}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {!loading && messages.length <= 2 && (
        <div className="px-4 pb-1 flex gap-1.5 overflow-x-auto scrollbar-none shrink-0">
          {QUICK_ACTIONS.map((qa, i) => (
            <button key={i} onClick={() => handleSend(undefined, qa.query)}
              className="flex items-center gap-1.5 px-3 py-2 bg-teal-50 dark:bg-teal-950/30 hover:bg-teal-100 dark:hover:bg-teal-900/40 text-teal-700 dark:text-teal-300 rounded-xl text-[11px] font-bold whitespace-nowrap border border-teal-200 dark:border-teal-800/40 transition-colors shrink-0">
              <qa.icon size={13} />
              {qa.label}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-neutral-100 dark:border-slate-800 shrink-0">
        <form onSubmit={handleSend} className="flex gap-2">
          <input type="text" value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={apiAvailable === false
              ? "Mode lokal — coba: info anggota, info kas, agenda..."
              : "Tanya apa saja tentang Remaja RT 03..."}
            disabled={loading}
            className="flex-1 p-3 px-5 bg-neutral-100 dark:bg-slate-800 border-none rounded-full focus:ring-2 focus:ring-teal-500 outline-none text-sm transition-all dark:text-slate-200 dark:placeholder-slate-500"
          />
          <button type="submit" disabled={!input.trim() || loading}
            aria-label="Kirim pesan"
            className="w-12 h-12 bg-teal-600 text-white rounded-full flex items-center justify-center hover:bg-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-md dark:shadow-none">
            <Send size={18} className="ml-1" />
          </button>
        </form>
      </div>
    </div>
  );
}
