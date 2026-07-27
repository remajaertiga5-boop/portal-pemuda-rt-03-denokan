// ============================================================
// VERCEL SERVERLESS FUNCTION - GOOGLE SHEETS PROXY FOR APPS SCRIPT
// ============================================================

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const scriptUrl = process.env.GOOGLE_SCRIPT_URL 
  || process.env.VITE_GOOGLE_SCRIPT_URL 
  || process.env.VITE_API_URL 
  || "https://script.google.com/macros/s/AKfycbzhjPTUpHBfGyRRlrdvCqYnHk5TYe_mCrL-s7tWhTd3IrAYsj4ePlsRYJuk1a4ht6nfZg/exec";

  if (!scriptUrl) {
    return res.status(500).json({
      status: "error",
      error: "GOOGLE_SCRIPT_URL environment variable is not configured."
    });
  }

  try {
    const fetchOptions = {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (req.method === "POST" && req.body) {
      let bodyData = typeof req.body === "string" ? JSON.parse(req.body) : { ...req.body };
      
      // Security: Strip client-side spreadsheetId override attempts
      delete bodyData.spreadsheetId;
      delete bodyData.sheetsId;
      delete bodyData.SPREADSHEET_ID;

      fetchOptions.body = JSON.stringify(bodyData);
    }

    const response = await fetch(scriptUrl, fetchOptions);
    const data = await response.json();

    return res.status(200).json(data);
  } catch (error) {
    console.error("Sheets Proxy error:", error);
    return res.status(500).json({
      status: "error",
      error: "Failed to communicate with Google Sheets backend: " + error.message
    });
  }
}
