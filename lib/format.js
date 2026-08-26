// lib/format.js
export const STATUS_LABELS = { Draft: "Tercatat", Terverifikasi: "Terverifikasi" };

export function statusLabel(status) {
  return STATUS_LABELS[status] || status;
} 

// Format tanggal + jam konsisten di seluruh UI (client-side only file).
export function formatDateTime(iso) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const tanggal = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
    const jam = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    return `${tanggal}, ${jam}`;
  } catch {
    return iso;
  }
}

export function formatDateLong(iso) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const tanggal = d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
    const jam = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    return `${tanggal} pukul ${jam}`;
  } catch {
    return iso;
  }
}
