import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-brand-bg/90 backdrop-blur-sm rounded-lg p-5 shadow-[0_8px_30px_rgba(0,0,0,0.1)] gradient-border-card",
        className,
      )}
    >
      {children}
    </div>
  );
}
