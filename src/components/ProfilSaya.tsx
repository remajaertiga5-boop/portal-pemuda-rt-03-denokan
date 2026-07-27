import React, { useState, useEffect, useRef } from 'react';
import { AuthSession, AnggotaItem, PengunduranDiriItem } from '../types';
import { User, Save, UploadCloud, ChevronLeft, CheckCircle2, AlertTriangle, RefreshCw, FileText, Send, Shield, QrCode } from 'lucide-react';
import { AppData, addLogAkses } from '../utils/dataStore';
import { compressImage, validateFile } from '../utils/imageUtils';
import { uploadToR2 } from '../utils/apiClient';
import { useLocale } from '../hooks/useLocale';
import { getApprovalRoleForResignation } from '../utils/resignationHelper';
import KartuAnggotaModal from './KartuAnggotaModal';

interface ProfilSayaProps {
  session: AuthSession;
  appData?: AppData;
  setAppData?: React.Dispatch<React.SetStateAction<AppData>>;
  onClose: () => void;
  showToast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
  onLogout?: () => void;
}

export default function ProfilSaya({ session, appData, setAppData, onClose, showToast, onLogout }: ProfilSayaProps) {
  const { t, formatDate } = useLocale();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [data, setData] = useState<AnggotaItem | null>(null);
  const [formData, setFormData] = useState<Partial<AnggotaItem>>({});
  const [initialData, setInitialData] = useState<Partial<AnggotaItem>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fetchError, setFetchError] = useState("");
  
  // Resignation states (F.4)
  const [resignationReason, setResignationReason] = useState("");
  const [submittingResignation, setSubmittingResignation] = useState(false);
  const [showDigitalCard, setShowDigitalCard] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setLoading(true);
    setFetchError("");
    const idAnggota = session?.id_anggota || "";
    if (!idAnggota) {
      setFetchError("ID Anggota tidak valid");
      setLoading(false);
      return;
    }

    // Fallback/Local lookup from appData
    let localMember = null;
    if (appData && appData.Anggota) {
      localMember = appData.Anggota.find(
        (m: any) => m.ID_Anggota === idAnggota || m.ID === idAnggota
      );
    }
    
    // Look in draft first
    const draft = localStorage.getItem(`profil_draft_${idAnggota}`);

    try {
      const response = await fetch('/api/sheets-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getAnggotaByID', id: idAnggota })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result && result.status === 'success' && result.data) {
        setData(result.data);
        const mappedData = { ...result.data };
        setInitialData(mappedData);
        
        if (draft) {
          const parsedDraft = JSON.parse(draft);
          setFormData(parsedDraft);
          showToast("Draft dipulihkan", "info");
        } else {
          setFormData(mappedData);
        }
      } else {
        throw new Error(result?.message || "Gagal memuat data dari server");
      }
    } catch (e: any) {
      console.warn("Proxy fetch failed, using fallback:", e);
      
      // Fallback to localMember or session if proxy fails
      if (localMember) {
        setData(localMember);
        const mappedData = { ...localMember };
        setInitialData(mappedData);
        if (draft) {
          setFormData(JSON.parse(draft));
        } else {
          setFormData(mappedData);
        }
        showToast("Menampilkan profil (Data Offline)", "warning");
      } else {
        // Fallback to minimal session data so page doesn't crash
        const sessionData: any = {
          ID_Anggota: idAnggota,
          Nama_Lengkap: session.nama_lengkap || session.nama_panggilan || "Anggota Remaja Legok 03",
          Nama_Panggilan: session.nama_panggilan || "",
          Jabatan: session.jabatan || (session.role === "KETUA" ? "Ketua" : session.role === "PENGURUS" ? "Pengurus" : "Anggota"),
          Status: "Aktif",
          Tanggal_Daftar: new Date().toISOString()
        };
        setData(sessionData);
        setInitialData(sessionData);
        if (draft) {
          setFormData(JSON.parse(draft));
        } else {
          setFormData(sessionData);
        }
        showToast("Menampilkan profil dasar (Koneksi Terbatas)", "warning");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.id_anggota) {
      loadData();
    }
  }, [session?.id_anggota]);

  // Auto-save draft
  useEffect(() => {
    if (!loading && data && Object.keys(formData).length > 0) {
      const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);
      if (isDirty) {
        const timeout = setTimeout(() => {
          localStorage.setItem(`profil_draft_${session.id_anggota}`, JSON.stringify(formData));
        }, 3000);
        return () => clearTimeout(timeout);
      } else {
        localStorage.removeItem(`profil_draft_${session.id_anggota}`);
      }
    }
  }, [formData, loading, initialData, session.id_anggota]);

  const handleChange = (field: keyof AnggotaItem, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.Nama_Lengkap || formData.Nama_Lengkap.length < 3) newErrors.Nama_Lengkap = "Nama lengkap minimal 3 karakter";
    if (formData.Nama_Panggilan && formData.Nama_Panggilan.length < 2) newErrors.Nama_Panggilan = "Nama panggilan minimal 2 karakter";
    if (!formData.No_HP || !/^08\d{8,11}$/.test(formData.No_HP)) newErrors.No_HP = "Format nomor HP tidak valid (08xxx, 10-13 digit)";
    if (formData.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.Email)) newErrors.Email = "Format email tidak valid";
    if (!formData.Tempat_Lahir || formData.Tempat_Lahir.length < 3) newErrors.Tempat_Lahir = "Tempat lahir minimal 3 karakter";
    
    if (!formData.Tanggal_Lahir) {
      newErrors.Tanggal_Lahir = "Tanggal lahir wajib diisi";
    } else {
      const birthDate = new Date(formData.Tanggal_Lahir);
      if (birthDate > new Date()) newErrors.Tanggal_Lahir = "Tanggal lahir tidak valid";
    }
    
    if (!formData.Jenis_Kelamin) newErrors.Jenis_Kelamin = "Pilih jenis kelamin";
    if (!formData.Alamat || formData.Alamat.length < 10) newErrors.Alamat = "Alamat minimal 10 karakter";

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      const firstError = document.querySelector('.border-rose-500');
      if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) {
      showToast("Ada field yang perlu diperbaiki", "error");
      return;
    }
    
    setSaving(true);
    try {
      const payload = { ...formData };
      
      const response = await fetch('/api/sheets-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'updateProfil', 
          idAnggota: session.id_anggota,
          data: payload
        })
      });
      const result = await response.json();
      
      if (result.status === 'success') {
        showToast("✅ Perubahan berhasil disimpan", "success");
        setInitialData(payload);
        localStorage.removeItem(`profil_draft_${session.id_anggota}`);
        
        // Update local appData if needed
        if (appData && setAppData) {
          const updatedAnggota = (appData.Anggota || []).map(a => 
            a.ID_Anggota === session.id_anggota ? { ...a, ...payload } : a
          );
          const updated = { ...appData, Anggota: updatedAnggota };
          const logged = addLogAkses(updated, session.nama_lengkap || "Sistem", session.role, "UPDATE_PROFIL", "Memperbarui data profil");
          setAppData(logged);
        }
      } else {
        showToast(result.message || "Gagal menyimpan", "error");
      }
    } catch (e) {
      showToast("Terjadi kesalahan jaringan", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);
    if (isDirty) {
      if (window.confirm("Anda memiliki perubahan yang belum disimpan. Yakin ingin membatalkan?")) {
        localStorage.removeItem(`profil_draft_${session.id_anggota}`);
        onClose();
      }
    } else {
      onClose();
    }
  };

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast("Format gambar harus JPG, PNG, atau WEBP", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("Ukuran foto maksimal 5MB", "error");
      return;
    }
    
    setPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
  };

  const cancelPhotoUpload = () => {
    setPhotoFile(null);
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUploadPhoto = async () => {
    if (!photoFile) return;
    setUploading(true);

    try {
      let fileToUpload = photoFile;

      // Kompres gambar dulu
      if (photoFile.type.startsWith("image/")) {
        showToast("Mengompres foto...", "info");
        const compressed = await compressImage(photoFile, {
          maxWidth: 400, maxHeight: 400, quality: 0.7, maxSizeMB: 0.2
        });
        fileToUpload = new File([compressed.blob], photoFile.name, { type: "image/jpeg" });
      }

      // Upload ke R2 via JSON
      const result = await uploadToR2(
        fileToUpload,
        "foto-profil",
        session?.id_anggota || ""
      );

      if (result.ok && result.data?.url) {
        handleChange("Foto_Profil", result.data.url);
        const isCloud = !(result.data as any).fallback;
        showToast(
          isCloud ? "✅ Foto diupload ke cloud!" : "✅ Foto profil diperbarui.",
          "success"
        );
      } else {
        showToast(result.error || "Gagal upload foto", "error");
      }
    } catch (e: any) {
      console.error("[ProfilSaya] Upload error:", e);
      showToast("Kesalahan saat mengunggah foto: " + (e.message || ""), "error");
    } finally {
      setUploading(false);
      cancelPhotoUpload();
    }
  };

  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);

  // Field calculation for completeness
  const totalFields = 10;
  let filledFields = 0;
  if (formData.Nama_Lengkap) filledFields++;
  if (formData.Nama_Panggilan) filledFields++;
  if (formData.No_HP) filledFields++;
  if (formData.Email) filledFields++;
  if (formData.Tempat_Lahir) filledFields++;
  if (formData.Tanggal_Lahir) filledFields++;
  if (formData.Jenis_Kelamin) filledFields++;
  if (formData.Alamat) filledFields++;
  if (formData.Foto_Profil) filledFields++;
  if (formData.Bio) filledFields++;
  const completionPercentage = Math.round((filledFields / totalFields) * 100);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none">
          <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
          <div className="h-6 w-32 bg-slate-200 rounded"></div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none space-y-6">
          <div className="flex flex-col items-center gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="w-24 h-24 bg-slate-200 rounded-full"></div>
            <div className="h-8 w-32 bg-slate-200 rounded"></div>
          </div>
          <div className="space-y-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i}>
                <div className="h-4 w-24 bg-slate-200 rounded mb-2"></div>
                <div className="h-12 w-full bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (fetchError && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none">
          <button onClick={onClose} className="p-2 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/80 dark:bg-slate-800">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Profil Saya</h2>
        </div>
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 text-center shadow-sm dark:shadow-none">
          <AlertTriangle size={48} className="mx-auto text-rose-400 mb-4" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Gagal Memuat Data</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{fetchError}</p>
          <button onClick={loadData} className="px-6 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl flex items-center gap-2 mx-auto hover:bg-slate-200 dark:hover:bg-slate-700">
            <RefreshCw size={18} /> Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none sticky top-4 z-10">
        <div className="flex items-center gap-3">
          <button onClick={handleCancel} className="p-2 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/80 dark:bg-slate-800">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Profil Saya</h2>
        </div>

        <button
          type="button"
          onClick={() => setShowDigitalCard(true)}
          className="px-3.5 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs rounded-2xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <QrCode size={16} /> Kartu Digital
        </button>
      </div>

      {showDigitalCard && data && (
        <KartuAnggotaModal
          member={data}
          viewerRole={session?.role}
          onClose={() => setShowDigitalCard(false)}
          showToast={showToast}
        />
      )}

      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none space-y-6">
        
        {/* Progress Kelengkapan */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-bold text-slate-700 dark:text-slate-300">Kelengkapan Profil</span>
            <span className={`font-bold ${completionPercentage === 100 ? 'text-emerald-600' : 'text-blue-600'}`}>{completionPercentage}%</span>
          </div>
          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${completionPercentage === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
          {completionPercentage < 100 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Lengkapi data profil Anda untuk memudahkan komunikasi.</p>
          )}
        </div>

        {/* Foto Profil */}
        <div className="flex flex-col items-center gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="relative w-28 h-28 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-3xl font-bold border-4 border-white shadow-lg dark:shadow-none overflow-hidden group">
            {formData.Foto_Profil ? (
              <img src={formData.Foto_Profil} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span>{formData.Nama_Lengkap ? formData.Nama_Lengkap.charAt(0).toUpperCase() : <User size={48} />}</span>
            )}
            
            <label className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <UploadCloud size={24} />
              <span className="text-[10px] font-bold mt-1 uppercase">Ubah</span>
              <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" ref={fileInputRef} onChange={handlePhotoSelect} disabled={uploading} />
            </label>
            
            {uploading && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                <RefreshCw size={24} className="animate-spin text-emerald-600" />
              </div>
            )}
          </div>
          <div className="text-center">
            <button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={uploading}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {uploading ? t('common.status.processing', { defaultValue: 'Mengunggah...' }) : t('profile.fields.changePhoto', { defaultValue: 'Ganti Foto Profil' })}
            </button>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">JPG, PNG, WEBP (Max 5MB)</p>
          </div>
        </div>

        {/* Formulir */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">{t('profile.fields.memberId', { defaultValue: 'ID Anggota' })} <span className="text-slate-400 dark:text-slate-500 font-normal">(Readonly)</span></label>
              <div className="relative">
                <input type="text" value={formData.ID_Anggota || session?.id_anggota || "-"} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 font-mono text-slate-500 dark:text-slate-400 text-sm cursor-not-allowed" readOnly />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">{t('profile.fields.position', { defaultValue: 'Jabatan' })} <span className="text-slate-400 dark:text-slate-500 font-normal">(Readonly)</span></label>
              <input type="text" value={formData.Jabatan || "Anggota"} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm cursor-not-allowed" readOnly />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">{t('profile.fields.fullName', { defaultValue: 'Nama Lengkap' })} <span className="text-rose-500">*</span></label>
            <input 
              type="text" 
              value={formData.Nama_Lengkap || ""} 
              onChange={e => handleChange('Nama_Lengkap', e.target.value)}
              className={`w-full p-3 rounded-xl border ${errors.Nama_Lengkap ? 'border-rose-500 focus:ring-rose-200' : 'border-slate-200 dark:border-slate-800 focus:ring-emerald-200 focus:border-emerald-500'} bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 text-sm focus:ring-2 outline-none transition-all`} 
              placeholder={t('profile.placeholders.fullName', { defaultValue: 'Contoh: Andi Setiawan' })}
            />
            {errors.Nama_Lengkap && <p className="text-xs text-rose-500 mt-1">{errors.Nama_Lengkap}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">{t('profile.fields.nickname', { defaultValue: 'Nama Panggilan' })}</label>
              <input 
                type="text" 
                value={formData.Nama_Panggilan || ""} 
                onChange={e => handleChange('Nama_Panggilan', e.target.value)}
                className={`w-full p-3 rounded-xl border ${errors.Nama_Panggilan ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800 focus:border-emerald-500'} bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 text-sm focus:ring-2 focus:ring-emerald-200 outline-none transition-all`} 
                placeholder={t('profile.placeholders.nickname', { defaultValue: 'Nama Celukan' })}
              />
              {errors.Nama_Panggilan && <p className="text-xs text-rose-500 mt-1">{errors.Nama_Panggilan}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">{t('profile.fields.gender', { defaultValue: 'Jenis Kelamin' })} <span className="text-rose-500">*</span></label>
              <select 
                value={formData.Jenis_Kelamin || ""}
                onChange={e => handleChange('Jenis_Kelamin', e.target.value)}
                className={`w-full p-3 rounded-xl border ${errors.Jenis_Kelamin ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800 focus:border-emerald-500'} bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 text-sm focus:ring-2 focus:ring-emerald-200 outline-none transition-all appearance-none`}
              >
                <option value="">-- {t('common.button.filter', { defaultValue: 'Pilih' })} --</option>
                <option value="Laki-laki">{t('profile.gender.male', { defaultValue: 'Laki-laki' })}</option>
                <option value="Perempuan">{t('profile.gender.female', { defaultValue: 'Perempuan' })}</option>
              </select>
              {errors.Jenis_Kelamin && <p className="text-xs text-rose-500 mt-1">{errors.Jenis_Kelamin}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">{t('profile.fields.phone', { defaultValue: 'Nomor WhatsApp' })} <span className="text-rose-500">*</span></label>
              <input 
                type="tel" 
                value={formData.No_HP || ""} 
                onChange={e => handleChange('No_HP', e.target.value.replace(/\D/g, ''))}
                placeholder={t('profile.placeholders.phone', { defaultValue: '08...' })} 
                className={`w-full p-3 rounded-xl border ${errors.No_HP ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800 focus:border-emerald-500'} bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 text-sm focus:ring-2 focus:ring-emerald-200 outline-none transition-all`} 
              />
              {errors.No_HP && <p className="text-xs text-rose-500 mt-1">{errors.No_HP}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">{t('profile.fields.email', { defaultValue: 'Email' })} <span className="text-slate-400 dark:text-slate-500 font-normal">({t('announcement.priority.low', { defaultValue: 'Opsional' })})</span></label>
              <input 
                type="email" 
                value={formData.Email || ""} 
                onChange={e => handleChange('Email', e.target.value)}
                placeholder={t('profile.placeholders.email', { defaultValue: 'email@contoh.com' })} 
                className={`w-full p-3 rounded-xl border ${errors.Email ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800 focus:border-emerald-500'} bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 text-sm focus:ring-2 focus:ring-emerald-200 outline-none transition-all`} 
              />
              {errors.Email && <p className="text-xs text-rose-500 mt-1">{errors.Email}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">{t('profile.fields.birthPlace', { defaultValue: 'Tempat Lahir' })} <span className="text-rose-500">*</span></label>
              <input 
                type="text" 
                value={formData.Tempat_Lahir || ""} 
                onChange={e => handleChange('Tempat_Lahir', e.target.value)}
                className={`w-full p-3 rounded-xl border ${errors.Tempat_Lahir ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800 focus:border-emerald-500'} bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 text-sm focus:ring-2 focus:ring-emerald-200 outline-none transition-all`} 
                placeholder={t('profile.placeholders.birthPlace', { defaultValue: 'Kota/Kabupaten' })}
              />
              {errors.Tempat_Lahir && <p className="text-xs text-rose-500 mt-1">{errors.Tempat_Lahir}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">{t('profile.fields.birthDate', { defaultValue: 'Tanggal Lahir' })} <span className="text-rose-500">*</span></label>
              <input 
                type="date" 
                value={formData.Tanggal_Lahir ? formData.Tanggal_Lahir.split('T')[0] : ""} 
                onChange={e => handleChange('Tanggal_Lahir', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className={`w-full p-3 rounded-xl border ${errors.Tanggal_Lahir ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800 focus:border-emerald-500'} bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 text-sm focus:ring-2 focus:ring-emerald-200 outline-none transition-all`} 
              />
              {errors.Tanggal_Lahir && <p className="text-xs text-rose-500 mt-1">{errors.Tanggal_Lahir}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">{t('profile.fields.address', { defaultValue: 'Alamat Lengkap' })} <span className="text-rose-500">*</span></label>
            <textarea 
              rows={3} 
              value={formData.Alamat || ""}
              onChange={e => handleChange('Alamat', e.target.value)}
              className={`w-full p-3 rounded-xl border ${errors.Alamat ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800 focus:border-emerald-500'} bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 text-sm focus:ring-2 focus:ring-emerald-200 outline-none transition-all`} 
              placeholder={t('profile.placeholders.address', { defaultValue: 'RT 03 Legok RW 04 Denokan, Kelurahan...' })}
            ></textarea>
            {errors.Alamat && <p className="text-xs text-rose-500 mt-1">{errors.Alamat}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">{t('profile.fields.bio', { defaultValue: 'Bio / Deskripsi' })} <span className="text-slate-400 dark:text-slate-500 font-normal">({t('announcement.priority.low', { defaultValue: 'Opsional' })})</span></label>
            <textarea 
              rows={2} 
              value={formData.Bio || ""}
              onChange={e => handleChange('Bio', e.target.value)}
              className={`w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:border-emerald-500 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 text-sm focus:ring-2 focus:ring-emerald-200 outline-none transition-all`} 
              placeholder={t('profile.placeholders.bio', { defaultValue: 'Ceritakan sedikit tentang Anda...' })}
            ></textarea>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">{t('profile.fields.joinDate', { defaultValue: 'Tanggal Bergabung' })} <span className="text-slate-400 dark:text-slate-500 font-normal">(Readonly)</span></label>
              <input type="text" value={formData.Tanggal_Daftar ? formatDate(formData.Tanggal_Daftar) : "-"} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm cursor-not-allowed" readOnly />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Terakhir Diubah <span className="text-slate-400 dark:text-slate-500 font-normal">(Readonly)</span></label>
              <input type="text" value={formData.Terakhir_Diubah ? formatDate(formData.Terakhir_Diubah) : "-"} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm cursor-not-allowed" readOnly />
            </div>
          </div>

          {/* ================================================================ */}
          {/* F.4 PENGAJUAN PENGUNDURAN DIRI JABATAN */}
          {/* ================================================================ */}
          {formData.Jabatan && formData.Jabatan !== "Anggota" && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300">
                    <FileText size={18} />
                    <h4 className="font-extrabold text-sm">Pengajuan Pengunduran Diri Jabatan</h4>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 rounded-full text-[10px] font-black uppercase">
                    Jabatan: {formData.Jabatan}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Sesuai aturan F.4, pengajuan pengunduran diri jabatan <span className="font-bold">{formData.Jabatan}</span> wajib disetujui oleh <span className="font-black text-amber-700 dark:text-amber-300">{getApprovalRoleForResignation(formData.Jabatan || "")}</span>.
                </p>

                {/* List existing pending requests */}
                {appData?.PengunduranDiri?.filter(p => p.IDPengaju === session.id_anggota).map((req) => (
                  <div key={req.ID} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 dark:text-slate-200">Pengajuan Tanggal: {req.TanggalPengajuan}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        req.Status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                        req.Status === 'Disetujui' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {req.Status}
                      </span>
                    </div>
                    <p className="text-slate-500 italic">" {req.Alasan} "</p>
                  </div>
                ))}

                {/* Form to submit resignation */}
                <div className="space-y-2 pt-1">
                  <textarea
                    rows={2}
                    value={resignationReason}
                    onChange={e => setResignationReason(e.target.value)}
                    placeholder="Tuliskan alasan pengunduran diri secara rinci..."
                    className="w-full p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-400 outline-none"
                  />
                  <button
                    type="button"
                    disabled={!resignationReason.trim() || submittingResignation}
                    onClick={() => {
                      if (!resignationReason.trim() || !appData || !setAppData) return;
                      setSubmittingResignation(true);

                      const todayStr = new Date().toISOString().split('T')[0];
                      const newRequest: PengunduranDiriItem = {
                        ID: `MUNDUR-${Date.now()}`,
                        IDPengaju: session.id_anggota || "-",
                        Jabatan: formData.Jabatan || "Pengurus",
                        Alasan: resignationReason.trim(),
                        Status: "Pending",
                        TanggalPengajuan: todayStr
                      };

                      const updatedData = {
                        ...appData,
                        PengunduranDiri: [newRequest, ...(appData.PengunduranDiri || [])]
                      };

                      const loggedData = addLogAkses(
                        updatedData,
                        session.nama_lengkap || session.id_anggota || "Pengurus",
                        session.role,
                        "RESIGN_SUBMIT",
                        `Mengajukan pengunduran diri dari jabatan ${formData.Jabatan}`
                      );

                      setAppData(loggedData);
                      setResignationReason("");
                      setSubmittingResignation(false);
                      showToast(`Pengajuan pengunduran diri dari jabatan ${formData.Jabatan} berhasil dikirim ke ${getApprovalRoleForResignation(formData.Jabatan || "")}! 📑`, "success");
                    }}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-slate-950 font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Send size={14} /> Ajukan Pengunduran Diri Jabatan
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-3 mt-4">
          <button 
            onClick={handleSave} 
            disabled={!isDirty || saving || uploading}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all ${isDirty && !saving && !uploading ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md dark:shadow-none shadow-emerald-200' : 'bg-emerald-100 text-emerald-400 cursor-not-allowed'}`}
          >
            {saving ? (
              <><RefreshCw size={18} className="animate-spin" /> {t('common.status.saving', { defaultValue: 'Nyimpen...' })}</>
            ) : (
              <><Save size={18} /> {t('profile.buttons.save', { defaultValue: 'Simpan Perubahan' })}</>
            )}
          </button>
          
          <button 
            onClick={handleCancel} 
            className="px-6 py-3.5 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {t('profile.buttons.cancel', { defaultValue: 'Batal' })}
          </button>
        </div>
      </div>

      {/* Modal Upload Foto */}
      {photoPreviewUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-200">Preview Foto Profil</h3>
              <button onClick={cancelPhotoUpload} className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 dark:bg-slate-800 rounded-full">
                <ChevronLeft size={20} className="rotate-180" />
              </button>
            </div>
            
            <div className="p-6 flex flex-col items-center">
              <div className="w-48 h-48 rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-white shadow-lg dark:shadow-none overflow-hidden mb-4 relative">
                <img src={photoPreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                {uploading && (
                  <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center text-emerald-600">
                    <RefreshCw size={32} className="animate-spin mb-2" />
                    <span className="text-xs font-bold">Mengunggah...</span>
                  </div>
                )}
              </div>
              
              <div className="text-center w-full">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{photoFile?.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Ukuran: {photoFile ? (photoFile.size / 1024).toFixed(1) : 0} KB
                </p>
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex gap-2">
              <button 
                onClick={cancelPhotoUpload}
                disabled={uploading}
                className="flex-1 py-3 text-sm font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 dark:bg-slate-800/50 disabled:opacity-50"
              >
                Batal
              </button>
              <button 
                onClick={handleUploadPhoto}
                disabled={uploading}
                className="flex-1 py-3 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50 shadow-md dark:shadow-none flex justify-center items-center gap-2"
              >
                {uploading ? <RefreshCw size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
