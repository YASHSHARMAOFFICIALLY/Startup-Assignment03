"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

const SHELL_EXCLUDED = ["/login"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (SHELL_EXCLUDED.some((p) => pathname.startsWith(p))) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-[#030303] text-brand-textPrimary font-sans overflow-hidden selection:bg-brand-accent selection:text-black">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <Suspense>
          <Topbar />
        </Suspense>
        <div className="flex-1 overflow-y-auto scroll-smooth">{children}</div>
      </main>
    </div>
  );
}
