"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import PendataanModal from "./PendataanModal";
import LaporanModal from "./LaporanModal";

export default function DashboardActions({ initialPeriod }) {
  const router = useRouter();
  const [showPendataan, setShowPendataan] = useState(false);
  const [showLaporan, setShowLaporan] = useState(false);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={() => setShowLaporan(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-line bg-white text-sm font-semibold text-ink hover:bg-bg"
      >
        Unduh Laporan
      </button>
      <button
        onClick={() => setShowPendataan(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-dark text-white text-sm font-semibold hover:bg-teal-dark/90"
      >
        <Plus size={16} /> Tambah Fenomena
      </button>

      <PendataanModal open={showPendataan} onClose={() => setShowPendataan(false)} onSaved={() => router.refresh()} />
      <LaporanModal open={showLaporan} onClose={() => setShowLaporan(false)} initialPeriod={initialPeriod} />
    </div>
  );
}
