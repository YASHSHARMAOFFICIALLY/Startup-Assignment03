export const dynamic = "force-dynamic";

import { resolvePeriod, type PeriodKey } from "@/lib/period";
import { readAllRecords } from "@/lib/api-utils";
import { readSettings } from "@/lib/settings";
import { Panel } from "@/components/ui/panel";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

const pct = (a: number, b: number) =>
  b > 0 ? Math.round((a / b) * 100) : 0;

/* ─── Stage colors ─────────────────────────────────────────────── */

const STAGE_COLORS = [
  { dot: "bg-blue-400", bar: "bg-blue-400/80", text: "text-blue-400" },
  { dot: "bg-sky-400", bar: "bg-sky-400/80", text: "text-sky-400" },
  { dot: "bg-emerald-400", bar: "bg-emerald-400/80", text: "text-emerald-400" },
  { dot: "bg-amber-400", bar: "bg-amber-400/80", text: "text-amber-400" },
  { dot: "bg-brand-positive", bar: "bg-brand-positive/80", text: "text-brand-positive" },
];

/* ─── Funnel chart (true funnel shape) ─────────────────────────── */

function FunnelChart({ stages }: { stages: { label: string; value: number }[] }) {
  const max = Math.max(...stages.map((s) => s.value), 1);
  const w = 700;
  const h = 220;
  const padX = 30;
  const midY = h / 2;
  const maxHalf = 90; // max half-height of funnel
  const sectionW = (w - padX * 2) / (stages.length - 1);

  // Each stage maps to a vertical height proportional to its value
  const heights = stages.map((s) => (s.value / max) * maxHalf);

  // Build smooth funnel path — top edge and bottom edge
  const topPoints = stages.map((_, i) => ({
    x: padX + i * sectionW,
    y: midY - heights[i],
  }));
  const botPoints = stages.map((_, i) => ({
    x: padX + i * sectionW,
    y: midY + heights[i],
  }));

  // Create smooth cubic bezier path
  function smoothPath(pts: { x: number; y: number }[]): string {
    if (pts.length < 2) return "";
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const cpx = (curr.x + next.x) / 2;
      d += ` C${cpx},${curr.y} ${cpx},${next.y} ${next.x},${next.y}`;
    }
    return d;
  }

  const topPath = smoothPath(topPoints);
  const botPath = smoothPath(botPoints.slice().reverse());
  const last = topPoints[topPoints.length - 1];
  const firstBot = botPoints[botPoints.length - 1];
  const fullPath = `${topPath} L${last.x},${firstBot.y} ${botPath.replace("M", "L")} Z`;

  // Stage-to-stage conversion rates (positioned between stages)
  const convRates = stages.slice(1).map((s, i) => ({
    rate: pct(s.value, stages[i].value),
    x: padX + (i + 0.5) * sectionW,
    y: midY - heights[i] * 0.3,
  }));

  return (
    <div className="relative w-full py-4">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="funnelGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.5" />
            <stop offset="40%" stopColor="#7dd3fc" stopOpacity="0.35" />
            <stop offset="70%" stopColor="#6ee7b7" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#86efac" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="funnelStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>

        {/* Funnel shape */}
        <path d={fullPath} fill="url(#funnelGrad)" />
        <path d={topPath} fill="none" stroke="url(#funnelStroke)" strokeWidth="2" />
        <path
          d={smoothPath(botPoints)}
          fill="none"
          stroke="url(#funnelStroke)"
          strokeWidth="2"
          opacity="0.5"
        />

        {/* Conversion rate pills between stages */}
        {convRates.map((cr, i) => (
          <g key={i}>
            <rect
              x={cr.x - 26}
              y={cr.y - 12}
              width="52"
              height="24"
              rx="12"
              fill="#111"
              stroke="#333"
              strokeWidth="1"
            />
            <text
              x={cr.x}
              y={cr.y + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="11"
              fontWeight="600"
              fill={cr.rate >= 50 ? "#34d399" : cr.rate >= 20 ? "#fbbf24" : "#f87171"}
            >
              {cr.rate}% →
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ─── Stage card ─────────────────────────────────────────────── */

function StageCard({
  icon,
  label,
  value,
  colorIdx,
}: {
  icon: string;
  label: string;
  value: number;
  colorIdx: number;
}) {
  const color = STAGE_COLORS[colorIdx] ?? STAGE_COLORS[0];
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 flex flex-col items-center gap-1.5 min-w-0">
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${color.dot}`} />
        <span className="text-[11px] text-brand-textFaint">{icon} {label}</span>
      </div>
      <div className={`text-xl font-semibold tabular-nums ${color.text}`}>
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
        <PageHeader title="Default Funnel" subtitle="Full pipeline visualization." />
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
        <PageHeader title="Default Funnel" subtitle="Full pipeline visualization." />
        <EmptyState title="No data" description="Sync an offer to see the funnel." />
      </div>
    );
  }

  const range = resolvePeriod(period, null, null, new Date());
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 flex flex-col gap-6">
      <PageHeader
        title="Default Funnel"
        subtitle="Full pipeline visualization."
      />

      {/* Top KPI cards — matches client layout */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-stagger-1">
        <Panel className="!py-4">
          <div className="text-xs text-brand-textFaint mb-1">Total revenue</div>
          <div className="text-xl font-semibold text-brand-textPrimary tabular-nums">${totalRevenue.toLocaleString()}</div>
        </Panel>
        <Panel className="!py-4">
          <div className="text-xs text-brand-textFaint mb-1">Cash collected</div>
          <div className="text-xl font-semibold text-brand-textPrimary tabular-nums">${totalCash.toLocaleString()}</div>
        </Panel>
        <Panel className="!py-4">
          <div className="text-xs text-brand-textFaint mb-1">Cash to be collected</div>
          <div className="text-xl font-semibold text-brand-textPrimary tabular-nums">${cashToCollect.toLocaleString()}</div>
        </Panel>
        <Panel className="!py-4">
          <div className="text-xs text-brand-textFaint mb-1">Compared to prev month</div>
          <div className="text-xl font-semibold text-brand-textPrimary tabular-nums">
            {pct(won, newLeads)}%
          </div>
        </Panel>
      </div>

      {/* Funnel label */}
      <div className="flex items-center gap-2 text-sm text-brand-textMuted">
        <span>↓</span>
        <span className="font-medium">Default Funnel</span>
      </div>

      {/* Stage cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 animate-stagger-2">
        <StageCard icon="✨" label="New" value={newLeads} colorIdx={0} />
        <StageCard icon="📞" label="In contact" value={inContact} colorIdx={1} />
        <StageCard icon="🟢" label="Qualified" value={qualified} colorIdx={2} />
        <StageCard icon="📅" label="Booked call" value={bookedCall} colorIdx={3} />
        <StageCard icon="🏆" label="Won" value={won} colorIdx={4} />
      </div>

      {/* Funnel chart */}
      <Panel className="animate-stagger-3">
        <FunnelChart stages={stages} />
      </Panel>

      {/* Bottom counters */}
      <div className="flex flex-wrap gap-6 px-1 animate-stagger-4">
        <BottomStat dot="bg-red-400" label="No shows" value={noShows} />
        <BottomStat dot="bg-emerald-400" label="Deposits" value={deposits} />
        <BottomStat dot="bg-amber-400" label="Cancellations" value={cancellations} />
      </div>

      {/* Payments & Collections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-stagger-5">
        <Panel>
          <div className="text-xs text-brand-textFaint mb-3">Upcoming Payments</div>
          <div className="text-xs text-brand-textFaint mb-1">Total Pending</div>
          <div className="text-2xl font-semibold text-brand-textPrimary tabular-nums">${cashToCollect.toLocaleString()}</div>
        </Panel>
        <Panel>
          <div className="text-xs text-brand-textFaint mb-3">Recent Collections</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-brand-textFaint mb-1">Cash Collected</div>
              <div className="text-2xl font-semibold text-brand-textPrimary tabular-nums">${totalCash.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-brand-textFaint mb-1">Commission</div>
              <div className="text-2xl font-semibold text-brand-textPrimary tabular-nums">$0</div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
