"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/lib/nav-config";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-14 flex flex-col items-center py-5 border-r border-white/[0.04] bg-brand-bg z-20 shrink-0">
      {/* Logo mark */}
      <Link
        href="/dashboard"
        className="w-8 h-8 rounded-lg bg-brand-accent/10 flex items-center justify-center mb-6 hover:bg-brand-accent/20 transition-colors"
      >
        <span className="text-brand-accent font-semibold text-sm">S</span>
      </Link>

      {/* Nav icons */}
      <nav className="flex-1 flex flex-col items-center gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.name}
              title={item.name}
              className={`relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors duration-200 group focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg focus-visible:outline-none ${
                isActive
                  ? "bg-white/[0.06] text-brand-textPrimary"
                  : "text-brand-textFaint hover:bg-white/[0.03] hover:text-brand-textMuted"
              }`}
            >
              <Icon size={18} className="stroke-[1.5]" />
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[7px] w-[3px] h-4 rounded-r-full bg-brand-accent" />
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
