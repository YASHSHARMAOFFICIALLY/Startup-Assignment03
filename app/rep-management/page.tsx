export const dynamic = "force-dynamic";

import { readAllRecords, readReps, buildAliasMap, buildNameToRepIdMap } from "@/lib/api-utils";
import { readSettings } from "@/lib/settings";
import { resolvePeriod, type PeriodKey } from "@/lib/period";
import { fmtCurrency } from "@/lib/formatters";
import { PageHeader } from "@/components/ui/page-header";
import { RepCrud } from "./_components/rep-crud";
import type { RecordsBundle } from "@/lib/sheet-sync";
import type { RepRow } from "@/lib/api-utils";

function getUnrecognizedNames(
  records: Awaited<ReturnType<typeof readAllRecords>>,
  aliasMap: Map<string, string>,
): string[] {
  const allNames = new Set<string>();
  for (const r of records.closer) if (r.name) allNames.add(r.name);
  for (const r of records.phone) if (r.name) allNames.add(r.name);
  for (const r of records.dm) if (r.name) allNames.add(r.name);

  const unrecognized: string[] = [];
  for (const name of allNames) {
    if (!aliasMap.has(name)) unrecognized.push(name);
  }
  return unrecognized.sort();
}

function computeLastActive(
  records: RecordsBundle,
  aliasMap: Map<string, string>,
  nameToRepId: Map<string, string>,
): Record<string, string> {
  const lastDate: Record<string, string> = {};
  const update = (rawName: string, date: string) => {
    const canon = aliasMap.get(rawName) ?? rawName;
    const repId = nameToRepId.get(canon);
    if (!repId) return;
    if (!lastDate[repId] || date > lastDate[repId]) lastDate[repId] = date;
  };
  for (const r of records.closer) if (r.name && r.date) update(r.name, r.date);
  for (const r of records.phone) if (r.name && r.date) update(r.name, r.date);
  for (const r of records.dm) if (r.name && r.date) update(r.name, r.date);
  return lastDate;
}

function computeHeadlines(
  records: RecordsBundle,
  reps: RepRow[],
  aliasMap: Map<string, string>,
  nameToRepId: Map<string, string>,
  from: string | null,
  to: string | null,
): Record<string, string> {
  const inRange = (d: string) =>
    (from === null || d >= from) && (to === null || d <= to);

  // per-repId: cash (closer) and callsSet (setter)
  const cash: Record<string, number> = {};
  const callsSet: Record<string, number> = {};

  for (const r of records.closer) {
    if (!r.name || !inRange(r.date)) continue;
    const canon = aliasMap.get(r.name) ?? r.name;
    const repId = nameToRepId.get(canon);
    if (!repId) continue;
    cash[repId] = (cash[repId] ?? 0) + r.cash;
  }
  for (const r of records.phone) {
    if (!r.name || !inRange(r.date)) continue;
    const canon = aliasMap.get(r.name) ?? r.name;
    const repId = nameToRepId.get(canon);
    if (!repId) continue;
    callsSet[repId] = (callsSet[repId] ?? 0) + r.booked;
  }
  for (const r of records.dm) {
    if (!r.name || !inRange(r.date)) continue;
    const canon = aliasMap.get(r.name) ?? r.name;
    const repId = nameToRepId.get(canon);
    if (!repId) continue;
    callsSet[repId] = (callsSet[repId] ?? 0) + r.booked;
  }

  const result: Record<string, string> = {};
  for (const rep of reps) {
    const isCloser = rep.roles.includes("closer");
    if (isCloser) {
      const val = cash[rep.id];
      result[rep.id] = val != null && val > 0 ? fmtCurrency(val) : "—";
    } else {
      const val = callsSet[rep.id];
      result[rep.id] = val != null && val > 0 ? `${val} set` : "—";
    }
  }
  return result;
}

export default async function RepManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ showArchived?: string; offerId?: string; period?: string; from?: string; to?: string }>;
}) {
  try {
    const params = await searchParams;
    const showArchived = params.showArchived === "true";

    const settings = await readSettings();
    const period = (params.period as PeriodKey) || (settings.defaultPeriod as PeriodKey);
    const range = resolvePeriod(period, params.from ?? null, params.to ?? null, new Date());

    const [reps, records, aliasMap, nameToRepId] = await Promise.all([
      readReps(),
      readAllRecords(params.offerId || undefined),
      buildAliasMap(),
      buildNameToRepIdMap(),
    ]);

    const unrecognized = getUnrecognizedNames(records, aliasMap);
    const currentMonth = new Date().toISOString().slice(0, 7);

    const lastActive = computeLastActive(records, aliasMap, nameToRepId);
    const headline = computeHeadlines(records, reps, aliasMap, nameToRepId, range.from, range.to);

    return (
      <div className="p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 flex flex-col gap-6">
        <PageHeader
          title="Rep Management"
          subtitle="Manage your team roster, aliases, and targets."
          badge={
            <span className="text-xs text-brand-textFaint">
              ({reps.filter((r) => r.status === "active").length} active)
            </span>
          }
        />
        <RepCrud
          initialReps={reps}
          unrecognizedNames={unrecognized}
          currentMonth={currentMonth}
          showArchived={showArchived}
          lastActive={lastActive}
          headline={headline}
          periodLabel={range.label}
        />
      </div>
    );
  } catch (e) {
    console.error("[SalesIO] Rep Management failed:", e);
    return (
      <div className="p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 flex flex-col gap-6">
        <PageHeader title="Rep Management" subtitle="Manage your team roster, aliases, and targets." />
        <div className="flex min-h-[30vh] flex-col items-center justify-center text-center">
          <h2 className="text-sm font-normal text-brand-textSecondary">Failed to load</h2>
          <p className="mt-0.5 max-w-sm text-[11px] text-brand-textFaint">Could not load rep data. Please try refreshing.</p>
        </div>
      </div>
    );
  }
}
