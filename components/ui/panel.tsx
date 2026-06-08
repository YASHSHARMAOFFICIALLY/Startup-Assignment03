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
        "bg-white/[0.02] rounded-xl p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}
