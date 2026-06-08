type Stage = { label: string; value: number };

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

export function FunnelBar({ stages }: { stages: Stage[] }) {
  const max = Math.max(...stages.map((s) => s.value), 1);

  return (
    <div className="flex items-end gap-1.5 sm:gap-2">
      {stages.map((stage, i) => {
        const widthPct = Math.max((stage.value / max) * 100, 8); // min 8% so zero-stages are visible
        const conversion = i > 0 ? pct(stage.value, stages[i - 1].value) : null;

        return (
          <div key={stage.label} className="flex items-end gap-1.5 sm:gap-2" style={{ flex: widthPct }}>
            {/* Conversion arrow */}
            {conversion !== null && (
              <div className="flex flex-col items-center shrink-0 -ml-1 sm:-ml-1.5 -mr-0.5">
                <span className="text-[10px] font-medium text-brand-accent tabular-nums">{conversion}%</span>
                <div className="text-brand-textFaint text-[8px] leading-none">→</div>
              </div>
            )}

            {/* Bar + label */}
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium text-brand-textPrimary tabular-nums mb-1 truncate">
                {stage.value.toLocaleString()}
              </div>
              <div
                className="h-7 sm:h-8 rounded bg-gradient-to-r from-brand-accent/25 to-brand-accent/10 border border-brand-accent/15"
              />
              <div className="text-[10px] text-brand-textFaint mt-1 truncate">{stage.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
