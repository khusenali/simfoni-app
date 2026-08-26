"use client";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR]; // tahun ini & tahun sebelumnya, otomatis geser tiap tahun
const QUARTERS = [
  { value: 1, label: "Triwulan I", desc: "Jan–Mar" },
  { value: 2, label: "Triwulan II", desc: "Apr–Jun" },
  { value: 3, label: "Triwulan III", desc: "Jul–Sep" },
  { value: 4, label: "Triwulan IV", desc: "Okt–Des" },
];
const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const WIT_OFFSET_HOURS = 9;
function witBoundaryToUtcIso(year, month, day, hour, minute, second) {
  return new Date(Date.UTC(year, month - 1, day, hour - WIT_OFFSET_HOURS, minute, second)).toISOString();
}

export function computeDateRange(period) {
  if (!period || period.type === "semua") return { dateFrom: undefined, dateTo: undefined };
  if (period.type === "tahun") {
    return {
      dateFrom: witBoundaryToUtcIso(period.year, 1, 1, 0, 0, 0),
      dateTo: witBoundaryToUtcIso(period.year, 12, 31, 23, 59, 59),
    };
  }
  if (period.type === "bulan") {
    const lastDay = new Date(period.year, period.month, 0).getDate();
    return {
      dateFrom: witBoundaryToUtcIso(period.year, period.month, 1, 0, 0, 0),
      dateTo: witBoundaryToUtcIso(period.year, period.month, lastDay, 23, 59, 59),
    };
  }
  const startMonth = (period.quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const lastDay = new Date(period.year, endMonth, 0).getDate();
  return {
    dateFrom: witBoundaryToUtcIso(period.year, startMonth, 1, 0, 0, 0),
    dateTo: witBoundaryToUtcIso(period.year, endMonth, lastDay, 23, 59, 59),
  };
}

export function computePreviousDateRange(period) {
  if (!period || period.type === "semua") return { dateFrom: undefined, dateTo: undefined };
  if (period.type === "tahun") {
    const prevYear = period.year - 1;
    return {
      dateFrom: witBoundaryToUtcIso(prevYear, 1, 1, 0, 0, 0),
      dateTo: witBoundaryToUtcIso(prevYear, 12, 31, 23, 59, 59),
    };
  }
  if (period.type === "bulan") {
    let prevMonth = period.month - 1;
    let prevYear = period.year;
    if (prevMonth < 1) { prevMonth = 12; prevYear -= 1; }
    const lastDay = new Date(prevYear, prevMonth, 0).getDate();
    return {
      dateFrom: witBoundaryToUtcIso(prevYear, prevMonth, 1, 0, 0, 0),
      dateTo: witBoundaryToUtcIso(prevYear, prevMonth, lastDay, 23, 59, 59),
    };
  }
  let prevQuarter = period.quarter - 1;
  let prevYear = period.year;
  if (prevQuarter < 1) { prevQuarter = 4; prevYear -= 1; }
  const startMonth = (prevQuarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const lastDay = new Date(prevYear, endMonth, 0).getDate();
  return {
    dateFrom: witBoundaryToUtcIso(prevYear, startMonth, 1, 0, 0, 0),
    dateTo: witBoundaryToUtcIso(prevYear, endMonth, lastDay, 23, 59, 59),
  };
}

const ALL_TYPES = ["semua", "bulan", "triwulan", "tahun"];

export default function PeriodFilter({ value, onChange, types = ALL_TYPES }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {types.map((t) => (
        <button
          key={t}
          onClick={() => onChange({ ...value, type: t })}
          className={`px-2.5 py-1 tablet:px-4 tablet:py-1.5 rounded-full text-xs tablet:text-sm font-semibold border transition-colors ${
            value.type === t ? "bg-teal-dark text-white border-teal-dark" : "text-slate-soft border-line hover:bg-bg"
          }`}
        >
          {t === "semua" ? "Semua Data" : t === "bulan" ? "Bulanan" : t === "triwulan" ? "Triwulan" : "Tahunan"}
        </button>
      ))}

      {value.type !== "semua" && (
        <select value={value.year} onChange={(e) => onChange({ ...value, year: parseInt(e.target.value, 10) })}
          className="text-xs tablet:text-sm bg-white border border-line rounded-lg px-2 tablet:px-3 py-1 tablet:py-1.5 text-ink font-medium outline-none cursor-pointer">
          {YEARS.map((y) => (<option key={y} value={y}>{y}</option>))}
        </select>
      )}

      {value.type === "bulan" && (
        <select value={value.month} onChange={(e) => onChange({ ...value, month: parseInt(e.target.value, 10) })}
          className="text-sm bg-white border border-line rounded-lg px-3 py-1.5 text-ink font-medium outline-none cursor-pointer">
          {MONTHS.map((m, i) => (<option key={i + 1} value={i + 1}>{m}</option>))}
        </select>
      )}

      {value.type === "triwulan" && (
        <select value={value.quarter} onChange={(e) => onChange({ ...value, quarter: parseInt(e.target.value, 10) })}
          className="text-sm bg-white border border-line rounded-lg px-3 py-1.5 text-ink font-medium outline-none cursor-pointer">
          {QUARTERS.map((q) => (<option key={q.value} value={q.value}>{q.label} ({q.desc})</option>))}
        </select>
      )}
    </div>
  );
}