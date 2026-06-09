export const dynamic = "force-dynamic";

import Link from "next/link";
import { aggregate, priorRange } from "@/lib/sheet-sync";
import { resolvePeriod, type PeriodKey } from "@/lib/period";
import { readAllRecords, buildAliasMap, buildNameToRepIdMap } from "@/lib/api-utils";
import { readSettings } from "@/lib/settings";
import type { CloserRep, SetterRep } from "@/lib/types";
import type { PhoneRecord } from "@/lib/sheet-sync";
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

/* ----------------------------- Setter phone stats ------------------------- */

type SetterPhoneStats = {
  name: string;
  dials: number;
  hours: number;
  dialsPerHour: number;
  booked: number;
  qConvos: number;
  setRate: number;
};

function buildSetterPhoneStats(
  phone: PhoneRecord[],
  aliasMap: Map<string, string>,
): SetterPhoneStats[] {
  const byRep = new Map<string, { dials: number; hours: number; booked: number; qConvos: number }>();
  for (const r of phone) {
    if (!r.name) continue;
    const name = aliasMap.get(r.name) ?? r.name;
    const cur = byRep.get(name) ?? { dials: 0, hours: 0, booked: 0, qConvos: 0 };
    cur.dials += r.dials;
    cur.hours += r.hoursWorked;
    cur.booked += r.booked;
    cur.qConvos += r.qConvos;
    byRep.set(name, cur);
  }
  return Array.from(byRep.entries())
    .map(([name, v]) => ({
      name,
      dials: v.dials,
      hours: v.hours,
      dialsPerHour: v.hours > 0 ? Math.round((v.dials / v.hours) * 10) / 10 : 0,
      booked: v.booked,
      qConvos: v.qConvos,
      setRate: v.qConvos > 0 ? Math.round((v.booked / v.qConvos) * 100) : 0,
    }));
}

/* ----------------------------- Setter card leaderboard --------------------- */

const MEDALS = ["🥇", "🥈", "🥉"];
const BAR_COLORS = ["bg-amber-500", "bg-neutral-400", "bg-lime-500"];

function SetterRankCard({
  rank,
  name,
  value,
  secondary,
  maxValue,
}: {
  rank: number;
  name: string;
  value: number;
  secondary: string;
  maxValue: number;
}) {
  const isFirst = rank === 1;
  const barWidth = maxValue > 0 ? Math.max((value / maxValue) * 100, 8) : 0;
  const barColor = BAR_COLORS[rank - 1] ?? "bg-neutral-500";

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        isFirst
          ? "bg-amber-500/10 border border-amber-500/30"
          : "bg-white/[0.03] border border-white/[0.04]"
      }`}
    >
      <span className="text-lg shrink-0">{MEDALS[rank - 1] ?? `${rank}`}</span>
      <span className="text-sm font-medium text-brand-textPrimary min-w-[80px]">{name}</span>
      <div className="flex-1 mx-2">
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={`h-full rounded-full ${barColor}`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>
      <span className="text-sm font-semibold text-brand-textPrimary tabular-nums shrink-0">
        {value.toLocaleString()}
      </span>
      <span className="text-xs text-brand-textFaint shrink-0 w-[70px] text-right">
        {secondary}
      </span>
    </div>
  );
}

function SetterCardLeaderboard({
  phoneStats,
  periodLabel,
}: {
  phoneStats: SetterPhoneStats[];
  periodLabel: string;
}) {
  const byDials = [...phoneStats].sort((a, b) => b.dials - a.dials).slice(0, 5);
  const byBooked = [...phoneStats].sort((a, b) => b.booked - a.booked).slice(0, 5);
  const maxDials = byDials[0]?.dials ?? 0;
  const maxBooked = byBooked[0]?.booked ?? 0;

  return (
    <div className="space-y-8">
      <div className="text-xs font-medium text-brand-textFaint uppercase tracking-wider">
        Setter Leaderboard — {periodLabel}
      </div>

      {/* Dials section */}
      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-sm">🏆</span>
          <span className="text-xs font-medium text-brand-textFaint uppercase tracking-wider">Dials</span>
        </div>
        <div className="space-y-1.5">
          {byDials.map((rep, i) => (
            <SetterRankCard
              key={rep.name}
              rank={i + 1}
              name={rep.name}
              value={rep.dials}
              secondary={`${rep.dialsPerHour} / hr`}
              maxValue={maxDials}
            />
          ))}
        </div>
      </div>

      {/* Calls Booked section */}
      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-sm">📅</span>
          <span className="text-xs font-medium text-brand-textFaint uppercase tracking-wider">Calls Booked</span>
        </div>
        <div className="space-y-1.5">
          {byBooked.map((rep, i) => (
            <SetterRankCard
              key={rep.name}
              rank={i + 1}
              name={rep.name}
              value={rep.booked}
              secondary={`${rep.setRate}% set rate`}
              maxValue={maxBooked}
            />
          ))}
        </div>
      </div>
    </div>
  );
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
          <div className={`text-lg font-semibold ${medalColors[0].text}`}>{formatValue(first)}</div>
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
              <div className={`text-[14px] font-semibold ${medalColors[mi].text}`}>{formatValue(rep)}</div>
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
  let closers: CloserRep[] = [];
  let setters: SetterRep[] = [];
  let priorClosers: CloserRep[] = [];
  let priorSetters: SetterRep[] = [];
  let phoneStats: SetterPhoneStats[] = [];
  let periodLabel = "Month to Date";
  let nameToRepId = new Map<string, string>();
  let rawParams: Record<string, string | undefined> = {};
  let closerSort: CloserSortKey = "cash";
  let setterSort: SetterSortKey = "callsSet";
  let hasData = false;

  try {
    const params = await searchParams;
    const [records, aliasMap, ntrId, settings] = await Promise.all([readAllRecords(params.offerId || undefined), buildAliasMap(), buildNameToRepIdMap(), readSettings()]);
    nameToRepId = ntrId;
    const period = (params.period as PeriodKey) || (settings.defaultPeriod as PeriodKey);
    closerSort = (CLOSER_SORTS.find((s) => s.key === params.closerSort)?.key ?? "cash") as CloserSortKey;
    setterSort = (SETTER_SORTS.find((s) => s.key === params.setterSort)?.key ?? "callsSet") as SetterSortKey;
    hasData = records.closer.length > 0 || records.phone.length > 0 || records.dm.length > 0;

    if (hasData) {
      const range = resolvePeriod(period, null, null, new Date());
      periodLabel = range.label;
      const data = aggregate(records, range.from, range.to, range.label, aliasMap, settings.commissionRate);
      closers = sortClosers(data.closers, closerSort);
      setters = sortSetters(data.setters, setterSort);

      // Build phone stats for setter card leaderboard
      const inRange = (d: string) => (range.from === null || d >= range.from) && (range.to === null || d <= range.to);
      const filteredPhone = records.phone.filter((r) => inRange(r.date));
      phoneStats = buildSetterPhoneStats(filteredPhone, aliasMap);

      const prev = priorRange(range.from, range.to);
      if (prev.from && prev.to) {
        const prevData = aggregate(records, prev.from, prev.to, "prior", aliasMap);
        priorClosers = sortClosers(prevData.closers, closerSort);
        priorSetters = sortSetters(prevData.setters, setterSort);
      }
    }

    rawParams = { period: params.period, closerSort: params.closerSort, setterSort: params.setterSort };
  } catch (e) {
    console.error("[SalesIO] Leaderboard failed:", e);
    return (
      <div className="p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 flex flex-col gap-6">
        <PageHeader title="Leaderboard" subtitle="Full rep rankings by performance." />
        <EmptyState title="Failed to load" description="Could not load leaderboard data. Please try refreshing." />
      </div>
    );
  }

  const priorCloserMap = rankChangeMap(priorClosers);
  const priorSetterMap = rankChangeMap(priorSetters);
  const closerMostImproved = mostImproved(closers, priorCloserMap);
  const setterMostImproved = mostImproved(setters, priorSetterMap);

  const totalDials = phoneStats.reduce((s, r) => s + r.dials, 0);
  const totalBooked = phoneStats.reduce((s, r) => s + r.booked, 0);
  const totalCash = closers.reduce((s, r) => s + r.cashCollected, 0);
  const totalDeals = closers.reduce((s, r) => s + r.dealsClosed, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 flex flex-col gap-6">
      <PageHeader
        title="Leaderboard"
        subtitle="Full rep rankings by performance."
        badge={!hasData ? <span className="text-brand-accent text-xs">(no data — sync an offer first)</span> : undefined}
      />

      {/* Top KPIs */}
      {hasData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-stagger-1">
          <div>
            <div className="text-xs text-brand-textFaint mb-1">Cash Collected</div>
            <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{fmtCurrency(totalCash)}</div>
          </div>
          <div>
            <div className="text-xs text-brand-textFaint mb-1">Deals Closed</div>
            <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{totalDeals}</div>
          </div>
          <div>
            <div className="text-xs text-brand-textFaint mb-1">Total Dials</div>
            <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{totalDials.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-brand-textFaint mb-1">Calls Booked</div>
            <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{totalBooked}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Closers */}
        <Panel className="animate-stagger-2">
          <h2 className="text-[13px] font-medium text-brand-textSecondary mb-4">
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

        {/* Setters — Card Leaderboard */}
        <Panel className="animate-stagger-3">
          {phoneStats.length === 0 ? (
            <EmptyState title="No data" description="No setter data for this period." />
          ) : (
            <SetterCardLeaderboard phoneStats={phoneStats} periodLabel={periodLabel} />
          )}
        </Panel>
      </div>
    </div>
  );
}
