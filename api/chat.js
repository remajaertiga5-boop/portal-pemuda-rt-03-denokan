// ============================================================
// VERCEL SERVERLESS FUNCTION - GEMINI AI CHATBOT INTERFACE
// ============================================================

import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const { message, history, customApiKey } = req.body || {};
    
    if (!message) {
      return res.status(400).json({ error: "Pesan wajib diisi." });
    }

    const apiKey = customApiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Kredensial Gemini API Key belum dikonfigurasi di server." });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const contents = (history || []).map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));
    contents.push({ role: "user", parts: [{ text: message }] });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: "Kamu adalah asisten AI ramah untuk Remaja RT 03 RW 04 Denokan, Gondoryo, Jambu, Semarang. Bantu mereka menjawab pertanyaan, membuat ide kegiatan, undangan, atau menulis caption sosial media. Gunakan bahasa Indonesia yang santai, akrab, tapi sopan.",
      }
    });

    return res.status(200).json({ reply: response.text });
  } catch (error) {
    console.error("[api/chat] Chat error:", error);
    return res.status(500).json({ error: error.message || "Terjadi kesalahan internal server." });
  }
}
