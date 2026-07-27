import React, { useState, useEffect, useRef } from "react";
import { Eye, EyeOff, Shield, ShieldAlert, CheckCircle2, AlertTriangle } from "lucide-react";

interface PINFieldProps {
  id: string;
  label?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  maxLength?: number;
  required?: boolean;
  disabled?: boolean;
  isID?: boolean; // If true, default is shown (type text)
  showStrength?: boolean; // Show strength meter for Super Admin
  autoHide30s?: boolean; // Automatically hide after 30 seconds
  className?: string;
  inputClassName?: string;
  error?: string | boolean;
  hideProgressText?: boolean;
}

export default function PINField({
  id,
  label,
  value,
  onChange,
  placeholder = "••••••",
  maxLength = 6,
  required = true,
  disabled = false,
  isID = false,
  showStrength = false,
  autoHide30s = true,
  className = "",
  inputClassName = "",
  error,
  hideProgressText = false,
}: PINFieldProps) {
  // Default shown is true if isID is true, otherwise false (hidden)
  const [showText, setShowText] = useState(isID);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-hide feature: hide PIN after 30 seconds if it's shown and not an ID
  useEffect(() => {
    if (autoHide30s && !isID && showText && value) {
      // Clear any existing timer
      if (timerRef.current) clearTimeout(timerRef.current);

      // Set new timer to hide after 30 seconds (30000ms)
      timerRef.current = setTimeout(() => {
        setShowText(false);
      }, 30000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [showText, value, autoHide30s, isID]);

  // Blur on tab switch or page hide
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !isID) {
        setShowText(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isID]);

  // PIN Strength calculation (For Super Admin 8-digit PIN)
  const getPINStrength = (pin: string) => {
    if (!pin) return { label: "", color: "bg-slate-200", textClass: "text-slate-400 dark:text-slate-500", score: 0 };
    if (pin.length < 8) return { label: "Sangat Lemah (Min 8 digit)", color: "bg-red-500", textClass: "text-red-600", score: 1 };

    // Common bad patterns
    const sequentialAsc = "1234567890123456789";
    const sequentialDesc = "9876543210987654321";
    const isRepetitive = /^(\d)\1+$/.test(pin);
    const isSeqAsc = sequentialAsc.includes(pin);
    const isSeqDesc = sequentialDesc.includes(pin);

    if (isRepetitive || isSeqAsc || isSeqDesc) {
      return { label: "Sangat Lemah (Pola Terlalu Mudah)", color: "bg-red-500", textClass: "text-red-600", score: 1 };
    }

    // Number of unique characters
    const uniqueChars = new Set(pin).size;
    if (uniqueChars <= 2) {
      return { label: "Lemah", color: "bg-orange-500", textClass: "text-orange-500", score: 2 };
    }
    if (uniqueChars <= 4) {
      return { label: "Cukup", color: "bg-amber-500", textClass: "text-amber-600", score: 3 };
    }
    if (uniqueChars <= 6) {
      return { label: "Kuat", color: "bg-emerald-500", textClass: "text-emerald-600", score: 4 };
    }
    return { label: "Sangat Kuat", color: "bg-green-600", textClass: "text-green-700", score: 5 };
  };

  const strength = showStrength ? getPINStrength(value) : null;

  const hasBgClass = inputClassName.includes("bg-");
  const hasTextClass = inputClassName.includes("text-");

  return (
    <div className={`space-y-1 ${className}`} id={`pinfield-container-${id}`}>
      {label && (
        <label 
          htmlFor={id} 
          className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
          id={`pinfield-label-${id}`}
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center" id={`pinfield-wrapper-${id}`}>
        <input
          ref={inputRef}
          id={id}
          type={showText ? "text" : "password"}
          required={required}
          disabled={disabled}
          maxLength={maxLength}
          value={value}
          onChange={(e) => {
            // Only allow numbers for PIN fields (not IDs)
            const rawVal = e.target.value;
            if (!isID) {
              const numericVal = rawVal.replace(/[^0-9]/g, "");
              onChange(numericVal);
            } else {
              onChange(rawVal);
            }
          }}
          inputMode={isID ? "text" : "numeric"}
          pattern={isID ? undefined : "[0-9]*"}
          autoComplete="off"
          autoCapitalize={isID ? "characters" : "none"}
          spellCheck={false}
          autoCorrect="off"
          autoFocus={true}
          placeholder={placeholder}
          className={`w-full p-3.5 pr-12 border ${
            !hasBgClass ? "bg-slate-50 dark:bg-slate-800/50" : ""
          } ${
            !hasTextClass ? "text-slate-900 dark:text-slate-100" : ""
          } ${
            error ? "border-red-300 focus:ring-red-500" : "border-slate-200 dark:border-slate-800 focus:ring-emerald-500"
          } rounded-xl text-center ${
            !isID ? "text-xl tracking-widest font-bold font-mono" : "text-sm font-mono"
          } focus:ring-2 outline-none transition-all disabled:opacity-50 ${inputClassName}`}
        />

        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.preventDefault();
            setShowText(!showText);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          disabled={disabled}
          className="absolute right-3.5 p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 focus:outline-none rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/80 dark:bg-slate-800 transition-colors"
          title={showText ? "Sembunyikan" : "Tampilkan"}
          id={`pinfield-toggle-${id}`}
        >
          {showText ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>

      {/* Screen Sharing Warning on Display */}
      {showText && !isID && (
        <div className="text-[10px] text-amber-600 flex items-center gap-1 mt-1 font-medium animate-pulse" id={`pinfield-warn-${id}`}>
          <AlertTriangle size={12} /> Hati-hati layar Anda sedang menampilkan PIN rahasia!
        </div>
      )}

      {/* Character Counter & Warnings */}
      <div className="flex justify-between items-center text-[10px] px-1" id={`pinfield-info-${id}`}>
        <div>
          {error && typeof error === 'string' ? (
            <span className="text-red-500 font-medium">{error}</span>
          ) : (
            !hideProgressText && value && !isID && value.length < maxLength && (
              <span className="text-amber-500">Kurang {maxLength - value.length} digit</span>
            )
          )}
        </div>
        <div className={`font-mono font-bold ${
            value.length === 0 ? 'text-slate-400 dark:text-slate-500' :
            value.length === maxLength ? 'text-emerald-500' :
            'text-amber-500'
        }`}>
          {value.length}/{maxLength}
        </div>
      </div>

      {/* Strength indicator (for Super Admin PIN) */}
      {showStrength && strength && value.length > 0 && (
        <div className="space-y-1.5 pt-1" id={`pinfield-strength-${id}`}>
          <div className="flex items-center justify-between text-[10px] font-bold">
            <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kekuatan PIN:</span>
            <span className={`${strength.textClass} flex items-center gap-1`}>
              {strength.score >= 3 ? <CheckCircle2 size={12} /> : <ShieldAlert size={12} />}
              {strength.label}
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className={`h-full flex-1 transition-all duration-300 ${
                  step <= strength.score ? strength.color : "bg-slate-200"
                }`}
              />
            ))}
          </div>
          {strength.score < 3 && (
            <p className="text-[9px] text-red-500 italic mt-0.5">
              * PIN Super Admin baru minimal harus berkekuatan "Cukup" (hindari urutan, repetisi, atau terlalu sedikit kombinasi angka).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
