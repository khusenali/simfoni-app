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
  // Rentang bulan bebas -- mis. Januari 2026 sampai Juni 2026, atau cuma
  // 2 bulan berdekatan. fromMonth/fromYear & toMonth/toYear independen,
  // gak wajib berurutan rapi (kalau dibalik pun tetap dihitung sebagai
  // rentang, biar gak bikin bingung kalau user pilih ke arah kebalik).
  if (period.type === "rentang") {
    const a = period.fromYear * 12 + (period.fromMonth - 1);
    const b = period.toYear * 12 + (period.toMonth - 1);
    const [startTotal, endTotal] = a <= b ? [a, b] : [b, a];
    const startYear = Math.floor(startTotal / 12), startMonth = (startTotal % 12) + 1;
    const endYear = Math.floor(endTotal / 12), endMonth = (endTotal % 12) + 1;
    const lastDay = new Date(endYear, endMonth, 0).getDate();
    return {
      dateFrom: witBoundaryToUtcIso(startYear, startMonth, 1, 0, 0, 0),
      dateTo: witBoundaryToUtcIso(endYear, endMonth, lastDay, 23, 59, 59),
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
  if (period.type === "rentang") {
    // "Sebelumnya" buat rentang bebas = rentang dengan panjang sama persis,
    // digeser mundur tepat sepanjang rentang itu sendiri. Mis. rentang
    // Jan-Jun (6 bulan) -> sebelumnya = Jul-Des tahun sebelumnya (6 bulan).
    const a = period.fromYear * 12 + (period.fromMonth - 1);
    const b = period.toYear * 12 + (period.toMonth - 1);
    const [startTotal, endTotal] = a <= b ? [a, b] : [b, a];
    const spanMonths = endTotal - startTotal + 1;
    const prevEndTotal = startTotal - 1;
    const prevStartTotal = prevEndTotal - spanMonths + 1;
    const startYear = Math.floor(prevStartTotal / 12), startMonth = (((prevStartTotal % 12) + 12) % 12) + 1;
    const endYear = Math.floor(prevEndTotal / 12), endMonth = (((prevEndTotal % 12) + 12) % 12) + 1;
    const lastDay = new Date(endYear, endMonth, 0).getDate();
    return {
      dateFrom: witBoundaryToUtcIso(startYear, startMonth, 1, 0, 0, 0),
      dateTo: witBoundaryToUtcIso(endYear, endMonth, lastDay, 23, 59, 59),
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

const ALL_TYPES = ["semua", "bulan", "triwulan", "tahun", "rentang"];
const TYPE_LABEL = { semua: "Semua Data", bulan: "Bulanan", triwulan: "Triwulan", tahun: "Tahunan", rentang: "Rentang Bulan" };

function defaultRentangFrom(value) {
  const y = value.year || CURRENT_YEAR;
  const m = value.month || new Date().getMonth() + 1;
  return { type: "rentang", fromYear: y, fromMonth: m, toYear: y, toMonth: m };
}

export default function PeriodFilter({ value, onChange, types = ALL_TYPES }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {types.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t === "rentang" && value.type !== "rentang" ? defaultRentangFrom(value) : { ...value, type: t })}
          className={`px-2.5 py-1 tablet:px-4 tablet:py-1.5 rounded-full text-xs tablet:text-sm font-semibold border transition-colors ${
            value.type === t ? "bg-teal-dark text-white border-teal-dark" : "text-slate-soft border-line hover:bg-bg"
          }`}
        >
          {TYPE_LABEL[t] || t}
        </button>
      ))}

      {value.type !== "semua" && value.type !== "rentang" && (
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

      {value.type === "rentang" && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-soft">Dari</span>
          <select value={value.fromMonth} onChange={(e) => onChange({ ...value, fromMonth: parseInt(e.target.value, 10) })}
            className="text-xs tablet:text-sm bg-white border border-line rounded-lg px-2 py-1 tablet:py-1.5 text-ink font-medium outline-none cursor-pointer">
            {MONTHS.map((m, i) => (<option key={i + 1} value={i + 1}>{m}</option>))}
          </select>
          <select value={value.fromYear} onChange={(e) => onChange({ ...value, fromYear: parseInt(e.target.value, 10) })}
            className="text-xs tablet:text-sm bg-white border border-line rounded-lg px-2 py-1 tablet:py-1.5 text-ink font-medium outline-none cursor-pointer">
            {YEARS.map((y) => (<option key={y} value={y}>{y}</option>))}
          </select>
          <span className="text-xs text-slate-soft">s.d.</span>
          <select value={value.toMonth} onChange={(e) => onChange({ ...value, toMonth: parseInt(e.target.value, 10) })}
            className="text-xs tablet:text-sm bg-white border border-line rounded-lg px-2 py-1 tablet:py-1.5 text-ink font-medium outline-none cursor-pointer">
            {MONTHS.map((m, i) => (<option key={i + 1} value={i + 1}>{m}</option>))}
          </select>
          <select value={value.toYear} onChange={(e) => onChange({ ...value, toYear: parseInt(e.target.value, 10) })}
            className="text-xs tablet:text-sm bg-white border border-line rounded-lg px-2 py-1 tablet:py-1.5 text-ink font-medium outline-none cursor-pointer">
            {YEARS.map((y) => (<option key={y} value={y}>{y}</option>))}
          </select>
        </div>
      )}
    </div>
  );
}