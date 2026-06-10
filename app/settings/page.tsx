export const dynamic = "force-dynamic";

import Link from "next/link";
import { readOffers, readReps } from "@/lib/api-utils";
import { readSettings } from "@/lib/settings";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { fmtCurrency } from "@/lib/formatters";
import { Panel } from "@/components/ui/panel";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsForm } from "./_components/settings-form";
import { TeamManager } from "./_components/team-manager";
import { DataManagement } from "./_components/data-management";

export default async function SettingsPage() {
  const [settings, offers, sessionUser, reps] = await Promise.all([
    readSettings(),
    readOffers().catch(() => []),
    getSessionUser(),
    readReps().catch(() => []),
  ]);

  const isManager = sessionUser?.role === "manager";

  // Fetch team members for managers
  const teamUsers = isManager
    ? await prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }).then((users) => users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })))
    : [];

  const commissionOverrideCount = reps.filter(
    (r) => r.commissionRate != null,
  ).length;

  const currentMonth = new Date().toISOString().slice(0, 7);
  const activeReps = reps.filter((r) => r.status === "active");
  const repsWithTarget = activeReps.filter(
    (r) => r.targets[currentMonth] != null,
  );
  const repsWithoutTargetCount = activeReps.length - repsWithTarget.length;

  const offerCount = offers.length;
  const synced = offers
    .map((o) => o.lastSynced)
    .filter(Boolean)
    .sort()
    .reverse();
  const lastSync = synced[0] ?? null;

  const formatDate = (iso: string | null) => {
    if (!iso) return "Never";
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 flex flex-col gap-6 max-w-2xl">
      <PageHeader
        title="Settings"
        subtitle="Configure your Sales.io OS workspace."
      />

      {/* Profile */}
      <Panel className="animate-stagger-1">
        <h2 className="text-[15px] font-medium text-brand-textPrimary mb-4">
          Profile
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-brand-border/20">
            <span className="text-sm text-brand-textMuted">Display Name</span>
            <span className="text-sm text-brand-textPrimary font-medium">
              {sessionUser?.name || "—"}
            </span>
          </div>
          <p className="text-xs text-brand-textFaint">
            From your account. Managers can update names in Team below.
          </p>
        </div>
      </Panel>

      {/* Commission + Default Period + Auto-sync + Landing + Rows (client forms) */}
      <SettingsForm
        initialCommissionRate={settings.commissionRate}
        initialDefaultPeriod={settings.defaultPeriod}
        initialAutoSyncMode={settings.autoSyncMode}
        initialDefaultLandingPage={settings.defaultLandingPage}
        initialLeaderboardRows={settings.leaderboardRows}
        commissionOverrideCount={commissionOverrideCount}
      />

      {/* Team Members (manager only) */}
      {isManager && <TeamManager initialUsers={teamUsers} />}

      {/* Targets Summary */}
      <Panel className="animate-stagger-4">
        <h2 className="text-[15px] font-medium text-brand-textPrimary mb-4">
          Targets Summary
        </h2>
        <div className="space-y-3">
          {repsWithTarget.length === 0 ? (
            <p className="text-sm text-brand-textMuted">
              No active reps have a target for this month.
            </p>
          ) : (
            repsWithTarget.map((rep) => (
              <div
                key={rep.id}
                className="flex items-center justify-between py-2 border-b border-brand-border/20"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-brand-textPrimary font-medium">
                    {rep.displayName}
                  </span>
                  <span className="text-[11px] text-brand-textFaint">
                    {rep.roles.join(", ") || "no role"}
                  </span>
                </div>
                <span className="text-sm text-brand-textSecondary tabular-nums">
                  {rep.roles.includes("closer")
                    ? fmtCurrency(rep.targets[currentMonth])
                    : `${rep.targets[currentMonth]} calls`}
                </span>
              </div>
            ))
          )}
          {repsWithoutTargetCount > 0 && (
            <p className="text-xs text-brand-textFaint">
              {repsWithoutTargetCount} active{" "}
              {repsWithoutTargetCount === 1 ? "rep has" : "reps have"} no
              target this month.
            </p>
          )}
          <Link
            href="/rep-management"
            className="inline-block text-xs text-brand-textMuted underline underline-offset-2 hover:text-brand-textPrimary transition-colors"
          >
            Manage targets &rarr;
          </Link>
        </div>
      </Panel>

      {/* Data Management (manager only) */}
      {isManager && <DataManagement />}

      {/* Sync Status */}
      <Panel className="animate-stagger-4">
        <h2 className="text-[15px] font-medium text-brand-textPrimary mb-4">
          Sync Status
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-brand-border/20">
            <span className="text-sm text-brand-textMuted">
              Offers configured
            </span>
            <span className="text-sm text-brand-textPrimary font-medium">
              {offerCount}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-brand-border/20">
            <span className="text-sm text-brand-textMuted">Last sync</span>
            <span className="text-sm text-brand-textPrimary font-medium">
              {formatDate(lastSync)}
            </span>
          </div>
        </div>
      </Panel>

      {/* Sheet Format Guide */}
      <Panel className="animate-stagger-5">
        <h2 className="text-[15px] font-medium text-brand-textPrimary mb-4">
          Google Sheets Setup
        </h2>
        <div className="space-y-3 text-sm text-brand-textMuted">
          <p>Each offer connects to 3 Google Sheets tabs:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <span className="text-brand-textSecondary font-medium">
                Tally_Closer_Raw
              </span>{" "}
              — closer call logs
            </li>
            <li>
              <span className="text-brand-textSecondary font-medium">
                Tally_PhoneSetter_Raw
              </span>{" "}
              — phone setter logs
            </li>
            <li>
              <span className="text-brand-textSecondary font-medium">
                Tally_DMSetter_Raw
              </span>{" "}
              — DM setter logs
            </li>
          </ul>
          <p className="text-xs text-brand-textFaint mt-3">
            Sheets must be shared as &ldquo;Anyone with the link can
            view&rdquo; for sync to work.
          </p>
        </div>
      </Panel>
    </div>
  );
}
