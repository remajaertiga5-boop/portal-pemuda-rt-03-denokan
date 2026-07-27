// ============================================================
// VERCEL SERVERLESS — GEMINI REST API (NATIVE, NO SDK)
// Model: gemini-3.5-flash-lite (free tier tertinggi: ~30 RPM)
// Fallback: gemini-3.6-flash → gemini-flash-latest
// ============================================================

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// Model priority — free tier, highest limits first
const MODELS = [
  "gemini-3.5-flash-lite",   // Free, highest RPM
  "gemini-3.6-flash",        // Free, fast
  "gemini-3.5-flash",        // Free, balanced
  "gemini-flash-latest",     // Auto-alias to latest
];

// ── Helpers ────────────────────────────────────────────────
function buildSystemContext(appData, userRole) {
  if (!appData) return "";

  const anggota    = appData.Anggota    || [];
  const agenda     = appData.Agenda     || [];
  const kas        = appData.Kas        || [];
  const pengumuman = appData.Pengumuman || [];

  const totalAnggota = anggota.filter(a => a.Status_Tampil !== "ARSIP").length;
  const pemasukan    = kas.filter(k => k.Jenis === "Pemasukan").reduce((s, k) => s + (Number(k.Nominal) || 0), 0);
  const pengeluaran  = kas.filter(k => k.Jenis === "Pengeluaran").reduce((s, k) => s + (Number(k.Nominal) || 0), 0);
  const saldo        = pemasukan - pengeluaran;
  const today         = new Date().toISOString().split("T")[0];
  const agendaMendatang = agenda.filter(a => a.Tanggal >= today).slice(0, 5);

  const pengurus = anggota.filter(a =>
    ["Ketua","Sekretaris","Bendahara","Humas","Wakil Ketua"].includes(a.Jabatan || "")
  );

  const pengumumanTerbaru = [...pengumuman]
    .sort((a, b) => (b.Tanggal || "").localeCompare(a.Tanggal || ""))
    .slice(0, 3);

  let ctx = `KAMU ADALAH ASISTEN AI untuk Remaja RT 03 RW 04 Denokan, Gondoryo, Jambu, Semarang. Gunakan Bahasa Indonesia santai, akrab, sopan. Jawab berdasarkan data di bawah, jangan mengarang.`;

  ctx += `\n\n=== DATA REAL-TIME ===`;
  ctx += `\n👥 Total Anggota Aktif: ${totalAnggota}`;
  ctx += `\n💰 Kas: Rp ${saldo.toLocaleString("id-ID")} (Masuk: ${pemasukan.toLocaleString("id-ID")}, Keluar: ${pengeluaran.toLocaleString("id-ID")})`;
  ctx += `\n📅 Agenda: ${agendaMendatang.length} mendatang`;
  ctx += `\n📢 Pengumuman: ${pengumumanTerbaru.length} terbaru`;

  if (pengurus.length > 0) {
    ctx += `\n\n=== PENGURUS ===`;
    pengurus.forEach(p => { ctx += `\n• ${p.Nama_Lengkap} — ${p.Jabatan}`; });
  }

  if (agendaMendatang.length > 0) {
    ctx += `\n\n=== AGENDA TERDEKAT ===`;
    agendaMendatang.forEach(a => {
      ctx += `\n• ${a["Nama Kegiatan"] || a.Judul} — ${a.Tanggal} @ ${a.Lokasi || "-"}`;
    });
  }

  if (pengumumanTerbaru.length > 0) {
    ctx += `\n\n=== PENGUMUMAN ===`;
    pengumumanTerbaru.forEach(p => {
      ctx += `\n• ${p.Judul}: ${(p.Isi || "").slice(0, 100)}`;
    });
  }

  ctx += `\n\nRole user saat ini: ${userRole || "TAMU"}`;

  return ctx;
}

// ── API Call ───────────────────────────────────────────────
async function callGemini(model, apiKey, systemInstruction, contents) {
  const body = {
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: contents.map(c => ({
      role: c.role === "model" ? "model" : "user",
      parts: [{ text: c.text }],
    })),
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  };

  const res = await fetch(`${GEMINI_BASE}/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    throw new Error("RATE_LIMITED");
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error?.message || `HTTP ${res.status}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (!text) throw new Error("Empty response from model");

  return { text, model: data.modelVersion || model };
}

// ── Handler ────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const { message, history, appData, userRole, customApiKey } = req.body || {};

    if (!message) return res.status(400).json({ error: "Pesan wajib diisi." });

    // API Key: custom > env > built-in
    const apiKey = customApiKey
      || process.env.GEMINI_API_KEY
      || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(200).json({
        reply: null,
        error: "GEMINI_API_KEY belum dikonfigurasi. Tambahkan di Environment Variables Vercel.",
      });
    }

    // Build context
    const systemInstruction = buildSystemContext(appData, userRole);

    // Build contents
    const contents = [
      ...(history || []).map(msg => ({
        role: msg.role === "user" ? "user" : "model",
        text: msg.text,
      })),
      { role: "user", text: message },
    ];

    // Try each model in order
    let lastError = "";
    for (const model of MODELS) {
      try {
        const result = await callGemini(model, apiKey, systemInstruction, contents);
        return res.status(200).json({
          reply: result.text,
          model: result.model,
        });
      } catch (err) {
        lastError = err.message;
        if (err.message === "RATE_LIMITED") continue; // Try next model
        if (err.message?.includes("not found") || err.message?.includes("404")) continue;
        throw err; // Other errors: stop trying
      }
    }

    // All models failed
    return res.status(200).json({
      reply: null,
      error: `Semua model AI sedang sibuk. Silakan coba lagi nanti. (${lastError})`,
    });

  } catch (error) {
    console.error("[api/chat]", error.message);
    return res.status(200).json({
      reply: null,
      error: error.message || "Gagal menghubungi AI.",
    });
  }
}
