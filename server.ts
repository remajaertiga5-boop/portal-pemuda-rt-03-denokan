import express from "express";
import path from "path";
import multer from "multer";
import { google } from "googleapis";
import { GoogleGenAI, Type } from "@google/genai";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Dynamic PIN Generator (WIB UTC+7) for Server
const OFFSET_WIB_MS = 7 * 60 * 60 * 1000; // UTC+7

function generateDynamicPinServer(offsetJam: number = 0): string {
  const epochUTC = Date.now();
  const epochWIB = epochUTC + OFFSET_WIB_MS + (offsetJam * 60 * 60 * 1000);
  const wib = new Date(epochWIB);

  const tahun = wib.getUTCFullYear();
  const bulan = String(wib.getUTCMonth() + 1).padStart(2, '0');
  const tanggal = String(wib.getUTCDate()).padStart(2, '0');
  const jam = String(wib.getUTCHours()).padStart(2, '0');

  return `${tahun}${bulan}${tanggal}${jam}`;
}

function validasiDynamicPinServer(pinInput: string): boolean {
  if (!pinInput || typeof pinInput !== 'string') return false;
  const pinBersih = pinInput.trim();
  if (!/^\d{10}$/.test(pinBersih)) return false;

  const pinSekarang = generateDynamicPinServer(0);
  const pinSejamLalu = generateDynamicPinServer(-1);
  const pinSejamLagi = generateDynamicPinServer(1);

  return pinBersih === pinSekarang || pinBersih === pinSejamLalu || pinBersih === pinSejamLagi;
}

// Health Check Endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Backend Pandawa Ertiga berjalan" });
});

// Debug PIN Endpoint (for testing)
app.get("/api/auth/debug-pin", (req, res) => {
  res.json({
    pinSekarang: generateDynamicPinServer(0),
    pinSejamLalu: generateDynamicPinServer(-1),
    pinSejamLagi: generateDynamicPinServer(1),
    waktuServerUTC: new Date().toISOString(),
  });
});

// Auth Routes
app.post("/api/auth/login", (req, res) => {
  const { idAnggota, password } = req.body;
  if (!idAnggota) {
    return res.status(400).json({ status: "error", message: "ID Anggota wajib diisi" });
  }

  // Sample or Firestore-integrated login response
  return res.json({
    status: "success",
    token: `token_${idAnggota}_${Date.now()}`,
    perluAturSandi: !password,
    role: idAnggota === "1000000001" ? "super_admin" : "anggota",
    namaPanggilan: idAnggota === "1000000001" ? "Super Admin" : "Anggota",
  });
});

app.post("/api/auth/login-pin-darurat", (req, res) => {
  const { idSuperAdmin, pinDarurat } = req.body;
  if (!idSuperAdmin || !pinDarurat) {
    return res.status(400).json({ status: "error", message: "ID Super Admin dan PIN wajib diisi" });
  }

  if (!validasiDynamicPinServer(pinDarurat)) {
    return res.status(401).json({
      status: "error",
      message: "PIN darurat salah atau sudah kedaluwarsa (Format: YYYYMMDDHH WIB 10 digit)",
    });
  }

  return res.json({
    status: "success",
    token: `token_emergency_${idSuperAdmin}_${Date.now()}`,
    role: "super_admin",
    message: "Login darurat berhasil. Silakan atur ulang password Anda segera.",
  });
});

const upload = multer({ storage: multer.memoryStorage() });

app.get("/api/config", (req, res) => {
  let clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "";
  if (!clientId) {
    try {
      const fbConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));
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
const SHEET_NAME = "Database Remaja Legok 03";

const TABLES = {
  Anggota: ["ID", "Nama Lengkap", "Panggilan", "No HP", "Alamat", "Status"],
  Agenda: ["ID", "Tanggal", "Waktu", "Nama Kegiatan", "Lokasi", "Keterangan"],
  Pengumuman: ["ID", "Tanggal", "Judul", "Isi", "Penulis"],
  Kas: ["ID", "Tanggal", "Jenis", "Nominal", "Keterangan"],
  Aspirasi: ["ID", "Tanggal", "Usulan", "Pengirim"],
  Galeri: ["ID", "Tanggal", "Kegiatan", "Caption", "Link Foto"],
};

async function initDB(drive: any, sheets: any) {
  // 1. Get or create folder
  let folderId;
  const folderRes = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.folder' and name='${FOLDER_NAME}' and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
  });
  if (folderRes.data.files && folderRes.data.files.length > 0) {
    folderId = folderRes.data.files[0].id;
  } else {
    const folder = await drive.files.create({
      requestBody: { name: FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" },
      fields: "id",
    });
    folderId = folder.data.id;
  }

  // 2. Get or create spreadsheet
  let spreadsheetId;
  const sheetRes = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.spreadsheet' and name='${SHEET_NAME}' and '${folderId}' in parents and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
  });

  if (sheetRes.data.files && sheetRes.data.files.length > 0) {
    spreadsheetId = sheetRes.data.files[0].id;
  } else {
    // Create new spreadsheet
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: SHEET_NAME },
        sheets: Object.keys(TABLES).map(title => ({ properties: { title } }))
      },
    });
    spreadsheetId = spreadsheet.data.spreadsheetId;
    
    // Move to folder
    await drive.files.update({
      fileId: spreadsheetId,
      addParents: folderId,
      fields: "id, parents",
    });

    // Add headers to all sheets
    for (const [sheetName, headers] of Object.entries(TABLES)) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:Z1`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [headers] },
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

    const auth = getOAuth2Client(token);
    const drive = google.drive({ version: "v3", auth });
    const sheets = google.sheets({ version: "v4", auth });

    const { spreadsheetId } = await initDB(drive, sheets);
    const db: any = {};

    for (const sheetName of Object.keys(TABLES)) {
      const sheetData = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A2:Z`,
      });
      const rows = sheetData.data.values || [];
      const headers = TABLES[sheetName as keyof typeof TABLES];
      
      db[sheetName] = rows.map(row => {
        const obj: any = {};
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

    const auth = getOAuth2Client(token);
    const drive = google.drive({ version: "v3", auth });
    const sheets = google.sheets({ version: "v4", auth });

    const { folderId, spreadsheetId } = await initDB(drive, sheets);
    const headers = TABLES[table];
    const rowData: string[] = [];
    const id = Date.now().toString();

    let photoLink = "";
    if (req.file) {
      const { Readable } = require("stream");
      const stream = new Readable();
      stream.push(req.file.buffer);
      stream.push(null);

      const uploadedFile = await drive.files.create({
        requestBody: { name: req.file.originalname, parents: [folderId] },
        media: { mimeType: req.file.mimetype, body: stream },
        fields: "id, webContentLink, webViewLink",
      });
      
      if (uploadedFile.data.id) {
        await drive.permissions.create({
          fileId: uploadedFile.data.id,
          requestBody: { role: "reader", type: "anyone" },
        });
      }
      photoLink = uploadedFile.data.webContentLink || uploadedFile.data.webViewLink || "";
    }

    headers.forEach(header => {
      if (header === "ID") rowData.push(id);
      else if (header === "Link Foto") rowData.push(photoLink);
      else rowData.push(req.body[header] || "");
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${table}!A:Z`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [rowData] },
    });

    res.json({ success: true, id });
  } catch (error: any) {
    console.error("Error saving data:", error);
    res.status(500).json({ error: error.message });
  }
});

// Role and Table Permission Checker
const periksaOtorisasi = (role: string, tabel: string, action: string): { authorized: boolean; message: string } => {
  const userRole = (role || "TAMU").toUpperCase();
  
  if (userRole === "SUPER_ADMIN" || userRole === "KETUA") {
    return { authorized: true, message: "" };
  }
  
  if (action === "baca") {
    return { authorized: true, message: "" };
  }
  
  // Sekretaris mengurus Agenda, Pengumuman, Anggota, Aspirasi
  if (userRole === "SEKRETARIS" || userRole === "WAKIL_SEKRETARIS") {
    if (["Agenda", "Pengumuman", "Anggota", "Aspirasi"].includes(tabel)) {
      return { authorized: true, message: "" };
    }
    return { 
      authorized: false, 
      message: `Akses Ditolak. Role Anda sebagai ${userRole} tidak memiliki wewenang untuk memodifikasi tabel ${tabel}. Hubungi Ketua atau Super Admin.` 
    };
  }
  
  // Bendahara mengurus Kas, Iuran
  if (userRole === "BENDAHARA" || userRole === "WAKIL_BENDAHARA") {
    if (["Kas", "Iuran"].includes(tabel)) {
      return { authorized: true, message: "" };
    }
    return { 
      authorized: false, 
      message: `Akses Ditolak. Role Anda sebagai ${userRole} tidak memiliki wewenang untuk memodifikasi tabel ${tabel}.` 
    };
  }
  
  // Humas mengurus Agenda, Pengumuman, Aspirasi
  if (userRole === "HUMAS" || userRole === "KEPALA_HUMAS") {
    if (["Agenda", "Pengumuman", "Aspirasi"].includes(tabel)) {
      return { authorized: true, message: "" };
    }
    return { 
      authorized: false, 
      message: `Akses Ditolak. Role Anda sebagai ${userRole} tidak memiliki wewenang untuk memodifikasi tabel ${tabel}.` 
    };
  }
  
  // Semua orang (termasuk TAMU/ANGGOTA) bisa menyampaikan aspirasi
  if (tabel === "Aspirasi" && action === "tambah") {
    return { authorized: true, message: "" };
  }
  
  return { 
    authorized: false, 
    message: `Akses Ditolak. Role Anda (${userRole}) tidak memiliki wewenang administratif untuk memodifikasi data ${tabel}.` 
  };
};

// AI endpoints
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, appData, userRole } = req.body;
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Gemini API key is not configured." });
    }
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const contents = history.map((msg: any) => ({
      role: msg.role === "model" ? "model" : "user",
      parts: [{ text: msg.text }]
    }));
    contents.push({ role: "user", parts: [{ text: message }] });

    // Define Tools for Gemini
    const tools: any[] = [
      {
        functionDeclarations: [
          {
            name: "baca_data",
            description: "Membaca data dari tabel tertentu seperti Anggota, Agenda, Pengumuman, Kas, Iuran, atau Aspirasi untuk menjawab pertanyaan user.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                tabel: {
                  type: Type.STRING,
                  description: "Nama tabel yang ingin dibaca.",
                  enum: ["Anggota", "Agenda", "Pengumuman", "Kas", "Iuran", "Aspirasi"],
                },
                filterKeyword: {
                  type: Type.STRING,
                  description: "Kata kunci pencarian opsional (misal nama anggota, judul pengumuman, dll).",
                },
              },
              required: ["tabel"],
            },
          },
          {
            name: "tambah_atau_update_item",
            description: "Menambahkan item baru atau memperbarui (mengedit) item yang sudah ada di tabel tertentu.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                tabel: {
                  type: Type.STRING,
                  description: "Nama tabel target.",
                  enum: ["Anggota", "Agenda", "Pengumuman", "Kas", "Iuran", "Aspirasi"],
                },
                action: {
                  type: Type.STRING,
                  description: "Aksi yang dilakukan: 'tambah' untuk membuat baru, 'edit' untuk memperbarui yang sudah ada.",
                  enum: ["tambah", "edit"],
                },
                idItem: {
                  type: Type.STRING,
                  description: "ID unik dari item yang ingin diedit (misal 'RL03-001' untuk Anggota, atau ID numerik/string untuk yang lain). Kosongkan jika aksi adalah 'tambah'.",
                },
                data: {
                  type: Type.OBJECT,
                  description: "Key-value pair data baru. Masukkan field-field yang ingin ditambahkan atau diubah.",
                  properties: {
                    // Anggota
                    Nama_Lengkap: { type: Type.STRING },
                    Nama_Panggilan: { type: Type.STRING },
                    Jabatan: { type: Type.STRING },
                    Alamat: { type: Type.STRING },
                    No_HP: { type: Type.STRING },
                    Jenis_Kelamin: { type: Type.STRING },
                    Tanggal_Lahir: { type: Type.STRING },
                    Minat_Bakat: { type: Type.STRING },
                    Status_Aktif: { type: Type.STRING },
                    
                    // Agenda / Pengumuman / Kas / Aspirasi umum
                    Tanggal: { type: Type.STRING },
                    Waktu: { type: Type.STRING },
                    Nama_Kegiatan: { type: Type.STRING },
                    Lokasi: { type: Type.STRING },
                    Keterangan: { type: Type.STRING },
                    Status_Tampil: { type: Type.STRING },

                    Judul: { type: Type.STRING },
                    Isi: { type: Type.STRING },
                    Kategori: { type: Type.STRING },

                    Jenis: { type: Type.STRING },
                    Nominal: { type: Type.NUMBER },

                    // Iuran
                    ID_Anggota: { type: Type.STRING },
                    Nama_Anggota: { type: Type.STRING },
                    Bulan: { type: Type.STRING },
                    Tahun: { type: Type.NUMBER },
                    Jumlah: { type: Type.NUMBER },
                    Status: { type: Type.STRING },
                    Tanggal_Bayar: { type: Type.STRING },

                    // Aspirasi
                    Usulan: { type: Type.STRING },
                    Pengirim: { type: Type.STRING }
                  }
                }
              },
              required: ["tabel", "action", "data"],
            },
          },
          {
            name: "hapus_item",
            description: "Menghapus item tertentu dari tabel berdasarkan ID.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                tabel: {
                  type: Type.STRING,
                  description: "Nama tabel target.",
                  enum: ["Anggota", "Agenda", "Pengumuman", "Kas", "Iuran", "Aspirasi"],
                },
                idItem: {
                  type: Type.STRING,
                  description: "ID unik item yang ingin dihapus.",
                },
              },
              required: ["tabel", "idItem"],
            },
          }
        ]
      }
    ];

    let appDataChanged = false;
    let updatedAppData = appData ? { ...appData } : {};
    if (!updatedAppData.Anggota) updatedAppData.Anggota = [];
    if (!updatedAppData.Agenda) updatedAppData.Agenda = [];
    if (!updatedAppData.Pengumuman) updatedAppData.Pengumuman = [];
    if (!updatedAppData.Kas) updatedAppData.Kas = [];
    if (!updatedAppData.Iuran) updatedAppData.Iuran = [];
    if (!updatedAppData.Aspirasi) updatedAppData.Aspirasi = [];

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: contents,
      config: {
        systemInstruction: `Kamu adalah asisten AI ramah, cerdas, dan jujur bernama "Asisten Pemuda" untuk Remaja RT 03 RW 04 Denokan, Gondoryo, Jambu, Semarang.
Tugas utama Anda adalah membantu pengurus dan anggota mengelola data, menjawab pertanyaan, membuat ide kegiatan, atau menulis caption sosial media.
Gunakan bahasa Indonesia yang santai, akrab, tapi tetap sopan.
Anda memiliki akses ke tools (baca_data, tambah_atau_update_item, hapus_item) yang memungkinkan Anda langsung berinteraksi dengan database lokal aplikasi secara nyata.
Informasikan selalu kepada pengguna jika Anda telah sukses membaca, menambah, mengubah, atau menghapus data.
Role Anda saat ini melayani pengguna dengan Role: ${userRole || "TAMU"}. Selalu verifikasi bahwa Anda menjalankan perintah sesuai izin role mereka.`,
        tools: tools,
        toolConfig: { includeServerSideToolInvocations: true }
      }
    });

    const functionCalls = response.functionCalls;
    let replyText = response.text || "";

    if (functionCalls && functionCalls.length > 0) {
      // 1. Append the model's message containing functionCalls to the history
      const modelTurn = response.candidates?.[0]?.content;
      if (modelTurn) {
        contents.push(modelTurn);
      }

      // 2. Prepare function responses
      const functionResponseParts: any[] = [];

      for (const call of functionCalls) {
        const { name, args } = call;
        let result: any = null;

        try {
          if (name === "baca_data") {
            const { tabel, filterKeyword } = args as any;
            const list = updatedAppData[tabel] || [];
            let filtered = list;
            if (filterKeyword) {
              const kw = filterKeyword.toLowerCase();
              filtered = list.filter((item: any) => 
                JSON.stringify(item).toLowerCase().includes(kw)
              );
            }
            result = {
              status: "success",
              count: filtered.length,
              data: filtered.slice(0, 30), // return top 30 rows
              message: `Berhasil membaca tabel ${tabel}.`
            };
          } else if (name === "tambah_atau_update_item") {
            const { tabel, action, idItem, data } = args as any;
            
            if (action === "tambah") {
              const auth = periksaOtorisasi(userRole, tabel, "tambah");
              if (!auth.authorized) {
                result = { error: auth.message };
              } else {
                const idPrefix = tabel === "Anggota" ? "RL03-" : "";
                const uniqueId = idPrefix + (Date.now().toString().slice(-6) + Math.floor(Math.random() * 100));
                const newItem = { ...data };

                if (tabel === "Anggota") {
                  newItem.ID_Anggota = uniqueId;
                  newItem.Tanggal_Daftar = new Date().toISOString().split("T")[0];
                  newItem.Status_Aktif = newItem.Status_Aktif || "AKTIF";
                  newItem.Status_Tampil = newItem.Status_Tampil || "TAMPIL";
                  updatedAppData.Anggota.push(newItem);
                } else if (tabel === "Agenda") {
                  newItem.ID = uniqueId;
                  newItem.Tanggal = newItem.Tanggal || new Date().toISOString().split("T")[0];
                  updatedAppData.Agenda.push(newItem);
                } else if (tabel === "Pengumuman") {
                  newItem.ID = uniqueId;
                  newItem.Tanggal = newItem.Tanggal || new Date().toISOString().split("T")[0];
                  updatedAppData.Pengumuman.push(newItem);
                } else if (tabel === "Kas") {
                  newItem.ID = uniqueId;
                  newItem.Tanggal = newItem.Tanggal || new Date().toISOString().split("T")[0];
                  updatedAppData.Kas.push(newItem);
                } else if (tabel === "Iuran") {
                  newItem.ID = uniqueId;
                  updatedAppData.Iuran.push(newItem);
                } else if (tabel === "Aspirasi") {
                  newItem.ID = uniqueId;
                  newItem.Tanggal = newItem.Tanggal || new Date().toISOString().split("T")[0];
                  newItem.Status = "MENUNGGU";
                  updatedAppData.Aspirasi.push(newItem);
                }

                appDataChanged = true;
                result = { status: "success", id: uniqueId, message: `Berhasil menambahkan data baru ke ${tabel}.` };
              }
            } else if (action === "edit") {
              if (!idItem) {
                result = { error: "ID Item wajib diisi untuk melakukan pengeditan." };
              } else {
                const auth = periksaOtorisasi(userRole, tabel, "edit");
                if (!auth.authorized) {
                  result = { error: auth.message };
                } else {
                  let found = false;
                  if (tabel === "Anggota") {
                    const idx = updatedAppData.Anggota.findIndex((item: any) => item.ID_Anggota === idItem);
                    if (idx !== -1) {
                      updatedAppData.Anggota[idx] = { ...updatedAppData.Anggota[idx], ...data };
                      found = true;
                    }
                  } else {
                    const idx = updatedAppData[tabel]?.findIndex((item: any) => item.ID === idItem || item.id === idItem);
                    if (idx !== -1) {
                      updatedAppData[tabel][idx] = { ...updatedAppData[tabel][idx], ...data };
                      found = true;
                    }
                  }

                  if (!found) {
                    result = { error: `Item dengan ID ${idItem} tidak ditemukan di tabel ${tabel}.` };
                  } else {
                    appDataChanged = true;
                    result = { status: "success", id: idItem, message: `Berhasil memperbarui data di tabel ${tabel}.` };
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
              let found = false;
              if (tabel === "Anggota") {
                const filtered = updatedAppData.Anggota.filter((item: any) => item.ID_Anggota !== idItem);
                if (filtered.length < updatedAppData.Anggota.length) {
                  updatedAppData.Anggota = filtered;
                  found = true;
                }
              } else {
                const list = updatedAppData[tabel] || [];
                const filtered = list.filter((item: any) => item.ID !== idItem && item.id !== idItem);
                if (filtered.length < list.length) {
                  updatedAppData[tabel] = filtered;
                  found = true;
                }
              }

              if (!found) {
                result = { error: `Item dengan ID ${idItem} tidak ditemukan di tabel ${tabel}.` };
              } else {
                appDataChanged = true;
                result = { status: "success", id: idItem, message: `Berhasil menghapus data di tabel ${tabel}.` };
              }
            }
          }
        } catch (err: any) {
          result = { error: err.message };
        }

        functionResponseParts.push({
          functionResponse: {
            name: name,
            response: result
          }
        });
      }

      // 3. Send the function response back to Gemini
      contents.push({
        role: "user",
        parts: functionResponseParts
      });

      const secondResponse = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: contents,
        config: {
          systemInstruction: `Kamu adalah asisten AI ramah dan cerdas bernama "Asisten Pemuda" untuk Remaja RT 03 RW 04 Denokan, Gondoryo, Jambu, Semarang.
Tugas utama Anda adalah membantu pengurus dan anggota mengelola data, menjawab pertanyaan, membuat ide kegiatan, atau menulis caption sosial media.
Gunakan bahasa Indonesia yang santai, akrab, tapi tetap sopan.
Informasikan hasil eksekusi fungsi/tool di atas secara jelas kepada pengguna. Jelaskan apa yang telah Anda baca, tambah, ubah, atau hapus.`,
        }
      });

      replyText = secondResponse.text || "";
    }

    res.json({ 
      reply: replyText, 
      updatedAppData: appDataChanged ? updatedAppData : undefined 
    });
  } catch (error: any) {
    console.error("Chat error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ai/draft", async (req, res) => {
  try {
    const { prompt, type } = req.body;
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Gemini API key is not configured." });
    }
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Buatkan draft untuk ${type} dengan detail berikut: ${prompt}`,
      config: {
        systemInstruction: "Kamu adalah asisten pengurus Remaja RT 03 RW 04 Denokan. Buatkan teks yang siap pakai, rapi, dan sesuai dengan budaya pemuda kampung di Jawa Tengah (gotong royong, sopan, akrab).",
      }
    });
    res.json({ result: response.text });
  } catch (error: any) {
    console.error("AI Draft error:", error);
    res.status(500).json({ error: error.message });
  }
});


// R2 Upload and Sheets Proxy Endpoints
let s3Client: S3Client | null = null;
function getS3Client() {
  if (!s3Client) {
    const accountId = process.env.VITE_R2_ACCOUNT_ID;
    const accessKeyId = process.env.VITE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.VITE_R2_SECRET_ACCESS_KEY;
    
    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error("Missing Cloudflare R2 environment credentials");
    }
    
    s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });
  }
  return s3Client;
}

app.post("/api/upload-r2", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file was uploaded." });
    }

    const folder = req.body.folder || "umum";
    const s3 = getS3Client();
    const bucketName = process.env.VITE_R2_BUCKET_NAME || "remaja-legok-03";
    const publicUrl = process.env.VITE_R2_PUBLIC_URL || "";

    if (!publicUrl) {
      return res.status(500).json({ error: "R2 public domain is not configured." });
    }

    const cleanFileName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileKey = `${folder}/${Date.now()}-${cleanFileName}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      })
    );

    const uploadedUrl = `${publicUrl.replace(/\/$/, "")}/${fileKey}`;

    res.status(200).json({
      success: true,
      url: uploadedUrl,
      key: fileKey,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });

  } catch (error: any) {
    console.error("R2 Upload error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/sheets-proxy", async (req, res) => {
  const scriptUrl = process.env.VITE_GOOGLE_SCRIPT_URL;

  if (!scriptUrl) {
    return res.status(500).json({ error: "VITE_GOOGLE_SCRIPT_URL environment variable is not configured." });
  }

  try {
    // Inject the correct spreadsheet ID from env variables to override default/missing placeholders in Apps Script
    const bodyData = {
      ...req.body,
      spreadsheetId: process.env.VITE_SHEETS_ID,
      sheetsId: process.env.VITE_SHEETS_ID,
      VITE_SHEETS_ID: process.env.VITE_SHEETS_ID
    };

    const fetchOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyData)
    };

    const response = await fetch(scriptUrl, fetchOptions);
    const data = await response.json();

    res.status(200).json(data);
  } catch (error: any) {
    console.error("Sheets Proxy error:", error);
    res.status(500).json({ error: "Failed to communicate with Google Sheets backend: " + error.message });
  }
});

app.post("/api/telegram/send-media", async (req, res) => {
  try {
    const { botToken, chatId, mediaUrl, caption, isVideo } = req.body;
    if (!botToken || !chatId || !mediaUrl) {
      return res.status(400).json({ status: "error", message: "Bot Token, Chat ID, dan Media URL wajib diisi" });
    }

    const method = isVideo ? "sendVideo" : "sendPhoto";
    const fieldName = isVideo ? "video" : "photo";
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/${method}`;

    if (mediaUrl.startsWith("data:")) {
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
      return res.json({ status: "success", result: tgData.result });
    } else {
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
      return res.json({ status: "success", result: tgData.result });
    }
  } catch (err: any) {
    console.error("Telegram send error:", err);
    res.status(500).json({ status: "error", message: err.message || "Internal server error" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
