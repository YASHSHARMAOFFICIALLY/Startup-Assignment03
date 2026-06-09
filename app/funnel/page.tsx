export const dynamic = "force-dynamic";

import { resolvePeriod, type PeriodKey } from "@/lib/period";
import { readAllRecords } from "@/lib/api-utils";
import { readSettings } from "@/lib/settings";
import { Panel } from "@/components/ui/panel";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { FunnelBar } from "@/components/ui/funnel-bar";

const pct = (a: number, b: number) =>
  b > 0 ? Math.round((a / b) * 100) : 0;

export default async function FunnelPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; offerId?: string }>;
}) {
  let records: Awaited<ReturnType<typeof readAllRecords>>;
  let period: PeriodKey;

  try {
    const params = await searchParams;
    const [rec, settings] = await Promise.all([
      readAllRecords(params.offerId || undefined),
      readSettings(),
    ]);
    records = rec;
    period = (params.period as PeriodKey) || (settings.defaultPeriod as PeriodKey);
  } catch (e) {
    console.error("[SalesIO] Funnel failed:", e);
    return (
      <div className="p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 flex flex-col gap-6">
        <PageHeader title="Unified Funnel" subtitle="Full setter → closer pipeline." />
        <EmptyState title="Failed to load" description="Could not load funnel data. Please try refreshing." />
      </div>
    );
  }

  const hasData =
    records.closer.length > 0 ||
    records.phone.length > 0 ||
    records.dm.length > 0;

  if (!hasData) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 flex flex-col gap-6">
        <PageHeader
          title="Unified Funnel"
          subtitle="Full setter → closer pipeline."
        />
        <EmptyState
          title="No data"
          description="Sync an offer to see the full funnel."
        />
      </div>
    );
  }

  const range = resolvePeriod(period, null, null, new Date());
  const inRange = (d: string) =>
    (range.from === null || d >= range.from) &&
    (range.to === null || d <= range.to);

  // Filter by period
  const closer = records.closer.filter((r) => inRange(r.date));
  const phone = records.phone.filter((r) => inRange(r.date));
  const dm = records.dm.filter((r) => inRange(r.date));

  // Setter totals
  const phoneDials = phone.reduce((s, r) => s + r.dials, 0);
  const phonePickups = phone.reduce((s, r) => s + r.pickups, 0);
  const phoneQConvos = phone.reduce((s, r) => s + r.qConvos, 0);
  const phoneBooked = phone.reduce((s, r) => s + r.booked, 0);
  const phoneShows = phone.reduce((s, r) => s + r.shows, 0);

  const dmConvos = dm.reduce((s, r) => s + r.convos, 0);
  const dmFollowUps = dm.reduce((s, r) => s + r.followUps, 0);
  const dmBooked = dm.reduce((s, r) => s + r.booked, 0);
  const dmLive = dm.reduce((s, r) => s + r.liveCalls, 0);

  const totalSetterShows = phoneShows + dmLive;
  const totalSetterBooked = phoneBooked + dmBooked;

  // Closer totals
  const closerCalls = closer.reduce((s, r) => s + r.totalCalls, 0);
  const closerLive = closer.reduce((s, r) => s + r.liveCalls, 0);
  const closerOffers = closer.reduce((s, r) => s + r.offers, 0);
  const closerClosed = closer.reduce((s, r) => s + r.dealsClosed, 0);
  const closerCash = closer.reduce((s, r) => s + r.cash, 0);

  // Handoff seam: setter shows → closer total calls
  const handoffRate = pct(closerCalls, totalSetterShows);

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 flex flex-col gap-6">
      <PageHeader
        title="Unified Funnel"
        subtitle="Full setter → closer pipeline. See where leads leak."
      />

      {/* End-to-end summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-stagger-1">
        <div>
          <div className="text-xs text-brand-textFaint mb-1">
            Total Leads In
          </div>
          <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">
            {(phoneDials + dmConvos).toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-xs text-brand-textFaint mb-1">Booked</div>
          <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">
            {totalSetterBooked}
          </div>
        </div>
        <div>
          <div className="text-xs text-brand-textFaint mb-1">Deals Closed</div>
          <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">
            {closerClosed}
          </div>
        </div>
        <div>
          <div className="text-xs text-brand-textFaint mb-1">
            End-to-End Rate
          </div>
          <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">
            {pct(closerClosed, phoneDials + dmConvos)}%
          </div>
        </div>
      </div>

      {/* Phone setter funnel */}
      {phone.length > 0 && (
        <Panel className="animate-stagger-2">
          <h3 className="text-xs font-medium text-brand-textFaint uppercase tracking-wider mb-3">
            Phone Setter Pipeline
          </h3>
          <FunnelBar
            stages={[
              { label: "Dials", value: phoneDials },
              { label: "Pickups", value: phonePickups },
              { label: "Q Convos", value: phoneQConvos },
              { label: "Booked", value: phoneBooked },
              { label: "Shows", value: phoneShows },
            ]}
          />
        </Panel>
      )}

      {/* DM setter funnel */}
      {dm.length > 0 && (
        <Panel className="animate-stagger-3">
          <h3 className="text-xs font-medium text-brand-textFaint uppercase tracking-wider mb-3">
            DM Setter Pipeline
          </h3>
          <FunnelBar
            stages={[
              { label: "Convos", value: dmConvos },
              { label: "Follow-Ups", value: dmFollowUps },
              { label: "Booked", value: dmBooked },
              { label: "Live Calls", value: dmLive },
            ]}
          />
        </Panel>
      )}

      {/* Handoff seam */}
      <Panel className="animate-stagger-4 border-brand-accent/20 bg-brand-accent/[0.02]">
        <h3 className="text-xs font-medium text-brand-accent uppercase tracking-wider mb-3">
          Handoff: Setter → Closer
        </h3>
        <div className="flex items-center gap-6">
          <div>
            <div className="text-xs text-brand-textFaint mb-1">
              Setter Shows
            </div>
            <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">
              {totalSetterShows}
            </div>
          </div>
          <div className="text-2xl text-brand-accent">→</div>
          <div>
            <div className="text-xs text-brand-textFaint mb-1">
              Closer Calls
            </div>
            <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">
              {closerCalls}
            </div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-xs text-brand-textFaint mb-1">
              Handoff Rate
            </div>
            <div
              className={`text-lg font-semibold tabular-nums ${handoffRate >= 80 ? "text-brand-positive" : handoffRate >= 50 ? "text-brand-accent" : "text-brand-negative"}`}
            >
              {handoffRate}%
            </div>
          </div>
        </div>
        <p className="text-[11px] text-brand-textFaint mt-3">
          Shows that convert to closer calendar calls. A gap here means booked
          calls are leaking before the closer dials.
        </p>
      </Panel>

      {/* Closer funnel */}
      {closer.length > 0 && (
        <Panel className="animate-stagger-5">
          <h3 className="text-xs font-medium text-brand-textFaint uppercase tracking-wider mb-3">
            Closer Pipeline
          </h3>
          <FunnelBar
            stages={[
              { label: "Total Calls", value: closerCalls },
              { label: "Live", value: closerLive },
              { label: "Offers", value: closerOffers },
              { label: "Closed", value: closerClosed },
            ]}
          />
          <div className="mt-3 text-right">
            <span className="text-xs text-brand-textFaint">Cash: </span>
            <span className="text-sm font-semibold text-brand-accent tabular-nums">
              ${closerCash.toLocaleString()}
            </span>
          </div>
        </Panel>
      )}
    </div>
  );
}
