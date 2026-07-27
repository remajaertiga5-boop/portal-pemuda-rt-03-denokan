import { AuthSession, UserRole } from "../types";

const AUTH_KEY = "remaja_legok_auth";
const LOCK_KEY = "remaja_legok_lockout";
const LOG_KEY = "remaja_legok_logs";
const COOKIE_NAME = "remaja_legok_session_enc";
const SESSION_STORAGE_KEY = "remaja_legok_temp_session";

const EXPIRE_TIME_REMEMBER_MS = 30 * 24 * 60 * 60 * 1000; // 30 hari
const EXPIRE_TIME_SESSION_MS  = 24 * 60 * 60 * 1000;      // 24 jam

// ============================================================
// ENCRYPTION & COOKIE HELPERS FOR PERSISTENT SESSIONS
// ============================================================

function getDeviceSecretKey(): string {
  try {
    let key = localStorage.getItem("remaja_legok_device_key");
    if (!key) {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      key = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
      localStorage.setItem("remaja_legok_device_key", key);
    }
    return key;
  } catch {
    return "pandawa_ertiga_sec_2026";
  }
}

/**
 * Encrypts a session payload string using XOR cipher + salted device secret + Base64
 */
export function encryptSessionPayload(data: object): string {
  try {
    const jsonStr = JSON.stringify(data);
    const key = getDeviceSecretKey();
    let encrypted = "";
    for (let i = 0; i < jsonStr.length; i++) {
      const charCode = jsonStr.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      encrypted += String.fromCharCode(charCode);
    }
    const b64 = btoa(encodeURIComponent(encrypted));
    const checksum = hashPin(jsonStr);
    return JSON.stringify({
      v: "1.0",
      p: b64,
      c: checksum,
      t: Date.now()
    });
  } catch (e) {
    console.error("Encryption failed, fallback to plain json:", e);
    return JSON.stringify(data);
  }
}

/**
 * Decrypts an encrypted session payload string back to an object
 */
export function decryptSessionPayload<T>(cipherText: string): T | null {
  try {
    if (!cipherText) return null;
    let parsed;
    try {
      parsed = JSON.parse(cipherText);
    } catch {
      return null;
    }

    // Direct object fallback (unencrypted legacy session data)
    if (!parsed.p) {
      return parsed as T;
    }

    const decoded = decodeURIComponent(atob(parsed.p));
    const key = getDeviceSecretKey();
    let decrypted = "";
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      decrypted += String.fromCharCode(charCode);
    }

    // Verify integrity if checksum exists
    if (parsed.c && hashPin(decrypted) !== parsed.c) {
      console.warn("Integrity check failed for decrypted session");
      return null;
    }

    return JSON.parse(decrypted) as T;
  } catch (e) {
    console.error("Decryption error:", e);
    return null;
  }
}

// Cookie Helpers
export function setEncryptedCookie(name: string, value: string, days: number) {
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  } catch (e) {
    console.error("Cookie write error:", e);
  }
}

export function getEncryptedCookie(name: string): string | null {
  try {
    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i].trim();
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length));
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function deleteCookie(name: string) {
  try {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  } catch (e) {
    console.error("Cookie delete error:", e);
  }
}

export function getRoleFromJabatan(jabatan?: string): UserRole {
  if (!jabatan) return "ANGGOTA";
  const j = jabatan.toLowerCase().trim();
  if (j.includes("super admin") || j.includes("superadmin")) return "SUPER_ADMIN";
  if (j.includes("wakil ketua")) return "WAKIL_KETUA";
  if (j.includes("ketua") || j === "admin") return "KETUA";
  if (j.includes("wakil sekretaris")) return "WAKIL_SEKRETARIS";
  if (j.includes("sekretaris")) return "SEKRETARIS";
  if (j.includes("wakil bendahara")) return "WAKIL_BENDAHARA";
  if (j.includes("bendahara")) return "BENDAHARA";
  if (j.includes("kepala humas")) return "KEPALA_HUMAS";
  if (j.includes("humas")) return "HUMAS";
  if (j.includes("pengurus") || j.includes("seksi")) return "PENGURUS";
  return "ANGGOTA";
}

export function getAuthSession(): AuthSession {
  try {
    // 1. Cek SessionStorage lebih dulu (sesi non-persistent aktif)
    const tempRaw = sessionStorage.getItem(SESSION_STORAGE_KEY) || sessionStorage.getItem(AUTH_KEY);
    if (tempRaw) {
      const tempSession = decryptSessionPayload<AuthSession>(tempRaw);
      if (tempSession && tempSession.role) {
        const now = Date.now();
        const ttl = tempSession.rememberMe === false ? EXPIRE_TIME_SESSION_MS : EXPIRE_TIME_REMEMBER_MS;
        if (now - tempSession.timestamp < ttl) {
          return tempSession;
        } else {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
          sessionStorage.removeItem(AUTH_KEY);
        }
      }
    }

    // 2. Cek LocalStorage ( encrypted session )
    const rawLocal = localStorage.getItem(AUTH_KEY);
    let session: AuthSession | null = null;

    if (rawLocal) {
      session = decryptSessionPayload<AuthSession>(rawLocal);
    }

    // 3. Fallback: Cek encrypted Cookie jika LocalStorage kosong/dibersihkan
    if (!session) {
      const cookieValue = getEncryptedCookie(COOKIE_NAME);
      if (cookieValue) {
        session = decryptSessionPayload<AuthSession>(cookieValue);
      }
    }

    if (!session || !session.role) {
      return { role: "TAMU", timestamp: Date.now() };
    }

    const now = Date.now();
    const ttl = session.rememberMe === false ? EXPIRE_TIME_SESSION_MS : EXPIRE_TIME_REMEMBER_MS;

    if (now - session.timestamp > ttl) {
      clearAuthSession();
      return { role: "TAMU", timestamp: now };
    }

    return session;
  } catch {
    return { role: "TAMU", timestamp: Date.now() };
  }
}

export function saveAuthSession(
  session: Omit<AuthSession, "timestamp">,
  rememberMe: boolean = true
): AuthSession {
  const fullSession: AuthSession = {
    ...session,
    rememberMe,
    timestamp: Date.now(),
  };

  const encrypted = encryptSessionPayload(fullSession);

  if (rememberMe) {
    // Simpan ke LocalStorage dan Cookie terenkripsi (Persis antar restart browser)
    localStorage.setItem(AUTH_KEY, encrypted);
    setEncryptedCookie(COOKIE_NAME, encrypted, 30); // 30 hari
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_KEY);
  } else {
    // Simpan ke SessionStorage saja (Hilang saat browser ditutup)
    sessionStorage.setItem(SESSION_STORAGE_KEY, encrypted);
    localStorage.removeItem(AUTH_KEY);
    deleteCookie(COOKIE_NAME);
  }

  addAccessLog(
    session.id_anggota || "TAMU",
    session.nama_lengkap || "Tamu",
    session.role,
    "VERIFIKASI_AKSES",
    `Masuk sebagai level ${session.role} (${rememberMe ? "Ingat Saya: Ya" : "Sesi Sementara"})`
  );

  return fullSession;
}

export function clearAuthSession(): AuthSession {
  localStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_KEY);
  deleteCookie(COOKIE_NAME);

  ["draft_profil", "draft_pengumuman", "draft_agenda", "filter_kas", "filter_iuran"].forEach((k) =>
    localStorage.removeItem(k)
  );

  return { role: "TAMU", timestamp: Date.now(), nama_lengkap: "Tamu" };
}

// Dynamic PIN Generator (WIB / UTC+7)
const OFFSET_WIB_MS = 7 * 60 * 60 * 1000; // UTC+7

export function generatePINDinamis(offsetJam: number = 0): string {
  const epochUTC = Date.now();
  const epochWIB = epochUTC + OFFSET_WIB_MS + (offsetJam * 60 * 60 * 1000);

  const wib = new Date(epochWIB);

  const tahun = wib.getUTCFullYear();
  const bulan = String(wib.getUTCMonth() + 1).padStart(2, '0');
  const tanggal = String(wib.getUTCDate()).padStart(2, '0');
  const jam = String(wib.getUTCHours()).padStart(2, '0');

  return `${tahun}${bulan}${tanggal}${jam}`;
}

export function verifikasiPINDinamis(pinInput: string): boolean {
  if (!pinInput || typeof pinInput !== "string") return false;
  const pinBersih = pinInput.trim();
  if (!/^\d{10}$/.test(pinBersih)) return false;

  const pinValid = [
    generatePINDinamis(-1), // 1 jam sebelum
    generatePINDinamis(0),  // jam ini
    generatePINDinamis(1)   // 1 jam setelah
  ];

  return pinValid.includes(pinBersih);
}

export function getInfoWaktuSekarang() {
  const sekarang = new Date();
  return {
    tahun: sekarang.getFullYear(),
    bulan: sekarang.getMonth() + 1,
    tanggal: sekarang.getDate(),
    jam: sekarang.getHours(),
    menit: sekarang.getMinutes(),
    detik: sekarang.getSeconds(),
    pinSekarang: generatePINDinamis(0)
  };
}

export function getStoredPINs() {
  const pengurusPin = localStorage.getItem("remaja_legok_pin_pengurus") || "654321";
  const adminPin = localStorage.getItem("remaja_legok_pin_admin") || "123456";
  const superAdminPin = localStorage.getItem("remaja_legok_pin_super_admin") || "12345678";
  return { pengurusPin, adminPin, superAdminPin };
}

export function setStoredPIN(type: "PENGURUS" | "ADMIN" | "SUPER_ADMIN", newPin: string) {
  if (type === "PENGURUS") {
    localStorage.setItem("remaja_legok_pin_pengurus", newPin);
  } else if (type === "ADMIN") {
    localStorage.setItem("remaja_legok_pin_admin", newPin);
  } else {
    localStorage.setItem("remaja_legok_pin_super_admin", newPin);
  }
}

// Pin Attempt Throttling (Progressive Lockout)
export function checkLockoutStatus(): { isLocked: boolean; remainingSeconds: number; remainingMinutes: number; attempts: number } {
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    if (!raw) return { isLocked: false, remainingSeconds: 0, remainingMinutes: 0, attempts: 0 };
    const { attempts, lockUntil } = JSON.parse(raw);
    const now = Date.now();
    if (lockUntil && now < lockUntil) {
      const remainingSeconds = Math.ceil((lockUntil - now) / 1000);
      const remainingMinutes = Math.ceil(remainingSeconds / 60);
      return { isLocked: true, remainingSeconds, remainingMinutes, attempts };
    }
    if (lockUntil && now >= lockUntil) {
      // Keep attempt count but expire lock
      localStorage.setItem(LOCK_KEY, JSON.stringify({ attempts: Math.max(0, attempts - 1), lockUntil: 0 }));
    }
    return { isLocked: false, remainingSeconds: 0, remainingMinutes: 0, attempts: attempts || 0 };
  } catch {
    return { isLocked: false, remainingSeconds: 0, remainingMinutes: 0, attempts: 0 };
  }
}

export function recordFailedPinAttempt(pinAttempt?: string): number {
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    let attempts = 0;
    if (raw) {
      const data = JSON.parse(raw);
      attempts = data.attempts || 0;
    }
    attempts += 1;
    let lockDurationMs = 0;
    if (attempts >= 6) {
      lockDurationMs = 60 * 60 * 1000; // 1 jam jika > 5x gagal
    } else if (attempts >= 5) {
      lockDurationMs = 5 * 60 * 1000; // 5 menit
    } else if (attempts >= 3) {
      lockDurationMs = 30 * 1000; // 30 detik untuk 3-4x gagal
    }
    
    const lockUntil = lockDurationMs > 0 ? Date.now() + lockDurationMs : 0;
    localStorage.setItem(LOCK_KEY, JSON.stringify({ attempts, lockUntil }));

    // Log attempt with hash (NEVER store raw PIN)
    const pinHash = pinAttempt ? hashPin(pinAttempt) : "unknown";
    addAccessLog(
      "SYS-SEC", 
      "Sistem Keamanan", 
      "TAMU", 
      "VERIFIKASI_GAGAL", 
      `Percobaan verifikasi gagal (Percobaan ${attempts}). Hash: ${pinHash}`
    );

    return attempts;
  } catch {
    return 1;
  }
}

export function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    hash = (hash << 5) - hash + pin.charCodeAt(i);
    hash |= 0;
  }
  return "H" + Math.abs(hash).toString(16).substring(0, 8);
}

export function resetPinAttempts() {
  localStorage.removeItem(LOCK_KEY);
}

// Access Logs
export function getAccessLogs() {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addAccessLog(
  id_anggota: string,
  nama: string,
  role: UserRole,
  aksi: string,
  detail: string
) {
  try {
    const logs = getAccessLogs();
    const newLog = {
      id: Date.now().toString(),
      Waktu: new Date().toLocaleString("id-ID"),
      ID_Anggota: id_anggota,
      Nama: nama,
      Role: role,
      Aksi: aksi,
      Detail: detail,
    };
    const updated = [newLog, ...logs].slice(0, 100);
    localStorage.setItem(LOG_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error(e);
  }
}
