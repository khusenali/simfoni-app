"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import FenomenaPerBulanChart from "../components/FenomenaPerBulanChart";
import TrenSentimenChart from "../components/TrenSentimenChart";
import FenomenaTerbaru from "../components/FenomenaTerbaru";
import DistribusiSentimen from "../components/DistribusiSentimen";
import SektorTeratas from "../components/SektorTeratas";
import SumberData from "../components/SumberData";
import SebaranDistrik from "../components/SebaranDistrik";
import DashboardActions from "../components/DashboardActions";
import PeriodFilter, { computeDateRange, computePreviousDateRange } from "../components/PeriodFilter";
import { FileText, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, ClipboardCheck } from "lucide-react";
import { KONDISI_STYLES } from "../lib/theme";

const KONDISI_ICONS = { Tumbuh: TrendingUp, Stagnan: Minus, Kontraksi: TrendingDown, "Tidak ada data": Minus }

function KondisiBadge({ label }) {
  if (!label) return null;
  const style = KONDISI_STYLES[label] || KONDISI_STYLES.Stagnan;
  const Icon = KONDISI_ICONS[label] || Minus;
  return (
    <span
      className="inline-flex items-center gap-1 tablet:gap-1.5 px-2 py-0.5 tablet:px-3 tablet:py-1 rounded-full text-[10px] tablet:text-xs font-semibold shrink-0"
      style={{ color: style.text, backgroundColor: style.bg }}
    >
      <Icon className="w-2.5 h-2.5 tablet:w-3 tablet:h-3" /> {label}
    </span>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState({
    type: "semua",
    year: new Date().getFullYear(),
    quarter: Math.ceil((new Date().getMonth() + 1) / 3),
    month: new Date().getMonth() + 1,
  });
  const [stats, setStats] = useState(null);
  const { dateFrom, dateTo } = useMemo(() => computeDateRange(period), [period]);
  const { dateFrom: prevDateFrom, dateTo: prevDateTo } = useMemo(() => computePreviousDateRange(period), [period]);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (prevDateFrom) params.set("prevDateFrom", prevDateFrom);
    if (prevDateTo) params.set("prevDateTo", prevDateTo);
    const res = await fetch(`/api/stats?${params.toString()}`);
    setStats(await res.json());
  }, [dateFrom, dateTo, prevDateFrom, prevDateTo]);

  useEffect(() => { load(); }, [load]);

  if (!stats) return <div className="pt-8 text-sm text-slate-soft">Memuat dashboard...</div>;

  const { totals, kondisiEkonomi, kondisiTerverifikasi, sentimenSummary, topSektor, sumberSummary, sebaranDistrik, keywordCloud } = stats;
  const pctTerverifikasi = totals.total > 0 ? Math.round((totals.Terverifikasi / totals.total) * 100) : 0;

  return (
    <div className="pt-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Dashboard Fenomena Ekonomi</h1>
          <p className="text-sm text-slate-soft mt-1">Pemantauan Fenomena Ekonomi Kabupaten Raja Ampat secara Real time</p>
        </div>
        <DashboardActions initialPeriod={period}/>
      </div>

      <div className="mb-6">
        <PeriodFilter value={period} onChange={setPeriod} types={["semua", "triwulan", "tahun"]} />
      </div>

      <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4 tablet:gap-5 mb-5 items-stretch">
        <div className="relative bg-teal-dark rounded-2xl p-4 tablet:p-6 text-white overflow-hidden">
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute -right-2 -bottom-10 w-24 h-24 rounded-full bg-white/5" />

          <div className="relative flex items-center justify-between gap-2 tablet:gap-3 mb-3 tablet:mb-5 flex-wrap">
            <div className="flex items-center gap-1.5 tablet:gap-2">
              <span className="w-7 h-7 tablet:w-8 tablet:h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <FileText className="w-3 h-3 tablet:w-4 tablet:h-4" />
              </span>
              <p className="text-xs tablet:text-sm text-white/70 font-bold">Total Fenomena</p>
            </div>
            <div className="flex items-center gap-1.5 tablet:gap-2">
              <span className="flex items-center gap-1 tablet:gap-1.5 px-2 py-0.5 tablet:px-3 tablet:py-1 rounded-full bg-gold/20 text-gold text-[10px] tablet:text-xs font-semibold">
                <AlertTriangle className="w-2.5 h-2.5 tablet:w-3 tablet:h-3" /> {totals.Draft} Tercatat
              </span>
              <span className="flex items-center gap-1 tablet:gap-1.5 px-2 py-0.5 tablet:px-3 tablet:py-1 rounded-full bg-[#5AA9E6]/20 text-[#5AA9E6] text-[10px] tablet:text-xs font-semibold">
                <CheckCircle2 className="w-2.5 h-2.5 tablet:w-3 tablet:h-3" /> {totals.Terverifikasi} Terverifikasi
              </span>
            </div>
          </div>

          <p className="relative text-2xl tablet:text-4xl font-extrabold mb-3 tablet:mb-4">{totals.total}</p>

          <div className="relative">
            <div className="h-1.5 tablet:h-2 rounded-full bg-white/10 overflow-hidden mb-1.5">
              <div className="h-full bg-[#5AA9E6] rounded-full transition-all" style={{ width: `${pctTerverifikasi}%` }} />
            </div>
            <p className="text-[11px] tablet:text-xs text-white/60">{pctTerverifikasi}% Terverifikasi</p>
          </div>
        </div>

        <div className="relative bg-teal-dark rounded-2xl p-4 tablet:p-6 text-white overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-white/5" />
          <div className="relative flex items-center justify-between gap-2 tablet:gap-3 mb-2.5 tablet:mb-3 flex-wrap">
            <div className="flex items-center gap-2 tablet:gap-3">
              <div className="w-7 h-7 tablet:w-8 tablet:h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <TrendingUp className="w-3 h-3 tablet:w-4 tablet:h-4" />
              </div>
              <p className="text-xs tablet:text-sm text-white/70 font-bold">Kondisi PDRB</p>
            </div>
            <KondisiBadge label={kondisiEkonomi.label} />
          </div>
          <p className="relative text-xs tablet:text-sm text-white/90 leading-relaxed text-justify">
            {kondisiEkonomi.total === 0 ? (
              "Tidak terdapat data pada periode yang dipilih."
            ) : (
              <>
                {kondisiEkonomi.positifPct}% sentimen positif dari {kondisiEkonomi.total} fenomena pada periode terpilih
                {kondisiEkonomi.delta !== 0 && (
                  <>. {kondisiEkonomi.delta > 0 ? "Naik" : "Turun"} {Math.abs(kondisiEkonomi.delta)} persen dibanding periode sebelumnya</>
                )} didorong sektor {topSektor.slice(0, 2).map((s) => s.nama).join(" & ") || "utama"}.
              </>
            )}
          </p>
        </div>
      </div>

      <div className="mb-5">
        <FenomenaTerbaru dateFrom={dateFrom} dateTo={dateTo} />
      </div>

      <div className="grid grid-cols-1 desktop:grid-cols-2 gap-5 mb-5 items-stretch">
        <FenomenaPerBulanChart dateFrom={dateFrom} dateTo={dateTo} periodType={period.type} />
        <TrenSentimenChart dateFrom={dateFrom} dateTo={dateTo} periodType={period.type} />
      </div>

      <div className="grid grid-cols-1 desktop:grid-cols-2 gap-5 mb-5 items-stretch">
        <SektorTeratas items={topSektor} />
        <SebaranDistrik items={sebaranDistrik} />
      </div>

      <div className="grid grid-cols-1 desktop:grid-cols-2 gap-5 mb-5 items-stretch">
        <DistribusiSentimen summary={sentimenSummary} />
        <SumberData summary={sumberSummary} />
      </div>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <i className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
      {label}
    </div>
  );
}