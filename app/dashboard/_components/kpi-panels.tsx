"use client";

import { Target, Users } from "lucide-react";

import { AnimatedNumber } from "@/components/dashboard/animated-number";
import { Panel } from "@/components/ui/panel";
import type { CloserKPIs, SetterKPIs } from "@/lib/types";

type Metric = { label: string; val: number; format?: "currency" | "percent" };

function KpiGrid({ items, baseDelay }: { items: Metric[]; baseDelay: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-4">
      {items.map((item, idx) => (
        <div key={item.label} className="cursor-default group">
          <div className="text-[11px] text-brand-textFaint mb-1 group-hover:text-brand-textMuted transition-colors">
            {item.label}
          </div>
          <div className="text-xl font-semibold text-brand-textPrimary group-hover:text-brand-accent transition-colors duration-300 tabular-nums">
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
    { label: "Cash / Booked Call", val: closerKPIs.cashPerBookedCall, format: "currency" },
  ];

  const setterKpis: Metric[] = [
    { label: "Total Calls Set", val: setterKPIs.totalCallsSet },
    { label: "Total Shows", val: setterKPIs.totalShows },
    { label: "Show Rate", val: setterKPIs.phoneShowRate, format: "percent" },
    { label: "DM Book Rate", val: setterKPIs.dmBookRate, format: "percent" },
    { label: "DM Show Rate", val: setterKPIs.dmShowRate, format: "percent" },
    { label: "Revenue Generated", val: setterKPIs.revenueGenerated, format: "currency" },
    { label: "Cash Collected", val: setterKPIs.cashCollected, format: "currency" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-stagger-5">
      <Panel className="group">
        <div className="flex items-center space-x-2 mb-5 pb-4 border-b border-brand-border/40">
          <Target size={15} className="text-brand-accent" />
          <h3 className="text-[14px] font-medium text-brand-textPrimary">Closer KPIs</h3>
        </div>
        <KpiGrid items={closerKpis} baseDelay={600} />
      </Panel>

      <Panel className="group">
        <div className="flex items-center space-x-2 mb-5 pb-4 border-b border-brand-border/40">
          <Users size={15} className="text-brand-accent" />
          <h3 className="text-[14px] font-medium text-brand-textPrimary">Setter KPIs</h3>
        </div>
        <KpiGrid items={setterKpis} baseDelay={700} />
      </Panel>
    </div>
  );
}
