"use client";

import { Line, LineChart, ResponsiveContainer } from "recharts";

import { cn } from "@/lib/utils";

/**
 * Minimal sparkline — a single amber line, no area fill, no axes/grid.
 */
export function Sparkline({
  data,
  color = "#F59E0B",
  className,
}: {
  data: number[];
  color?: string;
  className?: string;
}) {
  const chartData = data.map((value, index) => ({ index, value }));

  return (
    <div className={cn("h-full w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        >
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
