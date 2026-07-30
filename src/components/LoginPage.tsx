import React, { useState, useEffect, useRef } from "react";
import { Lock, CreditCard, Phone, Sun, Moon, CheckCircle2, AlertTriangle, AlertCircle, ShieldAlert, KeyRound, Eye, EyeOff } from "lucide-react";
import { AuthSession, AnggotaItem } from "../types";
import { useTheme } from "../context/ThemeContext";
import { useLocale } from "../hooks/useLocale";
import PandawaLogo from "./PandawaLogo";
import { saveAuthSession, checkLockoutStatus, recordFailedPinAttempt, resetPinAttempts, hashPin, getRoleFromJabatan, verifikasiPINDinamis } from "../utils/auth";
interface LoginPageProps { anggotaList: AnggotaItem[]; onLoginSuccess: (session: AuthSession) => void; onBrowseAsGuest?: () => void; }
const T: Record<string, Record<string, string>> = {
  id: { welcome:"Selamat Datang",subtitle:"Portal Digital Remaja Legok 03.",tab_member:"Masuk Anggota",tab_admin:"Akses Super Admin",placeholder_id:"Masukkan ID Anggota",placeholder_pin:"Masukkan PIN",placeholder_confirm_pin:"Konfirmasi PIN",remember_me:"Ingat Saya",forgot_pin:"Lupa PIN?",btn_login:"Masuk",btn_register_login:"Daftar & Masuk",btn_guest:"Lanjut Tamu",error_empty_id:"Masukkan ID!",error_empty_pin:"Masukkan PIN!",error_confirm_mismatch:"PIN tidak cocok!",error_pin_length:"PIN 4-8 digit.",error_id_format:"Format ID tidak valid",error_id_not_found:"ID tidak terdaftar",success_login:"Login Berhasil!",connection_online:"Online",connection_offline:"Offline",connection_offline_warn:"Anda offline.",organization_name:"Remaja Legok 03",organization_loc:"RT 03 RW 04 Denokan",help_call:"Chat WA",setup_first_pin:"Setup PIN",setup_first_pin_desc:"Buat PIN baru.",lockout_active:"Terkunci",lockout_wait:"Tunggu {{time}}.",wrong_pin:"PIN salah!" },
  en: { welcome:"Welcome",subtitle:"Remaja Legok 03 Digital Portal.",tab_member:"Member Login",tab_admin:"Super Admin",placeholder_id:"Enter ID",placeholder_pin:"Enter PIN",placeholder_confirm_pin:"Confirm PIN",remember_me:"Remember",forgot_pin:"Forgot?",btn_login:"Login",btn_register_login:"Register & Login",btn_guest:"Guest",error_empty_id:"Enter ID!",error_empty_pin:"Enter PIN!",error_confirm_mismatch:"PIN mismatch!",error_pin_length:"PIN 4-8 digits.",error_id_format:"Invalid ID",error_id_not_found:"ID not found",success_login:"Success!",connection_online:"Online",connection_offline:"Offline",connection_offline_warn:"You are offline.",organization_name:"Remaja Legok 03",organization_loc:"RT 03 RW 04",help_call:"Chat WA",setup_first_pin:"Setup PIN",setup_first_pin_desc:"Create new PIN.",lockout_active:"Locked",lockout_wait:"Wait {{time}}.",wrong_pin:"Wrong PIN!" },
  jv: { welcome:"Sugeng Rawuh",subtitle:"Portal Remaja Legok 03.",tab_member:"Mlebet Anggota",tab_admin:"Super Admin",placeholder_id:"Mlebetaken ID",placeholder_pin:"Mlebetaken PIN",placeholder_confirm_pin:"Konfirmasi PIN",remember_me:"Elingi",forgot_pin:"Kesupen?",btn_login:"Mlebet",btn_register_login:"Ndaptar & Mlebet",btn_guest:"Tamu",error_empty_id:"Mlebetaken ID!",error_empty_pin:"Mlebetaken PIN!",error_confirm_mismatch:"PIN mboten cocok!",error_pin_length:"PIN 4-8 digit.",error_id_format:"ID mboten sah",error_id_not_found:"ID mboten wonten",success_login:"Sukses!",connection_online:"Nyambung",connection_offline:"Pedhot",connection_offline_warn:"Offline.",organization_name:"Remaja Legok 03",organization_loc:"RT 03 RW 04",help_call:"Kirim WA",setup_first_pin:"Setup PIN",setup_first_pin_desc:"Damel PIN enggal.",lockout_active:"Dikunci",lockout_wait:"Tenggo {{time}}.",wrong_pin:"PIN salah!" },
  slg: { welcome:"Halo Bro!",subtitle:"Portal Remaja Legok 03.",tab_member:"Masuk Member",tab_admin:"Super Admin",placeholder_id:"Ketik ID",placeholder_pin:"Ketik PIN",placeholder_confirm_pin:"Konfirm PIN",remember_me:"Ingetin",forgot_pin:"Lupa?",btn_login:"Gas Masuk",btn_register_login:"Bikin & Masuk",btn_guest:"Tamu",error_empty_id:"Isi ID!",error_empty_pin:"Isi PIN!",error_confirm_mismatch:"PIN ga cocok!",error_pin_length:"PIN 4-8 digit.",error_id_format:"ID ngaco",error_id_not_found:"ID ga ada",success_login:"Berhasil!",connection_online:"Nyambung",connection_offline:"Putus",connection_offline_warn:"Offline.",organization_name:"Remaja Legok 03",organization_loc:"RT 03 RW 04",help_call:"Chat WA",setup_first_pin:"Bikin PIN",setup_first_pin_desc:"Bikin PIN baru.",lockout_active:"Dikunci",lockout_wait:"Tunggu {{time}}.",wrong_pin:"PIN salah!" }
};
export default function LoginPage({ anggotaList, onLoginSuccess, onBrowseAsGuest }: LoginPageProps) {
  const { theme, toggleTheme } = useTheme();
  const { currentLanguage } = useLocale();
  const [idInput, setIdInput] = useState(""); const [pinInput, setPinInput] = useState(""); const [confirmPinInput, setConfirmPinInput] = useState("");
  const [tabMode, setTabMode] = useState<"anggota"|"admin">("anggota"); const [isNewUser, setIsNewUser] = useState(false);
  const [showPw, setShowPw] = useState(false); const [showCp, setShowCp] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine); const [err, setErr] = useState(""); const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false); const [lr, setLr] = useState(0);
  const [setupPin, setSetupPin] = useState(false);
  const idRef = useRef<HTMLInputElement>(null); const pinRef = useRef<HTMLInputElement>(null);
  const L = T[currentLanguage] || T.id;

  useEffect(() => { idRef.current?.focus(); const a=()=>setIsOnline(true); const b=()=>setIsOnline(false); window.addEventListener('online',a); window.addEventListener('offline',b); return ()=>{window.removeEventListener('online',a); window.removeEventListener('offline',b)}; }, []);
  useEffect(() => { let t:any; if (lr>0) t=setInterval(()=>setLr(p=>Math.max(0,p-1)),1000); return ()=>clearInterval(t); }, [lr]);

  const chkLock = () => { const lo = checkLockoutStatus(); if (lo.isLocked) { setLr(lo.remainingSeconds); return true; } return false; };
  const find = (id: string) => anggotaList.find(m=>m.ID_Anggota===id && m.Status_Tampil!=="ARSIP");

  const go = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setOk("");
    const cid = idInput.trim(); const cpin = pinInput.trim();
    if (!cid) { setErr(L.error_empty_id); return; }
    if (!cpin) { setErr(L.error_empty_pin); return; }
    if (chkLock()) return;
    const u = find(cid);
    if (!u) { if (!/^(RL03-\d{3}|\d{10})$/.test(cid)) { setErr(L.error_id_format); return; } setErr(L.error_id_not_found); return; }
    if (isNewUser || setupPin) {
      if (!/^\d{4,8}$/.test(cpin)) { setErr(L.error_pin_length); return; }
      if (cpin !== confirmPinInput.trim()) { setErr(L.error_confirm_mismatch); return; }
      setLoading(true);
      try { hashPin(cpin); const s={status:"active",id_anggota:u.ID_Anggota,nama_lengkap:u.Nama_Lengkap,nama_panggilan:u.Nama_Panggilan||u.Nama_Lengkap,role:getRoleFromJabatan(u.Jabatan||""),jabatan:u.Jabatan,login_time:new Date().toISOString(),remember_me:true} as unknown as AuthSession; saveAuthSession(s); setOk(L.success_login); setTimeout(()=>onLoginSuccess(s),1000); }
      catch { setErr(L.wrong_pin); }
      setLoading(false); return;
    }
    setLoading(true);
    try {
      if (!verifikasiPINDinamis(cpin)) throw new Error("wrong");
      resetPinAttempts();
      const s={status:"active",id_anggota:u.ID_Anggota,nama_lengkap:u.Nama_Lengkap,nama_panggilan:u.Nama_Panggilan||u.Nama_Lengkap,role:getRoleFromJabatan(u.Jabatan||""),jabatan:u.Jabatan,login_time:new Date().toISOString(),remember_me:true} as unknown as AuthSession;
      saveAuthSession(s); setOk(L.success_login); setTimeout(()=>onLoginSuccess(s),1000);
    } catch (err: any) { const a=recordFailedPinAttempt(cid); setErr(L.wrong_pin+(a>0?` (${a})`:'')); if (a>=3) setLr(60); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950 flex flex-col items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4 z-10"><button onClick={toggleTheme} className="p-2.5 bg-white/90 dark:bg-slate-800/90 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">{theme==='dark'?<Sun size={18}/>:<Moon size={18}/>}</button></div>
      <div className="w-full max-w-md">
        <div className="text-center mb-6"><PandawaLogo className="w-20 h-20 mx-auto mb-3"/><h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">{L.welcome}</h1><p className="text-xs text-slate-500 mt-1">{L.subtitle}</p></div>
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            <button onClick={()=>setTabMode("anggota")} className={`flex-1 py-3.5 text-xs font-bold ${tabMode==="anggota"?"bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500":"text-slate-500"}`}>{L.tab_member}</button>
            <button onClick={()=>setTabMode("admin")} className={`flex-1 py-3.5 text-xs font-bold ${tabMode==="admin"?"bg-purple-50 text-purple-700 border-b-2 border-purple-500":"text-slate-500"}`}>{L.tab_admin}</button>
          </div>
          <form onSubmit={go} className="p-6 space-y-4">
            {!isOnline&&(<div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs flex items-center gap-2"><AlertTriangle size={16}/>{L.connection_offline_warn}</div>)}
            {lr>0&&(<div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs flex items-center gap-2"><ShieldAlert size={16}/><b>{L.lockout_active}</b> {L.lockout_wait.replace('{{time}}',String(lr)+' detik')}</div>)}
            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{L.placeholder_id}</label><div className="relative"><CreditCard size={16} className="absolute left-3 top-3 text-slate-400"/><input ref={idRef} type="text" value={idInput} onChange={e=>{setIdInput(e.target.value);setIsNewUser(false);setSetupPin(false)}} placeholder={L.placeholder_id} className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-emerald-500"/></div></div>
            <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{L.placeholder_pin}</label><div className="relative"><Lock size={16} className="absolute left-3 top-3 text-slate-400"/><input ref={pinRef} type={showPw?"text":"password"} value={pinInput} onChange={e=>setPinInput(e.target.value)} placeholder={L.placeholder_pin} className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"/><button type="button" onClick={()=>setShowPw(!showPw)} className="absolute right-3 top-3 text-slate-400">{showPw?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></div>
            {(isNewUser||setupPin)&&(<div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{L.placeholder_confirm_pin}</label><div className="relative"><Lock size={16} className="absolute left-3 top-3 text-slate-400"/><input type={showCp?"text":"password"} value={confirmPinInput} onChange={e=>setConfirmPinInput(e.target.value)} placeholder={L.placeholder_confirm_pin} className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"/><button type="button" onClick={()=>setShowCp(!showCp)} className="absolute right-3 top-3 text-slate-400">{showCp?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></div>)}
            {err&&(<div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs flex items-center gap-2"><AlertCircle size={14}/>{err}</div>)}
            {ok&&(<div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs flex items-center gap-2"><CheckCircle2 size={14}/>{ok}</div>)}
            <button type="submit" disabled={loading||lr>0} className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2">{loading?"...":<KeyRound size={16}/>}{(isNewUser||setupPin)?L.btn_register_login:L.btn_login}</button>
            {onBrowseAsGuest&&(<button type="button" onClick={onBrowseAsGuest} className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-sm">{L.btn_guest}</button>)}
          </form>
        </div>
        <div className="mt-4 text-center"><p className="text-[10px] text-slate-400 dark:text-slate-500">{L.organization_name} — {L.organization_loc}</p><a href="#" className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-2"><Phone size={12}/>{L.help_call}</a></div>
      </div>
    </div>
  );
}
