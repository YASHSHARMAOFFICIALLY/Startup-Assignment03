export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { readAllRecords, buildAliasMap } from "@/lib/api-utils";
import { readSettings } from "@/lib/settings";
import { aggregate, priorRange } from "@/lib/sheet-sync";
import { resolvePeriod, type PeriodKey } from "@/lib/period";
import { fmtCurrency } from "@/lib/formatters";
import { Panel } from "@/components/ui/panel";
import { PageHeader } from "@/components/ui/page-header";
import { FunnelBar } from "@/components/ui/funnel-bar";
import { ObjectionPanel } from "@/components/ui/objection-panel";
import { RepTrends } from "./_components/rep-trends";

const pct = (a: number, b: number) =>
  b > 0 ? Math.round((a / b) * 100) : 0;

const roleBadge: Record<string, string> = {
  closer: "bg-brand-accent/15 text-brand-accent",
  phone: "bg-brand-positive/15 text-brand-positive",
  dm: "bg-brand-purple/15 text-brand-purple",
};
const roleLabel: Record<string, string> = {
  closer: "Closer",
  phone: "Phone Setter",
  dm: "DM Setter",
};

function buildCumulativeTrend<T extends { date: string }>(
  recs: T[],
  pick: (r: T) => number,
): number[] {
  const byDay = new Map<string, number>();
  for (const r of recs) {
    byDay.set(r.date, (byDay.get(r.date) ?? 0) + pick(r));
  }
  const sorted = Array.from(byDay.keys()).sort();
  const result = [0];
  let cum = 0;
  for (const d of sorted) {
    cum += byDay.get(d)!;
    result.push(cum);
  }
  return result;
}

export default async function RepProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ repId: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { repId } = await params;
  const settings = await readSettings();
  const period = ((await searchParams).period as PeriodKey) || (settings.defaultPeriod as PeriodKey);

  const rep = await prisma.rep.findUnique({ where: { id: repId } });
  if (!rep) notFound();

  const targets = (rep.targets ?? {}) as Record<string, number>;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthTarget = targets[currentMonth];

  // Build alias set for this rep
  const aliasSet = new Set<string>();
  aliasSet.add(rep.displayName);
  for (const a of rep.aliases) aliasSet.add(a);

  const records = await readAllRecords();
  const range = resolvePeriod(period, null, null, new Date());
  const inRange = (d: string) =>
    (range.from === null || d >= range.from) &&
    (range.to === null || d <= range.to);

  // Filter records for this rep
  const closerRecs = records.closer.filter(
    (r) => aliasSet.has(r.name) && inRange(r.date),
  );
  const phoneRecs = records.phone.filter(
    (r) => aliasSet.has(r.name) && inRange(r.date),
  );
  const dmRecs = records.dm.filter(
    (r) => aliasSet.has(r.name) && inRange(r.date),
  );

  const hasCloser = closerRecs.length > 0;
  const hasPhone = phoneRecs.length > 0;
  const hasDm = dmRecs.length > 0;
  const hasData = hasCloser || hasPhone || hasDm;

  // --- Closer KPIs ---
  const cCalls = closerRecs.reduce((s, r) => s + r.totalCalls, 0);
  const cLive = closerRecs.reduce((s, r) => s + r.liveCalls, 0);
  const cOffers = closerRecs.reduce((s, r) => s + r.offers, 0);
  const cClosed = closerRecs.reduce((s, r) => s + r.dealsClosed, 0);
  const cCash = closerRecs.reduce((s, r) => s + r.cash, 0);
  const cRev = closerRecs.reduce((s, r) => s + r.revenue, 0);

  // --- Phone KPIs ---
  const pDials = phoneRecs.reduce((s, r) => s + r.dials, 0);
  const pPickups = phoneRecs.reduce((s, r) => s + r.pickups, 0);
  const pQConvos = phoneRecs.reduce((s, r) => s + r.qConvos, 0);
  const pBooked = phoneRecs.reduce((s, r) => s + r.booked, 0);
  const pShows = phoneRecs.reduce((s, r) => s + r.shows, 0);
  const pHours = phoneRecs.reduce((s, r) => s + r.hoursWorked, 0);

  // --- DM KPIs ---
  const dConvos = dmRecs.reduce((s, r) => s + r.convos, 0);
  const dFollowUps = dmRecs.reduce((s, r) => s + r.followUps, 0);
  const dBooked = dmRecs.reduce((s, r) => s + r.booked, 0);
  const dLive = dmRecs.reduce((s, r) => s + r.liveCalls, 0);
  const dRev = dmRecs.reduce((s, r) => s + r.revenue, 0);

  // --- Rank ---
  let rankInfo: string | null = null;
  if (hasData) {
    const aliasMap = await buildAliasMap();
    const data = aggregate(
      records,
      range.from,
      range.to,
      range.label,
      aliasMap,
    );
    const prev = priorRange(range.from, range.to);

    if (hasCloser) {
      const idx = data.closers.findIndex((c) => c.name === rep.displayName);
      if (idx >= 0) {
        const rank = data.closers[idx].rank;
        let change = "";
        if (prev.from && prev.to) {
          const prevData = aggregate(
            records,
            prev.from,
            prev.to,
            "prior",
            aliasMap,
          );
          const prevIdx = prevData.closers.findIndex(
            (c) => c.name === rep.displayName,
          );
          if (prevIdx >= 0) {
            const diff = prevData.closers[prevIdx].rank - rank;
            if (diff > 0) change = ` (▲${diff})`;
            else if (diff < 0) change = ` (▼${Math.abs(diff)})`;
          }
        }
        rankInfo = `#${rank} of ${data.closers.length} closers by cash${change}`;
      }
    } else if (hasPhone || hasDm) {
      const idx = data.setters.findIndex((s) => s.name === rep.displayName);
      if (idx >= 0) {
        const rank = data.setters[idx].rank;
        let change = "";
        if (prev.from && prev.to) {
          const prevData = aggregate(
            records,
            prev.from,
            prev.to,
            "prior",
            aliasMap,
          );
          const prevIdx = prevData.setters.findIndex(
            (s) => s.name === rep.displayName,
          );
          if (prevIdx >= 0) {
            const diff = prevData.setters[prevIdx].rank - rank;
            if (diff > 0) change = ` (▲${diff})`;
            else if (diff < 0) change = ` (▼${Math.abs(diff)})`;
          }
        }
        rankInfo = `#${rank} of ${data.setters.length} setters by calls${change}`;
      }
    }
  }

  // --- Trends ---
  const trends: { label: string; data: number[]; color?: string }[] = [];
  if (hasCloser) {
    trends.push({
      label: "Cash (cumulative)",
      data: buildCumulativeTrend(closerRecs, (r) => r.cash),
    });
    trends.push({
      label: "Deals (cumulative)",
      data: buildCumulativeTrend(closerRecs, (r) => r.dealsClosed),
      color: "#22C55E",
    });
  }
  if (hasPhone) {
    trends.push({
      label: "Booked (cumulative)",
      data: buildCumulativeTrend(phoneRecs, (r) => r.booked),
    });
    trends.push({
      label: "Revenue (cumulative)",
      data: buildCumulativeTrend(phoneRecs, (r) => r.revenue),
      color: "#22C55E",
    });
  }
  if (hasDm) {
    trends.push({
      label: "DM Booked (cumulative)",
      data: buildCumulativeTrend(dmRecs, (r) => r.booked),
    });
    trends.push({
      label: "DM Revenue (cumulative)",
      data: buildCumulativeTrend(dmRecs, (r) => r.revenue),
      color: "#22C55E",
    });
  }

  // --- Target progress ---
  let targetProgress: number | null = null;
  let targetCurrent = 0;
  if (monthTarget) {
    if (hasCloser) targetCurrent = cCash;
    else targetCurrent = pBooked + dBooked;
    targetProgress = Math.min(
      Math.round((targetCurrent / monthTarget) * 100),
      100,
    );
  }

  // --- Objection entries ---
  const objectionEntries = [...closerRecs, ...phoneRecs, ...dmRecs];

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 flex flex-col gap-6">
      {/* Header */}
      <div>
        <Link
          href="/rep-management"
          className="inline-flex items-center gap-1.5 text-xs text-brand-textFaint hover:text-brand-textSecondary transition-colors mb-3"
        >
          <ArrowLeft size={12} /> Back to roster
        </Link>
        <PageHeader
          title={rep.displayName}
          subtitle={rankInfo ?? "No ranking data for this period."}
          badge={
            <div className="flex gap-1.5">
              {rep.roles.map((r) => (
                <span
                  key={r}
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${roleBadge[r] ?? "text-brand-textFaint"}`}
                >
                  {roleLabel[r] ?? r}
                </span>
              ))}
              {rep.status === "archived" && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-brand-textFaint/15 text-brand-textFaint">
                  archived
                </span>
              )}
            </div>
          }
        />
      </div>

      {/* Target progress */}
      {monthTarget != null && targetProgress != null && (
        <Panel className="animate-stagger-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-brand-textFaint">
              {new Date(currentMonth + "-01").toLocaleDateString(undefined, {
                month: "long",
              })}{" "}
              Target
            </span>
            <span className="text-xs text-brand-textSecondary tabular-nums">
              {hasCloser ? fmtCurrency(targetCurrent) : targetCurrent} /{" "}
              {hasCloser ? fmtCurrency(monthTarget) : monthTarget}
            </span>
          </div>
          <div className="h-2 rounded-full bg-brand-elevated overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-accent transition-all"
              style={{ width: `${targetProgress}%` }}
            />
          </div>
          <div className="text-right mt-1">
            <span
              className={`text-[11px] font-medium ${targetProgress >= 100 ? "text-brand-positive" : "text-brand-textMuted"}`}
            >
              {targetProgress}%
            </span>
          </div>
        </Panel>
      )}

      {!hasData ? (
        <Panel>
          <div className="text-center py-8 text-sm text-brand-textMuted">
            No records found for this rep in the selected period.
          </div>
        </Panel>
      ) : (
        <>
          {/* Hero KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 animate-stagger-2">
            {hasCloser && (
              <>
                <div>
                  <div className="text-xs text-brand-textFaint mb-1">Cash</div>
                  <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">
                    {fmtCurrency(cCash)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-brand-textFaint mb-1">
                    Revenue
                  </div>
                  <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">
                    {fmtCurrency(cRev)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-brand-textFaint mb-1">
                    Deals
                  </div>
                  <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">
                    {cClosed}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-brand-textFaint mb-1">
                    Close%
                  </div>
                  <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">
                    {pct(cClosed, cCalls)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-brand-textFaint mb-1">
                    Avg Deal
                  </div>
                  <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">
                    {cClosed > 0
                      ? fmtCurrency(Math.round(cCash / cClosed))
                      : "\u2014"}
                  </div>
                </div>
              </>
            )}
            {hasPhone && (
              <>
                <div>
                  <div className="text-xs text-brand-textFaint mb-1">
                    Booked
                  </div>
                  <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">
                    {pBooked}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-brand-textFaint mb-1">
                    Shows
                  </div>
                  <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">
                    {pShows}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-brand-textFaint mb-1">Set%</div>
                  <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">
                    {pct(pBooked, pQConvos)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-brand-textFaint mb-1">
                    Show%
                  </div>
                  <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">
                    {pct(pShows, pBooked)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-brand-textFaint mb-1">
                    Dials/Hr
                  </div>
                  <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">
                    {pHours > 0 ? Math.round(pDials / pHours) : "\u2014"}
                  </div>
                </div>
              </>
            )}
            {hasDm && (
              <>
                <div>
                  <div className="text-xs text-brand-textFaint mb-1">
                    DM Booked
                  </div>
                  <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">
                    {dBooked}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-brand-textFaint mb-1">
                    Live Calls
                  </div>
                  <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">
                    {dLive}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-brand-textFaint mb-1">
                    Book%
                  </div>
                  <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">
                    {pct(dBooked, dConvos)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-brand-textFaint mb-1">
                    Show%
                  </div>
                  <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">
                    {pct(dLive, dBooked)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-brand-textFaint mb-1">
                    Revenue
                  </div>
                  <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">
                    {fmtCurrency(dRev)}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Personal funnel */}
          <Panel className="animate-stagger-3">
            <h3 className="text-xs font-medium text-brand-textFaint uppercase tracking-wider mb-3">
              Funnel
            </h3>
            {hasCloser && (
              <FunnelBar
                stages={[
                  { label: "Total Calls", value: cCalls },
                  { label: "Live", value: cLive },
                  { label: "Offers", value: cOffers },
                  { label: "Closed", value: cClosed },
                ]}
              />
            )}
            {hasPhone && (
              <div className={hasCloser ? "mt-4" : ""}>
                <FunnelBar
                  stages={[
                    { label: "Dials", value: pDials },
                    { label: "Pickups", value: pPickups },
                    { label: "Q Convos", value: pQConvos },
                    { label: "Booked", value: pBooked },
                    { label: "Shows", value: pShows },
                  ]}
                />
              </div>
            )}
            {hasDm && (
              <div className={hasCloser || hasPhone ? "mt-4" : ""}>
                <FunnelBar
                  stages={[
                    { label: "Convos", value: dConvos },
                    { label: "Follow-Ups", value: dFollowUps },
                    { label: "Booked", value: dBooked },
                    { label: "Live Calls", value: dLive },
                  ]}
                />
              </div>
            )}
          </Panel>

          {/* Trend sparklines */}
          <RepTrends trends={trends} />

          {/* Objections + Reflections */}
          <ObjectionPanel entries={objectionEntries} />
        </>
      )}
    </div>
  );
}
