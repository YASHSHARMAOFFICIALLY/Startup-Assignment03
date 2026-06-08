import { Panel } from "@/components/ui/panel";

type Entry = { name: string; objection: string; didWell: string; improve: string };

function countObjections(entries: Entry[]): { text: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const e of entries) {
    const o = e.objection.trim();
    if (!o || o === "." || o === "-" || o === "N/A" || o === "n/a" || o === "None" || o === "none") continue;
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
    .slice(-12)
    .reverse();
}

export function ObjectionPanel({ entries, title }: { entries: Entry[]; title?: string }) {
  const objections = countObjections(entries);
  const reflections = collectReflections(entries);
  const maxCount = Math.max(...objections.map((o) => o.count), 1);

  if (objections.length === 0 && reflections.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {objections.length > 0 && (
        <Panel>
          <h3 className="text-[10px] font-normal text-brand-textFaint uppercase tracking-[0.1em] mb-4">
            {title ? `${title} — ` : ""}Top Objections
          </h3>
          <div className="space-y-3">
            {objections.map((o) => (
              <div key={o.text}>
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="text-[12px] text-brand-textSecondary truncate mr-3 capitalize">{o.text}</span>
                  <span className="text-[10px] text-brand-textFaint tabular-nums shrink-0">{o.count}</span>
                </div>
                <div className="h-px bg-white/[0.04] overflow-hidden">
                  <div
                    className="h-full bg-white/[0.12]"
                    style={{ width: `${(o.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {reflections.length > 0 && (
        <Panel>
          <h3 className="text-[10px] font-normal text-brand-textFaint uppercase tracking-[0.1em] mb-4">
            {title ? `${title} — ` : ""}Reflections
          </h3>
          <div className="space-y-3 max-h-[320px] overflow-y-auto">
            {reflections.map((r, i) => (
              <div key={i} className="border-b border-white/[0.03] pb-2.5 last:border-0 last:pb-0">
                <div className="text-[10px] text-brand-textFaint mb-1">{r.name}</div>
                {r.didWell && r.didWell !== "." && (
                  <div className="text-[11px] text-brand-textMuted mb-0.5">
                    <span className="text-brand-positive">+</span> {r.didWell}
                  </div>
                )}
                {r.improve && r.improve !== "." && (
                  <div className="text-[11px] text-brand-textMuted">
                    <span className="text-brand-textFaint">~</span> {r.improve}
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
