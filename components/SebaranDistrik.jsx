"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 7;

export default function SebaranDistrik({ items }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const max = Math.max(...items.map((i) => i.jumlah), 1);

  const filtered = useMemo(() => {
    if (!q) return items;
    return items.filter((i) => i.nama.toLowerCase().includes(q.toLowerCase()));
  }, [items, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => { setPage(1); }, [q]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const emptySlots = paged.length ? PAGE_SIZE - paged.length : 0;

  return (
    <div className="card p-4 tablet:p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3 tablet:mb-4">
        <h3 className="font-bold text-ink text-sm tablet:text-base">Sebaran per Distrik</h3>
        <span className="text-[11px] tablet:text-xs text-slate-soft">{items.length} Distrik</span>
      </div>

      <div className="flex items-center gap-2 bg-bg rounded-lg px-2.5 py-1.5 tablet:px-3 tablet:py-2 mb-3 tablet:mb-4">
        <Search className="w-3.5 h-3.5 tablet:w-4 tablet:h-4 text-slate-soft shrink-0" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari distrik / kampung"
          className="bg-transparent outline-none text-xs tablet:text-sm w-full placeholder:text-slate-soft"
        />
      </div>

      <div key={page} className="space-y-2 tablet:space-y-3 flex-1 list-fade">
        {paged.map((d) => (
          <div key={d.nama} className="flex items-center gap-2 tablet:gap-3">
            <span className="w-20 tablet:w-28 text-[10px] tablet:text-xs font-medium text-ink shrink-0 leading-tight">{d.nama}</span>
            <div className="flex-1 h-1.5 tablet:h-2 rounded-full bg-bg overflow-hidden">
              <div className="h-full bg-teal-dark rounded-full" style={{ width: `${(d.jumlah / max) * 100}%` }} />
            </div>
            <span className="w-5 tablet:w-6 text-xs tablet:text-sm font-bold text-ink text-right">{d.jumlah}</span>
          </div>
        ))}
        {!paged.length && <p className="text-xs tablet:text-sm text-slate-soft">Tidak ditemukan.</p>}
        {/* slot kosong "hantu" -- menjaga tinggi card selalu sama persis 7 baris,
            supaya tombol navigasi di bawah tidak naik-turun mengikuti sisa baris. */}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div key={`spacer-${i}`} className="flex items-center gap-2 tablet:gap-3 invisible" aria-hidden="true">
            <span className="w-20 tablet:w-28 text-[10px] tablet:text-xs font-medium shrink-0 leading-tight">-</span>
            <div className="flex-1 h-1.5 tablet:h-2 rounded-full bg-bg overflow-hidden" />
            <span className="w-5 tablet:w-6 text-xs tablet:text-sm font-bold text-right">0</span>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 tablet:gap-3 mt-3 tablet:mt-4 pt-1">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="w-7 h-7 tablet:w-8 tablet:h-8 rounded-full border border-line flex items-center justify-center disabled:opacity-40 hover:bg-bg transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5 tablet:w-4 tablet:h-4" />
          </button>
          <span className="text-[11px] tablet:text-xs text-slate-soft">Halaman {page} dari {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="w-7 h-7 tablet:w-8 tablet:h-8 rounded-full border border-line flex items-center justify-center disabled:opacity-40 hover:bg-bg transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5 tablet:w-4 tablet:h-4" />
          </button>
        </div>
      )}
    </div>
  );
}