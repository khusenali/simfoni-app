"use client";

import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

export default function SortableHeader({ label, column, sortBy, sortDir, onSort, className = "" }) {
  const active = sortBy === column;
  const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      onClick={() => onSort(column)}
      className={`flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-left ${active ? "text-ink" : "text-slate-soft"} hover:text-ink ${className}`}
    >
      {label}
      <Icon size={12} className={active ? "opacity-100" : "opacity-40"} />
    </button>
  );
}