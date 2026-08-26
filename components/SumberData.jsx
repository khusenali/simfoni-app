"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, Sector, ResponsiveContainer } from "recharts";
import { paletteColor } from "../lib/theme";

function renderActiveShape(props) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <Sector
      cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 10}
      startAngle={startAngle} endAngle={endAngle} fill={fill}
      style={{ filter: "drop-shadow(0 4px 10px rgba(0,18,25,0.25))" }}
    />
  );
}

export default function SumberData({ summary }) {
  const [activeIndex, setActiveIndex] = useState(null);

  const data = (summary.sumber || []).map((s, i) => ({
    name: s.nama, value: s.jumlah, color: paletteColor(i),
  }));
  const total = summary.total || data.reduce((sum, d) => sum + d.value, 0) || 1;
  const active = activeIndex !== null ? data[activeIndex] : null;

  return (
    <div className="card p-5 chart-enter">
      <h3 className="font-bold text-ink mb-1">Distribusi Sumber Data</h3>
      <p className="text-xs text-slate-soft mb-2"> Disajikan berdasarkan sumber data yang ditangkap</p>
      <div className="relative">
        <ResponsiveContainer width="100%" height={340}>
          <PieChart margin={{right: 8, left: 8 }}>
            <Pie
              data={data} dataKey="value" nameKey="name"
              innerRadius="38%" outerRadius="78%" paddingAngle={2} strokeWidth={0}
              isAnimationActive animationBegin={100} animationDuration={700} animationEasing="ease-out"
              activeIndex={activeIndex} activeShape={renderActiveShape}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              style={{ fontSize: 11, fontWeight: 600, fill: "#001219" }}
              labelLine={false}
            >
              {data.map((d) => <Cell key={d.name} fill={d.color} style={{ fill: d.color }} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[22px] font-extrabold text-ink">{active ? active.value : total}</span>
          <span className="text-[11px] font-semibold text-slate-soft">
            {active ? `${active.name} · ${Math.round((active.value / total) * 100)}%` : "Total Sumber"}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-1 mt-3">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 text-[11px] text-slate-soft">
            <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
            {d.name}
          </div>
        ))}
      </div>
    </div>
  );
}