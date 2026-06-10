export const dynamic = "force-dynamic";

import Link from "next/link";
import { resolvePeriod, type PeriodKey } from "@/lib/period";
import { readAllRecords, buildAliasMap, buildNameToRepIdMap } from "@/lib/api-utils";
import { readSettings } from "@/lib/settings";
import { getSessionUser } from "@/lib/session";
import type { PhoneRecord, DmRecord } from "@/lib/sheet-sync";
import { fmtCurrency } from "@/lib/formatters";
import { td, tdNum, trHover } from "@/lib/table-styles";
import { Panel } from "@/components/ui/panel";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { FunnelBar } from "@/components/ui/funnel-bar";
import { ObjectionPanel } from "@/components/ui/objection-panel";
import { SortableTh } from "@/components/ui/sortable-th";
import { parseSort, sortRows } from "@/lib/sort";

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
const fmt1 = (n: number) => n.toFixed(1);

function inRange(d: string, from: string | null, to: string | null) {
  return (from === null || d >= from) && (to === null || d <= to);
}

function buildPhoneStats(records: PhoneRecord[], aliasMap: Map<string, string>) {
  const byRep = new Map<string, { hours: number; dials: number; pickups: number; qConvos: number; booked: number; shows: number; noShows: number; closed: number; revenue: number; cash: number }>();
  for (const r of records) {
    if (!r.name) continue;
    const name = aliasMap.get(r.name) ?? r.name;
    const cur = byRep.get(name) ?? { hours: 0, dials: 0, pickups: 0, qConvos: 0, booked: 0, shows: 0, noShows: 0, closed: 0, revenue: 0, cash: 0 };
    cur.hours += r.hoursWorked; cur.dials += r.dials; cur.pickups += r.pickups;
    cur.qConvos += r.qConvos; cur.booked += r.booked; cur.shows += r.shows;
    cur.noShows += r.noShows; cur.closed += r.closed; cur.revenue += r.revenue; cur.cash += r.cash;
    byRep.set(name, cur);
  }
  return Array.from(byRep.entries())
    .map(([name, v]) => ({
      name, ...v,
      setRate: pct(v.booked, v.qConvos),
      showRate: pct(v.shows, v.booked),
      dialsPerHour: v.hours > 0 ? Math.round(v.dials / v.hours) : 0,
      dialsBkd: v.booked > 0 ? v.dials / v.booked : null as number | null,
      pickupPct: pct(v.pickups, v.dials),
      convosPerHr: v.hours > 0 ? v.qConvos / v.hours : null as number | null,
    }));
}

function buildDmStats(records: DmRecord[], aliasMap: Map<string, string>) {
  const byRep = new Map<string, { convos: number; swipeUps: number; followUps: number; booked: number; liveCalls: number; setsClosed: number; revenue: number; cash: number }>();
  for (const r of records) {
    if (!r.name) continue;
    const name = aliasMap.get(r.name) ?? r.name;
    const cur = byRep.get(name) ?? { convos: 0, swipeUps: 0, followUps: 0, booked: 0, liveCalls: 0, setsClosed: 0, revenue: 0, cash: 0 };
    cur.convos += r.convos; cur.swipeUps += r.swipeUps; cur.followUps += r.followUps;
    cur.booked += r.booked; cur.liveCalls += r.liveCalls; cur.setsClosed += r.setsClosed;
    cur.revenue += r.revenue; cur.cash += r.cash;
    byRep.set(name, cur);
  }
  return Array.from(byRep.entries())
    .map(([name, v]) => ({
      name, ...v,
      bookRate: pct(v.booked, v.convos),
      showRate: pct(v.liveCalls, v.booked),
    }));
}

const PHONE_SORT_FIELDS = ["name", "hours", "dials", "pickups", "qConvos", "booked", "shows", "setRate", "showRate", "dialsPerHour", "dialsBkd", "pickupPct", "convosPerHr", "revenue"];
const DM_SORT_FIELDS = ["name", "convos", "followUps", "booked", "liveCalls", "setsClosed", "bookRate", "showRate", "revenue"];

type Channel = "all" | "phone" | "dm";
const CHANNELS: { key: Channel; label: string }[] = [
  { key: "all", label: "Combined" },
  { key: "phone", label: "Phone" },
  { key: "dm", label: "DM" },
];

export default async function SetterKpisPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; channel?: string; offerId?: string; from?: string; to?: string; psort?: string; dsort?: string }>;
}) {
  let params: { period?: string; channel?: string; offerId?: string; from?: string; to?: string; psort?: string; dsort?: string };
  let phoneStats: ReturnType<typeof buildPhoneStats> = [];
  let dmStats: ReturnType<typeof buildDmStats> = [];
  let phone: PhoneRecord[] = [];
  let dm: DmRecord[] = [];
  let nameToRepId = new Map<string, string>();
  let channel: Channel = "all";
  let hasData = false;

  try {
    params = await searchParams;
    const [records, aliasMap, ntrId, settings, sessionUser] = await Promise.all([readAllRecords(params.offerId || undefined), buildAliasMap(), buildNameToRepIdMap(), readSettings(), getSessionUser()]);
    nameToRepId = ntrId;
    const period = (params.period as PeriodKey) || (settings.defaultPeriod as PeriodKey);
    channel = (CHANNELS.find((c) => c.key === params.channel)?.key ?? "all") as Channel;
    const from = params.from ?? null;
    const to = params.to ?? null;
    const range = resolvePeriod(period, from, to, new Date());
    phone = records.phone.filter((r) => inRange(r.date, range.from, range.to));
    dm = records.dm.filter((r) => inRange(r.date, range.from, range.to));
    const allPhoneStats = buildPhoneStats(phone, aliasMap);
    const allDmStats = buildDmStats(dm, aliasMap);

    // Regular users only see their own data
    if (sessionUser && sessionUser.role !== "manager") {
      const userName = sessionUser.name.toLowerCase();
      phoneStats = allPhoneStats.filter((s) => s.name.toLowerCase() === userName);
      dmStats = allDmStats.filter((s) => s.name.toLowerCase() === userName);
    } else {
      phoneStats = allPhoneStats;
      dmStats = allDmStats;
    }
    hasData = phone.length > 0 || dm.length > 0;
  } catch (e) {
    console.error("[SalesIO] Setter KPIs failed:", e);
    return (
      <div className="p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 flex flex-col gap-6">
        <PageHeader title="Setter KPIs" subtitle="Phone and DM setter performance breakdown." />
        <EmptyState title="Failed to load" description="Could not load setter data. Please try refreshing." />
      </div>
    );
  }

  params = params!;

  /* Sorting */
  const pSortRaw = params.psort;
  const dSortRaw = params.dsort;
  const { field: pField, dir: pDir } = parseSort(pSortRaw, PHONE_SORT_FIELDS, "-booked");
  const { field: dField, dir: dDir } = parseSort(dSortRaw, DM_SORT_FIELDS, "-booked");
  const sortedPhone = sortRows(phoneStats, pField, pDir);
  const sortedDm = sortRows(dmStats, dField, dDir);
  const pCurrentSort = `${pDir === -1 ? "-" : ""}${pField}`;
  const dCurrentSort = `${dDir === -1 ? "-" : ""}${dField}`;

  /* Shared query object for SortableTh (preserves all params except sort) */
  const baseQuery: Record<string, string> = {};
  if (params.period) baseQuery.period = params.period;
  if (params.channel) baseQuery.channel = params.channel;
  if (params.from) baseQuery.from = params.from;
  if (params.to) baseQuery.to = params.to;
  if (params.offerId) baseQuery.offerId = params.offerId;

  const phoneQuery = { ...baseQuery };
  if (pSortRaw) phoneQuery.psort = pSortRaw;
  // dsort preserved in phone headers
  if (dSortRaw) phoneQuery.dsort = dSortRaw;

  const dmQuery = { ...baseQuery };
  if (dSortRaw) dmQuery.dsort = dSortRaw;
  // psort preserved in dm headers
  if (pSortRaw) dmQuery.psort = pSortRaw;

  /* Phone summary aggregates — totals-weighted */
  const phoneTotalBooked = phoneStats.reduce((s, r) => s + r.booked, 0);
  const phoneTotalShows = phoneStats.reduce((s, r) => s + r.shows, 0);
  const phoneTotalQConvos = phoneStats.reduce((s, r) => s + r.qConvos, 0);
  const phoneSetPct = pct(phoneTotalBooked, phoneTotalQConvos);
  const phoneShowPct = pct(phoneTotalShows, phoneTotalBooked);
  const phoneTotalRevenue = phoneStats.reduce((s, r) => s + r.revenue, 0);
  const phoneTotalCash = phoneStats.reduce((s, r) => s + r.cash, 0);

  /* DM summary aggregates — totals-weighted */
  const dmTotalBooked = dmStats.reduce((s, r) => s + r.booked, 0);
  const dmTotalLive = dmStats.reduce((s, r) => s + r.liveCalls, 0);
  const dmTotalConvos = dmStats.reduce((s, r) => s + r.convos, 0);
  const dmTotalSwipeUps = dmStats.reduce((s, r) => s + r.swipeUps, 0);
  const dmBookPct = pct(dmTotalBooked, dmTotalConvos);
  const dmShowPct = pct(dmTotalLive, dmTotalBooked);
  const dmTotalRevenue = dmStats.reduce((s, r) => s + r.revenue, 0);
  const dmTotalCash = dmStats.reduce((s, r) => s + r.cash, 0);

  /* Combined aggregates */
  const combinedBooked = phoneTotalBooked + dmTotalBooked;
  const combinedShows = phoneTotalShows + dmTotalLive;
  const combinedConvos = phoneTotalQConvos + dmTotalConvos;
  const combinedSetPct = pct(combinedBooked, combinedConvos);
  const combinedShowPct = pct(combinedShows, combinedBooked);
  const combinedRevenue = phoneTotalRevenue + dmTotalRevenue;
  const combinedCash = phoneTotalCash + dmTotalCash;

  /* Funnel totals */
  const phoneFunnelDials = phoneStats.reduce((s, r) => s + r.dials, 0);
  const phoneFunnelPickups = phoneStats.reduce((s, r) => s + r.pickups, 0);
  const phoneFunnelQConvos = phoneTotalQConvos;
  const dmFunnelConvos = dmTotalConvos;
  const dmFunnelFollowUps = dmStats.reduce((s, r) => s + r.followUps, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 flex flex-col gap-6">
      <PageHeader
        title="Setter KPIs"
        subtitle="Phone and DM setter performance breakdown."
        badge={!hasData ? <span className="text-brand-accent text-xs">(no data for this period)</span> : undefined}
      />

      {/* Channel toggle */}
      <div className="flex gap-1">
        {CHANNELS.map((c) => {
          const p = new URLSearchParams();
          if (params.period) p.set("period", params.period);
          if (params.from) p.set("from", params.from);
          if (params.to) p.set("to", params.to);
          if (params.offerId) p.set("offerId", params.offerId);
          if (c.key !== "all") p.set("channel", c.key);
          const href = `/setter-kpis${p.toString() ? `?${p}` : ""}`;
          return (
            <Link
              key={c.key}
              href={href}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                c.key === channel
                  ? "bg-brand-accent/15 text-brand-accent font-medium"
                  : "text-brand-textFaint hover:text-brand-textSecondary"
              }`}
            >
              {c.label}
            </Link>
          );
        })}
      </div>

      {/* Combined hero tiles — only shown when channel === "all" */}
      {channel === "all" && hasData && (
        <Panel className="animate-stagger-1">
          <h2 className="text-[13px] font-medium text-brand-textSecondary mb-4">Combined</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <div className="text-xs text-brand-textFaint mb-1">Total Calls Set</div>
              <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{combinedBooked}</div>
            </div>
            <div>
              <div className="text-xs text-brand-textFaint mb-1">Total Shows</div>
              <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{combinedShows}</div>
            </div>
            <div>
              <div className="text-xs text-brand-textFaint mb-1">Set/Book%</div>
              <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{combinedSetPct}%</div>
            </div>
            <div>
              <div className="text-xs text-brand-textFaint mb-1">Show%</div>
              <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{combinedShowPct}%</div>
            </div>
            <div>
              <div className="text-xs text-brand-textFaint mb-1">Revenue</div>
              <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{fmtCurrency(combinedRevenue)}</div>
            </div>
            <div>
              <div className="text-xs text-brand-textFaint mb-1">Cash</div>
              <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{fmtCurrency(combinedCash)}</div>
            </div>
          </div>
        </Panel>
      )}

      {/* Phone Setters */}
      {(channel === "all" || channel === "phone") && <Panel className="animate-stagger-2">
        <h2 className="text-[13px] font-medium text-brand-textSecondary mb-4">
          Phone Setters
          <span className="ml-2 text-xs text-brand-textFaint font-normal">({phoneStats.length} reps)</span>
        </h2>

        {phoneStats.length === 0 ? (
          <EmptyState title="No data" description="No phone setter data for this period." />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 animate-stagger-2 mb-5">
              <div>
                <div className="text-xs text-brand-textFaint mb-1">Total Booked</div>
                <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{phoneTotalBooked}</div>
              </div>
              <div>
                <div className="text-xs text-brand-textFaint mb-1">Shows</div>
                <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{phoneTotalShows}</div>
              </div>
              <div>
                <div className="text-xs text-brand-textFaint mb-1">Set%</div>
                <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{phoneSetPct}%</div>
              </div>
              <div>
                <div className="text-xs text-brand-textFaint mb-1">Show%</div>
                <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{phoneShowPct}%</div>
              </div>
            </div>

            <div className="mb-5">
              <h3 className="text-xs font-medium text-brand-textFaint uppercase tracking-wider mb-3">Phone Funnel</h3>
              <FunnelBar stages={[
                { label: "Dials", value: phoneFunnelDials },
                { label: "Pickups", value: phoneFunnelPickups },
                { label: "Q Convos", value: phoneFunnelQConvos },
                { label: "Booked", value: phoneTotalBooked },
                { label: "Shows", value: phoneTotalShows },
              ]} />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr>
                    <SortableTh label="Rep" field="name" sort={pCurrentSort} basePath="/setter-kpis" query={{ ...phoneQuery }} paramName="psort" align="left" />
                    <SortableTh label="Hours" field="hours" sort={pCurrentSort} basePath="/setter-kpis" query={{ ...phoneQuery }} paramName="psort" align="center" />
                    <SortableTh label="Dials" field="dials" sort={pCurrentSort} basePath="/setter-kpis" query={{ ...phoneQuery }} paramName="psort" align="center" />
                    <SortableTh label="Pickups" field="pickups" sort={pCurrentSort} basePath="/setter-kpis" query={{ ...phoneQuery }} paramName="psort" align="center" />
                    <SortableTh label="Q Convos" field="qConvos" sort={pCurrentSort} basePath="/setter-kpis" query={{ ...phoneQuery }} paramName="psort" align="center" />
                    <SortableTh label="Booked" field="booked" sort={pCurrentSort} basePath="/setter-kpis" query={{ ...phoneQuery }} paramName="psort" align="center" />
                    <SortableTh label="Shows" field="shows" sort={pCurrentSort} basePath="/setter-kpis" query={{ ...phoneQuery }} paramName="psort" align="center" />
                    <SortableTh label="Set%" field="setRate" sort={pCurrentSort} basePath="/setter-kpis" query={{ ...phoneQuery }} paramName="psort" align="right" />
                    <SortableTh label="Show%" field="showRate" sort={pCurrentSort} basePath="/setter-kpis" query={{ ...phoneQuery }} paramName="psort" align="right" />
                    <SortableTh label="D/Hr" field="dialsPerHour" sort={pCurrentSort} basePath="/setter-kpis" query={{ ...phoneQuery }} paramName="psort" align="right" />
                    <SortableTh label="Dials/Bkd" field="dialsBkd" sort={pCurrentSort} basePath="/setter-kpis" query={{ ...phoneQuery }} paramName="psort" align="right" />
                    <SortableTh label="Pickup%" field="pickupPct" sort={pCurrentSort} basePath="/setter-kpis" query={{ ...phoneQuery }} paramName="psort" align="right" />
                    <SortableTh label="Convos/Hr" field="convosPerHr" sort={pCurrentSort} basePath="/setter-kpis" query={{ ...phoneQuery }} paramName="psort" align="right" />
                    <SortableTh label="Revenue" field="revenue" sort={pCurrentSort} basePath="/setter-kpis" query={{ ...phoneQuery }} paramName="psort" align="right" />
                  </tr>
                </thead>
                <tbody>
                  {sortedPhone.map((rep) => (
                    <tr key={rep.name} className={trHover}>
                      <td className={`${td} font-medium text-brand-textSecondary`}>
                        {nameToRepId.get(rep.name) ? (
                          <Link href={`/rep-management/${nameToRepId.get(rep.name)}`} className="hover:text-brand-accent transition-colors">{rep.name}</Link>
                        ) : rep.name}
                      </td>
                      <td className={`${tdNum} text-center text-brand-textFaint`}>{rep.hours}</td>
                      <td className={`${tdNum} text-center text-brand-textSecondary`}>{rep.dials}</td>
                      <td className={`${tdNum} text-center text-brand-textSecondary`}>{rep.pickups}</td>
                      <td className={`${tdNum} text-center text-brand-textSecondary`}>{rep.qConvos}</td>
                      <td className={`${tdNum} text-center text-brand-textPrimary`}>{rep.booked}</td>
                      <td className={`${tdNum} text-center text-brand-textSecondary`}>{rep.shows}</td>
                      <td className={`${tdNum} text-right text-brand-textSecondary`}>{rep.setRate}%</td>
                      <td className={`${tdNum} text-right ${rep.showRate >= 70 ? "text-brand-positive" : "text-brand-textSecondary"}`}>{rep.showRate}%</td>
                      <td className={`${tdNum} text-right text-brand-textMuted`}>{rep.dialsPerHour}</td>
                      <td className={`${tdNum} text-right text-brand-textMuted`}>{rep.dialsBkd !== null ? fmt1(rep.dialsBkd) : "—"}</td>
                      <td className={`${tdNum} text-right text-brand-textMuted`}>{rep.dials > 0 ? `${rep.pickupPct}%` : "—"}</td>
                      <td className={`${tdNum} text-right text-brand-textMuted`}>{rep.convosPerHr !== null ? fmt1(rep.convosPerHr) : "—"}</td>
                      <td className={`${tdNum} text-right text-brand-textPrimary`}>{fmtCurrency(rep.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>}

      {(channel === "all" || channel === "phone") && phoneStats.length > 0 && <ObjectionPanel entries={phone} title="Phone" />}

      {/* DM Setters */}
      {(channel === "all" || channel === "dm") && <Panel className="animate-stagger-3">
        <h2 className="text-[13px] font-medium text-brand-textSecondary mb-4">
          DM Setters
          <span className="ml-2 text-xs text-brand-textFaint font-normal">({dmStats.length} reps)</span>
        </h2>

        {dmStats.length === 0 ? (
          <EmptyState title="No data" description="No DM setter data for this period." />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 animate-stagger-2 mb-5">
              <div>
                <div className="text-xs text-brand-textFaint mb-1">Swipe-Ups</div>
                <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{dmTotalSwipeUps}</div>
              </div>
              <div>
                <div className="text-xs text-brand-textFaint mb-1">Total Booked</div>
                <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{dmTotalBooked}</div>
              </div>
              <div>
                <div className="text-xs text-brand-textFaint mb-1">Live Calls</div>
                <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{dmTotalLive}</div>
              </div>
              <div>
                <div className="text-xs text-brand-textFaint mb-1">Book%</div>
                <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{dmBookPct}%</div>
              </div>
              <div>
                <div className="text-xs text-brand-textFaint mb-1">Show%</div>
                <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{dmShowPct}%</div>
              </div>
            </div>

            <div className="mb-5">
              <h3 className="text-xs font-medium text-brand-textFaint uppercase tracking-wider mb-3">DM Funnel</h3>
              <FunnelBar stages={[
                { label: "Convos", value: dmFunnelConvos },
                { label: "Follow-Ups", value: dmFunnelFollowUps },
                { label: "Booked", value: dmTotalBooked },
                { label: "Live Calls", value: dmTotalLive },
              ]} />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px]">
                <thead>
                  <tr>
                    <SortableTh label="Rep" field="name" sort={dCurrentSort} basePath="/setter-kpis" query={{ ...dmQuery }} paramName="dsort" align="left" />
                    <SortableTh label="Convos" field="convos" sort={dCurrentSort} basePath="/setter-kpis" query={{ ...dmQuery }} paramName="dsort" align="center" />
                    <SortableTh label="Follow Ups" field="followUps" sort={dCurrentSort} basePath="/setter-kpis" query={{ ...dmQuery }} paramName="dsort" align="center" />
                    <SortableTh label="Booked" field="booked" sort={dCurrentSort} basePath="/setter-kpis" query={{ ...dmQuery }} paramName="dsort" align="center" />
                    <SortableTh label="Live Calls" field="liveCalls" sort={dCurrentSort} basePath="/setter-kpis" query={{ ...dmQuery }} paramName="dsort" align="center" />
                    <SortableTh label="Sets Closed" field="setsClosed" sort={dCurrentSort} basePath="/setter-kpis" query={{ ...dmQuery }} paramName="dsort" align="center" />
                    <SortableTh label="Book%" field="bookRate" sort={dCurrentSort} basePath="/setter-kpis" query={{ ...dmQuery }} paramName="dsort" align="right" />
                    <SortableTh label="Show%" field="showRate" sort={dCurrentSort} basePath="/setter-kpis" query={{ ...dmQuery }} paramName="dsort" align="right" />
                    <SortableTh label="Revenue" field="revenue" sort={dCurrentSort} basePath="/setter-kpis" query={{ ...dmQuery }} paramName="dsort" align="right" />
                  </tr>
                </thead>
                <tbody>
                  {sortedDm.map((rep) => (
                    <tr key={rep.name} className={trHover}>
                      <td className={`${td} font-medium text-brand-textSecondary`}>
                        {nameToRepId.get(rep.name) ? (
                          <Link href={`/rep-management/${nameToRepId.get(rep.name)}`} className="hover:text-brand-accent transition-colors">{rep.name}</Link>
                        ) : rep.name}
                      </td>
                      <td className={`${tdNum} text-center text-brand-textSecondary`}>{rep.convos}</td>
                      <td className={`${tdNum} text-center text-brand-textMuted`}>{rep.followUps}</td>
                      <td className={`${tdNum} text-center text-brand-textPrimary`}>{rep.booked}</td>
                      <td className={`${tdNum} text-center text-brand-textSecondary`}>{rep.liveCalls}</td>
                      <td className={`${tdNum} text-center text-brand-textSecondary`}>{rep.setsClosed}</td>
                      <td className={`${tdNum} text-right text-brand-textSecondary`}>{rep.bookRate}%</td>
                      <td className={`${tdNum} text-right ${rep.showRate >= 70 ? "text-brand-positive" : "text-brand-textSecondary"}`}>{rep.showRate}%</td>
                      <td className={`${tdNum} text-right text-brand-textPrimary`}>{fmtCurrency(rep.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>}

      {(channel === "all" || channel === "dm") && dmStats.length > 0 && <ObjectionPanel entries={dm} title="DM" />}
    </div>
  );
}
