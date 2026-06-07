"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

const SHELL_EXCLUDED = ["/login"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Login page and other excluded routes render without the shell
  if (SHELL_EXCLUDED.some((p) => pathname.startsWith(p))) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-brand-bg text-brand-textPrimary font-sans overflow-hidden selection:bg-brand-accent selection:text-black">
      {/* Background Ambient Spotlight Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-white/[0.03] rounded-full blur-[120px] pointer-events-none animate-[ambientBreathe_10s_ease-in-out_infinite]"></div>

      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col relative z-10 overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-surface via-brand-bg to-brand-bg">
        <Suspense>
          <Topbar />
        </Suspense>

        <div className="flex-1 overflow-y-auto scroll-smooth">{children}</div>
      </main>
    </div>
  );
}
