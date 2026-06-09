"use client";

import {
  DollarSign,
  Wallet,
  Target,
  Percent,
  ArrowUp,
  ArrowDown,
  type LucideIcon,
} from "lucide-react";

import { AnimatedNumber, type NumberFormat } from "@/components/dashboard/animated-number";
import { Sparkline } from "@/components/dashboard/sparkline";
import type { DashboardData } from "@/lib/types";

const STAGGER_CLASSES = [
  "animate-stagger-1",
  "animate-stagger-2",
  "animate-stagger-3",
  "animate-stagger-4",
] as const;

function DeltaBadge({ value }: { value: number }) {
  const negative = value < 0;
  const Icon = negative ? ArrowDown : ArrowUp;
  const color = negative ? "text-brand-negative" : "text-brand-positive";
  return (
    <div className="flex items-center text-[11px] font-medium">
      <Icon size={12} className={`mr-1 ${color}`} />
      <span className={color}>{`${value}%`}</span>
      <span className="ml-1 text-brand-textFaint">vs prior period</span>
    </div>
  );
}

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
  return (
    <div className={`bg-brand-bg/90 backdrop-blur-md rounded-xl relative overflow-hidden group hover:bg-brand-surface/50 transition-colors duration-500 ${STAGGER_CLASSES[index] ?? ""} gradient-border-card flex flex-col`}>
      <div className="p-5 pb-2 relative z-10">
        <div className="flex items-center space-x-2 mb-3">
          <div className="flex items-center justify-center rounded-lg bg-brand-iconBg p-2">
            <Icon
              size={18}
              className="text-brand-colHeader group-hover:text-brand-textPrimary transition-colors"
            />
          </div>
          <span className="text-xs font-medium text-brand-textMuted group-hover:text-brand-textSecondary transition-colors">
            {label}
          </span>
        </div>
        <div className="text-[26px] font-semibold text-brand-textPrimary tracking-tight mb-2 tabular-nums">
          <AnimatedNumber value={value} format={format} delay={200 + index * 100} />
        </div>
        <DeltaBadge value={delta} />
      </div>
      <div className="mt-auto h-12 w-full opacity-60">
        <Sparkline data={trend} />
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
