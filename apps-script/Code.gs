// ============================================================
// GOOGLE APPS SCRIPT — DATABASE API
// Portal Remaja Legok 03 Denokan
// 
// Deploy sebagai Web App → copy URL ke environment variable
// ============================================================

const SPREADSHEET_ID = "1bwb4dIlyLQiq0hMjzC5HGCQPd5cQZVB7ndQ51FaC8R8";
const SHEETS = ["Anggota","Agenda","Pengumuman","Kas","Aspirasi","Galeri"];
const API_KEY = "remaja-legok-03-2026"; // Ganti dengan key rahasia

// ── CORS Helper ───────────────────────────────────────────
function jsonResponse(data, code) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
    .setStatusCode(code || 200);
}

// ── Auth Check ────────────────────────────────────────────
function checkAuth(request) {
  const key = request.parameter.key || request.parameter.apiKey || "";
  const authHeader = request.headers?.Authorization || "";
  return key === API_KEY || authHeader === "Bearer " + API_KEY;
}

// ── Get Sheet ─────────────────────────────────────────────
function getSheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error(`Sheet "${name}" tidak ditemukan`);
  return sheet;
}

// ── Read All Rows ─────────────────────────────────────────
function readAll(sheetName) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[String(h)] = row[i] !== undefined ? row[i] : ""; });
    return obj;
  });
}

// ── Find Row Index ────────────────────────────────────────
function findRowIndex(sheet, colIndex, value) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][colIndex]) === String(value)) return i;
  }
  return -1;
}

// ── Add Row ───────────────────────────────────────────────
function addRow(sheetName, rowData, headers) {
  const sheet = getSheet(sheetName);
  const row = headers.map(h => rowData[h] !== undefined ? rowData[h] : "");
  sheet.appendRow(row);
  return { success: true, row: sheet.getLastRow() };
}

// ── Update Row ────────────────────────────────────────────
function updateRow(sheetName, idColumn, idValue, rowData, headers) {
  const sheet = getSheet(sheetName);
  const colIndex = headers.indexOf(idColumn);
  if (colIndex < 0) throw new Error(`Kolom "${idColumn}" tidak ditemukan`);
  
  const rowIndex = findRowIndex(sheet, colIndex, idValue);
  if (rowIndex < 0) return { success: false, error: "Data tidak ditemukan" };
  
  const row = headers.map(h => {
    if (h === idColumn) return idValue;
    return rowData[h] !== undefined ? rowData[h] : "";
  });
  
  sheet.getRange(rowIndex + 1, 1, 1, headers.length).setValues([row]);
  return { success: true, row: rowIndex + 1 };
}

// ── Delete Row ────────────────────────────────────────────
function deleteRow(sheetName, idColumn, idValue, headers) {
  const sheet = getSheet(sheetName);
  const colIndex = headers.indexOf(idColumn);
  if (colIndex < 0) throw new Error(`Kolom "${idColumn}" tidak ditemukan`);
  
  const rowIndex = findRowIndex(sheet, colIndex, idValue);
  if (rowIndex < 0) return { success: false, error: "Data tidak ditemukan" };
  
  sheet.deleteRow(rowIndex + 1);
  return { success: true };
}

// ── GET — Read data ───────────────────────────────────────
function doGet(e) {
  if (!checkAuth(e)) return jsonResponse({ error: "Unauthorized" }, 401);
  
  const table = e.parameter.table;
  const id = e.parameter.id;
  const idColumn = e.parameter.idColumn || "ID";
  
  if (!table || !SHEETS.includes(table)) {
    return jsonResponse({ error: "Parameter 'table' tidak valid. Gunakan: " + SHEETS.join(",") }, 400);
  }
  
  try {
    if (id) {
      // Get single row
      const sheet = getSheet(table);
      const headers = sheet.getDataRange().getValues()[0];
      const colIndex = headers.indexOf(idColumn);
      const rowIndex = findRowIndex(sheet, colIndex, id);
      
      if (rowIndex < 0) return jsonResponse({ error: "Not found" }, 404);
      
      const row = sheet.getDataRange().getValues()[rowIndex];
      const obj = {};
      headers.forEach((h, i) => { obj[String(h)] = row[i] !== undefined ? row[i] : ""; });
      return jsonResponse(obj);
    }
    
    const data = readAll(table);
    return jsonResponse({ data, total: data.length });
  } catch (err) {
    return jsonResponse({ error: err.toString() }, 500);
  }
}

// ── POST — Create/Update/Delete ───────────────────────────
function doPost(e) {
  if (!checkAuth(e)) return jsonResponse({ error: "Unauthorized" }, 401);
  
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }
  
  const action = body.action;
  const table = body.table;
  const idColumn = body.idColumn || "ID";
  
  if (!table || !SHEETS.includes(table)) {
    return jsonResponse({ error: "Parameter 'table' tidak valid" }, 400);
  }
  
  try {
    const sheet = getSheet(table);
    const headers = sheet.getDataRange().getValues()[0];
    
    switch (action) {
      case "create":
      case "insert":
        const result = addRow(table, body.data, headers);
        return jsonResponse(result, 201);
      
      case "update":
        if (!body.id) return jsonResponse({ error: "Field 'id' wajib" }, 400);
        const updResult = updateRow(table, idColumn, body.id, body.data, headers);
        return jsonResponse(updResult);
      
      case "delete":
        if (!body.id) return jsonResponse({ error: "Field 'id' wajib" }, 400);
        const delResult = deleteRow(table, idColumn, body.id, headers);
        return jsonResponse(delResult);
      
      case "upsert":
        if (!body.id) return jsonResponse({ error: "Field 'id' wajib" }, 400);
        const colIndex = headers.indexOf(idColumn);
        const exists = findRowIndex(sheet, colIndex, body.id) >= 0;
        if (exists) {
          return jsonResponse(updateRow(table, idColumn, body.id, body.data, headers));
        } else {
          return jsonResponse(addRow(table, body.data, headers), 201);
        }
      
      case "sync":
        // Bulk sync — replace all data
        if (!Array.isArray(body.data)) return jsonResponse({ error: "data harus array" }, 400);
        sheet.clear();
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        if (body.data.length > 0) {
          const rows = body.data.map(item => headers.map(h => item[h] !== undefined ? item[h] : ""));
          sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
        }
        return jsonResponse({ success: true, rows: body.data.length });
      
      default:
        return jsonResponse({ error: `Action '${action}' tidak dikenal. Gunakan: create, update, delete, upsert, sync` }, 400);
    }
  } catch (err) {
    return jsonResponse({ error: err.toString() }, 500);
  }
}
