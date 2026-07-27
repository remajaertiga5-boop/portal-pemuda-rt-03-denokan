import React, { useRef, useState } from "react";
import { X, Download, FileText, MessageCircle, ShieldCheck, QrCode as QrIcon } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { AnggotaItem, UserRole } from "../types";
import PandawaLogo from "./PandawaLogo";

interface KartuAnggotaModalProps {
  member: AnggotaItem;
  viewerRole?: UserRole;
  onClose: () => void;
  showToast?: (msg: string, type: "success" | "error" | "info" | "warning") => void;
}

/**
 * Helper to mask/sensor ID based on viewer authorization (H.1)
 */
function maskIDAnggota(id: string, viewerRole?: UserRole): string {
  if (!id) return "-";
  if (!viewerRole) {
    // Sensor for unauthorized/guest view
    return id.length > 5 ? `${id.substring(0, 4)}***${id.substring(id.length - 1)}` : "***";
  }
  return id;
}

/**
 * QR Code Simple Generator for Card ID (Deterministic SVG Matrix)
 */
function CardQRCodeSVG({ value }: { value: string }) {
  // Simple deterministic hash to build a 13x13 grid matrix with finder patterns
  const size = 15;
  const grid: boolean[][] = Array(size).fill(false).map(() => Array(size).fill(false));

  // Helper to draw QR finder pattern (top-left, top-right, bottom-left)
  const drawFinder = (startX: number, startY: number) => {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (r === 0 || r === 4 || c === 0 || c === 4 || (r >= 1 && r <= 3 && c >= 1 && c <= 3 && (r === 2 || c === 2))) {
          grid[startY + r][startX + c] = true;
        }
      }
    }
  };

  drawFinder(0, 0); // Top-left
  drawFinder(size - 5, 0); // Top-right
  drawFinder(0, size - 5); // Bottom-left

  // Seeded pseudo-random data fill
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Skip finder patterns
      if ((r < 5 && c < 5) || (r < 5 && c >= size - 5) || (r >= size - 5 && c < 5)) continue;
      const bit = ((hash ^ (r * 17 + c * 31)) & 1) === 1;
      grid[r][c] = bit;
    }
  }

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-10 h-10 bg-white p-1 rounded-md shadow-inner shrink-0">
      {grid.map((row, r) =>
        row.map((cell, c) =>
          cell ? <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#0f172a" /> : null
        )
      )}
    </svg>
  );
}

export default function KartuAnggotaModal({
  member,
  viewerRole,
  onClose,
  showToast
}: KartuAnggotaModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloadingPNG, setDownloadingPNG] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  // H.3 Kondisional WA Chat Button
  const rawNoWa = member.NoWA || member.No_HP || "";
  const isWaVisible =
    (member.TampilkanWA === "Ya" ||
      member.TampilkanWA === "ya" ||
      member.TampilkanWA === "YA") &&
    rawNoWa.trim().length > 0;

  const handleSendWA = () => {
    if (!rawNoWa) return;
    const cleanPhone = rawNoWa.replace(/^0/, "62").replace(/\D/g, "");
    const message = encodeURIComponent(
      `Halo ${member.Nama_Panggilan || member.Nama_Lengkap}, saya menghubungi Anda melalui Kartu Anggota Pandawa Ertiga (Remaja Legok 03).`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank");
  };

  // H.2 Download PNG (3x Scale for Print Quality)
  const handleDownloadPNG = async () => {
    if (!cardRef.current) return;
    setDownloadingPNG(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3, // 3x scale for crisp print quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#0b0f19",
      });
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `Kartu_Anggota_${member.Nama_Panggilan || member.Nama_Lengkap}_${member.ID_Anggota}.png`;
      link.href = dataUrl;
      link.click();
      if (showToast) showToast("Kartu Anggota berhasil diunduh sebagai PNG (Kualitas Cetak HD 3x)! 🖼️", "success");
    } catch (err) {
      console.error(err);
      if (showToast) showToast("Gagal mengunduh kartu sebagai PNG.", "error");
    } finally {
      setDownloadingPNG(false);
    }
  };

  // H.2 Download PDF (Standard ID Card Size 85mm x 54mm)
  const handleDownloadPDF = async () => {
    if (!cardRef.current) return;
    setDownloadingPDF(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#0b0f19",
      });
      const imgData = canvas.toDataURL("image/png");

      // Standard ID Card PDF: 85mm x 54mm landscape
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [85, 54],
      });

      pdf.addImage(imgData, "PNG", 0, 0, 85, 54);
      pdf.save(`Kartu_Anggota_${member.Nama_Panggilan || member.Nama_Lengkap}_${member.ID_Anggota}.pdf`);
      if (showToast) showToast("Kartu Anggota berhasil diunduh sebagai PDF (85mm x 54mm)! 📄", "success");
    } catch (err) {
      console.error(err);
      if (showToast) showToast("Gagal mengunduh kartu sebagai PDF.", "error");
    } finally {
      setDownloadingPDF(false);
    }
  };

  const maskedID = maskIDAnggota(member.ID_Anggota, viewerRole);
  const serialNo = `SERIAL: PE3-${member.ID_Anggota}-2026`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-amber-500/30 p-6 rounded-3xl max-w-md w-full space-y-5 shadow-2xl relative text-white">
        {/* Header Close Button */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-amber-400" />
            <h3 className="font-extrabold text-sm text-white">Kartu Anggota Digital Resmi</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-full transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* H.1 DESAIN KARTU ANGGOTA DIGITAL (Standard CR80 Printable Canvas) */}
        {/* ========================================================================= */}
        <div className="flex justify-center overflow-x-auto py-1">
          <div
            ref={cardRef}
            id="digital-member-card"
            className="w-[360px] h-[228px] rounded-2xl p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/80 border-2 border-amber-400/50 shadow-2xl flex flex-col justify-between relative overflow-hidden text-white shrink-0 select-none"
          >
            {/* Background Decorative Accents */}
            <div className="absolute -right-8 -top-8 w-28 h-28 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="absolute -left-8 -bottom-8 w-28 h-28 bg-purple-500/10 rounded-full blur-xl pointer-events-none" />

            {/* [H.1 HEADER] Logo Pandawa Ertiga + Title */}
            <div className="flex items-center justify-between border-b border-amber-400/30 pb-2 z-10">
              <div className="flex items-center gap-2">
                <PandawaLogo size={32} />
                <div>
                  <h4 className="font-black text-amber-400 text-xs tracking-wider uppercase leading-none">
                    PANDAWA ERTIGA
                  </h4>
                  <p className="text-[8.5px] text-slate-300 font-medium leading-tight">
                    Pemuda Andalan Warga RT 3
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="px-1.5 py-0.5 bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[8px] font-black rounded uppercase">
                  RESMI
                </span>
              </div>
            </div>

            {/* [H.1 BODY] Foto Profil (bulat) | Nama Panggilan | Nama Lengkap | ID | Jabatan */}
            <div className="flex items-center gap-3.5 my-auto z-10">
              {/* Foto Profil Bulat */}
              <div className="relative shrink-0">
                {member.Foto_Profil || member.FotoProfilURL ? (
                  <img
                    src={member.Foto_Profil || member.FotoProfilURL}
                    alt={member.Nama_Lengkap}
                    className="w-16 h-16 rounded-full object-cover border-2 border-amber-400 shadow-md"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-amber-400 flex items-center justify-center font-black text-xl text-amber-300 shadow-md">
                    {(member.Nama_Panggilan || member.Nama_Lengkap || "A").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-950" title="Status Aktif" />
              </div>

              {/* Text Information */}
              <div className="min-w-0 flex-1 space-y-0.5">
                <h3 className="font-black text-white text-sm truncate leading-snug">
                  {member.Nama_Panggilan || member.Nama_Lengkap}
                </h3>
                <p className="text-[10px] text-slate-300 truncate font-medium">
                  {member.Nama_Lengkap}
                </p>

                <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                  <div className="bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800 font-mono text-[10px] text-amber-400 font-bold">
                    ID: {maskedID}
                  </div>
                  <div className="bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800 text-[9px] text-purple-300 font-bold uppercase">
                    {member.Jabatan || member.Role || "Anggota"}
                  </div>
                </div>
              </div>
            </div>

            {/* [H.1 FOOTER] QR Code & Nomor Seri */}
            <div className="flex items-end justify-between border-t border-amber-400/20 pt-1.5 z-10">
              <div>
                <p className="text-[7.5px] font-mono text-slate-400 uppercase tracking-tight">
                  RT 03 Legok RW 04 Denokan, Gondoryo
                </p>
                <p className="text-[7px] font-mono text-amber-400/80 font-semibold">
                  {serialNo}
                </p>
              </div>

              <CardQRCodeSVG value={`PANDAWA-ERTIGA-${member.ID_Anggota}`} />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ACTION BUTTONS (H.2 Download & H.3 Conditional Chat WA) */}
        {/* ========================================================================= */}
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-2 gap-2">
            {/* Download PNG */}
            <button
              type="button"
              disabled={downloadingPNG}
              onClick={handleDownloadPNG}
              className="py-2.5 px-3 bg-amber-400 hover:bg-amber-500 disabled:bg-slate-800 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Download size={14} /> {downloadingPNG ? "Mengunduh..." : "Download PNG (HD 3x)"}
            </button>

            {/* Download PDF */}
            <button
              type="button"
              disabled={downloadingPDF}
              onClick={handleDownloadPDF}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800 text-amber-300 border border-amber-500/30 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <FileText size={14} /> {downloadingPDF ? "Mengunduh..." : "Download PDF (ID Card)"}
            </button>
          </div>

          {/* H.3 KONDISIONAL TOMBOL CHAT WA */}
          {/* TAMPIL jika TampilkanWA === 'Ya' DAN NoWA/No_HP tidak kosong */}
          {/* SEMBUNYI jika TampilkanWA === 'Tidak' ATAU NoWA/No_HP kosong untuk SEMUA pihak */}
          {isWaVisible && (
            <button
              type="button"
              onClick={handleSendWA}
              className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
            >
              <MessageCircle size={15} /> Chat WhatsApp Anggota ({rawNoWa})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
