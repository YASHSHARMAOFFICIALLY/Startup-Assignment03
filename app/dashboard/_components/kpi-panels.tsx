"use client";

import { Target, Users } from "lucide-react";

import { AnimatedNumber } from "@/components/dashboard/animated-number";
import type { CloserKPIs, SetterKPIs } from "@/lib/types";

type Metric = { label: string; val: number; format?: "currency" | "percent" };

function KpiGrid({ items, baseDelay }: { items: Metric[]; baseDelay: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
      {items.map((item, idx) => (
        <div key={item.label} className="group/kpi">
          <div className="text-xs text-brand-textFaint mb-1.5 tracking-wide uppercase">
            {item.label}
          </div>
          <div className="text-xl font-semibold text-brand-textPrimary tabular-nums">
            <AnimatedNumber value={item.val} format={item.format} delay={baseDelay + idx * 50} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function KpiPanels({
  closerKPIs,
  setterKPIs,
}: {
  closerKPIs: CloserKPIs;
  setterKPIs: SetterKPIs;
}) {
  const closerKpis: Metric[] = [
    { label: "No Shows", val: closerKPIs.noShows },
    { label: "Cancellations", val: closerKPIs.cancellations },
    { label: "Booked \u2192 Close", val: closerKPIs.bookedToClose, format: "percent" },
    { label: "Show \u2192 Close", val: closerKPIs.showToClose, format: "percent" },
    { label: "Offer \u2192 Close", val: closerKPIs.offerToClose, format: "percent" },
    { label: "Cash / Call", val: closerKPIs.cashPerBookedCall, format: "currency" },
  ];

  const setterKpis: Metric[] = [
    { label: "Calls Set", val: setterKPIs.totalCallsSet },
    { label: "Total Shows", val: setterKPIs.totalShows },
    { label: "Show Rate", val: setterKPIs.phoneShowRate, format: "percent" },
    { label: "DM Book Rate", val: setterKPIs.dmBookRate, format: "percent" },
    { label: "DM Show Rate", val: setterKPIs.dmShowRate, format: "percent" },
    { label: "Revenue", val: setterKPIs.revenueGenerated, format: "currency" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-5">
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-brand-accent/10">
            <Target size={14} className="text-brand-accent" />
          </div>
          <h3 className="text-sm font-medium text-brand-textPrimary">Closer KPIs</h3>
        </div>
        <KpiGrid items={closerKpis} baseDelay={600} />
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-5">
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-brand-accent/10">
            <Users size={14} className="text-brand-accent" />
          </div>
          <h3 className="text-sm font-medium text-brand-textPrimary">Setter KPIs</h3>
        </div>
        <KpiGrid items={setterKpis} baseDelay={700} />
      </div>
    </div>
  );
}
