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
        "bg-gradient-to-b from-white/[0.04] to-white/[0.01] rounded-xl p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}
