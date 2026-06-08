export function PageHeader({
  title,
  subtitle,
  badge,
}: {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="animate-stagger-1">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-normal tracking-tight text-brand-textPrimary">
          {title}
        </h1>
        {badge && <span>{badge}</span>}
      </div>
      {subtitle && (
        <p className="text-[11px] text-brand-textFaint mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}
