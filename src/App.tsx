import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  LayoutDashboard, User, Users, Calendar, Megaphone, Wallet,
  Lightbulb, Image as ImageIcon, Settings, KeyRound, LogOut,
  Crown, UserCheck, DollarSign, MessageSquare, Menu, X, Bell,
  Sun, Moon, Globe, Type, ChevronRight, Info, ArrowRight,
  CheckCircle2, Vote
} from "lucide-react";
import { useTheme } from "./context/ThemeContext";
import { useLocale } from "./hooks/useLocale";
import Dashboard from "./components/Dashboard";
import Chatbot from "./components/Chatbot";
import Anggota from "./components/Anggota";
import Agenda from "./components/Agenda";
import Pengumuman from "./components/Pengumuman";
import Keuangan from "./components/Keuangan";
import Absensi from "./components/Absensi";
import Aspirasi from "./components/Aspirasi";
import Galeri from "./components/Galeri";
import Pengaturan from "./components/Pengaturan";
import SuperAdminDashboard from "./components/SuperAdminDashboard";
import Voting from "./components/Voting";
import AuthModal from "./components/AuthModal";
import LogoutModal from "./components/LogoutModal";
import ToastContainer, { ToastMessage } from "./components/Toast";
import LoginPage from "./components/LoginPage";
import { AuthSession } from "./types";
import { getAuthSession, clearAuthSession, addAccessLog } from "./utils/auth";
import { initializeData } from "./utils/dataStoreSheets";
import { loadAppData, saveAppData, AppData } from "./utils/dataStore";
import { isApiConfigured } from "./components/ApiConfigPanel";
import PandawaLogo from "./components/PandawaLogo";
import { ErrorBoundary } from "./components/ErrorBoundary";

// ===============================================================
// TYPES
// ===============================================================

type TabId =
  | "dashboard" | "pengumuman" | "agenda" | "keuangan"
  | "kas" | "kas-saya" | "iuran" | "absensi" | "anggota"
  | "aspirasi" | "galeri" | "voting" | "chat" | "pengaturan" | "super-admin";

interface Notification {
  id   : number;
  title: string;
  body : string;
  time : string;
  read : boolean;
  type : "keuangan" | "agenda" | "pengumuman";
}

// ===============================================================
// CONSTANTS
// ===============================================================

type AccentColor = "purple" | "blue" | "emerald" | "rose";

const DEFAULT_NOTIFICATIONS: Notification[] = [];

// ===============================================================
// HELPER — Role Badge
// ===============================================================

function RoleBadge({ role, size = "sm" }: { role: string; size?: "xs" | "sm" }) {
  const cls = size === "xs" 
    ? "px-1.5 py-0.5 text-[9px] font-black rounded-md uppercase tracking-wider"
    : "px-2 py-0.5 text-[10px] font-black rounded-md uppercase tracking-wider";

  const map: Record<string, string> = {
    SUPER_ADMIN: `${cls} bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-300`,
    KETUA      : `${cls} bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300`,
    ADMIN      : `${cls} bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300`,
    SEKRETARIS : `${cls} bg-yellow-100 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-300`,
    BENDAHARA  : `${cls} bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300`,
    HUMAS      : `${cls} bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300`,
    PENGURUS   : `${cls} bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300`,
    ANGGOTA    : `${cls} bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300`,
    TAMU       : `${cls} bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300`,
  };

  const labels: Record<string, string> = {
    SUPER_ADMIN: "🔴 SuperAdmin", KETUA: "👑 Ketua", ADMIN: "👑 Ketua",
    SEKRETARIS: "📝 Sekretaris", BE