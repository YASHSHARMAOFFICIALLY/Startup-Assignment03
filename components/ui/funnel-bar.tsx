type Stage = { label: string; value: number };

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

export function FunnelBar({ stages }: { stages: Stage[] }) {
  const max = Math.max(...stages.map((s) => s.value), 1);

  return (
    <div className="flex items-end gap-1.5 sm:gap-2">
      {stages.map((stage, i) => {
        const widthPct = Math.max((stage.value / max) * 100, 8);
        const conversion = i > 0 ? pct(stage.value, stages[i - 1].value) : null;
        // Monochrome ramp: each stage steps light -> dark so the bars read as
        // distinct steps instead of one flat tone. White alpha keeps it gray.
        const t = stages.length > 1 ? i / (stages.length - 1) : 0;
        const shade = 0.3 - t * 0.24; // 0.30 (light) -> 0.06 (dark)

        return (
          <div key={stage.label} className="flex items-end gap-1.5 sm:gap-2" style={{ flex: widthPct }}>
            {conversion !== null && (
              <div className="flex flex-col items-center shrink-0 -ml-1 sm:-ml-1.5 -mr-0.5">
                <span className="text-[10px] font-normal text-brand-textFaint tabular-nums">{conversion}%</span>
                <div className="text-brand-textFaint/40 text-[8px] leading-none">→</div>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-normal text-brand-textSecondary tabular-nums mb-1 truncate">
                {stage.value.toLocaleString()}
              </div>
              <div
                className="h-6 sm:h-7 rounded"
                style={{ backgroundColor: `rgba(255,255,255,${shade.toFixed(3)})` }}
              />
              <div className="text-[9px] text-brand-textFaint mt-1 truncate uppercase tracking-wider">{stage.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
