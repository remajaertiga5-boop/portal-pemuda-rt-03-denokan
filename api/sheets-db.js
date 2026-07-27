// ============================================================
// VERCEL SERVERLESS — GOOGLE SHEETS DATABASE PROXY
// Proxies CRUD requests to Google Apps Script backend
// ============================================================

const APPS_SCRIPT_URL = process.env.GOOGLE_SCRIPT_DB_URL 
  || process.env.VITE_SHEETS_DB_URL 
  || "https://script.google.com/macros/s/AKfycbx0iBGbgvU_2es_ibVKxbu979oelO21sfZNCySUCE3InykXyP8MOMzt-46yshRq8T-93w/exec";
const API_KEY         = process.env.SHEETS_API_KEY || "remaja-legok-03-2026";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Api-Key");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (!APPS_SCRIPT_URL) {
    return res.status(500).json({
      error: "GOOGLE_SCRIPT_DB_URL belum dikonfigurasi di environment Vercel.",
    });
  }

  try {
    const isGet = req.method === "GET";

    // Build URL
    let url = APPS_SCRIPT_URL + "?key=" + encodeURIComponent(API_KEY);
    if (isGet) {
      const params = req.query || {};
      Object.entries(params).forEach(([k, v]) => {
        url += "&" + encodeURIComponent(k) + "=" + encodeURIComponent(String(v));
      });
    }

    const options = {
      method: isGet ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + API_KEY,
      },
    };

    if (!isGet) {
      options.body = JSON.stringify(req.body || {});
    }

    const response = await fetch(url, options);
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("text/html")) {
      // Google Script kadang return HTML saat error
      const text = await response.text();
      if (text.includes("Google Apps Script")) {
        return res.status(500).json({
          error: "Apps Script belum di-deploy sebagai Web App. Deploy dengan: Publish → Deploy as web app → Who has access: Anyone",
        });
      }
      return res.status(500).json({ error: "Unexpected HTML response", raw: text.slice(0, 500) });
    }

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error("[sheets-db]", error.message);
    return res.status(500).json({ error: error.message || "Gagal menghubungi database." });
  }
}
