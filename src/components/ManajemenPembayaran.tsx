import React, { useState } from "react";
import { AppData } from "../utils/dataStore";
import { useLocale } from "../hooks/useLocale";
import { PaymentInfoItem, PaymentProofItem } from "../types";
import { Plus, Trash2, CheckCircle2, XCircle, Banknote, QrCode } from "lucide-react";

interface ManajemenPembayaranProps {
  appData: AppData;
  setAppData: React.Dispatch<React.SetStateAction<AppData>>;
  showToast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
}

export default function ManajemenPembayaran({ appData, setAppData, showToast }: ManajemenPembayaranProps) {
  const [newInfo, setNewInfo] = useState<Partial<PaymentInfoItem>>({});

  const handleAddPaymentInfo = () => {
    if (!newInfo.Nama_Akun || !newInfo.Nomor_Rekening) {
      showToast("Lengkapi data pembayaran!", "error");
      return;
    }
    const newItem: PaymentInfoItem = {
      ID: Date.now().toString(),
      Nama_Akun: newInfo.Nama_Akun,
      Nomor_Rekening: newInfo.Nomor_Rekening,
      Nama_Bank_QRIS: newInfo.Nama_Bank_QRIS || "",
      Visibilitas: (newInfo.Visibilitas as any) || "Anggota",
      Tanggal_Dibuat: new Date().toISOString().split('T')[0],
      Dibuat_Oleh: "Bendahara/Ketua Humas" // Should probably get dynamic name
    };

    setAppData(prev => ({
      ...prev,
      PaymentInfo: [...prev.PaymentInfo, newItem]
    }));
    setNewInfo({});
    showToast("Data pembayaran berhasil ditambah", "success");
  };

  const handleStatusProof = (id: string, status: "Disetujui" | "Ditolak", catatan?: string) => {
    setAppData(prev => ({
      ...prev,
      PaymentProofs: prev.PaymentProofs.map(p => p.ID === id ? { ...p, Status: status, Catatan_Admin: catatan } : p)
    }));
    showToast(`Bukti pembayaran ${status.toLowerCase()}`, "success");
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
        <h3 className="text-lg font-black text-white mb-4">Pengaturan Info Pembayaran</h3>
        {/* Simplified form for demo - usually need more fields */}
        <div className="flex gap-2">
            <input placeholder="Nama Bank/QRIS" className="p-2 bg-slate-800 rounded-xl" onChange={e => setNewInfo({...newInfo, Nama_Bank_QRIS: e.target.value})} />
            <input placeholder="No Rek" className="p-2 bg-slate-800 rounded-xl" onChange={e => setNewInfo({...newInfo, Nomor_Rekening: e.target.value})} />
            <button onClick={handleAddPaymentInfo} className="bg-amber-500 p-2 rounded-xl"><Plus size={16}/></button>
        </div>
      </div>
      
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
        <h3 className="text-lg font-black text-white mb-4">Daftar Bukti Pembayaran</h3>
        <div className="space-y-3">
          {appData.PaymentProofs.map(p => (
            <div key={p.ID} className="flex justify-between items-center bg-slate-800 p-4 rounded-xl">
              <div>
                <p className="font-bold">{p.Nama_Anggota}</p>
                <p className="text-xs text-slate-400">Rp {p.Jumlah_Bayar} | {p.Status}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleStatusProof(p.ID, "Disetujui")} className="text-green-500"><CheckCircle2 /></button>
                <button onClick={() => handleStatusProof(p.ID, "Ditolak")} className="text-red-500"><XCircle /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
