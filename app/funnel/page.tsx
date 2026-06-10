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

/* ─── Funnel chart (segmented trapezoid) ─────────────────────────── */

const SEGMENT_FILLS = [
  { top: "#3b82f6", bot: "#2563eb" },   // blue
  { top: "#0ea5e9", bot: "#0284c7" },   // sky
  { top: "#10b981", bot: "#059669" },   // emerald
  { top: "#f59e0b", bot: "#d97706" },   // amber
  { top: "#22c55e", bot: "#16a34a" },   // green
];

function FunnelChart({ stages }: { stages: { label: string; value: number }[] }) {
  const max = Math.max(...stages.map((s) => s.value), 1);
  const w = 700;
  const h = 280;
  const padX = 10;
  const midY = 130;
  const maxHalf = 95;
  const gap = 3;
  const segCount = stages.length;
  const totalGaps = (segCount - 1) * gap;
  const segW = (w - padX * 2 - totalGaps) / segCount;

  const heights = stages.map((s) => Math.max((s.value / max) * maxHalf, 10));

  // Each stage gets its own block; left edge = own height, right edge = next height (or min for last)
  const blocks = stages.map((s, i) => {
    const x = padX + i * (segW + gap);
    const hL = heights[i];
    const hR = i < stages.length - 1 ? heights[i + 1] : Math.max(heights[i] * 0.6, 10);
    const cx = x + segW / 2;

    const path = [
      `M${x},${midY - hL}`,
      `L${x + segW},${midY - hR}`,
      `L${x + segW},${midY + hR}`,
      `L${x},${midY + hL}`,
      "Z",
    ].join(" ");

    return { path, x, cx, hL, hR, idx: i, value: s.value, label: s.label };
  });

  // Conversion rate for each stage (from previous stage), positioned on each block
  const pillY = midY - maxHalf - 26;
  const convRates = stages.map((s, i) => ({
    rate: i === 0 ? 100 : pct(s.value, stages[i - 1].value),
    x: blocks[i].cx,
  }));

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        <defs>
          {SEGMENT_FILLS.map((c, i) => (
            <linearGradient key={i} id={`seg${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.top} stopOpacity="0.55" />
              <stop offset="100%" stopColor={c.bot} stopOpacity="0.2" />
            </linearGradient>
          ))}
        </defs>

        {/* 5 trapezoid blocks */}
        {blocks.map((b) => (
          <g key={b.idx}>
            <path
              d={b.path}
              fill={`url(#seg${b.idx % SEGMENT_FILLS.length})`}
              stroke={SEGMENT_FILLS[b.idx % SEGMENT_FILLS.length].top}
              strokeWidth="1"
              strokeOpacity="0.25"
            />
            {/* Value inside */}
            <text
              x={b.cx}
              y={midY + 5}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="14"
              fontWeight="700"
              fill="#fff"
              opacity="0.9"
            >
              {b.value.toLocaleString()}
            </text>
            {/* Label below */}
            <text
              x={b.cx}
              y={midY + maxHalf + 22}
              textAnchor="middle"
              fontSize="11"
              fill="#888"
            >
              {b.label}
            </text>
          </g>
        ))}

        {/* Conversion pills — one per stage */}
        {convRates.map((cr, i) => {
          const color = i === 0 ? "#60a5fa" : cr.rate >= 50 ? "#34d399" : cr.rate >= 20 ? "#fbbf24" : "#f87171";
          return (
            <g key={i}>
              <rect
                x={cr.x - 22}
                y={pillY}
                width="44"
                height="22"
                rx="11"
                fill="#111"
                stroke="#333"
                strokeWidth="0.5"
              />
              <text
                x={cr.x}
                y={pillY + 14}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="10"
                fontWeight="600"
                fill={color}
              >
                {cr.rate}% →
              </text>
            </g>
          );
        })}
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
  searchParams: Promise<{ period?: string; offerId?: string; from?: string; to?: string }>;
}) {
  let records: Awaited<ReturnType<typeof readAllRecords>>;
  let period: PeriodKey;
  let fromStr: string | null = null;
  let toStr: string | null = null;

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

      {/* Setter → Closer Handoff seam */}
      <Panel className="ring-1 ring-brand-accent/20 animate-stagger-4">
        <div className="text-xs font-medium tracking-wider uppercase text-brand-textFaint mb-3">
          Setter → Closer Handoff
        </div>
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
        <p className="mt-1.5 text-[11px] text-brand-textFaint">
          Where booked calls leak before the closer dials.
        </p>
      </Panel>

      {/* Bottom counters */}
      <div className="flex flex-wrap gap-6 px-1 animate-stagger-5">
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
