"use client";

import { AnimatedNumber } from "@/components/dashboard/animated-number";
import type { CloserKPIs, SetterKPIs } from "@/lib/types";

type Metric = { label: string; val: number; format?: "currency" | "percent" };

function KpiGrid({ items, baseDelay }: { items: Metric[]; baseDelay: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
      {items.map((item, idx) => (
        <div key={item.label}>
          <div className="text-[10px] text-brand-textFaint uppercase tracking-[0.1em] mb-1">
            {item.label}
          </div>
          <div className="text-base font-normal text-brand-textSecondary tabular-nums">
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white/[0.02] rounded-xl p-5">
        <div className="text-[10px] text-brand-textFaint uppercase tracking-[0.1em] mb-5 pb-3 border-b border-white/[0.04]">
          Closer KPIs
        </div>
        <KpiGrid items={closerKpis} baseDelay={600} />
      </div>

      <div className="bg-white/[0.02] rounded-xl p-5">
        <div className="text-[10px] text-brand-textFaint uppercase tracking-[0.1em] mb-5 pb-3 border-b border-white/[0.04]">
          Setter KPIs
        </div>
        <KpiGrid items={setterKpis} baseDelay={700} />
      </div>
    </div>
  );
}
