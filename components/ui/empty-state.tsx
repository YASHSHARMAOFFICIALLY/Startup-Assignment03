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
    <div className="flex min-h-[30vh] flex-col items-center justify-center text-center animate-stagger-2">
      {Icon && (
        <Icon className="h-8 w-8 text-brand-textFaint mb-3" strokeWidth={1.5} />
      )}
      <h2 className="text-sm font-normal text-brand-textSecondary">{title}</h2>
      <p className="mt-0.5 max-w-sm text-[11px] text-brand-textFaint">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
