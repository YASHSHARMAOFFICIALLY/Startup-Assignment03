export const dynamic = "force-dynamic";

import { readAllRecords } from "@/lib/api-utils";
import { fmtCurrency } from "@/lib/formatters";
import { th, td, tdNum, trHover } from "@/lib/table-styles";
import { Panel } from "@/components/ui/panel";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

type Rep = {
  name: string;
  role: "Closer" | "Phone Setter" | "DM Setter";
  records: number;
  revenue: number;
  cash: number;
};

function extractReps(records: Awaited<ReturnType<typeof readAllRecords>>): Rep[] {
  const repMap = new Map<string, Rep>();

  for (const r of records.closer) {
    if (!r.name) continue;
    const key = `${r.name}::Closer`;
    const cur = repMap.get(key) ?? { name: r.name, role: "Closer" as const, records: 0, revenue: 0, cash: 0 };
    cur.records++; cur.revenue += r.revenue; cur.cash += r.cash;
    repMap.set(key, cur);
  }
  for (const r of records.phone) {
    if (!r.name) continue;
    const key = `${r.name}::Phone Setter`;
    const cur = repMap.get(key) ?? { name: r.name, role: "Phone Setter" as const, records: 0, revenue: 0, cash: 0 };
    cur.records++; cur.revenue += r.revenue; cur.cash += r.cash;
    repMap.set(key, cur);
  }
  for (const r of records.dm) {
    if (!r.name) continue;
    const key = `${r.name}::DM Setter`;
    const cur = repMap.get(key) ?? { name: r.name, role: "DM Setter" as const, records: 0, revenue: 0, cash: 0 };
    cur.records++; cur.revenue += r.revenue; cur.cash += r.cash;
    repMap.set(key, cur);
  }

  return Array.from(repMap.values()).sort((a, b) => b.cash - a.cash);
}

const roleBadge: Record<Rep["role"], string> = {
  "Closer": "bg-brand-accent/15 text-brand-accent",
  "Phone Setter": "bg-brand-positive/15 text-brand-positive",
  "DM Setter": "bg-brand-purple/15 text-brand-purple",
};

export default async function RepManagementPage() {
  const records = await readAllRecords();
  const reps = extractReps(records);

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 flex flex-col gap-6">
      <PageHeader
        title="Rep Management"
        subtitle="All reps detected from synced data."
        badge={<span className="text-xs text-brand-textFaint">({reps.length} reps)</span>}
      />

      {reps.length === 0 ? (
        <EmptyState
          title="No reps found"
          description="Sync an offer to detect reps from sheet data."
        />
      ) : (
        <Panel className="animate-stagger-2 overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr>
                <th scope="col" className={th}>Name</th>
                <th scope="col" className={th}>Role</th>
                <th scope="col" className={`${th} text-center`}>Records</th>
                <th scope="col" className={`${th} text-right`}>Revenue</th>
                <th scope="col" className={`${th} text-right`}>Cash</th>
              </tr>
            </thead>
            <tbody>
              {reps.map((rep) => (
                <tr key={`${rep.name}-${rep.role}`} className={trHover}>
                  <td className={`${td} font-medium text-brand-textSecondary`}>{rep.name}</td>
                  <td className={td}>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${roleBadge[rep.role]}`}>
                      {rep.role}
                    </span>
                  </td>
                  <td className={`${tdNum} text-center text-brand-textMuted`}>{rep.records}</td>
                  <td className={`${tdNum} text-right text-brand-textSecondary`}>{fmtCurrency(rep.revenue)}</td>
                  <td className={`${tdNum} text-right text-brand-textPrimary font-medium`}>{fmtCurrency(rep.cash)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}
