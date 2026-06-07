import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function IconButton({
  icon: Icon,
  "aria-label": ariaLabel,
  onClick,
  className,
  size = 16,
}: {
  icon: LucideIcon;
  "aria-label": string;
  onClick?: () => void;
  className?: string;
  size?: number;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        "min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md text-brand-textMuted transition-colors hover:bg-brand-elevated hover:text-brand-textPrimary focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg focus-visible:outline-none",
        className,
      )}
    >
      <Icon style={{ width: size, height: size }} />
    </button>
  );
}
