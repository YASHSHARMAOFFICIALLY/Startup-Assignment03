"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[SalesIO] Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <AlertTriangle className="h-8 w-8 text-brand-negative mb-3" strokeWidth={1.5} />
      <h2 className="text-sm font-normal text-brand-textSecondary">
        Something went wrong
      </h2>
      <p className="mt-1 max-w-sm text-[11px] text-brand-textFaint">
        An unexpected error occurred. Try refreshing the page.
      </p>
      <Button
        onClick={reset}
        variant="outline"
        size="sm"
        className="mt-4"
      >
        Try again
      </Button>
    </div>
  );
}
