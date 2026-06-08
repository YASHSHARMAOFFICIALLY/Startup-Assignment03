export const dynamic = "force-dynamic";

import Link from "next/link";
import { resolvePeriod, type PeriodKey } from "@/lib/period";
import { readAllRecords, buildAliasMap, buildNameToRepIdMap } from "@/lib/api-utils";
import type { CloserRecord } from "@/lib/sheet-sync";
import { fmtCurrency } from "@/lib/formatters";
import { th, td, tdNum, trHover } from "@/lib/table-styles";
import { Panel } from "@/components/ui/panel";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { FunnelBar } from "@/components/ui/funnel-bar";
import { ObjectionPanel } from "@/components/ui/objection-panel";

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
  if (arr.length === 0) return "\u2014";
  const counts = new Map<string, number>();
  for (const s of arr) {
    if (!s || s === ".") continue;
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  if (counts.size === 0) return "\u2014";
  let best = "";
  let max = 0;
  counts.forEach((v, k) => {
    if (v > max) { best = k; max = v; }
  });
  return best;
}

export default async function CloserKpisPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const period = ((await searchParams).period as PeriodKey) || "last-month";
  const [records, aliasMap, nameToRepId] = await Promise.all([readAllRecords(), buildAliasMap(), buildNameToRepIdMap()]);
  const range = resolvePeriod(period, null, null, new Date());
  const filtered = records.closer.filter((r) => inRange(r.date, range.from, range.to));
  const stats = buildCloserStats(filtered, aliasMap);

  const totalCash = stats.reduce((s, r) => s + r.cash, 0);
  const totalRevenue = stats.reduce((s, r) => s + r.revenue, 0);
  const totalDeals = stats.reduce((s, r) => s + r.dealsClosed, 0);
  const avgShow = stats.length > 0 ? Math.round(stats.reduce((s, r) => s + r.showRate, 0) / stats.length) : 0;
  const avgClose = stats.length > 0 ? Math.round(stats.reduce((s, r) => s + r.bookedToClose, 0) / stats.length) : 0;

  const funnelCalls = stats.reduce((s, r) => s + r.totalCalls, 0);
  const funnelLive = stats.reduce((s, r) => s + r.liveCalls, 0);
  const funnelOffers = stats.reduce((s, r) => s + r.offers, 0);
  const funnelClosed = totalDeals;

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
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 animate-stagger-2">
            <div>
              <div className="text-xs text-brand-textFaint mb-1">Total Cash</div>
              <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{fmtCurrency(totalCash)}</div>
            </div>
            <div>
              <div className="text-xs text-brand-textFaint mb-1">Revenue</div>
              <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{fmtCurrency(totalRevenue)}</div>
            </div>
            <div>
              <div className="text-xs text-brand-textFaint mb-1">Deals Closed</div>
              <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{totalDeals}</div>
            </div>
            <div>
              <div className="text-xs text-brand-textFaint mb-1">Avg Show%</div>
              <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{avgShow}%</div>
            </div>
            <div>
              <div className="text-xs text-brand-textFaint mb-1">Avg Close%</div>
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

          <Panel className="animate-stagger-4 overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr>
                  <th scope="col" className={th}>Rep</th>
                  <th scope="col" className={`${th} text-right`}>Cash</th>
                  <th scope="col" className={`${th} text-right`}>MRR</th>
                  <th scope="col" className={`${th} text-center`}>Deals</th>
                  <th scope="col" className={`${th} text-center`}>Calls</th>
                  <th scope="col" className={`${th} text-center`}>Shows</th>
                  <th scope="col" className={`${th} text-center`}>No-Shows</th>
                  <th scope="col" className={`${th} text-right`}>Show%</th>
                  <th scope="col" className={`${th} text-right`}>Close%</th>
                  <th scope="col" className={`${th} text-right`}>Avg Deal</th>
                  <th scope="col" className={`${th} text-right`}>$/Call</th>
                  <th scope="col" className={`${th} text-center`}>Rating</th>
                  <th scope="col" className={th}>Top Objection</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((rep) => (
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
                    <td className={`${tdNum} text-center ${rep.avgRating >= 7 ? "text-brand-positive" : rep.avgRating >= 5 ? "text-brand-textSecondary" : "text-brand-negative"}`}>{rep.avgRating || "\u2014"}</td>
                    <td className={`${td} text-brand-textMuted text-xs max-w-[150px] truncate`} title={rep.topObjection}>{rep.topObjection}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <ObjectionPanel entries={filtered} />
        </>
      )}
    </div>
  );
}
