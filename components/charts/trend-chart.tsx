"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export function TrendChart({
  data,
}: {
  data: Array<{ day: string; cash: number; closeRate: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="0" />
        <XAxis
          dataKey="day"
          tick={{ fill: "#8B8B95", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: string) => v.slice(5)}
        />
        <YAxis
          yAxisId="cash"
          orientation="left"
          tick={{ fill: "#8B8B95", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) =>
            v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`
          }
          width={44}
        />
        <YAxis
          yAxisId="rate"
          orientation="right"
          domain={[0, 100]}
          tick={{ fill: "#8B8B95", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v}%`}
          width={36}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#0a0a0a",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 6,
            fontSize: 12,
            color: "#D4D4D8",
          }}
          formatter={(value, name) => {
            const n = typeof value === "number" ? value : 0;
            if (name === "Cash") {
              return [`$${n.toLocaleString()}`, "Cash"];
            }
            return [`${n.toFixed(1)}%`, "Close Rate"];
          }}
          labelStyle={{ color: "#8B8B95", marginBottom: 4 }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, color: "#8B8B95", paddingTop: 6 }}
        />
        <Line
          yAxisId="cash"
          type="monotone"
          dataKey="cash"
          name="Cash"
          stroke="#F59E0B"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        <Line
          yAxisId="rate"
          type="monotone"
          dataKey="closeRate"
          name="Close Rate"
          stroke="#22C55E"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
