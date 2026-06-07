import { cn } from "@/lib/utils";

const variants = {
  demo: "bg-brand-accent/15 text-brand-accent",
  synced: "bg-brand-positive/15 text-brand-positive",
  error: "bg-brand-negative/15 text-brand-negative",
} as const;

export function StatusBadge({
  variant,
  children,
}: {
  variant: keyof typeof variants;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full",
        variants[variant],
      )}
    >
      {children}
    </span>
  );
}
