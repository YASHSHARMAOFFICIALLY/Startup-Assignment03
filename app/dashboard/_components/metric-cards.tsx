"use client";

import {
  DollarSign,
  Wallet,
  Target,
  Percent,
  TrendingUp,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";

import { AnimatedNumber, type NumberFormat } from "@/components/dashboard/animated-number";
import { Sparkline } from "@/components/dashboard/sparkline";
import type { DashboardData } from "@/lib/types";

function MetricCard({
  icon: Icon,
  label,
  value,
  format,
  delta,
  trend,
  index,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  format?: NumberFormat;
  delta: number;
  trend: number[];
  index: number;
}) {
  const isPositive = delta >= 0;
  const DeltaIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div
      className="group relative rounded-xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-5 transition-all duration-300 hover:border-white/[0.12] hover:from-white/[0.06] animate-stagger-1"
      style={{ animationDelay: `${100 + index * 80}ms` }}
    >
      {/* Label row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-accent/10">
            <Icon size={16} className="text-brand-accent" />
          </div>
          <span className="text-sm text-brand-textMuted">{label}</span>
        </div>
      </div>

      {/* Value */}
      <div className="text-3xl font-semibold text-brand-textPrimary tracking-tight tabular-nums mb-3">
        <AnimatedNumber value={value} format={format} delay={150 + index * 80} />
      </div>

      {/* Delta + Sparkline row */}
      <div className="flex items-end justify-between">
        <div className={`flex items-center gap-1.5 text-xs font-medium ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
          <DeltaIcon size={14} />
          <span className="tabular-nums">{Math.abs(delta)}%</span>
          <span className="text-brand-textFaint font-normal">vs prior</span>
        </div>
        <div className="w-20 h-8 opacity-40 group-hover:opacity-70 transition-opacity">
          <Sparkline data={trend} />
        </div>
      </div>
    </div>
  );
}

export function MetricCards({ data }: { data: DashboardData }) {
  const { closerKPIs, deltas, trends } = data;
  return (
    <>
      <MetricCard icon={DollarSign} label="Total Revenue" value={closerKPIs.totalRevenue} format="currency" delta={deltas.totalRevenue} trend={trends.totalRevenue} index={0} />
      <MetricCard icon={Wallet} label="Cash Collected" value={closerKPIs.cashCollected} format="currency" delta={deltas.cashCollected} trend={trends.cashCollected} index={1} />
      <MetricCard icon={Target} label="Deals Closed" value={closerKPIs.dealsClosed} delta={deltas.dealsClosed} trend={trends.dealsClosed} index={2} />
      <MetricCard icon={Percent} label="Close Rate" value={closerKPIs.closeRate} format="percent" delta={deltas.closeRate} trend={trends.closeRate} index={3} />
    </>
  );
}
