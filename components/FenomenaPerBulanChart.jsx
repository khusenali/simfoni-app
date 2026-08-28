"use client";

import { useEffect, useState, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList } from "recharts";
import { SEMANTIC } from "../lib/theme";

const RANGE_CONFIG = {
  Minggu: { granularity: "minggu", min: 4, max: 26, default: 8, unit: "minggu" },
  Bulan: { granularity: "bulan", min: 3, max: 24, default: 9, unit: "bulan" },
};

function formatPeriode(periode, granularity) {
  if (granularity === "tahun") return periode;
  if (granularity === "bulan") {
    const M = { "01":"Jan","02":"Feb","03":"Mar","04":"Apr","05":"Mei","06":"Jun","07":"Jul","08":"Agu","09":"Sep","10":"Okt","11":"Nov","12":"Des" };
    const [, m] = periode.split("-");
    return M[m] || periode;
  }
  const [, w] = periode.split("-");
  return `Mgg ${parseInt(w, 10)}`;
}

export default function FenomenaPerBulanChart({ dateFrom, dateTo }) {
  const [range, setRange] = useState("Bulan");
  const [count, setCount] = useState(RANGE_CONFIG["Bulan"].default);
  const [data, setData] = useState([]);
  const cfg = RANGE_CONFIG[range];

  const load = useCallback(async () => {
    const params = new URLSearchParams({ granularity: cfg.granularity, count: String(count) });
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const res = await fetch(`/api/stats/tren-fenomena?${params.toString()}`);
    const json = await res.json();
    setData(json.data.map((d) => ({ ...d, label: formatPeriode(d.periode, cfg.granularity) })));
  }, [cfg.granularity, count, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  function selectRange(r) {
    setRange(r);
    setCount(RANGE_CONFIG[r].default);
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-ink">Temuan Fenomena</h3>
        <div className="flex items-center gap-2 text-sm">
          {Object.keys(RANGE_CONFIG).map((r) => (
            <button
              key={r}
              onClick={() => selectRange(r)}
              className={`px-4 py-1.5 rounded-full font-semibold transition-colors border ${
                range === r ? "bg-teal-dark text-white border-teal-dark" : "text-slate-soft border-line hover:bg-bg"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs text-slate-soft whitespace-nowrap">Tampilkan {count} {cfg.unit} terakhir</span>
        <input
          type="range" min={cfg.min} max={cfg.max} value={count}
          onChange={(e) => setCount(parseInt(e.target.value, 10))}
          className="w-full accent-teal"
        />
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} barSize={60}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E2DC" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#5B6B76", fontSize: 12 }} />
          <YAxis hide />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "1px solid #E4E2DC", fontSize: 12 }}
            labelStyle={{ fontWeight: 700, color: SEMANTIC.ink }}
            formatter={(value, name) => [value, name === "Draft" ? "Tercatat" : name]}
          />
          <Bar dataKey="Terverifikasi" stackId="a" fill={SEMANTIC.tealDark}>
            <LabelList
              dataKey="Terverifikasi"
              content={(props) => {
                const { x, y, width, value } = props;
                if (!value) return null;
                const isOutside = value <= 10;
                return (
                  <text
                    x={x + width / 2}
                    y={isOutside ? y - 6 : y + 16}
                    textAnchor="middle"
                    fill={isOutside ? SEMANTIC.tealDark : "#fff"}
                    fontSize={11}
                    fontWeight={isOutside ? 700 : 400}
                  >
                    {value}
                  </text>
                );
              }}
            />
          </Bar>
          <Bar dataKey="Draft" stackId="a" fill={SEMANTIC.teal} radius={[4, 4, 0, 0]}>
            <LabelList dataKey="Draft" position="inside" fill="#fff" fontSize={11} formatter={(v) => (v > 0 ? v : "")} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-3 text-xs text-slate-soft mt-2">
        <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: SEMANTIC.teal }} />Tercatat</span>
        <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: SEMANTIC.tealDark }} />Terverifikasi</span>
      </div>
    </div>
  );
}