"use client";

import { useState, useRef, useEffect } from "react";
import { ExternalLink, ChevronDown } from "lucide-react";

// Daftar situs referensi eksternal terkait analisis PDRB.
// Tinggal tambah/ubah/hapus baris di array ini -- gak perlu ubah kode
// komponen di bawah. GANTI url PLACEHOLDER di bawah dengan link aslinya.
const EXTERNAL_LINKS = [
  { nama: "BPS Kabupaten Raja Ampat", url: "https://rajaampatkab.bps.go.id" },
  { nama: "BPS Provinsi Papua Barat Daya", url: "https://papuabaratdaya.bps.go.id" },
  { nama: "Portal Satu Data Indonesia", url: "https://data.go.id" },
  // { nama: "Nama situs lain", url: "https://contoh-situs.go.id" },
];

export default function ReferensiEksternal() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Referensi Eksternal"
        className="flex items-center gap-2 px-3 tablet:px-4 py-2.5 rounded-lg border border-line bg-white text-sm font-semibold text-ink hover:bg-bg"
      >
        <ExternalLink size={16} className="shrink-0" />
        <span className="hidden tablet:inline">Referensi Eksternal</span>
        <ChevronDown size={14} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-line rounded-lg shadow-lg py-1.5 z-20">
          {EXTERNAL_LINKS.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-ink hover:bg-bg"
            >
              {link.nama}
              <ExternalLink size={13} className="text-slate-soft shrink-0" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}