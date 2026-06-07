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
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-brand-textPrimary mb-1">
        {title}
      </h1>
      {(subtitle || badge) && (
        <p className="text-sm text-brand-textMuted">
          {subtitle}
          {badge && <span className="ml-2">{badge}</span>}
        </p>
      )}
    </div>
  );
}
