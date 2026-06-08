export const dynamic = "force-dynamic";

import { readAllRecords, readReps, buildAliasMap } from "@/lib/api-utils";
import { PageHeader } from "@/components/ui/page-header";
import { RepCrud } from "./_components/rep-crud";

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

export default async function RepManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ showArchived?: string }>;
}) {
  const params = await searchParams;
  const showArchived = params.showArchived === "true";

  const [reps, records, aliasMap] = await Promise.all([
    readReps(),
    readAllRecords(),
    buildAliasMap(),
  ]);

  const unrecognized = getUnrecognizedNames(records, aliasMap);
  const currentMonth = new Date().toISOString().slice(0, 7);

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
      />
    </div>
  );
}
