import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <FileQuestion className="h-8 w-8 text-brand-textFaint mb-3" strokeWidth={1.5} />
      <h2 className="text-sm font-normal text-brand-textSecondary">
        Page not found
      </h2>
      <p className="mt-1 max-w-sm text-[11px] text-brand-textFaint">
        The page you&apos;re looking for doesn&apos;t exist or was moved.
      </p>
      <Link
        href="/dashboard"
        className="mt-4 text-xs text-brand-accent hover:text-brand-accent/80 transition-colors"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
