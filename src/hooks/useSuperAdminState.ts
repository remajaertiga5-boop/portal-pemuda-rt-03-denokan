// ============================================================
// useSuperAdminState — Reducer terpusat untuk SuperAdminDashboard
// Menggantikan 16 useState dengan 1 useReducer
// ============================================================

import { useReducer, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────
export type SATab =
  | "manajemen_anggota"
  | "galeri_sa"
  | "pin"
  | "log"
  | "akses"
  | "arsip"
  | "api_config";

export interface SAState {
  activeTab              : SATab;
  isAksesSettingsUnlocked: boolean;
  showPinDynamic         : boolean;
  showMatriksModal       : boolean;
  logSearch              : string;
  arsipSearch            : string;
  // PIN Ketua
  pinSaVerifikasiKetua   : string;
  pinKetuaBaru           : string;
  pinKetuaBaruKonf       : string;
  // PIN Pengurus
  pinSaVerifikasiPengurus: string;
  pinPengurusBaru        : string;
  pinPengurusBaruKonf    : string;
  // Auth PINs
  pinAksesSettingsKonf   : string;
  pinArsipKonf           : string;
}

// ── Actions ────────────────────────────────────────────────
export type SAAction =
  | { type: "SET_TAB";              tab: SATab }
  | { type: "UNLOCK_AKSES" }
  | { type: "LOCK_AKSES" }
  | { type: "TOGGLE_PIN_DYNAMIC" }
  | { type: "OPEN_MATRIKS_MODAL" }
  | { type: "CLOSE_MATRIKS_MODAL" }
  | { type: "SET_LOG_SEARCH";       value: string }
  | { type: "SET_ARSIP_SEARCH";     value: string }
  | { type: "SET_PIN_KETUA_VERIF";  value: string }
  | { type: "SET_PIN_KETUA_BARU";   value: string }
  | { type: "SET_PIN_KETUA_KONF";   value: string }
  | { type: "SET_PIN_PENGURUS_VERIF"; value: string }
  | { type: "SET_PIN_PENGURUS_BARU";  value: string }
  | { type: "SET_PIN_PENGURUS_KONF";  value: string }
  | { type: "SET_PIN_AKSES_KONF";   value: string }
  | { type: "SET_PIN_ARSIP_KONF";   value: string }
  | { type: "RESET_PIN_KETUA" }
  | { type: "RESET_PIN_PENGURUS" }
  | { type: "RESET_ARSIP_PIN" };

// ── Initial State ──────────────────────────────────────────
const initialState: SAState = {
  activeTab              : "manajemen_anggota",
  isAksesSettingsUnlocked: false,
  showPinDynamic         : false,
  showMatriksModal       : false,
  logSearch              : "",
  arsipSearch            : "",
  pinSaVerifikasiKetua   : "",
  pinKetuaBaru           : "",
  pinKetuaBaruKonf       : "",
  pinSaVerifikasiPengurus: "",
  pinPengurusBaru        : "",
  pinPengurusBaruKonf    : "",
  pinAksesSettingsKonf   : "",
  pinArsipKonf           : "",
};

// ── Reducer ────────────────────────────────────────────────
function saReducer(state: SAState, action: SAAction): SAState {
  switch (action.type) {
    case "SET_TAB":
      return { ...state, activeTab: action.tab };

    case "UNLOCK_AKSES":
      return { ...state, isAksesSettingsUnlocked: true };
    case "LOCK_AKSES":
      return { ...state, isAksesSettingsUnlocked: false, pinAksesSettingsKonf: "" };

    case "TOGGLE_PIN_DYNAMIC":
      return { ...state, showPinDynamic: !state.showPinDynamic };

    case "OPEN_MATRIKS_MODAL":
      return { ...state, showMatriksModal: true };
    case "CLOSE_MATRIKS_MODAL":
      return { ...state, showMatriksModal: false };

    case "SET_LOG_SEARCH":
      return { ...state, logSearch: action.value };
    case "SET_ARSIP_SEARCH":
      return { ...state, arsipSearch: action.value };

    case "SET_PIN_KETUA_VERIF":
      return { ...state, pinSaVerifikasiKetua: action.value };
    case "SET_PIN_KETUA_BARU":
      return { ...state, pinKetuaBaru: action.value };
    case "SET_PIN_KETUA_KONF":
      return { ...state, pinKetuaBaruKonf: action.value };

    case "SET_PIN_PENGURUS_VERIF":
      return { ...state, pinSaVerifikasiPengurus: action.value };
    case "SET_PIN_PENGURUS_BARU":
      return { ...state, pinPengurusBaru: action.value };
    case "SET_PIN_PENGURUS_KONF":
      return { ...state, pinPengurusBaruKonf: action.value };

    case "SET_PIN_AKSES_KONF":
      return { ...state, pinAksesSettingsKonf: action.value };
    case "SET_PIN_ARSIP_KONF":
      return { ...state, pinArsipKonf: action.value };

    case "RESET_PIN_KETUA":
      return { ...state, pinSaVerifikasiKetua: "", pinKetuaBaru: "", pinKetuaBaruKonf: "" };
    case "RESET_PIN_PENGURUS":
      return { ...state, pinSaVerifikasiPengurus: "", pinPengurusBaru: "", pinPengurusBaruKonf: "" };
    case "RESET_ARSIP_PIN":
      return { ...state, pinArsipKonf: "" };

    default:
      return state;
  }
}

// ── Hook ───────────────────────────────────────────────────
export function useSuperAdminState() {
  const [state, dispatch] = useReducer(saReducer, initialState);

  // Auto-unlock akses settings saat PIN valid diketik
  useEffect(() => {
    if (state.pinAksesSettingsKonf.length === 10) {
      // verifikasiPINDinamis dipanggil dari komponen, bukan dari sini
      // Hook hanya manage state, bukan logic
    }
  }, [state.pinAksesSettingsKonf]);

  return { state, dispatch };
}

export default useSuperAdminState;
