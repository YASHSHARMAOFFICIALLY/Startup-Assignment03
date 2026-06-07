export const dynamic = "force-dynamic";

import { aggregate } from "@/lib/sheet-sync";
import { resolvePeriod, type PeriodKey } from "@/lib/period";
import { readAllRecords } from "@/lib/api-utils";
import { MOCK_DASHBOARD } from "@/lib/mock-data";
import { fmtCurrency, fmtCurrencyOrDash, fmtPercentOrDash, rankBadgeClass } from "@/lib/formatters";
import { th, td, tdNum, trHover } from "@/lib/table-styles";
import { Panel } from "@/components/ui/panel";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const period = ((await searchParams).period as PeriodKey) || "last-month";
  const records = await readAllRecords();
  const hasData = records.closer.length > 0 || records.phone.length > 0;

  const { closers, setters } = hasData
    ? (() => {
        const range = resolvePeriod(period, null, null, new Date());
        return aggregate(records, range.from, range.to, range.label);
      })()
    : MOCK_DASHBOARD;

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 flex flex-col gap-6">
      <PageHeader
        title="Leaderboard"
        subtitle="Full rep rankings by performance."
        badge={!hasData ? <span className="text-brand-accent text-xs">(demo data)</span> : undefined}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Closers */}
        <Panel className="animate-stagger-2">
          <h2 className="text-[15px] font-medium text-brand-textPrimary mb-4">
            Closers
            <span className="ml-2 text-xs text-brand-textFaint font-normal">({closers.length} reps)</span>
          </h2>

          {closers.length === 0 ? (
            <EmptyState title="No data" description="No closer data for this period." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th scope="col" className={th}>#</th>
                    <th scope="col" className={th}>Rep</th>
                    <th scope="col" className={`${th} text-right`}>Cash Collected</th>
                    <th scope="col" className={`${th} text-right`}>Booked&rarr;Close</th>
                    <th scope="col" className={`${th} text-right`}>Avg Deal</th>
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
                      <td className={`${td} font-medium text-brand-textSecondary`}>{rep.name}</td>
                      <td className={`${tdNum} text-right text-brand-textPrimary`}>{fmtCurrency(rep.cashCollected)}</td>
                      <td className={`${tdNum} text-right text-brand-textSecondary`}>{fmtPercentOrDash(rep.bookedToClose)}</td>
                      <td className={`${tdNum} text-right text-brand-textSecondary`}>{fmtCurrencyOrDash(rep.avgDealValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* Setters */}
        <Panel className="animate-stagger-3">
          <h2 className="text-[15px] font-medium text-brand-textPrimary mb-4">
            Setters
            <span className="ml-2 text-xs text-brand-textFaint font-normal">({setters.length} reps)</span>
          </h2>

          {setters.length === 0 ? (
            <EmptyState title="No data" description="No setter data for this period." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th scope="col" className={th}>#</th>
                    <th scope="col" className={th}>Rep</th>
                    <th scope="col" className={`${th} text-center`}>Calls Set</th>
                    <th scope="col" className={`${th} text-right`}>Revenue Gen.</th>
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
                      <td className={`${td} font-medium text-brand-textSecondary`}>{rep.name}</td>
                      <td className={`${tdNum} text-center text-brand-textPrimary`}>{rep.callsSet}</td>
                      <td className={`${tdNum} text-right text-brand-textPrimary`}>{fmtCurrency(rep.revenueGenerated)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
