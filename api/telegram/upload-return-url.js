// ================================================================
// VERCEL SERVERLESS — TELEGRAM UPLOAD + RETURN PUBLIC URL
// Upload foto/video ke group Telegram & kembalikan URL publik.
// Env yang dipakai:
//   TELEGRAM_BOT_TOKEN   (rahasia)
//   TELEGRAM_CHAT_ID     (default chat, contoh: -1004474501263)
// ================================================================

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const body = req.body || {};
    const botToken = body.botToken || process.env.TELEGRAM_BOT_TOKEN;
    const chatId   = body.chatId   || process.env.TELEGRAM_CHAT_ID;
    const { fileData, fileName, fileType, caption } = body;

    if (!botToken || !chatId || !fileData) {
      return res.status(400).json({ error: "botToken, chatId, dan fileData wajib (bisa dari body atau env server)" });
    }

    const isVideo = (fileType || "").startsWith("video/");
    const method    = isVideo ? "sendVideo" : "sendPhoto";
    const fieldName = isVideo ? "video" : "photo";
    const apiBase   = `https://api.telegram.org/bot${botToken}`;

    // ── 1. Upload media ──
    let uploadResult;
    if (fileData.startsWith("data:")) {
      const matches = fileData.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) return res.status(400).json({ error: "Format data URL tidak valid" });

      const mimeType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, "base64");

      const formData = new FormData();
      formData.append("chat_id", chatId);
      if (caption) formData.append("caption", caption);
      formData.append(fieldName, new Blob([buffer], { type: mimeType }), fileName || (isVideo ? "video.mp4" : "photo.jpg"));

      const tgRes = await fetch(`${apiBase}/${method}`, { method: "POST", body: formData });
      uploadResult = await tgRes.json();
    } else {
      const tgRes = await fetch(`${apiBase}/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, [fieldName]: fileData, caption: caption || "" }),
      });
      uploadResult = await tgRes.json();
    }

    if (!uploadResult.ok) {
      return res.status(400).json({ error: uploadResult.description || "Gagal upload ke Telegram", telegram_error: true });
    }

    // ── 2. Ambil file_id terbesar ──
    let fileId = "";
    const result = uploadResult.result;
    if (isVideo) {
      fileId = result.video?.file_id || "";
    } else {
      const photos = result.photo || [];
      if (photos.length > 0) fileId = photos[photos.length - 1].file_id;
    }
    if (!fileId) return res.status(500).json({ error: "Gagal mendapatkan file_id dari Telegram" });

    // ── 3. getFile untuk dapatkan file_path ──
    const getFileRes = await fetch(`${apiBase}/getFile?file_id=${fileId}`);
    const getFileData = await getFileRes.json();
    if (!getFileData.ok || !getFileData.result?.file_path) {
      return res.status(500).json({ error: "Gagal mendapatkan file_path dari Telegram", telegram_error: true });
    }

    // ── 4. Bangun URL publik ──
    const publicUrl = `https://api.telegram.org/file/bot${botToken}/${getFileData.result.file_path}`;

    return res.status(200).json({
      success   : true,
      url       : publicUrl,
      fileId    : fileId,
      filePath  : getFileData.result.file_path,
      fileSize  : getFileData.result.file_size || 0,
      isVideo   : isVideo,
      messageId : result.message_id,
      chatId    : result.chat?.id || chatId,
      thumbnailUrl: isVideo && result.video?.thumbnail
        ? `https://api.telegram.org/file/bot${botToken}/${result.video.thumbnail.file_path}`
        : null,
    });
  } catch (err) {
    console.error("[telegram/upload-return-url]", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
