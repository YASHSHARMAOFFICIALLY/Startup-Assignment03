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

/* ─── Funnel chart (SVG area chart) ─────────────────────────────── */

function FunnelChart({ stages }: { stages: { label: string; value: number }[] }) {
  const max = Math.max(...stages.map((s) => s.value), 1);
  const w = 600;
  const h = 200;
  const padX = 20;
  const padTop = 20;
  const padBot = 10;
  const usableW = w - padX * 2;
  const usableH = h - padTop - padBot;

  const points = stages.map((s, i) => {
    const x = padX + (i / (stages.length - 1)) * usableW;
    const y = padTop + usableH - (s.value / max) * usableH;
    return { x, y };
  });

  const topLine = points.map((p) => `${p.x},${p.y}`).join(" ");
  const bottomLine = points.map((p) => `${p.x},${h - padBot}`).reverse().join(" ");
  const areaPoints = `${topLine} ${bottomLine}`;

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="funnelGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#34d399" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <polygon points={areaPoints} fill="url(#funnelGrad)" />

        {/* Line */}
        <polyline
          points={topLine}
          fill="none"
          stroke="#60a5fa"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Dots + percentage labels */}
        {points.map((p, i) => {
          const convRate = i === 0 ? 100 : pct(stages[i].value, stages[0].value);
          const color = STAGE_COLORS[i] ?? STAGE_COLORS[0];
          return (
            <g key={stages[i].label}>
              <circle cx={p.x} cy={p.y} r="4" fill="#030303" stroke="#60a5fa" strokeWidth="2" />
              <rect
                x={p.x - 22}
                y={p.y - 28}
                width="44"
                height="20"
                rx="4"
                fill="#1a1a1a"
                stroke="#333"
                strokeWidth="0.5"
              />
              <text
                x={p.x}
                y={p.y - 15}
                textAnchor="middle"
                fontSize="10"
                fontWeight="600"
                fill={i === stages.length - 1 ? "#22c55e" : "#60a5fa"}
              >
                {convRate}% →
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-4 sm:pt-6 flex flex-col gap-6">
      <PageHeader
        title="Default Funnel"
        subtitle="Full pipeline visualization."
      />

      {/* Stage cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 animate-stagger-1">
        <StageCard icon="✨" label="New" value={newLeads} colorIdx={0} />
        <StageCard icon="📞" label="In contact" value={inContact} colorIdx={1} />
        <StageCard icon="🟢" label="Qualified" value={qualified} colorIdx={2} />
        <StageCard icon="📅" label="Booked call" value={bookedCall} colorIdx={3} />
        <StageCard icon="🏆" label="Won" value={won} colorIdx={4} />
      </div>

      {/* Funnel chart */}
      <Panel className="animate-stagger-2">
        <FunnelChart stages={stages} />
      </Panel>

      {/* Bottom counters */}
      <div className="flex flex-wrap gap-6 px-1 animate-stagger-3">
        <BottomStat dot="bg-red-400" label="No shows" value={noShows} />
        <BottomStat dot="bg-emerald-400" label="Deposits" value={deposits} />
        <BottomStat dot="bg-amber-400" label="Cancellations" value={cancellations} />
      </div>

      {/* Revenue summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-stagger-4">
        <Panel>
          <div className="text-xs text-brand-textFaint mb-2">Total Revenue</div>
          <div className="text-2xl font-semibold text-brand-textPrimary tabular-nums">
            ${closer.reduce((s, r) => s + r.revenue, 0).toLocaleString()}
          </div>
        </Panel>
        <Panel>
          <div className="text-xs text-brand-textFaint mb-2">Cash Collected</div>
          <div className="text-2xl font-semibold text-brand-textPrimary tabular-nums">
            ${closer.reduce((s, r) => s + r.cash, 0).toLocaleString()}
          </div>
        </Panel>
        <Panel>
          <div className="text-xs text-brand-textFaint mb-2">Commission</div>
          <div className="text-2xl font-semibold text-brand-textPrimary tabular-nums">
            $0
          </div>
        </Panel>
      </div>
    </div>
  );
}
