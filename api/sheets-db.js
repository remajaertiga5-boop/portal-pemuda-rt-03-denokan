// ============================================================
// VERCEL SERVERLESS — GOOGLE SHEETS DATABASE (DIRECT API)
// Uses service account JWT — pure crypto + fetch, no googleapis
// ============================================================

import { createSign } from "crypto";

const SID = "1bwb4dIlyLQiq0hMjzC5HGCQPd5cQZVB7ndQ51FaC8R8";
const SHEETS = ["Anggota","Agenda","Pengumuman","Kas","Aspirasi","Galeri"];
const KEY = process.env.SHEETS_API_KEY || "remaja-legok-03-2026";

let _token = null, _tokenExpiry = 0, _sheetIds = null;

function auth(req) { return (req.headers["x-api-key"]||"") === KEY; }

async function getToken() {
  if (_token && Date.now() < _tokenExpiry) return _token;
  const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const now = Math.floor(Date.now()/1000);
  const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64url");
  const seg = b64({alg:"RS256",typ:"JWT"}) + "." + b64({iss:sa.client_email,scope:"https://www.googleapis.com/auth/spreadsheets",aud:sa.token_uri,exp:now+3600,iat:now});
  const jwt = seg + "." + createSign("RSA-SHA256").update(seg).sign(sa.private_key,"base64url");
  const r = await fetch(sa.token_uri,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion="+encodeURIComponent(jwt)});
  const d = await r.json();
  _token = d.access_token;
  _tokenExpiry = Date.now() + (d.expires_in-60)*1000;
  return _token;
}

async function api(method, path, body) {
  const t = await getToken();
  const opts = {method, headers:{Authorization:"Bearer "+t,"Content-Type":"application/json"}};
  if (body) opts.body = JSON.stringify(body);
  return (await fetch("https://sheets.googleapis.com/v4/spreadsheets/"+SID+path,opts)).json();
}

async function getValues(sheet) { const d = await api("GET","/values/"+encodeURIComponent(sheet)); return d.values||[]; }

async function getIds() {
  if (_sheetIds) return _sheetIds;
  const d = await api("GET","");
  _sheetIds = {};
  for (const s of d.sheets||[]) _sheetIds[s.properties.title] = s.properties.sheetId;
  return _sheetIds;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type, Authorization, X-Api-Key");
  if (req.method==="OPTIONS") return res.status(200).end();
  if (!auth(req)) return res.status(401).json({error:"Unauthorized"});

  try {
    if (req.method==="GET") {
      const {table, id, idColumn} = req.query||{};
      if (!table) return res.json({status:"ok",sheets:SHEETS,time:new Date().toISOString()});
      if (!SHEETS.includes(table)) return res.status(400).json({error:"Invalid table"});
      const v = await getValues(table);
      if (id) {
        const col = idColumn||"ID", h = v[0].map(String), ci = h.indexOf(col);
        if (ci<0) return res.status(400).json({error:"Column not found"});
        const row = v.slice(1).find(r=>String(r[ci])===String(id));
        if (!row) return res.status(404).json({error:"Not found"});
        return res.json(h.reduce((o,k,i)=>({...o,[k]:row[i]??""}),{}));
      }
      const h = v[0].map(String), rows = v.slice(1).map(r=>h.reduce((o,k,i)=>({...o,[k]:r[i]??""}),{}));
      return res.json({data:rows, total:rows.length});
    }

    if (req.method==="POST") {
      const {action, table, id, idColumn, data} = req.body||{};
      if (!table||!SHEETS.includes(table)) return res.status(400).json({error:"Invalid table"});
      const v = await getValues(table);
      const h = v[0]?.map(String)||[], col = idColumn||"ID", ci = h.indexOf(col);

      const A = action;
      if (A==="create"||A==="insert") {
        if (!data) return res.status(400).json({error:"data required"});
        await api("POST","/values/"+encodeURIComponent(table)+":append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS",{values:[h.map(k=>data[k]??"")]});
        const u = await getValues(table);
        return res.status(201).json({success:true,row:u.length});
      }
      if (A==="update") {
        if (!id||ci<0) return res.status(400).json({error:"id required"});
        const ri = v.slice(1).findIndex(r=>String(r[ci])===String(id));
        if (ri<0) return res.status(404).json({error:"Not found"});
        const row = h.map((k,i)=>k===col?id:(data?.[k]??v[ri+1]?.[i]??""));
        await api("PUT","/values/"+encodeURIComponent(table)+"!A"+(ri+2)+"?valueInputOption=USER_ENTERED",{values:[row]});
        return res.json({success:true,row:ri+2});
      }
      if (A==="delete") {
        if (!id||ci<0) return res.status(400).json({error:"id required"});
        const ri = v.slice(1).findIndex(r=>String(r[ci])===String(id));
        if (ri<0) return res.status(404).json({error:"Not found"});
        const ids = await getIds(), sid = ids[table];
        await api("POST",":batchUpdate",{requests:[{deleteDimension:{range:{sheetId:sid,dimension:"ROWS",startIndex:ri+1,endIndex:ri+2}}}]});
        return res.json({success:true});
      }
      if (A==="upsert") {
        if (!id||ci<0) return res.status(400).json({error:"id required"});
        const ri = v.slice(1).findIndex(r=>String(r[ci])===String(id));
        if (ri>=0) {
          const row = h.map((k,i)=>k===col?id:(data?.[k]??v[ri+1]?.[i]??""));
          await api("PUT","/values/"+encodeURIComponent(table)+"!A"+(ri+2)+"?valueInputOption=USER_ENTERED",{values:[row]});
          return res.json({success:true,row:ri+2});
        }
        await api("POST","/values/"+encodeURIComponent(table)+":append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS",{values:[h.map(k=>data?.[k]??"")]});
        const u = await getValues(table);
        return res.status(201).json({success:true,row:u.length});
      }
      if (A==="sync") {
        if (!Array.isArray(data)) return res.status(400).json({error:"data must be array"});
        const ids = await getIds(), sid = ids[table];
        if (v.length>1) await api("POST",":batchUpdate",{requests:[{deleteDimension:{range:{sheetId:sid,dimension:"ROWS",startIndex:1,endIndex:v.length}}}]});
        if (data.length) await api("POST","/values/"+encodeURIComponent(table)+":append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS",{values:data.map(d=>h.map(k=>d[k]??""))});
        return res.json({success:true,rows:data.length});
      }
      return res.status(400).json({error:`Unknown action: ${A}`});
    }

    return res.status(405).json({error:"Method not allowed"});
  } catch(e) {
    console.error("[sheets-db]",e.message);
    return res.status(500).json({error:e.message});
  }
}
