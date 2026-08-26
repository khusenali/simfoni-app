"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, Sector, ResponsiveContainer } from "recharts";
import { SENTIMEN_COLORS } from "../lib/theme";

function renderActiveShape(props) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8}
        startAngle={startAngle} endAngle={endAngle} fill={fill}
        style={{ filter: "drop-shadow(0 4px 10px rgba(0,18,25,0.25))" }}
      />
      <Sector
        cx={cx} cy={cy} innerRadius={innerRadius - 4} outerRadius={innerRadius - 1}
        startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.35}
      />
    </g>
  );
}

export default function DistribusiSentimen({ summary }) {
  const [activeIndex, setActiveIndex] = useState(null);

  const data = [
    { name: "Positif", value: summary.positif, pct: summary.positifPct },
    { name: "Netral", value: summary.netral, pct: summary.netralPct },
    { name: "Negatif", value: summary.negatif, pct: summary.negatifPct },
  ];

  const active = activeIndex !== null ? data[activeIndex] : null;
  const centerLabel = active ? `${active.name} · ${active.pct}%` : "Total Sentimen";
  const centerValue = active ? active.value : summary.total;

  return (
    <div className="card p-5 chart-enter">
      <h3 className="font-bold text-ink mb-1">Distribusi Sentimen</h3>
      <p className="text-xs text-slate-soft mb-2">Disajikan berdasarkan seluruh sentimen dari fenomena yang ditemukan</p>
      <div className="relative">
        <ResponsiveContainer width="100%" height={340}>
          <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Pie
              data={data} dataKey="value" nameKey="name"
              innerRadius="40%" outerRadius="80%" paddingAngle={2} strokeWidth={0}
              isAnimationActive animationBegin={100} animationDuration={700} animationEasing="ease-out"
              activeIndex={activeIndex} activeShape={renderActiveShape}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              style={{ fontSize: 11, fontWeight: 600, fill: "#001219" }}
              labelLine={false}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={SENTIMEN_COLORS[d.name]} style={{ fill: SENTIMEN_COLORS[d.name] }} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[22px] font-extrabold text-ink">{centerValue}</span>
          <span className="text-[11px] font-semibold text-slate-soft">{centerLabel}</span>
        </div>
      </div>
      <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-1 mt-3">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 text-[11px] text-slate-soft">
            <span className="w-2 h-2 rounded-full" style={{ background: SENTIMEN_COLORS[d.name] }} />
            {d.name}
          </div>
        ))}
      </div>
    </div>
  );
}