import React from "react";

interface PandawaLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

/**
 * Logo Resmi Pandawa Ertiga — Pemuda Andalan Warga RT 3
 * Menggunakan logo PNG transparan asli.
 */
export default function PandawaLogo({ className = "", size = 40, showText = false }: PandawaLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <img
        src="/logo-pandawa.png"
        alt="Pandawa Ertiga - Pemuda Andalan Warga RT 3"
        width={size}
        height={size}
        className="shrink-0 drop-shadow-md object-contain"
        style={{ width: size, height: size }}
      />

      {showText && (
        <div className="flex flex-col">
          <span className="font-black text-sm text-slate-900 dark:text-white tracking-wide leading-none">
            PANDAWA ERTIGA
          </span>
          <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mt-0.5">
            RT 03 / RW 04 Denokan
          </span>
        </div>
      )}
    </div>
  );
}
