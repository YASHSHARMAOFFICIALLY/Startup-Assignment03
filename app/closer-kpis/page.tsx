export const dynamic = "force-dynamic";

import Link from "next/link";
import { resolvePeriod, type PeriodKey } from "@/lib/period";
import { readAllRecords, buildAliasMap, buildNameToRepIdMap } from "@/lib/api-utils";
import { readSettings } from "@/lib/settings";
import { getSessionUser } from "@/lib/session";
import type { CloserRecord } from "@/lib/sheet-sync";
import { fmtCurrency } from "@/lib/formatters";
import { th, td, tdNum, trHover } from "@/lib/table-styles";
import { parseSort, sortRows } from "@/lib/sort";
import { Panel } from "@/components/ui/panel";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { FunnelBar } from "@/components/ui/funnel-bar";
import { ObjectionPanel } from "@/components/ui/objection-panel";
import { SortableTh } from "@/components/ui/sortable-th";
import { TrendChart } from "@/components/charts/trend-chart";

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

function inRange(d: string, from: string | null, to: string | null) {
  return (from === null || d >= from) && (to === null || d <= to);
}

function buildCloserStats(records: CloserRecord[], aliasMap: Map<string, string>) {
  const byRep = new Map<string, {
    totalCalls: number; noShows: number; cancellations: number; reschedules: number;
    liveCalls: number; offers: number; deposits: number; dealsClosed: number;
    revenue: number; cash: number; mrr: number;
    ratings: number[]; objections: string[];
  }>();

  for (const r of records) {
    if (!r.name) continue;
    const name = aliasMap.get(r.name) ?? r.name;
    const cur = byRep.get(name) ?? {
      totalCalls: 0, noShows: 0, cancellations: 0, reschedules: 0,
      liveCalls: 0, offers: 0, deposits: 0, dealsClosed: 0,
      revenue: 0, cash: 0, mrr: 0, ratings: [], objections: [],
    };
    cur.totalCalls += r.totalCalls;
    cur.noShows += r.noShows;
    cur.cancellations += r.cancellations;
    cur.reschedules += r.reschedules;
    cur.liveCalls += r.liveCalls;
    cur.offers += r.offers;
    cur.deposits += r.deposits;
    cur.dealsClosed += r.dealsClosed;
    cur.revenue += r.revenue;
    cur.cash += r.cash;
    cur.mrr += r.mrr;
    if (r.dayRating > 0) cur.ratings.push(r.dayRating);
    if (r.objection) cur.objections.push(r.objection);
    byRep.set(name, cur);
  }

  return Array.from(byRep.entries())
    .map(([name, v]) => ({
      name,
      totalCalls: v.totalCalls,
      noShows: v.noShows,
      cancellations: v.cancellations,
      reschedules: v.reschedules,
      liveCalls: v.liveCalls,
      offers: v.offers,
      deposits: v.deposits,
      dealsClosed: v.dealsClosed,
      revenue: v.revenue,
      cash: v.cash,
      mrr: v.mrr,
      avgRating: v.ratings.length > 0 ? Math.round((v.ratings.reduce((a, b) => a + b, 0) / v.ratings.length) * 10) / 10 : 0,
      ratingCount: v.ratings.length,
      topObjection: mostCommon(v.objections),
      showRate: pct(v.liveCalls, v.totalCalls),
      bookedToClose: pct(v.dealsClosed, v.totalCalls),
      showToClose: pct(v.dealsClosed, v.liveCalls),
      offerToClose: pct(v.dealsClosed, v.offers),
      cashPerCall: v.totalCalls > 0 ? Math.round(v.cash / v.totalCalls) : 0,
      avgDeal: v.dealsClosed > 0 ? Math.round(v.cash / v.dealsClosed) : 0,
    }))
    .sort((a, b) => b.cash - a.cash);
}

function mostCommon(arr: string[]): string {
  if (arr.length === 0) return "—";
  const counts = new Map<string, number>();
  for (const s of arr) {
    if (!s || s === ".") continue;
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  if (counts.size === 0) return "—";
  let best = "";
  let max = 0;
  counts.forEach((v, k) => {
    if (v > max) { best = k; max = v; }
  });
  return best;
}

const SORTABLE_FIELDS = [
  "name", "cash", "mrr", "dealsClosed", "totalCalls", "liveCalls",
  "noShows", "showRate", "bookedToClose", "avgDeal", "cashPerCall", "avgRating",
];

export default async function CloserKpisPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string; offerId?: string; sort?: string }>;
}) {
  let params: { period?: string; from?: string; to?: string; offerId?: string; sort?: string };
  let stats: ReturnType<typeof buildCloserStats> = [];
  let filtered: CloserRecord[] = [];
  let nameToRepId = new Map<string, string>();

  try {
    params = await searchParams;
    const [records, aliasMap, ntrId, settings, sessionUser] = await Promise.all([readAllRecords(params.offerId || undefined), buildAliasMap(), buildNameToRepIdMap(), readSettings(), getSessionUser()]);
    nameToRepId = ntrId;
    const period = (params.period as PeriodKey) || (settings.defaultPeriod as PeriodKey);
    const from = params.from ?? null;
    const to = params.to ?? null;
    const range = resolvePeriod(period, from, to, new Date());
    filtered = records.closer.filter((r) => inRange(r.date, range.from, range.to));
    const allStats = buildCloserStats(filtered, aliasMap);

    // Regular users only see their own data
    if (sessionUser && sessionUser.role !== "manager") {
      const userName = sessionUser.name.toLowerCase();
      stats = allStats.filter((s) => s.name.toLowerCase() === userName);
    } else {
      stats = allStats;
    }
  } catch (e) {
    console.error("[SalesIO] Closer KPIs failed:", e);
    return (
      <div className="p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 flex flex-col gap-6">
        <PageHeader title="Closer KPIs" subtitle="Per-closer performance breakdown." />
        <EmptyState title="Failed to load" description="Could not load closer data. Please try refreshing." />
      </div>
    );
  }

  // Sort the table rows
  const { field: sortField, dir: sortDir } = parseSort(params!.sort, SORTABLE_FIELDS, "-cash");
  const sortedStats = sortRows(stats, sortField, sortDir);
  const currentSort = `${sortDir === -1 ? "-" : ""}${sortField}`;

  // Base query object for sort links (preserve other params)
  const baseQuery: Record<string, string> = {};
  if (params!.period) baseQuery.period = params!.period;
  if (params!.from) baseQuery.from = params!.from;
  if (params!.to) baseQuery.to = params!.to;
  if (params!.offerId) baseQuery.offerId = params!.offerId;

  const totalCash = stats.reduce((s, r) => s + r.cash, 0);
  const totalRevenue = stats.reduce((s, r) => s + r.revenue, 0);
  const totalDeals = stats.reduce((s, r) => s + r.dealsClosed, 0);
  const totalDeposits = stats.reduce((s, r) => s + r.deposits, 0);
  const totalMrr = stats.reduce((s, r) => s + r.mrr, 0);
  const avgShow = stats.length > 0 ? Math.round(stats.reduce((s, r) => s + r.showRate, 0) / stats.length) : 0;
  const avgClose = stats.length > 0 ? Math.round(stats.reduce((s, r) => s + r.bookedToClose, 0) / stats.length) : 0;

  const funnelCalls = stats.reduce((s, r) => s + r.totalCalls, 0);
  const funnelLive = stats.reduce((s, r) => s + r.liveCalls, 0);
  const funnelOffers = stats.reduce((s, r) => s + r.offers, 0);
  const funnelClosed = totalDeals;

  // Rating panel: closers with at least one rated record
  const ratedClosers = stats.filter((r) => r.ratingCount > 0);

  // Trend chart: cumulative cash + close rate per day
  const dayMap = new Map<string, { cash: number; deals: number; calls: number }>();
  for (const r of filtered) {
    if (!r.date) continue;
    const cur = dayMap.get(r.date) ?? { cash: 0, deals: 0, calls: 0 };
    cur.cash += r.cash;
    cur.deals += r.dealsClosed;
    cur.calls += r.totalCalls;
    dayMap.set(r.date, cur);
  }
  const sortedDays = Array.from(dayMap.keys()).sort();
  let cumCash = 0;
  let cumDeals = 0;
  let cumCalls = 0;
  const trendData = sortedDays.map((day) => {
    const d = dayMap.get(day)!;
    cumCash += d.cash;
    cumDeals += d.deals;
    cumCalls += d.calls;
    return {
      day,
      cash: cumCash,
      closeRate: cumCalls > 0 ? Math.round((cumDeals / cumCalls) * 1000) / 10 : 0,
    };
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 flex flex-col gap-6">
      <PageHeader
        title="Closer KPIs"
        subtitle="Per-closer performance breakdown."
        badge={filtered.length === 0 ? <span className="text-brand-accent text-xs">(no data for this period)</span> : undefined}
      />

      {stats.length === 0 ? (
        <EmptyState
          title="No closer records"
          description="No closer records found for this period. Sync an offer to see closer KPIs."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 animate-stagger-2">
            <div>
              <div className="text-xs text-brand-textFaint mb-1">Total Cash</div>
              <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{fmtCurrency(totalCash)}</div>
            </div>
            <div>
              <div className="text-xs text-brand-textFaint mb-1">Revenue</div>
              <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{fmtCurrency(totalRevenue)}</div>
            </div>
            <div>
              <div className="text-xs text-brand-textFaint mb-1">Deals</div>
              <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{totalDeals}</div>
            </div>
            <div>
              <div className="text-xs text-brand-textFaint mb-1">Deposits</div>
              <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{totalDeposits}</div>
            </div>
            <div>
              <div className="text-xs text-brand-textFaint mb-1">MRR</div>
              <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{fmtCurrency(totalMrr)}</div>
            </div>
            <div>
              <div className="text-xs text-brand-textFaint mb-1">Show%</div>
              <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{avgShow}%</div>
            </div>
            <div>
              <div className="text-xs text-brand-textFaint mb-1">Close%</div>
              <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{avgClose}%</div>
            </div>
          </div>

          <Panel className="animate-stagger-3">
            <h3 className="text-xs font-medium text-brand-textFaint uppercase tracking-wider mb-3">Closer Funnel</h3>
            <FunnelBar stages={[
              { label: "Total Calls", value: funnelCalls },
              { label: "Live Calls", value: funnelLive },
              { label: "Offers", value: funnelOffers },
              { label: "Closed", value: funnelClosed },
            ]} />
          </Panel>

          {trendData.length >= 2 && (
            <Panel className="animate-stagger-4">
              <h3 className="text-xs font-medium text-brand-textFaint uppercase tracking-wider mb-3">Cumulative Trend</h3>
              <TrendChart data={trendData} />
            </Panel>
          )}

          <Panel className="animate-stagger-4 overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr>
                  <SortableTh label="Rep" field="name" sort={currentSort} basePath="/closer-kpis" query={baseQuery} align="left" />
                  <SortableTh label="Cash" field="cash" sort={currentSort} basePath="/closer-kpis" query={baseQuery} align="right" />
                  <SortableTh label="MRR" field="mrr" sort={currentSort} basePath="/closer-kpis" query={baseQuery} align="right" />
                  <SortableTh label="Deals" field="dealsClosed" sort={currentSort} basePath="/closer-kpis" query={baseQuery} align="center" />
                  <SortableTh label="Calls" field="totalCalls" sort={currentSort} basePath="/closer-kpis" query={baseQuery} align="center" />
                  <SortableTh label="Shows" field="liveCalls" sort={currentSort} basePath="/closer-kpis" query={baseQuery} align="center" />
                  <SortableTh label="No-Shows" field="noShows" sort={currentSort} basePath="/closer-kpis" query={baseQuery} align="center" />
                  <SortableTh label="Show%" field="showRate" sort={currentSort} basePath="/closer-kpis" query={baseQuery} align="right" />
                  <SortableTh label="Close%" field="bookedToClose" sort={currentSort} basePath="/closer-kpis" query={baseQuery} align="right" />
                  <SortableTh label="Avg Deal" field="avgDeal" sort={currentSort} basePath="/closer-kpis" query={baseQuery} align="right" />
                  <SortableTh label="$/Call" field="cashPerCall" sort={currentSort} basePath="/closer-kpis" query={baseQuery} align="right" />
                  <SortableTh label="Rating" field="avgRating" sort={currentSort} basePath="/closer-kpis" query={baseQuery} align="center" />
                  <th scope="col" className={th}>Top Objection</th>
                </tr>
              </thead>
              <tbody>
                {sortedStats.map((rep) => (
                  <tr key={rep.name} className={trHover}>
                    <td className={`${td} font-medium text-brand-textSecondary`}>
                      {nameToRepId.get(rep.name) ? (
                        <Link href={`/rep-management/${nameToRepId.get(rep.name)}`} className="hover:text-brand-accent transition-colors">{rep.name}</Link>
                      ) : rep.name}
                    </td>
                    <td className={`${tdNum} text-right text-brand-textPrimary font-medium`}>{fmtCurrency(rep.cash)}</td>
                    <td className={`${tdNum} text-right text-brand-textSecondary`}>{fmtCurrency(rep.mrr)}</td>
                    <td className={`${tdNum} text-center text-brand-textPrimary`}>{rep.dealsClosed}</td>
                    <td className={`${tdNum} text-center text-brand-textSecondary`}>{rep.totalCalls}</td>
                    <td className={`${tdNum} text-center text-brand-textSecondary`}>{rep.liveCalls}</td>
                    <td className={`${tdNum} text-center ${rep.noShows > 0 ? "text-brand-negative" : "text-brand-textFaint"}`}>{rep.noShows}</td>
                    <td className={`${tdNum} text-right text-brand-textSecondary`}>{rep.showRate}%</td>
                    <td className={`${tdNum} text-right ${rep.bookedToClose >= 20 ? "text-brand-positive" : "text-brand-textSecondary"}`}>{rep.bookedToClose}%</td>
                    <td className={`${tdNum} text-right text-brand-textSecondary`}>{fmtCurrency(rep.avgDeal)}</td>
                    <td className={`${tdNum} text-right text-brand-textSecondary`}>{fmtCurrency(rep.cashPerCall)}</td>
                    <td className={`${tdNum} text-center ${rep.avgRating >= 7 ? "text-brand-positive" : rep.avgRating >= 5 ? "text-brand-textSecondary" : "text-brand-negative"}`}>{rep.avgRating || "—"}</td>
                    <td className={`${td} text-brand-textMuted text-xs max-w-[150px] truncate`} title={rep.topObjection}>{rep.topObjection}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          {ratedClosers.length > 0 && (
            <Panel>
              <h3 className="text-xs font-medium text-brand-textFaint uppercase tracking-wider mb-4">Self-Rating vs Performance</h3>
              <div className="flex flex-col gap-3">
                {ratedClosers.map((rep) => {
                  const mismatchHigh = rep.avgRating >= 7 && rep.bookedToClose < 20;
                  const mismatchLow = rep.avgRating <= 4 && rep.bookedToClose >= 30;
                  return (
                    <div key={rep.name} className="flex items-center gap-4">
                      <div className="w-28 shrink-0 text-[13px] text-brand-textSecondary truncate">{rep.name}</div>
                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-brand-accent"
                            style={{ width: `${Math.min(rep.avgRating / 10 * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-[12px] tabular-nums text-brand-textMuted w-10 shrink-0">{rep.avgRating}/10</span>
                      </div>
                      <div className="w-16 shrink-0 text-right text-[13px] tabular-nums text-brand-textSecondary">{rep.bookedToClose}%</div>
                      {mismatchHigh ? (
                        <span className="w-[152px] shrink-0 text-right text-[11px] text-brand-negative">self-rating above results</span>
                      ) : mismatchLow ? (
                        <span className="w-[152px] shrink-0 text-right text-[11px] text-brand-positive">outperforming self-rating</span>
                      ) : (
                        <span className="w-[152px] shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}

          <ObjectionPanel entries={filtered} />
        </>
      )}
    </div>
  );
}
