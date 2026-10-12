"use client";

import { useState, useCallback, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, LabelList,
} from "recharts";
import { Sparkles, Plus, X } from "lucide-react";
import PeriodFilter, { computeDateRange } from "./PeriodFilter";
import { paletteColor } from "../lib/theme";

// Jenis chart per dimensi: nama sektor/distrik panjang -> horizontal lebih
// gampang dibaca; sumber/status namanya pendek -> vertikal lebih ringkas;
// sentimen cuma 3 kategori tetap & paling bermakna dibaca sebagai TREN
// (persentase) antar periode -> line chart, pola sama kayak TrenSentimenChart.
const DIMENSIONS = [
  { value: "sektor", label: "Sektor", chart: "horizontal" },
  { value: "distrik", label: "Distrik", chart: "horizontal" },
  { value: "sentimen", label: "Sentimen", chart: "line" },
  { value: "sumber", label: "Sumber Berita", chart: "vertical" },
  { value: "status", label: "Status", chart: "vertical" },
];

const MIN_PERIODS = 2;
const MAX_PERIODS = 4;

function periodToLabel(period) {
  if (period.type === "tahun") return `Tahun ${period.year}`;
  if (period.type === "triwulan") return `Triwulan ${period.quarter} ${period.year}`;
  const NAMA_BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return `${NAMA_BULAN[period.month - 1]} ${period.year}`;
}

function truncate(label, max = 24) {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

function makeDefaultPeriod(monthOffset) {
  const d = new Date();
  d.setMonth(d.getMonth() + monthOffset);
  return { type: "bulan", year: d.getFullYear(), month: d.getMonth() + 1, quarter: Math.ceil((d.getMonth() + 1) / 3) };
}

export default function PerbandinganPeriode() {
  const [periods, setPeriods] = useState([makeDefaultPeriod(-1), makeDefaultPeriod(0)]);
  const [dimension, setDimension] = useState("sektor");
  const [sortBy, setSortBy] = useState("volume");
  const [granularity, setGranularity] = useState("minggu"); // khusus dimensi sentimen
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ringkasan, setRingkasan] = useState(null);
  const [ringkasanLoading, setRingkasanLoading] = useState(false);
  const [ringkasanError, setRingkasanError] = useState(null);

  const dimCfg = DIMENSIONS.find((d) => d.value === dimension) || DIMENSIONS[0];

  // Pilihan granularitas tren sentimen ngikutin jenis periode yang dipilih --
  // kalau semua periode tipe-nya sama, pakai aturan itu. Kalau campur (jarang
  // terjadi, tapi PeriodFilter tiap kotak independen), fallback ke mingguan.
  const commonPeriodType = periods.every((p) => p.type === periods[0].type) ? periods[0].type : null;
  const GRANULARITY_OPTIONS = {
    bulan: [{ value: "minggu", label: "Mingguan" }],
    triwulan: [{ value: "minggu", label: "Mingguan" }, { value: "bulan", label: "Bulanan" }],
    tahun: [{ value: "bulan", label: "Bulanan" }, { value: "triwulan", label: "Triwulanan" }],
  };
  const allowedGranularities = GRANULARITY_OPTIONS[commonPeriodType] || [{ value: "minggu", label: "Mingguan" }];

  const load = useCallback(async (currentPeriods, dim, gran) => {
    setLoading(true);
    setRingkasan(null);
    setRingkasanError(null);
    try {
      const payload = {
        dimension: dim,
        granularity: gran,
        periods: currentPeriods.map((p) => {
          const range = computeDateRange(p);
          return { label: periodToLabel(p), dateFrom: range.dateFrom, dateTo: range.dateTo };
        }),
      };
      const res = await fetch("/api/stats/perbandingan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(periods, dimension, granularity); }, []);

  // Kalau tipe periode berubah (mis. dari "bulan" ke "triwulan") dan
  // granularity yang lagi kepilih jadi gak valid lagi buat tipe baru itu,
  // otomatis pindah ke pilihan pertama yang valid.
  function resolveGranularity(newPeriods, requested) {
    const type = newPeriods.every((p) => p.type === newPeriods[0].type) ? newPeriods[0].type : null;
    const options = GRANULARITY_OPTIONS[type] || [{ value: "minggu" }];
    return options.some((o) => o.value === requested) ? requested : options[0].value;
  }

  function updatePeriod(index, newPeriod) {
    const next = periods.map((p, i) => (i === index ? newPeriod : p));
    const gran = resolveGranularity(next, granularity);
    setPeriods(next);
    setGranularity(gran);
    load(next, dimension, gran);
  }

  function addPeriod() {
    if (periods.length >= MAX_PERIODS) return;
    const next = [...periods, makeDefaultPeriod(1)];
    const gran = resolveGranularity(next, granularity);
    setPeriods(next);
    setGranularity(gran);
    load(next, dimension, gran);
  }

  function removePeriod(index) {
    if (periods.length <= MIN_PERIODS) return;
    const next = periods.filter((_, i) => i !== index);
    const gran = resolveGranularity(next, granularity);
    setPeriods(next);
    setGranularity(gran);
    load(next, dimension, gran);
  }

  function handleDimensionChange(dim) {
    setDimension(dim);
    load(periods, dim, granularity);
  }

  function handleGranularityChange(gran) {
    setGranularity(gran);
    load(periods, dimension, gran);
  }

  async function generateRingkasan() {
    if (!data || !data.items?.length) return;
    setRingkasanLoading(true);
    setRingkasanError(null);
    try {
      // Ambil sampel judul+uraian berita ASLI per periode -- dipakai AI buat
      // nulis paragraf kedua yang ngerangkum TEMA/ISI pemberitaan, bukan
      // sekadar angka statistik lagi kayak paragraf pertama.
      const periodsPayload = periods.map((p) => {
        const range = computeDateRange(p);
        return { label: periodToLabel(p), dateFrom: range.dateFrom, dateTo: range.dateTo };
      });

      let artikelSample = null;
      const sampelRes = await fetch("/api/stats/perbandingan/sampel-berita", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periods: periodsPayload }),
      });
      const sampelJson = await sampelRes.json();
      if (sampelRes.ok && sampelJson.periods?.length) artikelSample = sampelJson.periods;

      const res = await fetch("/api/stats/perbandingan/ringkasan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dimensionLabel: data.dimensionLabel, periodLabels: data.periodLabels, items: data.items, artikelSample }),
      });
      const json = await res.json();
      if (!res.ok) { setRingkasanError(json.error || "Gagal membuat ringkasan."); return; }
      setRingkasan(json.ringkasan);
    } catch (err) {
      setRingkasanError(err.message);
    } finally {
      setRingkasanLoading(false);
    }
  }

  // Data buat bar chart (horizontal/vertikal): tiap kategori 1 baris,
  // dengan N nilai (p0, p1, ... satu per periode).
  const sortedItems = data?.items ? [...data.items].sort((a, b) =>
    sortBy === "perubahan"
      ? Math.abs(b.deltaPct) - Math.abs(a.deltaPct)
      : (b.values[b.values.length - 1] || 0) - (a.values[a.values.length - 1] || 0)
  ) : [];
  const barChartData = sortedItems.slice(0, 12).map((item) => {
    const row = { label: item.label, shortLabel: truncate(item.label) };
    (data?.periodLabels || []).forEach((_, i) => { row[`p${i}`] = item.values[i]; });
    return row;
  });

  const isHorizontal = dimCfg.chart === "horizontal";
  const isLine = dimCfg.chart === "line";

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-bold text-ink">Perbandingan Periode</h3>
          <p className="text-xs text-slate-soft mt-0.5">Bandingkan 2 periode atau lebih sekaligus.</p>
        </div>
        <select
          value={dimension}
          onChange={(e) => handleDimensionChange(e.target.value)}
          className="text-sm bg-bg border border-line rounded-lg px-3 py-1.5 text-ink font-medium outline-none cursor-pointer"
        >
          {DIMENSIONS.map((d) => (<option key={d.value} value={d.value}>{d.label}</option>))}
        </select>
      </div>

      <div className="grid grid-cols-1 tablet:grid-cols-2 gap-3 mb-3">
        {periods.map((p, i) => (
          <div key={i} className="p-3 rounded-lg bg-bg border border-line">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-soft">Periode {String.fromCharCode(65 + i)}</p>
              {periods.length > MIN_PERIODS && (
                <button onClick={() => removePeriod(i)} className="text-slate-soft hover:text-coral" title="Hapus periode ini">
                  <X size={14} />
                </button>
              )}
            </div>
            <PeriodFilter value={p} onChange={(np) => updatePeriod(i, np)} types={["bulan", "triwulan", "tahun"]} />
          </div>
        ))}
      </div>

      {periods.length < MAX_PERIODS && (
        <button
          onClick={addPeriod}
          className="flex items-center gap-1.5 text-sm font-semibold text-teal-dark hover:underline mb-5"
        >
          <Plus size={15} /> Tambah periode
        </button>
      )}

      {commonPeriodType === null && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber/10 border border-amber/30 mb-5">
          <span className="text-amber shrink-0">&#9888;</span>
          <p className="text-xs text-ink">
            Periode yang dibandingkan punya jenis/durasi berbeda (misal Triwulan vs Tahunan). Jumlah/persentasenya wajar
            terlihat jauh beda karena rentang waktunya memang beda, bukan berarti ada lonjakan atau penurunan drastis.
            Buat perbandingan yang lebih adil, pilih periode dengan jenis yang sama.
          </p>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-soft py-8 text-center">Memuat...</p>
      ) : !data || (isLine ? !data.series?.length : !data.items?.length) ? (
        <p className="text-sm text-slate-soft py-8 text-center">Belum ada data untuk periode-periode ini.</p>
      ) : isLine ? (
        <>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-slate-soft">Tren per:</span>
            {allowedGranularities.map((g) => (
              <button
                key={g.value}
                onClick={() => handleGranularityChange(g.value)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                  granularity === g.value ? "bg-teal-dark text-white border-teal-dark" : "text-slate-soft border-line hover:bg-bg"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-soft mb-3">
            Tiap garis = % sentimen Positif dalam satu periode, dipecah per {data.subLabel?.toLowerCase()}. Garis putus di tengah artinya periode itu belum sampai sejauh itu.
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.series} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E2DC" />
              <XAxis dataKey="sub" tick={{ fontSize: 11, fill: "#5B6B76" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#5B6B76" }} unit="%" />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E4E2DC", fontSize: 12 }} formatter={(v) => (v == null ? "-" : `${v}%`)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {(data.periodLabels || []).map((pl, i) => (
                <Line
                  key={i}
                  type="linear"
                  dataKey={`p${i}`}
                  name={pl}
                  stroke={paletteColor(i)}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-slate-soft">Urutkan:</span>
            {[
              { value: "volume", label: "Volume terbesar" },
              { value: "perubahan", label: "Perubahan terbesar" },
            ].map((s) => (
              <button
                key={s.value}
                onClick={() => setSortBy(s.value)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                  sortBy === s.value ? "bg-teal-dark text-white border-teal-dark" : "text-slate-soft border-line hover:bg-bg"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <ResponsiveContainer
            width="100%"
            height={isHorizontal ? Math.max(220, barChartData.length * (34 + periods.length * 6)) : 320}
          >
            <BarChart
              data={barChartData}
              layout={isHorizontal ? "vertical" : "horizontal"}
              margin={isHorizontal ? { left: 4, right: 32, top: 4, bottom: 4 } : { left: 0, right: 16, top: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={!isHorizontal} vertical={isHorizontal} stroke="#E4E2DC" />
              {isHorizontal ? (
                <>
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#5B6B76" }} allowDecimals={false} />
                  <YAxis type="category" dataKey="shortLabel" width={150} tick={{ fontSize: 11, fill: "#5B6B76" }} />
                </>
              ) : (
                <>
                  <XAxis
                    dataKey="shortLabel"
                    tick={{ fontSize: 11, fill: "#5B6B76" }}
                    interval={0}
                    angle={barChartData.length > 6 ? -25 : 0}
                    textAnchor={barChartData.length > 6 ? "end" : "middle"}
                    height={barChartData.length > 6 ? 60 : 30}
                  />
                  <YAxis type="number" tick={{ fontSize: 11, fill: "#5B6B76" }} allowDecimals={false} />
                </>
              )}
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #E4E2DC", fontSize: 12 }}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.label || ""}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {(data.periodLabels || []).map((pl, i) => (
                <Bar
                  key={i}
                  dataKey={`p${i}`}
                  name={pl}
                  fill={paletteColor(i)}
                  radius={isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                  barSize={isHorizontal ? Math.max(6, 14 - periods.length) : Math.max(10, 20 - periods.length * 2)}
                >
                  <LabelList dataKey={`p${i}`} position={isHorizontal ? "right" : "top"} fontSize={9} fill="#5B6B76" />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </>
      )}

      {data && !isLine && data.items?.length > 0 && (
        <div className="mt-4 pt-4 border-t border-line">
          {!ringkasan && !ringkasanLoading && (
            <button
              onClick={generateRingkasan}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-line bg-white text-sm font-semibold text-ink hover:bg-bg"
            >
              <Sparkles size={15} className="shrink-0" /> Buat Ringkasan Otomatis
            </button>
          )}
          {ringkasanLoading && <p className="text-sm text-slate-soft">Membuat ringkasan...</p>}
          {ringkasanError && <p className="text-sm text-coral">Gagal: {ringkasanError}</p>}
          {ringkasan && (
            <div className="flex items-start gap-2">
              <Sparkles size={15} className="shrink-0 mt-0.5 text-teal-dark" />
              <div className="space-y-2">
                {ringkasan.split(/\n\s*\n/).map((par, i) => (
                  <p key={i} className="text-sm text-ink leading-relaxed">{par.trim()}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}