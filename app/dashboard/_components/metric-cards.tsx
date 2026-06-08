"use client";

import { TrendingUp, TrendingDown } from "lucide-react";

import { AnimatedNumber } from "@/components/dashboard/animated-number";
import type { DashboardData } from "@/lib/types";

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) return <span className="text-[11px] text-brand-textFaint tabular-nums">0%</span>;
  const isPositive = delta > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium tabular-nums ${isPositive ? "text-brand-positive" : "text-brand-negative"}`}>
      <Icon size={12} />
      {isPositive ? "+" : ""}{delta}%
    </span>
  );
}

export function MetricCards({ data }: { data: DashboardData }) {
  const { closerKPIs, deltas } = data;

  return (
    <div className="animate-stagger-1">
      {/* Hero metric */}
      <div className="mb-2">
        <div className="text-[10px] text-brand-textFaint uppercase tracking-[0.12em] mb-1.5">
          Total Revenue
        </div>
        <div className="flex items-baseline gap-3">
          <div className="text-[42px] font-light text-brand-textPrimary tracking-tight leading-none tabular-nums">
            <AnimatedNumber value={closerKPIs.totalRevenue} format="currency" delay={100} />
          </div>
          <DeltaBadge delta={deltas.totalRevenue} />
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/[0.04] my-5" />

      {/* Supporting metrics */}
      <div className="grid grid-cols-3 gap-6">
        <div>
          <div className="text-[10px] text-brand-textFaint uppercase tracking-[0.1em] mb-1">Cash</div>
          <div className="text-lg font-normal text-brand-textSecondary tabular-nums">
            <AnimatedNumber value={closerKPIs.cashCollected} format="currency" delay={200} />
          </div>
          <DeltaBadge delta={deltas.cashCollected} />
        </div>
        <div>
          <div className="text-[10px] text-brand-textFaint uppercase tracking-[0.1em] mb-1">Deals</div>
          <div className="text-lg font-normal text-brand-textSecondary tabular-nums">
            <AnimatedNumber value={closerKPIs.dealsClosed} delay={280} />
          </div>
          <DeltaBadge delta={deltas.dealsClosed} />
        </div>
        <div>
          <div className="text-[10px] text-brand-textFaint uppercase tracking-[0.1em] mb-1">Close Rate</div>
          <div className="text-lg font-normal text-brand-textSecondary tabular-nums">
            <AnimatedNumber value={closerKPIs.closeRate} format="percent" delay={360} />
          </div>
          <DeltaBadge delta={deltas.closeRate} />
        </div>
      </div>
    </div>
  );
}
