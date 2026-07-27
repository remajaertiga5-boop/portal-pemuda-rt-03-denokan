import React, { useState, useRef, useEffect } from "react";
import { Send, User, Bot, Loader2, Sparkles } from "lucide-react";
import { loadAppData, saveAppData } from "../utils/dataStore";
import { ambilKonfigAPIByKategori, ambilKonfigAPIByNama } from "../utils/apiConfigHelper";

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
  text: "Halo! Saya asisten AI untuk Remaja RT 03 RW 04 Denokan. Ada yang bisa saya bantu terkait kegiatan atau ide program pemuda?",
};

// Batasi history yang dikirim ke API agar tidak terlalu besar
const MAX_HISTORY = 10;

export interface ChatbotProps {
  appData?: any;
  setAppData?: (data: any) => void;
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
  const messagesEndRef          = useRef<HTMLDivElement>(null);

  // Auto scroll ke bawah saat pesan baru masuk
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ----------------------------------------------------------
  // Kirim Pesan
  // ----------------------------------------------------------
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    const userText = input.trim();
    if (!userText || loading) return;

    // ✅ ID unik per pesan — tidak pakai index
    const userMsg: ChatMessage = {
      id  : `msg-${Date.now()}-user`,
      role: "user",
      text: userText,
    };

    setInput("");
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // ✅ Batasi history — hanya N pesan terakhir
      const limitedHistory = messages.slice(-MAX_HISTORY).map(({ role, text }) => ({
        role,
        text,
      }));

      // Mengambil API Key dari Kategori API yang di-input Super Admin
      const currentAppData = appData || loadAppData();
      const currentSession = session || JSON.parse(localStorage.getItem("remaja_legok_03_session") || "{}");
      const currentRole = currentSession?.role || "TAMU";

      let customApiKey = "";
      
      // Ambil dari Kategori "Layanan AI" terlebih dahulu
      const configByKategori = ambilKonfigAPIByKategori(currentAppData, "Layanan AI");
      if (configByKategori && configByKategori.API_KEY) {
        customApiKey = configByKategori.API_KEY;
      } else {
        // Fallback jika dicari berdasarkan nama API "Gemini AI"
        const configByNama = ambilKonfigAPIByNama(currentAppData, "Gemini AI");
        if (configByNama && configByNama.API_KEY) {
          customApiKey = configByNama.API_KEY;
        }
      }

      const res = await fetch("/api/chat", {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({
          message: userText,
          history: limitedHistory,
          customApiKey: customApiKey || undefined,
          appData: currentAppData,
          userRole: currentRole,
        }),
      });

      // ✅ Cek response.ok sebelum parse JSON
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();

      if (data.updatedAppData) {
        saveAppData(data.updatedAppData);
        if (setAppData) {
          setAppData(data.updatedAppData);
        }
        if (showToast) {
          showToast("Database berhasil diperbarui oleh AI!", "success");
        }
      }

      const botMsg: ChatMessage = {
        id  : `msg-${Date.now()}-model`,
        role: "model",
        text: data.reply || "Maaf, terjadi kesalahan pada server.",
      };

      setMessages((prev) => [...prev, botMsg]);

    } catch (err) {
      console.error("[Chatbot] Error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id  : `msg-${Date.now()}-error`,
          role: "model",
          text: "Maaf, gagal terhubung ke AI. Silakan coba lagi.",
        },
      ]);
    } finally {
      // ✅ Selalu reset loading — tidak stuck jika error
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
        <div>
          <h2 className="font-bold text-lg leading-tight">Asisten Pemuda</h2>
          <p className="text-teal-100 text-xs">Didukung oleh Gemini AI</p>
        </div>
      </div>

      {/* Area Pesan */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-neutral-50/50 dark:bg-slate-800/20">
        {messages.map((msg) => (
          // ✅ Pakai msg.id bukan index
          <div
            key={msg.id}
            className={`flex gap-3 max-w-[85%] ${
              msg.role === "user" ? "ml-auto flex-row-reverse" : ""
            }`}
          >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
              msg.role === "user"
                ? "bg-teal-600 text-white"
                : "bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-700 text-teal-600"
            }`}>
              {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
            </div>

            {/* Bubble */}
            <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm dark:shadow-none break-words ${
              msg.role === "user"
                ? "bg-teal-600 text-white rounded-tr-none"
                : "bg-white dark:bg-slate-900 text-neutral-800 dark:text-slate-200 border border-neutral-100 dark:border-slate-700 rounded-tl-none"
            }`}>
              {msg.text}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex gap-3 max-w-[85%]">
            <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-700 text-teal-600 flex items-center justify-center flex-shrink-0 mt-1">
              <Bot size={16} />
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 text-neutral-800 border border-neutral-100 dark:border-slate-700 rounded-tl-none shadow-sm dark:shadow-none flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-teal-600" />
              <span className="text-sm text-neutral-500 dark:text-slate-400">
                Mengetik...
              </span>
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
            placeholder="Tanya ide acara, caption sosmed..."
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
