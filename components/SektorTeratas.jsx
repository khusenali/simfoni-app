"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, LabelList } from "recharts";
import { SEMANTIC } from "../lib/theme";

const COLORS = [SEMANTIC.tealDark];
const VISIBLE_BARS = 5;      // jumlah bar yang terlihat tanpa scroll
const BAR_SLOT_WIDTH = 130;  // lebar per sektor (bar + label), dalam px

export default function SektorTeratas({ items }) {
  const data = items.map((s) => ({ name: s.nama, value: s.jumlah, pct: s.pct }));

  // Lebar chart sesungguhnya mengikuti jumlah data (bisa lebih lebar dari kartu)
  const chartWidth = Math.max(data.length, VISIBLE_BARS) * BAR_SLOT_WIDTH;
  // Lebar kontainer yang terlihat dibatasi persis 5 slot -- sisanya discroll
  const visibleWidth = VISIBLE_BARS * BAR_SLOT_WIDTH;

  return (
    <div className="card p-5">
      <h3 className="font-bold text-ink mb-2">Sebaran Sektor PDRB</h3>
      <p className="text-xs text-slate-soft mb-4">
        {data.length > VISIBLE_BARS
          ? `Geser untuk melihat ${data.length} sektor`
          : "Disajikan dari sektor yang paling berkontribusi"}
      </p>
      {data.length ? (
        <div
          className="overflow-x-auto scrollbar-thin"
          style={{ maxWidth: visibleWidth }}
        >
          <div style={{ width: chartWidth, height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 24, right: 10, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E2DC" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  height={40}
                  tick={{ fill: "#5B6B76", fontSize: 11 }}
                  tickFormatter={(name) => (name.length > 10 ? `${name.slice(0, 10)}...` : name)}
                />
                <YAxis hide domain={[0, (dataMax) => Math.ceil(dataMax * 1.15)]} />
                <Tooltip
                  formatter={(value, name, entry) => [`${value} fenomena (${entry.payload.pct}%)`, "Jumlah"]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #E4E2DC", fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={80}>
                  <LabelList dataKey="value" position="top" fill={SEMANTIC.ink} fontSize={12} fontWeight={700} />
                  {data.map((d, i) => (<Cell key={d.name} fill={COLORS[i % COLORS.length]} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-soft">Belum ada data sektor.</p>
      )}
    </div>
  );
}