import express from "express";
import path from "path";
import { Readable } from "stream";
import multer from "multer";
import { google } from "googleapis";
import { GoogleGenAI, Type } from "@google/genai";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const app  = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Dynamic PIN Generator (WIB UTC+7)
const OFFSET_WIB_MS = 7 * 60 * 60 * 1000;

function generateDynamicPinServer(offsetJam: number = 0): string {
  const epochUTC  = Date.now();
  const epochWIB  = epochUTC + OFFSET_WIB_MS + offsetJam * 60 * 60 * 1000;
  const wib       = new Date(epochWIB);
  const tahun     = wib.getUTCFullYear();
  const bulan     = String(wib.getUTCMonth() + 1).padStart(2, "0");
  const tanggal   = String(wib.getUTCDate()).padStart(2, "0");
  const jam       = String(wib.getUTCHours()).padStart(2, "0");
  return `${tahun}${bulan}${tanggal}${jam}`;
}

function validasiDynamicPinServer(pinInput: string): boolean {
  if (!pinInput || typeof pinInput !== "string") return false;
  const pinBersih = pinInput.trim();
  if (!/^\d{10}$/.test(pinBersih)) return false;
  const pinSekarang  = generateDynamicPinServer(0);
  const pinSejamLalu = generateDynamicPinServer(-1);
  const pinSejamLagi = generateDynamicPinServer(1);
  return (
    pinBersih === pinSekarang ||
    pinBersih === pinSejamLalu ||
    pinBersih === pinSejamLagi
  );
}

// Health Check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "Backend Pandawa Ertiga berjalan" });
});

// Debug PIN
app.get("/api/auth/debug-pin", (_req, res) => {
  res.json({
    pinSekarang   : generateDynamicPinServer(0),
    pinSejamLalu  : generateDynamicPinServer(-1),
    pinSejamLagi  : generateDynamicPinServer(1),
    waktuServerUTC: new Date().toISOString(),
  });
});

// Auth Routes
app.post("/api/auth/login", (req, res) => {
  const { idAnggota, password } = req.body;
  if (!idAnggota) {
    return res.status(400).json({ status: "error", message: "ID Anggota wajib diisi" });
  }
  return res.json({
    status        : "success",
    token         : `token_${idAnggota}_${Date.now()}`,
    perluAturSandi: !password,
    role          : idAnggota === "1000000001" ? "super_admin" : "anggota",
    namaPanggilan : idAnggota === "1000000001" ? "Super Admin" : "Anggota",
  });
});

app.post("/api/auth/login-pin-darurat", (req, res) => {
  const { idSuperAdmin, pinDarurat } = req.body;
  if (!idSuperAdmin || !pinDarurat) {
    return res
      .status(400)
      .json({ status: "error", message: "ID Super Admin dan PIN wajib diisi" });
  }
  if (!validasiDynamicPinServer(pinDarurat)) {
    return res.status(401).json({
      status : "error",
      message: "PIN darurat salah atau sudah kedaluwarsa (Format: YYYYMMDDHH WIB 10 digit)",
    });
  }
  return res.json({
    status : "success",
    token  : `token_emergency_${idSuperAdmin}_${Date.now()}`,
    role   : "super_admin",
    message: "Login darurat berhasil. Silakan atur ulang password Anda segera.",
  });
});

const upload = multer({ storage: multer.memoryStorage() });

app.get("/api/config", (_req, res) => {
  let clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "";
  if (!clientId) {
    try {
      const fbConfig = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8")
      );
      clientId = fbConfig.oAuthClientId || "";
    } catch (e) {
      console.error("Failed to read firebase config", e);
    }
  }
  res.json({ clientId });
});

const getOAuth2Client = (token: string) => {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: token });
  return oauth2Client;
};

const FOLDER_NAME = "Aplikasi Remaja Legok 03";
const SHEET_NAME  = "Database Remaja Legok 03";

const TABLES: Record<string, string[]> = {
  Anggota   : ["ID", "Nama Lengkap", "Panggilan", "No HP", "Alamat", "Status"],
  Agenda    : ["ID", "Tanggal", "Waktu", "Nama Kegiatan", "Lokasi", "Keterangan"],
  Pengumuman: ["ID", "Tanggal", "Judul", "Isi", "Penulis"],
  Kas       : ["ID", "Tanggal", "Jenis", "Nominal", "Keterangan"],
  Aspirasi  : ["ID", "Tanggal", "Usulan", "Pengirim"],
  Galeri    : ["ID", "Tanggal", "Kegiatan", "Caption", "Link Foto"],
};

async function initDB(
  drive : ReturnType<typeof google.drive>,
  sheets: ReturnType<typeof google.sheets>
) {
  let folderId: string | undefined;
  const folderRes = await drive.files.list({
    q     : `mimeType='application/vnd.google-apps.folder' and name='${FOLDER_NAME}' and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
  });
  if (folderRes.data.files && folderRes.data.files.length > 0) {
    folderId = folderRes.data.files[0].id!;
  } else {
    const folder = await drive.files.create({
      requestBody: { name: FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" },
      fields      : "id",
    });
    folderId = folder.data.id!;
  }

  let spreadsheetId: string | undefined;
  const sheetRes = await drive.files.list({
    q     : `mimeType='application/vnd.google-apps.spreadsheet' and name='${SHEET_NAME}' and '${folderId}' in parents and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
  });

  if (sheetRes.data.files && sheetRes.data.files.length > 0) {
    spreadsheetId = sheetRes.data.files[0].id!;
  } else {
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: SHEET_NAME },
        sheets    : Object.keys(TABLES).map(title => ({ properties: { title } })),
      },
    });
    spreadsheetId = spreadsheet.data.spreadsheetId!;

    await drive.files.update({
      fileId    : spreadsheetId,
      addParents: folderId,
      fields    : "id, parents",
    });

    for (const [sheetName, headers] of Object.entries(TABLES)) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range           : `${sheetName}!A1:Z1`,
        valueInputOption: "USER_ENTERED",
        requestBody     : { values: [headers] },
      });
    }
  }

  return { folderId, spreadsheetId };
}

// Fetch all data
app.get("/api/data", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const auth   = getOAuth2Client(token);
    const drive  = google.drive({ version: "v3", auth });
    const sheets = google.sheets({ version: "v4", auth });

    const { spreadsheetId } = await initDB(drive, sheets);
    const db: Record<string, any[]> = {};

    for (const sheetName of Object.keys(TABLES)) {
      const sheetData = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A2:Z`,
      });
      const rows    = sheetData.data.values || [];
      const headers = TABLES[sheetName];
      db[sheetName] = rows.map(row => {
        const obj: Record<string, string> = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || "";
        });
        return obj;
      });
    }

    res.json(db);
  } catch (error: any) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: error.message });
  }
});

// Append data
app.post("/api/data/:table", upload.single("photo"), async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const table = req.params.table as keyof typeof TABLES;
    if (!TABLES[table]) return res.status(400).json({ error: "Invalid table" });

    const auth   = getOAuth2Client(token);
    const drive  = google.drive({ version: "v3", auth });
    const sheets = google.sheets({ version: "v4", auth });

    const { folderId, spreadsheetId } = await initDB(drive, sheets);
    const headers = TABLES[table];
    const rowData: string[] = [];
    const id = Date.now().toString();

    let photoLink = "";
    if (req.file) {
      const stream = new Readable();
      stream.push(req.file.buffer);
      stream.push(null);

      const uploadedFile = await drive.files.create({
        requestBody: { name: req.file.originalname, parents: [folderId!] },
        media       : { mimeType: req.file.mimetype, body: stream },
        fields      : "id, webContentLink, webViewLink",
      });

      if (uploadedFile.data.id) {
        await drive.permissions.create({
          fileId     : uploadedFile.data.id,
          requestBody: { role: "reader", type: "anyone" },
        });
      }
      photoLink =
        uploadedFile.data.webContentLink || uploadedFile.data.webViewLink || "";
    }

    headers.forEach(header => {
      if (header === "ID")            rowData.push(id);
      else if (header === "Link Foto") rowData.push(photoLink);
      else                             rowData.push(req.body[header] || "");
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range           : `${table}!A:Z`,
      valueInputOption: "USER_ENTERED",
      requestBody     : { values: [rowData] },
    });

    res.json({ success: true, id });
  } catch (error: any) {
    console.error("Error saving data:", error);
    res.status(500).json({ error: error.message });
  }
});

// Role and Table Permission Checker
const periksaOtorisasi = (
  role  : string,
  tabel : string,
  action: string
): { authorized: boolean; message: string } => {
  const userRole = (role || "TAMU").toUpperCase();

  if (userRole === "SUPER_ADMIN" || userRole === "KETUA")
    return { authorized: true, message: "" };

  if (action === "baca") return { authorized: true, message: "" };

  if (userRole === "SEKRETARIS" || userRole === "WAKIL_SEKRETARIS") {
    if (["Agenda", "Pengumuman", "Anggota", "Aspirasi"].includes(tabel))
      return { authorized: true, message: "" };
    return {
      authorized: false,
      message   : `Akses Ditolak. Role ${userRole} tidak berwenang modifikasi tabel ${tabel}.`,
    };
  }

  if (userRole === "BENDAHARA" || userRole === "WAKIL_BENDAHARA") {
    if (["Kas", "Iuran"].includes(tabel)) return { authorized: true, message: "" };
    return {
      authorized: false,
      message   : `Akses Ditolak. Role ${userRole} tidak berwenang modifikasi tabel ${tabel}.`,
    };
  }

  if (userRole === "HUMAS" || userRole === "KEPALA_HUMAS") {
    if (["Agenda", "Pengumuman", "Aspirasi"].includes(tabel))
      return { authorized: true, message: "" };
    return {
      authorized: false,
      message   : `Akses Ditolak. Role ${userRole} tidak berwenang modifikasi tabel ${tabel}.`,
    };
  }

  if (tabel === "Aspirasi" && action === "tambah")
    return { authorized: true, message: "" };

  return {
    authorized: false,
    message   : `Akses Ditolak. Role (${userRole}) tidak memiliki wewenang administratif.`,
  };
};

// AI Chat Endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, appData, userRole } = req.body;
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Gemini API key is not configured." });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const contents = history.map((msg: any) => ({
      role : msg.role === "model" ? "model" : "user",
      parts: [{ text: msg.text }],
    }));
    contents.push({ role: "user", parts: [{ text: message }] });

    const tools: any[] = [
      {
        functionDeclarations: [
          {
            name       : "baca_data",
            description: "Membaca data dari tabel tertentu.",
            parameters : {
              type      : Type.OBJECT,
              properties: {
                tabel        : { type: Type.STRING, enum: ["Anggota","Agenda","Pengumuman","Kas","Iuran","Aspirasi"] },
                filterKeyword: { type: Type.STRING },
              },
              required: ["tabel"],
            },
          },
          {
            name       : "tambah_atau_update_item",
            description: "Menambahkan atau memperbarui item di tabel.",
            parameters : {
              type      : Type.OBJECT,
              properties: {
                tabel : { type: Type.STRING, enum: ["Anggota","Agenda","Pengumuman","Kas","Iuran","Aspirasi"] },
                action: { type: Type.STRING, enum: ["tambah","edit"] },
                idItem: { type: Type.STRING },
                data  : {
                  type      : Type.OBJECT,
                  properties: {
                    Nama_Lengkap   : { type: Type.STRING },
                    Nama_Panggilan : { type: Type.STRING },
                    Jabatan        : { type: Type.STRING },
                    Alamat         : { type: Type.STRING },
                    No_HP          : { type: Type.STRING },
                    Jenis_Kelamin  : { type: Type.STRING },
                    Tanggal_Lahir  : { type: Type.STRING },
                    Tanggal        : { type: Type.STRING },
                    Waktu          : { type: Type.STRING },
                    Nama_Kegiatan  : { type: Type.STRING },
                    Lokasi         : { type: Type.STRING },
                    Keterangan     : { type: Type.STRING },
                    Judul          : { type: Type.STRING },
                    Isi            : { type: Type.STRING },
                    Jenis          : { type: Type.STRING },
                    Nominal        : { type: Type.NUMBER },
                    ID_Anggota     : { type: Type.STRING },
                    Nama_Anggota   : { type: Type.STRING },
                    Bulan          : { type: Type.STRING },
                    Tahun          : { type: Type.NUMBER },
                    Jumlah         : { type: Type.NUMBER },
                    Status         : { type: Type.STRING },
                    Usulan         : { type: Type.STRING },
                    Pengirim       : { type: Type.STRING },
                  },
                },
              },
              required: ["tabel","action","data"],
            },
          },
          {
            name       : "hapus_item",
            description: "Menghapus item berdasarkan ID.",
            parameters : {
              type      : Type.OBJECT,
              properties: {
                tabel : { type: Type.STRING, enum: ["Anggota","Agenda","Pengumuman","Kas","Iuran","Aspirasi"] },
                idItem: { type: Type.STRING },
              },
              required: ["tabel","idItem"],
            },
          },
        ],
      },
    ];

    let appDataChanged = false;
    let updatedAppData: Record<string, any[]> = {
      Anggota   : Array.isArray(appData?.Anggota)    ? [...appData.Anggota]    : [],
      Agenda    : Array.isArray(appData?.Agenda)     ? [...appData.Agenda]     : [],
      Pengumuman: Array.isArray(appData?.Pengumuman) ? [...appData.Pengumuman] : [],
      Kas       : Array.isArray(appData?.Kas)        ? [...appData.Kas]        : [],
      Iuran     : Array.isArray(appData?.Iuran)      ? [...appData.Iuran]      : [],
      Aspirasi  : Array.isArray(appData?.Aspirasi)   ? [...appData.Aspirasi]   : [],
    };

    const response = await ai.models.generateContent({
      model   : "gemini-2.0-flash",
      contents,
      config  : {
        systemInstruction: `Kamu adalah asisten AI ramah bernama "Asisten Pemuda" untuk Remaja RT 03 RW 04 Denokan, Gondoryo, Jambu, Semarang. Role user saat ini: ${userRole || "TAMU"}.`,
        tools,
      },
    });

    const functionCalls = response.functionCalls;
    let replyText = response.text || "";

    if (functionCalls && functionCalls.length > 0) {
      const modelTurn = response.candidates?.[0]?.content;
      if (modelTurn) contents.push(modelTurn);

      const functionResponseParts: any[] = [];

      for (const call of functionCalls) {
        const { name, args } = call;
        let result: any = null;

        try {
          if (name === "baca_data") {
            const { tabel, filterKeyword } = args as any;
            const list: any[] = updatedAppData[tabel] || [];
            const filtered = filterKeyword
              ? list.filter(item =>
                  JSON.stringify(item)
                    .toLowerCase()
                    .includes((filterKeyword as string).toLowerCase())
                )
              : list;
            result = { status: "success", count: filtered.length, data: filtered.slice(0, 30) };

          } else if (name === "tambah_atau_update_item") {
            const { tabel, action, idItem, data } = args as any;

            if (action === "tambah") {
              const auth = periksaOtorisasi(userRole, tabel, "tambah");
              if (!auth.authorized) {
                result = { error: auth.message };
              } else {
                const uniqueId = `${tabel.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;
                const newItem  = {
                  ...data,
                  ID     : uniqueId,
                  Tanggal: data.Tanggal || new Date().toISOString().split("T")[0],
                };
                if (tabel === "Anggota") newItem.ID_Anggota = uniqueId;
                updatedAppData[tabel] = [...(updatedAppData[tabel] || []), newItem];
                appDataChanged = true;
                result = { status: "success", id: uniqueId, message: `Berhasil menambahkan ke ${tabel}.` };
              }
            } else if (action === "edit") {
              if (!idItem) {
                result = { error: "ID Item wajib diisi untuk edit." };
              } else {
                const auth = periksaOtorisasi(userRole, tabel, "edit");
                if (!auth.authorized) {
                  result = { error: auth.message };
                } else {
                  const list = [...(updatedAppData[tabel] || [])];
                  const idx  = list.findIndex(
                    (item: any) => item.ID === idItem || item.ID_Anggota === idItem
                  );
                  if (idx === -1) {
                    result = { error: `Item ID ${idItem} tidak ditemukan.` };
                  } else {
                    list[idx]             = { ...list[idx], ...data };
                    updatedAppData[tabel] = list;
                    appDataChanged        = true;
                    result = { status: "success", message: `Berhasil update ${tabel}.` };
                  }
                }
              }
            }

          } else if (name === "hapus_item") {
            const { tabel, idItem } = args as any;
            const auth = periksaOtorisasi(userRole, tabel, "hapus");
            if (!auth.authorized) {
              result = { error: auth.message };
            } else {
              const before          = updatedAppData[tabel]?.length || 0;
              updatedAppData[tabel] = (updatedAppData[tabel] || []).filter(
                (item: any) => item.ID !== idItem && item.ID_Anggota !== idItem
              );
              const found = updatedAppData[tabel].length < before;
              if (!found) {
                result = { error: `ID ${idItem} tidak ditemukan.` };
              } else {
                appDataChanged = true;
                result = { status: "success", message: `Berhasil hapus dari ${tabel}.` };
              }
            }
          }
        } catch (err: any) {
          result = { error: err.message };
        }

        functionResponseParts.push({ functionResponse: { name, response: result } });
      }

      contents.push({ role: "user", parts: functionResponseParts });

      const secondResponse = await ai.models.generateContent({
        model  : "gemini-2.0-flash",
        contents,
        config : {
          systemInstruction:
            `Kamu adalah asisten AI ramah bernama "Asisten Pemuda". Jelaskan hasil eksekusi tool di atas secara jelas kepada pengguna.`,
        },
      });
      replyText = secondResponse.text || "";
    }

    res.json({
      reply          : replyText,
      updatedAppData : appDataChanged ? updatedAppData : undefined,
    });
  } catch (error: any) {
    console.error("Chat error:", error);
    res.status(500).json({ error: error.message });
  }
});

// AI Draft Endpoint
app.post("/api/ai/draft", async (req, res) => {
  try {
    const { prompt, type } = req.body;
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Gemini API key is not configured." });
    }
    const ai       = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model   : "gemini-2.0-flash",
      contents: `Buatkan draft untuk ${type} dengan detail berikut: ${prompt}`,
      config  : {
        systemInstruction:
          "Kamu adalah asisten pengurus Remaja RT 03 RW 04 Denokan. Buatkan teks yang siap pakai.",
      },
    });
    res.json({ result: response.text });
  } catch (error: any) {
    console.error("AI Draft error:", error);
    res.status(500).json({ error: error.message });
  }
});

// R2 Upload
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    const accountId       = process.env.VITE_R2_ACCOUNT_ID;
    const accessKeyId     = process.env.VITE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.VITE_R2_SECRET_ACCESS_KEY;
    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error("Missing Cloudflare R2 environment credentials");
    }
    s3Client = new S3Client({
      region     : "auto",
      endpoint   : `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return s3Client;
}

app.post("/api/upload-r2", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file was uploaded." });

    const folder     = req.body.folder || "umum";
    const s3         = getS3Client();
    const bucketName = process.env.VITE_R2_BUCKET_NAME || "remaja-legok-03";
    const publicUrl  = process.env.VITE_R2_PUBLIC_URL   || "";

    if (!publicUrl) {
      return res.status(500).json({ error: "R2 public domain is not configured." });
    }

    const cleanFileName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileKey       = `${folder}/${Date.now()}-${cleanFileName}`;

    await s3.send(
      new PutObjectCommand({
        Bucket     : bucketName,
        Key        : fileKey,
        Body       : req.file.buffer,
        ContentType: req.file.mimetype,
      })
    );

    res.status(200).json({
      success : true,
      url     : `${publicUrl.replace(/\/$/, "")}/${fileKey}`,
      key     : fileKey,
      size    : req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (error: any) {
    console.error("R2 Upload error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Sheets Proxy
app.post("/api/sheets-proxy", async (req, res) => {
  const scriptUrl = process.env.VITE_GOOGLE_SCRIPT_URL;
  if (!scriptUrl) {
    return res
      .status(500)
      .json({ error: "VITE_GOOGLE_SCRIPT_URL is not configured." });
  }
  try {
    const bodyData = {
      ...req.body,
      spreadsheetId : process.env.VITE_SHEETS_ID,
      sheetsId      : process.env.VITE_SHEETS_ID,
      VITE_SHEETS_ID: process.env.VITE_SHEETS_ID,
    };
    const response = await fetch(scriptUrl, {
      method : "POST",
      headers: { "Content-Type": "application/json" },
      body   : JSON.stringify(bodyData),
    });
    const data = await response.json();
    res.status(200).json(data);
  } catch (error: any) {
    console.error("Sheets Proxy error:", error);
    res
      .status(500)
      .json({ error: "Failed to communicate with Google Sheets: " + error.message });
  }
});

// Telegram Send Media
app.post("/api/telegram/send-media", async (req, res) => {
  try {
    const { botToken, chatId, mediaUrl, caption, isVideo } = req.body;
    if (!botToken || !chatId || !mediaUrl) {
      return res
        .status(400)
        .json({ status: "error", message: "Bot Token, Chat ID, dan Media URL wajib diisi" });
    }

    const method         = isVideo ? "sendVideo" : "sendPhoto";
    const fieldName      = isVideo ? "video"     : "photo";
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/${method}`;

    if (mediaUrl.startsWith("data:")) {
      const matches = mediaUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        return res
          .status(400)
          .json({ status: "error", message: "Format Data URL tidak valid" });
      }
      const mimeType = matches[1];
      const buffer   = Buffer.from(matches[2], "base64");
      const formData = new FormData();
      formData.append("chat_id", chatId);
      if (caption) formData.append("caption", caption);
      formData.append(
        fieldName,
        new Blob([buffer], { type: mimeType }),
        isVideo ? "upload.mp4" : "upload.jpg"
      );
      const tgRes  = await fetch(telegramApiUrl, { method: "POST", body: formData });
      const tgData = (await tgRes.json()) as any;
      if (!tgData.ok) {
        return res
          .status(400)
          .json({ status: "error", message: tgData.description || "Gagal kirim ke Telegram" });
      }
      return res.json({ status: "success", result: tgData.result });
    } else {
      const tgRes  = await fetch(telegramApiUrl, {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({
          chat_id: chatId,
          [fieldName]: mediaUrl,
          caption    : caption || "",
        }),
      });
      const tgData = (await tgRes.json()) as any;
      if (!tgData.ok) {
        return res
          .status(400)
          .json({ status: "error", message: tgData.description || "Gagal kirim URL ke Telegram" });
      }
      return res.json({ status: "success", result: tgData.result });
    }
  } catch (err: any) {
    console.error("Telegram send error:", err);
    res.status(500).json({ status: "error", message: err.message || "Internal server error" });
  }
});

// Start Server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server : { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
