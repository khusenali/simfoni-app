import { statusLabel } from "../lib/format";

const SENTIMEN_STYLE = {
  Positif: "bg-teal-light text-teal-dark",
  Netral: "bg-gray-100 text-neutral",
  Negatif: "bg-orange-50 text-coral",
};

const STATUS_STYLE = {
  Draft: "bg-amber-50 text-gold",
  Terverifikasi: "bg-sky-50 text-sky-700",
};

// Label tampilan untuk status — nilai di database TETAP "Draft"/"Terverifikasi"
// (sesuai CHECK constraint di lib/db.js dan dipakai di semua query filter),
// hanya teks yang ditampilkan ke pengguna yang diganti di titik ini.
const STATUS_LABEL = {
  Draft: "Tercatat",
  Terverifikasi: "Terverifikasi",
};

export function SentimenBadge({ value }) {
  if (!value) return null;
  return <span className={`badge ${SENTIMEN_STYLE[value] || "bg-gray-100 text-neutral"}`}>{value}</span>;
}

export function StatusBadge({ value }) {
  if (!value) return null;
  return <span className={`badge ${STATUS_STYLE[value] || "bg-gray-100 text-neutral"}`}>{STATUS_LABEL[value] || value}</span>;
}

export function MiripBadge({ skor }) {
  if (!skor) return null;
  return (
    <span className="badge bg-amber-50 text-gold" title={`Kemiripan ${skor}% dengan fenomena lain`}>
      ⚠ Mirip {skor}%
    </span>
  );
}