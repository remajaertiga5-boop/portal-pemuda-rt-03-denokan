// ============================================================
// VERCEL SERVERLESS — GOOGLE SHEETS DATABASE (DIRECT API)
// Uses service account to read/write Google Sheets directly
// ============================================================

import { google } from "googleapis";

const SPREADSHEET_ID = "1bwb4dIlyLQiq0hMjzC5HGCQPd5cQZVB7ndQ51FaC8R8";
const SHEETS_LIST   = ["Anggota","Agenda","Pengumuman","Kas","Aspirasi","Galeri"];
const API_KEY       = process.env.SHEETS_API_KEY || "remaja-legok-03-2026";

// ── Helpers ──────────────────────────────────────────────

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not configured");
  const sa = JSON.parse(raw);
  return new google.auth.JWT(
    sa.client_email, null, sa.private_key,
    ["https://www.googleapis.com/auth/spreadsheets"]
  );
}

function checkAuth(req) {
  const key = req.headers["x-api-key"] || "";
  return key === API_KEY;
}

async function getValues(sheetName, range) {
  const auth = getAuth();
  const srv = google.sheets({ version: "v4", auth });
  const res = await srv.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: range || sheetName,
  });
  return res.data.values || [];
}

async function getSheetIds() {
  const auth = getAuth();
  const srv = google.sheets({ version: "v4", auth });
  const meta = await srv.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const map = {};
  for (const sh of meta.data.sheets) {
    map[sh.properties.title] = sh.properties.sheetId;
  }
  return map;
}

function valuesToObjects(values) {
  if (!values || values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1).map(row =>
    headers.reduce((obj, h, i) => ({ ...obj, [h]: row[i] ?? "" }), {})
  );
}

// ── Main Handler ─────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Api-Key");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (!checkAuth(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    if (req.method === "GET") {
      return handleGet(req, res);
    }
    if (req.method === "POST") {
      return handlePost(req, res);
    }
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("[sheets-db]", err.message);
    return res.status(500).json({ error: err.message });
  }
}

// ── GET handlers ─────────────────────────────────────────

async function handleGet(req, res) {
  const { table, id, idColumn } = req.query || {};

  if (!table) {
    return res.status(200).json({ status: "ok", sheets: SHEETS_LIST, time: new Date().toISOString() });
  }

  if (!SHEETS_LIST.includes(table)) {
    return res.status(400).json({ error: `Table '${table}' tidak valid. Gunakan: ${SHEETS_LIST.join(",")}` });
  }

  const values = await getValues(table);

  if (id) {
    const col = idColumn || "ID";
    const headers = values[0]?.map(String) || [];
    const colIdx = headers.indexOf(col);
    if (colIdx < 0) return res.status(400).json({ error: `Kolom '${col}' tidak ditemukan` });
    const row = values.slice(1).find(r => String(r[colIdx]) === String(id));
    if (!row) return res.status(404).json({ error: "Not found" });
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] ?? ""; });
    return res.status(200).json(obj);
  }

  const data = valuesToObjects(values);
  return res.status(200).json({ data, total: data.length });
}

// ── POST handlers ────────────────────────────────────────

async function handlePost(req, res) {
  const { action, table, id, idColumn, data } = req.body || {};

  if (!table || !SHEETS_LIST.includes(table)) {
    return res.status(400).json({ error: `Table '${table}' tidak valid` });
  }

  const values = await getValues(table);
  const headers = values[0]?.map(String) || [];
  const idCol = idColumn || "ID";
  const idColIdx = headers.indexOf(idCol);

  const auth = getAuth();
  const srv = google.sheets({ version: "v4", auth });

  switch (action) {

    case "create":
    case "insert": {
      if (!data) return res.status(400).json({ error: "Field 'data' wajib" });
      const row = headers.map(h => data[h] ?? "");
      await srv.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: table,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [row] },
      });
      const updated = await getValues(table);
      return res.status(201).json({ success: true, row: updated.length });
    }

    case "update": {
      if (!id) return res.status(400).json({ error: "Field 'id' wajib" });
      if (idColIdx < 0) return res.status(400).json({ error: `Kolom '${idCol}' tidak ditemukan` });
      const rowIdx = values.slice(1).findIndex(r => String(r[idColIdx]) === String(id));
      if (rowIdx < 0) return res.status(404).json({ error: "Data tidak ditemukan" });
      const row = headers.map((h, i) => (h === idCol ? id : (data?.[h] ?? values[rowIdx + 1]?.[i] ?? "")));
      await srv.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${table}!A${rowIdx + 2}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [row] },
      });
      return res.status(200).json({ success: true, row: rowIdx + 2 });
    }

    case "delete": {
      if (!id) return res.status(400).json({ error: "Field 'id' wajib" });
      if (idColIdx < 0) return res.status(400).json({ error: `Kolom '${idCol}' tidak ditemukan` });
      const rowIdx = values.slice(1).findIndex(r => String(r[idColIdx]) === String(id));
      if (rowIdx < 0) return res.status(404).json({ error: "Data tidak ditemukan" });
      const sheetIds = await getSheetIds();
      const sheetId = sheetIds[table];
      if (sheetId === undefined) return res.status(500).json({ error: "Sheet ID not found" });
      await srv.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: { sheetId, dimension: "ROWS", startIndex: rowIdx + 1, endIndex: rowIdx + 2 }
            }
          }]
        }
      });
      return res.status(200).json({ success: true });
    }

    case "upsert": {
      if (!id) return res.status(400).json({ error: "Field 'id' wajib" });
      if (idColIdx < 0) return res.status(400).json({ error: `Kolom '${idCol}' tidak ditemukan` });
      const rowIdx = values.slice(1).findIndex(r => String(r[idColIdx]) === String(id));
      if (rowIdx >= 0) {
        const row = headers.map((h, i) => (h === idCol ? id : (data?.[h] ?? values[rowIdx + 1]?.[i] ?? "")));
        await srv.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${table}!A${rowIdx + 2}`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [row] },
        });
        return res.status(200).json({ success: true, row: rowIdx + 2 });
      } else {
        const row = headers.map(h => data?.[h] ?? "");
        await srv.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: table,
          valueInputOption: "USER_ENTERED",
          insertDataOption: "INSERT_ROWS",
          requestBody: { values: [row] },
        });
        const updated = await getValues(table);
        return res.status(201).json({ success: true, row: updated.length });
      }
    }

    case "sync": {
      if (!Array.isArray(data)) return res.status(400).json({ error: "data harus array" });
      const sheetIds = await getSheetIds();
      const sheetId = sheetIds[table];
      if (sheetId === undefined) return res.status(500).json({ error: "Sheet ID not found" });
      if (values.length > 1) {
        await srv.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: {
            requests: [{
              deleteDimension: {
                range: { sheetId, dimension: "ROWS", startIndex: 1, endIndex: values.length }
              }
            }]
          }
        });
      }
      if (data.length > 0) {
        const rows = data.map(item => headers.map(h => item[h] ?? ""));
        await srv.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: table,
          valueInputOption: "USER_ENTERED",
          insertDataOption: "INSERT_ROWS",
          requestBody: { values: rows },
        });
      }
      return res.status(200).json({ success: true, rows: data.length });
    }

    default:
      return res.status(400).json({ error: `Action '${action}' tidak dikenal` });
  }
}
