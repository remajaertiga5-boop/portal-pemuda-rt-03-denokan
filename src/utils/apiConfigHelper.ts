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
    if (!tgConfig?.BOT_TOKEN || !tgConfig?.CHAT_ID) return null;

    const result = await apiUploadToTelegram(
      tgConfig.BOT_TOKEN, tgConfig.CHAT_ID,
      fileData, fileName, fileType, caption
    );

    if (result.ok && result.data?.url) {
      console.log("[Telegram] Upload berhasil:", result.data.url);
      return result.data;
    }
    console.warn("[Telegram] Upload gagal:", result.error);
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

