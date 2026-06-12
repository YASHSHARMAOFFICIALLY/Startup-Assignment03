export const dynamic = "force-dynamic";

import { resolvePeriod, type PeriodKey } from "@/lib/period";
import { readAllRecords } from "@/lib/api-utils";
import { readSettings } from "@/lib/settings";
import { fmtCurrency } from "@/lib/formatters";
import { Panel } from "@/components/ui/panel";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

const pct = (a: number, b: number) =>
  b > 0 ? Math.round((a / b) * 100) : 0;

/* ─── Stage colors — full monochrome ────────────────────────────── */

const STAGE_COLORS = [
  { dot: "bg-brand-textFaint/40" },
  { dot: "bg-brand-textFaint/40" },
  { dot: "bg-brand-textFaint/40" },
  { dot: "bg-brand-textFaint/40" },
  { dot: "bg-brand-textFaint/40" },
];

/* ─── Funnel chart (smooth silver ribbon) ────────────────────────── */

function FunnelChart({ stages }: { stages: { label: string; value: number }[] }) {
  const max = Math.max(...stages.map((s) => s.value), 1);
  const w = 700;
  const h = 240;
  const midY = 105;
  const maxHalf = 80;
  const segW = w / stages.length;

  const heights = stages.map((s) => Math.max((s.value / max) * maxHalf, 5));
  const centers = stages.map((_, i) => i * segW + segW / 2);

  // Smooth ribbon mirrored around midY: flat at each stage center, S-curve between
  const curve = (x0: number, y0: number, x1: number, y1: number) => {
    const d = (x1 - x0) / 2;
    return `C${x0 + d},${y0} ${x1 - d},${y1} ${x1},${y1}`;
  };
  const top = [`M0,${midY - heights[0]}`, `L${centers[0]},${midY - heights[0]}`];
  const bottom: string[] = [];
  for (let i = 0; i < stages.length - 1; i++) {
    top.push(curve(centers[i], midY - heights[i], centers[i + 1], midY - heights[i + 1]));
    bottom.push(curve(centers[i + 1], midY + heights[i + 1], centers[i], midY + heights[i]));
  }
  const last = stages.length - 1;
  const ribbon = [
    ...top,
    `L${w},${midY - heights[last]}`,
    `L${w},${midY + heights[last]}`,
    `L${centers[last]},${midY + heights[last]}`,
    ...bottom.reverse(),
    `L${centers[0]},${midY + heights[0]}`,
    `L0,${midY + heights[0]}`,
    "Z",
  ].join(" ");

  // Conversion pills sit on the flow at each stage transition
  const pills = stages.slice(1).map((s, i) => ({
    rate: pct(s.value, stages[i].value),
    x: (centers[i] + centers[i + 1]) / 2,
  }));

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="ribbon" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#C0C5CE" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#C0C5CE" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Stage column dividers */}
        {centers.slice(0, -1).map((_, i) => (
          <line
            key={i}
            x1={(i + 1) * segW}
            y1={8}
            x2={(i + 1) * segW}
            y2={midY + maxHalf + 4}
            stroke="#26272B"
            strokeWidth="1"
          />
        ))}

        <path d={ribbon} fill="url(#ribbon)" />
        <path d={ribbon} fill="none" stroke="#C0C5CE" strokeWidth="1" strokeOpacity="0.2" />

        {/* Stage labels below */}
        {stages.map((s, i) => (
          <text
            key={s.label}
            x={centers[i]}
            y={midY + maxHalf + 28}
            textAnchor="middle"
            fontSize="11"
            fill="#8B8B95"
          >
            {s.label}
          </text>
        ))}

        {/* Conversion pills at transitions */}
        {pills.map((p, i) => (
          <g key={i}>
            <rect
              x={p.x - 26}
              y={midY - 11}
              width="52"
              height="22"
              rx="11"
              fill="#141517"
              stroke="#26272B"
              strokeWidth="1"
            />
            <text
              x={p.x}
              y={midY + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="10"
              fontWeight="600"
              fill="#A1A1AA"
            >
              {p.rate}% →
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ─── Stage card ─────────────────────────────────────────────── */

function StageCard({
  label,
  value,
  colorIdx,
}: {
  label: string;
  value: number;
  colorIdx: number;
}) {
  const color = STAGE_COLORS[colorIdx] ?? STAGE_COLORS[0];
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 flex flex-col items-center gap-1.5 min-w-0">
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${color.dot}`} />
        <span className="text-[11px] text-brand-textFaint">{label}</span>
      </div>
      <div className="text-xl font-semibold tabular-nums text-brand-textPrimary">
        {value.toLocaleString()}
      </div>
    </div>
  );
}

/* ─── Bottom stat ─────────────────────────────────────────────── */

function BottomStat({
  dot,
  label,
  value,
}: {
  dot: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-full ${dot}`} />
      <span className="text-xs text-brand-textMuted">{label}:</span>
      <span className="text-xs font-medium text-brand-textPrimary tabular-nums">{value}</span>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────── */

export default async function FunnelPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; offerId?: string; from?: string; to?: string }>;
}) {
  let records: Awaited<ReturnType<typeof readAllRecords>>;
  let period: PeriodKey;
  let fromStr: string | null = null;
  let toStr: string | null = null;
  let commissionRate = 0;

  try {
    const params = await searchParams;
    const [rec, settings] = await Promise.all([
      readAllRecords(params.offerId || undefined),
      readSettings(),
    ]);
    records = rec;
    period = (params.period as PeriodKey) || (settings.defaultPeriod as PeriodKey);
    fromStr = params.from || null;
    toStr = params.to || null;
    commissionRate = settings.commissionRate;
  } catch (e) {
    console.error("[SalesIO] Funnel failed:", e);
    return (
      <div className="p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 flex flex-col gap-6">
        <PageHeader title="Funnel" subtitle="Lead lifecycle from first touch to close." />
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
        <PageHeader title="Funnel" subtitle="Lead lifecycle from first touch to close." />
        <EmptyState title="No data" description="Sync an offer to see the funnel." />
      </div>
    );
  }

  const range = resolvePeriod(period, fromStr, toStr, new Date());
  const inRange = (d: string) =>
    (range.from === null || d >= range.from) &&
    (range.to === null || d <= range.to);

  const closer = records.closer.filter((r) => inRange(r.date));
  const phone = records.phone.filter((r) => inRange(r.date));
  const dm = records.dm.filter((r) => inRange(r.date));

  // Totals
  const newLeads = phone.reduce((s, r) => s + r.dials, 0) + dm.reduce((s, r) => s + r.convos, 0);
  const inContact = phone.reduce((s, r) => s + r.pickups, 0) + dm.reduce((s, r) => s + r.followUps, 0);
  const qualified = phone.reduce((s, r) => s + r.qConvos, 0);
  const bookedCall = phone.reduce((s, r) => s + r.booked, 0) + dm.reduce((s, r) => s + r.booked, 0);
  const won = closer.reduce((s, r) => s + r.dealsClosed, 0);

  // Setter → Closer handoff seam
  const setterShows = phone.reduce((s, r) => s + r.shows, 0) + dm.reduce((s, r) => s + r.liveCalls, 0);
  const closerCalls = closer.reduce((s, r) => s + r.totalCalls, 0);
  const carriedPct = setterShows > 0 ? Math.min(100, Math.round((closerCalls / setterShows) * 100)) : null;
  const leak = Math.max(0, setterShows - closerCalls);
  const leakPct = setterShows > 0 ? Math.round((leak / setterShows) * 100) : null;

  // Bottom stats
  const noShows = closer.reduce((s, r) => s + r.noShows, 0);
  const deposits = closer.reduce((s, r) => s + r.deposits, 0);
  const cancellations = closer.reduce((s, r) => s + r.cancellations, 0);

  const stages = [
    { label: "New", value: newLeads },
    { label: "In contact", value: inContact },
    { label: "Qualified", value: qualified },
    { label: "Booked call", value: bookedCall },
    { label: "Won", value: won },
  ];

  const totalRevenue = closer.reduce((s, r) => s + r.revenue, 0);
  const totalCash = closer.reduce((s, r) => s + r.cash, 0);
  const cashToCollect = totalRevenue - totalCash;
  const commissionsPaid = Math.round(totalCash * (commissionRate / 100));

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 flex flex-col gap-6">
      <PageHeader
        title="Funnel"
        subtitle="Lead lifecycle from first touch to close."
      />

      {/* Hero KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-stagger-1">
        <div>
          <div className="text-xs text-brand-textFaint mb-1">Total Revenue</div>
          <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{fmtCurrency(totalRevenue)}</div>
        </div>
        <div>
          <div className="text-xs text-brand-textFaint mb-1">Cash Collected</div>
          <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{fmtCurrency(totalCash)}</div>
        </div>
        <div>
          <div className="text-xs text-brand-textFaint mb-1">Cash To Collect</div>
          <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{fmtCurrency(cashToCollect)}</div>
        </div>
        <div>
          <div className="text-xs text-brand-textFaint mb-1">Lead → Won</div>
          <div className="text-lg font-semibold text-brand-textPrimary tabular-nums">{pct(won, newLeads)}%</div>
        </div>
      </div>

      {/* Stage cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 animate-stagger-2">
        <StageCard label="New" value={newLeads} colorIdx={0} />
        <StageCard label="In contact" value={inContact} colorIdx={1} />
        <StageCard label="Qualified" value={qualified} colorIdx={2} />
        <StageCard label="Booked call" value={bookedCall} colorIdx={3} />
        <StageCard label="Won" value={won} colorIdx={4} />
      </div>

      {/* Funnel chart */}
      <Panel className="animate-stagger-3">
        <h3 className="text-xs font-medium text-brand-textFaint uppercase tracking-wider mb-3">
          Pipeline Stages
        </h3>
        <FunnelChart stages={stages} />
      </Panel>

      {/* Setter → Closer Handoff seam */}
      <Panel className="ring-1 ring-brand-accent/20 animate-stagger-4">
        <h3 className="text-xs font-medium text-brand-textFaint uppercase tracking-wider mb-3">
          Setter → Closer Handoff
        </h3>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex flex-col items-center gap-0.5 min-w-[72px]">
            <span className="text-[11px] text-brand-textFaint">Setter Shows</span>
            <span className="text-xl font-semibold tabular-nums text-brand-textPrimary">
              {setterShows > 0 ? setterShows.toLocaleString() : "—"}
            </span>
          </div>
          <span className="text-brand-textFaint text-lg">→</span>
          <div className="flex flex-col items-center gap-0.5 min-w-[80px]">
            <span className="text-[11px] text-brand-textFaint">Closer Calendar</span>
            <span className="text-xl font-semibold tabular-nums text-brand-textPrimary">
              {closerCalls > 0 ? closerCalls.toLocaleString() : "—"}
            </span>
          </div>
          <span className="text-brand-textFaint text-lg">→</span>
          <div className="flex flex-col items-center gap-0.5 min-w-[80px]">
            <span className="text-[11px] text-brand-textFaint">Carried Through</span>
            {carriedPct !== null ? (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-base font-semibold tabular-nums ${
                  carriedPct >= 80
                    ? "bg-brand-positive/10 text-brand-positive"
                    : carriedPct >= 50
                    ? "bg-amber-400/10 text-amber-400"
                    : "bg-brand-negative/10 text-brand-negative"
                }`}
              >
                {carriedPct}%
              </span>
            ) : (
              <span className="text-xl font-semibold text-brand-textFaint">—</span>
            )}
          </div>
        </div>
        {setterShows > 0 && leak > 0 && (
          <p className="mt-3 text-xs text-brand-textMuted">
            {leak.toLocaleString()} booked show{leak !== 1 ? "s" : ""} never reached a closer calendar this period
            {leakPct !== null ? ` (${leakPct}% leak)` : ""}.
          </p>
        )}
        {setterShows > 0 && closerCalls > setterShows && (
          <p className="mt-3 text-xs text-brand-textMuted">
            Closer calendar exceeds tracked setter shows by {(closerCalls - setterShows).toLocaleString()} —
            likely inbound or untracked booking sources.
          </p>
        )}
        <p className="mt-1.5 text-[11px] text-brand-textFaint">
          Where booked calls leak before the closer dials.
        </p>
      </Panel>

      {/* Bottom counters */}
      <div className="flex flex-wrap gap-6 px-1 animate-stagger-5">
        <BottomStat dot="bg-brand-negative" label="No shows" value={noShows} />
        <BottomStat dot="bg-brand-positive" label="Deposits" value={deposits} />
        <BottomStat dot="bg-brand-accent" label="Cancellations" value={cancellations} />
      </div>

      {/* Payments & Collections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-stagger-5">
        <Panel>
          <h3 className="text-xs font-medium text-brand-textFaint uppercase tracking-wider mb-3">
            Upcoming Payments
          </h3>
          <div className="text-xs text-brand-textFaint mb-1">Total Pending</div>
          <div className="text-2xl font-semibold text-brand-textPrimary tabular-nums">{fmtCurrency(cashToCollect)}</div>
        </Panel>
        <Panel>
          <h3 className="text-xs font-medium text-brand-textFaint uppercase tracking-wider mb-3">
            Recent Collections
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-brand-textFaint mb-1">Cash Collected</div>
              <div className="text-2xl font-semibold text-brand-textPrimary tabular-nums">{fmtCurrency(totalCash)}</div>
            </div>
            <div>
              <div className="text-xs text-brand-textFaint mb-1">Commissions ({commissionRate}%)</div>
              <div className="text-2xl font-semibold text-brand-textPrimary tabular-nums">{fmtCurrency(commissionsPaid)}</div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
