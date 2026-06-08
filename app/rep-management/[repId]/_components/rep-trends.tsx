"use client";

import { Sparkline } from "@/components/dashboard/sparkline";
import { Panel } from "@/components/ui/panel";

export function RepTrends({
  trends,
}: {
  trends: { label: string; data: number[]; color?: string }[];
}) {
  if (trends.every((t) => t.data.length <= 1)) return null;

  return (
    <Panel>
      <h3 className="text-xs font-medium text-brand-textFaint uppercase tracking-wider mb-4">
        Trends
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {trends.map((t) => (
          <div key={t.label}>
            <div className="text-[11px] text-brand-textMuted mb-1">
              {t.label}
            </div>
            <div className="h-16">
              <Sparkline data={t.data} color={t.color} />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
