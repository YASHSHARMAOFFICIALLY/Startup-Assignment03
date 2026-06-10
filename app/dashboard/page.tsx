import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getServerSession } from "next-auth";

import type { DashboardData } from "@/lib/types";
import { MOCK_DASHBOARD } from "@/lib/mock-data";
import { aggregate } from "@/lib/sheet-sync";
import { resolvePeriod, type PeriodKey } from "@/lib/period";
import { authOptions } from "@/lib/auth";
import { readAllRecords, buildAliasMap, readReps } from "@/lib/api-utils";
import { readSettings } from "@/lib/settings";
import { fmtCurrency, fmtCurrencyOrDash, fmtPercentOrDash, rankBadgeClass } from "@/lib/formatters";
import { th, tdNum, trHover } from "@/lib/table-styles";
import { Panel } from "@/components/ui/panel";
import { PageHeader } from "@/components/ui/page-header";

import { MetricCards } from "./_components/metric-cards";
import { KpiPanels } from "./_components/kpi-panels";
import { AutoSync } from "@/components/dashboard/auto-sync";

export const dynamic = "force-dynamic";

async function loadDashboardData(
  period: PeriodKey,
  from: string | null,
  to: string | null,
  offerId: string | undefined,
  settings: Awaited<ReturnType<typeof readSettings>>,
): Promise<{ data: DashboardData; source: "synced" | "mock" | "error"; error?: string }> {
  try {
    const records = await readAllRecords(offerId);
    if (records.closer.length === 0 && records.phone.length === 0 && records.dm.length === 0) {
      return { data: MOCK_DASHBOARD, source: "mock" };
    }
    const [aliasMap, reps] = await Promise.all([buildAliasMap(), readReps()]);
    const repCommissionRates = new Map<string, number>();
    for (const rep of reps) {
      if (rep.commissionRate != null) repCommissionRates.set(rep.displayName, rep.commissionRate);
    }
    const range = resolvePeriod(period, from, to, new Date());
    const data = aggregate(records, range.from, range.to, range.label, aliasMap, settings.commissionRate, repCommissionRates);
    return { data, source: "synced" };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load dashboard data.";
    return { data: MOCK_DASHBOARD, source: "error", error: message };
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string; offerId?: string }>;
}) {
  const params = await searchParams;
  const settings = await readSettings();
  const period = (params.period as PeriodKey) || (settings.defaultPeriod as PeriodKey);
  const from = params.from ?? null;
  const to = params.to ?? null;
  const offerId = params.offerId || undefined;

  const session = await getServerSession(authOptions);
  const userName = session?.user?.name?.split(" ")[0] ?? "there";
  const { data, source, error } = await loadDashboardData(period, from, to, offerId, settings);
  const { closerKPIs, setterKPIs, closers, setters } = data;

  const leaderboardRows = settings.leaderboardRows;

  const closerRows = Array.from({ length: leaderboardRows }, (_, i) => {
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

  const setterRows = Array.from({ length: leaderboardRows }, (_, i) => {
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
    <div className="p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 flex flex-col gap-4 sm:gap-6">
      <PageHeader
        title={`Welcome back, ${userName}`}
        subtitle="Here's your team's performance overview."
        badge={
          source === "mock" ? (
            <span className="inline-flex items-center rounded-full bg-brand-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-brand-accent">
              demo data — sync an offer to see real metrics
            </span>
          ) : undefined
        }
      />

      <AutoSync />

      {source === "error" && (
        <div className="flex items-center gap-3 rounded-lg border border-brand-negative/30 bg-brand-negative/10 px-4 py-3 text-sm text-brand-negative animate-stagger-1">
          <span>{error}</span>
          <Link
            href="/dashboard"
            className="ml-auto text-xs font-medium underline underline-offset-2 hover:text-brand-textPrimary transition-colors focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:outline-none rounded px-2 py-1"
          >
            Retry
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCards data={data} />
      </div>

      <Panel className="animate-stagger-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏆</span>
            <h2 className="text-[15px] font-medium text-brand-textPrimary">Leaderboard</h2>
          </div>
          <Link
            href="/leaderboard"
            className="flex items-center space-x-1.5 text-xs text-brand-textMuted border border-brand-border rounded-md px-3 py-1.5 hover:bg-white/[0.04] hover:text-brand-textPrimary transition-colors focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg focus-visible:outline-none"
          >
            <span>View full leaderboard</span>
            <ArrowRight size={12} />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:divide-x divide-brand-border/40">
          <div className="lg:pr-4">
            <h3 className="text-[13px] font-medium text-brand-textSecondary mb-4">Top Closers</h3>
            <table className="w-full text-[13px]">
              <thead>
                <tr>
                  <th scope="col" className={`${th} text-left`}>Rank</th>
                  <th scope="col" className={`${th} text-left`}>Rep</th>
                  <th scope="col" className={`${th} text-right`}>Cash Collected</th>
                  <th scope="col" className={`${th} text-right`}>Booked &rarr; Close</th>
                  <th scope="col" className={`${th} text-right`}>Avg Deal Value</th>
                </tr>
              </thead>
              <tbody>
                {closerRows.map((row) => (
                  <tr key={row.rank} className={trHover}>
                    <td className="py-2.5 px-2">
                      {row.rank <= 3 ? (
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${rankBadgeClass(row.rank)}`}>
                          {row.rank}
                        </div>
                      ) : (
                        <span className="text-brand-textFaint ml-2">{row.rank}</span>
                      )}
                    </td>
                    <td className={`py-2.5 px-2 font-medium ${row.name === "\u2014" ? "text-brand-textFaint/50" : "text-brand-textSecondary"}`}>{row.name}</td>
                    <td className={`${tdNum} text-right ${row.cash === "\u2014" ? "text-brand-textFaint/50" : "text-brand-textPrimary"}`}>{row.cash}</td>
                    <td className={`${tdNum} text-right ${row.rate === "\u2014" ? "text-brand-textFaint/50" : "text-brand-textSecondary"}`}>{row.rate}</td>
                    <td className={`${tdNum} text-right ${row.avg === "\u2014" ? "text-brand-textFaint/50" : "text-brand-textSecondary"}`}>{row.avg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:pl-4">
            <h3 className="text-[13px] font-medium text-brand-textSecondary mb-4">Top Setters</h3>
            <table className="w-full text-[13px]">
              <thead>
                <tr>
                  <th scope="col" className={`${th} text-left`}>Rank</th>
                  <th scope="col" className={`${th} text-left`}>Rep</th>
                  <th scope="col" className={`${th} text-center`}>Calls Set</th>
                  <th scope="col" className={`${th} text-right`}>Revenue Gen.</th>
                </tr>
              </thead>
              <tbody>
                {setterRows.map((row) => (
                  <tr key={row.rank} className={trHover}>
                    <td className="py-2.5 px-2">
                      {row.rank <= 3 ? (
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${rankBadgeClass(row.rank)}`}>
                          {row.rank}
                        </div>
                      ) : (
                        <span className="text-brand-textFaint ml-2">{row.rank}</span>
                      )}
                    </td>
                    <td className={`py-2.5 px-2 font-medium ${row.name === "\u2014" ? "text-brand-textFaint/50" : "text-brand-textSecondary"}`}>{row.name}</td>
                    <td className={`${tdNum} text-center ${row.calls === "\u2014" ? "text-brand-textFaint/50" : "text-brand-textPrimary"}`}>{row.calls}</td>
                    <td className={`${tdNum} text-right ${row.rev === "\u2014" ? "text-brand-textFaint/50" : "text-brand-textPrimary"}`}>{row.rev}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>

      <KpiPanels closerKPIs={closerKPIs} setterKPIs={setterKPIs} />
    </div>
  );
}
