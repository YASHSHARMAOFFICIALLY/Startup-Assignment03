export const dynamic = "force-dynamic";

import Link from "next/link";
import { aggregate, priorRange } from "@/lib/sheet-sync";
import { resolvePeriod, type PeriodKey } from "@/lib/period";
import { readAllRecords, buildAliasMap, buildNameToRepIdMap } from "@/lib/api-utils";
import { readSettings } from "@/lib/settings";
import type { CloserRep, SetterRep } from "@/lib/types";
import { fmtCurrency, fmtCurrencyOrDash, fmtPercentOrDash, rankBadgeClass } from "@/lib/formatters";
import { th, td, tdNum, trHover } from "@/lib/table-styles";
import { Panel } from "@/components/ui/panel";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

/* ----------------------------- Sort helpers -------------------------------- */

type CloserSortKey = "cash" | "deals" | "closeRate" | "avgDeal";
type SetterSortKey = "callsSet" | "revenue";

const CLOSER_SORTS: { key: CloserSortKey; label: string }[] = [
  { key: "cash", label: "Cash" },
  { key: "deals", label: "Deals" },
  { key: "closeRate", label: "Close%" },
  { key: "avgDeal", label: "Avg Deal" },
];

const SETTER_SORTS: { key: SetterSortKey; label: string }[] = [
  { key: "callsSet", label: "Calls Set" },
  { key: "revenue", label: "Revenue" },
];

function sortClosers(reps: CloserRep[], by: CloserSortKey): CloserRep[] {
  const sorted = [...reps].sort((a, b) => {
    if (by === "cash") return b.cashCollected - a.cashCollected;
    if (by === "deals") return b.dealsClosed - a.dealsClosed;
    if (by === "closeRate") return (b.bookedToClose ?? 0) - (a.bookedToClose ?? 0);
    return (b.avgDealValue ?? 0) - (a.avgDealValue ?? 0);
  });
  return sorted.map((r, i) => ({ ...r, rank: i + 1 }));
}

function sortSetters(reps: SetterRep[], by: SetterSortKey): SetterRep[] {
  const sorted = [...reps].sort((a, b) => {
    if (by === "callsSet") return b.callsSet - a.callsSet;
    return b.revenueGenerated - a.revenueGenerated;
  });
  return sorted.map((r, i) => ({ ...r, rank: i + 1 }));
}

/* ----------------------------- Rank change -------------------------------- */

function rankChangeMap(reps: { name: string; rank: number }[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of reps) m.set(r.name, r.rank);
  return m;
}

function RankChange({ current, priorMap }: { current: { name: string; rank: number }; priorMap: Map<string, number> }) {
  const prior = priorMap.get(current.name);
  if (prior === undefined) {
    return <span className="text-[10px] font-medium text-brand-teal">NEW</span>;
  }
  const diff = prior - current.rank;
  if (diff > 0) return <span className="text-[10px] font-medium text-brand-positive">▲{diff}</span>;
  if (diff < 0) return <span className="text-[10px] font-medium text-brand-negative">▼{Math.abs(diff)}</span>;
  return <span className="text-[10px] text-brand-textFaint">—</span>;
}

/* ----------------------------- Most improved ------------------------------ */

function mostImproved(current: { name: string; rank: number }[], priorMap: Map<string, number>): string | null {
  let best: string | null = null;
  let bestDiff = 0;
  for (const r of current) {
    const prior = priorMap.get(r.name);
    if (prior === undefined) continue;
    const diff = prior - r.rank;
    if (diff > bestDiff) { bestDiff = diff; best = r.name; }
  }
  return bestDiff > 0 ? best : null;
}

/* ----------------------------- Metric toggle ------------------------------ */

function MetricToggle<K extends string>({
  options,
  active,
  paramName,
  searchParams,
}: {
  options: { key: K; label: string }[];
  active: K;
  paramName: string;
  searchParams: Record<string, string | undefined>;
}) {
  return (
    <div className="flex gap-1 mb-4">
      {options.map((o) => {
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(searchParams)) {
          if (v) params.set(k, v);
        }
        if (o.key === options[0].key) {
          params.delete(paramName);
        } else {
          params.set(paramName, o.key);
        }
        const href = `/leaderboard${params.toString() ? `?${params}` : ""}`;
        const isActive = o.key === active;
        return (
          <Link
            key={o.key}
            href={href}
            className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
              isActive
                ? "bg-brand-accent/15 text-brand-accent font-medium"
                : "text-brand-textFaint hover:text-brand-textSecondary"
            }`}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}

/* ----------------------------- Podium (Style C) --------------------------- */

function PodiumHero({
  reps,
  priorMap,
  formatValue,
}: {
  reps: { name: string; rank: number }[];
  priorMap: Map<string, number>;
  formatValue: (rep: (typeof reps)[number]) => string;
}) {
  const top3 = reps.slice(0, 3);
  if (top3.length === 0) return null;
  const first = top3[0];
  const rest = top3.slice(1);

  const medalColors = [
    { bg: "rgba(255,255,255,0.02)", badge: rankBadgeClass(1), text: "text-brand-gold" },
    { bg: "rgba(255,255,255,0.015)", badge: rankBadgeClass(2), text: "text-brand-silver" },
    { bg: "rgba(255,255,255,0.01)", badge: rankBadgeClass(3), text: "text-brand-bronze" },
  ];

  return (
    <div className="space-y-1.5 mb-5">
      {/* #1 — hero row */}
      <div
        className="flex items-center gap-3.5 p-4 rounded-xl"
        style={{ background: medalColors[0].bg }}
      >
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-semibold shrink-0 ${medalColors[0].badge}`}>
          1
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-normal text-brand-textPrimary truncate">{first.name}</div>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-lg font-light ${medalColors[0].text}`}>{formatValue(first)}</div>
          <RankChange current={first} priorMap={priorMap} />
        </div>
      </div>

      {/* #2, #3 — compact rows */}
      {rest.map((rep, i) => {
        const mi = i + 1;
        return (
          <div
            key={rep.name}
            className="flex items-center gap-3.5 px-4 py-2.5 rounded-lg"
            style={{ background: medalColors[mi].bg }}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 ${medalColors[mi].badge}`}>
              {rep.rank}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-normal text-brand-textSecondary truncate">{rep.name}</div>
            </div>
            <div className="text-right shrink-0">
              <div className={`text-[14px] font-light ${medalColors[mi].text}`}>{formatValue(rep)}</div>
              <RankChange current={rep} priorMap={priorMap} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ================================= PAGE =================================== */

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; closerSort?: string; setterSort?: string; offerId?: string }>;
}) {
  const params = await searchParams;
  const [records, aliasMap, nameToRepId, settings] = await Promise.all([readAllRecords(params.offerId || undefined), buildAliasMap(), buildNameToRepIdMap(), readSettings()]);
  const period = (params.period as PeriodKey) || (settings.defaultPeriod as PeriodKey);
  const closerSort = (CLOSER_SORTS.find((s) => s.key === params.closerSort)?.key ?? "cash") as CloserSortKey;
  const setterSort = (SETTER_SORTS.find((s) => s.key === params.setterSort)?.key ?? "callsSet") as SetterSortKey;
  const hasData = records.closer.length > 0 || records.phone.length > 0 || records.dm.length > 0;

  let closers: CloserRep[] = [];
  let setters: SetterRep[] = [];
  let priorClosers: CloserRep[] = [];
  let priorSetters: SetterRep[] = [];

  if (hasData) {
    const range = resolvePeriod(period, null, null, new Date());
    const data = aggregate(records, range.from, range.to, range.label, aliasMap, settings.commissionRate);
    closers = sortClosers(data.closers, closerSort);
    setters = sortSetters(data.setters, setterSort);

    // Prior period for rank-change
    const prev = priorRange(range.from, range.to);
    if (prev.from && prev.to) {
      const prevData = aggregate(records, prev.from, prev.to, "prior", aliasMap);
      priorClosers = sortClosers(prevData.closers, closerSort);
      priorSetters = sortSetters(prevData.setters, setterSort);
    }
  }

  const priorCloserMap = rankChangeMap(priorClosers);
  const priorSetterMap = rankChangeMap(priorSetters);
  const closerMostImproved = mostImproved(closers, priorCloserMap);
  const setterMostImproved = mostImproved(setters, priorSetterMap);

  const rawParams: Record<string, string | undefined> = { period: params.period, closerSort: params.closerSort, setterSort: params.setterSort };

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 flex flex-col gap-6">
      <PageHeader
        title="Leaderboard"
        subtitle="Full rep rankings by performance."
        badge={!hasData ? <span className="text-brand-accent text-xs">(no data — sync an offer first)</span> : undefined}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Closers */}
        <Panel className="animate-stagger-2">
          <h2 className="text-[10px] font-normal text-brand-textFaint uppercase tracking-[0.1em] mb-4">
            Closers
            <span className="ml-2 text-xs text-brand-textFaint font-normal">({closers.length} reps)</span>
          </h2>

          {closers.length === 0 ? (
            <EmptyState title="No data" description="No closer data for this period." />
          ) : (
            <>
              <PodiumHero
                reps={closers}
                priorMap={priorCloserMap}
                formatValue={(r) => fmtCurrency((r as CloserRep).cashCollected)}
              />

              {closerMostImproved && (
                <div className="mb-4 px-3 py-2 rounded-lg bg-brand-positive/5 border border-brand-positive/10 text-xs">
                  <span className="text-brand-positive font-medium">Most Improved:</span>{" "}
                  <span className="text-brand-textSecondary">{closerMostImproved}</span>
                </div>
              )}

              <MetricToggle options={CLOSER_SORTS} active={closerSort} paramName="closerSort" searchParams={rawParams} />

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th scope="col" className={th}>#</th>
                      <th scope="col" className={th}>Rep</th>
                      <th scope="col" className={`${th} text-right`}>Cash Collected</th>
                      <th scope="col" className={`${th} text-center`}>Deals</th>
                      <th scope="col" className={`${th} text-right`}>Close%</th>
                      <th scope="col" className={`${th} text-right`}>Avg Deal</th>
                      <th scope="col" className={`${th} text-center`}>Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closers.map((rep) => (
                      <tr key={rep.id} className={trHover}>
                        <td className={td}>
                          {rep.rank <= 3 ? (
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${rankBadgeClass(rep.rank)}`}>
                              {rep.rank}
                            </div>
                          ) : (
                            <span className="text-brand-textFaint ml-1">{rep.rank}</span>
                          )}
                        </td>
                        <td className={`${td} font-medium text-brand-textSecondary`}>
                          {nameToRepId.get(rep.name) ? (
                            <Link href={`/rep-management/${nameToRepId.get(rep.name)}`} className="hover:text-brand-accent transition-colors">{rep.name}</Link>
                          ) : rep.name}
                        </td>
                        <td className={`${tdNum} text-right text-brand-textPrimary`}>{fmtCurrency(rep.cashCollected)}</td>
                        <td className={`${tdNum} text-center text-brand-textSecondary`}>{rep.dealsClosed}</td>
                        <td className={`${tdNum} text-right text-brand-textSecondary`}>{fmtPercentOrDash(rep.bookedToClose)}</td>
                        <td className={`${tdNum} text-right text-brand-textSecondary`}>{fmtCurrencyOrDash(rep.avgDealValue)}</td>
                        <td className={`${td} text-center`}>
                          <RankChange current={rep} priorMap={priorCloserMap} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Panel>

        {/* Setters */}
        <Panel className="animate-stagger-3">
          <h2 className="text-[10px] font-normal text-brand-textFaint uppercase tracking-[0.1em] mb-4">
            Setters
            <span className="ml-2 text-xs text-brand-textFaint font-normal">({setters.length} reps)</span>
          </h2>

          {setters.length === 0 ? (
            <EmptyState title="No data" description="No setter data for this period." />
          ) : (
            <>
              <PodiumHero
                reps={setters}
                priorMap={priorSetterMap}
                formatValue={(r) => {
                  const s = r as SetterRep;
                  return setterSort === "revenue" ? fmtCurrency(s.revenueGenerated) : String(s.callsSet);
                }}
              />

              {setterMostImproved && (
                <div className="mb-4 px-3 py-2 rounded-lg bg-brand-positive/5 border border-brand-positive/10 text-xs">
                  <span className="text-brand-positive font-medium">Most Improved:</span>{" "}
                  <span className="text-brand-textSecondary">{setterMostImproved}</span>
                </div>
              )}

              <MetricToggle options={SETTER_SORTS} active={setterSort} paramName="setterSort" searchParams={rawParams} />

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th scope="col" className={th}>#</th>
                      <th scope="col" className={th}>Rep</th>
                      <th scope="col" className={`${th} text-center`}>Calls Set</th>
                      <th scope="col" className={`${th} text-right`}>Revenue Gen.</th>
                      <th scope="col" className={`${th} text-center`}>Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {setters.map((rep) => (
                      <tr key={rep.id} className={trHover}>
                        <td className={td}>
                          {rep.rank <= 3 ? (
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${rankBadgeClass(rep.rank)}`}>
                              {rep.rank}
                            </div>
                          ) : (
                            <span className="text-brand-textFaint ml-1">{rep.rank}</span>
                          )}
                        </td>
                        <td className={`${td} font-medium text-brand-textSecondary`}>
                          {nameToRepId.get(rep.name) ? (
                            <Link href={`/rep-management/${nameToRepId.get(rep.name)}`} className="hover:text-brand-accent transition-colors">{rep.name}</Link>
                          ) : rep.name}
                        </td>
                        <td className={`${tdNum} text-center text-brand-textPrimary`}>{rep.callsSet}</td>
                        <td className={`${tdNum} text-right text-brand-textPrimary`}>{fmtCurrency(rep.revenueGenerated)}</td>
                        <td className={`${td} text-center`}>
                          <RankChange current={rep} priorMap={priorSetterMap} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
