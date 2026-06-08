import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getServerSession } from "next-auth";

import type { DashboardData } from "@/lib/types";
import { MOCK_DASHBOARD } from "@/lib/mock-data";
import { aggregate } from "@/lib/sheet-sync";
import { resolvePeriod, type PeriodKey } from "@/lib/period";
import { authOptions } from "@/lib/auth";
import { readAllRecords, buildAliasMap } from "@/lib/api-utils";
import { readSettings } from "@/lib/settings";
import { fmtCurrency, fmtCurrencyOrDash, fmtPercentOrDash, rankBadgeClass } from "@/lib/formatters";

import { MetricCards } from "./_components/metric-cards";
import { KpiPanels } from "./_components/kpi-panels";
import { AutoSync } from "@/components/dashboard/auto-sync";

export const dynamic = "force-dynamic";

const LEADERBOARD_ROWS = 5;

async function loadDashboardData(
  period: PeriodKey,
  from: string | null,
  to: string | null,
): Promise<{ data: DashboardData; source: "synced" | "mock" | "error"; error?: string }> {
  try {
    const records = await readAllRecords();
    if (records.closer.length === 0 && records.phone.length === 0 && records.dm.length === 0) {
      return { data: MOCK_DASHBOARD, source: "mock" };
    }
    const [aliasMap, settings] = await Promise.all([buildAliasMap(), readSettings()]);
    const range = resolvePeriod(period, from, to, new Date());
    const data = aggregate(records, range.from, range.to, range.label, aliasMap, settings.commissionRate);
    return { data, source: "synced" };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load dashboard data.";
    return { data: MOCK_DASHBOARD, source: "error", error: message };
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const settings = await readSettings();
  const period = (params.period as PeriodKey) || (settings.defaultPeriod as PeriodKey);
  const from = params.from ?? null;
  const to = params.to ?? null;

  const session = await getServerSession(authOptions);
  const userName = session?.user?.name?.split(" ")[0] ?? "there";
  const { data, source, error } = await loadDashboardData(period, from, to);
  const { closerKPIs, setterKPIs, closers, setters } = data;

  const closerRows = Array.from({ length: LEADERBOARD_ROWS }, (_, i) => {
    const rep = closers[i];
    if (!rep) return { rank: i + 1, name: "\u2014", cash: "\u2014", rate: "\u2014", avg: "\u2014" };
    return {
      rank: rep.rank,
      name: rep.name,
      cash: fmtCurrency(rep.cashCollected),
      rate: fmtPercentOrDash(rep.bookedToClose),
      avg: fmtCurrencyOrDash(rep.avgDealValue),
    };
  });

  const setterRows = Array.from({ length: LEADERBOARD_ROWS }, (_, i) => {
    const rep = setters[i];
    if (!rep) return { rank: i + 1, name: "\u2014", calls: "\u2014", rev: "\u2014" };
    return {
      rank: rep.rank,
      name: rep.name,
      calls: String(rep.callsSet),
      rev: fmtCurrency(rep.revenueGenerated),
    };
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <AutoSync />

      {/* Welcome */}
      <div className="animate-stagger-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-brand-textPrimary">
          Welcome back, {userName}
        </h1>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-sm text-brand-textMuted">
            Your team&apos;s performance overview
          </p>
          {source === "mock" && (
            <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Demo data
            </span>
          )}
        </div>
      </div>

      {/* Error */}
      {source === "error" && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          <span>{error}</span>
          <Link href="/dashboard" className="ml-auto text-xs font-medium hover:text-white transition-colors px-3 py-1.5 rounded-md border border-red-500/20 hover:border-red-500/40">
            Retry
          </Link>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCards data={data} />
      </div>

      {/* Leaderboard */}
      <div className="rounded-xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-5 sm:p-6 animate-stagger-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-base font-medium text-brand-textPrimary">Leaderboard</h2>
          <Link
            href="/leaderboard"
            className="group flex items-center gap-1.5 text-xs text-brand-textMuted hover:text-brand-textPrimary transition-colors"
          >
            <span>View all</span>
            <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Closers */}
          <div>
            <h3 className="text-xs font-medium text-brand-textFaint uppercase tracking-wider mb-4">Top Closers</h3>
            <div className="space-y-1">
              {closerRows.map((row) => (
                <div key={row.rank} className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-white/[0.03] transition-colors">
                  <div className="w-6 shrink-0">
                    {row.rank <= 3 ? (
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${rankBadgeClass(row.rank)}`}>
                        {row.rank}
                      </div>
                    ) : (
                      <span className="text-brand-textFaint text-xs ml-1.5">{row.rank}</span>
                    )}
                  </div>
                  <span className={`flex-1 text-sm font-medium ${row.name === "\u2014" ? "text-brand-textFaint/40" : "text-brand-textSecondary"}`}>
                    {row.name}
                  </span>
                  <span className={`text-sm tabular-nums ${row.cash === "\u2014" ? "text-brand-textFaint/40" : "text-brand-textPrimary font-medium"}`}>
                    {row.cash}
                  </span>
                  <span className={`text-xs tabular-nums w-12 text-right ${row.rate === "\u2014" ? "text-brand-textFaint/40" : "text-brand-textMuted"}`}>
                    {row.rate}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Setters */}
          <div className="lg:border-l lg:border-white/[0.06] lg:pl-8">
            <h3 className="text-xs font-medium text-brand-textFaint uppercase tracking-wider mb-4">Top Setters</h3>
            <div className="space-y-1">
              {setterRows.map((row) => (
                <div key={row.rank} className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-white/[0.03] transition-colors">
                  <div className="w-6 shrink-0">
                    {row.rank <= 3 ? (
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${rankBadgeClass(row.rank)}`}>
                        {row.rank}
                      </div>
                    ) : (
                      <span className="text-brand-textFaint text-xs ml-1.5">{row.rank}</span>
                    )}
                  </div>
                  <span className={`flex-1 text-sm font-medium ${row.name === "\u2014" ? "text-brand-textFaint/40" : "text-brand-textSecondary"}`}>
                    {row.name}
                  </span>
                  <span className={`text-sm tabular-nums ${row.calls === "\u2014" ? "text-brand-textFaint/40" : "text-brand-textMuted"}`}>
                    {row.calls} calls
                  </span>
                  <span className={`text-sm tabular-nums ${row.rev === "\u2014" ? "text-brand-textFaint/40" : "text-brand-textPrimary font-medium"}`}>
                    {row.rev}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <KpiPanels closerKPIs={closerKPIs} setterKPIs={setterKPIs} />
    </div>
  );
}
