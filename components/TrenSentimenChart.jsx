"use client";

import { useEffect, useState, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { SENTIMEN_COLORS, SEMANTIC } from "../lib/theme";

const MONTH_LABEL = { "01":"Jan","02":"Feb","03":"Mar","04":"Apr","05":"Mei","06":"Jun","07":"Jul","08":"Agu","09":"Sep","10":"Okt","11":"Nov","12":"Des" };
function formatMonth(ym) {
  if (!ym) return "";
  const [, m] = ym.split("-");
  return MONTH_LABEL[m] || ym;
}

// Custom tick sumbu-X: titik pertama rata-kiri, titik terakhir rata-kanan,
// selebihnya rata-tengah -- mencegah label pertama/terakhir terpotong
// karena text-anchor "middle" bawaan Recharts menempatkan separuh lebar
// teks di luar batas SVG saat titik berada tepat di tepi area plot.
function makeEdgeAwareTick(totalPoints) {
  return function EdgeAwareTick({ x, y, payload, index }) {
    let anchor = "middle";
    let dx = 0;
    if (index === 0) { anchor = "start"; dx = -4; }
    else if (index === totalPoints - 1) { anchor = "end"; dx = 4; }

    return (
      <text
        x={x + dx}
        y={y}
        dy={16}
        textAnchor={anchor}
        fill="#5B6B76"
        fontSize={12}
      >
        {payload.value}
      </text>
    );
  };
}

export default function TrenSentimenChart({ dateFrom, dateTo }) {
  const [mode, setMode] = useState("Semua");
  const [sektorList, setSektorList] = useState([]);
  const [sektor, setSektor] = useState("");
  const [months, setMonths] = useState(9);
  const [data, setData] = useState([]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/indikator");
      const json = await res.json();
      setSektorList(json.sektor.map((s) => s.nama));
    })();
  }, []);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ months: String(months) });
    if (mode === "Sektor" && sektor) params.set("sektor", sektor);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const res = await fetch(`/api/stats/tren-sentimen?${params.toString()}`);
    const json = await res.json();
    setData(json.data.map((d) => ({ ...d, label: formatMonth(d.bulan) })));
  }, [mode, sektor, months, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-bold text-ink">Tren Sentimen</h3>
        <div className="flex items-center gap-2 text-sm">
          {["Semua", "Sektor"].map((r) => (
            <button
              key={r}
              onClick={() => setMode(r)}
              className={`px-4 py-1.5 rounded-full font-semibold transition-colors border ${
                mode === r ? "bg-teal-dark text-white border-teal-dark" : "text-slate-soft border-line hover:bg-bg"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs text-slate-soft whitespace-nowrap">Tampilkan {months} bulan terakhir</span>
        <input
          type="range" min={3} max={24} value={months}
          onChange={(e) => setMonths(parseInt(e.target.value, 10))}
          className="w-full accent-teal"
        />
      </div>

      {mode === "Sektor" && (
        <select
          value={sektor}
          onChange={(e) => setSektor(e.target.value)}
          className="text-sm bg-bg border border-line rounded-lg px-3 py-2 text-ink font-medium outline-none cursor-pointer mb-3 max-w-full"
        >
          <option value="">Pilih sektor...</option>
          {sektorList.map((s) => (<option key={s} value={s}>{s}</option>))}
        </select>
      )}

      {mode === "Sektor" && !sektor ? (
        <p className="text-sm text-slate-soft py-16 text-center">Pilih sektor dulu untuk melihat trennya.</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E2DC" />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              interval={0}
              padding={{ left: 12, right: 12 }}
              tick={makeEdgeAwareTick(data.length)}
            />
            <YAxis hide domain={[0, 100]} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: "1px solid #E4E2DC", fontSize: 12 }}
              labelStyle={{ fontWeight: 700, color: SEMANTIC.ink }}
              formatter={(value, name) => [`${value}%`, name]}
            />
            <Line type="linear" dataKey="positifPct" name="Positif" stroke={SENTIMEN_COLORS.Positif} strokeWidth={2.5} dot={{ r: 3 }} />
            <Line type="linear" dataKey="netralPct" name="Netral" stroke={SENTIMEN_COLORS.Netral} strokeWidth={2.5} dot={{ r: 3 }} />
            <Line type="linear" dataKey="negatifPct" name="Negatif" stroke={SENTIMEN_COLORS.Negatif} strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      )}

      <div className="flex items-center gap-3 text-xs text-slate-soft mt-2">
        <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: SENTIMEN_COLORS.Positif }} />Positif</span>
        <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: SENTIMEN_COLORS.Netral }} />Netral</span>
        <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: SENTIMEN_COLORS.Negatif }} />Negatif</span>
      </div>
    </div>
  );
}