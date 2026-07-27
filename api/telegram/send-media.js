// ============================================================
// VERCEL SERVERLESS FUNCTION - TELEGRAM BOT SEND MEDIA GATEWAY
// ============================================================

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
    const { botToken, chatId, mediaUrl, caption, isVideo } = req.body || {};
    
    if (!botToken || !chatId || !mediaUrl) {
      return res.status(400).json({ status: "error", message: "Bot Token, Chat ID, dan Media URL wajib diisi" });
    }

    const method = isVideo ? "sendVideo" : "sendPhoto";
    const fieldName = isVideo ? "video" : "photo";
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/${method}`;

    if (mediaUrl.startsWith("data:")) {
      // Data URI Base64 upload
      const matches = mediaUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({ status: "error", message: "Format Data URL tidak valid" });
      }
      const mimeType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, "base64");

      const formData = new FormData();
      formData.append("chat_id", chatId);
      if (caption) formData.append("caption", caption);

      const blob = new Blob([buffer], { type: mimeType });
      formData.append(fieldName, blob, isVideo ? "upload.mp4" : "upload.jpg");

      const tgRes = await fetch(telegramApiUrl, {
        method: "POST",
        body: formData,
      });
      const tgData = await tgRes.json();
      
      if (!tgData.ok) {
        return res.status(400).json({ status: "error", message: tgData.description || "Gagal mengirim file ke Telegram" });
      }
      return res.status(200).json({ status: "success", result: tgData.result });
    } else {
      // Direct Link URL upload
      const tgRes = await fetch(telegramApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          [fieldName]: mediaUrl,
          caption: caption || "",
        }),
      });
      const tgData = await tgRes.json();
      
      if (!tgData.ok) {
        return res.status(400).json({ status: "error", message: tgData.description || "Gagal mengirim URL ke Telegram" });
      }
      return res.status(200).json({ status: "success", result: tgData.result });
    }
  } catch (err) {
    console.error("[api/telegram/send-media] Telegram error:", err);
    return res.status(500).json({ status: "error", message: err.message || "Internal server error" });
  }
}
