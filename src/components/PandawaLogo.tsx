import React from "react";

interface PandawaLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export default function PandawaLogo({ className = "", size = 40, showText = false }: PandawaLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-md"
      >
        {/* Outer Laurel / Wreath (Padi & Kapas) */}
        <path
          d="M35 140C25 115 25 80 45 50C65 25 90 20 100 20C110 20 135 25 155 50C175 80 175 115 165 140"
          stroke="#F59E0B"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M45 150C35 125 35 90 50 65"
          stroke="#EAB308"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M155 150C165 125 165 90 150 65"
          stroke="#EAB308"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />

        {/* Wings - Left & Right */}
        <g stroke="#0F172A" strokeWidth="1.5">
          {/* Left Wing */}
          <path d="M55 70 L20 50 L35 85 L18 110 L52 102 Z" fill="#DC2626" />
          <path d="M48 75 L26 60 L38 88 L25 104 L46 98 Z" fill="#FFFFFF" />
          <path d="M53 70 L68 55 L48 80 Z" fill="#DC2626" />

          {/* Right Wing */}
          <path d="M145 70 L180 50 L165 85 L182 110 L148 102 Z" fill="#2563EB" />
          <path d="M152 75 L174 60 L162 88 L175 104 L154 98 Z" fill="#FFFFFF" />
          <path d="M147 70 L132 55 L152 80 Z" fill="#2563EB" />
        </g>

        {/* 5 Golden Stars at Top */}
        <g fill="#FBBF24" stroke="#92400E" strokeWidth="0.8">
          {/* Center Star */}
          <polygon points="100,15 102.5,21 109,21.5 104,26 105.5,32 100,29 94.5,32 96,26 91,21.5 97.5,21" transform="scale(0.9) translate(5, -2)" />
          {/* Inner Left Star */}
          <polygon points="100,15 102.5,21 109,21.5 104,26 105.5,32 100,29 94.5,32 96,26 91,21.5 97.5,21" transform="scale(0.8) translate(-10, 3)" />
          {/* Inner Right Star */}
          <polygon points="100,15 102.5,21 109,21.5 104,26 105.5,32 100,29 94.5,32 96,26 91,21.5 97.5,21" transform="scale(0.8) translate(20, 3)" />
          {/* Outer Left Star */}
          <polygon points="100,15 102.5,21 109,21.5 104,26 105.5,32 100,29 94.5,32 96,26 91,21.5 97.5,21" transform="scale(0.7) translate(-26, 10)" />
          {/* Outer Right Star */}
          <polygon points="100,15 102.5,21 109,21.5 104,26 105.5,32 100,29 94.5,32 96,26 91,21.5 97.5,21" transform="scale(0.7) translate(37, 10)" />
        </g>

        {/* Shield Outer Border & Background */}
        <path d="M100 32C132 32 155 48 155 92C155 132 128 165 100 180C72 165 45 132 45 92C45 48 68 32 100 32Z" fill="#0F172A" stroke="#FBBF24" strokeWidth="5" />
        
        {/* Shield Left Half (Red) & Right Half (Blue) */}
        <path d="M100 35C130 35 150 50 150 92C150 128 125 158 100 172V35Z" fill="#1D4ED8" />
        <path d="M100 35C70 35 50 50 50 92C50 128 75 158 100 172V35Z" fill="#DC2626" />

        {/* Central Torch & Flame */}
        <path d="M95 95H105V130H95V95Z" fill="#FBBF24" stroke="#B45309" strokeWidth="1.5" />
        <path d="M100 55C100 55 116 75 110 98C106 110 94 110 90 98C84 75 100 55 100 55Z" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5" />
        <path d="M100 68C100 68 108 80 105 94C103 100 97 100 95 94C92 80 100 68 100 68Z" fill="#FEF08A" />
      </svg>

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


