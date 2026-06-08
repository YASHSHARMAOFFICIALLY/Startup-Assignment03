import { Panel } from "@/components/ui/panel";

type Entry = { name: string; objection: string; didWell: string; improve: string };

function countObjections(entries: Entry[]): { text: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const e of entries) {
    const o = e.objection.trim();
    if (!o || o === "." || o === "-" || o === "N/A" || o === "n/a" || o === "None" || o === "none") continue;
    // Normalize: lowercase first word for grouping, but display original
    const key = o.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function collectReflections(entries: Entry[]): { name: string; didWell: string; improve: string }[] {
  return entries
    .filter((e) => (e.didWell.trim() && e.didWell !== ".") || (e.improve.trim() && e.improve !== "."))
    .slice(-12) // most recent 12
    .reverse();
}

export function ObjectionPanel({ entries, title }: { entries: Entry[]; title?: string }) {
  const objections = countObjections(entries);
  const reflections = collectReflections(entries);
  const maxCount = Math.max(...objections.map((o) => o.count), 1);

  if (objections.length === 0 && reflections.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Objections */}
      {objections.length > 0 && (
        <Panel>
          <h3 className="text-xs font-medium text-brand-textFaint uppercase tracking-wider mb-4">
            {title ? `${title} — ` : ""}Top Objections
          </h3>
          <div className="space-y-2.5">
            {objections.map((o) => (
              <div key={o.text}>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-[13px] text-brand-textSecondary truncate mr-3 capitalize">{o.text}</span>
                  <span className="text-[11px] text-brand-textFaint tabular-nums shrink-0">{o.count}x</span>
                </div>
                <div className="h-1.5 rounded-full bg-brand-elevated overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-accent/40"
                    style={{ width: `${(o.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Reflections */}
      {reflections.length > 0 && (
        <Panel>
          <h3 className="text-xs font-medium text-brand-textFaint uppercase tracking-wider mb-4">
            {title ? `${title} — ` : ""}Reflections
          </h3>
          <div className="space-y-3 max-h-[320px] overflow-y-auto">
            {reflections.map((r, i) => (
              <div key={i} className="border-b border-brand-border/10 pb-2.5 last:border-0 last:pb-0">
                <div className="text-[11px] font-medium text-brand-textMuted mb-1">{r.name}</div>
                {r.didWell && r.didWell !== "." && (
                  <div className="text-[12px] text-brand-positive/80 mb-0.5">
                    <span className="text-brand-positive font-medium">+</span> {r.didWell}
                  </div>
                )}
                {r.improve && r.improve !== "." && (
                  <div className="text-[12px] text-brand-accent/80">
                    <span className="text-brand-accent font-medium">△</span> {r.improve}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
