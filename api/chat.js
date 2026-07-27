// ============================================================
// VERCEL SERVERLESS — GEMINI AI CHATBOT
// v2.0 — Konteks data app, user role, updatedAppData
// ============================================================

import { GoogleGenAI } from "@google/genai";

// ── Helpers ────────────────────────────────────────────────
function buildSystemContext(appData, userRole) {
  if (!appData) return "";

  const anggota = appData.Anggota || [];
  const agenda  = appData.Agenda  || [];
  const kas     = appData.Kas     || [];
  const pengumuman = appData.Pengumuman || [];
  const iuran   = appData.Iuran   || [];
  const voting  = appData.Voting  || [];
  const galeri  = appData.Galeri  || [];

  const totalAnggota = anggota.filter(a => a.Status_Tampil !== "ARSIP").length;
  const totalPemasukan = kas.filter(k => k.Jenis === "Pemasukan")
    .reduce((s, k) => s + (Number(k.Nominal) || 0), 0);
  const totalPengeluaran = kas.filter(k => k.Jenis === "Pengeluaran")
    .reduce((s, k) => s + (Number(k.Nominal) || 0), 0);
  const saldo = totalPemasukan - totalPengeluaran;

  // Agenda terdekat
  const today = new Date().toISOString().split("T")[0];
  const agendaMendatang = agenda.filter(a => a.Tanggal >= today).slice(0, 5);

  // Pengurus
  const pengurus = anggota.filter(a =>
    ["Ketua","Sekretaris","Bendahara","Humas","Wakil Ketua"].includes(a.Jabatan || "")
  );

  // Pengumuman terbaru
  const pengumumanTerbaru = [...pengumuman]
    .sort((a, b) => (b.Tanggal || "").localeCompare(a.Tanggal || ""))
    .slice(0, 3);

  // Voting aktif
  const votingAktif = voting.filter(v => v.Status === "AKTIF");

  let ctx = `KAMU ADALAH ASISTEN AI untuk Remaja RT 03 RW 04 Denokan, Gondoryo, Jambu, Semarang.`;

  ctx += `\n\n=== DATA REAL-TIME APLIKASI ===`;
  ctx += `\n👥 Total Anggota Aktif: ${totalAnggota}`;
  ctx += `\n💰 Saldo Kas: Rp ${saldo.toLocaleString("id-ID")} (Masuk: Rp ${totalPemasukan.toLocaleString("id-ID")}, Keluar: Rp ${totalPengeluaran.toLocaleString("id-ID")})`;
  ctx += `\n📅 Agenda Mendatang: ${agendaMendatang.length} kegiatan`;
  ctx += `\n📢 Pengumuman: ${pengumumanTerbaru.length} terbaru`;
  ctx += `\n🗳️ Voting Aktif: ${votingAktif.length}`;
  ctx += `\n🖼️ Foto Galeri: ${galeri.length}`;

  if (pengurus.length > 0) {
    ctx += `\n\n=== PENGURUS ===`;
    pengurus.forEach(p => {
      ctx += `\n• ${p.Nama_Lengkap} — ${p.Jabatan} (ID: ${p.ID_Anggota})`;
    });
  }

  if (agendaMendatang.length > 0) {
    ctx += `\n\n=== AGENDA TERDEKAT ===`;
    agendaMendatang.forEach(a => {
      ctx += `\n• ${a["Nama Kegiatan"] || a.Judul || "-"} — ${a.Tanggal} ${a.Waktu || ""} @ ${a.Lokasi || "-"}`;
    });
  }

  if (pengumumanTerbaru.length > 0) {
    ctx += `\n\n=== PENGUMUMAN TERBARU ===`;
    pengumumanTerbaru.forEach(p => {
      ctx += `\n• ${p.Judul || "-"} (${p.Tanggal || "-"}): ${(p.Isi || "").slice(0, 150)}`;
    });
  }

  ctx += `\n\n=== USER SAAT INI ===`;
  ctx += `\nRole: ${userRole || "TAMU"}`;
  if (userRole === "TAMU") ctx += ` (Hanya bisa lihat info publik)`;
  if (userRole === "SUPER_ADMIN") ctx += ` (Akses penuh — bisa minta perubahan data)`;

  ctx += `\n\n=== ATURAN ===`;
  ctx += `\n• Gunakan Bahasa Indonesia santai, akrab, tapi sopan`;
  ctx += `\n• Jawab berdasarkan data di atas, jangan mengarang angka`;
  ctx += `\n• Jika ditanya hal di luar data, akui keterbatasan`;
  ctx += `\n• Bantu buat ide kegiatan, caption sosmed, undangan, dll`;
  ctx += `\n• Format jawaban pakai markdown ringan (bold, list, emoji)`;

  return ctx;
}

// ── Handler ────────────────────────────────────────────────
export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

  try {
    const { message, history, appData, userRole, customApiKey } = req.body || {};

    if (!message) {
      return res.status(400).json({ error: "Pesan wajib diisi." });
    }

    const apiKey = customApiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "Kredensial Gemini API Key belum dikonfigurasi.",
        reply: null,
      });
    }

    // Build system context
    const systemInstruction = buildSystemContext(appData, userRole);

    const ai = new GoogleGenAI({ apiKey });

    // Convert history
    const contents = (history || []).map(msg => ({
      role: msg.role === "model" ? "model" : "user",
      parts: [{ text: msg.text }],
    }));
    contents.push({ role: "user", parts: [{ text: message }] });

    // Gunakan model yang benar-benar exist
    const models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-pro"];
    let response = null;
    let usedModel = "";

    for (const model of models) {
      try {
        response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        });
        usedModel = model;
        break;
      } catch (err) {
        if (err.message?.includes("not found") || err.message?.includes("404")) {
          continue; // coba model berikutnya
        }
        throw err;
      }
    }

    if (!response) {
      return res.status(500).json({
        error: "Semua model Gemini gagal. Pastikan API key valid.",
        reply: null,
      });
    }

    const replyText = response.text || "Maaf, saya tidak bisa menghasilkan jawaban saat ini.";

    return res.status(200).json({
      reply: replyText,
      model: usedModel,
      updatedAppData: null, // AI tidak bisa mengubah data langsung — hanya saran
    });

  } catch (error) {
    console.error("[api/chat] Error:", error.message);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal.",
      reply: null,
    });
  }
}
