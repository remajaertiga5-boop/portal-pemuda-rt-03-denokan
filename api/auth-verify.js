// ============================================================
// VERCEL SERVERLESS FUNCTION - CREDENTIAL VERIFICATION GATEWAY
// ============================================================

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  // VALIDASI ENV
  const scriptUrl = process.env.GOOGLE_SCRIPT_URL || process.env.VITE_GOOGLE_SCRIPT_URL || process.env.VITE_API_URL;

  if (!scriptUrl) {
    console.error("[auth-verify] Missing GOOGLE_SCRIPT_URL / VITE_GOOGLE_SCRIPT_URL");
    return res.status(500).json({ error: "System configuration error. GOOGLE_SCRIPT_URL is missing." });
  }

  const { action, idAnggota, pin, tipe } = req.body || {};

  if (!action) {
    return res.status(400).json({ error: "Field 'action' wajib diisi." });
  }

  let bodyPayload = {};

  switch (action) {
    case "verifikasiID":
    case "verify-id":
      if (!idAnggota) {
        return res.status(400).json({
          error: "Field 'idAnggota' wajib diisi untuk aksi verify-id."
        });
      }
      bodyPayload = {
        action: "verifikasiID",
        idAnggota,
      };
      break;

    case "verifikasiPin":
    case "verify-pin":
      if (!pin) {
        return res.status(400).json({
          error: "Field 'pin' wajib diisi untuk aksi verifikasiPin."
        });
      }
      bodyPayload = {
        action: "verifikasiPin",
        pin,
        tipe: tipe || "pengurus",
        idAnggota: idAnggota || "",
      };
      break;

    case "verify-pengurus":
      if (!pin) {
        return res.status(400).json({
          error: "Field 'pin' wajib diisi untuk aksi verify-pengurus."
        });
      }
      bodyPayload = {
        action: "verifikasiPengurus",
        idAnggota: idAnggota || "",
        pin,
      };
      break;

    case "verify-ketua":
      if (!pin) {
        return res.status(400).json({
          error: "Field 'pin' wajib diisi untuk aksi verify-ketua."
        });
      }
      bodyPayload = {
        action: "verifikasiKetua",
        idAnggota: idAnggota || "",
        pin,
      };
      break;

    case "verify-sa":
      if (!pin) {
        return res.status(400).json({
          error: "Field 'pin' wajib diisi untuk aksi verify-sa."
        });
      }
      bodyPayload = {
        action: "verifikasiSuperAdmin",
        pin,
      };
      break;

    default:
      bodyPayload = {
        ...req.body,
        action,
      };
      break;
  }

  try {
    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyPayload),
    });

    if (!response.ok) {
      let errorMsg = `Google Apps Script error: status ${response.status}`;

      try {
        const errorData = await response.json();
        if (errorData?.error || errorData?.message) errorMsg = errorData.error || errorData.message;
      } catch (_) {}

      console.error(`[auth-verify] Script responded with ${response.status}`);
      return res.status(response.status).json({ error: errorMsg, status: "error" });
    }

    const result = await response.json();
    return res.status(200).json(result);

  } catch (error) {
    console.error("[auth-verify] Gateway error:", error);
    return res.status(500).json({
      error: "Gagal memverifikasi kredensial. Silakan coba lagi.",
      status: "error"
    });
  }
}
