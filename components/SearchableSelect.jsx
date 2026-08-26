"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, Check } from "lucide-react";

// Dropdown dengan kotak pencarian di dalamnya -- pengganti <select> biasa untuk
// daftar panjang (sektor, distrik, dll). API-nya sengaja mirip <select> lama
// (value, onChange, options, labels) supaya gampang ditukar di tempat lain.
export default function SearchableSelect({
  value, onChange, options, labels, placeholder = "Pilih...", className = "",
  size = "md", // "sm" (dipakai di filter ringkas) | "md" (dipakai di form)
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (open) { setQuery(""); setTimeout(() => inputRef.current?.focus(), 0); }
  }, [open]);

  const filtered = options.filter((o) =>
    (labels?.[o] || o).toLowerCase().includes(query.toLowerCase())
  );

  const displayValue = labels?.[value] || value || placeholder;
  const sizeCls = size === "sm"
    ? "text-[11px] tablet:text-sm px-2 py-1.5 tablet:px-3 tablet:py-2"
    : "text-sm px-3 py-2.5";

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-2 bg-white border border-line rounded-lg text-ink font-medium outline-none cursor-pointer truncate ${sizeCls}`}
      >
        <span className="truncate">{displayValue}</span>
        <ChevronDown size={14} className="text-slate-soft shrink-0" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full min-w-[220px] bg-white border border-line rounded-lg shadow-lg overflow-hidden dropdown-panel">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-line">
            <Search size={14} className="text-slate-soft shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari..."
              className="w-full text-sm outline-none placeholder:text-slate-soft"
            />
          </div>
          <div className="max-h-60 overflow-y-auto scrollbar-thin">
            {filtered.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => { onChange(o); setOpen(false); }}
                className="w-full flex items-center justify-between gap-2 text-left px-3 py-2 text-sm hover:bg-bg"
              >
                <span className="truncate">{labels?.[o] || o}</span>
                {o === value && <Check size={14} className="text-teal shrink-0" />}
              </button>
            ))}
            {!filtered.length && (
              <p className="px-3 py-3 text-sm text-slate-soft text-center">Tidak ditemukan.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}