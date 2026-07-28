// ================================================================
// VERCEL SERVERLESS — TELEGRAM BROADCAST TEXT MESSAGE
// Kirim pengumuman/pesan text ke group Telegram.
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
    const { text, parseMode, disableNotification, replyToMessageId } = body;

    if (!botToken || !chatId || !text) {
      return res.status(400).json({
        status: "error",
        message: "botToken, chatId, dan text wajib (bisa dari body atau env server)."
      });
    }

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode || "HTML",       // HTML atau MarkdownV2
        disable_notification: !!disableNotification,
        ...(replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}),
      }),
    });
    const tgData = await tgRes.json();

    if (!tgData.ok) {
      return res.status(400).json({ status: "error", message: tgData.description || "Gagal broadcast ke Telegram" });
    }

    return res.status(200).json({
      status: "success",
      messageId: tgData.result?.message_id,
      chatId: tgData.result?.chat?.id || chatId,
      result: tgData.result,
    });
  } catch (err) {
    console.error("[api/telegram/broadcast]", err);
    return res.status(500).json({ status: "error", message: err.message || "Internal server error" });
  }
}
