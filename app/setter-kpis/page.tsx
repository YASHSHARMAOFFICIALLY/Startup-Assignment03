export const dynamic = "force-dynamic";

import Link from "next/link";
import { resolvePeriod, type PeriodKey } from "@/lib/period";
import { readAllRecords, buildAliasMap, buildNameToRepIdMap } from "@/lib/api-utils";
import type { PhoneRecord, DmRecord } from "@/lib/sheet-sync";
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
    }))
    .sort((a, b) => b.booked - a.booked);
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
    }))
    .sort((a, b) => b.booked - a.booked);
}

type Channel = "all" | "phone" | "dm";
const CHANNELS: { key: Channel; label: string }[] = [
  { key: "all", label: "All" },
  { key: "phone", label: "Phone" },
  { key: "dm", label: "DM" },
];

export default async function SetterKpisPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; channel?: string }>;
}) {
  const params = await searchParams;
  const period = (params.period as PeriodKey) || "last-month";
  const channel = (CHANNELS.find((c) => c.key === params.channel)?.key ?? "all") as Channel;
  const [records, aliasMap, nameToRepId] = await Promise.all([readAllRecords(), buildAliasMap(), buildNameToRepIdMap()]);
  const range = resolvePeriod(period, null, null, new Date());
  const phone = records.phone.filter((r) => inRange(r.date, range.from, range.to));
  const dm = records.dm.filter((r) => inRange(r.date, range.from, range.to));
  const phoneStats = buildPhoneStats(phone, aliasMap);
  const dmStats = buildDmStats(dm, aliasMap);
  const hasData = phone.length > 0 || dm.length > 0;

  /* Phone summary aggregates */
  const phoneTotalBooked = phoneStats.reduce((s, r) => s + r.booked, 0);
  const phoneTotalShows = phoneStats.reduce((s, r) => s + r.shows, 0);
  const phoneAvgSet = phoneStats.length > 0 ? Math.round(phoneStats.reduce((s, r) => s + r.setRate, 0) / phoneStats.length) : 0;
  const phoneAvgShow = phoneStats.length > 0 ? Math.round(phoneStats.reduce((s, r) => s + r.showRate, 0) / phoneStats.length) : 0;

  /* DM summary aggregates */
  const dmTotalBooked = dmStats.reduce((s, r) => s + r.booked, 0);
  const dmTotalLive = dmStats.reduce((s, r) => s + r.liveCalls, 0);
  const dmAvgBook = dmStats.length > 0 ? Math.round(dmStats.reduce((s, r) => s + r.bookRate, 0) / dmStats.length) : 0;
  const dmAvgShow = dmStats.length > 0 ? Math.round(dmStats.reduce((s, r) => s + r.showRate, 0) / dmStats.length) : 0;

  /* Funnel totals */
  const phoneFunnelDials = phoneStats.reduce((s, r) => s + r.dials, 0);
  const phoneFunnelPickups = phoneStats.reduce((s, r) => s + r.pickups, 0);
  const phoneFunnelQConvos = phoneStats.reduce((s, r) => s + r.qConvos, 0);
  const dmFunnelConvos = dmStats.reduce((s, r) => s + r.convos, 0);
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

      {/* Phone Setters */}
      {(channel === "all" || channel === "phone") && <Panel className="animate-stagger-2">
        <h2 className="text-[15px] font-medium text-brand-textPrimary mb-4">
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
                <div className="text-xs text-brand-textFaint mb-1">Avg Set%</div>
                <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{phoneAvgSet}%</div>
              </div>
              <div>
                <div className="text-xs text-brand-textFaint mb-1">Avg Show%</div>
                <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{phoneAvgShow}%</div>
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
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr>
                    <th scope="col" className={th}>Rep</th>
                    <th scope="col" className={`${th} text-center`}>Hours</th>
                    <th scope="col" className={`${th} text-center`}>Dials</th>
                    <th scope="col" className={`${th} text-center`}>Pickups</th>
                    <th scope="col" className={`${th} text-center`}>Q Convos</th>
                    <th scope="col" className={`${th} text-center`}>Booked</th>
                    <th scope="col" className={`${th} text-center`}>Shows</th>
                    <th scope="col" className={`${th} text-right`}>Set%</th>
                    <th scope="col" className={`${th} text-right`}>Show%</th>
                    <th scope="col" className={`${th} text-right`}>D/Hr</th>
                    <th scope="col" className={`${th} text-right`}>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {phoneStats.map((rep) => (
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
        <h2 className="text-[15px] font-medium text-brand-textPrimary mb-4">
          DM Setters
          <span className="ml-2 text-xs text-brand-textFaint font-normal">({dmStats.length} reps)</span>
        </h2>

        {dmStats.length === 0 ? (
          <EmptyState title="No data" description="No DM setter data for this period." />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 animate-stagger-2 mb-5">
              <div>
                <div className="text-xs text-brand-textFaint mb-1">Total Booked</div>
                <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{dmTotalBooked}</div>
              </div>
              <div>
                <div className="text-xs text-brand-textFaint mb-1">Live Calls</div>
                <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{dmTotalLive}</div>
              </div>
              <div>
                <div className="text-xs text-brand-textFaint mb-1">Avg Book%</div>
                <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{dmAvgBook}%</div>
              </div>
              <div>
                <div className="text-xs text-brand-textFaint mb-1">Avg Show%</div>
                <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{dmAvgShow}%</div>
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
                    <th scope="col" className={th}>Rep</th>
                    <th scope="col" className={`${th} text-center`}>Convos</th>
                    <th scope="col" className={`${th} text-center`}>Follow Ups</th>
                    <th scope="col" className={`${th} text-center`}>Booked</th>
                    <th scope="col" className={`${th} text-center`}>Live Calls</th>
                    <th scope="col" className={`${th} text-center`}>Sets Closed</th>
                    <th scope="col" className={`${th} text-right`}>Book%</th>
                    <th scope="col" className={`${th} text-right`}>Show%</th>
                    <th scope="col" className={`${th} text-right`}>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {dmStats.map((rep) => (
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
