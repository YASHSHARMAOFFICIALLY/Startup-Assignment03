import { type LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center text-center animate-stagger-2">
      {Icon && (
        <Icon className="h-12 w-12 text-brand-textMuted mb-4" strokeWidth={1.5} />
      )}
      <h2 className="text-xl font-semibold text-brand-textPrimary">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-brand-textMuted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
