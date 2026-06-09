"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-brand-bg text-brand-textPrimary font-sans antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center text-center px-4">
          <h2 className="text-sm font-normal text-neutral-300">
            Something went wrong
          </h2>
          <p className="mt-1 max-w-sm text-xs text-neutral-500">
            A critical error occurred. Please try refreshing.
          </p>
          <button
            onClick={reset}
            className="mt-4 text-xs px-3 py-1.5 rounded-md border border-neutral-700 text-neutral-300 hover:bg-neutral-800 transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
