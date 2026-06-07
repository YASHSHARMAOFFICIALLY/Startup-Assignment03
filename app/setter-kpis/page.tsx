export const dynamic = "force-dynamic";

import { resolvePeriod, type PeriodKey } from "@/lib/period";
import { readAllRecords } from "@/lib/api-utils";
import type { PhoneRecord, DmRecord } from "@/lib/sheet-sync";
import { fmtCurrency } from "@/lib/formatters";
import { th, td, tdNum, trHover } from "@/lib/table-styles";
import { Panel } from "@/components/ui/panel";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

function inRange(d: string, from: string | null, to: string | null) {
  return (from === null || d >= from) && (to === null || d <= to);
}

function buildPhoneStats(records: PhoneRecord[]) {
  const byRep = new Map<string, { hours: number; dials: number; pickups: number; qConvos: number; booked: number; shows: number; noShows: number; closed: number; revenue: number; cash: number }>();
  for (const r of records) {
    if (!r.name) continue;
    const cur = byRep.get(r.name) ?? { hours: 0, dials: 0, pickups: 0, qConvos: 0, booked: 0, shows: 0, noShows: 0, closed: 0, revenue: 0, cash: 0 };
    cur.hours += r.hoursWorked; cur.dials += r.dials; cur.pickups += r.pickups;
    cur.qConvos += r.qConvos; cur.booked += r.booked; cur.shows += r.shows;
    cur.noShows += r.noShows; cur.closed += r.closed; cur.revenue += r.revenue; cur.cash += r.cash;
    byRep.set(r.name, cur);
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

function buildDmStats(records: DmRecord[]) {
  const byRep = new Map<string, { convos: number; swipeUps: number; followUps: number; booked: number; liveCalls: number; setsClosed: number; revenue: number; cash: number }>();
  for (const r of records) {
    if (!r.name) continue;
    const cur = byRep.get(r.name) ?? { convos: 0, swipeUps: 0, followUps: 0, booked: 0, liveCalls: 0, setsClosed: 0, revenue: 0, cash: 0 };
    cur.convos += r.convos; cur.swipeUps += r.swipeUps; cur.followUps += r.followUps;
    cur.booked += r.booked; cur.liveCalls += r.liveCalls; cur.setsClosed += r.setsClosed;
    cur.revenue += r.revenue; cur.cash += r.cash;
    byRep.set(r.name, cur);
  }
  return Array.from(byRep.entries())
    .map(([name, v]) => ({
      name, ...v,
      bookRate: pct(v.booked, v.convos),
      showRate: pct(v.liveCalls, v.booked),
    }))
    .sort((a, b) => b.booked - a.booked);
}

export default async function SetterKpisPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const period = ((await searchParams).period as PeriodKey) || "last-month";
  const records = await readAllRecords();
  const range = resolvePeriod(period, null, null, new Date());
  const phone = records.phone.filter((r) => inRange(r.date, range.from, range.to));
  const dm = records.dm.filter((r) => inRange(r.date, range.from, range.to));
  const phoneStats = buildPhoneStats(phone);
  const dmStats = buildDmStats(dm);
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 flex flex-col gap-6">
      <PageHeader
        title="Setter KPIs"
        subtitle="Phone and DM setter performance breakdown."
        badge={!hasData ? <span className="text-brand-accent text-xs">(no data for this period)</span> : undefined}
      />

      {/* Phone Setters */}
      <Panel className="animate-stagger-2">
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
                      <td className={`${td} font-medium text-brand-textSecondary`}>{rep.name}</td>
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
      </Panel>

      {/* DM Setters */}
      <Panel className="animate-stagger-3">
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
                      <td className={`${td} font-medium text-brand-textSecondary`}>{rep.name}</td>
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
      </Panel>
    </div>
  );
}
