import { AppData, addLogAkses } from "./dataStore";
import { sendToTelegram as apiSendToTelegram, uploadToTelegram as apiUploadToTelegram } from "./apiClient";
import type { TelegramUploadResult } from "./apiClient";
import { KonfigurasiAPIItem, UserRole } from "../types";

/**
 * G.5 Keamanan Kredensial API - Cek Otoritas Super Admin
 */
export function cekAksesSuperAdmin(userRole: UserRole): boolean {
  return userRole === "SUPER_ADMIN";
}

/**
 * G.4 Fungsi Pengambilan Konfigurasi API (Dipakai Modul Lain seperti Galeri & AI Asisten)
 * Mengembalikan object { KEY: VALUE } untuk API tertentu.
 * Hanya dipanggil di server-side / consumer modules, nilai rahasia tidak dikirim mentah ke client non-admin.
 */
export function ambilKonfigAPIByNama(
  appData: AppData,
  namaAPI: string
): Record<string, string> | null {
  if (!appData.KonfigurasiAPI || appData.KonfigurasiAPI.length === 0) {
    return null;
  }

  const config = appData.KonfigurasiAPI.find(
    (item) => item.NamaAPI.toLowerCase() === namaAPI.toLowerCase() && item.Status === "Aktif"
  );

  if (!config) {
    return null;
  }

  const result: Record<string, string> = {};

  if (config.KeyField1 && config.ValueField1) {
    result[config.KeyField1] = config.ValueField1;
  }
  if (config.KeyField2 && config.ValueField2) {
    result[config.KeyField2] = config.ValueField2;
  }
  if (config.KeyField3 && config.ValueField3) {
    result[config.KeyField3] = config.ValueField3;
  }

  return result;
}

/**
 * G.4b Ambil Konfigurasi API berdasarkan Kategori (Dipakai untuk mencocokkan kategori API fleksibel)
 */
export function ambilKonfigAPIByKategori(
  appData: AppData,
  kategori: string
): Record<string, string> | null {
  if (!appData.KonfigurasiAPI || appData.KonfigurasiAPI.length === 0) {
    return null;
  }

  const config = appData.KonfigurasiAPI.find(
    (item) => item.Kategori.toLowerCase() === kategori.toLowerCase() && item.Status === "Aktif"
  );

  if (!config) {
    return null;
  }

  const result: Record<string, string> = {};

  if (config.KeyField1 && config.ValueField1) {
    result[config.KeyField1] = config.ValueField1;
  }
  if (config.KeyField2 && config.ValueField2) {
    result[config.KeyField2] = config.ValueField2;
  }
  if (config.KeyField3 && config.ValueField3) {
    result[config.KeyField3] = config.ValueField3;
  }

  return result;
}

/**
 * G.5 Sanitasi Konfigurasi API untuk Client Browser
 * Field ValueField1/2/3 disembunyikan (diberi mask) jika pengguna BUKAN Super Admin.
 */
export function sanitasiKonfigAPIUntukClient(
  configList: KonfigurasiAPIItem[] = [],
  userRole: UserRole
): KonfigurasiAPIItem[] {
  const isSA = cekAksesSuperAdmin(userRole);

  return configList.map((item) => {
    if (isSA) {
      return item; // Super Admin mendapatkan data lengkap
    }

    // Disembunyikan untuk role lain
    return {
      ...item,
      ValueField1: item.ValueField1 ? "••••••••" : undefined,
      ValueField2: item.ValueField2 ? "••••••••" : undefined,
      ValueField3: item.ValueField3 ? "••••••••" : undefined,
    };
  });
}

/**
 * Helper Simpan/Update Konfigurasi API (Hanya Super Admin)
 */
export function simpanKonfigurasiAPI(
  appData: AppData,
  newConfig: KonfigurasiAPIItem,
  operatorName: string,
  operatorRole: UserRole
): AppData {
  if (!cekAksesSuperAdmin(operatorRole)) {
    throw new Error("Akses Ditolak: Hanya Super Admin yang berhak mengelola kredensial API!");
  }

  const existingList = appData.KonfigurasiAPI || [];
  const index = existingList.findIndex((item) => item.ID === newConfig.ID || item.NamaAPI === newConfig.NamaAPI);

  let updatedList: KonfigurasiAPIItem[];
  if (index >= 0) {
    updatedList = [...existingList];
    updatedList[index] = newConfig;
  } else {
    updatedList = [newConfig, ...existingList];
  }

  const updatedData = {
    ...appData,
    KonfigurasiAPI: updatedList,
  };

  return addLogAkses(
    updatedData,
    operatorName,
    operatorRole,
    "CONFIG_API_UPDATE",
    `Memperbarui konfigurasi API: ${newConfig.NamaAPI}`
  );
}

/**
 * Upload media ke Telegram + dapatkan URL publik untuk storage
 * Return: URL publik Telegram (bisa dipakai di <img>/<video>) atau null jika gagal
 */
export async function uploadMediaToTelegram(
  appData  : AppData,
  fileData : string,  // base64 data URL
  fileName : string,
  fileType : string,
  caption ?: string
): Promise<TelegramUploadResult | null> {
  try {
    const tgConfig = ambilKonfigAPIByNama(appData, "Telegram Bot");
    if (!tgConfig?.BOT_TOKEN || !tgConfig?.CHAT_ID) {
      console.warn("[Telegram] Config tidak ditemukan — BOT_TOKEN atau CHAT_ID kosong");
      return null;
    }
    console.log("[Telegram] Config OK, mengupload...");

    // 1. TRY: Vercel serverless proxy
    try {
      const result = await apiUploadToTelegram(
        tgConfig.BOT_TOKEN, tgConfig.CHAT_ID,
        fileData, fileName, fileType, caption
      );
      if (result.ok && result.data?.url) {
        console.log("[Telegram] Upload via Vercel OK:", result.data.url);
        return result.data;
      }
      console.warn("[Telegram] Vercel proxy gagal:", result.error, "→ coba direct");
    } catch (e) {
      console.warn("[Telegram] Vercel proxy error:", e, "→ coba direct");
    }

    // 2. FALLBACK: Direct Telegram Bot API (bypass Vercel)
    try {
      const isVideo = (fileType || "").startsWith("video/");
      const method = isVideo ? "sendVideo" : "sendPhoto";
      const fieldName = isVideo ? "video" : "photo";
      
      // Convert base64 data URL to Blob
      let blob: Blob;
      if (fileData.startsWith("data:")) {
        const resp = await fetch(fileData);
        blob = await resp.blob();
      } else {
        // Raw URL — fetch and send as is
        blob = new Blob([fileData], { type: fileType });
      }

      const formData = new FormData();
      formData.append("chat_id", tgConfig.CHAT_ID);
      if (caption) formData.append("caption", caption);
      formData.append(fieldName, blob, fileName);

      const tgRes = await fetch(
        `https://api.telegram.org/bot${tgConfig.BOT_TOKEN}/${method}`,
        { method: "POST", body: formData }
      );
      const tgJson = await tgRes.json();
      
      if (tgJson.ok && tgJson.result) {
        const msg = tgJson.result;
        const media = isVideo ? msg.video : (msg.photo?.[msg.photo.length - 1] || msg.photo?.[0]);
        const fileId = media?.file_id || "";
        const url = fileId 
          ? `https://api.telegram.org/file/bot${tgConfig.BOT_TOKEN}/${fileId}`
          : "";
        console.log("[Telegram] Direct upload OK:", url || fileId);
        return { url: url || "tg://" + fileId, fileId: fileId || "", filePath: "", fileSize: 0, isVideo, messageId: msg.message_id || 0, chatId: tgConfig.CHAT_ID, fileName, fileType };
      }
      console.warn("[Telegram] Direct API gagal:", tgJson.description);
    } catch (e) {
      console.error("[Telegram] Direct API error:", e);
    }

    return null;
  } catch (err) {
    console.error("[Telegram] Upload error:", err);
    return null;
  }
}

/**
 * Kirim Foto/Video ke Telegram Bot (notifikasi saja — legacy)
 */
export async function sendMediaToTelegram(
  appData: AppData,
  mediaUrl: string,
  caption: string,
  isVideo: boolean
): Promise<void> {
  try {
    const tgConfig = ambilKonfigAPIByNama(appData, "Telegram Bot");
    if (!tgConfig || !tgConfig.BOT_TOKEN || !tgConfig.CHAT_ID) {
      return; // Telegram API belum dikonfigurasi atau tidak aktif
    }

    const result = await apiSendToTelegram(
      tgConfig.BOT_TOKEN,
      tgConfig.CHAT_ID,
      mediaUrl,
      caption,
      isVideo
    );
    if (result.ok) {
      console.log("Telegram sync result:", result.data);
    } else {
      console.warn("Telegram sync failed:", result.error);
    }
  } catch (err) {
    console.error("Failed to send media to Telegram:", err);
  }
}

